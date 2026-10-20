/**
 * budgetService.js
 * Persistencia y sincronización de presupuestos (global y por categoría).
 */

import { ensureUUID } from '../syncEngine';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getOrCreateGlobalBudgetId() {
  let budgetId = null;
  try { budgetId = localStorage.getItem('global_budget_id'); } catch {}

  if (!budgetId || !UUID_REGEX.test(budgetId)) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      try { budgetId = crypto.randomUUID(); } catch {}
    }
    if (!budgetId || !UUID_REGEX.test(budgetId)) {
      budgetId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
    }
    try { localStorage.setItem('global_budget_id', budgetId); } catch {}
  }
  return budgetId;
}

export async function persistGlobalBudget({
  val, budgets, onUpdateBudgets, supabase, isSupabaseConfigured, user
}) {
  const numericVal = Number(val || 0);
  if (numericVal < 0) throw new Error('Ingresa un monto válido para el presupuesto.');

  const updated = { ...budgets, global: numericVal };
  onUpdateBudgets?.(updated);

  try {
    const json = JSON.stringify(updated);
    localStorage.setItem('presu_budgets_v1', json);
    localStorage.setItem('budgets', json);
    localStorage.setItem('global_budget_limit', String(numericVal));
  } catch {}

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.auth.getUser();
      const targetUserId = data?.user?.id || (user?.id !== 'local-user' ? user?.id : null);
      if (targetUserId) {
        const budgetId = getOrCreateGlobalBudgetId();
        const nowIso = new Date().toISOString();
        const budgetRecord = {
          id: budgetId, user_id: targetUserId, name: 'Límite Global', category: 'General',
          period: 'monthly', amount: numericVal, is_global: true, updated_at: nowIso
        };

        const { error: bErr } = await supabase.from('budgets').upsert([budgetRecord], { onConflict: 'id' });
        if (bErr) {
          await supabase.from('budgets').upsert([{
            id: budgetId, user_id: targetUserId, name: 'Límite Global', category: 'General',
            period: 'monthly', amount: numericVal, updated_at: nowIso
          }], { onConflict: 'id' }).catch(() => {});
        }

        await supabase.from('user_settings').upsert(
          { user_id: targetUserId, global_budget_limit: numericVal, updated_at: nowIso },
          { onConflict: 'user_id' }
        ).catch(() => {});

        try {
          localStorage.setItem('user_settings', JSON.stringify({ user_id: targetUserId, global_budget_limit: numericVal, updated_at: nowIso }));
        } catch {}
      }
    } catch (e) {
      console.warn('[budgetService] Error al guardar presupuesto en Supabase:', e);
    }
  }

  return updated;
}

export async function persistCategoryBudget({
  catId, amount, budgets, onUpdateBudgets, supabase, isSupabaseConfigured, user
}) {
  const numericVal = Number(amount || 0);
  if (numericVal < 0 || isNaN(numericVal)) throw new Error('Ingresa un monto válido.');

  const updated = { ...budgets, categories: { ...(budgets?.categories || {}), [catId]: numericVal } };
  onUpdateBudgets?.(updated);

  try {
    const json = JSON.stringify(updated);
    localStorage.setItem('presu_budgets_v1', json);
    localStorage.setItem('budgets', json);
  } catch {}

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.auth.getUser();
      const targetUserId = data?.user?.id || (user?.id !== 'local-user' ? user?.id : null);
      if (targetUserId) {
        await supabase.from('budgets').upsert([{
          id: ensureUUID(`${targetUserId}-budget-${catId}`),
          user_id: targetUserId,
          name: `Presupuesto ${catId}`,
          category: String(catId),
          category_id: String(catId),
          period: 'monthly',
          amount: numericVal,
          is_global: false,
          updated_at: new Date().toISOString()
        }], { onConflict: 'id' });
      }
    } catch (e) {
      console.warn('[budgetService] Error al guardar presupuesto de categoría:', e);
    }
  }

  return updated;
}

export async function removeCategoryBudget({
  catId, budgets, onUpdateBudgets, supabase, isSupabaseConfigured, user
}) {
  if (!catId) return budgets;
  const updatedCategories = { ...(budgets?.categories || {}) };
  delete updatedCategories[catId];
  const updated = { ...budgets, categories: updatedCategories };
  onUpdateBudgets?.(updated);

  try {
    const json = JSON.stringify(updated);
    localStorage.setItem('presu_budgets_v1', json);
    localStorage.setItem('budgets', json);
  } catch {}

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.auth.getUser();
      const targetUserId = data?.user?.id || (user?.id !== 'local-user' ? user?.id : null);
      if (targetUserId) {
        await supabase.from('budgets').delete().eq('id', ensureUUID(`${targetUserId}-budget-${catId}`)).eq('user_id', targetUserId);
      }
    } catch (e) {
      console.warn('[budgetService] Error al eliminar presupuesto de categoría:', e);
    }
  }

  return updated;
}
