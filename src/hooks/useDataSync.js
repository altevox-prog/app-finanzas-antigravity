import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { reconcileAccounts, reconcileTransactions, mergeRecords, ensureUUID } from '../utils/recordMerger';

/**
 * useDataSync
 * Hook de sincronización en segundo plano (Local-First Cloud Sync).
 * 
 * - Mantiene el funcionamiento 100% local, rápido y offline mediante localStorage.
 * - Si Supabase está configurado y hay un usuario autenticado:
 *   1. Escucha eventos de Auth y descarga las 8 tablas en segundo plano al iniciar sesión.
 *   2. Expone pushLocalToCloud() para respaldar y subir los datos locales a la nube.
 *   3. Configura Supabase Realtime en 'transactions' y 'accounts' para cambios multi-dispositivo.
 */
export function useDataSync({
  accounts = [],
  setAccounts,
  transactions = [],
  setTransactions,
  debtsAndLoans = [],
  setDebtsAndLoans,
  investments = [],
  setInvestments,
  recurringPayments = [],
  setRecurringPayments,
  budgets = { global: 0, categories: {} },
  setBudgets,
  categories = [],
  setCategories,
  savingsGoals = [],
  setSavingsGoals,
  userProfile = {},
  setUserProfile
} = {}) {
  const [syncUser, setSyncUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState(() => isSupabaseConfigured ? 'idle' : 'offline');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);

  // Referencias mutables para acceder siempre a los datos más recientes en callbacks asíncronos
  const latestDataRef = useRef({
    accounts,
    transactions,
    debtsAndLoans,
    investments,
    recurringPayments,
    budgets,
    categories,
    savingsGoals,
    userProfile
  });

  useEffect(() => {
    latestDataRef.current = {
      accounts,
      transactions,
      debtsAndLoans,
      investments,
      recurringPayments,
      budgets,
      categories,
      savingsGoals,
      userProfile
    };
  }, [
    accounts,
    transactions,
    debtsAndLoans,
    investments,
    recurringPayments,
    budgets,
    categories,
    savingsGoals,
    userProfile
  ]);

  // ==========================================================================
  // 1. DESCARGA NO INTRUSIVA DE LA NUBE (PULL CLOUD TO LOCAL)
  // ==========================================================================
  const pullCloudToLocal = useCallback(async (userOverride = null, data = null) => {
    if (!isSupabaseConfigured || !supabase) {
      setSyncStatus('offline');
      return { success: false, reason: 'not_configured' };
    }

    const targetUser = userOverride || syncUser;
    if (!targetUser || !targetUser.id) {
      setSyncStatus('idle');
      return { success: false, reason: 'unauthenticated' };
    }

    const userId = targetUser.id;
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      // Descargar las tablas en paralelo usando Promise.allSettled para resiliencia
      const [
        accountsRes,
        txsRes,
        debtsRes,
        investmentsRes,
        recurringRes,
        budgetsRes,
        categoriesRes,
        goalsRes,
        profileRes
      ] = await Promise.allSettled([
        supabase.from('accounts').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('debts').select('*').eq('user_id', userId),
        supabase.from('investments').select('*').eq('user_id', userId),
        supabase.from('recurring_payments').select('*').eq('user_id', userId),
        supabase.from('budgets').select('*').eq('user_id', userId),
        supabase.from('categories').select('*').eq('user_id', userId),
        supabase.from('savings_goals').select('*').eq('user_id', userId),
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      ]);

      const current = latestDataRef.current;

      // 1. Cuentas: asignación exclusiva de las cuentas del usuario
      if (accountsRes.status === 'fulfilled' && !accountsRes.value.error && Array.isArray(accountsRes.value.data)) {
        const remoteAccounts = accountsRes.value.data.map(a => ({
          ...a,
          id: a.id,
          name: a.name,
          type: a.type,
          balance: Number(a.balance ?? a.initial_balance ?? 0),
          currency: a.currency || 'COP',
          color: a.color || '#007AFF',
          icon: a.icon || 'Building2'
        }));
        if (typeof setAccounts === 'function') {
          setAccounts(remoteAccounts);
        }
      }

      // 2. Transacciones: asignación exclusiva del usuario
      if (txsRes.status === 'fulfilled' && !txsRes.value.error && Array.isArray(txsRes.value.data)) {
        const remoteTxs = txsRes.value.data.map(t => ({
          ...t,
          id: t.id,
          accountId: t.account_id || t.accountId,
          categoryId: t.category_id || t.categoryId,
          subcategoryId: t.subcategory_id || t.subcategoryId,
          amount: Number(t.amount || 0),
          originalAmount: Number(t.original_amount ?? t.originalAmount ?? t.amount ?? 0),
          exchangeRate: Number(t.exchange_rate ?? t.exchangeRate ?? 1)
        }));
        if (typeof setTransactions === 'function') {
          setTransactions(remoteTxs);
        }
      }

      // 3. Deudas y préstamos
      if (debtsRes.status === 'fulfilled' && !debtsRes.value.error && Array.isArray(debtsRes.value.data)) {
        if (typeof setDebtsAndLoans === 'function') {
          setDebtsAndLoans(debtsRes.value.data);
        }
      }

      // 4. Inversiones
      if (investmentsRes.status === 'fulfilled' && !investmentsRes.value.error && Array.isArray(investmentsRes.value.data)) {
        if (typeof setInvestments === 'function') {
          setInvestments(investmentsRes.value.data);
        }
      }

      // 5. Pagos recurrentes
      if (recurringRes.status === 'fulfilled' && !recurringRes.value.error && Array.isArray(recurringRes.value.data)) {
        if (typeof setRecurringPayments === 'function') {
          setRecurringPayments(recurringRes.value.data);
        }
      }

      // 6. Presupuestos
      if (budgetsRes.status === 'fulfilled' && !budgetsRes.value.error && Array.isArray(budgetsRes.value.data)) {
        const remoteBudgetList = budgetsRes.value.data;
        const globalRow = remoteBudgetList.find(b => b.is_global || b.isGlobal);
        const categoriesMap = {};
        remoteBudgetList.forEach(b => {
          if (!b.is_global && !b.isGlobal && b.category_id) {
            categoriesMap[b.category_id] = Number(b.amount || 0);
          }
        });
        if (typeof setBudgets === 'function') {
          setBudgets({
            global: globalRow ? Number(globalRow.amount || 0) : 0,
            categories: categoriesMap
          });
        }
      }

      // 7. Categorías
      if (categoriesRes.status === 'fulfilled' && !categoriesRes.value.error && Array.isArray(categoriesRes.value.data) && categoriesRes.value.data.length > 0) {
        if (typeof setCategories === 'function') {
          setCategories(categoriesRes.value.data);
        }
      }

      // 8. Metas de ahorro
      if (goalsRes.status === 'fulfilled' && !goalsRes.value.error && Array.isArray(goalsRes.value.data)) {
        if (typeof setSavingsGoals === 'function') {
          setSavingsGoals(goalsRes.value.data);
        }
      }

      // 9. Perfil de Usuario: declarar y manejar cloudProfile de forma completamente segura a partir de la respuesta de Supabase
      const cloudProfile = profileRes?.data || (profileRes?.status === 'fulfilled' && !profileRes?.value?.error ? profileRes?.value?.data : null) || data?.profile || null;

      if (cloudProfile && typeof setUserProfile === 'function') {
        const displayName = cloudProfile.display_name || cloudProfile.name;
        const photoUrl = cloudProfile.photo_url || cloudProfile.photo;
        setUserProfile(prev => {
          const currentName = displayName || prev?.name || 'Usuario';
          const initials = currentName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(w => w[0].toUpperCase())
            .join('') || 'US';
          return {
            ...prev,
            name: currentName,
            photo: photoUrl || prev?.photo || null,
            initials: prev?.initials || initials
          };
        });
      }

      setSyncStatus('synced');
      setLastSyncTime(new Date());
      return { success: true, profile: cloudProfile };
    } catch (err) {
      console.warn('[useDataSync] Error en pull de Supabase:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Error descargando datos');
      return { success: false, error: err };
    }
  }, [
    syncUser,
    setAccounts,
    setTransactions,
    setDebtsAndLoans,
    setInvestments,
    setRecurringPayments,
    setBudgets,
    setCategories,
    setSavingsGoals,
    setUserProfile
  ]);

  // ==========================================================================
  // 2. SUBIDA LOCAL A LA NUBE (PUSH LOCAL TO CLOUD)
  // ==========================================================================
  const pushLocalToCloud = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, reason: 'not_configured' };
    }

    if (!syncUser || !syncUser.id) {
      return { success: false, reason: 'unauthenticated' };
    }

    const userId = syncUser.id;
    setSyncStatus('syncing');
    setSyncError(null);

    const {
      accounts: localAccounts,
      transactions: localTxs,
      debtsAndLoans: localDebts,
      investments: localInvs,
      recurringPayments: localRecurring,
      budgets: localBudgets,
      categories: localCategories,
      savingsGoals: localGoals
    } = latestDataRef.current;

    try {
      const nowIso = new Date().toISOString();

      // Formatear accounts con UUID y user_id
      const accountsPayload = (localAccounts || []).map(a => ({
        id: ensureUUID(a.id),
        user_id: userId,
        name: a.name || 'Cuenta',
        type: a.type || 'bank',
        balance: Number(a.balance || 0),
        currency: a.currency || 'COP',
        color: a.color || '#007AFF',
        icon: a.icon || 'Building2',
        updated_at: nowIso
      }));

      // Formatear transactions con UUID y user_id
      const txsPayload = (localTxs || []).map(t => ({
        id: ensureUUID(t.id),
        user_id: userId,
        account_id: t.accountId ? ensureUUID(t.accountId) : null,
        category_id: t.categoryId || null,
        subcategory_id: t.subcategoryId || null,
        description: t.description || 'Movimiento',
        amount: Number(t.amount || 0),
        type: t.type || 'expense',
        date: t.date || nowIso.split('T')[0],
        notes: t.notes || '',
        updated_at: nowIso
      }));

      // Formatear debts
      const debtsPayload = (localDebts || []).map(d => ({
        id: ensureUUID(d.id),
        user_id: userId,
        name: d.name || d.borrower || 'Deuda',
        type: d.type || 'payable',
        total_amount: Number(d.totalAmount || d.amount || 0),
        remaining_amount: Number(d.remainingAmount ?? d.totalAmount ?? 0),
        currency: d.currency || 'COP',
        due_date: d.dueDate || null,
        updated_at: nowIso
      }));

      // Formatear investments
      const invsPayload = (localInvs || []).map(i => ({
        id: ensureUUID(i.id),
        user_id: userId,
        name: i.name || 'Inversión',
        category: i.category || 'fixed',
        sub_type: i.subType || null,
        invested_amount: Number(i.investedAmount || 0),
        current_amount: Number(i.currentAmount || 0),
        currency: i.currency || 'COP',
        updated_at: nowIso
      }));

      // Formatear recurring
      const recurringPayload = (localRecurring || []).map(r => ({
        id: ensureUUID(r.id),
        user_id: userId,
        name: r.name || 'Pago recurrente',
        amount: Number(r.amount || 0),
        currency: r.currency || 'COP',
        frequency: r.frequency || 'monthly',
        is_active: r.isActive !== false,
        updated_at: nowIso
      }));

      // Formatear categories
      const categoriesPayload = (localCategories || []).map(c => ({
        id: ensureUUID(c.id),
        user_id: userId,
        name: c.name || 'Categoría',
        color: c.color || '#007AFF',
        icon: c.icon || 'Tag',
        type: c.type || 'expense',
        updated_at: nowIso
      }));

      // Formatear savings_goals
      const goalsPayload = (localGoals || []).map(g => ({
        id: ensureUUID(g.id),
        user_id: userId,
        name: g.name || 'Meta de ahorro',
        target_amount: Number(g.targetAmount || g.target || 0),
        current_amount: Number(g.currentAmount || g.saved || 0),
        currency: g.currency || 'COP',
        deadline: g.deadline || g.dueDate || null,
        updated_at: nowIso
      }));

      // Upserts en paralelo
      const tasks = [];
      if (accountsPayload.length > 0) tasks.push(supabase.from('accounts').upsert(accountsPayload, { onConflict: 'id' }));
      if (txsPayload.length > 0) tasks.push(supabase.from('transactions').upsert(txsPayload, { onConflict: 'id' }));
      if (debtsPayload.length > 0) tasks.push(supabase.from('debts').upsert(debtsPayload, { onConflict: 'id' }));
      if (invsPayload.length > 0) tasks.push(supabase.from('investments').upsert(invsPayload, { onConflict: 'id' }));
      if (recurringPayload.length > 0) tasks.push(supabase.from('recurring_payments').upsert(recurringPayload, { onConflict: 'id' }));
      if (categoriesPayload.length > 0) tasks.push(supabase.from('categories').upsert(categoriesPayload, { onConflict: 'id' }));
      if (goalsPayload.length > 0) tasks.push(supabase.from('savings_goals').upsert(goalsPayload, { onConflict: 'id' }));

      // Presupuesto global
      if (localBudgets?.global > 0) {
        tasks.push(
          supabase.from('budgets').upsert([{
            id: ensureUUID(`budget-global-${userId}`),
            user_id: userId,
            is_global: true,
            amount: Number(localBudgets.global),
            updated_at: nowIso
          }], { onConflict: 'id' })
        );
      }

      // Perfil de usuario (profiles)
      const currentProfile = latestDataRef.current.userProfile;
      if (currentProfile && (currentProfile.name || currentProfile.photo)) {
        tasks.push(
          supabase.from('profiles').upsert([{
            id: userId,
            display_name: currentProfile.name || 'Usuario',
            photo_url: currentProfile.photo || null,
            updated_at: nowIso
          }], { onConflict: 'id' })
        );
      }

      await Promise.allSettled(tasks);

      setSyncStatus('synced');
      setLastSyncTime(new Date());
      return { success: true };
    } catch (err) {
      console.warn('[useDataSync] Error en push a Supabase:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Error subiendo datos');
      return { success: false, error: err };
    }
  }, [syncUser]);

  // ==========================================================================
  // 3. AUTH LISTENER Y SINCRONIZACIÓN AL INICIAR SESIÓN
  // ==========================================================================
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSyncStatus('offline');
      return;
    }

    // Consulta inicial del usuario
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (!error && user) {
        setSyncUser(user);
        pullCloudToLocal(user);
      } else {
        setSyncUser(null);
        setSyncStatus('idle');
      }
    }).catch(() => {
      setSyncStatus('idle');
    });

    // Suscripción a eventos de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const authUser = session?.user || null;
      setSyncUser(authUser);

      if (event === 'SIGNED_IN' && authUser) {
        pullCloudToLocal(authUser);
      } else if (event === 'SIGNED_OUT') {
        setSyncUser(null);
        setSyncStatus('idle');
        // Limpia el estado en memoria para aislar datos entre usuarios
        if (typeof setAccounts === 'function') setAccounts([]);
        if (typeof setTransactions === 'function') setTransactions([]);
        if (typeof setDebtsAndLoans === 'function') setDebtsAndLoans([]);
        if (typeof setInvestments === 'function') setInvestments([]);
        if (typeof setRecurringPayments === 'function') setRecurringPayments([]);
        if (typeof setSavingsGoals === 'function') setSavingsGoals([]);
        if (typeof setBudgets === 'function') setBudgets({ global: 0, categories: {} });
        if (typeof setUserProfile === 'function') {
          setUserProfile({ name: 'Usuario', photo: null, initials: 'US' });
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [
    pullCloudToLocal,
    setAccounts,
    setTransactions,
    setDebtsAndLoans,
    setInvestments,
    setRecurringPayments,
    setSavingsGoals,
    setBudgets,
    setUserProfile
  ]);

  // ==========================================================================
  // 4. SUPABASE REALTIME EN 'transactions' Y 'accounts'
  // ==========================================================================
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !syncUser) {
      return;
    }

    const userId = syncUser.id;
    const channelName = `realtime-finance-${userId.slice(0, 8)}`;

    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (!payload) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const raw = payload.new;
            if (!raw) return;
            const normalized = {
              ...raw,
              id: raw.id,
              accountId: raw.account_id || raw.accountId,
              categoryId: raw.category_id || raw.categoryId,
              subcategoryId: raw.subcategory_id || raw.subcategoryId,
              amount: Number(raw.amount || 0)
            };
            if (typeof setTransactions === 'function') {
              setTransactions(prev => {
                const idx = prev.findIndex(t => t.id === normalized.id);
                if (idx !== -1) {
                  const updated = [...prev];
                  updated[idx] = { ...updated[idx], ...normalized };
                  return updated;
                }
                return [normalized, ...prev];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId && typeof setTransactions === 'function') {
              setTransactions(prev => prev.filter(t => t.id !== deletedId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (!payload) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const raw = payload.new;
            if (!raw) return;
            const normalized = {
              ...raw,
              id: raw.id,
              name: raw.name || 'Cuenta',
              type: raw.type || 'bank',
              balance: Number(raw.balance ?? raw.initial_balance ?? 0)
            };
            if (typeof setAccounts === 'function') {
              setAccounts(prev => {
                const idx = prev.findIndex(a => a.id === normalized.id);
                if (idx !== -1) {
                  const updated = [...prev];
                  updated[idx] = { ...updated[idx], ...normalized };
                  return updated;
                }
                return [...prev, normalized];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId && typeof setAccounts === 'function') {
              setAccounts(prev => prev.filter(a => a.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncUser, setTransactions, setAccounts]);

  const signOutCloud = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[useDataSync] Error al cerrar sesión en Supabase:', err);
    }
  }, []);

  return {
    syncStatus,
    syncUser,
    isCloudEnabled: Boolean(isSupabaseConfigured && syncUser),
    isConfigured: isSupabaseConfigured,
    lastSyncTime,
    syncError,
    pushLocalToCloud,
    pullCloudToLocal,
    signOutCloud
  };
}

export default useDataSync;
