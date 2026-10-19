import { useMemo } from 'react';
import { safeNumber as defaultSafeNumber } from '../../../utils/financeMath';

/**
 * useProfileMetrics
 * Custom hook memoizado para computar métricas derivadas del modal de perfil:
 * - Filtrado y sumatoria de gastos del mes seleccionado/actual (excluyendo transferencias y amortización de capital).
 * - Mapeo de gastos agrupados por categoría (robusto por ID y nombre).
 * - Totales consolidados de metas de ahorro (ahorrado vs objetivo).
 *
 * @param {Object} params
 * @param {Array} [params.transactions=[]]
 * @param {Array} [params.savingsGoals=[]]
 * @param {Function} [params.safeNumber]
 * @param {number} [params.selectedMonth] - 0-indexed (0 = enero)
 * @param {number} [params.selectedYear]
 * @param {Date|string} [params.selectedDate]
 */
export function useProfileMetrics({
  transactions = [],
  savingsGoals = [],
  safeNumber = defaultSafeNumber,
  selectedMonth,
  selectedYear,
  selectedDate,
} = {}) {
  const { monthExpenses, totalMonthExpense, expenseByCatMap } = useMemo(() => {
    const now = new Date();
    const dateObj = selectedDate instanceof Date 
      ? selectedDate 
      : (selectedDate ? new Date(selectedDate) : null);

    const targetMonth = typeof selectedMonth === 'number'
      ? selectedMonth
      : (dateObj && !isNaN(dateObj.getTime()) ? dateObj.getMonth() : now.getMonth());

    const targetYear = typeof selectedYear === 'number'
      ? selectedYear
      : (dateObj && !isNaN(dateObj.getTime()) ? dateObj.getFullYear() : now.getFullYear());

    const filtered = (transactions || []).filter((t) => {
      if (!t) return false;
      const type = String(t.type || '').toLowerCase();
      if (type !== 'expense' && type !== 'gasto') return false;

      // Excluir transferencias ordinarias y amortizaciones de capital de deudas
      const isTransfer = Boolean(
        t.isTransfer || 
        t.is_transfer || 
        t.isDebtCapital ||
        t.subcategoryId === 'sub-amortizacion-deuda' ||
        t.subcategory_id === 'sub-amortizacion-deuda' ||
        type === 'transfer' || 
        type === 'transferencia' || 
        t.categoryId === 'cat-transfer' || 
        t.category_id === 'cat-transfer' ||
        t.subcategoryId === 'sub-transfer-in' || 
        t.subcategoryId === 'sub-transfer-out'
      );
      if (isTransfer) return false;

      if (!t.date) return false;
      // Parsear fecha evitando desajustes de huso horario
      const dateParts = String(t.date).split('T')[0].split('-');
      if (dateParts.length < 3) return false;
      const txYear = parseInt(dateParts[0], 10);
      const txMonth = parseInt(dateParts[1], 10) - 1; // 0-indexed

      return txMonth === targetMonth && txYear === targetYear;
    });

    const totalExpense = filtered.reduce((sum, t) => sum + safeNumber(t.amount), 0);

    const catMap = {};
    filtered.forEach((t) => {
      const amt = safeNumber(t.amount);
      const catId = t.categoryId || t.category_id;
      const catName = t.category || t.categoryName;
      const primaryKey = catId || catName;

      if (primaryKey) {
        catMap[primaryKey] = (catMap[primaryKey] || 0) + amt;
      }
      // Si la transacción tiene tanto ID como nombre diferenciados, mapear ambos para acceso seguro
      if (catId && catName && catId !== catName) {
        catMap[catName] = (catMap[catName] || 0) + amt;
      }
    });

    return {
      monthExpenses: filtered,
      totalMonthExpense: totalExpense,
      expenseByCatMap: catMap,
    };
  }, [transactions, safeNumber, selectedMonth, selectedYear, selectedDate]);

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
