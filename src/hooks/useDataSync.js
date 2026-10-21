import { useState, useEffect, useCallback, useRef } from 'react';
import { syncApiService, isSupabaseConfigured } from '../services/sync/syncApiService';
import { normalizeRemoteProfile, normalizeRemoteAccount, normalizeRemoteTransaction, normalizeRemoteDebt, normalizeRemoteInvestment, normalizeRemoteRecurring, resolveRemoteBudgets, normalizeRemoteCategory, normalizeRemoteGoal } from '../services/sync/syncNormalizers';
import { buildAccountsPayload, sanitizeAccountsOnSchemaError, buildTransactionsPayload, sanitizeTransactionsOnSchemaError, buildStrictlyRequiredTransactions, buildDebtsPayload, sanitizeDebtsOnSchemaError, buildStrictlyEssentialDebts, buildInvestmentsPayload, sanitizeInvestmentsOnSchemaError, buildStrictlyEssentialInvs, buildRecurringPayload, sanitizeRecurringOnSchemaError, buildStrictlyEssentialRec, buildBudgetsPayload, buildEssentialBudgets } from '../services/sync/syncPayloads';

const markOnboardingDone = (uid) => ['has_completed_onboarding_' + uid, 'has_completed_onboarding', 'hasCompletedOnboarding', 'app_onboarding_completed'].forEach((k) => { try { localStorage.setItem(k, 'true'); } catch {} });
const getResData = (r) => (r?.status === 'fulfilled' && !r.value?.error && Array.isArray(r.value?.data)) ? r.value.data : null;
const safeSetLocal = (entries) => { try { entries.forEach(([k, v]) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))); } catch {} };

