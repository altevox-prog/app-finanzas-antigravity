import { useCallback } from 'react';
import { toSafeNumber } from '../utils/financeMath';
import { getAccountNativeBalance } from '../utils/currencyUtils';
import { saveTransactionsToStorage, saveAccountsToStorage } from '../services/storageService';
import { toast } from '../utils/toast';
import { ensureUUID } from '../services/syncEngine';

/**
 * useFinancialOperations
 * Hook centralizado para orquestar y coordinar operaciones financieras cruzadas:
 * - Creación y edición de transacciones con impacto en balances bancarios.
 * - Reversión de saldos al eliminar transacciones.
 * - Transferencias entre cuentas con conversión de divisas.
 * - Abonos a préstamos y deudas con impacto en la cuenta bancaria.
 * - Inversiones coordinadas con cargo directo a cuentas.
 */
export function useFinancialOperations({
  accounts = [],
  setAccounts,
  transactions = [],
  setTransactions,
  debtsAndLoans = [],
  setDebtsAndLoans,
  investments = [],
  setInvestments,
  categories = [],
  setCategories,
  trm = 4050,
  userProfile = {},
  isResettingRef = null,
  // Handlers base de dominio provistos por los hooks especializados
  baseAddTransaction,
  baseSaveTransaction,
  baseUpdateTransaction,
  baseDeleteTransaction,
  baseExecuteTransfer,
  baseAddPayment,
  baseDeletePayment,
  baseAddDisbursement,
  baseAddInvestment,
  baseDeleteInvestment,
  baseAddDebtOrLoan,
  baseSaveLoan,
  baseDeleteDebtOrLoan
} = {}) {
  // 1. Guardar / Crear Transacción con Impacto en Cuentas
  const handleSaveTransaction = useCallback(async (newTx) => {
    if (baseSaveTransaction) {
      return await baseSaveTransaction(newTx);
    }
    if (baseAddTransaction) {
      return await baseAddTransaction(newTx);
    }

    const sanitizedTx = {
      ...newTx,
      id: newTx.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`),
      amount: toSafeNumber(newTx.amount),
      originalAmount: toSafeNumber(newTx.originalAmount ?? newTx.amount),
      exchangeRate: toSafeNumber(newTx.exchangeRate || 1),
      date: newTx.date || new Date().toISOString().split('T')[0],
      created_at: newTx.created_at || new Date().toISOString()
    };

    const updatedTxs = [sanitizedTx, ...transactions];
    if (setTransactions) {
      setTransactions(updatedTxs);
      saveTransactionsToStorage(updatedTxs);
    }

    if (setAccounts && Array.isArray(accounts) && accounts.length > 0) {
      const updatedAccounts = accounts.map((acc) => {
        const baseInitial = acc.initialBalance !== undefined 
          ? acc.initialBalance 
          : (acc.initial_balance !== undefined ? acc.initial_balance : acc.balance);
        const liveBalance = getAccountNativeBalance({ ...acc, initialBalance: baseInitial }, updatedTxs, trm);
        return {
          ...acc,
          initialBalance: baseInitial,
          balance: liveBalance,
          currentBalance: liveBalance,
          updated_at: new Date().toISOString()
        };
      });
      setAccounts(updatedAccounts);
      saveAccountsToStorage(updatedAccounts);
    }

    toast.success('Movimiento registrado con éxito');
    return sanitizedTx;
  }, [baseSaveTransaction, baseAddTransaction, transactions, setTransactions, accounts, setAccounts, trm]);

  const handleAddTransaction = handleSaveTransaction;

  // 2. Actualizar Transacción con Ajuste Retroactivo en Saldos
  const handleUpdateTransaction = useCallback(async (updatedTx) => {
    if (baseUpdateTransaction) {
      return await baseUpdateTransaction(updatedTx);
    }

    const sanitizedTx = {
      ...updatedTx,
      amount: toSafeNumber(updatedTx.amount),
      originalAmount: toSafeNumber(updatedTx.originalAmount ?? updatedTx.amount),
      exchangeRate: toSafeNumber(updatedTx.exchangeRate || 1),
      updated_at: new Date().toISOString()
    };

    const updatedTxs = transactions.map((t) => (t.id === sanitizedTx.id ? sanitizedTx : t));
    if (setTransactions) {
      setTransactions(updatedTxs);
      saveTransactionsToStorage(updatedTxs);
    }

    if (setAccounts && Array.isArray(accounts) && accounts.length > 0) {
      const updatedAccounts = accounts.map((acc) => {
        const liveBalance = getAccountNativeBalance(acc, updatedTxs, trm);
        return {
          ...acc,
          balance: liveBalance,
          currentBalance: liveBalance,
          updated_at: new Date().toISOString()
        };
      });
      setAccounts(updatedAccounts);
      saveAccountsToStorage(updatedAccounts);
    }

    toast.success('Movimiento actualizado con éxito');
    return sanitizedTx;
  }, [baseUpdateTransaction, transactions, setTransactions, accounts, setAccounts, trm]);

  // 3. Eliminar Transacción con Reversión de Saldos
  const handleDeleteTransaction = useCallback(async (txId) => {
    if (!txId) return false;

    const targetTx = transactions.find((t) => t.id === txId || (ensureUUID && ensureUUID(t.id) === txId));
    const isLinkedToDebt = Boolean(targetTx?.isDebtPayment || targetTx?.debtId || targetTx?.paymentId);

    if (isLinkedToDebt) {
      toast.warning('Esta transacción pertenece al abono de una deuda. Para revertirla y mantener los saldos al día, elimínala desde el módulo de Deudas.');
      return false;
    }

    if (baseDeleteTransaction) {
      return await baseDeleteTransaction(txId);
    }

    const updatedTxs = transactions.filter((t) => t.id !== txId && (ensureUUID ? ensureUUID(t.id) !== txId : true));
    if (setTransactions) {
      setTransactions(updatedTxs);
      saveTransactionsToStorage(updatedTxs);
    }

    if (setAccounts && Array.isArray(accounts) && accounts.length > 0) {
      const updatedAccounts = accounts.map((acc) => {
        const liveBalance = getAccountNativeBalance(acc, updatedTxs, trm);
        return {
          ...acc,
          balance: liveBalance,
          currentBalance: liveBalance,
          updated_at: new Date().toISOString()
        };
      });
      setAccounts(updatedAccounts);
      saveAccountsToStorage(updatedAccounts);
    }

    toast.info('Elemento eliminado');
    return true;
  }, [baseDeleteTransaction, transactions, setTransactions, accounts, setAccounts, trm]);

  // 4. Transferencias entre Cuentas (con o sin conversión de divisas)
  const handleExecuteTransfer = useCallback(async (transferData) => {
    if (baseExecuteTransfer) {
      return await baseExecuteTransfer(transferData);
    }

    const { fromAcc, toAcc, amount, destAmount, fromCurrency, toCurrency, date, note } = transferData || {};
    if (!fromAcc?.id || !toAcc?.id || fromAcc.id === toAcc.id) {
      toast.error('Selecciona cuentas de origen y destino válidas y diferentes');
      return null;
    }

    const transferAmount = toSafeNumber(amount);
    if (transferAmount <= 0) {
      toast.error('El monto a transferir debe ser mayor a 0');
      return null;
    }

    const transferDate = date || new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    const resolvedDestAmount = destAmount !== undefined && Number(destAmount) > 0
      ? toSafeNumber(destAmount)
      : (fromCurrency === 'USD' && toCurrency === 'COP')
      ? transferAmount * trm
      : (fromCurrency === 'COP' && toCurrency === 'USD')
      ? transferAmount / trm
      : transferAmount;

    const txOut = {
      id: `tx-transfer-out-${Date.now()}`,
      type: 'expense',
      amount: transferAmount,
      date: transferDate,
      category: 'Transferencia',
      categoryName: 'Transferencia',
      account: fromAcc.name,
      accountId: fromAcc.id,
      notes: note || `Transferencia hacia ${toAcc.name}`,
      isTransfer: true,
      created_at: nowIso
    };

    const txIn = {
      id: `tx-transfer-in-${Date.now() + 1}`,
      type: 'income',
      amount: resolvedDestAmount,
      date: transferDate,
      category: 'Transferencia',
      categoryName: 'Transferencia',
      account: toAcc.name,
      accountId: toAcc.id,
      notes: note || `Transferencia desde ${fromAcc.name}`,
      isTransfer: true,
      created_at: nowIso
    };

    const nextTxs = [txIn, txOut, ...transactions];
    if (setTransactions) {
      setTransactions(nextTxs);
      saveTransactionsToStorage(nextTxs);
    }

    if (setAccounts) {
      const nextAccs = accounts.map((acc) => {
        if (acc.id === fromAcc.id) {
          const cur = toSafeNumber(acc.balance);
          return { ...acc, balance: cur - transferAmount, currentBalance: cur - transferAmount, updated_at: nowIso };
        }
        if (acc.id === toAcc.id) {
          const cur = toSafeNumber(acc.balance);
          return { ...acc, balance: cur + resolvedDestAmount, currentBalance: cur + resolvedDestAmount, updated_at: nowIso };
        }
        return acc;
      });
      setAccounts(nextAccs);
      saveAccountsToStorage(nextAccs);
    }

    toast.success('Transferencia realizada con éxito');
    return { txOut, txIn };
  }, [baseExecuteTransfer, transactions, setTransactions, accounts, setAccounts, trm]);

  // 5. Abonos y Pagos de Deudas / Préstamos con Impacto Bancario
  const handleAddDebtPayment = useCallback((debtId, paymentData) => {
    if (baseAddPayment) {
      return baseAddPayment(debtId, paymentData);
    }
  }, [baseAddPayment]);

  const handleDeleteDebtPayment = useCallback((debtId, paymentId) => {
    if (baseDeletePayment) {
      return baseDeletePayment(debtId, paymentId);
    }
  }, [baseDeletePayment]);

  // 6. Inversiones con posible impacto en cuentas bancarias
  const handleAddInvestmentOperation = useCallback(async (newInv) => {
    let savedInv = newInv;
    if (baseAddInvestment) {
      savedInv = await baseAddInvestment(newInv);
    }

    // Si la inversión especificó una cuenta de origen, crear el movimiento de gasto
    if (newInv?.accountId && newInv?.totalInvested) {
      const fundingAcc = accounts.find((a) => a.id === newInv.accountId);
      if (fundingAcc) {
        const invTx = {
          id: `tx-inv-${Date.now()}`,
          type: 'expense',
          amount: toSafeNumber(newInv.totalInvested),
          date: newInv.date || new Date().toISOString().split('T')[0],
          category: 'Inversiones',
          categoryName: 'Inversiones',
          account: fundingAcc.name,
          accountId: fundingAcc.id,
          notes: `Inversión en ${newInv.name || 'Activo'}`,
          created_at: new Date().toISOString()
        };
        if (setTransactions) {
          setTransactions((prev) => [invTx, ...prev]);
        }
      }
    }
    return savedInv;
  }, [baseAddInvestment, accounts, setTransactions]);

  const handleDeleteInvestmentOperation = useCallback(async (invId) => {
    if (baseDeleteInvestment) {
      return await baseDeleteInvestment(invId);
    }
  }, [baseDeleteInvestment]);

  return {
    handleSaveTransaction,
    handleAddTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleExecuteTransfer,
    handleTransfer: handleExecuteTransfer,
    handleAddDebtPayment,
    handlePayDebtInstallment: handleAddDebtPayment,
    handleAddPayment: handleAddDebtPayment,
    handleDeletePayment: handleDeleteDebtPayment,
    handleDeleteDebtPayment,
    handleAddDisbursement: baseAddDisbursement,
    handleAddInvestmentOperation,
    handleDeleteInvestmentOperation,
    handleAddInvestment: baseAddInvestment || handleAddInvestmentOperation,
    handleDeleteInvestment: baseDeleteInvestment || handleDeleteInvestmentOperation,
    handleAddDebtOrLoan: baseAddDebtOrLoan,
    handleSaveLoan: baseSaveLoan,
    handleDeleteDebtOrLoan: baseDeleteDebtOrLoan
  };
}

export default useFinancialOperations;
