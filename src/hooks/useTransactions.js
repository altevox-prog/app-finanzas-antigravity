import { useState, useEffect, useCallback, useRef } from 'react';
import { ensureUUID } from '../services/syncEngine';
import { generateUUID } from '../utils/recordMerger';
import { toSafeNumber } from '../utils/financeMath';
import { getAccountNativeBalance } from '../utils/currencyUtils';
import { toast } from '../utils/toast';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { normalizeRemoteTransaction } from '../services/sync/syncNormalizers';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapSupabaseRowToTransaction(row) {
  if (!row || typeof row !== 'object') return row;
  const norm = normalizeRemoteTransaction(row), raw = row.raw_data || {};
  const isTransfer = Boolean(row.is_transfer ?? raw.isTransfer ?? (norm.type === 'transfer'));
  const desc = row.description || row.notes || 'Movimiento', notes = row.notes || row.description || raw.note || '';
  return {
    ...norm, id: row.id,
    date: row.date || (row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0]),
    type: norm.type || 'expense', amount: toSafeNumber(row.amount),
    originalAmount: toSafeNumber(row.original_amount ?? raw.originalAmount ?? row.amount),
    originalCurrency: row.original_currency || raw.originalCurrency || 'COP',
    exchangeRate: toSafeNumber(row.exchange_rate ?? raw.exchangeRate ?? 1),
    accountId: row.account_id || raw.accountId || null, account_id: row.account_id || raw.accountId || null,
    accountName: raw.accountName || '', categoryId: row.category_id || raw.categoryId || null,
    category_id: row.category_id || raw.categoryId || null, categoryName: norm.categoryName || 'General',
    category: norm.category || 'General', subcategoryId: raw.subcategoryId || null, subcategoryName: raw.subcategoryName || null,
    description: desc, note: notes, notes, isTransfer, is_transfer: isTransfer,
    fromAccountId: raw.fromAccountId || null, toAccountId: raw.toAccountId || null,
    fromAccountName: raw.fromAccountName || null, toAccountName: raw.toAccountName || null,
    receiptImage: raw.receiptImage || null,
    created_at: row.created_at || new Date().toISOString(), updated_at: row.updated_at || new Date().toISOString()
  };
}

function mapTransactionToSupabasePayload(tx, userId) {
  const cleanId = (tx.id && UUID_REGEX.test(tx.id)) ? tx.id : ensureUUID(tx.id || generateUUID());
  const rawAccId = tx.accountId || tx.account_id || null, now = new Date().toISOString();
  const isTransfer = Boolean(tx.isTransfer || tx.is_transfer || ['transfer', 'transferencia'].includes(tx.type));
  const desc = (tx.description || tx.notes || tx.note || 'Movimiento').trim(), note = (tx.note || tx.notes || '').trim();
  const amount = toSafeNumber(tx.amount), origAmount = toSafeNumber(tx.originalAmount ?? tx.amount), origCurr = tx.originalCurrency || 'COP';
  const exRate = toSafeNumber(tx.exchangeRate || 1), catId = tx.categoryId || tx.category_id || null, catName = tx.categoryName || tx.category || 'General';

  return {
    id: cleanId, user_id: userId, type: tx.type || 'expense', amount, original_amount: origAmount, original_currency: origCurr,
    exchange_rate: exRate, account_id: rawAccId ? ensureUUID(rawAccId) : null, category_id: catId, category: catName,
    date: tx.date || now.split('T')[0], description: desc, notes: note, is_transfer: isTransfer,
    raw_data: {
      originalAmount: origAmount, originalCurrency: origCurr, exchangeRate: exRate, accountName: tx.accountName || '',
      categoryId: catId, categoryName: catName, subcategoryId: tx.subcategoryId || null, subcategoryName: tx.subcategoryName || null,
      fromAccountId: tx.fromAccountId || null, toAccountId: tx.toAccountId || null, fromAccountName: tx.fromAccountName || null,
      toAccountName: tx.toAccountName || null, isTransfer, receiptImage: tx.receiptImage || null, note
    },
    updated_at: tx.updated_at || now
  };
}

