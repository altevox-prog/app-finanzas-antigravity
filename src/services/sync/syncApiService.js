/**
 * syncApiService.js
 * Centralización de llamadas de red a Supabase (Auth, Selects y Upserts)
 * con ejecutor genérico de upsert y recuperación defensiva de esquemas.
 */

import { supabase, isSupabaseConfigured } from '../supabaseClient';

export { isSupabaseConfigured };

/**
 * AUTHENTICATION
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured || !supabase) return { user: null, error: null };
  try {
    const { data, error } = await supabase.auth.getUser();
    return { user: data?.user || null, error };
  } catch (err) {
    console.warn('[syncApiService] Error en getUser:', err);
    return { user: null, error: err };
  }
}

export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabase.auth.onAuthStateChange(callback);
}

export async function signOutCloud() {
  if (isSupabaseConfigured && supabase) {
    try { await supabase.auth.signOut(); } 
    catch (err) { console.warn('[syncApiService] Error en signOut:', err); }
  }
}

/**
 * PULL (FETCH) OPERATIONS
 */
export async function fetchRemoteProfile(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null;
  try {
    const res = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    return res?.data || null;
  } catch (profileErr) {
    console.warn('[syncApiService] Lectura de profiles omitida:', profileErr);
    return null;
  }
}

export async function fetchRemoteData(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return [];
  return Promise.allSettled([
    supabase.from('accounts').select('*').eq('user_id', userId).order('order_index', { ascending: true, nullsFirst: false }),
    supabase.from('transactions').select('*').eq('user_id', userId),
    supabase.from('debts').select('*').eq('user_id', userId),
    supabase.from('investments').select('*').eq('user_id', userId),
    supabase.from('recurring_payments').select('*').eq('user_id', userId),
    supabase.from('budgets').select('*').eq('user_id', userId),
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('savings_goals').select('*').eq('user_id', userId)
  ]);
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
    const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
    if (error) {
      console.warn('[syncApiService] Consulta a user_settings omitida (404/PGRST204):', error.message || error);
      return null;
    }
    return data || null;
  } catch (err) {
    console.warn('[syncApiService] Fallo defensivo al leer user_settings:', err);
    return null;
  }
}

/**
 * PUSH (UPSERT) GENÉRICO CON RECUPERACIÓN DEFENSIVA ANTE ERRORES DE ESQUEMA
 */
export async function upsertWithFallback(table, payload, options = {}) {
  if (!isSupabaseConfigured || !supabase) return { data: null, error: new Error('Supabase no configurado') };
  if (!payload || (Array.isArray(payload) && payload.length === 0)) return { data: null, error: null };

  const primaryConflict = options.onConflict || 'id';
  const secondaryConflict = options.fallbackConflict || 'id,user_id';
  const { sanitize, strictFallback } = options;

  const tryUpsert = async (data) => {
    let res = await supabase.from(table).upsert(data, { onConflict: primaryConflict });
    if (res.error && (res.error.code === '42P10' || res.error.message?.includes('ON CONFLICT') || res.error.message?.includes('on_conflict'))) {
      res = await supabase.from(table).upsert(data, { onConflict: secondaryConflict });
    }
    return res;
  };

  const isSchemaError = (err) => err && (
    ['PGRST204', '42703', '23502'].includes(err.code) || err.status === 400 ||
    err.message?.includes('column') || err.details?.includes('column') || err.message?.includes('Bad Request')
  );

  let res = await tryUpsert(payload);

  if (isSchemaError(res.error) && sanitize) {
    console.warn(`[syncApiService] ${table} falló por discrepancia de esquema. Aplicando sanitizador...`, res.error.message);
    const sanitizedPayload = sanitize(payload, res.error.message, res.error.details);
    res = await tryUpsert(sanitizedPayload);

    if (isSchemaError(res.error) && strictFallback) {
      console.warn(`[syncApiService] ${table} aplicando fallback estricto final...`);
      res = await tryUpsert(strictFallback(payload, res.error.message, res.error.details));
    }
  }

  // Manejo defensivo de error de clave foránea (FK 23503 / 409)
  const isForeignKeyError = res.error && (
    res.error.code === '23503' || res.error.status === 409 ||
    res.error.message?.includes('Key is not present in table') ||
    res.error.details?.includes('Key is not present in table') ||
    res.error.details?.includes('foreign key') ||
    res.error.message?.includes('foreign key')
  );

  if (isForeignKeyError && Array.isArray(payload) && payload.some(i => i && ('account_id' in i || 'accountId' in i))) {
    console.warn(`[syncApiService] ${table} falló por clave foránea (23503/409). Reintentando con account_id: null...`);
    res = await tryUpsert(payload.map(item => ({ ...item, account_id: null })));
  }

  if (res.error) {
    console.error(`[syncApiService] Error en ${table} upsert:`, {
      message: res.error.message, details: res.error.details, hint: res.error.hint, code: res.error.code
    });
  }

  return res;
}

