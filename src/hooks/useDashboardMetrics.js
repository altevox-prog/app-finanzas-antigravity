import { useMemo, useState } from 'react';
import { getAccountNativeBalance } from '../utils/currencyUtils';
import { 
  toSafeNumber, 
  safeNumber, 
  calculateSavingsRate, 
  calculateNetFlow, 
  calculateNetWorth 
} from '../utils/financeMath';

const isTransferTx = (t) => Boolean(
  t && (
    t.isTransfer || t.is_transfer || t.isDebtCapital ||
    t.subcategoryId === 'sub-amortizacion-deuda' ||
    t.type === 'transfer' || t.type === 'transferencia' ||
    t.categoryId === 'cat-transfer' || t.category_id === 'cat-transfer' ||
    t.subcategoryId === 'sub-transfer-in' || t.subcategoryId === 'sub-transfer-out'
  )
);

export function useDashboardMetrics({
  accounts = [],
  transactions = [],
  investments = [],
  debtsAndLoans = [],
  debts = [],
  monthlyTransactions = null,
  monthlyStats = {},
  selectedDate = new Date(),
  selectedDay = null,
  trm = 4050,
  livePrices = {}
} = {}) {
  const safeDebtsAndLoans = (debtsAndLoans && debtsAndLoans.length > 0) ? debtsAndLoans : (debts || []);
  const trmValue = toSafeNumber(trm) || 4050;

  const netWorthMetrics = useMemo(() => calculateNetWorth({
    accounts, transactions, investments, debtsAndLoans: safeDebtsAndLoans,
    trm: trmValue, getAccountBalanceFn: getAccountNativeBalance, livePrices
  }), [accounts, transactions, investments, safeDebtsAndLoans, trmValue, livePrices]);

  const investmentsMetrics = useMemo(() => {
    const totalCurrentValueCOP = netWorthMetrics.totalInvestmentsValueCOP;
    const totalInvestedCostCOP = netWorthMetrics.totalInvestmentsCostCOP;
    const netProfitCOP = totalCurrentValueCOP - totalInvestedCostCOP;
    return {
      totalCurrentValueCOP, totalInvestedCostCOP, netProfitCOP,
      profitPercentage: totalInvestedCostCOP > 0 ? (netProfitCOP / totalInvestedCostCOP) * 100 : 0,
      isPositive: netProfitCOP >= 0
    };
  }, [netWorthMetrics]);

  const debtsAndLoansMetrics = useMemo(() => ({
    totalReceivableCOP: netWorthMetrics.totalReceivableCOP,
    totalPayableCOP: netWorthMetrics.totalPayableCOP,
    receivableCount: netWorthMetrics.receivableCount,
    payableCount: netWorthMetrics.payableCount
  }), [netWorthMetrics]);

  const parsedDate = selectedDate instanceof Date ? selectedDate : new Date(selectedDate || Date.now());
  const currentYear = parsedDate.getFullYear() || new Date().getFullYear();
  const currentMonth = parsedDate.getMonth() ?? new Date().getMonth();

  const scopedTransactions = useMemo(() => {
    if (monthlyTransactions && monthlyTransactions.length > 0 && !selectedDay) return monthlyTransactions;
    const list = (transactions && transactions.length > 0) ? transactions : (monthlyTransactions || []);
    return list.filter(t => {
      if (!t) return false;
      const rawDate = t.date ? String(t.date).split('T')[0] : (t.created_at ? String(t.created_at).split('T')[0] : '');
      if (!rawDate) return false;
      const [y, m] = rawDate.split('-').map(Number);
      if (y && m !== undefined && (y !== currentYear || (m - 1) !== currentMonth)) return false;
      return !selectedDay || rawDate === String(selectedDay).split('T')[0];
    });
  }, [transactions, monthlyTransactions, currentYear, currentMonth, selectedDay]);

  const displayTransactions = useMemo(() => {
    if (selectedDay) {
      const targetDay = String(selectedDay).split('T')[0];
      return (transactions || []).filter(t => t?.date && String(t.date).split('T')[0] === targetDay);
    }
    return monthlyTransactions || scopedTransactions;
  }, [transactions, monthlyTransactions, scopedTransactions, selectedDay]);

  const calcTotal = (type) => {
    const sum = scopedTransactions.filter(t => (t?.type === type || t?.type === (type === 'income' ? 'ingreso' : 'gasto')) && !isTransferTx(t)).reduce((s, t) => s + safeNumber(t?.amount), 0);
    return sum > 0 ? sum : (!selectedDay ? toSafeNumber(monthlyStats?.[type === 'income' ? 'totalIncome' : 'totalExpense']) : 0);
  };

  const totalIncome = useMemo(() => calcTotal('income'), [scopedTransactions, selectedDay, monthlyStats?.totalIncome]);
  const totalExpense = useMemo(() => calcTotal('expense'), [scopedTransactions, selectedDay, monthlyStats?.totalExpense]);
  const netBalance = (totalIncome > 0 || totalExpense > 0) ? calculateNetFlow(totalIncome, totalExpense) : toSafeNumber(monthlyStats?.netBalance ?? 0);
  const availableLiquidBalance = toSafeNumber(monthlyStats.availableLiquidBalance);
  const savingsRate = calculateSavingsRate(totalIncome, totalExpense);

  const [hoveredWeekIndex, setHoveredWeekIndex] = useState(null);

  const weeklyCashFlow = useMemo(() => {
    const weeks = [
      { name: 'Sem 1', range: 'Días 1 - 7', start: 1, end: 7, income: 0, expense: 0 },
      { name: 'Sem 2', range: 'Días 8 - 14', start: 8, end: 14, income: 0, expense: 0 },
      { name: 'Sem 3', range: 'Días 15 - 21', start: 15, end: 21, income: 0, expense: 0 },
      { name: 'Sem 4', range: 'Días 22 - 28', start: 22, end: 28, income: 0, expense: 0 },
      { name: 'Sem 5', range: 'Días 29+', start: 29, end: 31, income: 0, expense: 0 }
    ];

    scopedTransactions.forEach((tx) => {
      if (!tx?.date || isTransferTx(tx)) return;
      const type = String(tx.type || '').toLowerCase();
      const day = parseInt(tx.date.split('-')[2], 10);
      const amt = safeNumber(tx.amount);
      const targetWeek = weeks.find((w) => day >= w.start && day <= w.end);
      if (targetWeek) {
        if (type === 'income' || type === 'ingreso') targetWeek.income += amt;
        if (type === 'expense' || type === 'gasto') targetWeek.expense += amt;
      }
    });

    return { weeks, maxVal: Math.max(...weeks.map((w) => Math.max(w.income, w.expense)), 100000) };
  }, [scopedTransactions]);

  return {
    trmValue,
    netWorthMetrics,
    investmentsMetrics,
    debtsAndLoansMetrics,
    currentYear,
    currentMonth,
    scopedTransactions,
    displayTransactions,
    isTransferTx,
    totalIncome,
    totalExpense,
    netBalance,
    availableLiquidBalance,
    savingsRate,
    weeklyCashFlow,
    hoveredWeekIndex,
    setHoveredWeekIndex
  };
}

export default useDashboardMetrics;
