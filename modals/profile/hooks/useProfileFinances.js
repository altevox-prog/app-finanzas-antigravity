import { useState, useEffect } from 'react';
import { safeNumber as defaultSafeNumber } from '../../../../utils/financeMath';
import { 
  supabase as defaultSupabase, 
  isSupabaseConfigured as defaultIsSupabaseConfigured 
} from '../../../../services/supabaseClient';

/**
 * useProfileFinances
 * Custom hook unificado para gestionar la edición del perfil de usuario,
 * suscripciones, presupuestos (global y por categoría) y metas de ahorro.
 *
 * @param {Object} params
 * @param {Object} params.userProfile Perfil del usuario
 * @param {Function} params.onUpdateProfile Callback para actualizar perfil
 * @param {Object} params.budgets Configuración de presupuestos { global, categories }
 * @param {Function} params.onUpdateBudgets Callback para guardar presupuestos
 * @param {Array} params.savingsGoals Metas de ahorro
 * @param {Function} params.onAddGoal Callback para crear meta
 * @param {Function} params.onUpdateGoal Callback para actualizar meta
 * @param {Function} [params.onDeleteGoal] Callback para eliminar meta
 * @param {Array} params.subscriptions Listado de suscripciones
 * @param {Function} params.onAddSubscription Callback para crear suscripción
 * @param {Function} [params.onDeleteSubscription] Callback para eliminar suscripción
 * @param {Function} params.showToast Notificaciones toast
 * @param {Function} [params.formatMoney] Formateador de moneda
 * @param {Function} [params.safeNumber] Helper para sanitizar números
 * @param {Object} [params.supabase] Cliente Supabase
 * @param {boolean} [params.isSupabaseConfigured] Flag Supabase
 * @param {Object} [params.user] Usuario autenticado
 */
