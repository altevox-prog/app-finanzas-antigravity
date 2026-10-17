import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { INITIAL_DEBTS_AND_LOANS } from '../data/initialData';
import { saveDebtsToStorage, saveAccountsToStorage, saveTransactionsToStorage } from '../services/storageService';
import { calculateElapsedMonths } from '../utils/debtAlerts';
import { toast } from '../utils/toast';
import { ensureUUID } from '../services/syncEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toSafeNumber } from '../utils/financeMath';

function getInitialDebts() {
  const saved = localStorage.getItem('user_debts') ||
                localStorage.getItem(STORAGE_KEYS.DEBTS) ||
                localStorage.getItem(STORAGE_KEYS.DEBTS_AND_LOANS) ||
                localStorage.getItem('app_loans');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          const disbursements = Array.isArray(item.disbursements) ? item.disbursements : [];
          const totalDisbursed = disbursements.reduce((sum, d) => sum + Number(d.amount || 0), 0);
          const initial = Number(item.initialAmount ?? item.initial_amount ?? (Number(item.totalAmount || item.amount || 0) - totalDisbursed)) || Number(item.totalAmount || item.amount || 0);
          const total = initial + totalDisbursed;
          return {
            ...item,
            initialAmount: initial,
            initial_amount: initial,
            totalAmount: total,
            principalAmount: total,
            amount: total,
            total_amount: total,
            disbursements: Array.isArray(item.disbursements) ? item.disbursements : []
          };
        });
      }
    } catch (e) {
      console.error('Error parseando deudas:', e);
    }
  }
  return INITIAL_DEBTS_AND_LOANS;
}

