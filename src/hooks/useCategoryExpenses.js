import { useMemo } from 'react';
import { safeNumber } from '../utils/financeMath';

export const MODERN_PALETTE = ['#10B981', '#14B8A6', '#94A3B8', '#64748B', '#059669', '#475569', '#34D399', '#0EA5E9'];

export const isTransferTx = (tx) => Boolean(
  tx && (
    tx.isTransfer || tx.is_transfer || tx.isDebtCapital || tx.isCapitalReturn ||
    ['transfer', 'transferencia'].includes(tx.type) ||
    ['cat-transfer'].includes(tx.categoryId || tx.category_id) ||
    ['sub-transfer-in', 'sub-transfer-out', 'sub-amortizacion-deuda', 'sub-retorno-capital'].includes(tx.subcategoryId)
  )
);

/**
 * Hook para procesar y agrupar gastos mensuales por categoría para gráficos y widgets.
 */
export function useCategoryExpenses(transactions = [], categories = [], selectedDate = new Date(), selectedDay = null) {
  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  const currentMonthTxs = useMemo(() => {
    return transactions.filter(tx => {
      if (!tx?.date) return false;
      const d = new Date(tx.date + 'T00:00:00');
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [transactions, currentYear, currentMonth]);

  const scopedTransactions = useMemo(() => {
    return selectedDay ? currentMonthTxs.filter(tx => tx.date === selectedDay) : currentMonthTxs;
  }, [currentMonthTxs, selectedDay]);

  return useMemo(() => {
    const expenses = scopedTransactions.filter(t => (t?.type === 'expense' || t?.type === 'gasto') && !isTransferTx(t));
    const total = expenses.reduce((sum, t) => sum + safeNumber(t?.amount), 0);

    const expenseByCategoryMap = {};
    expenses.forEach(tx => {
      const catKey = tx.categoryId || tx.categoryName || 'cat-general';
      if (!expenseByCategoryMap[catKey]) {
        const cat = categories.find(c => c.id === tx.categoryId || c.name === tx.categoryName);
        expenseByCategoryMap[catKey] = {
          id: catKey,
          name: tx.categoryName || (cat ? cat.name : 'Varios'),
          icon: cat?.icon,
          color: cat?.color || null,
          amount: 0
        };
      }
      expenseByCategoryMap[catKey].amount += safeNumber(tx.amount);
    });

    const list = Object.values(expenseByCategoryMap)
      .sort((a, b) => b.amount - a.amount)
      .map((cat, index) => {
        const exactPercent = total > 0 ? (cat.amount / total) * 100 : 0;
        const roundedPercent = Math.round(exactPercent);
        return {
          ...cat,
          color: cat.color || MODERN_PALETTE[index % MODERN_PALETTE.length],
          exactPercent,
          percent: roundedPercent,
          percentage: roundedPercent
        };
      });

    return { totalExpense: total, categoryExpenses: list, scopedTransactions };
  }, [scopedTransactions, categories]);
}
