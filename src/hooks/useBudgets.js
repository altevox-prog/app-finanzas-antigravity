import { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_BUDGETS } from '../data/initialData';
import { ensureUUID } from '../services/syncEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { resolveRemoteBudgets } from '../services/sync/syncNormalizers';
import { toast } from '../utils/toast';

/**
 * Normaliza y construye el estado de presupuestos de React
 */
export function normalizeBudgetsState(budgets) {
  if (!budgets || typeof budgets !== 'object') {
    return { global: 0, categories: {} };
  }
  return {
    global: Number(budgets.global || 0),
    categories: budgets.categories && typeof budgets.categories === 'object' ? { ...budgets.categories } : {}
  };
}

/**
 * useBudgets
 * Hook de gestión de presupuestos conectado a Supabase Puro y sincronizado en tiempo real (Realtime).
 */
export function useBudgets(isResettingRef, options = {}) {
  const explicitUser = typeof isResettingRef === 'object' && isResettingRef?.user ? isResettingRef.user : options?.user;
  const resetRef = typeof isResettingRef === 'object' && 'current' in isResettingRef ? isResettingRef : options?.isResettingRef;

  // Estado limpio en memoria
  const [budgets, setBudgets] = useState(() => ({ ...INITIAL_BUDGETS }));
  const [activeUser, setActiveUser] = useState(explicitUser || null);
  const activeUserRef = useRef(explicitUser || null);
  activeUserRef.current = activeUser;

  // 1. Detección y suscripción a la sesión del usuario de Supabase Auth
  useEffect(() => {
    if (explicitUser) {
      setActiveUser(explicitUser);
      return;
    }

    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;
    getSupabaseUser().then((u) => {
      if (isMounted && u?.id) {
        setActiveUser(u);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setActiveUser(session?.user || null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [explicitUser]);

  // 2. Consulta y carga inicial desde Supabase
  const fetchBudgets = useCallback(async (userId = null) => {
    if (!isSupabaseConfigured || !supabase) return budgets;
    try {
      let uid = userId || activeUserRef.current?.id;
      if (!uid) {
        const user = await getSupabaseUser();
        uid = user?.id;
      }
      if (!uid) return budgets;

      // Consultar la tabla budgets y user_settings en paralelo
      const [budgetsRes, settingsRes] = await Promise.allSettled([
        supabase.from('budgets').select('*').eq('user_id', uid),
        supabase.from('user_settings').select('*').eq('user_id', uid).maybeSingle()
      ]);

      const rawBudgets = budgetsRes.status === 'fulfilled' && !budgetsRes.value?.error ? budgetsRes.value.data : [];
      const userSettings = settingsRes.status === 'fulfilled' && !settingsRes.value?.error ? settingsRes.value.data : null;

      const resolved = resolveRemoteBudgets(rawBudgets, userSettings);
      const normalized = normalizeBudgetsState(resolved);

      setBudgets(normalized);
      return normalized;
    } catch (err) {
      console.error('[useBudgets] Error al consultar presupuestos en Supabase:', err);
      return budgets;
    }
  }, [budgets]);

  useEffect(() => {
    if (resetRef?.current) return;
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;

    fetchBudgets(activeUser.id);
  }, [activeUser?.id, resetRef, fetchBudgets]);

  // 3. Suscripción en Tiempo Real (Realtime WebSockets)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;

    const channelName = `realtime:budgets:${activeUser.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budgets',
          filter: `user_id=eq.${activeUser.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new;
            if (!row) return;

            const isRowGlobal = row.is_global === true || row.is_global === 'true' || row.isGlobal === true || row.name === 'Límite Global' || !row.category_id;
            const amount = Number(row.amount || 0);

            setBudgets((prev) => {
              if (isRowGlobal) {
                return {
                  ...prev,
                  global: amount
                };
              }
              const catId = row.category_id || row.category;
              if (catId) {
                return {
                  ...prev,
                  categories: {
                    ...(prev?.categories || {}),
                    [catId]: amount
                  }
                };
              }
              return prev;
            });
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old;
            if (!row) return;

            setBudgets((prev) => {
              const updatedCats = { ...(prev?.categories || {}) };
              if (row.category_id) {
                delete updatedCats[row.category_id];
              }
              return {
                ...prev,
                categories: updatedCats
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUser?.id]);

  // 4. Operaciones de persistencia directa en Supabase

  // Actualizar presupuesto global
  const updateGlobalBudget = useCallback(async (amount) => {
    const val = Math.max(0, Number(amount) || 0);

    // Actualización optimista inmediata en React
    setBudgets((prev) => ({
      ...prev,
      global: val
    }));

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const nowIso = new Date().toISOString();
          const globalId = ensureUUID(`${user.id}-global-budget`);

          const budgetRecord = {
            id: globalId,
            user_id: user.id,
            name: 'Límite Global',
            category: 'General',
            period: 'monthly',
            amount: val,
            is_global: true,
            updated_at: nowIso
          };

          const { error: bErr } = await supabase.from('budgets').upsert([budgetRecord], { onConflict: 'id' });
          if (bErr) {
            console.warn('[useBudgets] Upsert primario en budgets falló, intentando esquema básico:', bErr.message);
            await supabase.from('budgets').upsert([{
              id: globalId,
              user_id: user.id,
              name: 'Límite Global',
              category: 'General',
              period: 'monthly',
              amount: val,
              updated_at: nowIso
            }], { onConflict: 'id' });
          }

          // Sincronizar también con user_settings para compatibilidad
          supabase.from('user_settings').upsert({
            user_id: user.id,
            global_budget_limit: val,
            updated_at: nowIso
          }, { onConflict: 'user_id' }).catch(() => {});
        }
      } catch (err) {
        console.error('[useBudgets] Excepción al actualizar presupuesto global en Supabase:', err);
      }
    }
  }, []);

  const handleSetGlobalBudget = updateGlobalBudget;

  // Actualizar presupuesto para una categoría específica
  const updateCategoryBudget = useCallback(async (categoryId, amount) => {
    const val = Math.max(0, Number(amount) || 0);

    // Actualización optimista inmediata en React
    setBudgets((prev) => ({
      ...prev,
      categories: {
        ...(prev?.categories || {}),
        [categoryId]: val
      }
    }));

    if (isSupabaseConfigured && supabase && categoryId) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const nowIso = new Date().toISOString();
          const catBudgetId = ensureUUID(`${user.id}-budget-${categoryId}`);

          const catRecord = {
            id: catBudgetId,
            user_id: user.id,
            name: `Presupuesto ${categoryId}`,
            category: categoryId,
            category_id: categoryId,
            period: 'monthly',
            amount: val,
            is_global: false,
            updated_at: nowIso
          };

          const { error } = await supabase.from('budgets').upsert([catRecord], { onConflict: 'id' });
          if (error) {
            console.warn('[useBudgets] Error al guardar presupuesto de categoría en Supabase:', error.message);
          }
        }
      } catch (err) {
        console.error('[useBudgets] Excepción al guardar presupuesto de categoría:', err);
      }
    }
  }, []);

  // Eliminar presupuesto de una categoría
  const removeCategoryBudget = useCallback(async (categoryId) => {
    if (!categoryId) return;

    // Actualización optimista inmediata en React
    setBudgets((prev) => {
      const updatedCategories = { ...(prev?.categories || {}) };
      delete updatedCategories[categoryId];
      return {
        ...prev,
        categories: updatedCategories
      };
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const catBudgetId = ensureUUID(`${user.id}-budget-${categoryId}`);
          await supabase
            .from('budgets')
            .delete()
            .eq('id', catBudgetId)
            .eq('user_id', user.id);
        }
      } catch (err) {
        console.error('[useBudgets] Error al eliminar presupuesto de categoría en Supabase:', err);
      }
    }
  }, []);

  // Restaurar presupuestos por defecto en memoria
  const resetBudgets = useCallback(() => {
    setBudgets({ ...INITIAL_BUDGETS });
  }, []);

  return {
    budgets,
    setBudgets,
    updateGlobalBudget,
    handleSetGlobalBudget,
    updateCategoryBudget,
    removeCategoryBudget,
    fetchBudgets,
    resetBudgets
  };
}
