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
      if (Array.isArray(parsed)) return parsed;
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
    const itemWithId = {
      ...newItem,
      id: newItem.id || crypto.randomUUID(),
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
          supabase.from('debts').upsert({
            id: ensureUUID(itemWithId.id),
            user_id: user.id,
            name: itemWithId.name || itemWithId.personName || 'Deuda',
            type: itemWithId.type,
            amount: toSafeNumber(itemWithId.totalAmount || itemWithId.amount),
            notes: itemWithId.notes || '',
            due_date: itemWithId.dueDate || itemWithId.computedDueDate || null,
            updated_at: itemWithId.updated_at
          }, { onConflict: 'id' }).catch((e) => {
            console.warn('[useDebts] Advertencia upsert Supabase:', e);
          });
        }
      }).catch(() => {});
    }

    return itemWithId;
  }, []);

  const handleSaveLoan = handleAddDebtOrLoan;

  // Actualizar deuda o préstamo
  const handleUpdateDebtOrLoan = useCallback(async (updatedItem) => {
    const sanitized = {
      ...updatedItem,
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
          supabase.from('debts').upsert({
            id: ensureUUID(sanitized.id),
            user_id: user.id,
            name: sanitized.name || sanitized.personName || 'Deuda',
            type: sanitized.type,
            amount: toSafeNumber(sanitized.totalAmount || sanitized.amount),
            notes: sanitized.notes || '',
            due_date: sanitized.dueDate || sanitized.computedDueDate || null,
            updated_at: sanitized.updated_at
          }, { onConflict: 'id' }).catch((e) => {
            console.warn('[useDebts] Advertencia upsert Supabase:', e);
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
            isPaid,
            is_paid: isPaid,
            status: isPaid ? 'paid' : (item.status === 'paid' ? 'active' : (item.status || 'active')),
            payments
          };
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
            isPaid,
            is_paid: isPaid,
            status: isPaid ? 'paid' : (item.status === 'paid' ? 'active' : (item.status || 'active')),
            payments: remainingPayments
          };
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
  const handleAddDisbursement = useCallback((debtId, disbursementData) => {
    const { amount, date, fromAccountId, notes } = disbursementData;
    const disbAmount = Number(amount) || 0;
    if (disbAmount <= 0) return;

    const debtItem = debtsAndLoans.find((d) => d.id === debtId);
    if (!debtItem) return;

    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const fromAccName = fromAcc?.name || 'Cuenta Principal';
    const debtName = debtItem.personName || debtItem.name || 'Préstamo';

    // 1. Descontar inmediatamente el dinero prestado de la cuenta de origen
    if (fromAccountId && setAccounts) {
      setAccounts((prevAccounts) => {
        const updated = prevAccounts.map((acc) => {
          if (acc.id === fromAccountId) {
            const curBal = Number(acc.balance) || 0;
            const newBal = curBal - disbAmount;
            return { ...acc, balance: newBal, updated_at: new Date().toISOString() };
          }
          return acc;
        });
        saveAccountsToStorage(updated);
        return updated;
      });
    }

    // 2. Registrar transacción de gasto en transactions
    const txId = 'tx-disb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newTx = {
      id: txId,
      date: date || new Date().toISOString().split('T')[0],
      type: 'expense',
      amount: disbAmount,
      originalCurrency: 'COP',
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
    const newDisbursementRecord = {
      id: 'disb-' + Date.now(),
      amount: disbAmount,
      date: date || new Date().toISOString().split('T')[0],
      fromAccountId,
      fromAccountName: fromAccName,
      notes: notes || '',
      transactionId: txId
    };

    setDebtsAndLoans((prev) => {
      const nextDebts = prev.map((item) => {
        if (item.id === debtId) {
          const oldBase = Number(item.principalAmount || item.totalAmount) || 0;
          const newBase = oldBase + disbAmount;
          const oldTotal = Number(item.totalAmount) || oldBase;
          const newTotal = oldTotal + disbAmount;
          const disbursements = [...(item.disbursements || []), newDisbursementRecord];

          // Recalcular saldo pendiente
          const payments = item.payments || [];
          const totalCapPaid = payments.reduce((s, p) => s + (p.capitalAmount !== undefined ? Number(p.capitalAmount) : (p.mode === 'interest' ? 0 : Number(p.amount) || 0)), 0);
          const remCap = Math.max(0, newBase - totalCapPaid);
          const remInt = Number(item.remainingInterest) || 0;
          const totRem = remCap + remInt;
          const isPaid = totRem <= 1 || remCap <= 0.01;

          const updated = {
            ...item,
            principalAmount: newBase,
            totalAmount: newTotal,
            remainingCapital: remCap,
            remainingAmount: remCap,
            remaining_amount: remCap,
            totalRemaining: totRem,
            isPaid,
            is_paid: isPaid,
            status: isPaid ? 'paid' : (item.status === 'paid' ? 'active' : (item.status || 'active')),
            disbursements
          };
          return updated;
        }
        return item;
      });
      saveDebtsToStorage(nextDebts);
      return nextDebts;
    });
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
