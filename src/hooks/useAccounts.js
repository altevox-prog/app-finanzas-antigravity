import { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeAccountType, ensureUUID } from '../services/syncEngine';
import { generateUUID } from '../utils/recordMerger';
import { toSafeNumber } from '../utils/financeMath';
import { getAccountNativeBalance } from '../utils/currencyUtils';
import { toast } from '../utils/toast';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { normalizeRemoteAccount } from '../services/sync/syncNormalizers';

/**
 * Mapea una fila de Supabase a un objeto de cuenta normalizado para React
 */
export function mapSupabaseRowToAccount(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = normalizeRemoteAccount(row);
  const rawData = row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {};
  const parsedBalance = toSafeNumber(
    row.balance ?? row.current_balance ?? row.initial_balance ?? rawData.balance ?? 0
  );
  const parsedInitial = toSafeNumber(
    row.initial_balance ?? rawData.initial_balance ?? parsedBalance
  );

  return {
    ...normalized,
    id: row.id,
    name: (row.name || rawData.name || 'Cuenta').trim(),
    type: normalizeAccountType(row.type || rawData.type),
    currency: (row.currency || rawData.currency || 'COP').toUpperCase(),
    balance: parsedBalance,
    currentBalance: parsedBalance,
    current_balance: parsedBalance,
    initialBalance: parsedInitial,
    initial_balance: parsedInitial,
    color: row.color || rawData.color || '#007AFF',
    icon: row.icon || rawData.icon || 'Building2',
    order_index: row.order_index !== undefined && row.order_index !== null
      ? Number(row.order_index)
      : (rawData.order_index !== undefined ? Number(rawData.order_index) : 0),
    is_archived: Boolean(row.is_archived ?? rawData.is_archived ?? false),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  };
}

/**
 * useAccounts
 * Hook de cuentas conectado a Supabase Puro y sincronizado en tiempo real (Realtime).
 */
