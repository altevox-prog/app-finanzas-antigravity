/**
 * Servicio de persistencia y sanitización de presupuestos
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Obtiene o genera un UUID válido para el presupuesto global.
 */
export function getOrCreateGlobalBudgetId() {
  let budgetId = null;
  try {
    budgetId = localStorage.getItem('global_budget_id');
  } catch {}

  if (!budgetId || !UUID_REGEX.test(budgetId)) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      try { budgetId = crypto.randomUUID(); } catch {}
    }
    if (!budgetId || !UUID_REGEX.test(budgetId)) {
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
  return budgetId;
}

/**
 * Guarda y sincroniza el presupuesto global en estado local, localStorage y Supabase.
 */
export async function persistGlobalBudget({
  val,
  budgets,
  onUpdateBudgets,
  supabase,
  isSupabaseConfigured,
  user
}) {
  const numericVal = Number(val || 0);
  if (numericVal < 0) {
    throw new Error('Ingresa un monto válido para el presupuesto.');
  }

  const updated = {
    ...budgets,
    global: numericVal,
  };

  if (typeof onUpdateBudgets === 'function') {
    onUpdateBudgets(updated);
  }

  try {
    localStorage.setItem('presu_budgets_v1', JSON.stringify(updated));
    localStorage.setItem('budgets', JSON.stringify(updated));
    localStorage.setItem('global_budget_limit', String(numericVal));
  } catch {}

  // Persistir directamente en Supabase si hay sesión activa
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const targetUserId = authData?.user?.id || (user?.id !== 'local-user' ? user?.id : null);
      if (targetUserId) {
        const budgetId = getOrCreateGlobalBudgetId();
        const nowIso = new Date().toISOString();
        const budgetRecord = {
          id: budgetId,
          user_id: targetUserId,
          name: 'Límite Global',
          category: 'General',
          period: 'monthly',
          amount: numericVal,
          is_global: true,
          updated_at: nowIso,
        };

        const { error: bErr } = await supabase.from('budgets').upsert([budgetRecord], { onConflict: 'id' });
        if (bErr) {
          console.warn('[budgetService] Upsert en budgets falló (400/schema):', bErr.message || bErr);
          try {
            await supabase.from('budgets').upsert([{
              id: budgetId,
              user_id: targetUserId,
              name: 'Límite Global',
              category: 'General',
              period: 'monthly',
              amount: numericVal,
              updated_at: nowIso,
            }], { onConflict: 'id' });
          } catch (reErr) {
            console.warn('[budgetService] Reintento básico de budgets omitido:', reErr);
          }
        }

        try {
          const { error: settingsError } = await supabase
            .from('user_settings')
            .upsert(
              { user_id: targetUserId, global_budget_limit: numericVal, updated_at: nowIso },
              { onConflict: 'user_id' }
            );

          if (settingsError) {
            console.warn('[budgetService] Upsert en user_settings omitido:', settingsError.message || settingsError);
          }
        } catch (settingsEx) {
          console.warn('[budgetService] Fallo defensivo al persistir en user_settings:', settingsEx);
        }

        try {
          localStorage.setItem('user_settings', JSON.stringify({
            user_id: targetUserId,
            global_budget_limit: numericVal,
            updated_at: nowIso,
          }));
        } catch {}
      }
    } catch (e) {
      console.warn('[budgetService] Error al guardar presupuesto en Supabase:', e);
      try {
        localStorage.setItem('global_budget_limit', String(numericVal));
      } catch {}
    }
  }

  return updated;
}

/**
 * Guarda y actualiza el presupuesto por categoría.
 */
export function persistCategoryBudget({ catId, amount, budgets, onUpdateBudgets }) {
  const numericVal = Number(amount);
  if (numericVal < 0) {
    throw new Error('Ingresa un monto válido.');
  }

  const updated = {
    ...budgets,
    categories: {
      ...(budgets?.categories || {}),
      [catId]: numericVal,
    },
  };

  if (typeof onUpdateBudgets === 'function') {
    onUpdateBudgets(updated);
  }

  return updated;
}