export function useDataSync({
  accounts = [], setAccounts, transactions = [], setTransactions, debtsAndLoans = [], setDebtsAndLoans, investments = [], setInvestments, recurringPayments = [], setRecurringPayments, budgets = { global: 0, categories: {} }, setBudgets, categories = [], setCategories, savingsGoals = [], setSavingsGoals, userProfile = {}, setUserProfile
} = {}) {
  const [syncUser, setSyncUser] = useState(null), [syncStatus, setSyncStatus] = useState(() => isSupabaseConfigured ? 'idle' : 'offline'), [lastSyncTime, setLastSyncTime] = useState(null), [syncError, setSyncError] = useState(null);
  const isSyncingRef = useRef(false), pendingPushRef = useRef(false), hasInitialPullCompletedRef = useRef(false), autoSyncTimerRef = useRef(null), prevDataSignatureRef = useRef('');
  const latestDataRef = useRef({ accounts, transactions, debtsAndLoans, investments, recurringPayments, budgets, categories, savingsGoals, userProfile });

  useEffect(() => {
    latestDataRef.current = { accounts, transactions, debtsAndLoans, investments, recurringPayments, budgets, categories, savingsGoals, userProfile };
  }, [accounts, transactions, debtsAndLoans, investments, recurringPayments, budgets, categories, savingsGoals, userProfile]);

  const pullCloudToLocal = useCallback(async (userOverride = null, profileRes = null) => {
    let cloudProfile = profileRes?.data || null;
    if (isSyncingRef.current) return { success: false, reason: 'already_syncing', profile: cloudProfile, hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true };
    if (!isSupabaseConfigured || !syncApiService.isConfigured()) { setSyncStatus('offline'); return { success: false, reason: 'not_configured', profile: cloudProfile, hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true }; }
    const targetUser = userOverride || syncUser;
    if (!targetUser?.id) { setSyncStatus('idle'); return { success: false, reason: 'unauthenticated', profile: cloudProfile, hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true }; }

    const userId = targetUser.id; isSyncingRef.current = true; setSyncStatus('syncing'); setSyncError(null);
    try {
      const remoteProfile = await syncApiService.fetchRemoteProfile(userId);
      if (remoteProfile) cloudProfile = remoteProfile;
      const [accRes, txsRes, debtsRes, invsRes, recRes, budRes, catsRes, goalsRes] = await syncApiService.fetchRemoteData(userId);
      const safeProfile = cloudProfile || null, hasCompletedOnboarding = safeProfile?.onboarding_completed === true || safeProfile?.has_completed_onboarding === true;
      if (hasCompletedOnboarding) markOnboardingDone(userId);
      if (safeProfile && typeof setUserProfile === 'function') setUserProfile((prev) => normalizeRemoteProfile(safeProfile, prev));

      const accData = getResData(accRes);
      if (accData) {
        const userAccs = accData.filter((r) => !r.user_id || r.user_id === userId);
        if (userAccs.length > 0) { setAccounts?.((p) => (Array.isArray(p) && p.length > 0) ? p : userAccs.map(normalizeRemoteAccount)); markOnboardingDone(userId); }
        else if ((latestDataRef.current.accounts || []).length > 0) setTimeout(() => pushLocalToCloud(), 800);
      }
      const txData = getResData(txsRes), debtsData = getResData(debtsRes), invData = getResData(invsRes), recData = getResData(recRes);
      if (txData?.length) setTransactions?.(txData.map(normalizeRemoteTransaction));
      if (debtsData?.length) setDebtsAndLoans?.(debtsData.map(normalizeRemoteDebt));
      if (invData?.length) setInvestments?.(invData.map(normalizeRemoteInvestment));
      if (recData?.length) {
        const normRec = recData.map(normalizeRemoteRecurring); setRecurringPayments?.(normRec);
        safeSetLocal([['recurring_payments', normRec], ['app_recurring', normRec], ['presu_subscriptions_v1', normRec], ['subscriptions', normRec]]);
      }
      const userSettingsData = await syncApiService.fetchUserSettings(userId), resolvedBudgets = resolveRemoteBudgets(budRes, userSettingsData);
      if (typeof setBudgets === 'function' && resolvedBudgets) {
        setBudgets(resolvedBudgets);
        safeSetLocal([['presu_budgets_v1', resolvedBudgets], ['budgets', resolvedBudgets], ['global_budget_limit', String(resolvedBudgets.global)]]);
        if (!localStorage.getItem('user_settings')) safeSetLocal([['user_settings', { user_id: userId, global_budget_limit: resolvedBudgets.global, updated_at: new Date().toISOString() }]]);
      }
      const catData = getResData(catsRes);
      if (catData?.length && typeof setCategories === 'function') setCategories(catData.map((c) => normalizeRemoteCategory(c, latestDataRef.current?.categories || [])));

      const goalsData = getResData(goalsRes);
      if (goalsData) {
        if (goalsData.length > 0 && typeof setSavingsGoals === 'function') {
          setSavingsGoals((prev) => {
            const list = Array.isArray(prev) && prev.length > 0 ? prev : (latestDataRef.current?.savingsGoals || []), map = new Map(list.map((g) => [String(g.id), g]));
            return goalsData.map((rg) => { const l = map.get(String(rg.id)) || {}; return normalizeRemoteGoal({ ...l, ...rg, target_amount: Number(rg.target_amount ?? l.target_amount ?? l.targetAmount ?? 0), current_amount: Number(rg.current_amount ?? l.current_amount ?? l.currentAmount ?? 0) }); }).filter(Boolean);
          });
        } else if ((latestDataRef.current.savingsGoals || []).length > 0) setTimeout(() => pushLocalToCloud(), 800);
      }
      setSyncStatus('synced'); hasInitialPullCompletedRef.current = true; setLastSyncTime(new Date());
      return { success: true, profile: safeProfile, hasCompletedOnboarding };
    } catch (err) {
      console.warn('[useDataSync] Error en pull Supabase:', err); setSyncStatus('error'); setSyncError(err?.message || 'Error descargando datos');
      return { success: false, error: err, profile: cloudProfile, hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true };
    } finally { isSyncingRef.current = false; }
  }, [syncUser, setAccounts, setTransactions, setDebtsAndLoans, setInvestments, setRecurringPayments, setBudgets, setCategories, setSavingsGoals, setUserProfile]);

  const pushLocalToCloud = useCallback(async () => {
    if (isSyncingRef.current) { pendingPushRef.current = true; return { success: false, reason: 'queued_pending' }; }
    if (!isSupabaseConfigured || !syncApiService.isConfigured() || !syncUser?.id) return { success: false, reason: 'unauthenticated' };
    const userId = syncUser.id; isSyncingRef.current = true; pendingPushRef.current = false; setSyncStatus('syncing');
    try {
      const nowIso = new Date().toISOString(), current = latestDataRef.current;
      const accountsPayload = buildAccountsPayload(current.accounts, userId, nowIso);
      if (accountsPayload.length > 0) await syncApiService.upsertWithFallback('accounts', accountsPayload, { onConflict: 'id', fallbackConflict: 'id,user_id', sanitize: sanitizeAccountsOnSchemaError });
      const validAccs = new Set(accountsPayload.map((a) => a.id)), catMap = new Map((current.categories || []).map((c) => [c.id, c.name]));

      const syncEntities = [
        ['transactions', buildTransactionsPayload(current.transactions, validAccs, accountsPayload[0]?.id || null, catMap, nowIso, userId), sanitizeTransactionsOnSchemaError, buildStrictlyRequiredTransactions],
        ['debts', buildDebtsPayload(current.debtsAndLoans, userId, nowIso), sanitizeDebtsOnSchemaError, buildStrictlyEssentialDebts],
        ['investments', buildInvestmentsPayload(current.investments, userId, nowIso), sanitizeInvestmentsOnSchemaError, buildStrictlyEssentialInvs],
        ['recurring_payments', buildRecurringPayload(current.recurringPayments, userId, nowIso, validAccs), sanitizeRecurringOnSchemaError, buildStrictlyEssentialRec]
      ];
      for (const [table, payload, sanitize, strictFallback] of syncEntities) {
        if (payload?.length) await syncApiService.upsertWithFallback(table, payload, { onConflict: 'id', fallbackConflict: 'id,user_id', sanitize, strictFallback });
      }
      if (current.userProfile && (current.userProfile.name || current.userProfile.photo)) await syncApiService.syncUserProfile(userId, current.userProfile, syncUser.email, nowIso);
      if (current.budgets) {
        try {
          const globalLimit = Number(current.budgets.global || 0), savedGlobalId = localStorage.getItem('global_budget_id');
          const budgetsPayload = buildBudgetsPayload(current.budgets, userId, savedGlobalId, nowIso);
          if (budgetsPayload[0]?.id) safeSetLocal([['global_budget_id', String(budgetsPayload[0].id)]]);
          const bRes = await syncApiService.syncBudgets(budgetsPayload, buildEssentialBudgets(budgetsPayload));
          if (!bRes.error) safeSetLocal([['global_budget_limit', String(globalLimit)]]);
          await syncApiService.syncUserSettings(userId, globalLimit, nowIso);
          safeSetLocal([['user_settings', { user_id: userId, global_budget_limit: globalLimit, updated_at: nowIso }]]);
        } catch (bErr) { console.warn('[useDataSync] Sync budgets omitida:', bErr); }
      }
      if (Array.isArray(current.savingsGoals) && current.savingsGoals.length > 0) {
        try {
          const savingsGoalsPayload = current.savingsGoals.map((g) => {
            const n = normalizeRemoteGoal(g);
            return { id: String(n.id), user_id: userId, name: String(n.name || 'Meta de Ahorro').trim(), target_amount: Number(n.target_amount ?? n.targetAmount ?? 0), current_amount: Number(n.current_amount ?? n.currentAmount ?? 0), deadline: n.deadline || null, icon: n.icon || 'Target', color: n.color || '#10B981', months: n.months ? Number(n.months) : 6, target_account_id: n.target_account_id || n.targetAccountId || null, notification_day: n.notification_day ? Number(n.notification_day) : 15, notify_enabled: n.notify_enabled !== undefined ? Boolean(n.notify_enabled) : true, created_at: n.created_at || nowIso, updated_at: nowIso };
          });
          await syncApiService.upsertWithFallback('savings_goals', savingsGoalsPayload, { onConflict: 'id', fallbackConflict: 'id,user_id', sanitize: (p) => p.map((it) => ({ id: it.id, user_id: it.user_id, name: it.name, target_amount: Number(it.target_amount ?? 0), current_amount: Number(it.current_amount ?? 0), deadline: it.deadline || null })) });
        } catch (gErr) { console.warn('[useDataSync] Sync savings_goals omitida:', gErr); }
      }
      setSyncStatus('synced'); setLastSyncTime(new Date()); return { success: true };
    } catch (err) {
      console.error('[useDataSync] Error en pushLocalToCloud:', err); setSyncStatus('error'); return { success: false, error: err };
    } finally {
      isSyncingRef.current = false;
      if (pendingPushRef.current) { pendingPushRef.current = false; pushLocalToCloud(); }
    }
  }, [syncUser]);

  const pushLocalToCloudRef = useRef(pushLocalToCloud), pullCloudToLocalRef = useRef(pullCloudToLocal);
  pushLocalToCloudRef.current = pushLocalToCloud; pullCloudToLocalRef.current = pullCloudToLocal;

  useEffect(() => {
    if (!syncApiService.isConfigured() || !syncUser?.id || syncUser.id === 'local-user' || !hasInitialPullCompletedRef.current) return;
    let sig = '';
    try {
      sig = [(accounts || []).map((x) => `${x.id}:${x.balance}`).join('|'), (transactions || []).map((x) => `${x.id}:${x.amount}:${x.category}`).join('|'), (debtsAndLoans || []).map((x) => `${x.id}:${x.current_balance || x.amount}`).join('|'), (investments || []).map((x) => `${x.id}:${x.invested_amount || x.amount}`).join('|'), (recurringPayments || []).map((x) => `${x.id}:${x.amount}:${x.is_active}`).join('|'), `${budgets?.global || 0}:${Object.entries(budgets?.categories || {}).map(([k, v]) => `${k}=${v}`).sort().join(',')}`, (categories || []).map((x) => `${x.id}:${(x.subcategories || []).map((s) => s.name || s).join(',')}`).join('|'), (savingsGoals || []).map((x) => `${x.id}:${x.currentAmount ?? x.current_amount}:${x.targetAmount ?? x.target_amount}:${x.name}`).join('|')].join('###');
    } catch { sig = ''; }
    if (!sig || prevDataSignatureRef.current === sig) return;
    if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
    autoSyncTimerRef.current = setTimeout(async () => {
      if (pushLocalToCloudRef.current && !isSyncingRef.current) { prevDataSignatureRef.current = sig; await pushLocalToCloudRef.current(); }
    }, 2000);
    return () => { if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current); };
  }, [accounts, transactions, debtsAndLoans, investments, recurringPayments, budgets, categories, savingsGoals, syncUser?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => { (syncUser?.id && syncUser.id !== 'local-user') ? pushLocalToCloudRef.current?.() : setSyncStatus('idle'); }, onOffline = () => setSyncStatus('offline');
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, [syncUser]);

  useEffect(() => {
    if (!syncApiService.isConfigured()) return;
    let isSub = true;
    syncApiService.getCurrentUser().then(({ user, error }) => {
      if (isSub && !error && user) { setSyncUser(user); if (pullCloudToLocalRef.current && !isSyncingRef.current) pullCloudToLocalRef.current(user); }
    }).catch((e) => console.warn('[useDataSync] Error en getUser:', e));
    const { data: { subscription } } = syncApiService.onAuthStateChange((event, session) => {
      if (!isSub) return;
      const authUser = session?.user || null; setSyncUser(authUser);
      if (event === 'SIGNED_IN' && authUser) { if (pullCloudToLocalRef.current && !isSyncingRef.current) pullCloudToLocalRef.current(authUser); }
      else if (event === 'SIGNED_OUT') { setSyncUser(null); setSyncStatus('idle'); }
    });
    return () => { isSub = false; subscription?.unsubscribe(); };
  }, []);

  const signOutCloud = useCallback(async () => { if (syncApiService.isConfigured()) { try { await syncApiService.signOutCloud(); } catch {} } }, []);

  return {
    syncStatus, syncUser, isCloudEnabled: Boolean(isSupabaseConfigured && syncUser), isConfigured: isSupabaseConfigured,
    lastSyncTime, lastSyncedAt: lastSyncTime, isSyncing: syncStatus === 'syncing', syncError, pushLocalToCloud, pullCloudToLocal, syncNow: pushLocalToCloud, signOutCloud
  };
}

export default useDataSync;
