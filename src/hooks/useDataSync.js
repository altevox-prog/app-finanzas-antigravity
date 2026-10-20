import { useState, useEffect, useCallback, useRef } from 'react';
import { syncApiService, isSupabaseConfigured } from '../services/sync/syncApiService';
import {
  normalizeRemoteProfile, normalizeRemoteAccount, normalizeRemoteTransaction, normalizeRemoteDebt,
  normalizeRemoteInvestment, normalizeRemoteRecurring, resolveRemoteBudgets, normalizeRemoteCategory, normalizeRemoteGoal
} from '../services/sync/syncNormalizers';
import {
  buildAccountsPayload, sanitizeAccountsOnSchemaError, buildTransactionsPayload, sanitizeTransactionsOnSchemaError,
  buildStrictlyRequiredTransactions, buildDebtsPayload, sanitizeDebtsOnSchemaError, buildStrictlyEssentialDebts,
  buildInvestmentsPayload, sanitizeInvestmentsOnSchemaError, buildStrictlyEssentialInvs, buildRecurringPayload,
  sanitizeRecurringOnSchemaError, buildStrictlyEssentialRec, buildBudgetsPayload, buildEssentialBudgets
} from '../services/sync/syncPayloads';

const markOnboardingDone = (uid) => ['has_completed_onboarding_' + uid, 'has_completed_onboarding', 'hasCompletedOnboarding', 'app_onboarding_completed'].forEach((k) => { try { localStorage.setItem(k, 'true'); } catch {} });
const getResData = (r) => (r.status === 'fulfilled' && !r.value?.error && Array.isArray(r.value?.data)) ? r.value.data : null;

