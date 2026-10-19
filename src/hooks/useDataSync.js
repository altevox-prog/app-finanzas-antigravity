import { useState, useEffect, useCallback, useRef } from 'react';
import { syncApiService, isSupabaseConfigured } from '../services/sync/syncApiService';
import {
  normalizeRemoteProfile,
  normalizeRemoteAccount,
  normalizeRemoteTransaction,
  normalizeRemoteDebt,
  normalizeRemoteInvestment,
  normalizeRemoteRecurring,
  resolveRemoteBudgets
} from '../services/sync/syncNormalizers';
import {
  buildAccountsPayload,
  sanitizeAccountsOnSchemaError,
  buildTransactionsPayload,
  sanitizeTransactionsOnSchemaError,
  buildStrictlyRequiredTransactions,
  buildDebtsPayload,
  sanitizeDebtsOnSchemaError,
  buildStrictlyEssentialDebts,
  buildInvestmentsPayload,
  sanitizeInvestmentsOnSchemaError,
  buildStrictlyEssentialInvs,
  buildRecurringPayload,
  sanitizeRecurringOnSchemaError,
  buildStrictlyEssentialRec,
  buildBudgetsPayload,
  buildEssentialBudgets
} from '../services/sync/syncPayloads';

/**
 * useDataSync
 * Hook de sincronización en segundo plano (Local-First Cloud Sync).
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

  // Bandera de control para evitar bucles infinitos y ejecuciones concurrentes en cascada
  const isSyncingRef = useRef(false);
  const pendingPushRef = useRef(false);
  const hasInitialPullCompletedRef = useRef(false);

  // Referencias mutables para acceder siempre a los datos más recientes
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
  // FUNCIÓN DE DESCARGA DE DATOS DE SUPABASE (PULL CLOUD TO LOCAL)
  // ==========================================================================
  const pullCloudToLocal = useCallback(async (userOverride = null, profileRes = null) => {
    // Declaración defensiva obligatoria de cloudProfile de raíz
    let cloudProfile = null;
    try {
      cloudProfile = profileRes?.data || null;
    } catch {
      cloudProfile = null;
    }

    // Prevención de bucles infinitos y descargas simultáneas en cascada
    if (isSyncingRef.current) {
      console.log('[useDataSync] Ya hay una sincronización en curso, omitiendo llamada redundante.');
      return { 
        success: false, 
        reason: 'already_syncing', 
        profile: cloudProfile,
        hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true
      };
    }

    if (!isSupabaseConfigured || !syncApiService.isConfigured()) {
      setSyncStatus('offline');
      return { 
        success: false, 
        reason: 'not_configured', 
        profile: cloudProfile,
        hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true
      };
    }

    const targetUser = userOverride || syncUser;
    if (!targetUser || !targetUser.id) {
      setSyncStatus('idle');
      return { 
        success: false, 
        reason: 'unauthenticated', 
        profile: cloudProfile,
        hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true
      };
    }

    const userId = targetUser.id;
    isSyncingRef.current = true;
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      // Bloque try/catch independiente para profiles (evita detener la descarga de transacciones/cuentas si falla)
      const remoteProfile = await syncApiService.fetchRemoteProfile(userId);
      if (remoteProfile) {
        cloudProfile = remoteProfile;
      }

      // Descargar las tablas principales en paralelo usando Promise.allSettled
      const [
        accountsRes,
        txsRes,
        debtsRes,
        investmentsRes,
        recurringRes,
        budgetsRes,
        categoriesRes,
        goalsRes
      ] = await syncApiService.fetchRemoteData(userId);

      const safeCloudProfile = cloudProfile || null;
      const hasCompletedOnboarding = safeCloudProfile?.onboarding_completed === true || safeCloudProfile?.has_completed_onboarding === true;

      if (hasCompletedOnboarding) {
        try {
          localStorage.setItem(`has_completed_onboarding_${userId}`, 'true');
          localStorage.setItem('has_completed_onboarding', 'true');
          localStorage.setItem('hasCompletedOnboarding', 'true');
          localStorage.setItem('app_onboarding_completed', 'true');
        } catch {}
      }

      if (safeCloudProfile && typeof setUserProfile === 'function') {
        setUserProfile(prev => normalizeRemoteProfile(safeCloudProfile, prev));
      }

      // Cuentas (useAccounts.js es el dueño legítimo de las cuentas y su Realtime)
      if (accountsRes.status === 'fulfilled' && !accountsRes.value.error && Array.isArray(accountsRes.value.data)) {
        // Filtrar estrictamente las filas pertenecientes al usuario activo
        const userRemoteAccounts = accountsRes.value.data.filter(
          (r) => !r.user_id || r.user_id === userId
        );

        if (userRemoteAccounts.length > 0) {
          if (typeof setAccounts === 'function') {
            setAccounts((prevAccounts) => {
              // Si useAccounts ya mantiene el estado hidratado, NO sobreescribir ni degradar
              if (Array.isArray(prevAccounts) && prevAccounts.length > 0) {
                return prevAccounts;
              }
              return userRemoteAccounts.map(normalizeRemoteAccount);
            });
          }
          try {
            localStorage.setItem(`has_completed_onboarding_${userId}`, 'true');
            localStorage.setItem('has_completed_onboarding', 'true');
            localStorage.setItem('hasCompletedOnboarding', 'true');
            localStorage.setItem('app_onboarding_completed', 'true');
          } catch {}
        } else if ((latestDataRef.current.accounts || []).length > 0) {
          // Si la nube está vacía pero localmente hay cuentas (ej. Onboarding), sincronizar hacia la nube
          setTimeout(() => {
            pushLocalToCloud();
          }, 800);
        }
      }

      // Transacciones
      if (txsRes.status === 'fulfilled' && !txsRes.value.error && Array.isArray(txsRes.value.data)) {
        if (txsRes.value.data.length > 0) {
          if (typeof setTransactions === 'function') {
            setTransactions(txsRes.value.data.map(normalizeRemoteTransaction));
          }
        }
      }

      // Deudas
      if (debtsRes.status === 'fulfilled' && !debtsRes.value.error && Array.isArray(debtsRes.value.data)) {
        if (debtsRes.value.data.length > 0) {
          if (typeof setDebtsAndLoans === 'function') {
            setDebtsAndLoans(debtsRes.value.data.map(normalizeRemoteDebt));
          }
        }
      }

      // Inversiones
      if (investmentsRes.status === 'fulfilled' && !investmentsRes.value.error && Array.isArray(investmentsRes.value.data)) {
        if (investmentsRes.value.data.length > 0) {
          if (typeof setInvestments === 'function') {
            setInvestments(investmentsRes.value.data.map(normalizeRemoteInvestment));
          }
        }
      }

      // Pagos recurrentes
      if (recurringRes.status === 'fulfilled' && !recurringRes.value.error && Array.isArray(recurringRes.value.data)) {
        if (recurringRes.value.data.length > 0) {
          const normalizedRecurring = recurringRes.value.data.map(normalizeRemoteRecurring);
          if (typeof setRecurringPayments === 'function') {
            setRecurringPayments(normalizedRecurring);
          }
          try {
            const serialized = JSON.stringify(normalizedRecurring);
            localStorage.setItem('recurring_payments', serialized);
            localStorage.setItem('app_recurring', serialized);
            localStorage.setItem('presu_subscriptions_v1', serialized);
            localStorage.setItem('subscriptions', serialized);
          } catch (e) {
            console.error('[useDataSync] Error guardando pagos recurrentes normalizados en localStorage:', e);
          }
        }
      }

      // Presupuestos
      const userSettingsData = await syncApiService.fetchUserSettings(userId);
      const resolvedBudgets = resolveRemoteBudgets(budgetsRes, userSettingsData);

      if (typeof setBudgets === 'function' && resolvedBudgets) {
        setBudgets(resolvedBudgets);
        try {
          localStorage.setItem('presu_budgets_v1', JSON.stringify(resolvedBudgets));
          localStorage.setItem('budgets', JSON.stringify(resolvedBudgets));
          localStorage.setItem('global_budget_limit', String(resolvedBudgets.global));
          const existingLocalSettings = localStorage.getItem('user_settings');
          if (!existingLocalSettings) {
            localStorage.setItem('user_settings', JSON.stringify({
              user_id: userId,
              global_budget_limit: resolvedBudgets.global,
              updated_at: new Date().toISOString()
            }));
          }
        } catch {}
      }

      // Categorías
      if (categoriesRes.status === 'fulfilled' && !categoriesRes.value.error && Array.isArray(categoriesRes.value.data) && categoriesRes.value.data.length > 0) {
        if (typeof setCategories === 'function') {
          setCategories(categoriesRes.value.data);
        }
      }

      // Metas de ahorro
      if (goalsRes.status === 'fulfilled' && !goalsRes.value.error && Array.isArray(goalsRes.value.data)) {
        if (typeof setSavingsGoals === 'function') {
          setSavingsGoals(goalsRes.value.data);
        }
      }

      setSyncStatus('synced');
      hasInitialPullCompletedRef.current = true;
      setLastSyncTime(new Date());
      return { 
        success: true, 
        profile: safeCloudProfile,
        hasCompletedOnboarding
      };
    } catch (err) {
      console.warn('[useDataSync] Error en pull de Supabase:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Error descargando datos');
      return { 
        success: false, 
        error: err, 
        profile: cloudProfile,
        hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true
      };
    } finally {
      isSyncingRef.current = false;
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
  // SUBIDA LOCAL A LA NUBE (PUSH LOCAL TO CLOUD)
  // ==========================================================================
  const pushLocalToCloud = useCallback(async () => {
    if (isSyncingRef.current) {
      pendingPushRef.current = true;
      return { success: false, reason: 'queued_pending' };
    }
    if (!isSupabaseConfigured || !syncApiService.isConfigured() || !syncUser?.id) {
      return { success: false, reason: 'unauthenticated' };
    }

    const userId = syncUser.id;
    isSyncingRef.current = true;
    pendingPushRef.current = false;
    setSyncStatus('syncing');

    try {
      const nowIso = new Date().toISOString();
      const current = latestDataRef.current;

      // 1. SINCRONIZAR CUENTAS PRIMERO (Para satisfacer Foreign Keys en Supabase)
      const accountsPayload = buildAccountsPayload(current.accounts, userId, nowIso);
      if (accountsPayload.length > 0) {
        await syncApiService.upsertWithFallback('accounts', accountsPayload, {
          onConflict: 'id',
          fallbackConflict: 'id,user_id',
          sanitize: sanitizeAccountsOnSchemaError
        });
      }

      // 2. PREPARAR Y VALIDAR TRANSACCIONES CON CLAVE FORÁNEA EXISTENTE
      const validAccountIds = new Set(accountsPayload.map(a => a.id));
      const defaultAccountId = accountsPayload[0]?.id || null;
      const categoryMap = new Map((current.categories || []).map(c => [c.id, c.name]));

      const txsPayload = buildTransactionsPayload(current.transactions, validAccountIds, defaultAccountId, categoryMap, nowIso, userId);
      if (txsPayload.length > 0) {
        await syncApiService.upsertWithFallback('transactions', txsPayload, {
          onConflict: 'id',
          fallbackConflict: 'id,user_id',
          sanitize: sanitizeTransactionsOnSchemaError,
          strictFallback: buildStrictlyRequiredTransactions
        });
      }

      // 3. SINCRONIZAR DEUDAS Y PRÉSTAMOS
      const debtsPayload = buildDebtsPayload(current.debtsAndLoans, userId, nowIso);
      if (debtsPayload.length > 0) {
        await syncApiService.upsertWithFallback('debts', debtsPayload, {
          onConflict: 'id',
          fallbackConflict: 'id,user_id',
          sanitize: sanitizeDebtsOnSchemaError,
          strictFallback: buildStrictlyEssentialDebts
        });
      }

      // 4. SINCRONIZAR INVERSIONES
      const invsPayload = buildInvestmentsPayload(current.investments, userId, nowIso);
      if (invsPayload.length > 0) {
        await syncApiService.upsertWithFallback('investments', invsPayload, {
          onConflict: 'id',
          fallbackConflict: 'id,user_id',
          sanitize: sanitizeInvestmentsOnSchemaError,
          strictFallback: buildStrictlyEssentialInvs
        });
      }

      // 5. SINCRONIZAR PAGOS RECURRENTES
      // Validar claves foráneas contra cuentas existentes para evitar errores 409 / 23503
      const existingAccountIds = new Set((accountsPayload || []).map(a => a.id));
      const recurringPayload = buildRecurringPayload(current.recurringPayments, userId, nowIso, existingAccountIds);
      if (recurringPayload.length > 0) {
        await syncApiService.upsertWithFallback('recurring_payments', recurringPayload, {
          onConflict: 'id',
          fallbackConflict: 'id,user_id',
          sanitize: sanitizeRecurringOnSchemaError,
          strictFallback: buildStrictlyEssentialRec
        });
      }

      // 6. SINCRONIZAR PERFIL DE USUARIO
      if (current.userProfile && (current.userProfile.name || current.userProfile.photo)) {
        await syncApiService.syncUserProfile(userId, current.userProfile, syncUser.email, nowIso);
      }

      // 7. SINCRONIZAR PRESUPUESTOS (Global y Categorías)
      if (current.budgets) {
        try {
          const globalLimit = Number(current.budgets.global || 0);
          const savedGlobalId = localStorage.getItem('global_budget_id');
          const budgetsPayload = buildBudgetsPayload(current.budgets, userId, savedGlobalId, nowIso);

          if (budgetsPayload[0]?.id) {
            try {
              localStorage.setItem('global_budget_id', String(budgetsPayload[0].id));
            } catch {}
          }

          const safeBudgets = buildEssentialBudgets(budgetsPayload);
          const bRes = await syncApiService.syncBudgets(budgetsPayload, safeBudgets);

          if (!bRes.error) {
            try {
              localStorage.setItem('global_budget_limit', String(globalLimit));
            } catch {}
          }

          // Respaldo en user_settings con upsert basado en user_id
          await syncApiService.syncUserSettings(userId, globalLimit, nowIso);

          try {
            localStorage.setItem('user_settings', JSON.stringify({
              user_id: userId,
              global_budget_limit: globalLimit,
              updated_at: nowIso
            }));
          } catch {}
        } catch (bErr) {
          console.warn('[useDataSync] Sincronización de budgets omitida de forma segura:', bErr);
        }
      }

      setSyncStatus('synced');
      setLastSyncTime(new Date());
      return { success: true };
    } catch (err) {
      console.error('[useDataSync] Error general en pushLocalToCloud:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        stack: err?.stack
      });
      setSyncStatus('error');
      return { success: false, error: err };
    } finally {
      isSyncingRef.current = false;
      if (pendingPushRef.current) {
        pendingPushRef.current = false;
        pushLocalToCloud();
      }
    }
  }, [syncUser]);

  // Sincronización automática con debounce al modificar datos teniendo sesión activa
  const autoSyncTimerRef = useRef(null);
  useEffect(() => {
    if (!syncApiService.isConfigured() || !syncUser?.id || syncUser.id === 'local-user') {
      return;
    }
    if (!hasInitialPullCompletedRef.current) return;

    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
    }

    autoSyncTimerRef.current = setTimeout(() => {
      pushLocalToCloud();
    }, 1500);

    return () => {
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current);
      }
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
    syncUser?.id,
    pushLocalToCloud
  ]);

  // Detector de conectividad nativo (online / offline)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.log('[useDataSync] Red recuperada (online). Sincronizando datos pendientes...');
      if (syncUser?.id && syncUser.id !== 'local-user') {
        pushLocalToCloud();
      } else {
        setSyncStatus('idle');
      }
    };

    const handleOffline = () => {
      console.warn('[useDataSync] Conexión perdida (offline). Operando en modo local.');
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncUser, pushLocalToCloud]);

  // Mantener referencia actualizada de pullCloudToLocal para el listener de autenticación
  const pullCloudToLocalRef = useRef(pullCloudToLocal);
  pullCloudToLocalRef.current = pullCloudToLocal;

  // Auth listener: Se registra una sola vez en montaje para evitar bucles infinitos de reintentos
  useEffect(() => {
    if (!syncApiService.isConfigured()) return;

    let isSubscribed = true;

    syncApiService.getCurrentUser().then(({ user, error }) => {
      if (!isSubscribed) return;
      if (!error && user) {
        setSyncUser(user);
        if (pullCloudToLocalRef.current && !isSyncingRef.current) {
          pullCloudToLocalRef.current(user);
        }
      }
    }).catch((err) => {
      console.warn('[useDataSync] Error en getUser:', err);
    });

    const { data: { subscription } } = syncApiService.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;
      const authUser = session?.user || null;
      setSyncUser(authUser);
      if (event === 'SIGNED_IN' && authUser) {
        if (pullCloudToLocalRef.current && !isSyncingRef.current) {
          pullCloudToLocalRef.current(authUser);
        }
      } else if (event === 'SIGNED_OUT') {
        setSyncUser(null);
        setSyncStatus('idle');
      }
    });

    return () => {
      isSubscribed = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signOutCloud = useCallback(async () => {
    if (syncApiService.isConfigured()) {
      try {
        await syncApiService.signOutCloud();
      } catch {}
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
