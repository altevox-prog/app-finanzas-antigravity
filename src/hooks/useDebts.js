import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateElapsedMonths } from '../utils/debtAlerts';
import { toast } from '../utils/toast';
import { ensureUUID } from '../services/syncEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { toSafeNumber } from '../utils/financeMath';
import { normalizeRemoteDebt } from '../services/sync/syncNormalizers';

const mapSupabaseRowToDebt = (row) => (!row || typeof row !== 'object' ? row : normalizeRemoteDebt(row));

function mapDebtToSupabasePayload(item, userId) {
  const cleanId = ensureUUID(item.id);
  const nowIso = new Date().toISOString();
  const base = toSafeNumber(item.totalAmount || item.amount || item.principalAmount || item.initialAmount);
  const rem = toSafeNumber(item.remainingAmount ?? item.remaining_amount ?? base);
  const raw = {
    payments: Array.isArray(item.payments) ? item.payments : [],
    disbursements: Array.isArray(item.disbursements) ? item.disbursements : [],
    initialAmount: toSafeNumber(item.initialAmount ?? item.initial_amount ?? base),
    totalAmount: base,
    dueDate: item.dueDate || item.due_date || item.computedDueDate || null,
    interestRate: toSafeNumber(item.interestRate || item.interest_rate || 0),
    startDate: item.startDate || item.start_date || null,
    notes: item.notes || item.note || '',
    updated_at: nowIso
  };
  const person = item.personName || item.name || 'Deuda';
  return {
    id: cleanId, user_id: userId, name: person, person, person_name: person,
    type: item.type || 'payable', amount: base, total_amount: base, remaining_amount: rem,
    status: item.status || (rem <= 0.01 ? 'paid' : 'active'),
    due_date: raw.dueDate, notes: `PAYMENTS_JSON:${JSON.stringify(raw)}`, raw_data: raw, updated_at: nowIso
  };
}

function recalculateDebtBalance(debtItem, payments = null, disbursements = null) {
  const allP = payments ?? debtItem.payments ?? [];
  const allD = disbursements ?? debtItem.disbursements ?? [];
  const totalDisb = allD.reduce((s, d) => s + toSafeNumber(d.amount), 0);
  const initial = toSafeNumber(debtItem.initialAmount ?? debtItem.initial_amount ?? (toSafeNumber(debtItem.principalAmount || debtItem.totalAmount || debtItem.amount) - totalDisb));
  const base = initial + totalDisb;
  const rate = toSafeNumber(debtItem.interestRate);
  const months = debtItem.startDate ? calculateElapsedMonths(debtItem.startDate) : toSafeNumber(debtItem.monthsElapsed);
  const accruedInt = (months > 0 && rate > 0) ? Math.round(base * (rate / 100) * months) : toSafeNumber(debtItem.accruedInterest);
  const totalCapPaid = allP.reduce((s, p) => s + (p.capitalAmount !== undefined ? toSafeNumber(p.capitalAmount) : (p.mode === 'interest' ? 0 : toSafeNumber(p.amount))), 0);
  const totalIntPaid = allP.reduce((s, p) => s + (p.interestAmount !== undefined ? toSafeNumber(p.interestAmount) : (p.mode === 'interest' ? toSafeNumber(p.amount) : 0)), 0);
  const remCap = Math.max(0, base - totalCapPaid);
  const remInt = Math.max(0, accruedInt - totalIntPaid);
  const totRem = remCap + remInt;
  const isPaid = totRem <= 1 || remCap <= 0.01;
  return {
    ...debtItem,
    initialAmount: initial, initial_amount: initial, principalAmount: base, totalAmount: base, amount: base, total_amount: base,
    accruedInterest: accruedInt, monthsElapsed: months, remainingCapital: remCap, remainingInterest: remInt, totalRemaining: totRem,
    remainingAmount: remCap, remaining_amount: remCap, current_balance: remCap, isPaid, is_paid: isPaid,
    status: isPaid ? 'paid' : (debtItem.status === 'paid' ? 'active' : (debtItem.status || 'active')),
    payments: allP, disbursements: allD, updated_at: new Date().toISOString()
  };
}

