import { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_BUDGETS } from '../data/initialData';
import { ensureUUID } from '../services/syncEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { resolveRemoteBudgets } from '../services/sync/syncNormalizers';

/**
 * Normaliza y construye el estado de presupuestos de React
 */
const normalizeBudgetsState = (budgets) => ({
  global: Number(budgets?.global || 0),
  categories: budgets?.categories && typeof budgets.categories === 'object' ? { ...budgets.categories } : {}
});

/**
 * useBudgets: Hook de gestión de presupuestos conectado a Supabase Puro y sincronizado en tiempo real.
 */
export function useBudgets(isResettingRef, options = {}) {
  const explicitUser = typeof isResettingRef === 'object' && isResettingRef?.user ? isResettingRef.user : options?.user;
  const resetRef = typeof isResettingRef === 'object' && 'current' in isResettingRef ? isResettingRef : options?.isResettingRef;

  const [budgets, setBudgets] = useState(() => ({ ...INITIAL_BUDGETS }));
  const [activeUser, setActiveUser] = useState(explicitUser || null);
  const activeUserRef = useRef(explicitUser || null);
  activeUserRef.current = activeUser;

  // 1. Suscripción a la sesión del usuario de Supabase Auth
  useEffect(() => {
    if (explicitUser) return setActiveUser(explicitUser);
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;
    getSupabaseUser().then((u) => { if (isMounted && u?.id) setActiveUser(u); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setActiveUser(session?.user || null);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [explicitUser]);

  // Helper para obtener ID de usuario
  const getUid = useCallback(async () => activeUserRef.current?.id || (await getSupabaseUser())?.id, []);

  // 2. Consulta y carga inicial desde Supabase
  const fetchBudgets = useCallback(async (userId = null) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const uid = userId || await getUid();
      if (!uid) return;

      const [budgetsRes, settingsRes] = await Promise.allSettled([
        supabase.from('budgets').select('*').eq('user_id', uid),
        supabase.from('user_settings').select('*').eq('user_id', uid).maybeSingle()
      ]);

      const rawBudgets = budgetsRes.status === 'fulfilled' && !budgetsRes.value?.error ? budgetsRes.value.data : [];
      const userSettings = settingsRes.status === 'fulfilled' && !settingsRes.value?.error ? settingsRes.value.data : null;
      const normalized = normalizeBudgetsState(resolveRemoteBudgets(rawBudgets, userSettings));
      setBudgets(normalized);
      return normalized;
    } catch (err) {
      console.error('[useBudgets] Error al consultar presupuestos:', err);
    }
  }, [getUid]);

  useEffect(() => {
    if (!resetRef?.current && isSupabaseConfigured && supabase && activeUser?.id) {
      fetchBudgets(activeUser.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser?.id]);

  // 3. Suscripción en Tiempo Real (Realtime WebSockets)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;

    const channel = supabase
      .channel(`realtime:budgets:${activeUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'budgets', filter: `user_id=eq.${activeUser.id}` },
        (payload) => {
          const { eventType, new: rowNew, old: rowOld } = payload;
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            if (!rowNew) return;
            const isGlobal = rowNew.is_global === true || rowNew.is_global === 'true' || rowNew.isGlobal === true || rowNew.name === 'Límite Global' || !rowNew.category_id;
            const amount = Number(rowNew.amount || 0);

            setBudgets((prev) => {
              if (isGlobal) return { ...prev, global: amount };
              const catId = rowNew.category_id || rowNew.category;
              return catId ? { ...prev, categories: { ...(prev?.categories || {}), [catId]: amount } } : prev;
            });
          } else if (eventType === 'DELETE' && rowOld?.category_id) {
            setBudgets((prev) => {
              const updated = { ...(prev?.categories || {}) };
              delete updated[rowOld.category_id];
              return { ...prev, categories: updated };
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeUser?.id]);

  // 4. Operaciones de persistencia optimista directa
  const updateGlobalBudget = useCallback(async (amount) => {
    const val = Math.max(0, Number(amount) || 0);
    setBudgets((prev) => ({ ...prev, global: val }));

    if (!isSupabaseConfigured || !supabase) return;
    try {
      const uid = await getUid();
      if (!uid) return;
      const nowIso = new Date().toISOString();
      const globalId = ensureUUID(`${uid}-global-budget`);
      const baseRec = { id: globalId, user_id: uid, name: 'Límite Global', category: 'General', period: 'monthly', amount: val, updated_at: nowIso };

      const { error: bErr } = await supabase.from('budgets').upsert([{ ...baseRec, is_global: true }], { onConflict: 'id' });
      if (bErr) await supabase.from('budgets').upsert([baseRec], { onConflict: 'id' });

      supabase.from('user_settings').upsert({ user_id: uid, global_budget_limit: val, updated_at: nowIso }, { onConflict: 'user_id' }).catch(() => {});
    } catch (err) {
      console.error('[useBudgets] Error al actualizar presupuesto global:', err);
    }
  }, [getUid]);

  const updateCategoryBudget = useCallback(async (categoryId, amount) => {
    const val = Math.max(0, Number(amount) || 0);
    setBudgets((prev) => ({ ...prev, categories: { ...(prev?.categories || {}), [categoryId]: val } }));

    if (!isSupabaseConfigured || !supabase || !categoryId) return;
    try {
      const uid = await getUid();
      if (!uid) return;
      await supabase.from('budgets').upsert([{
        id: ensureUUID(`${uid}-budget-${categoryId}`),
        user_id: uid,
        name: `Presupuesto ${categoryId}`,
        category: categoryId,
        category_id: categoryId,
        period: 'monthly',
        amount: val,
        is_global: false,
        updated_at: new Date().toISOString()
      }], { onConflict: 'id' });
    } catch (err) {
      console.error('[useBudgets] Error al guardar presupuesto de categoría:', err);
    }
  }, [getUid]);

  const removeCategoryBudget = useCallback(async (categoryId) => {
    if (!categoryId) return;
    setBudgets((prev) => {
      const updated = { ...(prev?.categories || {}) };
      delete updated[categoryId];
      return { ...prev, categories: updated };
    });

    if (!isSupabaseConfigured || !supabase) return;
    try {
      const uid = await getUid();
      if (uid) {
        await supabase.from('budgets').delete().eq('id', ensureUUID(`${uid}-budget-${categoryId}`)).eq('user_id', uid);
      }
    } catch (err) {
      console.error('[useBudgets] Error al eliminar presupuesto de categoría:', err);
    }
  }, [getUid]);

  const resetBudgets = useCallback(() => setBudgets({ ...INITIAL_BUDGETS }), []);

  return {
    budgets,
    setBudgets,
    updateGlobalBudget,
    handleSetGlobalBudget: updateGlobalBudget,
    updateCategoryBudget,
    removeCategoryBudget,
    fetchBudgets,
    resetBudgets
  };
}
