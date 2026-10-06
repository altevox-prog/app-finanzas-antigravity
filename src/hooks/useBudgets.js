import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { INITIAL_BUDGETS } from '../data/initialData';

function getInitialBudgets() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.BUDGETS) || localStorage.getItem('budgets');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          global: Number(parsed.global) || 0,
          categories: parsed.categories && typeof parsed.categories === 'object' ? parsed.categories : {}
        };
      }
    }
    return INITIAL_BUDGETS;
  } catch {
    return INITIAL_BUDGETS;
  }
}

export function useBudgets(isResettingRef) {
  const [budgets, setBudgets] = useState(getInitialBudgets);

  // Persistencia reactiva en localStorage
  useEffect(() => {
    if (isResettingRef?.current) return;
    try {
      const serialized = JSON.stringify(budgets);
      localStorage.setItem(STORAGE_KEYS.BUDGETS, serialized);
      localStorage.setItem('budgets', serialized);
    } catch (e) {
      console.error('Error guardando presupuestos:', e);
    }
  }, [budgets, isResettingRef]);

  // Actualizar presupuesto global
  const updateGlobalBudget = useCallback((amount) => {
    setBudgets((prev) => ({
      ...prev,
      global: Number(amount) || 0
    }));
  }, []);

  // Actualizar presupuesto para una categoría específica
  const updateCategoryBudget = useCallback((categoryId, amount) => {
    setBudgets((prev) => ({
      ...prev,
      categories: {
        ...(prev?.categories || {}),
        [categoryId]: Number(amount) || 0
      }
    }));
  }, []);

  // Eliminar presupuesto de una categoría
  const removeCategoryBudget = useCallback((categoryId) => {
    setBudgets((prev) => {
      const updatedCategories = { ...(prev?.categories || {}) };
      delete updatedCategories[categoryId];
      return {
        ...prev,
        categories: updatedCategories
      };
    });
  }, []);

  // Restaurar presupuestos por defecto
  const resetBudgets = useCallback(() => {
    setBudgets(INITIAL_BUDGETS);
    try {
      const serialized = JSON.stringify(INITIAL_BUDGETS);
      localStorage.setItem(STORAGE_KEYS.BUDGETS, serialized);
      localStorage.setItem('budgets', serialized);
    } catch {}
  }, []);

  return {
    budgets,
    setBudgets,
    updateGlobalBudget,
    updateCategoryBudget,
    removeCategoryBudget,
    resetBudgets
  };
}
