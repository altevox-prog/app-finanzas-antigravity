import { useMemo } from 'react';
import { MONTH_NAMES } from '../data/initialData';
import {
  toSafeNumber,
  calculateNetFlow,
  calculateDebtStats,
  calculateSavingsRate,
  calculateNetWorth
} from '../utils/financeMath';
import {
  getAccountNativeBalance,
  convertToCOP
} from '../utils/currencyUtils';
import { calculateTaxMetrics } from '../utils/taxUtils';

/**
 * useFinanceAnalytics
 * Hook de cálculos derivados y métricas financieras:
 * - Filtro de transacciones del mes seleccionado (y día seleccionado si aplica).
 * - Métricas mensuales: ingresos, gastos, balance neto, saldo líquido disponible, tasa de ahorro.
 * - Conteo de transacciones y deudas activas.
 * - Ecuación patrimonial y patrimonio neto consolidado (Activos - Pasivos).
 * - Métricas tributarias y topes UVT para la DIAN.
 */
export function useFinanceAnalytics({
  transactions = [],
  accounts = [],
  investments = [],
  debtsAndLoans = [],
  selectedMonth,
  selectedYear,
  selectedDate,
  selectedDay = null,
  trm = 4050
} = {}) {
  // Determinación de año y mes base
  const year = selectedYear !== undefined 
    ? selectedYear 
    : (selectedDate instanceof Date ? selectedDate.getFullYear() : new Date().getFullYear());

  const month = selectedMonth !== undefined 
    ? selectedMonth 
    : (selectedDate instanceof Date ? selectedDate.getMonth() : new Date().getMonth());

  const currentYear = year;
  const currentMonth = month;
  const currentMonthLabel = `${MONTH_NAMES[month] || ''} ${year}`;

  // 1. Transacciones del mes seleccionado
  const monthlyTransactions = useMemo(() => {
    return (transactions || []).filter((tx) => {
      if (!tx) return false;
      const rawDateStr = tx.date ? String(tx.date).split('T')[0] : (tx.created_at ? String(tx.created_at).split('T')[0] : '');
      if (!rawDateStr) return false;

      const parts = rawDateStr.split('-');
      if (parts.length >= 2) {
        const txYear = parseInt(parts[0], 10);
        const txMonth = parseInt(parts[1], 10) - 1; // 0-indexed
        if (!isNaN(txYear) && !isNaN(txMonth)) {
          return txYear === year && txMonth === month;
        }
      }

      const txDate = new Date(rawDateStr + 'T00:00:00');
      return txDate.getFullYear() === year && txDate.getMonth() === month;
    });
  }, [transactions, year, month]);

  // 2. Transacciones filtradas por día si el usuario seleccionó uno específico
  const scopedTransactions = useMemo(() => {
    if (!selectedDay) return monthlyTransactions;
    const targetDay = String(selectedDay).split('T')[0];
    return monthlyTransactions.filter((tx) => {
      if (!tx || !tx.date) return false;
      return String(tx.date).split('T')[0] === targetDay;
    });
  }, [monthlyTransactions, selectedDay]);

  // 3. Cálculos analíticos del periodo (ingresos, gastos, flujo neto, liquidez)
  const analytics = useMemo(() => {
    const isTransferTx = (tx) => Boolean(
      tx && (
        tx.isTransfer ||
        tx.is_transfer ||
        tx.type === 'transfer' ||
        tx.type === 'transferencia' ||
        tx.categoryId === 'cat-transfer' ||
        tx.category_id === 'cat-transfer' ||
        tx.subcategoryId === 'sub-transfer-in' ||
        tx.subcategoryId === 'sub-transfer-out'
      )
    );

    const totalIncome = scopedTransactions
      .filter((tx) => tx && (tx.type === 'income' || tx.type === 'ingreso') && !isTransferTx(tx))
      .reduce((sum, tx) => sum + toSafeNumber(tx.amount), 0);

    const totalExpense = scopedTransactions
      .filter((tx) => tx && (tx.type === 'expense' || tx.type === 'gasto') && !isTransferTx(tx))
      .reduce((sum, tx) => sum + toSafeNumber(tx.amount), 0);

    const netBalance = calculateNetFlow(totalIncome, totalExpense);

    // Saldo Disponible Líquido: Cuentas líquidas positivas (Efectivo, Ahorros, Billeteras). Excluye tarjetas y deudas.
    const isLiquidAccount = (acc) => {
      if (!acc) return false;
      const t = String(acc.type || '').toLowerCase();
      if (t === 'card' || t === 'credit' || t === 'credit_card' || t === 'debt' || t === 'loan' || t === 'liability') {
        return false;
      }
      return true;
    };

    const liquidAccounts = (accounts || []).filter(isLiquidAccount);
    const availableLiquidBalance = liquidAccounts.reduce((sum, acc) => {
      const balNative = toSafeNumber(getAccountNativeBalance(acc, transactions, trm));
      if (balNative <= 0) return sum;
      const balCOP = convertToCOP(balNative, acc.currency || 'COP', trm);
      return sum + toSafeNumber(balCOP);
    }, 0);

    // Conteo de deudas y préstamos activos pendientes
    const activeDebtsCount = (debtsAndLoans || []).filter((item) => {
      const base = toSafeNumber(item.principalAmount || item.totalAmount);
      const accruedInterest = base * (toSafeNumber(item.interestRate) / 100);
      const insurance = toSafeNumber(item.insuranceFee);
      const stats = calculateDebtStats(base, item.payments, {
        accruedInterest: accruedInterest + insurance
      });
      return !stats.isPaid && stats.outstandingBalance > 0.01;
    }).length;

    const savingsRate = calculateSavingsRate(totalIncome, totalExpense);

    const incomeCount = scopedTransactions.filter((tx) => (tx?.type === 'income' || tx?.type === 'ingreso') && !isTransferTx(tx)).length;
    const expenseCount = scopedTransactions.filter((tx) => (tx?.type === 'expense' || tx?.type === 'gasto') && !isTransferTx(tx)).length;

    return {
      totalIncome,
      totalExpense,
      netBalance,
      availableLiquidBalance,
      savingsRate,
      incomeCount,
      expenseCount,
      activeDebtsCount
    };
  }, [scopedTransactions, accounts, debtsAndLoans, transactions, trm]);

  // 4. Patrimonio Neto Consolidado
  const netWorthData = useMemo(() => {
    return calculateNetWorth({
      accounts,
      transactions,
      investments,
      debtsAndLoans,
      trm,
      getAccountBalanceFn: (acc, txs, rate) => getAccountNativeBalance(acc, txs, rate)
    });
  }, [accounts, transactions, investments, debtsAndLoans, trm]);

  // 5. Métricas Tributarias y Topes DIAN
  const taxMetrics = useMemo(() => {
    return calculateTaxMetrics({
      transactions,
      accounts,
      investments,
      fiscalYear: year
    });
  }, [transactions, accounts, investments, year]);

  // 6. Objeto consolidado monthlyStats para vistas y headers
  const monthlyStats = useMemo(() => ({
    ...analytics,
    netWorth: netWorthData?.netWorthCOP || 0,
    totalAssets: netWorthData?.totalAssetsCOP || 0,
    totalLiabilities: netWorthData?.totalLiabilitiesCOP || 0
  }), [analytics, netWorthData]);

  return {
    currentYear,
    currentMonth,
    currentMonthLabel,
    monthlyTransactions,
    scopedTransactions,
    totalIncome: analytics.totalIncome,
    totalExpense: analytics.totalExpense,
    netBalance: analytics.netBalance,
    availableLiquidBalance: analytics.availableLiquidBalance,
    savingsRate: analytics.savingsRate,
    incomeCount: analytics.incomeCount,
    expenseCount: analytics.expenseCount,
    activeDebtsCount: analytics.activeDebtsCount,
    monthlyStats,
    netWorth: netWorthData,
    netWorthCOP: netWorthData.netWorthCOP,
    totalAssetsCOP: netWorthData.totalAssetsCOP,
    totalLiabilitiesCOP: netWorthData.totalLiabilitiesCOP,
    taxMetrics
  };
}

export default useFinanceAnalytics;
