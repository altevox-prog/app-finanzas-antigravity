import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { INITIAL_SAVINGS_GOALS } from '../data/initialData';

function getInitialSavingsGoals() {
  const saved = localStorage.getItem(STORAGE_KEYS.SAVINGS_GOALS) ||
                localStorage.getItem('savingsGoals') ||
                localStorage.getItem('savings') ||
                localStorage.getItem('goals');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error('Error parseando metas de ahorro:', e);
    }
  }
  return INITIAL_SAVINGS_GOALS;
}

function sanitizeGoal(goal) {
  const rawDate = goal.target_date || goal.dueDate || goal.deadline || '';
  let safeDate = '';
  if (rawDate) {
    try {
      safeDate = new Date(rawDate).toISOString().split('T')[0];
    } catch (e) {
      safeDate = String(rawDate).split('T')[0];
    }
  }
  return {
    ...goal,
    id: goal.id || crypto.randomUUID(),
    target_date: safeDate,
    dueDate: safeDate,
    deadline: safeDate,
    target_account_id: goal.target_account_id || goal.targetAccountId || null,
    targetAccountId: goal.target_account_id || goal.targetAccountId || null,
    months: goal.months ? Number(goal.months) : 6,
    notification_day: goal.notification_day ? Number(goal.notification_day) : (goal.notificationDay ? Number(goal.notificationDay) : 15),
    notificationDay: goal.notification_day ? Number(goal.notification_day) : (goal.notificationDay ? Number(goal.notificationDay) : 15),
    notify_enabled: goal.notify_enabled !== undefined ? Boolean(goal.notify_enabled) : (goal.notifyEnabled !== undefined ? Boolean(goal.notifyEnabled) : true),
    notifyEnabled: goal.notify_enabled !== undefined ? Boolean(goal.notify_enabled) : (goal.notifyEnabled !== undefined ? Boolean(goal.notifyEnabled) : true)
  };
}

export function useSavingsGoals(isResettingRef) {
  const [savingsGoals, setSavingsGoals] = useState(getInitialSavingsGoals);

  // Persistencia reactiva en localStorage
  useEffect(() => {
    if (isResettingRef?.current) return;
    try {
      const serialized = JSON.stringify(savingsGoals);
      localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, serialized);
      localStorage.setItem('savingsGoals', serialized);
      localStorage.setItem('savings', serialized);
      localStorage.setItem('goals', serialized);
    } catch (e) {
      console.error('Error guardando metas de ahorro:', e);
    }
  }, [savingsGoals, isResettingRef]);

  // Agregar nueva meta
  const handleAddGoal = useCallback(async (newGoal) => {
    const goalItem = sanitizeGoal(newGoal);
    setSavingsGoals((prev) => {
      const updated = [goalItem, ...prev.filter((g) => g.id !== goalItem.id)];
      try {
        const serialized = JSON.stringify(updated);
        localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, serialized);
        localStorage.setItem('savingsGoals', serialized);
        localStorage.setItem('savings', serialized);
        localStorage.setItem('goals', serialized);
      } catch (e) {}
      return updated;
    });
    return goalItem;
  }, []);

  // Actualizar meta existente
  const handleUpdateGoal = useCallback(async (updatedGoal) => {
    const goalItem = sanitizeGoal(updatedGoal);
    setSavingsGoals((prev) => {
      const updated = prev.map((g) => (g.id === goalItem.id ? goalItem : g));
      try {
        const serialized = JSON.stringify(updated);
        localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, serialized);
        localStorage.setItem('savingsGoals', serialized);
        localStorage.setItem('savings', serialized);
        localStorage.setItem('goals', serialized);
      } catch (e) {}
      return updated;
    });
    return goalItem;
  }, []);

  // Eliminar meta
  const handleDeleteGoal = useCallback(async (goalId) => {
    setSavingsGoals((prev) => {
      const updated = prev.filter((g) => g.id !== goalId);
      try {
        const serialized = JSON.stringify(updated);
        localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, serialized);
        localStorage.setItem('savingsGoals', serialized);
        localStorage.setItem('savings', serialized);
        localStorage.setItem('goals', serialized);
      } catch (e) {}
      return updated;
    });
  }, []);

  // Registrar abono / aporte a una meta
  const handleContributeGoal = useCallback(async (goalId, amount) => {
    const val = Number(amount) || 0;
    if (val <= 0) return;
    setSavingsGoals((prev) => {
      const updated = prev.map((g) => {
        if (g.id !== goalId) return g;
        return {
          ...g,
          currentAmount: (Number(g.currentAmount) || 0) + val
        };
      });
      try {
        const serialized = JSON.stringify(updated);
        localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, serialized);
        localStorage.setItem('savingsGoals', serialized);
        localStorage.setItem('savings', serialized);
        localStorage.setItem('goals', serialized);
      } catch (e) {}
      return updated;
    });
  }, []);

  // Restaurar / resetear metas
  const resetSavingsGoals = useCallback(() => {
    setSavingsGoals(INITIAL_SAVINGS_GOALS);
    try {
      const serialized = JSON.stringify(INITIAL_SAVINGS_GOALS);
      localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, serialized);
      localStorage.setItem('savingsGoals', serialized);
      localStorage.setItem('savings', serialized);
      localStorage.setItem('goals', serialized);
    } catch {}
  }, []);

  return {
    savingsGoals,
    setSavingsGoals,
    handleAddGoal,
    handleUpdateGoal,
    handleDeleteGoal,
    handleContributeGoal,
    resetSavingsGoals
  };
}
