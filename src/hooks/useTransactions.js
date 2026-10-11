import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { INITIAL_TRANSACTIONS } from '../data/initialData';
import { saveTransactionsToStorage, saveAccountsToStorage } from '../services/storageService';
import { ensureUUID } from '../services/syncEngine';
import { generateUUID } from '../utils/recordMerger';
import { toSafeNumber } from '../utils/financeMath';
import { getAccountNativeBalance } from '../utils/currencyUtils';
import { toast } from '../utils/toast';
import { createDemoTransactions, seedTestTransactions } from '../utils/seedData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const TX_LEGACY_ID_MAP = {
  'acc-1': '00000001-0000-4000-8000-000000000001',
  'acc-2': '00000002-0000-4000-8000-000000000002',
  'acc-3': '00000003-0000-4000-8000-000000000003',
  'acc-4': '00000004-0000-4000-8000-000000000004',
  'acc-5': '00000005-0000-4000-8000-000000000005'
};

function getInitialTransactions() {
  try {
    const local = localStorage.getItem('presu_transactions') ||
                  localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) ||
                  localStorage.getItem('app_transactions') ||
                  localStorage.getItem('finanzas_transactions_v3') ||
                  localStorage.getItem('transactions');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const seen = new Set();
        let needsWrite = false;
        const result = parsed.filter((t) => {
          if (!t || !t.id) return false;
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        }).map((t) => {
          const txIdOK = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          const rawAccId = t.accountId || t.account_id;
          const migratedAccId = rawAccId && TX_LEGACY_ID_MAP[rawAccId]
            ? (needsWrite = true, TX_LEGACY_ID_MAP[rawAccId])
            : rawAccId;
          return {
            ...t,
            id: (t.id && txIdOK.test(t.id)) ? t.id : (t.id || generateUUID()),
            accountId: migratedAccId || t.accountId,
            amount: toSafeNumber(t.amount),
            originalAmount: toSafeNumber(t.originalAmount ?? t.amount),
            exchangeRate: toSafeNumber(t.exchangeRate || 1)
          };
        });
        if (needsWrite) {
          try {
            localStorage.setItem('presu_transactions', JSON.stringify(result));
          } catch {}
        }
        return result;
      }
    }
    // Si no existe ninguna clave en localStorage (primera vez absoluta), retornar vacío o demo
    return [];
  } catch (e) {
    console.error('Error parseando transacciones:', e);
    return [];
  }
}