export function useDebts({
  isResettingRef,
  accounts = [],
  categories = [],
  setAccounts,
  setTransactions,
  setCategories
} = {}) {
  const [debtsAndLoans, setDebtsAndLoans] = useState(getInitialDebts);

  // Persistencia reactiva en localStorage
  useEffect(() => {
    if (isResettingRef?.current) return;
    saveDebtsToStorage(debtsAndLoans);
  }, [debtsAndLoans, isResettingRef]);

  // Agregar deuda o préstamo
  const handleAddDebtOrLoan = useCallback(async (newItem) => {
    const baseAmount = toSafeNumber(newItem.totalAmount || newItem.amount || newItem.principalAmount);
    const itemWithId = {
      ...newItem,
      id: newItem.id || crypto.randomUUID(),
      initialAmount: baseAmount,
      initial_amount: baseAmount,
      totalAmount: baseAmount,
      principalAmount: baseAmount,
      amount: baseAmount,
      total_amount: baseAmount,
      remainingAmount: toSafeNumber(newItem.remainingAmount ?? newItem.remaining_amount ?? baseAmount),
      remaining_amount: toSafeNumber(newItem.remaining_amount ?? newItem.remainingAmount ?? baseAmount),
      current_balance: toSafeNumber(newItem.remaining_amount ?? newItem.remainingAmount ?? baseAmount),
      disbursements: Array.isArray(newItem.disbursements) ? newItem.disbursements : [],
      payments: Array.isArray(newItem.payments) ? newItem.payments : [],
      updated_at: new Date().toISOString()
    };
    setDebtsAndLoans((prev) => {
      const nextDebts = [itemWithId, ...prev];
      saveDebtsToStorage(nextDebts);
      return nextDebts;
    });

    if (isSupabaseConfigured && supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id) {
          const rawDataPayload = {
            payments: itemWithId.payments,
            disbursements: itemWithId.disbursements,
            initialAmount: baseAmount
          };
          supabase.from('debts').upsert({
            id: ensureUUID(itemWithId.id),
            user_id: user.id,
            name: itemWithId.name || itemWithId.personName || 'Deuda',
            person: itemWithId.personName || itemWithId.name || 'Deuda',
            person_name: itemWithId.personName || itemWithId.name || 'Deuda',
            type: itemWithId.type,
            amount: baseAmount,
            total_amount: baseAmount,
            remaining_amount: itemWithId.remaining_amount,
            notes: `PAYMENTS_JSON:${JSON.stringify(rawDataPayload)}`,
            raw_data: rawDataPayload,
            due_date: itemWithId.dueDate || itemWithId.computedDueDate || null,
            updated_at: itemWithId.updated_at
          }, { onConflict: 'id' }).then(({ error }) => {
            if (error) console.warn('[useDebts] Advertencia upsert Supabase:', error.message);
          });
        }
      }).catch(() => {});
    }

    return itemWithId;
  }, []);

  const handleSaveLoan = handleAddDebtOrLoan;

  // Actualizar deuda o préstamo
  const handleUpdateDebtOrLoan = useCallback(async (updatedItem) => {
    const totalDisbursed = (updatedItem.disbursements || []).reduce((sum, d) => sum + toSafeNumber(d.amount), 0);
    const initial = toSafeNumber(updatedItem.initialAmount ?? updatedItem.initial_amount ?? (toSafeNumber(updatedItem.totalAmount || updatedItem.amount) - totalDisbursed));
    const total = initial + totalDisbursed;
    const sanitized = {
      ...updatedItem,
      initialAmount: initial,
      initial_amount: initial,
      totalAmount: total,
      principalAmount: total,
      amount: total,
      total_amount: total,
      disbursements: Array.isArray(updatedItem.disbursements) ? updatedItem.disbursements : [],
      payments: Array.isArray(updatedItem.payments) ? updatedItem.payments : [],
      updated_at: new Date().toISOString()
    };
    setDebtsAndLoans((prev) => {
      const nextDebts = prev.map((item) => (item.id === sanitized.id ? { ...item, ...sanitized } : item));
      saveDebtsToStorage(nextDebts);
      return nextDebts;
    });

    if (isSupabaseConfigured && supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id) {
          const rawDataPayload = {
            payments: sanitized.payments,
            disbursements: sanitized.disbursements,
            initialAmount: initial
          };
          supabase.from('debts').upsert({
            id: ensureUUID(sanitized.id),
            user_id: user.id,
            name: sanitized.name || sanitized.personName || 'Deuda',
            person: sanitized.personName || sanitized.name || 'Deuda',
            person_name: sanitized.personName || sanitized.name || 'Deuda',
            type: sanitized.type,
            amount: total,
            total_amount: total,
            remaining_amount: toSafeNumber(sanitized.remaining_amount ?? sanitized.remainingAmount),
            notes: `PAYMENTS_JSON:${JSON.stringify(rawDataPayload)}`,
            raw_data: rawDataPayload,
            due_date: sanitized.dueDate || sanitized.computedDueDate || null,
            updated_at: sanitized.updated_at
          }, { onConflict: 'id' }).then(({ error }) => {
            if (error) console.warn('[useDebts] Advertencia upsert Supabase:', error.message);
          });
        }
      }).catch(() => {});
    }

    return sanitized;
  }, []);

  // Registrar abono / pago a deuda o préstamo
  const handleAddPayment = useCallback((itemId, payment) => {
    const debtItem = debtsAndLoans.find((d) => d.id === itemId);
    const capAmt = payment.capitalAmount !== undefined
      ? Number(payment.capitalAmount)
      : (payment.mode === 'interest' ? 0 : Number(payment.amount) || 0);
    const intAmt = payment.interestAmount !== undefined
      ? Number(payment.interestAmount)
      : (payment.mode === 'interest' ? Number(payment.amount) || 0 : 0);
    const totAmt = Number(payment.amount) || (capAmt + intAmt);
    const isReceivable = debtItem?.type === 'receivable';
    const debtName = debtItem?.personName || debtItem?.name || (isReceivable ? 'Préstamo' : 'Deuda');

    const createdTxIds = [];
    const newTransactions = [];

    // Asegurar que exista categoría 'Finanzas'
    const existingFinanzas = categories.find((c) => c.name?.toLowerCase().trim() === 'finanzas');
    const finanzasCatId = existingFinanzas?.id || 'cat-finanzas';

    if (!existingFinanzas && setCategories) {
      setCategories((prev) => {
        if (prev.some((c) => c.name?.toLowerCase().trim() === 'finanzas')) return prev;
        const newFinCat = {
          id: 'cat-finanzas',
          name: 'Finanzas',
          type: 'expense',
          color: '#007AFF',
          icon: '💳',
          subcategories: [
            { id: 'sub-amortizacion-deuda', name: 'Amortización de deuda' },
            { id: 'sub-intereses-deuda', name: 'Intereses de deuda' },
            { id: 'sub-cobro-prestamo', name: 'Cobro de préstamo' }
          ]
        };
        const updated = [...prev, newFinCat];
        try { localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated)); } catch {}
        try { localStorage.setItem('categories', JSON.stringify(updated)); } catch {}
        return updated;
      });
    }

    const targetAccId = payment.accountId || accounts[0]?.id || 'acc-1';
    const targetAcc = accounts.find((a) => a.id === targetAccId);
    const targetAccName = payment.accountName || targetAcc?.name || 'Principal';

    // 1. Movimiento de intereses (si aplica)
    if (intAmt > 0) {
      const txIntId = 'tx-int-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      createdTxIds.push(txIntId);
      const newTxInt = {
        id: txIntId,
        date: payment.date || new Date().toISOString().split('T')[0],
        type: isReceivable ? 'income' : 'expense',
        amount: intAmt,
        originalCurrency: 'COP',
        originalAmount: intAmt,
        exchangeRate: 1,
        categoryId: isReceivable ? 'cat-8' : finanzasCatId,
        categoryName: isReceivable ? 'Ingresos' : 'Finanzas',
        subcategoryId: isReceivable ? 'sub-intereses-cobrados' : 'sub-intereses-deuda',
        subcategoryName: isReceivable ? 'Intereses cobrados' : 'Intereses de deuda',
        accountId: targetAccId,
        accountName: targetAccName,
        note: payment.note ? `${payment.note} (Intereses ${debtName})` : `Intereses de deuda - ${debtName}`,
        debtId: itemId,
        paymentId: payment.id,
        isDebtPayment: true
      };
      newTransactions.push(newTxInt);
    }

    // 2. Movimiento de capital (si aplica)
    if (capAmt > 0) {
      const txCapId = 'tx-cap-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      createdTxIds.push(txCapId);
      const newTxCap = {
        id: txCapId,
        date: payment.date || new Date().toISOString().split('T')[0],
        type: isReceivable ? 'income' : 'expense',
        amount: capAmt,
        originalCurrency: 'COP',
        originalAmount: capAmt,
        exchangeRate: 1,
        categoryId: finanzasCatId,
        categoryName: 'Finanzas',
        subcategoryId: isReceivable ? 'sub-cobro-prestamo' : 'sub-amortizacion-deuda',
        subcategoryName: isReceivable ? 'Cobro de préstamo / Capital' : 'Amortización de deuda',
        accountId: targetAccId,
        accountName: targetAccName,
        note: payment.note ? `${payment.note} (Capital ${debtName})` : `Amortización de deuda - ${debtName}`,
        debtId: itemId,
        paymentId: payment.id,
        isDebtPayment: true
      };
      newTransactions.push(newTxCap);
    }

    // Guardar transacciones para actualizar historial y balance
    if (newTransactions.length > 0 && setTransactions) {
      setTransactions((prev) => {
        const nextTxList = [...newTransactions, ...prev];
        saveTransactionsToStorage(nextTxList);
        return nextTxList;
      });
    }

    // Actualización atómica de saldo en la cuenta
    if (targetAccId && totAmt > 0 && setAccounts) {
      setAccounts((prevAccounts) => {
        const updated = prevAccounts.map((acc) => {
          if (acc.id === targetAccId) {
            const curBal = Number(acc.balance) || 0;
            const newBal = isReceivable ? curBal + totAmt : curBal - totAmt;
            return { ...acc, balance: newBal, updated_at: new Date().toISOString() };
          }
          return acc;
        });
        saveAccountsToStorage(updated);
        return updated;
      });
    }

    // Guardar pago con transactionIds y actualizar remainingAmount en la deuda
    const enrichedPayment = {
      ...payment,
      capitalAmount: capAmt,
      interestAmount: intAmt,
      amount: totAmt,
      accountId: targetAccId,
      accountName: targetAccName,
      transactionIds: createdTxIds
    };

    setDebtsAndLoans((prev) => {
      const nextDebts = prev.map((item) => {
        if (item.id === itemId) {
          const payments = [...(item.payments || []), enrichedPayment];
          const base = Number(item.principalAmount || item.totalAmount) || 0;
          const rate = Number(item.interestRate) || 0;
          const months = item.startDate ? calculateElapsedMonths(item.startDate) : (Number(item.monthsElapsed) || 0);
          const accruedInt = (months > 0 && rate > 0)
            ? Math.round(base * (rate / 100) * months)
            : (item.accruedInterest !== undefined ? Number(item.accruedInterest) : 0);

          const totalCapPaid = payments.reduce((s, p) => s + (p.capitalAmount !== undefined ? Number(p.capitalAmount) : (p.mode === 'interest' ? 0 : Number(p.amount) || 0)), 0);
          const totalIntPaid = payments.reduce((s, p) => s + (p.interestAmount !== undefined ? Number(p.interestAmount) : (p.mode === 'interest' ? Number(p.amount) || 0 : 0)), 0);

          const remCap = Math.max(0, base - totalCapPaid);
          const remInt = Math.max(0, accruedInt - totalIntPaid);
          const totRem = remCap + remInt;
          const isPaid = totRem <= 1 || remCap <= 0.01;

          const updated = {
            ...item,
            principalAmount: base,
            accruedInterest: accruedInt,
            monthsElapsed: months,
            remainingCapital: remCap,
            remainingInterest: remInt,
            totalRemaining: totRem,
            remainingAmount: remCap,
            remaining_amount: remCap,
            current_balance: remCap,
            isPaid,
            is_paid: isPaid,
            status: isPaid ? 'paid' : (item.status === 'paid' ? 'active' : (item.status || 'active')),
            payments
          };

          if (isSupabaseConfigured && supabase) {
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (user?.id) {
                const rawDataPayload = {
                  payments,
                  disbursements: item.disbursements || [],
                  initialAmount: item.initialAmount || item.initial_amount || base
                };
                supabase.from('debts').upsert({
                  id: ensureUUID(itemId),
                  user_id: user.id,
                  name: item.name || item.personName || 'Deuda',
                  person: item.personName || item.name || 'Deuda',
                  person_name: item.personName || item.name || 'Deuda',
                  type: item.type,
                  amount: base,
                  total_amount: base,
                  remaining_amount: remCap,
                  current_balance: remCap,
                  status: updated.status,
                  notes: `PAYMENTS_JSON:${JSON.stringify(rawDataPayload)}`,
                  raw_data: rawDataPayload,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'id' }).catch(() => {});
              }
            }).catch(() => {});
          }

          return updated;
        }
        return item;
      });
      saveDebtsToStorage(nextDebts);
      return nextDebts;
    });
  }, [debtsAndLoans, accounts, categories, setAccounts, setTransactions, setCategories]);

  // Eliminar abono / pago
  const handleDeletePayment = useCallback((itemId, paymentId) => {
    const debtItem = debtsAndLoans.find((d) => d.id === itemId);
    const paymentToDelete = debtItem?.payments?.find((p) => p.id === paymentId);

    // Revertir el saldo en la cuenta afectada
    if (paymentToDelete && paymentToDelete.accountId && setAccounts) {
      const isReceivable = debtItem?.type === 'receivable';
      const totAmt = Number(paymentToDelete.amount) || 0;
      if (totAmt > 0) {
        setAccounts((prevAccounts) => {
          const updated = prevAccounts.map((acc) => {
            if (acc.id === paymentToDelete.accountId) {
              const curBal = Number(acc.balance) || 0;
              const newBal = isReceivable ? curBal - totAmt : curBal + totAmt;
              return { ...acc, balance: newBal, updated_at: new Date().toISOString() };
            }
            return acc;
          });
          saveAccountsToStorage(updated);
          return updated;
        });
      }
    }

    setDebtsAndLoans((prev) => {
      const nextDebts = prev.map((item) => {
        if (item.id === itemId) {
          const remainingPayments = (item.payments || []).filter((p) => p.id !== paymentId);
          const base = Number(item.principalAmount || item.totalAmount) || 0;
          const rate = Number(item.interestRate) || 0;
          const months = item.startDate ? calculateElapsedMonths(item.startDate) : (Number(item.monthsElapsed) || 0);
          const accruedInt = (months > 0 && rate > 0)
            ? Math.round(base * (rate / 100) * months)
            : (item.accruedInterest !== undefined ? Number(item.accruedInterest) : 0);

          const totalCapPaid = remainingPayments.reduce((s, p) => s + (p.capitalAmount !== undefined ? Number(p.capitalAmount) : (p.mode === 'interest' ? 0 : Number(p.amount) || 0)), 0);
          const totalIntPaid = remainingPayments.reduce((s, p) => s + (p.interestAmount !== undefined ? Number(p.interestAmount) : (p.mode === 'interest' ? Number(p.amount) || 0 : 0)), 0);

          const remCap = Math.max(0, base - totalCapPaid);
          const remInt = Math.max(0, accruedInt - totalIntPaid);
          const totRem = remCap + remInt;
          const isPaid = totRem <= 1 || remCap <= 0.01;

          const updated = {
            ...item,
            principalAmount: base,
            accruedInterest: accruedInt,
            monthsElapsed: months,
            remainingCapital: remCap,
            remainingInterest: remInt,
            totalRemaining: totRem,
            remainingAmount: remCap,
            remaining_amount: remCap,
            current_balance: remCap,
            isPaid,
            is_paid: isPaid,
            status: isPaid ? 'paid' : (item.status === 'paid' ? 'active' : (item.status || 'active')),
            payments: remainingPayments
          };

          if (isSupabaseConfigured && supabase) {
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (user?.id) {
                const rawDataPayload = {
                  payments: remainingPayments,
                  disbursements: item.disbursements || [],
                  initialAmount: item.initialAmount || item.initial_amount || base
                };
                supabase.from('debts').upsert({
                  id: ensureUUID(itemId),
                  user_id: user.id,
                  name: item.name || item.personName || 'Deuda',
                  person: item.personName || item.name || 'Deuda',
                  person_name: item.personName || item.name || 'Deuda',
                  type: item.type,
                  amount: base,
                  total_amount: base,
                  remaining_amount: remCap,
                  current_balance: remCap,
                  status: updated.status,
                  notes: `PAYMENTS_JSON:${JSON.stringify(rawDataPayload)}`,
                  raw_data: rawDataPayload,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'id' }).catch(() => {});
              }
            }).catch(() => {});
          }

          return updated;
        }
        return item;
      });
      saveDebtsToStorage(nextDebts);
      return nextDebts;
    });

    // Revertir eliminando transacciones asociadas
    if (setTransactions) {
      setTransactions((prev) => {
        const remaining = prev.filter((t) => t.paymentId !== paymentId);
        saveTransactionsToStorage(remaining);
        return remaining;
      });
    }
  }, [debtsAndLoans, setAccounts, setTransactions]);

  // Agregar desembolso adicional a un préstamo
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

    // 1. Descontar inmediatamente el dinero prestado de la cuenta de origen
    let updatedAccountBalance = fromAcc ? Number(fromAcc.balance) - disbAmount : null;
    if (fromAccountId && setAccounts) {
      setAccounts((prevAccounts) => {
        const updated = prevAccounts.map((acc) => {
          if (acc.id === fromAccountId) {
            const curBal = Number(acc.balance) || 0;
            const newBal = curBal - disbAmount;
            updatedAccountBalance = newBal;
            return { ...acc, balance: newBal, updated_at: nowIso };
          }
          return acc;
        });
        saveAccountsToStorage(updated);
        return updated;
      });
    }

    // 2. Registrar transacción de gasto en transactions
    const txUUID = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ensureUUID('tx-disb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6));
    const newTx = {
      id: txUUID,
      date: opDate,
      type: 'expense',
      amount: disbAmount,
      originalCurrency: fromAcc?.currency || 'COP',
      originalAmount: disbAmount,
      exchangeRate: 1,
      categoryId: 'cat-finanzas',
      categoryName: 'Finanzas',
      subcategoryId: 'sub-desembolso-prestamo',
      subcategoryName: 'Desembolso de préstamo',
      accountId: fromAccountId,
      accountName: fromAccName,
      note: notes ? `${notes} (Desembolso adicional a ${debtName})` : `Desembolso adicional - Préstamo a ${debtName}`,
      debtId: debtId,
      isDebtDisbursement: true
    };

    if (setTransactions) {
      setTransactions((prev) => {
        const nextTxList = [newTx, ...prev];
        saveTransactionsToStorage(nextTxList);
        return nextTxList;
      });
    }

    // 3. Registrar el desembolso y sumar el monto al capital del préstamo
    const disbUUID = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ensureUUID('disb-' + Date.now());
    const newDisbursementRecord = {
      id: disbUUID,
      debtId: debtId,
      amount: disbAmount,
      date: opDate,
      fromAccountId,
      fromAccountName: fromAccName,
      notes: notes || '',
      transactionId: txUUID,
      type: 'INCREMENT'
    };

    const disbursements = [...(debtItem.disbursements || []), newDisbursementRecord];
    const totalDisbursed = disbursements.reduce((s, d) => s + (Number(d.amount) || 0), 0);

    const initialAmount = Number(
      debtItem.initialAmount ?? 
      debtItem.initial_amount ?? 
      (Number(debtItem.amount || debtItem.totalAmount || debtItem.principalAmount || 0) - (totalDisbursed - disbAmount))
    ) || Number(debtItem.amount || debtItem.totalAmount || 0);

    const newTotal = initialAmount + totalDisbursed;
    const payments = debtItem.payments || [];
    const totalCapPaid = payments.reduce((s, p) => s + (p.capitalAmount !== undefined ? Number(p.capitalAmount) : (p.mode === 'interest' ? 0 : Number(p.amount) || 0)), 0);
    const remCap = Math.max(0, newTotal - totalCapPaid);
    const remInt = Number(debtItem.remainingInterest) || 0;
    const totRem = remCap + remInt;
    const isPaid = totRem <= 1 || remCap <= 0.01;

    const updatedDebtItem = {
      ...debtItem,
      initialAmount,
      initial_amount: initialAmount,
      principalAmount: newTotal,
      totalAmount: newTotal,
      amount: newTotal,
      total_amount: newTotal,
      remainingCapital: remCap,
      remainingAmount: remCap,
      remaining_amount: remCap,
      current_balance: remCap,
      totalRemaining: totRem,
      isPaid,
      is_paid: isPaid,
      status: isPaid ? 'paid' : (debtItem.status === 'paid' ? 'active' : (debtItem.status || 'active')),
      disbursements,
      updated_at: nowIso
    };

    setDebtsAndLoans((prev) => {
      const nextDebts = prev.map((item) => (item.id === debtId ? updatedDebtItem : item));
      saveDebtsToStorage(nextDebts);
      return nextDebts;
    });

    // 4. Persistencia obligatoria en Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          // A. Descontar saldo en la cuenta de origen en Supabase
          if (fromAccountId && updatedAccountBalance !== null) {
            supabase.from('accounts').update({
              balance: updatedAccountBalance,
              updated_at: nowIso
            }).eq('id', ensureUUID(fromAccountId)).catch((accErr) => {
              console.warn('[useDebts] Advertencia actualizando cuenta en Supabase:', accErr);
            });
          }

          // B. Insertar transacción de salida en transactions
          supabase.from('transactions').upsert({
            id: ensureUUID(txUUID),
            user_id: user.id,
            account_id: fromAccountId ? ensureUUID(fromAccountId) : null,
            amount: disbAmount,
            type: 'expense',
            date: opDate,
            description: newTx.note,
            category: 'Finanzas',
            category_id: 'cat-finanzas',
            notes: `LEND_MORE: Desembolso adicional a ${debtName}`,
            is_transfer: false,
            updated_at: nowIso
          }, { onConflict: 'id' }).catch((txErr) => {
            console.warn('[useDebts] Advertencia guardando transacción de desembolso en Supabase:', txErr);
          });

          // C. Registrar en debt_payments / loan_movements con tipo "INCREMENT" / "LEND_MORE"
          supabase.from('debt_payments').insert({
            id: ensureUUID(disbUUID),
            debt_id: ensureUUID(debtId),
            user_id: user.id,
            amount: disbAmount,
            type: 'INCREMENT',
            payment_type: 'INCREMENT',
            movement_type: 'LEND_MORE',
            date: opDate,
            notes: notes || 'Desembolso adicional / Prestar más',
            created_at: nowIso
          }).catch(() => {});

          // D. Actualizar registro padre en tabla debts
          const rawDataPayload = {
            payments,
            disbursements,
            initialAmount
          };

          const debtUpsertPayload = {
            id: ensureUUID(debtId),
            user_id: user.id,
            name: updatedDebtItem.name || updatedDebtItem.personName || 'Préstamo',
            person: updatedDebtItem.personName || updatedDebtItem.name || 'Préstamo',
            person_name: updatedDebtItem.personName || updatedDebtItem.name || 'Préstamo',
            type: updatedDebtItem.type || 'receivable',
            amount: newTotal,
            total_amount: newTotal,
            remaining_amount: remCap,
            current_balance: remCap,
            status: updatedDebtItem.status,
            notes: `PAYMENTS_JSON:${JSON.stringify(rawDataPayload)}`,
            raw_data: rawDataPayload,
            updated_at: nowIso
          };

          const { error: debtErr } = await supabase.from('debts').upsert(debtUpsertPayload, { onConflict: 'id' });
          if (debtErr) {
            console.warn('[useDebts] Reintentando upsert esencial de deuda en Supabase:', debtErr.message);
            await supabase.from('debts').upsert({
              id: ensureUUID(debtId),
              user_id: user.id,
              name: updatedDebtItem.name || updatedDebtItem.personName || 'Préstamo',
              type: updatedDebtItem.type || 'receivable',
              amount: newTotal,
              total_amount: newTotal,
              remaining_amount: remCap,
              notes: `PAYMENTS_JSON:${JSON.stringify(rawDataPayload)}`,
              updated_at: nowIso
            }, { onConflict: 'id' });
          }
        }
      } catch (cloudErr) {
        console.warn('[useDebts] Error sincronizando desembolso con Supabase:', cloudErr);
      }
    }

    toast.success('Desembolso registrado correctamente');
    return updatedDebtItem;
  }, [debtsAndLoans, accounts, setAccounts, setTransactions]);

  // Eliminar deuda o préstamo
  const handleDeleteDebtOrLoan = useCallback(async (itemId) => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (!window.confirm('¿Eliminar este registro de deuda/préstamo?')) return;
    }

    setDebtsAndLoans((prev) => {
      const nextDebts = prev.filter((item) => item.id !== itemId);
      saveDebtsToStorage(nextDebts);
      return nextDebts;
    });

    if (setTransactions) {
      setTransactions((prev) => {
        const nextTxs = prev.filter((t) => t.debtId !== itemId);
        saveTransactionsToStorage(nextTxs);
        return nextTxs;
      });
    }

    if (isSupabaseConfigured && supabase) {
      supabase.from('debts').delete().eq('id', ensureUUID(itemId)).catch(() => {});
    }

    toast.info('Elemento eliminado');
  }, [setTransactions]);

  // Resetear deudas
  const resetDebts = useCallback(() => {
    setDebtsAndLoans([]);
    saveDebtsToStorage([]);
  }, []);

  return {
    debtsAndLoans,
    setDebtsAndLoans,
    handleAddDebtOrLoan,
    handleSaveLoan,
    handleUpdateDebtOrLoan,
    handleAddPayment,
    handleDeletePayment,
    handleAddDisbursement,
    handleDeleteDebtOrLoan,
    resetDebts
  };
}
