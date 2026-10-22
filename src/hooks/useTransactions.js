import { useState, useEffect, useCallback, useRef } from 'react';
import { ensureUUID } from '../services/syncEngine';
import { generateUUID } from '../utils/recordMerger';
import { toSafeNumber } from '../utils/financeMath';
import { getAccountNativeBalance } from '../utils/currencyUtils';
import { toast } from '../utils/toast';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { mapSupabaseRowToTransaction, mapTransactionToSupabasePayload } from '../services/sync/txMappers';
import { processTransactionUpdate } from '../services/transactions/transferMutationService';
import { buildTransferPair } from '../services/transactions/transferCreationService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function useTransactions({ isResettingRef, accounts = [], setAccounts, trm = 4050, user: explicitUser = null } = {}) {
  const [transactions, setTransactions] = useState([]), [activeUser, setActiveUser] = useState(explicitUser);
  const activeUserRef = useRef(explicitUser), accountsRef = useRef(accounts);
  activeUserRef.current = activeUser; accountsRef.current = accounts;

  useEffect(() => {
    if (explicitUser) { setActiveUser(explicitUser); return; }
    if (!isSupabaseConfigured || !supabase) return;
    let isMounted = true;
    getSupabaseUser().then((u) => { if (isMounted && u?.id) setActiveUser(u); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { if (isMounted) setActiveUser(s?.user || null); });
    return () => { isMounted = false; subscription?.unsubscribe(); };
  }, [explicitUser]);

  const recalculateAccountsBalance = useCallback((currentTransactions) => {
    if (!setAccounts || !Array.isArray(accountsRef.current) || !accountsRef.current.length) return;
    setAccounts((prev) => (Array.isArray(prev) && prev.length ? prev : accountsRef.current).map((acc) => {
      const stored = toSafeNumber(acc.balance ?? acc.current_balance ?? acc.currentBalance ?? 0);
      const hasTx = currentTransactions.some((t) => t && acc.id && [(t.accountId || t.account_id), (t.toAccountId || t.to_account_id), (t.fromAccountId || t.from_account_id)].includes(acc.id));
      const live = hasTx ? getAccountNativeBalance({ ...acc, initialBalance: acc.initialBalance ?? acc.initial_balance ?? stored }, currentTransactions, trm) : stored;
      return { ...acc, balance: live, currentBalance: live, current_balance: live };
    }));
  }, [setAccounts, trm]);

  useEffect(() => {
    if (isResettingRef?.current || !isSupabaseConfigured || !supabase || !activeUser?.id) return;
    let isMounted = true;
    supabase.from('transactions').select('*').eq('user_id', activeUser.id).order('date', { ascending: false }).then(({ data, error }) => {
      if (!error && isMounted && Array.isArray(data)) setTransactions(data.map(mapSupabaseRowToTransaction));
    }).catch((err) => console.error('[useTransactions] Error fetch:', err));
    return () => { isMounted = false; };
  }, [activeUser?.id, isResettingRef]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;
    const channel = supabase.channel(`public:transactions:${activeUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${activeUser.id}` }, ({ eventType, new: newRow, old: oldRow }) => {
        setTransactions((prev) => {
          let next;
          if (eventType === 'INSERT') { const r = mapSupabaseRowToTransaction(newRow); next = prev.some((t) => t.id === r.id) ? prev.map((t) => t.id === r.id ? { ...t, ...r } : t) : [r, ...prev]; }
          else if (eventType === 'UPDATE') { const r = mapSupabaseRowToTransaction(newRow); next = prev.map((t) => t.id === r.id ? { ...t, ...r } : t); }
          else if (eventType === 'DELETE' && oldRow?.id) { next = prev.filter((t) => t.id !== oldRow.id); }
          else return prev;
          recalculateAccountsBalance(next);
          return next;
        });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeUser?.id, recalculateAccountsBalance]);

  const saveTx = useCallback(async (tx) => {
    const sanitized = { ...tx, id: ((tx.id && UUID_REGEX.test(tx.id)) ? tx.id : generateUUID()), amount: toSafeNumber(tx.amount), originalAmount: toSafeNumber(tx.originalAmount ?? tx.amount), exchangeRate: toSafeNumber(tx.exchangeRate || 1), updated_at: new Date().toISOString() };
    setTransactions((prev) => { const next = [sanitized, ...prev.filter((t) => t.id !== sanitized.id)]; recalculateAccountsBalance(next); return next; });
    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) await supabase.from('transactions').upsert(mapTransactionToSupabasePayload(sanitized, user.id), { onConflict: 'id' });
      } catch {}
    }
    toast.success('Movimiento registrado con éxito');
    return sanitized;
  }, [recalculateAccountsBalance]);

  const handleUpdateTransaction = useCallback(async (tx) => {
    const { nextTransactions, toUpsert, toDelete, updatedTx } = processTransactionUpdate(tx, transactions, accountsRef.current || []);
    setTransactions(nextTransactions);
    recalculateAccountsBalance(nextTransactions);
    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          if (toDelete.length > 0) {
            const uuidDelete = toDelete.map((id) => ensureUUID(id)).filter(Boolean);
            if (uuidDelete.length > 0) await supabase.from('transactions').delete().in('id', uuidDelete).eq('user_id', user.id);
          }
          if (toUpsert.length > 0) await supabase.from('transactions').upsert(toUpsert.map((t) => mapTransactionToSupabasePayload(t, user.id)), { onConflict: 'id' });
        }
      } catch (err) { console.error('[useTransactions] Error update sync:', err); }
    }
    toast.success('Movimiento actualizado con éxito');
    return updatedTx;
  }, [transactions, recalculateAccountsBalance]);

  const handleDeleteTransaction = useCallback(async (txIdOrIds) => {
    if (!txIdOrIds) return false;
    const rawIds = Array.isArray(txIdOrIds) ? txIdOrIds : [txIdOrIds];
    const target = transactions.find((t) => rawIds.includes(t.id) || (ensureUUID && rawIds.includes(ensureUUID(t.id))));
    if (target?.isDebtPayment || target?.debtId || target?.paymentId) {
      toast.warning('Esta transacción pertenece al abono de una deuda. Elimínala desde el módulo de Deudas.');
      return false;
    }
    const idsToDelete = [...rawIds];
    if (target?.linkedIds && Array.isArray(target.linkedIds)) idsToDelete.push(...target.linkedIds);
    else if (target?.isTransfer || target?.is_transfer || ['transfer', 'transferencia'].includes(target?.type)) {
      const cp = transactions.find((t) => !idsToDelete.includes(t.id) && ((target.transferId && t.transferId === target.transferId) || ((t.isTransfer || t.is_transfer) && t.date === target.date && Math.abs(toSafeNumber(t.amount) - toSafeNumber(target.amount)) < 0.01)));
      if (cp?.id) idsToDelete.push(cp.id);
    }
    const uuidList = idsToDelete.map((id) => ensureUUID(id)).filter(Boolean);
    setTransactions((prev) => { const next = prev.filter((t) => !idsToDelete.includes(t.id) && !uuidList.includes(ensureUUID(t.id))); recalculateAccountsBalance(next); return next; });
    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        const query = supabase.from('transactions').delete().in('id', uuidList);
        if (user?.id) query.eq('user_id', user.id);
        await query;
      } catch {}
    }
    toast.info('Elemento eliminado');
    return true;
  }, [transactions, recalculateAccountsBalance]);

  const handleExecuteTransfer = useCallback(async (params) => {
    const pair = buildTransferPair({ ...params, trm });
    if (!pair) { toast.error('Selecciona cuentas de origen y destino válidas y diferentes'); return null; }
    setTransactions((prev) => { const next = [pair.inTx, pair.outTx, ...prev]; recalculateAccountsBalance(next); return next; });
    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) await supabase.from('transactions').upsert([mapTransactionToSupabasePayload(pair.outTx, user.id), mapTransactionToSupabasePayload(pair.inTx, user.id)], { onConflict: 'id' });
      } catch {}
    }
    toast.success('Movimiento registrado con éxito');
    return pair;
  }, [trm, recalculateAccountsBalance]);

  return {
    transactions, setTransactions,
    handleAddTransaction: saveTx, handleSaveTransaction: saveTx, handleUpdateTransaction,
    handleDeleteTransaction, handleExecuteTransfer, handleTransfer: handleExecuteTransfer,
    resetTransactions: useCallback(() => setTransactions([]), [])
  };
}

export default useTransactions;