/**
 * SYNC USER PROFILE
 */
export async function syncUserProfile(userId, profile, email = null, nowIso = new Date().toISOString()) {
  if (!isSupabaseConfigured || !supabase || !userId) return { success: true };
  if (!profile || (!profile.name && !profile.photo)) return { success: true };

  const name = profile.name || 'Usuario';
  const photo = profile.photo || null;

  let profRes = await supabase.from('profiles').update({ display_name: name, photo_url: photo, updated_at: nowIso }).eq('id', userId);

  if (profRes.error && (profRes.error.message?.includes('column') || profRes.error.code === '42703')) {
    profRes = await supabase.from('profiles').update({ full_name: name, avatar_url: photo, updated_at: nowIso }).eq('id', userId);
  }

  if (profRes.error) {
    let upRes = await supabase.from('profiles').upsert([{ id: userId, email: email || null, display_name: name, photo_url: photo, updated_at: nowIso }], { onConflict: 'id' });
    if (upRes.error && (upRes.error.message?.includes('column') || upRes.error.code === '42703')) {
      upRes = await supabase.from('profiles').upsert([{ id: userId, email: email || null, full_name: name, avatar_url: photo, updated_at: nowIso }], { onConflict: 'id' });
    }
    if (upRes.error) {
      console.error('[syncApiService] Error en profiles upsert:', upRes.error);
      return { success: false, error: upRes.error };
    }
  }

  return { success: true };
}

/**
 * SYNC BUDGETS AND USER SETTINGS
 */
export async function syncBudgets(budgetsPayload, fallbackBudgetsPayload = null) {
  if (!isSupabaseConfigured || !supabase) return { error: new Error('Supabase no configurado') };
  let bRes = await supabase.from('budgets').upsert(budgetsPayload, { onConflict: 'id' });
  if (bRes.error && fallbackBudgetsPayload) {
    console.warn('[syncApiService] Fallo en upsert budgets, aplicando fallback:', bRes.error.message || bRes.error);
    try { bRes = await supabase.from('budgets').upsert(fallbackBudgetsPayload, { onConflict: 'id' }); } 
    catch (err) { console.warn('[syncApiService] Reintento budgets omitido:', err); }
  }
  return bRes;
}

export async function syncUserSettings(userId, globalLimit, nowIso = new Date().toISOString()) {
  if (!isSupabaseConfigured || !supabase || !userId) return { error: null };
  try {
    const { error } = await supabase.from('user_settings').upsert(
      { user_id: userId, global_budget_limit: globalLimit, updated_at: nowIso },
      { onConflict: 'user_id' }
    );
    if (error) console.warn('[syncApiService] Upsert en user_settings omitido:', error.message || error);
    return { error };
  } catch (ex) {
    console.warn('[syncApiService] Fallo defensivo al persistir en user_settings:', ex);
    return { error: ex };
  }
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
