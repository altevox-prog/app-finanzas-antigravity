import { useMemo } from 'react';
import { safeNumber as defaultSafeNumber } from '../../../utils/financeMath';

/**
 * useProfileMetrics
 * Custom hook memoizado para computar métricas derivadas del modal de perfil:
 * - Filtrado y sumatoria de gastos del mes actual (excluyendo transferencias).
 * - Mapeo de gastos agrupados por categoría.
 * - Totales consolidados de metas de ahorro (ahorrado vs objetivo).
 *
 * @param {Object} params
 * @param {Array} [params.transactions=[]]
 * @param {Array} [params.savingsGoals=[]]
 * @param {Function} [params.safeNumber]
 */
export function useProfileMetrics({
  transactions = [],
  savingsGoals = [],
  safeNumber = defaultSafeNumber,
} = {}) {
  const { monthExpenses, totalMonthExpense, expenseByCatMap } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const filtered = (transactions || []).filter((t) => {
      if (t.type !== 'expense') return false;
      const isTransfer = 
        t.isTransfer || 
        t.is_transfer || 
        t.type === 'transfer' || 
        t.type === 'transferencia' || 
        t.categoryId === 'cat-transfer' || 
        t.subcategoryId === 'sub-transfer-in' || 
        t.subcategoryId === 'sub-transfer-out';
      if (isTransfer) return false;
      const d = new Date(t.date + 'T00:00:00');
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalExpense = filtered.reduce((sum, t) => sum + safeNumber(t.amount), 0);

    const catMap = {};
    filtered.forEach((t) => {
      catMap[t.categoryId] = (catMap[t.categoryId] || 0) + safeNumber(t.amount);
    });

    return {
      monthExpenses: filtered,
      totalMonthExpense: totalExpense,
      expenseByCatMap: catMap,
    };
  }, [transactions, safeNumber]);

  const { totalSavedAcrossGoals, totalTargetAcrossGoals } = useMemo(() => {
    const totalSaved = (savingsGoals || []).reduce(
      (sum, g) => sum + safeNumber(g.currentAmount ?? g.current_amount), 
      0
    );
    const totalTarget = (savingsGoals || []).reduce(
      (sum, g) => sum + safeNumber(g.targetAmount ?? g.target_amount), 
      0
    );

    return {
      totalSavedAcrossGoals: totalSaved,
      totalTargetAcrossGoals: totalTarget,
    };
  }, [savingsGoals, safeNumber]);

  return {
    monthExpenses,
    totalMonthExpense,
    expenseByCatMap,
    totalSavedAcrossGoals,
    totalTargetAcrossGoals,
  };
}

export default useProfileMetrics;