export function useDebts({
  isResettingRef, accounts = [], categories = [], setAccounts, setTransactions, setCategories, user: explicitUser = null
} = {}) {
  const [debtsAndLoans, setDebtsAndLoans] = useState([]);
  const [activeUser, setActiveUser] = useState(explicitUser);
  const activeUserRef = useRef(explicitUser);
  activeUserRef.current = activeUser;

  useEffect(() => {
    if (explicitUser) return setActiveUser(explicitUser);
    if (!isSupabaseConfigured || !supabase) return;
    let isMounted = true;
    getSupabaseUser().then((u) => { if (isMounted && u?.id) setActiveUser(u); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (isMounted) setActiveUser(session?.user || null);
    });
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
      setDebtsAndLoans(mapped);
      return mapped;
    } catch (_) { return []; }
  }, []);

  useEffect(() => {
    if (!isResettingRef?.current && isSupabaseConfigured && supabase && activeUser?.id) {
      fetchDebts(activeUser.id);
    }
  }, [activeUser?.id, isResettingRef, fetchDebts]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;
    const channel = supabase.channel(`realtime:debts:${activeUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debts', filter: `user_id=eq.${activeUser.id}` }, (payload) => {
        const item = mapSupabaseRowToDebt(payload.new);
        if (payload.eventType === 'INSERT') {
          setDebtsAndLoans((prev) => prev.some((d) => d.id === item.id || ensureUUID(d.id) === ensureUUID(item.id))
            ? prev.map((d) => (d.id === item.id || ensureUUID(d.id) === ensureUUID(item.id) ? { ...d, ...item } : d))
            : [item, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setDebtsAndLoans((prev) => prev.map((d) => (d.id === item.id || ensureUUID(d.id) === ensureUUID(item.id) ? { ...d, ...item } : d)));
        } else if (payload.eventType === 'DELETE' && payload.old?.id) {
          const did = payload.old.id;
          setDebtsAndLoans((prev) => prev.filter((d) => d.id !== did && ensureUUID(d.id) !== ensureUUID(did)));
        }
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
        supabase.from('accounts').select('balance').eq('id', cleanId).maybeSingle().then(({ data: accData }) => {
          if (accData) {
            supabase.from('accounts').update({ balance: (Number(accData.balance) || 0) + deltaAmount, updated_at: nowIso }).eq('id', cleanId).catch(() => {});
          }
        });
      });
    }
  }, [setAccounts]);

  const handleAddDebtOrLoan = useCallback(async (newItem) => {
    const base = toSafeNumber(newItem.totalAmount || newItem.amount || newItem.principalAmount);
    const rem = toSafeNumber(newItem.remainingAmount ?? newItem.remaining_amount ?? base);
    const itemWithId = {
      ...newItem,
      id: newItem.id || crypto.randomUUID(),
      initialAmount: base, initial_amount: base, totalAmount: base, principalAmount: base, amount: base, total_amount: base,
      remainingAmount: rem, remaining_amount: rem, current_balance: rem,
      disbursements: Array.isArray(newItem.disbursements) ? newItem.disbursements : [],
      payments: Array.isArray(newItem.payments) ? newItem.payments : [],
      updated_at: new Date().toISOString()
    };
    setDebtsAndLoans((prev) => [itemWithId, ...prev]);

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) await supabase.from('debts').upsert(mapDebtToSupabasePayload(itemWithId, user.id), { onConflict: 'id' });
      } catch (e) { toast.error('Error al guardar en la nube'); }
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
    const capAmt = payment.capitalAmount !== undefined ? Number(payment.capitalAmount) : (payment.mode === 'interest' ? 0 : Number(payment.amount) || 0);
    const intAmt = payment.interestAmount !== undefined ? Number(payment.interestAmount) : (payment.mode === 'interest' ? Number(payment.amount) || 0 : 0);
    const totAmt = Number(payment.amount) || (capAmt + intAmt);
    const isReceivable = debtItem?.type === 'receivable';
    const debtName = debtItem?.personName || debtItem?.name || (isReceivable ? 'Préstamo' : 'Deuda');
    const existingFin = categories.find((c) => c.name?.toLowerCase().trim() === 'finanzas');
    const finanzasCatId = existingFin?.id || 'cat-finanzas';

    if (!existingFin && setCategories) {
      setCategories((prev) => prev.some((c) => c.name?.toLowerCase().trim() === 'finanzas') ? prev : [...prev, {
        id: 'cat-finanzas', name: 'Finanzas', type: 'expense', color: '#007AFF', icon: '💳',
        subcategories: [
          { id: 'sub-amortizacion-deuda', name: 'Amortización de deuda' },
          { id: 'sub-intereses-deuda', name: 'Intereses de deuda' },
          { id: 'sub-cobro-prestamo', name: 'Cobro de préstamo' }
        ]
      }]);
    }

    const targetAccId = payment.accountId || accounts[0]?.id || 'acc-1';
    const targetAcc = accounts.find((a) => a.id === targetAccId);
    const targetAccName = payment.accountName || targetAcc?.name || 'Principal';
    const nowIso = new Date().toISOString();
    const opDate = payment.date || nowIso.split('T')[0];
    const paymentId = (payment.id && payment.id.length >= 32) ? ensureUUID(payment.id) : crypto.randomUUID();
    const createdTxIds = [];
    const newTxs = [];

    const buildPaymentTx = (amt, subId, subName, isCap) => {
      const txId = crypto.randomUUID();
      createdTxIds.push(txId);
      return {
        id: txId, date: opDate, type: isReceivable ? 'income' : 'expense', amount: amt,
        originalCurrency: 'COP', originalAmount: amt, exchangeRate: 1,
        categoryId: isReceivable && !isCap ? 'cat-8' : finanzasCatId,
        categoryName: isReceivable && !isCap ? 'Ingresos' : 'Finanzas',
        subcategoryId: subId, subcategoryName: subName, accountId: targetAccId, accountName: targetAccName,
        note: payment.note ? `${payment.note} (${isCap ? 'Capital' : 'Intereses'} ${debtName})` : `${isCap ? 'Amortización de deuda' : 'Intereses de deuda'} - ${debtName}`,
        debtId: itemId, paymentId, isDebtPayment: true, ...(isCap ? { isTransfer: true, is_transfer: true, isDebtCapital: true } : {})
      };
    };

    if (intAmt > 0) newTxs.push(buildPaymentTx(intAmt, isReceivable ? 'sub-intereses-cobrados' : 'sub-intereses-deuda', isReceivable ? 'Intereses cobrados' : 'Intereses de deuda', false));
    if (capAmt > 0) newTxs.push(buildPaymentTx(capAmt, isReceivable ? 'sub-cobro-prestamo' : 'sub-amortizacion-deuda', isReceivable ? 'Cobro de préstamo / Capital' : 'Amortización de deuda', true));

    if (newTxs.length > 0 && setTransactions) {
      setTransactions((prev) => [...newTxs, ...prev]);
      if (isSupabaseConfigured && supabase) {
        getSupabaseUser().then((user) => {
          if (!user?.id) return;
          newTxs.forEach((tx) => {
            supabase.from('transactions').upsert({
              id: ensureUUID(tx.id), user_id: user.id, account_id: tx.accountId ? ensureUUID(tx.accountId) : null,
              amount: tx.amount, type: tx.type, date: tx.date, description: tx.note, category: tx.categoryName,
              notes: tx.note, is_transfer: Boolean(tx.isTransfer), updated_at: nowIso
            }, { onConflict: 'id' }).catch(() => {});
          });
        });
      }
    }

    if (targetAccId && totAmt > 0) adjustAccountDbBalance(targetAccId, isReceivable ? totAmt : -totAmt);

    const enrichedPayment = {
      ...payment, id: paymentId, capitalAmount: capAmt, interestAmount: intAmt, amount: totAmt,
      accountId: targetAccId, accountName: targetAccName, transactionIds: createdTxIds
    };

    setDebtsAndLoans((prev) => prev.map((item) => {
      if (item.id !== itemId) return item;
      const updated = recalculateDebtBalance(item, [...(item.payments || []), enrichedPayment]);
      if (isSupabaseConfigured && supabase) {
        getSupabaseUser().then((user) => {
          if (!user?.id) return;
          supabase.from('debts').upsert(mapDebtToSupabasePayload(updated, user.id), { onConflict: 'id' }).catch(() => {});
          supabase.from('debt_payments').upsert({
            id: paymentId, debt_id: ensureUUID(itemId), user_id: user.id, amount: totAmt,
            payment_type: payment.mode === 'interest' ? 'INTEREST' : 'CAPITAL', payment_date: opDate,
            notes: payment.note || 'Abono registrado', created_at: nowIso
          }, { onConflict: 'id' }).catch(() => {});
        });
      }
      return updated;
    }));
  }, [debtsAndLoans, accounts, categories, setCategories, setTransactions, adjustAccountDbBalance]);

  const handleDeletePayment = useCallback((itemId, paymentId) => {
    const debtItem = debtsAndLoans.find((d) => d.id === itemId);
    const pDelete = debtItem?.payments?.find((p) => p.id === paymentId);
    if (pDelete?.accountId) {
      const totAmt = Number(pDelete.amount) || 0;
      if (totAmt > 0) adjustAccountDbBalance(pDelete.accountId, debtItem?.type === 'receivable' ? -totAmt : totAmt);
    }

    setDebtsAndLoans((prev) => prev.map((item) => {
      if (item.id !== itemId) return item;
      const updated = recalculateDebtBalance(item, (item.payments || []).filter((p) => p.id !== paymentId));
      if (isSupabaseConfigured && supabase) {
        getSupabaseUser().then((user) => {
          if (!user?.id) return;
          supabase.from('debts').upsert(mapDebtToSupabasePayload(updated, user.id), { onConflict: 'id' }).catch(() => {});
          supabase.from('debt_payments').delete().eq('id', ensureUUID(paymentId)).catch(() => {});
        });
      }
      return updated;
    }));

    if (setTransactions) {
      setTransactions((prev) => prev.filter((t) => t.paymentId !== paymentId));
      if (isSupabaseConfigured && supabase && pDelete?.transactionIds?.length > 0) {
        pDelete.transactionIds.forEach((txId) => {
          supabase.from('transactions').delete().eq('id', ensureUUID(txId)).catch(() => {});
        });
      }
    }
  }, [debtsAndLoans, adjustAccountDbBalance, setTransactions]);

  const handleAddDisbursement = useCallback(async (debtId, disbursementData) => {
    const { amount, date, fromAccountId, notes } = disbursementData;
    const disbAmount = Number(amount) || 0;
    if (disbAmount <= 0) return;
    const debtItem = debtsAndLoans.find((d) => d.id === debtId);
    if (!debtItem) return;

    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const fromAccName = fromAcc?.name || 'Cuenta Principal';
    const debtName = debtItem.personName || debtItem.name || 'Préstamo';
    const opDate = date || new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    adjustAccountDbBalance(fromAccountId, -disbAmount);
    const txUUID = crypto.randomUUID();
    const newTx = {
      id: txUUID, date: opDate, type: 'expense', amount: disbAmount, originalCurrency: fromAcc?.currency || 'COP',
      originalAmount: disbAmount, exchangeRate: 1, categoryId: 'cat-finanzas', categoryName: 'Finanzas',
      subcategoryId: 'sub-desembolso-prestamo', subcategoryName: 'Desembolso de préstamo',
      accountId: fromAccountId, accountName: fromAccName,
      note: notes ? `${notes} (Desembolso adicional a ${debtName})` : `Desembolso adicional - Préstamo a ${debtName}`,
      debtId, isDebtDisbursement: true
    };
    setTransactions?.((prev) => [newTx, ...prev]);

    const disbUUID = crypto.randomUUID();
    const newDisb = {
      id: disbUUID, debtId, amount: disbAmount, date: opDate, fromAccountId,
      fromAccountName: fromAccName, notes: notes || '', transactionId: txUUID, type: 'INCREMENT'
    };
    const updatedDebt = recalculateDebtBalance(debtItem, debtItem.payments || [], [...(debtItem.disbursements || []), newDisb]);
    setDebtsAndLoans((prev) => prev.map((item) => (item.id === debtId ? updatedDebt : item)));

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          supabase.from('transactions').upsert({
            id: ensureUUID(txUUID), user_id: user.id, account_id: fromAccountId ? ensureUUID(fromAccountId) : null,
            amount: disbAmount, type: 'expense', date: opDate, description: newTx.note, category: 'Finanzas',
            category_id: 'cat-finanzas', notes: `LEND_MORE: Desembolso adicional a ${debtName}`, is_transfer: false, updated_at: nowIso
          }, { onConflict: 'id' }).catch(() => {});

          supabase.from('debt_payments').insert({
            id: ensureUUID(disbUUID), debt_id: ensureUUID(debtId), user_id: user.id, amount: disbAmount,
            type: 'INCREMENT', payment_type: 'INCREMENT', movement_type: 'LEND_MORE', payment_date: opDate,
            notes: notes || 'Desembolso adicional / Prestar más', created_at: nowIso
          }).catch(() => {});

          await supabase.from('debts').upsert(mapDebtToSupabasePayload(updatedDebt, user.id), { onConflict: 'id' });
        }
      } catch (_) {}
    }

    toast.success('Desembolso registrado correctamente');
    return updatedDebt;
  }, [debtsAndLoans, accounts, adjustAccountDbBalance, setTransactions]);

  const handleDeleteDebtOrLoan = useCallback(async (itemId) => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (!window.confirm('¿Eliminar este registro de deuda/préstamo?')) return;
    }
    const canonicalId = ensureUUID(itemId);
    setDebtsAndLoans((prev) => prev.filter((item) => item.id !== itemId && ensureUUID(item.id) !== canonicalId));
    setTransactions?.((prev) => prev.filter((t) => t.debtId !== itemId && ensureUUID(t.debtId) !== canonicalId));

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        let pQuery = supabase.from('debt_payments').delete().eq('debt_id', canonicalId);
        if (user?.id) pQuery = pQuery.eq('user_id', user.id);
        await pQuery.catch(() => {});

        let dQuery = supabase.from('debts').delete().eq('id', canonicalId);
        if (user?.id) dQuery = dQuery.eq('user_id', user.id);
        await dQuery;
      } catch (_) {}
    }
    toast.info('Elemento eliminado');
  }, [setTransactions]);

  const resetDebts = useCallback(() => setDebtsAndLoans([]), []);

  return {
    debtsAndLoans,
    debts: debtsAndLoans,
    setDebtsAndLoans,
    handleAddDebtOrLoan,
    handleSaveLoan: handleAddDebtOrLoan,
    addDebt: handleAddDebtOrLoan,
    handleUpdateDebtOrLoan,
    updateDebt: handleUpdateDebtOrLoan,
    handleAddPayment,
    addPayment: handleAddPayment,
    handleDeletePayment,
    handleAddDisbursement,
    handleDeleteDebtOrLoan,
    deleteDebt: handleDeleteDebtOrLoan,
    fetchDebts,
    resetDebts
  };
}

export default useDebts;
