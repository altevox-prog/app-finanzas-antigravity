import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '../utils/toast';
import { ensureUUID } from '../services/syncEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { toSafeNumber } from '../utils/financeMath';
import { mapSupabaseRowToDebt, mapDebtToSupabasePayload, recalculateDebtBalance, ensureFinanzasCategory, buildDebtPaymentTransactions, buildDebtDisbursementTransaction } from './utils/debtCalculations';
import { syncPaymentToCloud, syncDisbursementToCloud, syncDeletePaymentToCloud, syncDeleteDebtToCloud } from './utils/debtCloudSync';

export function useDebts({ isResettingRef, accounts = [], categories = [], setAccounts, setTransactions, setCategories, user: explicitUser = null } = {}) {
  const [debtsAndLoans, setDebtsAndLoans] = useState([]), [activeUser, setActiveUser] = useState(explicitUser);
  const activeUserRef = useRef(explicitUser); activeUserRef.current = activeUser;

  useEffect(() => {
    if (explicitUser) return setActiveUser(explicitUser);
    if (!isSupabaseConfigured || !supabase) return;
    let isMounted = true;
    getSupabaseUser().then((u) => { if (isMounted && u?.id) setActiveUser(u); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => { if (isMounted) setActiveUser(s?.user || null); });
    return () => { isMounted = false; subscription?.unsubscribe(); };
  }, [explicitUser]);

  const fetchDebts = useCallback(async (userId = null) => {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const uid = userId || activeUserRef.current?.id || (await getSupabaseUser())?.id;
      if (!uid) return [];
      const { data, error } = await supabase.from('debts').select('*').eq('user_id', uid).order('created_at', { ascending: false });
      if (error) return [];
      const mapped = Array.isArray(data) ? data.map(mapSupabaseRowToDebt) : [];
      setDebtsAndLoans(mapped); return mapped;
    } catch (_) { return []; }
  }, []);

  useEffect(() => {
    if (!isResettingRef?.current && isSupabaseConfigured && supabase && activeUser?.id) fetchDebts(activeUser.id);
  }, [activeUser?.id, isResettingRef, fetchDebts]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;
    const channel = supabase.channel(`realtime:debts:${activeUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debts', filter: `user_id=eq.${activeUser.id}` }, ({ eventType, new: nRow, old: oRow }) => {
        const item = mapSupabaseRowToDebt(nRow);
        setDebtsAndLoans((prev) => {
          if (eventType === 'INSERT') return prev.some((d) => d.id === item.id || ensureUUID(d.id) === ensureUUID(item.id)) ? prev.map((d) => (d.id === item.id || ensureUUID(d.id) === ensureUUID(item.id) ? { ...d, ...item } : d)) : [item, ...prev];
          if (eventType === 'UPDATE') return prev.map((d) => (d.id === item.id || ensureUUID(d.id) === ensureUUID(item.id) ? { ...d, ...item } : d));
          if (eventType === 'DELETE' && oRow?.id) return prev.filter((d) => d.id !== oRow.id && ensureUUID(d.id) !== ensureUUID(oRow.id));
          return prev;
        });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeUser?.id]);

  const adjustAccountDbBalance = useCallback((accountId, deltaAmount) => {
    if (!accountId || !deltaAmount) return;
    const nowIso = new Date().toISOString();
    setAccounts?.((prev) => prev.map((acc) => acc.id === accountId ? { ...acc, balance: (Number(acc.balance) || 0) + deltaAmount, updated_at: nowIso } : acc));
    if (isSupabaseConfigured && supabase) {
      getSupabaseUser().then((user) => {
        if (!user?.id) return;
        const cleanId = ensureUUID(accountId);
        supabase.from('accounts').select('balance').eq('id', cleanId).maybeSingle().then(({ data }) => {
          if (data) supabase.from('accounts').update({ balance: (Number(data.balance) || 0) + deltaAmount, updated_at: nowIso }).eq('id', cleanId).catch(() => {});
        });
      });
    }
  }, [setAccounts]);

  const handleAddDebtOrLoan = useCallback(async (newItem) => {
    const base = toSafeNumber(newItem.totalAmount || newItem.amount || newItem.principalAmount), rem = toSafeNumber(newItem.remainingAmount ?? newItem.remaining_amount ?? base);
    const itemWithId = {
      ...newItem, id: newItem.id || crypto.randomUUID(), initialAmount: base, initial_amount: base, totalAmount: base, principalAmount: base, amount: base, total_amount: base,
      remainingAmount: rem, remaining_amount: rem, current_balance: rem, disbursements: Array.isArray(newItem.disbursements) ? newItem.disbursements : [],
      payments: Array.isArray(newItem.payments) ? newItem.payments : [], updated_at: new Date().toISOString()
    };
    setDebtsAndLoans((prev) => [itemWithId, ...prev]);
    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) await supabase.from('debts').upsert(mapDebtToSupabasePayload(itemWithId, user.id), { onConflict: 'id' });
      } catch { toast.error('Error al guardar en la nube'); }
    }
    return itemWithId;
  }, []);

  const handleUpdateDebtOrLoan = useCallback(async (updatedItem) => {
    const sanitized = recalculateDebtBalance(updatedItem);
    setDebtsAndLoans((prev) => prev.map((item) => (item.id === sanitized.id ? { ...item, ...sanitized } : item)));
    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) await supabase.from('debts').upsert(mapDebtToSupabasePayload(sanitized, user.id), { onConflict: 'id' });
      } catch (_) {}
    }
    return sanitized;
  }, []);

  const handleAddPayment = useCallback((itemId, payment) => {
    const debtItem = debtsAndLoans.find((d) => d.id === itemId);
    const finanzasCatId = ensureFinanzasCategory(categories, setCategories);
    const targetAccId = payment.accountId || accounts[0]?.id || 'acc-1', targetAcc = accounts.find((a) => a.id === targetAccId);
    const targetAccName = payment.accountName || targetAcc?.name || 'Principal', nowIso = new Date().toISOString(), opDate = payment.date || nowIso.split('T')[0];
    const paymentId = (payment.id && payment.id.length >= 32) ? ensureUUID(payment.id) : crypto.randomUUID();
    const { newTxs, createdTxIds, capAmt, intAmt, totAmt, isReceivable } = buildDebtPaymentTransactions({ debtItem, payment, targetAccId, targetAccName, opDate, paymentId, finanzasCatId });

    if (newTxs.length > 0 && setTransactions) setTransactions((prev) => [...newTxs, ...prev]);
    if (targetAccId && totAmt > 0) adjustAccountDbBalance(targetAccId, isReceivable ? totAmt : -totAmt);

    const enrichedPayment = { ...payment, id: paymentId, capitalAmount: capAmt, interestAmount: intAmt, amount: totAmt, accountId: targetAccId, accountName: targetAccName, transactionIds: createdTxIds };
    setDebtsAndLoans((prev) => prev.map((item) => {
      if (item.id !== itemId) return item;
      const updated = recalculateDebtBalance(item, [...(item.payments || []), enrichedPayment]);
      if (isSupabaseConfigured && supabase) getSupabaseUser().then((u) => syncPaymentToCloud({ supabase, user: u, newTxs, updatedDebt: updated, paymentId, itemId, totAmt, mode: payment.mode, opDate, note: payment.note, nowIso }));
      return updated;
    }));
  }, [debtsAndLoans, accounts, categories, setCategories, setTransactions, adjustAccountDbBalance]);

  const handleDeletePayment = useCallback((itemId, paymentId) => {
    const debtItem = debtsAndLoans.find((d) => d.id === itemId), pDelete = debtItem?.payments?.find((p) => p.id === paymentId);
    if (pDelete?.accountId) { const totAmt = Number(pDelete.amount) || 0; if (totAmt > 0) adjustAccountDbBalance(pDelete.accountId, debtItem?.type === 'receivable' ? -totAmt : totAmt); }

    setDebtsAndLoans((prev) => prev.map((item) => {
      if (item.id !== itemId) return item;
      const updated = recalculateDebtBalance(item, (item.payments || []).filter((p) => p.id !== paymentId));
      if (isSupabaseConfigured && supabase) getSupabaseUser().then((user) => syncDeletePaymentToCloud({ supabase, user, updatedDebt: updated, paymentId }));
      return updated;
    }));
    if (setTransactions) {
      setTransactions((prev) => prev.filter((t) => t.paymentId !== paymentId));
      if (isSupabaseConfigured && supabase && pDelete?.transactionIds?.length > 0) pDelete.transactionIds.forEach((txId) => supabase.from('transactions').delete().eq('id', ensureUUID(txId)).catch(() => {}));
    }
  }, [debtsAndLoans, adjustAccountDbBalance, setTransactions]);

  const handleAddDisbursement = useCallback(async (debtId, disbursementData) => {
    const { amount, date, fromAccountId, notes } = disbursementData, disbAmount = Number(amount) || 0;
    if (disbAmount <= 0) return;
    const debtItem = debtsAndLoans.find((d) => d.id === debtId);
    if (!debtItem) return;

    adjustAccountDbBalance(fromAccountId, -disbAmount);
    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const { tx, disb, opDate, nowIso, debtName } = buildDebtDisbursementTransaction({ debtItem, fromAcc, amount: disbAmount, date, notes });

    setTransactions?.((prev) => [tx, ...prev]);
    const updatedDebt = recalculateDebtBalance(debtItem, debtItem.payments || [], [...(debtItem.disbursements || []), disb]);
    setDebtsAndLoans((prev) => prev.map((item) => (item.id === debtId ? updatedDebt : item)));

    if (isSupabaseConfigured && supabase) {
      const user = activeUserRef.current || (await getSupabaseUser());
      syncDisbursementToCloud({ supabase, user, tx, disb, fromAccountId, disbAmount, opDate, debtName, nowIso, updatedDebt });
    }
    toast.success('Desembolso registrado correctamente');
    return updatedDebt;
  }, [debtsAndLoans, accounts, adjustAccountDbBalance, setTransactions]);

  const handleDeleteDebtOrLoan = useCallback(async (itemId) => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function' && !window.confirm('¿Eliminar este registro de deuda/préstamo?')) return;
    const canonicalId = ensureUUID(itemId);
    setDebtsAndLoans((prev) => prev.filter((item) => item.id !== itemId && ensureUUID(item.id) !== canonicalId));
    setTransactions?.((prev) => prev.filter((t) => t.debtId !== itemId && ensureUUID(t.debtId) !== canonicalId));
    if (isSupabaseConfigured && supabase) {
      const user = activeUserRef.current || (await getSupabaseUser());
      syncDeleteDebtToCloud({ supabase, user, canonicalId });
    }
    toast.info('Elemento eliminado');
  }, [setTransactions]);

  return {
    debtsAndLoans, debts: debtsAndLoans, setDebtsAndLoans, fetchDebts, resetDebts: useCallback(() => setDebtsAndLoans([]), []),
    handleAddDebtOrLoan, handleSaveLoan: handleAddDebtOrLoan, addDebt: handleAddDebtOrLoan,
    handleUpdateDebtOrLoan, updateDebt: handleUpdateDebtOrLoan, handleAddPayment, addPayment: handleAddPayment,
    handleDeletePayment, handleAddDisbursement, handleDeleteDebtOrLoan, deleteDebt: handleDeleteDebtOrLoan
  };
}

export default useDebts;
