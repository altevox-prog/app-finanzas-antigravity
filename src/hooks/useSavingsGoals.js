import { useState } from 'react';
import { safeNumber as defaultSafeNumber } from '../utils/financeMath';

/**
 * useSavingsGoals
 * Hook para gestionar metas de ahorro: creación, edición, abonos y cálculos de progreso.
 */
export function useSavingsGoals({
  savingsGoals = [],
  onAddGoal,
  onUpdateGoal,
  showToast,
  formatMoney,
  safeNumber = defaultSafeNumber
} = {}) {
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('0');
  const [newGoalDate, setNewGoalDate] = useState('');

  const [editingGoal, setEditingGoal] = useState(null);
  const [editGoalName, setEditGoalName] = useState('');
  const [editGoalTarget, setEditGoalTarget] = useState('');
  const [editGoalCurrent, setEditGoalCurrent] = useState('0');
  const [editGoalDate, setEditGoalDate] = useState('');

  const [contributeGoalId, setContributeGoalId] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const handleCreateGoal = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!newGoalName.trim() || !newGoalTarget || Number(newGoalTarget) <= 0) {
      if (showToast) showToast('Ingresa un nombre y monto objetivo válido.', true);
      return;
    }

    let safeDate = '';
    if (newGoalDate) {
      try {
        safeDate = new Date(newGoalDate).toISOString().split('T')[0];
      } catch {
        safeDate = String(newGoalDate).split('T')[0];
      }
    }

    const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const goal = {
      id: generatedId,
      name: newGoalName.trim(),
      targetAmount: Number(newGoalTarget),
      target_amount: Number(newGoalTarget),
      currentAmount: Number(newGoalCurrent) || 0,
      current_amount: Number(newGoalCurrent) || 0,
      dueDate: safeDate,
      target_date: safeDate,
      deadline: safeDate,
      category: 'Ahorro',
    };

    if (typeof onAddGoal === 'function') {
      onAddGoal(goal);
    }
    setNewGoalName('');
    setNewGoalTarget('');
    setNewGoalCurrent('0');
    setNewGoalDate('');
    setShowAddGoalForm(false);
    if (showToast) showToast(`Meta "${goal.name}" creada.`);
  };

  const handleOpenEditGoal = (goal) => {
    setEditingGoal(goal);
    setEditGoalName(goal.name || '');
    setEditGoalTarget(String(goal.targetAmount || goal.target_amount || ''));
    setEditGoalCurrent(String(goal.currentAmount || goal.current_amount || '0'));
    const d = goal.target_date || goal.dueDate || goal.deadline || '';
    setEditGoalDate(d ? new Date(d).toISOString().split('T')[0] : '');
  };

  const handleSaveEditGoal = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!editingGoal || !editGoalName.trim() || Number(editGoalTarget) <= 0) return;

    let safeDate = '';
    if (editGoalDate) {
      try {
        safeDate = new Date(editGoalDate).toISOString().split('T')[0];
      } catch {
        safeDate = String(editGoalDate).split('T')[0];
      }
    }

    const updated = {
      ...editingGoal,
      name: editGoalName.trim(),
      targetAmount: Number(editGoalTarget),
      target_amount: Number(editGoalTarget),
      currentAmount: Number(editGoalCurrent) || 0,
      current_amount: Number(editGoalCurrent) || 0,
      dueDate: safeDate,
      target_date: safeDate,
      deadline: safeDate,
    };

    if (typeof onUpdateGoal === 'function') {
      onUpdateGoal(updated);
    }
    setEditingGoal(null);
    if (showToast) showToast(`Meta "${updated.name}" actualizada.`);
  };

  const handleContributeToGoal = (goalId) => {
    const val = Number(contributeAmount);
    if (val <= 0) {
      if (showToast) showToast('Ingresa un monto válido para abonar.', true);
      return;
    }
    const targetGoal = savingsGoals.find((g) => g.id === goalId);
    if (!targetGoal) return;

    const currentVal = safeNumber(targetGoal.currentAmount ?? targetGoal.current_amount ?? 0);
    const updatedVal = currentVal + val;

    if (typeof onUpdateGoal === 'function') {
      onUpdateGoal({
        ...targetGoal,
        currentAmount: updatedVal,
        current_amount: updatedVal,
      });
    }
    setContributeGoalId(null);
    setContributeAmount('');
    const formattedAmount = formatMoney ? formatMoney(val) : `$${val.toLocaleString()}`;
    if (showToast) showToast(`¡Abono de ${formattedAmount} registrado con éxito!`);
  };

  const totalSavedAcrossGoals = savingsGoals.reduce((sum, g) => sum + safeNumber(g.currentAmount ?? g.current_amount ?? 0), 0);
  const totalTargetAcrossGoals = savingsGoals.reduce((sum, g) => sum + safeNumber(g.targetAmount ?? g.target_amount ?? 0), 0);

  return {
    showAddGoalForm,
    setShowAddGoalForm,
    newGoalName,
    setNewGoalName,
    newGoalTarget,
    setNewGoalTarget,
    newGoalCurrent,
    setNewGoalCurrent,
    newGoalDate,
    setNewGoalDate,
    editingGoal,
    setEditingGoal,
    editGoalName,
    setEditGoalName,
    editGoalTarget,
    setEditGoalTarget,
    editGoalCurrent,
    setEditGoalCurrent,
    editGoalDate,
    setEditGoalDate,
    contributeGoalId,
    setContributeGoalId,
    contributeAmount,
    setContributeAmount,
    handleCreateGoal,
    handleOpenEditGoal,
    handleSaveEditGoal,
    handleContributeToGoal,
    totalSavedAcrossGoals,
    totalTargetAcrossGoals,
  };
}

export default useSavingsGoals;