export function useTransactions({
  isResettingRef,
  accounts = [],
  setAccounts,
  trm = 4050
} = {}) {
  const [transactions, setTransactions] = useState(getInitialTransactions);

  // Persistencia reactiva en localStorage
  useEffect(() => {
    if (isResettingRef?.current) return;
    saveTransactionsToStorage(transactions);
  }, [transactions, isResettingRef]);

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
    const updated = [sanitizedTx, ...transactions.filter((t) => t.id !== id)];

    try {
      localStorage.setItem('presu_transactions', JSON.stringify(updated));
      saveTransactionsToStorage(updated);
      setTransactions(updated);
    } catch (localErr) {
      console.error('Fallo real en localStorage:', localErr);
      toast.error('Error al guardar localmente');
      return null;
    }

    // Si es un movimiento de tipo transferencia con origen y destino válidos
    const isTxTransfer = Boolean(
      sanitizedTx.isTransfer ||
      sanitizedTx.is_transfer ||
      sanitizedTx.type === 'transfer' ||
      sanitizedTx.type === 'transferencia'
    );
    const fromId = sanitizedTx.fromAccountId || sanitizedTx.from_account_id;
    const toId = sanitizedTx.toAccountId || sanitizedTx.to_account_id;

    if (setAccounts && Array.isArray(accounts) && accounts.length > 0) {
      if (isTxTransfer && fromId && toId && fromId !== toId) {
        const transferAmount = toSafeNumber(sanitizedTx.originalAmount || sanitizedTx.amount);
        const updatedAccounts = accounts.map((acc) => {
          if (acc.id === fromId) {
            const currentBalance = toSafeNumber(acc.balance);
            return {
              ...acc,
              initialBalance: acc.initialBalance !== undefined ? acc.initialBalance : currentBalance,
              balance: currentBalance - transferAmount,
              currentBalance: currentBalance - transferAmount,
              updated_at: new Date().toISOString()
            };
          }
          if (acc.id === toId) {
            const currentBalance = toSafeNumber(acc.balance);
            return {
              ...acc,
              initialBalance: acc.initialBalance !== undefined ? acc.initialBalance : currentBalance,
              balance: currentBalance + transferAmount,
              currentBalance: currentBalance + transferAmount,
              updated_at: new Date().toISOString()
            };
          }
          return acc;
        });
        setAccounts(updatedAccounts);
        localStorage.setItem('presu_accounts', JSON.stringify(updatedAccounts));
        saveAccountsToStorage(updatedAccounts);
      } else {
        // Sincronizar saldos nativos de cuentas actualizadas sin duplicar descuentos
        const updatedAccounts = accounts.map((acc) => {
          const baseInitial = acc.initialBalance !== undefined 
            ? acc.initialBalance 
            : (acc.initial_balance !== undefined ? acc.initial_balance : acc.balance);
          const liveBalance = getAccountNativeBalance({ ...acc, initialBalance: baseInitial }, updated, trm);
          return {
            ...acc,
            initialBalance: baseInitial,
            balance: liveBalance,
            currentBalance: liveBalance,
            updated_at: new Date().toISOString()
          };
        });
        setAccounts(updatedAccounts);
        localStorage.setItem('presu_accounts', JSON.stringify(updatedAccounts));
        saveAccountsToStorage(updatedAccounts);
      }
    }

    toast.success('Movimiento registrado con éxito');
    return sanitizedTx;
  }, [transactions, accounts, setAccounts, trm]);

  const handleSaveTransaction = handleAddTransaction;

  // Actualizar transacción existente con ajuste retroactivo en saldos
  const handleUpdateTransaction = useCallback(async (updatedTx) => {
    const sanitizedTx = {
      ...updatedTx,
      amount: toSafeNumber(updatedTx.amount),
      originalAmount: toSafeNumber(updatedTx.originalAmount ?? updatedTx.amount),
      exchangeRate: toSafeNumber(updatedTx.exchangeRate || 1),
      updated_at: new Date().toISOString()
    };
    const updated = transactions.map((t) => (t.id === sanitizedTx.id ? sanitizedTx : t));

    try {
      localStorage.setItem('presu_transactions', JSON.stringify(updated));
      saveTransactionsToStorage(updated);
      setTransactions(updated);
    } catch (localErr) {
      console.error('Fallo real en localStorage:', localErr);
      toast.error('Error al guardar localmente');
      return null;
    }

    // Ajuste retroactivo en saldos de cuentas sin duplicar descuentos
    if (setAccounts && Array.isArray(accounts) && accounts.length > 0) {
      const nextAccounts = accounts.map((acc) => {
        const baseInitial = acc.initialBalance !== undefined 
          ? acc.initialBalance 
          : (acc.initial_balance !== undefined ? acc.initial_balance : acc.balance);
        const liveBalance = getAccountNativeBalance({ ...acc, initialBalance: baseInitial }, updated, trm);
        return {
          ...acc,
          initialBalance: baseInitial,
          balance: liveBalance,
          currentBalance: liveBalance,
          updated_at: new Date().toISOString()
        };
      });
      setAccounts(nextAccounts);
      localStorage.setItem('presu_accounts', JSON.stringify(nextAccounts));
      saveAccountsToStorage(nextAccounts);
    }

    toast.success('Movimiento actualizado con éxito');
    return sanitizedTx;
  }, [transactions, accounts, setAccounts, trm]);

  // Eliminar transacción con reversión de saldos
  const handleDeleteTransaction = useCallback(async (txId) => {
    const updated = transactions.filter((t) => t.id !== txId && ensureUUID(t.id) !== txId);

    try {
      localStorage.setItem('presu_transactions', JSON.stringify(updated));
      saveTransactionsToStorage(updated);
      setTransactions(updated);
    } catch (localErr) {
      console.error('Fallo real en localStorage:', localErr);
      toast.error('Error al guardar localmente');
      return;
    }

    // Revertir y ajustar saldos en las cuentas
    if (setAccounts && Array.isArray(accounts) && accounts.length > 0) {
      const nextAccounts = accounts.map((acc) => {
        const baseInitial = acc.initialBalance !== undefined 
          ? acc.initialBalance 
          : (acc.initial_balance !== undefined ? acc.initial_balance : acc.balance);
        const liveBalance = getAccountNativeBalance({ ...acc, initialBalance: baseInitial }, updated, trm);
        return {
          ...acc,
          initialBalance: baseInitial,
          balance: liveBalance,
          currentBalance: liveBalance,
          updated_at: new Date().toISOString()
        };
      });
      setAccounts(nextAccounts);
      localStorage.setItem('presu_accounts', JSON.stringify(nextAccounts));
      saveAccountsToStorage(nextAccounts);
    }

    if (isSupabaseConfigured && supabase) {
      supabase.from('transactions').delete().eq('id', ensureUUID(txId)).catch(() => {});
    }

    toast.info('Elemento eliminado');
  }, [transactions, accounts, setAccounts, trm]);

  // Transferencia entre cuentas
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

    // Débito / Gasto en cuenta origen
    const outTx = {
      id: outId,
      date: date || new Date().toISOString().split('T')[0],
      type: 'expense',
      amount: copAmount,
      originalAmount: transferAmount,
      originalCurrency: fromCurrency,
      exchangeRate: rate,
      categoryId: 'cat-transfer',
      categoryName: 'Transferencias',
      subcategoryId: 'sub-transfer-out',
      subcategoryName: 'Transferencia Enviada',
      accountId: fromAcc.id,
      accountName: fromAcc.name,
      fromAccountId: fromAcc.id,
      toAccountId: toAcc.id,
      note: note ? `Transferencia a ${toAcc.name}: ${note}` : `Transferencia a ${toAcc.name}`,
      notes: note ? `Transferencia a ${toAcc.name}: ${note}` : `Transferencia a ${toAcc.name}`,
      isTransfer: true,
      updated_at: new Date().toISOString()
    };

    // Crédito / Ingreso en cuenta destino
    const inRate = toCurrency === 'USD' ? (Number(trm) || 4050) : toCurrency === 'EUR' ? Math.round((Number(trm) || 4050) * 1.08) : 1;
    const inTx = {
      id: inId,
      date: date || new Date().toISOString().split('T')[0],
      type: 'income',
      amount: copAmount,
      originalAmount: cleanDestAmount,
      originalCurrency: toCurrency,
      exchangeRate: inRate,
      categoryId: 'cat-transfer',
      categoryName: 'Transferencias',
      subcategoryId: 'sub-transfer-in',
      subcategoryName: 'Transferencia Recibida',
      accountId: toAcc.id,
      accountName: toAcc.name,
      fromAccountId: fromAcc.id,
      toAccountId: toAcc.id,
      note: note ? `Transferencia desde ${fromAcc.name}: ${note}` : `Transferencia desde ${fromAcc.name}`,
      notes: note ? `Transferencia desde ${fromAcc.name}: ${note}` : `Transferencia desde ${fromAcc.name}`,
      isTransfer: true,
      updated_at: new Date().toISOString()
    };

    // Actualización atómica de saldos de ambas cuentas
    let updatedAccounts = accounts;
    if (setAccounts && Array.isArray(accounts)) {
      updatedAccounts = accounts.map((acc) => {
        if (acc.id === fromAcc.id) {
          const currentBalance = toSafeNumber(acc.balance);
          return {
            ...acc,
            initialBalance: acc.initialBalance !== undefined ? acc.initialBalance : currentBalance,
            balance: currentBalance - transferAmount,
            currentBalance: currentBalance - transferAmount,
            updated_at: new Date().toISOString()
          };
        }
        if (acc.id === toAcc.id) {
          const currentBalance = toSafeNumber(acc.balance);
          return {
            ...acc,
            initialBalance: acc.initialBalance !== undefined ? acc.initialBalance : currentBalance,
            balance: currentBalance + cleanDestAmount,
            currentBalance: currentBalance + cleanDestAmount,
            updated_at: new Date().toISOString()
          };
        }
        return acc;
      });
    }

    const nextTxs = [inTx, outTx, ...transactions];
    try {
      if (setAccounts && Array.isArray(accounts)) {
        setAccounts(updatedAccounts);
        localStorage.setItem('presu_accounts', JSON.stringify(updatedAccounts));
        saveAccountsToStorage(updatedAccounts);
      }
      localStorage.setItem('presu_transactions', JSON.stringify(nextTxs));
      saveTransactionsToStorage(nextTxs);
      setTransactions(nextTxs);
    } catch (localErr) {
      console.error('Fallo real en localStorage:', localErr);
      toast.error('Error al guardar localmente');
      return null;
    }

    toast.success('Movimiento registrado con éxito');
    return { inTx, outTx };
  }, [transactions, accounts, setAccounts, trm]);

  const handleTransfer = handleExecuteTransfer;

  // Resetear transacciones a cero
  const resetTransactions = useCallback(() => {
    setTransactions([]);
    try {
      localStorage.setItem('presu_transactions', JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
      localStorage.setItem('app_transactions', JSON.stringify([]));
      localStorage.setItem('finanzas_transactions_v3', JSON.stringify([]));
      localStorage.setItem('transactions', JSON.stringify([]));
      saveTransactionsToStorage([]);
    } catch (e) {
      console.error('Error al resetear transacciones:', e);
    }
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