export function useProfileFinances({
  userProfile,
  onUpdateProfile,
  budgets = { global: 0, categories: {} },
  onUpdateBudgets,
  savingsGoals = [],
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  subscriptions = [],
  onAddSubscription,
  onDeleteSubscription,
  showToast,
  formatMoney,
  safeNumber = defaultSafeNumber,
  supabase = defaultSupabase,
  isSupabaseConfigured = defaultIsSupabaseConfigured,
  user,
} = {}) {
  // --- Estados de Perfil ---
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userProfile?.name || 'Usuario');

  useEffect(() => {
    if (userProfile?.name) {
      setTempName(userProfile.name);
    }
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
    if (budgets?.global !== undefined) {
      setTempGlobalBudget(budgets.global);
    }
  }, [budgets?.global]);

  // --- Estados de Metas de Ahorro ---
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

  // ==============================================================
  // HANDLERS: PERFIL
  // ==============================================================
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (showToast) showToast('Por favor selecciona un archivo de imagen válido.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (typeof onUpdateProfile === 'function') {
          onUpdateProfile({
            ...userProfile,
            photo: compressedDataUrl,
          });
        }
        if (showToast) showToast('Foto de perfil actualizada.');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    if (typeof onUpdateProfile === 'function') {
      onUpdateProfile({
        ...userProfile,
        photo: null,
      });
    }
    if (showToast) showToast('Foto eliminada. Se mostrarán tus iniciales.');
  };

  const handleSaveName = () => {
    const cleanName = tempName.trim();
    if (!cleanName) {
      if (showToast) showToast('El nombre no puede estar vacío.', true);
      return;
    }
    const parts = cleanName.split(' ').filter(Boolean);
    const initials = parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : cleanName.slice(0, 2).toUpperCase();

    if (typeof onUpdateProfile === 'function') {
      onUpdateProfile({
        ...userProfile,
        name: cleanName,
        initials,
      });
    }
    setIsEditingName(false);
    if (showToast) showToast('Nombre actualizado.');
  };

  // ==============================================================
  // HANDLERS: SUSCRIPCIONES
  // ==============================================================
  const handleCreateSubscription = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!newSubName.trim() || !newSubAmount || Number(newSubAmount) <= 0) {
      if (showToast) showToast('Por favor completa el nombre y un monto válido.', true);
      return;
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

    if (typeof onAddSubscription === 'function') {
      onAddSubscription(sub);
    }
    setNewSubName('');
    setNewSubAmount('');
    setShowAddSubForm(false);
    if (showToast) showToast(`Suscripción ${sub.name} agregada.`);
  };

  const totalMonthlySubscriptions = subscriptions.reduce((sum, s) => {
    if (!s.active) return sum;
    const sAmount = safeNumber(s.amount);
    return sum + (s.frequency === 'yearly' ? Math.round(sAmount / 12) : sAmount);
  }, 0);

  // ==============================================================
  // HANDLERS: PRESUPUESTOS
  // ==============================================================
  const handleSaveGlobalBudget = () => {
    const val = Number(tempGlobalBudget || 0);
    if (val < 0) {
      if (showToast) showToast('Ingresa un monto válido para el presupuesto.', true);
      return;
    }
    const updated = {
      ...budgets,
      global: val,
    };
    if (typeof onUpdateBudgets === 'function') {
      onUpdateBudgets(updated);
    }
    try {
      localStorage.setItem('presu_budgets_v1', JSON.stringify(updated));
      localStorage.setItem('budgets', JSON.stringify(updated));
      localStorage.setItem('global_budget_limit', String(val));
    } catch {}

    // Persistir directamente en Supabase si hay sesión activa
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const targetUserId = authData?.user?.id || (user?.id !== 'local-user' ? user?.id : null);
          if (targetUserId) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            let budgetId = localStorage.getItem('global_budget_id');
            if (!budgetId || !uuidRegex.test(budgetId)) {
              if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                try { budgetId = crypto.randomUUID(); } catch {}
              }
              if (!budgetId || !uuidRegex.test(budgetId)) {
                budgetId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                  const r = (Math.random() * 16) | 0;
                  const v = c === 'x' ? r : (r & 0x3) | 0x8;
                  return v.toString(16);
                });
              }
              try {
                localStorage.setItem('global_budget_id', budgetId);
              } catch {}
            }

            const nowIso = new Date().toISOString();
            const budgetRecord = {
              id: budgetId,
              user_id: targetUserId,
              name: 'Límite Global',
              category: 'General',
              period: 'monthly',
              amount: Number(val) || 0,
              is_global: true,
              updated_at: nowIso,
            };

            const { error: bErr } = await supabase.from('budgets').upsert([budgetRecord], { onConflict: 'id' });
            if (bErr) {
              console.warn('[ProfileModal] Upsert en budgets falló (400/schema):', bErr.message || bErr);
              try {
                localStorage.setItem('global_budget_limit', String(Number(val) || 0));
              } catch {}

              try {
                await supabase.from('budgets').upsert([{
                  id: budgetId,
                  user_id: targetUserId,
                  name: 'Límite Global',
                  category: 'General',
                  period: 'monthly',
                  amount: Number(val) || 0,
                  updated_at: nowIso,
                }], { onConflict: 'id' });
              } catch (reErr) {
                console.warn('[ProfileModal] Reintento básico de budgets omitido:', reErr);
              }
            } else {
              try {
                localStorage.setItem('global_budget_limit', String(Number(val) || 0));
              } catch {}
            }

            try {
              const { error: settingsError } = await supabase
                .from('user_settings')
                .upsert(
                  { user_id: targetUserId, global_budget_limit: val, updated_at: nowIso },
                  { onConflict: 'user_id' }
                );

              if (settingsError) {
                console.warn('[ProfileModal] Upsert en user_settings omitido (404/PGRST204):', settingsError.message || settingsError);
              }
            } catch (settingsEx) {
              console.warn('[ProfileModal] Fallo defensivo al persistir en user_settings:', settingsEx);
            }

            try {
              localStorage.setItem('user_settings', JSON.stringify({
                user_id: targetUserId,
                global_budget_limit: val,
                updated_at: nowIso,
              }));
            } catch {}
          }
        } catch (e) {
          console.warn('Error al guardar presupuesto en Supabase:', e);
          try {
            localStorage.setItem('global_budget_limit', String(Number(val) || 0));
          } catch {}
        }
      })();
    }

    setIsEditingGlobalBudget(false);
    if (showToast) {
      showToast(val > 0 ? 'Presupuesto global actualizado.' : 'Límite global eliminado ($0).');
    }
  };

  const handleSaveCategoryBudget = (catId) => {
    const val = Number(tempCatBudgetAmount);
    if (val < 0) {
      if (showToast) showToast('Ingresa un monto válido.', true);
      return;
    }
    if (typeof onUpdateBudgets === 'function') {
      onUpdateBudgets({
        ...budgets,
        categories: {
          ...budgets.categories,
          [catId]: val,
        },
      });
    }
    setEditingCatBudgetId(null);
    setTempCatBudgetAmount('');
    if (showToast) showToast('Límite de categoría actualizado.');
  };

  // ==============================================================
  // HANDLERS: METAS DE AHORRO
  // ==============================================================
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

    const goal = {
      id: `goal-${Date.now()}`,
      name: newGoalName.trim(),
      targetAmount: Number(newGoalTarget),
      currentAmount: Number(newGoalCurrent) || 0,
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
      currentAmount: Number(editGoalCurrent) || 0,
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

    if (typeof onUpdateGoal === 'function') {
      onUpdateGoal({
        ...targetGoal,
        currentAmount: safeNumber(targetGoal.currentAmount) + val,
      });
    }
    setContributeGoalId(null);
    setContributeAmount('');
    const formattedAmount = formatMoney ? formatMoney(val) : `$${val.toLocaleString()}`;
    if (showToast) showToast(`¡Abono de ${formattedAmount} registrado con éxito!`);
  };

  const totalSavedAcrossGoals = savingsGoals.reduce((sum, g) => sum + safeNumber(g.currentAmount), 0);
  const totalTargetAcrossGoals = savingsGoals.reduce((sum, g) => sum + safeNumber(g.targetAmount), 0);

  return {
    // Perfil
    isEditingName,
    setIsEditingName,
    tempName,
    setTempName,
    handleImageChange,
    handleRemovePhoto,
    handleSaveName,

    // Suscripciones
    showAddSubForm,
    setShowAddSubForm,
    newSubName,
    setNewSubName,
    newSubAmount,
    setNewSubAmount,
    newSubBillingDay,
    setNewSubBillingDay,
    newSubFrequency,
    setNewSubFrequency,
    newSubCategory,
    setNewSubCategory,
    handleCreateSubscription,
    totalMonthlySubscriptions,

    // Presupuestos
    isEditingGlobalBudget,
    setIsEditingGlobalBudget,
    tempGlobalBudget,
    setTempGlobalBudget,
    editingCatBudgetId,
    setEditingCatBudgetId,
    tempCatBudgetAmount,
    setTempCatBudgetAmount,
    handleSaveGlobalBudget,
    handleSaveCategoryBudget,

    // Metas de Ahorro
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

export default useProfileFinances;
