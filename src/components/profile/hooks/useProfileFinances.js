import { useState, useEffect } from 'react';
import { safeNumber as defaultSafeNumber } from '../../../utils/financeMath';
import { 
  supabase as defaultSupabase, 
  isSupabaseConfigured as defaultIsSupabaseConfigured 
} from '../../../services/supabaseClient';
import { compressImageFile, getInitialsFromName } from '../../../services/profile/profileImageService';
import { persistGlobalBudget, persistCategoryBudget } from '../../../services/profile/budgetService';
import { useSavingsGoals } from '../../../hooks/useSavingsGoals';

/**
 * useProfileFinances - Gestión unificada de perfil, suscripciones, presupuestos y metas de ahorro.
 */
export function useProfileFinances({
  userProfile, onUpdateProfile, budgets = { global: 0, categories: {} }, onUpdateBudgets,
  savingsGoals = [], onAddGoal, onUpdateGoal, onDeleteGoal, subscriptions = [],
  onAddSubscription, onDeleteSubscription, showToast, formatMoney,
  safeNumber = defaultSafeNumber, supabase = defaultSupabase,
  isSupabaseConfigured = defaultIsSupabaseConfigured, user,
} = {}) {
  // --- Estados de Perfil ---
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userProfile?.name || 'Usuario');

  useEffect(() => {
    if (userProfile?.name) setTempName(userProfile.name);
  }, [userProfile?.name]);

  // --- Estados de Suscripciones ---
  const [showAddSubForm, setShowAddSubForm] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubAmount, setNewSubAmount] = useState('');
  const [newSubBillingDay, setNewSubBillingDay] = useState(1);
  const [newSubFrequency, setNewSubFrequency] = useState('monthly');
  const [newSubCategory, setNewSubCategory] = useState('Entretenimiento');

  // --- Estados de Presupuestos ---
  const [isEditingGlobalBudget, setIsEditingGlobalBudget] = useState(false);
  const [tempGlobalBudget, setTempGlobalBudget] = useState(budgets?.global || 0);
  const [editingCatBudgetId, setEditingCatBudgetId] = useState(null);
  const [tempCatBudgetAmount, setTempCatBudgetAmount] = useState('');

  useEffect(() => {
    if (budgets?.global !== undefined) setTempGlobalBudget(budgets.global);
  }, [budgets?.global]);

  // --- Módulo delegado de Metas de Ahorro ---
  const savings = useSavingsGoals({
    savingsGoals, onAddGoal, onUpdateGoal, showToast, formatMoney, safeNumber,
  });

  // --- Handlers: Perfil ---
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const photo = await compressImageFile(file);
      onUpdateProfile?.({ ...userProfile, photo });
      showToast?.('Foto de perfil actualizada.');
    } catch (err) {
      showToast?.(err.message || 'Error al procesar la imagen.', true);
    }
  };

  const handleRemovePhoto = () => {
    onUpdateProfile?.({ ...userProfile, photo: null });
    showToast?.('Foto eliminada. Se mostrarán tus iniciales.');
  };

  const handleSaveName = () => {
    const cleanName = tempName.trim();
    if (!cleanName) return showToast?.('El nombre no puede estar vacío.', true);
    onUpdateProfile?.({ ...userProfile, name: cleanName, initials: getInitialsFromName(cleanName) });
    setIsEditingName(false);
    showToast?.('Nombre actualizado.');
  };

  // --- Handlers: Suscripciones ---
  const handleCreateSubscription = (e) => {
    e?.preventDefault?.();
    if (!newSubName.trim() || !newSubAmount || Number(newSubAmount) <= 0) {
      return showToast?.('Por favor completa el nombre y un monto válido.', true);
    }
    const sub = {
      id: `sub-${Date.now()}`,
      name: newSubName.trim(),
      amount: Number(newSubAmount),
      frequency: newSubFrequency,
      billingDay: Number(newSubBillingDay) || 1,
      category: newSubCategory,
      icon: newSubCategory === 'Música' ? 'Music' : newSubCategory === 'Nube y Datos' ? 'Cloud' : 'Tv',
      active: true,
    };
    onAddSubscription?.(sub);
    setNewSubName('');
    setNewSubAmount('');
    setShowAddSubForm(false);
    showToast?.(`Suscripción ${sub.name} agregada.`);
  };

  const totalMonthlySubscriptions = subscriptions.reduce((sum, s) => {
    if (!s.active) return sum;
    const sAmount = safeNumber(s.amount);
    return sum + (s.frequency === 'yearly' ? Math.round(sAmount / 12) : sAmount);
  }, 0);

  // --- Handlers: Presupuestos ---
  const handleSaveGlobalBudget = () => {
    const val = Number(tempGlobalBudget || 0);
    persistGlobalBudget({ val, budgets, onUpdateBudgets, supabase, isSupabaseConfigured, user })
      .then(() => {
        setIsEditingGlobalBudget(false);
        showToast?.(val > 0 ? 'Presupuesto global actualizado.' : 'Límite global eliminado ($0).');
      })
      .catch((err) => showToast?.(err.message, true));
  };

  const handleSaveCategoryBudget = (catId) => {
    try {
      persistCategoryBudget({ catId, amount: tempCatBudgetAmount, budgets, onUpdateBudgets });
      setEditingCatBudgetId(null);
      setTempCatBudgetAmount('');
      showToast?.('Límite de categoría actualizado.');
    } catch (err) {
      showToast?.(err.message, true);
    }
  };

  return {
    // Perfil
    isEditingName, setIsEditingName, tempName, setTempName,
    handleImageChange, handleRemovePhoto, handleSaveName,

    // Suscripciones
    showAddSubForm, setShowAddSubForm, newSubName, setNewSubName,
    newSubAmount, setNewSubAmount, newSubBillingDay, setNewSubBillingDay,
    newSubFrequency, setNewSubFrequency, newSubCategory, setNewSubCategory,
    handleCreateSubscription, totalMonthlySubscriptions,

    // Presupuestos
    isEditingGlobalBudget, setIsEditingGlobalBudget,
    tempGlobalBudget, setTempGlobalBudget,
    editingCatBudgetId, setEditingCatBudgetId,
    tempCatBudgetAmount, setTempCatBudgetAmount,
    handleSaveGlobalBudget, handleSaveCategoryBudget,

    // Metas de Ahorro (delegadas)
    ...savings,
  };
}

export default useProfileFinances;