export function useAccounts({
  isResettingRef,
  transactions = [],
  transactionsRef,
  trm = 4050,
  setTransactions,
  setTransactionsRef,
  user: explicitUser = null
} = {}) {
  const [accounts, setAccounts] = useState([]);
  const [activeUser, setActiveUser] = useState(explicitUser);
  const activeUserRef = useRef(explicitUser);
  activeUserRef.current = activeUser;

  // 1. Obtener usuario activo de Supabase Auth
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

  const getActiveTransactions = useCallback(() => {
    if (transactionsRef?.current) return transactionsRef.current;
    return transactions;
  }, [transactions, transactionsRef]);

  const getActiveSetTransactions = useCallback(() => {
    if (setTransactionsRef?.current) return setTransactionsRef.current;
    return setTransactions;
  }, [setTransactions, setTransactionsRef]);

  // 2. Consulta y carga inicial reactiva desde Supabase
  const fetchAccounts = useCallback(async (userId = null) => {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      let uid = userId || activeUserRef.current?.id;
      if (!uid) {
        const user = await getSupabaseUser();
        uid = user?.id;
      }
      if (!uid) return [];

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', uid)
        .order('order_index', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('[useAccounts] Error al consultar cuentas desde Supabase:', error);
        return [];
      }

      if (Array.isArray(data)) {
        const mapped = data
          .map(mapSupabaseRowToAccount)
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        setAccounts(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.error('[useAccounts] Fallo al consultar cuentas:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    if (isResettingRef?.current) return;
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;

    fetchAccounts(activeUser.id);
  }, [activeUser?.id, isResettingRef, fetchAccounts]);

  // 3. Suscripción en Tiempo Real (Realtime WebSockets)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;

    const channelName = `realtime:accounts:${activeUser.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
          filter: `user_id=eq.${activeUser.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAcc = mapSupabaseRowToAccount(payload.new);
            setAccounts((prev) => {
              if (prev.some((a) => a.id === newAcc.id)) {
                return prev.map((a) => (a.id === newAcc.id ? { ...a, ...newAcc } : a));
              }
              return [...prev, newAcc].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedAcc = mapSupabaseRowToAccount(payload.new);
            setAccounts((prev) =>
              prev
                .map((a) => (a.id === updatedAcc.id ? { ...a, ...updatedAcc } : a))
                .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setAccounts((prev) => prev.filter((a) => a.id !== deletedId));
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

  // Agregar cuenta nueva
  const handleAddAccount = useCallback(async (newAcc) => {
    const id = (newAcc.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newAcc.id))
      ? newAcc.id
      : generateUUID();
    const parsedInitialBalance = toSafeNumber(
      newAcc.initialBalance ?? newAcc.initial_balance ?? newAcc.balance ?? newAcc.currentBalance ?? 0
    );

    const normalizedAcc = {
      ...newAcc,
      id,
      name: (newAcc.name || 'Cuenta').trim(),
      type: normalizeAccountType(newAcc.type),
      currency: (newAcc.currency || 'COP').toUpperCase(),
      initialBalance: parsedInitialBalance,
      initial_balance: parsedInitialBalance,
      balance: parsedInitialBalance,
      currentBalance: parsedInitialBalance,
      current_balance: parsedInitialBalance,
      color: newAcc.color || '#007AFF',
      icon: newAcc.icon || 'Building2',
      order_index: typeof newAcc.order_index === 'number' ? newAcc.order_index : accounts.length,
      updated_at: new Date().toISOString()
    };

    // Actualización optimista inmediata en React
    setAccounts((prev) => [
      ...prev.filter((a) => a.id !== id && `${(a.name || '').trim().toLowerCase()}___${(a.currency || 'COP').toUpperCase()}` !== `${normalizedAcc.name.toLowerCase()}___${normalizedAcc.currency}`),
      normalizedAcc
    ].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const { error } = await supabase.from('accounts').upsert({
            id: ensureUUID(normalizedAcc.id),
            user_id: user.id,
            name: normalizedAcc.name,
            type: normalizedAcc.type,
            currency: normalizedAcc.currency,
            balance: normalizedAcc.balance,
            initial_balance: normalizedAcc.initial_balance,
            icon: normalizedAcc.icon,
            color: normalizedAcc.color,
            order_index: normalizedAcc.order_index,
            updated_at: normalizedAcc.updated_at
          }, { onConflict: 'id' });

          if (error) {
            console.error('[useAccounts] Error en upsert Supabase:', error);
            toast.error('Error al guardar en la nube');
          }
        }
      } catch (e) {
        console.error('[useAccounts] Excepción al guardar cuenta en Supabase:', e);
      }
    }

    toast.success('Cuenta guardada correctamente');
    return normalizedAcc;
  }, [accounts.length]);

  const handleSaveAccount = handleAddAccount;

  // Actualizar cuenta existente
  const handleUpdateAccount = useCallback(async (updatedAcc) => {
    const existing = accounts.find((a) => a.id === updatedAcc.id) || {};
    const parsedInitialBalance = toSafeNumber(
      updatedAcc.initialBalance ??
      updatedAcc.initial_balance ??
      updatedAcc.balance ??
      existing.initialBalance ??
      existing.initial_balance ??
      existing.balance ?? 0
    );
    const activeTxs = getActiveTransactions();
    const liveBalance = getAccountNativeBalance(
      { ...existing, ...updatedAcc, initialBalance: parsedInitialBalance },
      activeTxs,
      trm
    );

    const normalizedAcc = {
      ...existing,
      ...updatedAcc,
      id: updatedAcc.id,
      name: (updatedAcc.name || existing.name || 'Cuenta').trim(),
      type: normalizeAccountType(updatedAcc.type || existing.type),
      currency: (updatedAcc.currency || existing.currency || 'COP').toUpperCase(),
      initialBalance: parsedInitialBalance,
      initial_balance: parsedInitialBalance,
      balance: liveBalance,
      currentBalance: liveBalance,
      current_balance: liveBalance,
      color: updatedAcc.color || existing.color || '#007AFF',
      icon: updatedAcc.icon || existing.icon || 'Building2',
      order_index: typeof updatedAcc.order_index === 'number' ? updatedAcc.order_index : (existing.order_index ?? 0),
      updated_at: new Date().toISOString()
    };

    // Actualización optimista en React
    setAccounts((prev) =>
      prev
        .map((a) => (a.id === normalizedAcc.id ? normalizedAcc : a))
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    );

    const activeSetTxs = getActiveSetTransactions();
    if (activeSetTxs) {
      activeSetTxs((prev) =>
        prev.map((t) => (t.accountId === normalizedAcc.id ? { ...t, accountName: normalizedAcc.name } : t))
      );
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const { error } = await supabase.from('accounts').upsert({
            id: ensureUUID(normalizedAcc.id),
            user_id: user.id,
            name: normalizedAcc.name,
            type: normalizedAcc.type,
            currency: normalizedAcc.currency,
            balance: normalizedAcc.balance,
            initial_balance: normalizedAcc.initial_balance,
            icon: normalizedAcc.icon,
            color: normalizedAcc.color,
            order_index: normalizedAcc.order_index,
            updated_at: normalizedAcc.updated_at
          }, { onConflict: 'id' });

          if (error) {
            console.error('[useAccounts] Error al actualizar cuenta en Supabase:', error);
            toast.error('Error al actualizar en la nube');
          }
        }
      } catch (e) {
        console.error('[useAccounts] Excepción al actualizar cuenta en Supabase:', e);
      }
    }

    toast.success('Cuenta guardada correctamente');
    return normalizedAcc;
  }, [accounts, getActiveTransactions, trm, getActiveSetTransactions]);

  // Eliminar cuenta y transacciones vinculadas directamente en Supabase
  const handleDeleteAccount = useCallback(async (accountId) => {
    if (!accountId) return;
    try {
      const canonicalId = ensureUUID(accountId);

      // Actualización optimista en React
      setAccounts((prev) => prev.filter((acc) => acc.id !== accountId && ensureUUID(acc.id) !== accountId));

      const activeSetTxs = getActiveSetTransactions();
      if (activeSetTxs) {
        activeSetTxs((prev) => prev.filter((t) => t.accountId !== accountId && t.accountId !== canonicalId));
      }

      if (isSupabaseConfigured && supabase) {
        try {
          const user = activeUserRef.current || (await getSupabaseUser());

          let accQuery = supabase.from('accounts').delete().eq('id', canonicalId);
          if (user?.id) accQuery = accQuery.eq('user_id', user.id);
          const { error: accError } = await accQuery;
          if (accError) console.error('[useAccounts] Error al eliminar cuenta en Supabase:', accError);

          let txQuery = supabase.from('transactions').delete().eq('account_id', canonicalId);
          if (user?.id) txQuery = txQuery.eq('user_id', user.id);
          const { error: txError } = await txQuery;
          if (txError) console.error('[useAccounts] Error al eliminar transacciones vinculadas en Supabase:', txError);
        } catch (err) {
          console.error('[useAccounts] Error en delete Supabase:', err);
        }
      }

      toast.success('Cuenta eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar cuenta:', error);
      toast.error('No se pudo eliminar la cuenta');
    }
  }, [getActiveSetTransactions]);

  const deleteAccount = handleDeleteAccount;

  // Persistir el orden reordenado directamente en Supabase
  const updateAccountsOrder = useCallback(async (reorderedAccounts) => {
    if (!isSupabaseConfigured || !supabase || !Array.isArray(reorderedAccounts)) return;
    try {
      const updates = reorderedAccounts.map((account, index) => ({
        id: account.id,
        order_index: index,
      }));

      await Promise.all(
        updates.map(async (item) => {
          const { error } = await supabase
            .from('accounts')
            .update({ order_index: item.order_index })
            .eq('id', item.id);

          if (error) throw error;
        })
      );
    } catch (err) {
      console.error('Error al persistir el nuevo orden de las cuentas:', err);
    }
  }, []);

  // Reordenar cuentas (actualización optimista y persistencia en Supabase)
  const handleReorderAccounts = useCallback((newAccounts) => {
    if (!Array.isArray(newAccounts)) return;
    const indexedAccounts = newAccounts.map((account, index) => ({
      ...account,
      order_index: index
    }));

    // Actualización inmediata del estado de React
    setAccounts(indexedAccounts);

    // Persistencia asíncrona hacia Supabase
    updateAccountsOrder(indexedAccounts);
  }, [updateAccountsOrder]);

  // Archivar o desarchivar cuenta
  const handleArchiveAccount = useCallback(async (accountId, isArchived = true) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId ? { ...acc, is_archived: isArchived, updated_at: new Date().toISOString() } : acc
      )
    );

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        let query = supabase
          .from('accounts')
          .update({ is_archived: isArchived, updated_at: new Date().toISOString() })
          .eq('id', ensureUUID(accountId));
        if (user?.id) query = query.eq('user_id', user.id);
        await query;
      } catch (err) {
        console.error('[useAccounts] Error al archivar cuenta en Supabase:', err);
      }
    }

    toast.success(isArchived ? 'Cuenta archivada' : 'Cuenta desarchivada');
  }, []);

  // Ajuste manual directo de balance
  const handleAdjustAccountBalance = useCallback(async (accountId, newBalance) => {
    const parsedBalance = toSafeNumber(newBalance);
    const nowIso = new Date().toISOString();

    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId ? { ...acc, balance: parsedBalance, currentBalance: parsedBalance, updated_at: nowIso } : acc
      )
    );

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        let query = supabase
          .from('accounts')
          .update({ balance: parsedBalance, updated_at: nowIso })
          .eq('id', ensureUUID(accountId));
        if (user?.id) query = query.eq('user_id', user.id);
        await query;
      } catch (err) {
        console.error('[useAccounts] Error al ajustar saldo en Supabase:', err);
      }
    }

    toast.success('Saldo ajustado correctamente');
  }, []);

  // Resetear cuentas a cero en React
  const resetAccounts = useCallback(() => {
    setAccounts([]);
  }, []);

  return {
    accounts,
    setAccounts,
    handleAddAccount,
    handleSaveAccount,
    handleUpdateAccount,
    handleDeleteAccount,
    deleteAccount,
    handleReorderAccounts,
    updateAccountsOrder,
    fetchAccounts,
    handleArchiveAccount,
    handleAdjustAccountBalance,
    resetAccounts
  };
}
