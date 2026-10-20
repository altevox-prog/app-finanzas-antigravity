/**
 * syncApiService.js
 * Centralización de llamadas de red a Supabase (Auth, Selects y Upserts)
 * con ejecutor genérico de upsert y recuperación defensiva de esquemas.
 */

import { supabase, isSupabaseConfigured } from '../supabaseClient';

export { isSupabaseConfigured };

export async function getCurrentUser() {
  if (!isSupabaseConfigured || !supabase) return { user: null, error: null };
  try {
    const { data, error } = await supabase.auth.getUser();
    return { user: data?.user || null, error };
  } catch (err) {
    return { user: null, error: err };
  }
}

export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured || !supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
}

export async function signOutCloud() {
  if (isSupabaseConfigured && supabase) {
    try { await supabase.auth.signOut(); } catch (err) { console.warn('[syncApiService] Error signOut:', err); }
  }
}

export async function fetchRemoteProfile(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null;
  try {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    return data || null;
  } catch { return null; }
}

export async function fetchRemoteData(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return [];
  const tables = ['accounts', 'transactions', 'debts', 'investments', 'recurring_payments', 'budgets', 'categories', 'savings_goals'];
  return Promise.allSettled(tables.map(t => {
    const q = supabase.from(t).select('*').eq('user_id', userId);
    return t === 'accounts' ? q.order('order_index', { ascending: true, nullsFirst: false }) : q;
  }));
}

export async function fetchAccounts(userId = null) {
  if (!isSupabaseConfigured || !supabase) return { data: [], error: new Error('Supabase no configurado') };
  const uid = userId || (await getCurrentUser()).user?.id;
  if (!uid) return { data: [], error: new Error('Usuario no autenticado') };
  return await supabase.from('accounts').select('*').eq('user_id', uid).order('order_index', { ascending: true, nullsFirst: false });
}

export async function fetchUserSettings(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null;
  try {
    const { data } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
    return data || null;
  } catch { return null; }
}

export async function upsertWithFallback(table, payload, options = {}) {
  if (!isSupabaseConfigured || !supabase) return { data: null, error: new Error('Supabase no configurado') };
  if (!payload || (Array.isArray(payload) && payload.length === 0)) return { data: null, error: null };

  const primary = options.onConflict || 'id', fallback = options.fallbackConflict || 'id,user_id';
  const { sanitize, strictFallback } = options;

  const tryUpsert = async (data) => {
    let res = await supabase.from(table).upsert(data, { onConflict: primary });
    if (res.error && (res.error.code === '42P10' || res.error.message?.includes('ON CONFLICT') || res.error.message?.includes('on_conflict'))) {
      res = await supabase.from(table).upsert(data, { onConflict: fallback });
    }
    return res;
  };

  const isSchemaError = (err) => err && (
    ['PGRST204', '42703', '23502'].includes(err.code) || err.status === 400 ||
    err.message?.includes('column') || err.details?.includes('column')
  );

  let res = await tryUpsert(payload);
  if (isSchemaError(res.error) && sanitize) {
    res = await tryUpsert(sanitize(payload, res.error.message, res.error.details));
    if (isSchemaError(res.error) && strictFallback) res = await tryUpsert(strictFallback(payload, res.error.message, res.error.details));
  }

  const isFKError = res.error && (
    res.error.code === '23503' || res.error.status === 409 ||
    res.error.message?.includes('Key is not present in table') || res.error.details?.includes('foreign key')
  );
  if (isFKError && Array.isArray(payload) && payload.some(i => i && ('account_id' in i || 'accountId' in i))) {
    res = await tryUpsert(payload.map(item => ({ ...item, account_id: null })));
  }

  if (res.error) {
    console.error(`[syncApiService] Error en ${table} upsert:`, { message: res.error.message, details: res.error.details, code: res.error.code });
  }
  return res;
}

export async function syncUserProfile(userId, profile, email = null, nowIso = new Date().toISOString()) {
  if (!isSupabaseConfigured || !supabase || !userId || !profile || (!profile.name && !profile.photo)) return { success: true };
  const name = profile.name || 'Usuario', photo = profile.photo || null;

  let res = await supabase.from('profiles').update({ display_name: name, photo_url: photo, updated_at: nowIso }).eq('id', userId);
  if (res.error && (res.error.message?.includes('column') || res.error.code === '42703')) {
    res = await supabase.from('profiles').update({ full_name: name, avatar_url: photo, updated_at: nowIso }).eq('id', userId);
  }

  if (res.error) {
    let upRes = await supabase.from('profiles').upsert([{ id: userId, email: email || null, display_name: name, photo_url: photo, updated_at: nowIso }], { onConflict: 'id' });
    if (upRes.error && (upRes.error.message?.includes('column') || upRes.error.code === '42703')) {
      upRes = await supabase.from('profiles').upsert([{ id: userId, email: email || null, full_name: name, avatar_url: photo, updated_at: nowIso }], { onConflict: 'id' });
    }
    if (upRes.error) return { success: false, error: upRes.error };
  }
  return { success: true };
}

export async function syncBudgets(budgetsPayload, fallbackBudgetsPayload = null) {
  if (!isSupabaseConfigured || !supabase) return { error: new Error('Supabase no configurado') };
  let bRes = await supabase.from('budgets').upsert(budgetsPayload, { onConflict: 'id' });
  if (bRes.error && fallbackBudgetsPayload) {
    try { bRes = await supabase.from('budgets').upsert(fallbackBudgetsPayload, { onConflict: 'id' }); } catch { /* ignore fallback error */ }
  }
  return bRes;
}

export async function syncUserSettings(userId, globalLimit, nowIso = new Date().toISOString()) {
  if (!isSupabaseConfigured || !supabase || !userId) return { error: null };
  try {
    const { error } = await supabase.from('user_settings').upsert({ user_id: userId, global_budget_limit: globalLimit, updated_at: nowIso }, { onConflict: 'user_id' });
    return { error };
  } catch (ex) { return { error: ex }; }
}

export const syncApiService = {
  isConfigured: () => Boolean(isSupabaseConfigured && supabase),
  getCurrentUser,
  onAuthStateChange,
  signOutCloud,
  fetchRemoteProfile,
  fetchRemoteData,
  fetchAccounts,
  fetchUserSettings,
  upsertWithFallback,
  syncUserProfile,
  syncBudgets,
  syncUserSettings
};

export default syncApiService;
