import { useMemo } from 'react';
import { MONTH_NAMES } from '../data/initialData';
import { toSafeNumber, calculateNetFlow, calculateDebtStats, calculateSavingsRate, calculateNetWorth } from '../utils/financeMath';
import { getAccountNativeBalance, convertToCOP } from '../utils/currencyUtils';
import { calculateTaxMetrics } from '../utils/taxUtils';

const isTransferTx = (tx) => Boolean(tx && (
  tx.isTransfer || tx.is_transfer || tx.isDebtCapital ||
  tx.subcategoryId === 'sub-amortizacion-deuda' || tx.type === 'transfer' ||
  tx.type === 'transferencia' || tx.categoryId === 'cat-transfer' ||
  tx.category_id === 'cat-transfer' || tx.subcategoryId === 'sub-transfer-in' ||
  tx.subcategoryId === 'sub-transfer-out'
));

const isLiquidAccount = (acc) => !['card', 'credit', 'credit_card', 'debt', 'loan', 'liability'].includes(String(acc?.type || '').toLowerCase());

export function useFinanceAnalytics({
  transactions = [], accounts = [], investments = [], debtsAndLoans = [],
  selectedMonth, selectedYear, selectedDate, selectedDay = null,
  trm = 4050, livePrices = {}
} = {}) {
  const now = new Date();
  const currentYear = selectedYear !== undefined ? selectedYear : (selectedDate instanceof Date ? selectedDate.getFullYear() : now.getFullYear());
  const currentMonth = selectedMonth !== undefined ? selectedMonth : (selectedDate instanceof Date ? selectedDate.getMonth() : now.getMonth());
  const currentMonthLabel = `${MONTH_NAMES[currentMonth] || ''} ${currentYear}`;

  const monthlyTransactions = useMemo(() => (transactions || []).filter((tx) => {
    if (!tx) return false;
    const raw = String(tx.date || tx.created_at || '').split('T')[0];
    if (!raw) return false;
    const [y, m] = raw.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m)) return y === currentYear && m - 1 === currentMonth;
    const d = new Date(raw + 'T00:00:00');
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  }), [transactions, currentYear, currentMonth]);

  const scopedTransactions = useMemo(() => {
    if (!selectedDay) return monthlyTransactions;
    const target = String(selectedDay).split('T')[0];
    return monthlyTransactions.filter((tx) => tx?.date && String(tx.date).split('T')[0] === target);
  }, [monthlyTransactions, selectedDay]);

  const analytics = useMemo(() => {
    let totalIncome = 0, totalExpense = 0, incomeCount = 0, expenseCount = 0;
    scopedTransactions.forEach((tx) => {
      if (!tx || isTransferTx(tx)) return;
      const amt = toSafeNumber(tx.amount);
      if (tx.type === 'income' || tx.type === 'ingreso') { totalIncome += amt; incomeCount++; }
      else if (tx.type === 'expense' || tx.type === 'gasto') { totalExpense += amt; expenseCount++; }
    });

    const netBalance = calculateNetFlow(totalIncome, totalExpense);
    const savingsRate = calculateSavingsRate(totalIncome, totalExpense);

    const availableLiquidBalance = (accounts || []).filter(isLiquidAccount).reduce((sum, acc) => {
      const balNative = toSafeNumber(getAccountNativeBalance(acc, transactions, trm));
      return balNative > 0 ? sum + toSafeNumber(convertToCOP(balNative, acc.currency || 'COP', trm)) : sum;
    }, 0);

    const activeDebtsCount = (debtsAndLoans || []).filter((item) => {
      const base = toSafeNumber(item.principalAmount || item.totalAmount);
      const interest = base * (toSafeNumber(item.interestRate) / 100) + toSafeNumber(item.insuranceFee);
      const stats = calculateDebtStats(base, item.payments, { accruedInterest: interest });
      return !stats.isPaid && stats.outstandingBalance > 0.01;
    }).length;

    return { totalIncome, totalExpense, netBalance, availableLiquidBalance, savingsRate, incomeCount, expenseCount, activeDebtsCount };
  }, [scopedTransactions, accounts, debtsAndLoans, transactions, trm]);

  const netWorthData = useMemo(() => calculateNetWorth({
    accounts, transactions, investments, debtsAndLoans, trm,
    getAccountBalanceFn: (acc, txs, rate) => getAccountNativeBalance(acc, txs, rate),
    livePrices
  }), [accounts, transactions, investments, debtsAndLoans, trm, livePrices]);

  const taxMetrics = useMemo(() => calculateTaxMetrics({
    transactions, accounts, investments, fiscalYear: currentYear
  }), [transactions, accounts, investments, currentYear]);

  const monthlyStats = useMemo(() => ({
    ...analytics,
    netWorth: netWorthData?.netWorthCOP || 0,
    totalAssets: netWorthData?.totalAssetsCOP || 0,
    totalLiabilities: netWorthData?.totalLiabilitiesCOP || 0
  }), [analytics, netWorthData]);

  return {
    currentYear, currentMonth, currentMonthLabel, monthlyTransactions, scopedTransactions,
    totalIncome: analytics.totalIncome, totalExpense: analytics.totalExpense, netBalance: analytics.netBalance,
    availableLiquidBalance: analytics.availableLiquidBalance, savingsRate: analytics.savingsRate,
    incomeCount: analytics.incomeCount, expenseCount: analytics.expenseCount, activeDebtsCount: analytics.activeDebtsCount,
    monthlyStats, netWorth: netWorthData,
    netWorthCOP: netWorthData?.netWorthCOP || 0,
    totalAssetsCOP: netWorthData?.totalAssetsCOP || 0,
    totalLiabilitiesCOP: netWorthData?.totalLiabilitiesCOP || 0,
    taxMetrics
  };
}

export default useFinanceAnalytics;
