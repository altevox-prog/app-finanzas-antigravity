import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateElapsedMonths } from '../utils/debtAlerts';
import { toast } from '../utils/toast';
import { ensureUUID } from '../services/syncEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { toSafeNumber } from '../utils/financeMath';
import { normalizeRemoteDebt } from '../services/sync/syncNormalizers';

/**
 * Mapea una fila de Supabase a un objeto de deuda/préstamo normalizado para React
 */
export function mapSupabaseRowToDebt(row) {
  if (!row || typeof row !== 'object') return row;
  return normalizeRemoteDebt(row);
}

/**
 * Mapea un objeto local de deuda al payload para Supabase
 */
export function mapDebtToSupabasePayload(item, userId) {
  const cleanId = ensureUUID(item.id);
  const nowIso = new Date().toISOString();
  const baseAmount = toSafeNumber(item.totalAmount || item.amount || item.principalAmount || item.initialAmount);
  const remAmount = toSafeNumber(item.remainingAmount ?? item.remaining_amount ?? baseAmount);

  const rawDataPayload = {
    payments: Array.isArray(item.payments) ? item.payments : [],
    disbursements: Array.isArray(item.disbursements) ? item.disbursements : [],
    initialAmount: toSafeNumber(item.initialAmount ?? item.initial_amount ?? baseAmount),
    totalAmount: baseAmount,
    dueDate: item.dueDate || item.due_date || item.computedDueDate || null,
    interestRate: toSafeNumber(item.interestRate || item.interest_rate || 0),
    startDate: item.startDate || item.start_date || null,
    notes: item.notes || item.note || '',
    updated_at: nowIso
  };

  return {
    id: cleanId,
    user_id: userId,
    name: item.name || item.personName || 'Deuda',
    person: item.personName || item.name || 'Deuda',
    person_name: item.personName || item.name || 'Deuda',
    type: item.type || 'payable',
    amount: baseAmount,
    total_amount: baseAmount,
    remaining_amount: remAmount,
    current_balance: remAmount,
    status: item.status || (remAmount <= 0.01 ? 'paid' : 'active'),
    due_date: item.dueDate || item.due_date || item.computedDueDate || null,
    notes: `PAYMENTS_JSON:${JSON.stringify(rawDataPayload)}`,
    raw_data: rawDataPayload,
    updated_at: nowIso
  };
}

/**
 * useDebts
 * Hook de gestión de deudas y préstamos conectado a Supabase Puro y sincronizado en tiempo real (Realtime).
 */
