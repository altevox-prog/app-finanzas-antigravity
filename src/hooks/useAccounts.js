import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { INITIAL_ACCOUNTS } from '../data/initialData';
import { saveAccountsToStorage, saveTransactionsToStorage } from '../services/storageService';
import { normalizeAccountType, ensureUUID } from '../services/syncEngine';
import { generateUUID } from '../utils/recordMerger';
import { toSafeNumber } from '../utils/financeMath';
import { getAccountNativeBalance } from '../utils/currencyUtils';
import { toast } from '../utils/toast';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

function getInitialAccounts() {
  try {
    const saved = localStorage.getItem('presu_accounts') ||
                  localStorage.getItem(STORAGE_KEYS.ACCOUNTS) ||
                  localStorage.getItem('user_accounts') ||
                  localStorage.getItem('accounts') ||
                  localStorage.getItem('app_accounts');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
    return INITIAL_ACCOUNTS;
  } catch (e) {
    console.error('Error parseando cuentas:', e);
    return INITIAL_ACCOUNTS;
  }
}

export function useAccounts({
  isResettingRef,
  transactions = [],
  transactionsRef,
  trm = 4050,
  setTransactions,
  setTransactionsRef
} = {}) {
  const [accounts, setAccounts] = useState(getInitialAccounts);

  const getActiveTransactions = useCallback(() => {
    if (transactionsRef?.current) return transactionsRef.current;
    return transactions;
  }, [transactions, transactionsRef]);

  const getActiveSetTransactions = useCallback(() => {
    if (setTransactionsRef?.current) return setTransactionsRef.current;
    return setTransactions;
  }, [setTransactions, setTransactionsRef]);

  // Persistencia reactiva en localStorage
  useEffect(() => {
    if (isResettingRef?.current) return;
    saveAccountsToStorage(accounts);
  }, [accounts, isResettingRef]);

  // Agregar cuenta nueva
  const handleAddAccount = useCallback(async (newAcc) => {
    const id = (newAcc.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newAcc.id))
      ? newAcc.id
      : generateUUID();
    const parsedInitialBalance = toSafeNumber(newAcc.initialBalance ?? newAcc.initial_balance ?? newAcc.balance ?? newAcc.currentBalance ?? 0);
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
      updated_at: new Date().toISOString()
    };

    // Generar nuevo arreglo eliminando duplicados por ID o por firma idéntica
    const nextAccs = [
      ...accounts.filter((a) => a.id !== id && `${(a.name || '').trim().toLowerCase()}___${(a.currency || 'COP').toUpperCase()}` !== `${normalizedAcc.name.toLowerCase()}___${normalizedAcc.currency}`),
      normalizedAcc
    ];

    try {
      localStorage.setItem('presu_accounts', JSON.stringify(nextAccs));
      saveAccountsToStorage(nextAccs);
      setAccounts(nextAccs);

      // Sincronización inmediata directa con Supabase si está autenticado
      if (isSupabaseConfigured && supabase) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user?.id) {
            supabase.from('accounts').upsert({
              id: ensureUUID(normalizedAcc.id),
              user_id: user.id,
              name: normalizedAcc.name,
              type: normalizedAcc.type,
              currency: normalizedAcc.currency,
              balance: normalizedAcc.balance,
              initial_balance: normalizedAcc.initial_balance,
              icon: normalizedAcc.icon,
              color: normalizedAcc.color,
              updated_at: normalizedAcc.updated_at
            }, { onConflict: 'id' }).catch((e) => {
              console.warn('[useAccounts] Advertencia upsert Supabase:', e);
            });
          }
        }).catch(() => {});
      }

      toast.success('Cuenta guardada correctamente');
      return normalizedAcc;
    } catch (localErr) {
      console.error('Fallo real en localStorage:', localErr);
      toast.error('Error al guardar localmente');
      return null;
    }
  }, [accounts]);

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
    const liveBalance = getAccountNativeBalance({ ...existing, ...updatedAcc, initialBalance: parsedInitialBalance }, activeTxs, trm);

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
      updated_at: new Date().toISOString()
    };

    const nextAccs = accounts.map((a) => (a.id === normalizedAcc.id ? normalizedAcc : a));

    try {
      localStorage.setItem('presu_accounts', JSON.stringify(nextAccs));
      saveAccountsToStorage(nextAccs);
      setAccounts(nextAccs);
      const activeSetTxs = getActiveSetTransactions();
      if (activeSetTxs) {
        activeSetTxs((prev) =>
          prev.map((t) => (t.accountId === normalizedAcc.id ? { ...t, accountName: normalizedAcc.name } : t))
        );
      }

      // Sincronización inmediata directa con Supabase si está autenticado
      if (isSupabaseConfigured && supabase) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user?.id) {
            supabase.from('accounts').upsert({
              id: ensureUUID(normalizedAcc.id),
              user_id: user.id,
              name: normalizedAcc.name,
              type: normalizedAcc.type,
              currency: normalizedAcc.currency,
              balance: normalizedAcc.balance,
              initial_balance: normalizedAcc.initial_balance,
              icon: normalizedAcc.icon,
              color: normalizedAcc.color,
              updated_at: normalizedAcc.updated_at
            }, { onConflict: 'id' }).catch((e) => {
              console.warn('[useAccounts] Advertencia upsert Supabase:', e);
            });
          }
        }).catch(() => {});
      }

      toast.success('Cuenta guardada correctamente');
      return normalizedAcc;
    } catch (localErr) {
      console.error('Fallo real en localStorage:', localErr);
      toast.error('Error al guardar localmente');
      return null;
    }
  }, [accounts, getActiveTransactions, trm, getActiveSetTransactions]);

  // Eliminar cuenta
  const handleDeleteAccount = useCallback(async (accountId) => {
    try {
      const canonicalId = ensureUUID(accountId);
      const updated = accounts.filter((acc) => acc.id !== accountId && ensureUUID(acc.id) !== accountId);
      setAccounts(updated);
      localStorage.setItem('presu_accounts', JSON.stringify(updated));
      saveAccountsToStorage(updated);

      // Reconciliar transacciones locales vinculadas
      const activeSetTxs = getActiveSetTransactions();
      if (activeSetTxs) {
        activeSetTxs((prev) => {
          const nextTxs = prev.filter((t) => t.accountId !== accountId && t.accountId !== canonicalId);
          localStorage.setItem('presu_transactions', JSON.stringify(nextTxs));
          saveTransactionsToStorage(nextTxs);
          return nextTxs;
        });
      }

      if (isSupabaseConfigured && supabase) {
        supabase.from('accounts').delete().eq('id', canonicalId).catch(() => {});
        supabase.from('transactions').delete().eq('account_id', canonicalId).catch(() => {});
      }

      toast.success('Cuenta eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar cuenta:', error);
      toast.error('No se pudo eliminar la cuenta');
    }
  }, [accounts, getActiveSetTransactions]);

  const deleteAccount = handleDeleteAccount;

  // Reordenar cuentas
  const handleReorderAccounts = useCallback((newAccounts) => {
    setAccounts(newAccounts);
    saveAccountsToStorage(newAccounts);
  }, []);

  // Archivar o desarchivar cuenta
  const handleArchiveAccount = useCallback(async (accountId, isArchived = true) => {
    setAccounts((prev) => {
      const nextAccs = prev.map((acc) =>
        acc.id === accountId ? { ...acc, is_archived: isArchived, updated_at: new Date().toISOString() } : acc
      );
      saveAccountsToStorage(nextAccs);
      return nextAccs;
    });
    toast.success(isArchived ? 'Cuenta archivada' : 'Cuenta desarchivada');
  }, []);

  // Ajuste manual directo de balance
  const handleAdjustAccountBalance = useCallback(async (accountId, newBalance) => {
    const parsedBalance = toSafeNumber(newBalance);
    setAccounts((prev) => {
      const nextAccs = prev.map((acc) =>
        acc.id === accountId ? { ...acc, balance: parsedBalance, currentBalance: parsedBalance, updated_at: new Date().toISOString() } : acc
      );
      saveAccountsToStorage(nextAccs);
      return nextAccs;
    });
    toast.success('Saldo ajustado correctamente');
  }, []);

  // Resetear cuentas
  const resetAccounts = useCallback(() => {
    setAccounts([]);
    saveAccountsToStorage([]);
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
    handleArchiveAccount,
    handleAdjustAccountBalance,
    resetAccounts
  };
}
