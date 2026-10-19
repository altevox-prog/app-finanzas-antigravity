import { useState, useEffect, useCallback, useRef } from 'react';
import { ensureUUID } from '../services/syncEngine';
import { generateUUID } from '../utils/recordMerger';
import { toSafeNumber } from '../utils/financeMath';
import { getAccountNativeBalance } from '../utils/currencyUtils';
import { toast } from '../utils/toast';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { normalizeRemoteTransaction } from '../services/sync/syncNormalizers';

/**
 * Mapea una fila de la base de datos Supabase al formato esperado por el frontend
 */
export function mapSupabaseRowToTransaction(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = normalizeRemoteTransaction(row);
  const rawData = row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {};

  return {
    ...normalized,
    id: row.id,
    date: row.date || (row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0]),
    type: normalized.type || 'expense',
    amount: toSafeNumber(row.amount),
    originalAmount: toSafeNumber(row.original_amount ?? rawData.originalAmount ?? row.amount),
    originalCurrency: row.original_currency || rawData.originalCurrency || 'COP',
    exchangeRate: toSafeNumber(row.exchange_rate ?? rawData.exchangeRate ?? 1),
    accountId: row.account_id || rawData.accountId || null,
    account_id: row.account_id || rawData.accountId || null,
    accountName: rawData.accountName || '',
    categoryId: row.category_id || rawData.categoryId || null,
    category_id: row.category_id || rawData.categoryId || null,
    categoryName: normalized.categoryName || 'General',
    category: normalized.category || 'General',
    subcategoryId: rawData.subcategoryId || null,
    subcategoryName: rawData.subcategoryName || null,
    description: row.description || row.notes || rawData.description || 'Movimiento',
    note: row.notes || row.description || rawData.note || '',
    notes: row.notes || row.description || rawData.notes || '',
    isTransfer: Boolean(row.is_transfer ?? rawData.isTransfer ?? (normalized.type === 'transfer')),
    is_transfer: Boolean(row.is_transfer ?? rawData.is_transfer ?? (normalized.type === 'transfer')),
    fromAccountId: rawData.fromAccountId || null,
    toAccountId: rawData.toAccountId || null,
    fromAccountName: rawData.fromAccountName || null,
    toAccountName: rawData.toAccountName || null,
    receiptImage: rawData.receiptImage || null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  };
}

/**
 * Mapea un objeto de transacción del frontend a la carga útil (payload) de Supabase
 */
export function mapTransactionToSupabasePayload(tx, userId) {
  const cleanId = (tx.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tx.id))
    ? tx.id
    : ensureUUID(tx.id || generateUUID());

  const rawAccId = tx.accountId || tx.account_id || null;
  const cleanAccId = rawAccId ? ensureUUID(rawAccId) : null;
  const isTxTransfer = Boolean(tx.isTransfer || tx.is_transfer || tx.type === 'transfer' || tx.type === 'transferencia');
  const nowIso = new Date().toISOString();

  const rawData = {
    originalAmount: toSafeNumber(tx.originalAmount ?? tx.amount),
    originalCurrency: tx.originalCurrency || 'COP',
    exchangeRate: toSafeNumber(tx.exchangeRate || 1),
    accountName: tx.accountName || '',
    categoryId: tx.categoryId || tx.category_id || null,
    categoryName: tx.categoryName || tx.category || 'General',
    subcategoryId: tx.subcategoryId || null,
    subcategoryName: tx.subcategoryName || null,
    fromAccountId: tx.fromAccountId || null,
    toAccountId: tx.toAccountId || null,
    fromAccountName: tx.fromAccountName || null,
    toAccountName: tx.toAccountName || null,
    isTransfer: isTxTransfer,
    receiptImage: tx.receiptImage || null,
    note: (tx.note || tx.notes || '').trim()
  };

  return {
    id: cleanId,
    user_id: userId,
    type: tx.type || 'expense',
    amount: toSafeNumber(tx.amount),
    original_amount: toSafeNumber(tx.originalAmount ?? tx.amount),
    original_currency: tx.originalCurrency || 'COP',
    exchange_rate: toSafeNumber(tx.exchangeRate || 1),
    account_id: cleanAccId,
    category_id: tx.categoryId || tx.category_id || null,
    category: tx.category || tx.categoryName || 'General',
    date: tx.date || nowIso.split('T')[0],
    description: (tx.description || tx.notes || tx.note || 'Movimiento').trim(),
    notes: (tx.notes || tx.note || '').trim(),
    is_transfer: isTxTransfer,
    raw_data: rawData,
    updated_at: tx.updated_at || nowIso
  };
}

