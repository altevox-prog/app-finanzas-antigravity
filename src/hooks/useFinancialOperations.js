import { useCallback } from 'react';
import { toSafeNumber } from '../utils/financeMath';
import { getAccountNativeBalance } from '../utils/currencyUtils';
import { saveTransactionsToStorage, saveAccountsToStorage } from '../services/storageService';
import { toast } from '../utils/toast';
import { triggerSaveFeedback } from '../utils/saveFeedback';
import { ensureUUID } from '../services/syncEngine';

export function useFinancialOperations({
  accounts = [], setAccounts, transactions = [], setTransactions,
  debtsAndLoans = [], setDebtsAndLoans, investments = [], setInvestments,
  categories = [], setCategories, trm = 4050, userProfile = {}, isResettingRef = null,
  baseAddTransaction, baseSaveTransaction, baseUpdateTransaction, baseDeleteTransaction,
  baseExecuteTransfer, baseAddPayment, baseDeletePayment, baseAddDisbursement,
  baseAddInvestment, baseDeleteInvestment, baseAddDebtOrLoan, baseSaveLoan, baseDeleteDebtOrLoan
} = {}) {
  const syncLocalAccounts = (txs) => {
    if (!setAccounts || !Array.isArray(accounts) || !accounts.length) return;
    const updated = accounts.map((acc) => {
      const baseInitial = acc.initialBalance ?? acc.initial_balance ?? acc.balance;
      const live = getAccountNativeBalance({ ...acc, initialBalance: baseInitial }, txs, trm);
      return { ...acc, initialBalance: baseInitial, balance: live, currentBalance: live, updated_at: new Date().toISOString() };
    });
    setAccounts(updated);
    saveAccountsToStorage(updated);
  };

  const handleSaveTransaction = useCallback(async (newTx) => {
    if (baseSaveTransaction) return await baseSaveTransaction(newTx);
    if (baseAddTransaction) return await baseAddTransaction(newTx);

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
    if (setTransactions) { setTransactions(updatedTxs); saveTransactionsToStorage(updatedTxs); }
    syncLocalAccounts(updatedTxs);
    triggerSaveFeedback();
    return sanitizedTx;
  }, [baseSaveTransaction, baseAddTransaction, transactions, setTransactions, accounts, setAccounts, trm]);

  const handleUpdateTransaction = useCallback(async (updatedTx) => {
    if (baseUpdateTransaction) return await baseUpdateTransaction(updatedTx);

    const sanitizedTx = {
      ...updatedTx,
      amount: toSafeNumber(updatedTx.amount),
      originalAmount: toSafeNumber(updatedTx.originalAmount ?? updatedTx.amount),
      exchangeRate: toSafeNumber(updatedTx.exchangeRate || 1),
      updated_at: new Date().toISOString()
    };
    const updatedTxs = transactions.map((t) => (t.id === sanitizedTx.id ? sanitizedTx : t));
    if (setTransactions) { setTransactions(updatedTxs); saveTransactionsToStorage(updatedTxs); }
    syncLocalAccounts(updatedTxs);
    triggerSaveFeedback();
    return sanitizedTx;
  }, [baseUpdateTransaction, transactions, setTransactions, accounts, setAccounts, trm]);

  const handleDeleteTransaction = useCallback(async (txId) => {
    if (!txId) return false;
    const targetTx = transactions.find((t) => t.id === txId || (ensureUUID && ensureUUID(t.id) === txId));
    if (targetTx?.isDebtPayment || targetTx?.debtId || targetTx?.paymentId) {
      toast.warning('Esta transacción pertenece al abono de una deuda. Para revertirla y mantener los saldos al día, elimínala desde el módulo de Deudas.');
      return false;
    }
    if (baseDeleteTransaction) return await baseDeleteTransaction(txId);

    const updatedTxs = transactions.filter((t) => t.id !== txId && (ensureUUID ? ensureUUID(t.id) !== txId : true));
    if (setTransactions) { setTransactions(updatedTxs); saveTransactionsToStorage(updatedTxs); }
    syncLocalAccounts(updatedTxs);
    toast.info('Elemento eliminado');
    return true;
  }, [baseDeleteTransaction, transactions, setTransactions, accounts, setAccounts, trm]);

  const handleExecuteTransfer = useCallback(async (transferData) => {
    if (baseExecuteTransfer) return await baseExecuteTransfer(transferData);

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
      : (fromCurrency === 'USD' && toCurrency === 'COP') ? transferAmount * trm : (fromCurrency === 'COP' && toCurrency === 'USD') ? transferAmount / trm : transferAmount;

    const txOut = { id: `tx-transfer-out-${Date.now()}`, type: 'expense', amount: transferAmount, date: transferDate, category: 'Transferencia', categoryName: 'Transferencia', account: fromAcc.name, accountId: fromAcc.id, notes: note || `Transferencia hacia ${toAcc.name}`, isTransfer: true, created_at: nowIso };
    const txIn = { id: `tx-transfer-in-${Date.now() + 1}`, type: 'income', amount: resolvedDestAmount, date: transferDate, category: 'Transferencia', categoryName: 'Transferencia', account: toAcc.name, accountId: toAcc.id, notes: note || `Transferencia desde ${fromAcc.name}`, isTransfer: true, created_at: nowIso };

    const nextTxs = [txIn, txOut, ...transactions];
    if (setTransactions) { setTransactions(nextTxs); saveTransactionsToStorage(nextTxs); }

    if (setAccounts) {
      const nextAccs = accounts.map((acc) => {
        const cur = toSafeNumber(acc.balance);
        if (acc.id === fromAcc.id) return { ...acc, balance: cur - transferAmount, currentBalance: cur - transferAmount, updated_at: nowIso };
        if (acc.id === toAcc.id) return { ...acc, balance: cur + resolvedDestAmount, currentBalance: cur + resolvedDestAmount, updated_at: nowIso };
        return acc;
      });
      setAccounts(nextAccs);
      saveAccountsToStorage(nextAccs);
    }

    triggerSaveFeedback();
    return { txOut, txIn };
  }, [baseExecuteTransfer, transactions, setTransactions, accounts, setAccounts, trm]);

  const handleAddInvestmentOperation = useCallback(async (newInv) => {
    let savedInv = newInv;
    if (baseAddInvestment) savedInv = await baseAddInvestment(newInv);

    if (newInv?.accountId && newInv?.totalInvested) {
      const fundingAcc = accounts.find((a) => a.id === newInv.accountId);
      if (fundingAcc) {
        const invTx = {
          id: `tx-inv-${Date.now()}`, type: 'expense', amount: toSafeNumber(newInv.totalInvested),
          date: newInv.date || new Date().toISOString().split('T')[0], category: 'Inversiones', categoryName: 'Inversiones',
          account: fundingAcc.name, accountId: fundingAcc.id, notes: `Inversión en ${newInv.name || 'Activo'}`, created_at: new Date().toISOString()
        };
        if (setTransactions) setTransactions((prev) => [invTx, ...prev]);
      }
    }
    return savedInv;
  }, [baseAddInvestment, accounts, setTransactions]);

  return {
    handleSaveTransaction,
    handleAddTransaction: handleSaveTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleExecuteTransfer,
    handleTransfer: handleExecuteTransfer,
    handleAddDebtPayment: baseAddPayment,
    handlePayDebtInstallment: baseAddPayment,
    handleAddPayment: baseAddPayment,
    handleDeletePayment: baseDeletePayment,
    handleDeleteDebtPayment: baseDeletePayment,
    handleAddDisbursement: baseAddDisbursement,
    handleAddInvestmentOperation,
    handleDeleteInvestmentOperation: baseDeleteInvestment,
    handleAddInvestment: baseAddInvestment || handleAddInvestmentOperation,
    handleDeleteInvestment: baseDeleteInvestment,
    handleAddDebtOrLoan: baseAddDebtOrLoan,
    handleSaveLoan: baseSaveLoan,
    handleDeleteDebtOrLoan: baseDeleteDebtOrLoan
  };
}

export default useFinancialOperations;