export function useDataSync({
  accounts = [], setAccounts, transactions = [], setTransactions, debtsAndLoans = [], setDebtsAndLoans,
  investments = [], setInvestments, recurringPayments = [], setRecurringPayments,
  budgets = { global: 0, categories: {} }, setBudgets, categories = [], setCategories,
  savingsGoals = [], setSavingsGoals, userProfile = {}, setUserProfile
} = {}) {
  const [syncUser, setSyncUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState(() => isSupabaseConfigured ? 'idle' : 'offline');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);

  const isSyncingRef = useRef(false);
  const pendingPushRef = useRef(false);
  const hasInitialPullCompletedRef = useRef(false);
  const latestDataRef = useRef({ accounts, transactions, debtsAndLoans, investments, recurringPayments, budgets, categories, savingsGoals, userProfile });

  useEffect(() => {
    latestDataRef.current = { accounts, transactions, debtsAndLoans, investments, recurringPayments, budgets, categories, savingsGoals, userProfile };
  }, [accounts, transactions, debtsAndLoans, investments, recurringPayments, budgets, categories, savingsGoals, userProfile]);

  const pullCloudToLocal = useCallback(async (userOverride = null, profileRes = null) => {
    let cloudProfile = profileRes?.data || null;
    if (isSyncingRef.current) return { success: false, reason: 'already_syncing', profile: cloudProfile, hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true };
    if (!isSupabaseConfigured || !syncApiService.isConfigured()) {
      setSyncStatus('offline');
      return { success: false, reason: 'not_configured', profile: cloudProfile, hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true };
    }

    const targetUser = userOverride || syncUser;
    if (!targetUser?.id) { setSyncStatus('idle'); return { success: false, reason: 'unauthenticated', profile: cloudProfile, hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true }; }

    const userId = targetUser.id;
    isSyncingRef.current = true;
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      const remoteProfile = await syncApiService.fetchRemoteProfile(userId);
      if (remoteProfile) cloudProfile = remoteProfile;
      const [accRes, txsRes, debtsRes, invsRes, recRes, budRes, catsRes, goalsRes] = await syncApiService.fetchRemoteData(userId);

      const safeProfile = cloudProfile || null;
      const hasCompletedOnboarding = safeProfile?.onboarding_completed === true || safeProfile?.has_completed_onboarding === true;
      if (hasCompletedOnboarding) markOnboardingDone(userId);
      if (safeProfile && typeof setUserProfile === 'function') setUserProfile((prev) => normalizeRemoteProfile(safeProfile, prev));

      const accData = getResData(accRes);
      if (accData) {
        const userAccs = accData.filter((r) => !r.user_id || r.user_id === userId);
        if (userAccs.length > 0) {
          setAccounts?.((prev) => (Array.isArray(prev) && prev.length > 0) ? prev : userAccs.map(normalizeRemoteAccount));
          markOnboardingDone(userId);
        } else if ((latestDataRef.current.accounts || []).length > 0) setTimeout(() => pushLocalToCloud(), 800);
      }

      const txData = getResData(txsRes);
      if (txData?.length > 0) setTransactions?.(txData.map(normalizeRemoteTransaction));

      const debtsData = getResData(debtsRes);
      if (debtsData?.length > 0) setDebtsAndLoans?.(debtsData.map(normalizeRemoteDebt));

      const invData = getResData(invsRes);
      if (invData?.length > 0) setInvestments?.(invData.map(normalizeRemoteInvestment));

      const recData = getResData(recRes);
      if (recData?.length > 0) {
        const normRec = recData.map(normalizeRemoteRecurring);
        setRecurringPayments?.(normRec);
        try { ['recurring_payments', 'app_recurring', 'presu_subscriptions_v1', 'subscriptions'].forEach((k) => localStorage.setItem(k, JSON.stringify(normRec))); } catch {}
      }

      const userSettingsData = await syncApiService.fetchUserSettings(userId);
      const resolvedBudgets = resolveRemoteBudgets(budRes, userSettingsData);
      if (typeof setBudgets === 'function' && resolvedBudgets) {
        setBudgets(resolvedBudgets);
        try {
          ['presu_budgets_v1', 'budgets'].forEach((k) => localStorage.setItem(k, JSON.stringify(resolvedBudgets)));
          localStorage.setItem('global_budget_limit', String(resolvedBudgets.global));
          if (!localStorage.getItem('user_settings')) localStorage.setItem('user_settings', JSON.stringify({ user_id: userId, global_budget_limit: resolvedBudgets.global, updated_at: new Date().toISOString() }));
        } catch {}
      }

      const catData = getResData(catsRes);
      if (catData?.length > 0 && typeof setCategories === 'function') {
        setCategories(catData.map((cat) => normalizeRemoteCategory(cat, latestDataRef.current?.categories || [])));
      }

      const goalsData = getResData(goalsRes);
      if (goalsData) {
        if (goalsData.length > 0 && typeof setSavingsGoals === 'function') {
          setSavingsGoals((prevLocal) => {
            const localList = Array.isArray(prevLocal) && prevLocal.length > 0 ? prevLocal : (latestDataRef.current?.savingsGoals || []);
            const localMap = new Map((localList || []).map((g) => [String(g.id), g]));
            return goalsData.map((rg) => {
              const l = localMap.get(String(rg.id)) || {};
              return normalizeRemoteGoal({ ...l, ...rg, target_amount: Number(rg.target_amount ?? l.target_amount ?? l.targetAmount ?? 0), current_amount: Number(rg.current_amount ?? l.current_amount ?? l.currentAmount ?? 0) });
            }).filter(Boolean);
          });
        } else if ((latestDataRef.current.savingsGoals || []).length > 0) setTimeout(() => pushLocalToCloud(), 800);
      }

      setSyncStatus('synced');
      hasInitialPullCompletedRef.current = true;
      setLastSyncTime(new Date());
      return { success: true, profile: safeProfile, hasCompletedOnboarding };
    } catch (err) {
      console.warn('[useDataSync] Error en pull Supabase:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Error descargando datos');
      return { success: false, error: err, profile: cloudProfile, hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true };
    } finally {
      isSyncingRef.current = false;
    }
  }, [syncUser, setAccounts, setTransactions, setDebtsAndLoans, setInvestments, setRecurringPayments, setBudgets, setCategories, setSavingsGoals, setUserProfile]);

  const pushLocalToCloud = useCallback(async () => {
    if (isSyncingRef.current) { pendingPushRef.current = true; return { success: false, reason: 'queued_pending' }; }
    if (!isSupabaseConfigured || !syncApiService.isConfigured() || !syncUser?.id) return { success: false, reason: 'unauthenticated' };

    const userId = syncUser.id;
    isSyncingRef.current = true;
    pendingPushRef.current = false;
    setSyncStatus('syncing');

    try {
      const nowIso = new Date().toISOString(), current = latestDataRef.current;

      const accountsPayload = buildAccountsPayload(current.accounts, userId, nowIso);
      if (accountsPayload.length > 0) await syncApiService.upsertWithFallback('accounts', accountsPayload, { onConflict: 'id', fallbackConflict: 'id,user_id', sanitize: sanitizeAccountsOnSchemaError });

      const validAccountIds = new Set(accountsPayload.map((a) => a.id));
      const txsPayload = buildTransactionsPayload(current.transactions, validAccountIds, accountsPayload[0]?.id || null, new Map((current.categories || []).map((c) => [c.id, c.name])), nowIso, userId);
      if (txsPayload.length > 0) await syncApiService.upsertWithFallback('transactions', txsPayload, { onConflict: 'id', fallbackConflict: 'id,user_id', sanitize: sanitizeTransactionsOnSchemaError, strictFallback: buildStrictlyRequiredTransactions });

      const debtsPayload = buildDebtsPayload(current.debtsAndLoans, userId, nowIso);
      if (debtsPayload.length > 0) await syncApiService.upsertWithFallback('debts', debtsPayload, { onConflict: 'id', fallbackConflict: 'id,user_id', sanitize: sanitizeDebtsOnSchemaError, strictFallback: buildStrictlyEssentialDebts });

      const invsPayload = buildInvestmentsPayload(current.investments, userId, nowIso);
      if (invsPayload.length > 0) await syncApiService.upsertWithFallback('investments', invsPayload, { onConflict: 'id', fallbackConflict: 'id,user_id', sanitize: sanitizeInvestmentsOnSchemaError, strictFallback: buildStrictlyEssentialInvs });

      const recurringPayload = buildRecurringPayload(current.recurringPayments, userId, nowIso, validAccountIds);
      if (recurringPayload.length > 0) await syncApiService.upsertWithFallback('recurring_payments', recurringPayload, { onConflict: 'id', fallbackConflict: 'id,user_id', sanitize: sanitizeRecurringOnSchemaError, strictFallback: buildStrictlyEssentialRec });

      if (current.userProfile && (current.userProfile.name || current.userProfile.photo)) await syncApiService.syncUserProfile(userId, current.userProfile, syncUser.email, nowIso);

      if (current.budgets) {
        try {
          const globalLimit = Number(current.budgets.global || 0), savedGlobalId = localStorage.getItem('global_budget_id');
          const budgetsPayload = buildBudgetsPayload(current.budgets, userId, savedGlobalId, nowIso);
          if (budgetsPayload[0]?.id) { try { localStorage.setItem('global_budget_id', String(budgetsPayload[0].id)); } catch {} }
          const bRes = await syncApiService.syncBudgets(budgetsPayload, buildEssentialBudgets(budgetsPayload));
          if (!bRes.error) { try { localStorage.setItem('global_budget_limit', String(globalLimit)); } catch {} }
          await syncApiService.syncUserSettings(userId, globalLimit, nowIso);
          try { localStorage.setItem('user_settings', JSON.stringify({ user_id: userId, global_budget_limit: globalLimit, updated_at: nowIso })); } catch {}
        } catch (bErr) { console.warn('[useDataSync] Sync budgets omitida:', bErr); }
      }

      if (Array.isArray(current.savingsGoals) && current.savingsGoals.length > 0) {
        try {
          const savingsGoalsPayload = current.savingsGoals.map((g) => {
            const n = normalizeRemoteGoal(g);
            return {
              id: String(n.id), user_id: userId, name: String(n.name || 'Meta de Ahorro').trim(),
              target_amount: Number(n.target_amount ?? n.targetAmount ?? 0), current_amount: Number(n.current_amount ?? n.currentAmount ?? 0),
              deadline: n.deadline || null, icon: n.icon || 'Target', color: n.color || '#10B981', months: n.months ? Number(n.months) : 6,
              target_account_id: n.target_account_id || n.targetAccountId || null, notification_day: n.notification_day ? Number(n.notification_day) : 15,
              notify_enabled: n.notify_enabled !== undefined ? Boolean(n.notify_enabled) : true, created_at: n.created_at || nowIso, updated_at: nowIso
            };
          });
          await syncApiService.upsertWithFallback('savings_goals', savingsGoalsPayload, {
            onConflict: 'id', fallbackConflict: 'id,user_id',
            sanitize: (p) => p.map((it) => ({ id: it.id, user_id: it.user_id, name: it.name, target_amount: Number(it.target_amount ?? 0), current_amount: Number(it.current_amount ?? 0), deadline: it.deadline || null }))
          });
        } catch (gErr) { console.warn('[useDataSync] Sync savings_goals omitida:', gErr); }
      }

      setSyncStatus('synced');
      setLastSyncTime(new Date());
      return { success: true };
    } catch (err) {
      console.error('[useDataSync] Error en pushLocalToCloud:', err);
      setSyncStatus('error');
      return { success: false, error: err };
    } finally {
      isSyncingRef.current = false;
      if (pendingPushRef.current) { pendingPushRef.current = false; pushLocalToCloud(); }
    }
  }, [syncUser]);

  const pushLocalToCloudRef = useRef(pushLocalToCloud);
  pushLocalToCloudRef.current = pushLocalToCloud;
  const pullCloudToLocalRef = useRef(pullCloudToLocal);
  pullCloudToLocalRef.current = pullCloudToLocal;

  const autoSyncTimerRef = useRef(null);
  const prevDataSignatureRef = useRef('');

  useEffect(() => {
    if (!syncApiService.isConfigured() || !syncUser?.id || syncUser.id === 'local-user' || !hasInitialPullCompletedRef.current) return;
    let sig = '';
    try {
      sig = [
        (accounts || []).map((x) => `${x.id}:${x.balance}`).join('|'),
        (transactions || []).map((x) => `${x.id}:${x.amount}:${x.category}`).join('|'),
        (debtsAndLoans || []).map((x) => `${x.id}:${x.current_balance || x.amount}`).join('|'),
        (investments || []).map((x) => `${x.id}:${x.invested_amount || x.amount}`).join('|'),
        (recurringPayments || []).map((x) => `${x.id}:${x.amount}:${x.is_active}`).join('|'),
        `${budgets?.global || 0}:${Object.entries(budgets?.categories || {}).map(([k, v]) => `${k}=${v}`).sort().join(',')}`,
        (categories || []).map((x) => `${x.id}:${(x.subcategories || []).map((s) => s.name || s).join(',')}`).join('|'),
        (savingsGoals || []).map((x) => `${x.id}:${x.currentAmount ?? x.current_amount}:${x.targetAmount ?? x.target_amount}:${x.name}`).join('|')
      ].join('###');
    } catch { sig = ''; }

    if (!sig || prevDataSignatureRef.current === sig) return;
    if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
    autoSyncTimerRef.current = setTimeout(async () => {
      if (pushLocalToCloudRef.current && !isSyncingRef.current) {
        prevDataSignatureRef.current = sig;
        await pushLocalToCloudRef.current();
      }
    }, 2000);
    return () => { if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current); };
  }, [accounts, transactions, debtsAndLoans, investments, recurringPayments, budgets, categories, savingsGoals, syncUser?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => { (syncUser?.id && syncUser.id !== 'local-user') ? pushLocalToCloudRef.current?.() : setSyncStatus('idle'); };
    const handleOffline = () => setSyncStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [syncUser]);

  useEffect(() => {
    if (!syncApiService.isConfigured()) return;
    let isSubscribed = true;
    syncApiService.getCurrentUser().then(({ user, error }) => {
      if (isSubscribed && !error && user) {
        setSyncUser(user);
        if (pullCloudToLocalRef.current && !isSyncingRef.current) pullCloudToLocalRef.current(user);
      }
    }).catch((e) => console.warn('[useDataSync] Error en getUser:', e));

    const { data: { subscription } } = syncApiService.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;
      const authUser = session?.user || null;
      setSyncUser(authUser);
      if (event === 'SIGNED_IN' && authUser) {
        if (pullCloudToLocalRef.current && !isSyncingRef.current) pullCloudToLocalRef.current(authUser);
      } else if (event === 'SIGNED_OUT') {
        setSyncUser(null);
        setSyncStatus('idle');
      }
    });

    return () => { isSubscribed = false; subscription?.unsubscribe(); };
  }, []);

  const signOutCloud = useCallback(async () => {
    if (syncApiService.isConfigured()) { try { await syncApiService.signOutCloud(); } catch {} }
  }, []);

  return {
    syncStatus,
    syncUser,
    isCloudEnabled: Boolean(isSupabaseConfigured && syncUser),
    isConfigured: isSupabaseConfigured,
    lastSyncTime,
    lastSyncedAt: lastSyncTime,
    isSyncing: syncStatus === 'syncing',
    syncError,
    pushLocalToCloud,
    pullCloudToLocal,
    syncNow: pushLocalToCloud,
    signOutCloud
  };
}

export default useDataSync;