/**
 * useTransactions
 * Hook de transacciones conectado a Supabase Puro y sincronizado en tiempo real (Realtime).
 */
export function useTransactions({
  isResettingRef,
  accounts = [],
  setAccounts,
  trm = 4050,
  user: explicitUser = null
} = {}) {
  const [transactions, setTransactions] = useState([]);
  const [activeUser, setActiveUser] = useState(explicitUser);
  const activeUserRef = useRef(explicitUser);
  activeUserRef.current = activeUser;

  // Sincronizar referencia de cuentas para cálculos de saldo
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;

  // 1. Detectar usuario activo de Supabase Auth
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

  // Función para re-calcular saldos en el estado de cuentas
  const recalculateAccountsBalance = useCallback((currentTransactions) => {
    if (!setAccounts || !Array.isArray(accountsRef.current) || accountsRef.current.length === 0) return;

    setAccounts((prevAccounts) => {
      const sourceAccounts = Array.isArray(prevAccounts) && prevAccounts.length > 0 ? prevAccounts : accountsRef.current;

      return sourceAccounts.map((acc) => {
        // Obtener el saldo real persistido que vino de Supabase
        const storedBalance = toSafeNumber(
          acc.balance ?? acc.current_balance ?? acc.currentBalance ?? 0
        );
        const baseInitial = acc.initialBalance !== undefined && acc.initialBalance !== null
          ? acc.initialBalance
          : (acc.initial_balance !== undefined && acc.initial_balance !== null ? acc.initial_balance : storedBalance);

        // Filtrar si esta cuenta tiene transacciones reales en el conjunto actual (estrictamente por ID)
        const accId = acc.id;
        const hasTransactions = currentTransactions.some((t) => {
          if (!t || !accId) return false;
          const tAccId = t.accountId || t.account_id;
          const tToId = t.toAccountId || t.to_account_id;
          const tFromId = t.fromAccountId || t.from_account_id;
          return tAccId === accId || tToId === accId || tFromId === accId;
        });

        // Si la cuenta NO tiene transacciones asociadas, PRESERVAR su saldo persistido intacto
        if (!hasTransactions) {
          const stored = Number(acc.balance ?? acc.current_balance ?? acc.currentBalance ?? 0);
          return {
            ...acc,
            balance: stored,
            currentBalance: stored,
            current_balance: stored
          };
        }

        // Si sí tiene transacciones, calcular saldo dinámico con getAccountNativeBalance
        const liveBalance = getAccountNativeBalance({ ...acc, initialBalance: baseInitial }, currentTransactions, trm);

        return {
          ...acc,
          balance: liveBalance,
          currentBalance: liveBalance,
          current_balance: liveBalance
        };
      });
    });
  }, [setAccounts, trm]);

  // 2. Carga inicial desde Supabase al montar o al cambiar de usuario
  useEffect(() => {
    if (isResettingRef?.current) return;
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) {
      return;
    }

    let isMounted = true;

    async function fetchTransactions() {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', activeUser.id)
          .order('date', { ascending: false });

        if (error) {
          console.error('[useTransactions] Error al cargar transacciones de Supabase:', error);
          return;
        }

        if (isMounted && Array.isArray(data)) {
          const mapped = data.map(mapSupabaseRowToTransaction);
          setTransactions(mapped);
        }
      } catch (err) {
        console.error('[useTransactions] Fallo al consultar Supabase:', err);
      }
    }

    fetchTransactions();

    return () => {
      isMounted = false;
    };
  }, [activeUser?.id, isResettingRef]);

  // 3. Suscripción en Tiempo Real (Realtime)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) {
      return;
    }

    const channelName = `public:transactions:${activeUser.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${activeUser.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTx = mapSupabaseRowToTransaction(payload.new);
            setTransactions((prev) => {
              // Evitar duplicar si ya existe localmente
              if (prev.some((t) => t.id === newTx.id)) {
                return prev.map((t) => (t.id === newTx.id ? { ...t, ...newTx } : t));
              }
              const next = [newTx, ...prev];
              recalculateAccountsBalance(next);
              return next;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTx = mapSupabaseRowToTransaction(payload.new);
            setTransactions((prev) => {
              const next = prev.map((t) => (t.id === updatedTx.id ? { ...t, ...updatedTx } : t));
              recalculateAccountsBalance(next);
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setTransactions((prev) => {
                const next = prev.filter((t) => t.id !== deletedId);
                recalculateAccountsBalance(next);
                return next;
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUser?.id, recalculateAccountsBalance]);

  // 4. Operaciones CRUD asíncronas directas a Supabase

  // Agregar transacción nueva (ingreso o gasto)
  const handleAddTransaction = useCallback(async (newTx) => {
    const id = (newTx.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newTx.id))
      ? newTx.id
      : generateUUID();

    const sanitizedTx = {
      ...newTx,
      id,
      amount: toSafeNumber(newTx.amount),
      originalAmount: toSafeNumber(newTx.originalAmount ?? newTx.amount),
      exchangeRate: toSafeNumber(newTx.exchangeRate || 1),
      updated_at: new Date().toISOString()
    };

    // Actualizar optimísticamente el estado local
    setTransactions((prev) => {
      const next = [sanitizedTx, ...prev.filter((t) => t.id !== id)];
      recalculateAccountsBalance(next);
      return next;
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const payload = mapTransactionToSupabasePayload(sanitizedTx, user.id);
          const { error } = await supabase.from('transactions').upsert(payload, { onConflict: 'id' });
          if (error) {
            console.error('[useTransactions] Error en upsert Supabase:', error);
            toast.error('Error al sincronizar con la nube');
          }
        }
      } catch (e) {
        console.error('[useTransactions] Excepción al guardar en Supabase:', e);
      }
    }

    toast.success('Movimiento registrado con éxito');
    return sanitizedTx;
  }, [recalculateAccountsBalance]);

  const handleSaveTransaction = handleAddTransaction;

  // Actualizar transacción existente
  const handleUpdateTransaction = useCallback(async (updatedTx) => {
    const sanitizedTx = {
      ...updatedTx,
      amount: toSafeNumber(updatedTx.amount),
      originalAmount: toSafeNumber(updatedTx.originalAmount ?? updatedTx.amount),
      exchangeRate: toSafeNumber(updatedTx.exchangeRate || 1),
      updated_at: new Date().toISOString()
    };

    // Actualización optimista en React
    setTransactions((prev) => {
      const next = prev.map((t) => (t.id === sanitizedTx.id ? { ...t, ...sanitizedTx } : t));
      recalculateAccountsBalance(next);
      return next;
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const payload = mapTransactionToSupabasePayload(sanitizedTx, user.id);
          const { error } = await supabase.from('transactions').upsert(payload, { onConflict: 'id' });
          if (error) {
            console.error('[useTransactions] Error al actualizar en Supabase:', error);
            toast.error('Error al actualizar en la nube');
          }
        }
      } catch (e) {
        console.error('[useTransactions] Excepción al actualizar en Supabase:', e);
      }
    }

    toast.success('Movimiento actualizado con éxito');
    return sanitizedTx;
  }, [recalculateAccountsBalance]);

  // Eliminar transacción
  const handleDeleteTransaction = useCallback(async (txId) => {
    if (!txId) return false;

    const targetTx = transactions.find((t) => t.id === txId || (ensureUUID && ensureUUID(t.id) === txId));
    const isLinkedToDebt = Boolean(targetTx?.isDebtPayment || targetTx?.debtId || targetTx?.paymentId);

    if (isLinkedToDebt) {
      toast.warning('Esta transacción pertenece al abono de una deuda. Para revertirla y mantener los saldos al día, elimínala desde el módulo de Deudas.');
      return false;
    }

    // Actualización optimista inmediata en React
    setTransactions((prev) => {
      const next = prev.filter((t) => t.id !== txId && ensureUUID(t.id) !== txId);
      recalculateAccountsBalance(next);
      return next;
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        let query = supabase.from('transactions').delete().eq('id', ensureUUID(txId));
        if (user?.id) {
          query = query.eq('user_id', user.id);
        }
        const { error } = await query;
        if (error) {
          console.error('[useTransactions] Error al eliminar transacción en Supabase:', error);
        }
      } catch (err) {
        console.error('[useTransactions] Fallo en eliminación de transacción:', err);
      }
    }

    toast.info('Elemento eliminado');
    return true;
  }, [transactions, recalculateAccountsBalance]);

  // Transferencia entre cuentas (emite dos movimientos en Supabase)
  const handleExecuteTransfer = useCallback(async ({
    fromAcc,
    toAcc,
    amount,
    destAmount,
    fromCurrency,
    toCurrency,
    date,
    note
  }) => {
    if (!fromAcc?.id || !toAcc?.id || fromAcc.id === toAcc.id) {
      toast.error('Selecciona cuentas de origen y destino válidas y diferentes');
      return null;
    }

    const transferAmount = toSafeNumber(amount);
    if (transferAmount <= 0) {
      toast.error('El monto a transferir debe ser mayor a 0');
      return null;
    }

    const cleanDestAmount = destAmount !== undefined ? toSafeNumber(destAmount) : transferAmount;
    const rate = fromCurrency === 'USD' ? (Number(trm) || 4050) : fromCurrency === 'EUR' ? Math.round((Number(trm) || 4050) * 1.08) : 1;
    const copAmount = fromCurrency === 'COP' ? transferAmount : Math.round(transferAmount * rate);

    const outId = generateUUID();
    const inId = generateUUID();
    const nowIso = new Date().toISOString();

    // Débito / Gasto en cuenta origen
    const outTx = {
      id: outId,
      date: date || nowIso.split('T')[0],
      type: 'expense',
      amount: copAmount,
      originalAmount: transferAmount,
      originalCurrency: fromCurrency,
      exchangeRate: rate,
      categoryId: 'cat-transfer',
      categoryName: 'Transferencias',
      category: 'Transferencias',
      subcategoryId: 'sub-transfer-out',
      subcategoryName: 'Transferencia Enviada',
      accountId: fromAcc.id,
      accountName: fromAcc.name,
      fromAccountId: fromAcc.id,
      toAccountId: toAcc.id,
      fromAccountName: fromAcc.name,
      toAccountName: toAcc.name,
      note: note ? `Transferencia a ${toAcc.name}: ${note}` : `Transferencia a ${toAcc.name}`,
      notes: note ? `Transferencia a ${toAcc.name}: ${note}` : `Transferencia a ${toAcc.name}`,
      description: note ? `Transferencia a ${toAcc.name}: ${note}` : `Transferencia a ${toAcc.name}`,
      isTransfer: true,
      updated_at: nowIso
    };

    // Crédito / Ingreso en cuenta destino
    const inRate = toCurrency === 'USD' ? (Number(trm) || 4050) : toCurrency === 'EUR' ? Math.round((Number(trm) || 4050) * 1.08) : 1;
    const inTx = {
      id: inId,
      date: date || nowIso.split('T')[0],
      type: 'income',
      amount: copAmount,
      originalAmount: cleanDestAmount,
      originalCurrency: toCurrency,
      exchangeRate: inRate,
      categoryId: 'cat-transfer',
      categoryName: 'Transferencias',
      category: 'Transferencias',
      subcategoryId: 'sub-transfer-in',
      subcategoryName: 'Transferencia Recibida',
      accountId: toAcc.id,
      accountName: toAcc.name,
      fromAccountId: fromAcc.id,
      toAccountId: toAcc.id,
      fromAccountName: fromAcc.name,
      toAccountName: toAcc.name,
      note: note ? `Transferencia desde ${fromAcc.name}: ${note}` : `Transferencia desde ${fromAcc.name}`,
      notes: note ? `Transferencia desde ${fromAcc.name}: ${note}` : `Transferencia desde ${fromAcc.name}`,
      description: note ? `Transferencia desde ${fromAcc.name}: ${note}` : `Transferencia desde ${fromAcc.name}`,
      isTransfer: true,
      updated_at: nowIso
    };

    // Actualización optimista de estado local
    setTransactions((prev) => {
      const next = [inTx, outTx, ...prev];
      recalculateAccountsBalance(next);
      return next;
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const payloadOut = mapTransactionToSupabasePayload(outTx, user.id);
          const payloadIn = mapTransactionToSupabasePayload(inTx, user.id);
          const { error } = await supabase.from('transactions').upsert([payloadOut, payloadIn], { onConflict: 'id' });
          if (error) {
            console.error('[useTransactions] Error en transferencia Supabase:', error);
          }
        }
      } catch (e) {
        console.error('[useTransactions] Advertencia transferencia Supabase:', e);
      }
    }

    toast.success('Movimiento registrado con éxito');
    return { inTx, outTx };
  }, [trm, recalculateAccountsBalance]);

  const handleTransfer = handleExecuteTransfer;

  // Resetear transacciones a cero (limpieza en React sin persistir en localStorage)
  const resetTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  return {
    transactions,
    setTransactions,
    handleAddTransaction,
    handleSaveTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleExecuteTransfer,
    handleTransfer,
    resetTransactions
  };
}