export function useTransactions({
  isResettingRef, accounts = [], setAccounts, trm = 4050, user: explicitUser = null
} = {}) {
  const [transactions, setTransactions] = useState([]);
  const [activeUser, setActiveUser] = useState(explicitUser);
  const activeUserRef = useRef(explicitUser);
  activeUserRef.current = activeUser;
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;

  useEffect(() => {
    if (explicitUser) { setActiveUser(explicitUser); return; }
    if (!isSupabaseConfigured || !supabase) return;
    let isMounted = true;
    getSupabaseUser().then((u) => { if (isMounted && u?.id) setActiveUser(u); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => { if (isMounted) setActiveUser(session?.user || null); });
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
    (async () => {
      try {
        const { data, error } = await supabase.from('transactions').select('*').eq('user_id', activeUser.id).order('date', { ascending: false });
        if (!error && isMounted && Array.isArray(data)) setTransactions(data.map(mapSupabaseRowToTransaction));
      } catch (err) { console.error('[useTransactions] Error fetch:', err); }
    })();
    return () => { isMounted = false; };
  }, [activeUser?.id, isResettingRef]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;
    const channel = supabase.channel(`public:transactions:${activeUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${activeUser.id}` }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        setTransactions((prev) => {
          let next;
          if (eventType === 'INSERT') {
            const row = mapSupabaseRowToTransaction(newRow);
            next = prev.some((t) => t.id === row.id) ? prev.map((t) => t.id === row.id ? { ...t, ...row } : t) : [row, ...prev];
          } else if (eventType === 'UPDATE') {
            const row = mapSupabaseRowToTransaction(newRow);
            next = prev.map((t) => t.id === row.id ? { ...t, ...row } : t);
          } else if (eventType === 'DELETE' && oldRow?.id) {
            next = prev.filter((t) => t.id !== oldRow.id);
          } else { return prev; }
          recalculateAccountsBalance(next);
          return next;
        });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeUser?.id, recalculateAccountsBalance]);

  const syncTxToCloud = useCallback(async (tx) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const user = activeUserRef.current || (await getSupabaseUser());
      if (user?.id) {
        const { error } = await supabase.from('transactions').upsert(mapTransactionToSupabasePayload(tx, user.id), { onConflict: 'id' });
        if (error) toast.error('Error al sincronizar con la nube');
      }
    } catch {}
  }, []);

  const sanitizeTx = (tx, id) => ({
    ...tx, id: id || ((tx.id && UUID_REGEX.test(tx.id)) ? tx.id : generateUUID()),
    amount: toSafeNumber(tx.amount), originalAmount: toSafeNumber(tx.originalAmount ?? tx.amount),
    exchangeRate: toSafeNumber(tx.exchangeRate || 1), updated_at: new Date().toISOString()
  });

  const saveTx = useCallback(async (tx, isUpdate = false) => {
    const sanitized = sanitizeTx(tx, isUpdate ? tx.id : undefined);
    setTransactions((prev) => {
      const next = isUpdate ? prev.map((t) => t.id === sanitized.id ? { ...t, ...sanitized } : t) : [sanitized, ...prev.filter((t) => t.id !== sanitized.id)];
      recalculateAccountsBalance(next);
      return next;
    });
    await syncTxToCloud(sanitized);
    toast.success(isUpdate ? 'Movimiento actualizado con éxito' : 'Movimiento registrado con éxito');
    return sanitized;
  }, [recalculateAccountsBalance, syncTxToCloud]);

  const handleDeleteTransaction = useCallback(async (txId) => {
    if (!txId) return false;
    const target = transactions.find((t) => t.id === txId || (ensureUUID && ensureUUID(t.id) === txId));
    if (target?.isDebtPayment || target?.debtId || target?.paymentId) {
      toast.warning('Esta transacción pertenece al abono de una deuda. Elimínala desde el módulo de Deudas.');
      return false;
    }
    setTransactions((prev) => {
      const next = prev.filter((t) => t.id !== txId && ensureUUID(t.id) !== txId);
      recalculateAccountsBalance(next);
      return next;
    });
    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        let q = supabase.from('transactions').delete().eq('id', ensureUUID(txId));
        if (user?.id) q = q.eq('user_id', user.id);
        await q;
      } catch {}
    }
    toast.info('Elemento eliminado');
    return true;
  }, [transactions, recalculateAccountsBalance]);

  const handleExecuteTransfer = useCallback(async ({ fromAcc, toAcc, amount, destAmount, fromCurrency, toCurrency, date, note }) => {
    if (!fromAcc?.id || !toAcc?.id || fromAcc.id === toAcc.id) { toast.error('Selecciona cuentas de origen y destino válidas y diferentes'); return null; }
    const transferAmount = toSafeNumber(amount);
    if (transferAmount <= 0) { toast.error('El monto a transferir debe ser mayor a 0'); return null; }

    const cleanDest = destAmount !== undefined ? toSafeNumber(destAmount) : transferAmount;
    const getRate = (c) => c === 'USD' ? (Number(trm) || 4050) : c === 'EUR' ? Math.round((Number(trm) || 4050) * 1.08) : 1;
    const rate = getRate(fromCurrency), inRate = getRate(toCurrency), copAmount = fromCurrency === 'COP' ? transferAmount : Math.round(transferAmount * rate);
    const nowIso = new Date().toISOString(), txDate = date || nowIso.split('T')[0];
    const outDesc = `Transferencia a ${toAcc.name}${note ? `: ${note}` : ''}`, inDesc = `Transferencia desde ${fromAcc.name}${note ? `: ${note}` : ''}`;

    const baseMeta = { date: txDate, categoryId: 'cat-transfer', categoryName: 'Transferencias', category: 'Transferencias', isTransfer: true, updated_at: nowIso, fromAccountId: fromAcc.id, toAccountId: toAcc.id, fromAccountName: fromAcc.name, toAccountName: toAcc.name };
    const outTx = { ...baseMeta, id: generateUUID(), type: 'expense', amount: copAmount, originalAmount: transferAmount, originalCurrency: fromCurrency, exchangeRate: rate, subcategoryId: 'sub-transfer-out', subcategoryName: 'Transferencia Enviada', accountId: fromAcc.id, accountName: fromAcc.name, note: outDesc, notes: outDesc, description: outDesc };
    const inTx = { ...baseMeta, id: generateUUID(), type: 'income', amount: copAmount, originalAmount: cleanDest, originalCurrency: toCurrency, exchangeRate: inRate, subcategoryId: 'sub-transfer-in', subcategoryName: 'Transferencia Recibida', accountId: toAcc.id, accountName: toAcc.name, note: inDesc, notes: inDesc, description: inDesc };

    setTransactions((prev) => {
      const next = [inTx, outTx, ...prev];
      recalculateAccountsBalance(next);
      return next;
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) await supabase.from('transactions').upsert([mapTransactionToSupabasePayload(outTx, user.id), mapTransactionToSupabasePayload(inTx, user.id)], { onConflict: 'id' });
      } catch {}
    }
    toast.success('Movimiento registrado con éxito');
    return { inTx, outTx };
  }, [trm, recalculateAccountsBalance]);

  return {
    transactions,
    setTransactions,
    handleAddTransaction: (tx) => saveTx(tx, false),
    handleSaveTransaction: (tx) => saveTx(tx, false),
    handleUpdateTransaction: (tx) => saveTx(tx, true),
    handleDeleteTransaction,
    handleExecuteTransfer,
    handleTransfer: handleExecuteTransfer,
    resetTransactions: useCallback(() => setTransactions([]), [])
  };
}

export default useTransactions;
