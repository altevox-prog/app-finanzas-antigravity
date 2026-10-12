import { useMemo, useState, useEffect } from 'react';
import { getAccountNativeBalance } from '../utils/currencyUtils';
import { 
  toSafeNumber, 
  safeNumber, 
  calculateSavingsRate, 
  calculateNetFlow, 
  calculateNetWorth 
} from '../utils/financeMath';
import { MONTH_NAMES } from '../data/initialData';

/**
 * useDashboardMetrics
 * Custom hook centralizado para el cálculo y memorización (useMemo) de todas
 * las métricas financieras, patrimoniales, transaccionales y de flujo de caja del Dashboard.
 */
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
  currentMonthLabel = '',
  trm = 4050,
  onSelectDay = null
} = {}) {
  const safeDebtsAndLoans = (debtsAndLoans && debtsAndLoans.length > 0) ? debtsAndLoans : (debts || []);
  const trmValue = toSafeNumber(trm) || 4050;

  // 1. CÁLCULO ESTRICTO DE PATRIMONIO TOTAL (ECUACIÓN PATRIMONIAL)
  const netWorthMetrics = useMemo(() => {
    return calculateNetWorth({
      accounts,
      transactions,
      investments,
      debtsAndLoans: safeDebtsAndLoans,
      trm: trmValue,
      getAccountBalanceFn: getAccountNativeBalance
    });
  }, [accounts, transactions, investments, safeDebtsAndLoans, trmValue]);

  const totalAccountsBalanceCOP = netWorthMetrics.totalAccountsBalanceCOP;
  const totalAssetsCOP = netWorthMetrics.totalAssetsCOP;
  const totalLiabilitiesCOP = netWorthMetrics.totalLiabilitiesCOP;
  const netWorthCOP = netWorthMetrics.netWorthCOP;
  const isNetWorthPositive = netWorthMetrics.isNetWorthPositive;

  // 2. MÉTRICAS DETALLADAS DE INVERSIONES
  const investmentsMetrics = useMemo(() => {
    const totalCurrentValueCOP = netWorthMetrics.totalInvestmentsValueCOP;
    const totalInvestedCostCOP = netWorthMetrics.totalInvestmentsCostCOP;
    const netProfitCOP = totalCurrentValueCOP - totalInvestedCostCOP;
    const profitPercentage = totalInvestedCostCOP > 0 ? (netProfitCOP / totalInvestedCostCOP) * 100 : 0;

    return {
      totalCurrentValueCOP,
      totalInvestedCostCOP,
      netProfitCOP,
      profitPercentage,
      isPositive: netProfitCOP >= 0
    };
  }, [netWorthMetrics]);

  // 3. MÉTRICAS DETALLADAS DE PRÉSTAMOS Y DEUDAS
  const debtsAndLoansMetrics = useMemo(() => {
    return {
      totalReceivableCOP: netWorthMetrics.totalReceivableCOP,
      totalPayableCOP: netWorthMetrics.totalPayableCOP,
      receivableCount: netWorthMetrics.receivableCount,
      payableCount: netWorthMetrics.payableCount
    };
  }, [netWorthMetrics]);

  // 4. FILTRADO DE TRANSACCIONES PARA BALANCE Y LISTA RECIENTE
  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();
  const scopedTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date + 'T00:00:00');
      if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return false;
      if (selectedDay && String(t.date).split('T')[0] !== String(selectedDay).split('T')[0]) return false;
      return true;
    });
  }, [transactions, currentYear, currentMonth, selectedDay]);

  const displayTransactions = useMemo(() => {
    if (selectedDay) {
      const targetDay = String(selectedDay).split('T')[0];
      return (transactions || []).filter(t => t && t.date && String(t.date).split('T')[0] === targetDay);
    }
    return monthlyTransactions || scopedTransactions;
  }, [transactions, monthlyTransactions, scopedTransactions, selectedDay]);

  const isTransferTx = (t) => Boolean(
    t && (
      t.isTransfer ||
      t.is_transfer ||
      t.type === 'transfer' ||
      t.type === 'transferencia' ||
      t.categoryId === 'cat-transfer' ||
      t.category_id === 'cat-transfer' ||
      t.subcategoryId === 'sub-transfer-in' ||
      t.subcategoryId === 'sub-transfer-out'
    )
  );

  // 5. CÁLCULO DE INGRESOS, GASTOS, BALANCE Y TASA DE AHORRO
  const totalIncome = useMemo(() => {
    if (selectedDay) {
      return scopedTransactions
        .filter(t => (t?.type === 'income' || t?.type === 'ingreso') && !isTransferTx(t))
        .reduce((sum, t) => sum + safeNumber(t?.amount), 0);
    }
    return toSafeNumber(monthlyStats.totalIncome);
  }, [selectedDay, scopedTransactions, monthlyStats.totalIncome]);

  const totalExpense = useMemo(() => {
    if (selectedDay) {
      return scopedTransactions
        .filter(t => (t?.type === 'expense' || t?.type === 'gasto') && !isTransferTx(t))
        .reduce((sum, t) => sum + safeNumber(t?.amount), 0);
    }
    return toSafeNumber(monthlyStats.totalExpense);
  }, [selectedDay, scopedTransactions, monthlyStats.totalExpense]);

  const netBalance = selectedDay 
    ? calculateNetFlow(totalIncome, totalExpense)
    : (monthlyStats.netBalance !== undefined ? toSafeNumber(monthlyStats.netBalance) : calculateNetFlow(totalIncome, totalExpense));
  const availableLiquidBalance = toSafeNumber(monthlyStats.availableLiquidBalance);
  const savingsRate = calculateSavingsRate(totalIncome, totalExpense);
  const freeCash = Math.max(0, netBalance);

  const bentoPeriodLabel = selectedDay
    ? `Día ${parseInt(selectedDay.split('-')[2], 10)} · ${(MONTH_NAMES?.[selectedDate.getMonth()] || '').slice(0, 3)}`
    : (currentMonthLabel || (MONTH_NAMES?.[selectedDate.getMonth()] ? `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}` : 'Mes en curso'));

  // 6. FLUJO SEMANAL Y GESTIÓN DE PERÍODOS
  const [hoveredWeekIndex, setHoveredWeekIndex] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState(selectedDay ? 'day' : 'month');

  useEffect(() => {
    if (selectedDay && currentPeriod !== 'day') {
      setCurrentPeriod('day');
    } else if (!selectedDay && currentPeriod === 'day') {
      setCurrentPeriod('month');
    }
  }, [selectedDay]);

  const periodOptions = useMemo(() => [
    { id: 'month', label: 'Mensual' },
    { id: 'week', label: 'Semanal' },
    { id: 'day', label: 'Diario' }
  ], []);

  const handlePeriodChange = (newPeriod) => {
    setCurrentPeriod(newPeriod);
    if (newPeriod === 'month') {
      if (typeof onSelectDay === 'function') onSelectDay(null);
    } else if (newPeriod === 'day') {
      const today = new Date().toISOString().split('T')[0];
      if (typeof onSelectDay === 'function') onSelectDay(selectedDay || today);
    }
  };

  const weeklyCashFlow = useMemo(() => {
    const weeks = [
      { name: 'Sem 1', range: 'Días 1 - 7', start: 1, end: 7, income: 0, expense: 0 },
      { name: 'Sem 2', range: 'Días 8 - 14', start: 8, end: 14, income: 0, expense: 0 },
      { name: 'Sem 3', range: 'Días 15 - 21', start: 15, end: 21, income: 0, expense: 0 },
      { name: 'Sem 4', range: 'Días 22 - 28', start: 22, end: 28, income: 0, expense: 0 },
      { name: 'Sem 5', range: 'Días 29+', start: 29, end: 31, income: 0, expense: 0 }
    ];

    scopedTransactions.forEach((tx) => {
      if (!tx || !tx.date) return;
      const type = String(tx.type || '').toLowerCase();
      const isTransfer = Boolean(
        tx.isTransfer ||
        tx.is_transfer ||
        type === 'transfer' ||
        type === 'transferencia' ||
        tx.categoryId === 'cat-transfer' ||
        tx.category_id === 'cat-transfer' ||
        tx.subcategoryId === 'sub-transfer-in' ||
        tx.subcategoryId === 'sub-transfer-out'
      );
      if (isTransfer) return;

      const day = parseInt(tx.date.split('-')[2], 10);
      const amt = safeNumber(tx.amount);
      const targetWeek = weeks.find((w) => day >= w.start && day <= w.end);
      if (targetWeek) {
        if (type === 'income' || type === 'ingreso') targetWeek.income += amt;
        if (type === 'expense' || type === 'gasto') targetWeek.expense += amt;
      }
    });

    const maxVal = Math.max(
      ...weeks.map((w) => Math.max(w.income, w.expense)),
      100000
    );

    return { weeks, maxVal };
  }, [scopedTransactions]);

  return {
    trmValue,
    netWorthMetrics,
    totalAccountsBalanceCOP,
    totalAssetsCOP,
    totalLiabilitiesCOP,
    netWorthCOP,
    isNetWorthPositive,
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
    freeCash,
    bentoPeriodLabel,
    weeklyCashFlow,
    hoveredWeekIndex,
    setHoveredWeekIndex,
    currentPeriod,
    setCurrentPeriod,
    periodOptions,
    handlePeriodChange
  };
}

export default useDashboardMetrics;