export function useDebts({
  isResettingRef,
  accounts = [],
  categories = [],
  setAccounts,
  setTransactions,
  setCategories,
  user: explicitUser = null
} = {}) {
  // Inicialización limpia en memoria vacía
  const [debtsAndLoans, setDebtsAndLoans] = useState([]);
  const [activeUser, setActiveUser] = useState(explicitUser);
  const activeUserRef = useRef(explicitUser);
  activeUserRef.current = activeUser;

  // 1. Detección y suscripción a la sesión del usuario de Supabase Auth
  useEffect(() => {
    if (explicitUser) {
      setActiveUser(explicitUser);
      return;
    }

    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;
    getSupabaseUser().then((u) => {
      if (isMounted && u?.id) {
        setActiveUser(u);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setActiveUser(session?.user || null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [explicitUser]);

  // 2. Consulta y carga inicial reactiva desde Supabase
  const fetchDebts = useCallback(async (userId = null) => {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      let uid = userId || activeUserRef.current?.id;
      if (!uid) {
        const user = await getSupabaseUser();
        uid = user?.id;
      }
      if (!uid) return [];

      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useDebts] Error al consultar deudas en Supabase:', error);
        return [];
      }

      if (Array.isArray(data)) {
        const mapped = data.map(mapSupabaseRowToDebt);
        setDebtsAndLoans(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.error('[useDebts] Fallo al consultar deudas:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    if (isResettingRef?.current) return;
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;

    fetchDebts(activeUser.id);
  }, [activeUser?.id, isResettingRef, fetchDebts]);

  // 3. Suscripción en Tiempo Real (Realtime WebSockets)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;

    const channelName = `realtime:debts:${activeUser.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'debts',
          filter: `user_id=eq.${activeUser.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newDebt = mapSupabaseRowToDebt(payload.new);
            setDebtsAndLoans((prev) => {
              if (prev.some((d) => d.id === newDebt.id || ensureUUID(d.id) === ensureUUID(newDebt.id))) {
                return prev.map((d) => (d.id === newDebt.id || ensureUUID(d.id) === ensureUUID(newDebt.id) ? { ...d, ...newDebt } : d));
              }
              return [newDebt, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedDebt = mapSupabaseRowToDebt(payload.new);
            setDebtsAndLoans((prev) =>
              prev.map((d) => (d.id === updatedDebt.id || ensureUUID(d.id) === ensureUUID(updatedDebt.id) ? { ...d, ...updatedDebt } : d))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setDebtsAndLoans((prev) => prev.filter((d) => d.id !== deletedId && ensureUUID(d.id) !== ensureUUID(deletedId)));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUser?.id]);

  // 4. Operaciones CRUD directas a Supabase

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

    // Actualización optimista en React
    setDebtsAndLoans((prev) => [itemWithId, ...prev]);

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const payload = mapDebtToSupabasePayload(itemWithId, user.id);
          const { error } = await supabase.from('debts').upsert(payload, { onConflict: 'id' });
          if (error) {
            console.warn('[useDebts] Advertencia upsert Supabase:', error.message);
            toast.error('Error al guardar en la nube');
          }
        }
      } catch (e) {
        console.error('[useDebts] Excepción al guardar deuda en Supabase:', e);
      }
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

    // Actualización optimista en React
    setDebtsAndLoans((prev) => prev.map((item) => (item.id === sanitized.id ? { ...item, ...sanitized } : item)));

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const payload = mapDebtToSupabasePayload(sanitized, user.id);
          const { error } = await supabase.from('debts').upsert(payload, { onConflict: 'id' });
          if (error) {
            console.warn('[useDebts] Advertencia al actualizar deuda en Supabase:', error.message);
          }
        }
      } catch (e) {
        console.error('[useDebts] Excepción al actualizar deuda en Supabase:', e);
      }
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
        return [...prev, newFinCat];
      });
    }

    const targetAccId = payment.accountId || accounts[0]?.id || 'acc-1';
    const targetAcc = accounts.find((a) => a.id === targetAccId);
    const targetAccName = payment.accountName || targetAcc?.name || 'Principal';
    const nowIso = new Date().toISOString();

    // 1. Movimiento de intereses (si aplica)
    if (intAmt > 0) {
      const txIntId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ensureUUID('tx-int-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6));
      createdTxIds.push(txIntId);
      const newTxInt = {
        id: txIntId,
        date: payment.date || nowIso.split('T')[0],
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
      const txCapId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ensureUUID('tx-cap-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6));
      createdTxIds.push(txCapId);
      const newTxCap = {
        id: txCapId,
        date: payment.date || nowIso.split('T')[0],
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
        isDebtPayment: true,
        isTransfer: true,
        is_transfer: true,
        isDebtCapital: true
      };
      newTransactions.push(newTxCap);
    }

    // Guardar transacciones para actualizar historial
    if (newTransactions.length > 0 && setTransactions) {
      setTransactions((prev) => [...newTransactions, ...prev]);

      if (isSupabaseConfigured && supabase) {
        getSupabaseUser().then((user) => {
          if (user?.id) {
            newTransactions.forEach((tx) => {
              supabase.from('transactions').upsert({
                id: ensureUUID(tx.id),
                user_id: user.id,
                account_id: tx.accountId ? ensureUUID(tx.accountId) : null,
                amount: tx.amount,
                type: tx.type,
                date: tx.date,
                description: tx.note,
                category: tx.categoryName,
                notes: tx.note,
                is_transfer: Boolean(tx.isTransfer ?? tx.is_transfer ?? false),
                updated_at: nowIso
              }, { onConflict: 'id' }).catch(() => {});
            });
          }
        });
      }
    }

    // Actualización atómica de saldo en la cuenta
    let newAccBalance = null;
    if (targetAccId && totAmt > 0 && setAccounts) {
      setAccounts((prevAccounts) =>
        prevAccounts.map((acc) => {
          if (acc.id === targetAccId) {
            const curBal = Number(acc.balance) || 0;
            const newBal = isReceivable ? curBal + totAmt : curBal - totAmt;
            newAccBalance = newBal;
            return { ...acc, balance: newBal, updated_at: nowIso };
          }
          return acc;
        })
      );

      if (isSupabaseConfigured && supabase && targetAccId) {
        getSupabaseUser().then((user) => {
          if (user?.id) {
            supabase
              .from('accounts')
              .select('balance')
              .eq('id', ensureUUID(targetAccId))
              .maybeSingle()
              .then(({ data: accData }) => {
                if (accData) {
                  const currentDbBal = Number(accData.balance) || 0;
                  const calculatedBal = isReceivable ? currentDbBal + totAmt : currentDbBal - totAmt;
                  supabase
                    .from('accounts')
                    .update({ balance: calculatedBal, updated_at: nowIso })
                    .eq('id', ensureUUID(targetAccId))
                    .catch(() => {});
                }
              });
          }
        });
      }
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

    setDebtsAndLoans((prev) =>
      prev.map((item) => {
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
            getSupabaseUser().then((user) => {
              if (user?.id) {
                const payload = mapDebtToSupabasePayload(updated, user.id);
                supabase.from('debts').upsert(payload, { onConflict: 'id' }).catch(() => {});

                // Registrar en tabla debt_payments
                supabase.from('debt_payments').insert({
                  id: ensureUUID(payment.id || crypto.randomUUID()),
                  debt_id: ensureUUID(itemId),
                  user_id: user.id,
                  amount: totAmt,
                  type: 'PAYMENT',
                  payment_type: payment.mode === 'interest' ? 'INTEREST' : 'CAPITAL',
                  date: payment.date || nowIso.split('T')[0],
                  notes: payment.note || 'Abono registrado',
                  created_at: nowIso
                }).catch(() => {});
              }
            });
          }

          return updated;
        }
        return item;
      })
    );
  }, [debtsAndLoans, accounts, categories, setAccounts, setTransactions, setCategories]);

  // Eliminar abono / pago
  const handleDeletePayment = useCallback((itemId, paymentId) => {
    const debtItem = debtsAndLoans.find((d) => d.id === itemId);
    const paymentToDelete = debtItem?.payments?.find((p) => p.id === paymentId);
    const nowIso = new Date().toISOString();

    // Revertir el saldo en la cuenta afectada
    if (paymentToDelete && paymentToDelete.accountId && setAccounts) {
      const isReceivable = debtItem?.type === 'receivable';
      const totAmt = Number(paymentToDelete.amount) || 0;
      if (totAmt > 0) {
        setAccounts((prevAccounts) =>
          prevAccounts.map((acc) => {
            if (acc.id === paymentToDelete.accountId) {
              const curBal = Number(acc.balance) || 0;
              const newBal = isReceivable ? curBal - totAmt : curBal + totAmt;
              return { ...acc, balance: newBal, updated_at: nowIso };
            }
            return acc;
          })
        );

        if (isSupabaseConfigured && supabase && paymentToDelete.accountId) {
          getSupabaseUser().then((user) => {
            if (user?.id) {
              supabase
                .from('accounts')
                .select('balance')
                .eq('id', ensureUUID(paymentToDelete.accountId))
                .maybeSingle()
                .then(({ data: accData }) => {
                  if (accData) {
                    const currentDbBal = Number(accData.balance) || 0;
                    const calculatedBal = isReceivable ? currentDbBal - totAmt : currentDbBal + totAmt;
                    supabase
                      .from('accounts')
                      .update({ balance: calculatedBal, updated_at: nowIso })
                      .eq('id', ensureUUID(paymentToDelete.accountId))
                      .catch(() => {});
                  }
                });
            }
          });
        }
      }
    }

    setDebtsAndLoans((prev) =>
      prev.map((item) => {
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
            getSupabaseUser().then((user) => {
              if (user?.id) {
                const payload = mapDebtToSupabasePayload(updated, user.id);
                supabase.from('debts').upsert(payload, { onConflict: 'id' }).catch(() => {});

                // Eliminar registro en tabla debt_payments
                supabase
                  .from('debt_payments')
                  .delete()
                  .eq('id', ensureUUID(paymentId))
                  .catch(() => {});
              }
            });
          }

          return updated;
        }
        return item;
      })
    );

    // Revertir eliminando transacciones asociadas
    if (setTransactions) {
      setTransactions((prev) => prev.filter((t) => t.paymentId !== paymentId));

      if (isSupabaseConfigured && supabase && paymentToDelete?.transactionIds?.length > 0) {
        paymentToDelete.transactionIds.forEach((txId) => {
          supabase.from('transactions').delete().eq('id', ensureUUID(txId)).catch(() => {});
        });
      }
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
      setAccounts((prevAccounts) =>
        prevAccounts.map((acc) => {
          if (acc.id === fromAccountId) {
            const curBal = Number(acc.balance) || 0;
            const newBal = curBal - disbAmount;
            updatedAccountBalance = newBal;
            return { ...acc, balance: newBal, updated_at: nowIso };
          }
          return acc;
        })
      );
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
      setTransactions((prev) => [newTx, ...prev]);
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

    setDebtsAndLoans((prev) => prev.map((item) => (item.id === debtId ? updatedDebtItem : item)));

    // 4. Persistencia directa en Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          // Descontar saldo en la cuenta de origen en Supabase
          if (fromAccountId && updatedAccountBalance !== null) {
            supabase.from('accounts').update({
              balance: updatedAccountBalance,
              updated_at: nowIso
            }).eq('id', ensureUUID(fromAccountId)).catch(() => {});
          }

          // Insertar transacción de salida en transactions
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
          }, { onConflict: 'id' }).catch(() => {});

          // Registrar en debt_payments con tipo "INCREMENT"
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

          // Actualizar registro padre en tabla debts
          const debtPayload = mapDebtToSupabasePayload(updatedDebtItem, user.id);
          await supabase.from('debts').upsert(debtPayload, { onConflict: 'id' });
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

    const canonicalId = ensureUUID(itemId);

    // Actualización optimista en React
    setDebtsAndLoans((prev) => prev.filter((item) => item.id !== itemId && ensureUUID(item.id) !== canonicalId));

    if (setTransactions) {
      setTransactions((prev) => prev.filter((t) => t.debtId !== itemId && ensureUUID(t.debtId) !== canonicalId));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());

        // Eliminar pagos asociados en debt_payments
        let paymentsQuery = supabase.from('debt_payments').delete().eq('debt_id', canonicalId);
        if (user?.id) paymentsQuery = paymentsQuery.eq('user_id', user.id);
        await paymentsQuery.catch(() => {});

        // Eliminar deuda en tabla debts
        let debtQuery = supabase.from('debts').delete().eq('id', canonicalId);
        if (user?.id) debtQuery = debtQuery.eq('user_id', user.id);
        await debtQuery;
      } catch (err) {
        console.error('[useDebts] Error al eliminar deuda en Supabase:', err);
      }
    }

    toast.info('Elemento eliminado');
  }, [setTransactions]);

  // Resetear deudas a cero en memoria
  const resetDebts = useCallback(() => {
    setDebtsAndLoans([]);
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
    fetchDebts,
    resetDebts
  };
}
