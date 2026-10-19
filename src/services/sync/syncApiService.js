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
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[syncApiService] Error en signOut:', err);
    }
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
    console.warn('[syncApiService] Lectura de profiles omitida de forma segura:', profileErr);
    return null;
  }
}

export async function fetchRemoteData(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return [];
  }
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
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: new Error('Supabase no configurado') };
  }
  let uid = userId;
  if (!uid) {
    const userRes = await getCurrentUser();
    uid = userRes.user?.id;
  }
  if (!uid) {
    return { data: [], error: new Error('Usuario no autenticado') };
  }
  return await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', uid)
    .order('order_index', { ascending: true, nullsFirst: false });
}

export async function fetchUserSettings(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

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
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase no configurado') };
  }
  if (!payload || (Array.isArray(payload) && payload.length === 0)) {
    return { data: null, error: null };
  }

  const primaryConflict = options.onConflict || 'id';
  const secondaryConflict = options.fallbackConflict || 'id,user_id';
  const { sanitize, strictFallback } = options;

  let res = await supabase.from(table).upsert(payload, { onConflict: primaryConflict });

  // Fallback si la clave de conflicto compuesta es requerida
  if (res.error && (res.error.code === '42P10' || res.error.message?.includes('ON CONFLICT') || res.error.message?.includes('on_conflict'))) {
    res = await supabase.from(table).upsert(payload, { onConflict: secondaryConflict });
  }

  // Comprobar errores de esquema (columna faltante, PGRST204, 42703, 400 Bad Request)
  const isSchemaError = res.error && (
    res.error.code === 'PGRST204' ||
    res.error.code === '42703' ||
    res.error.code === '23502' ||
    res.error.status === 400 ||
    res.error.message?.includes('column') ||
    res.error.details?.includes('column') ||
    res.error.message?.includes('Bad Request')
  );

  if (isSchemaError && sanitize) {
    const errText = `${res.error.message || ''} ${res.error.details || ''} ${res.error.hint || ''}`;
    console.warn(`[syncApiService] ${table} falló por discrepancia de esquema. Aplicando sanitizador...`, errText);
    const sanitizedPayload = sanitize(payload, res.error.message, res.error.details);

    res = await supabase.from(table).upsert(sanitizedPayload, { onConflict: primaryConflict });
    if (res.error && (res.error.code === '42P10' || res.error.message?.includes('ON CONFLICT') || res.error.message?.includes('on_conflict'))) {
      res = await supabase.from(table).upsert(sanitizedPayload, { onConflict: secondaryConflict });
    }

    // Fallback estricto secundario si persisten discrepancias
    const stillHasSchemaError = res.error && (
      res.error.code === 'PGRST204' ||
      res.error.code === '42703' ||
      res.error.code === '23502' ||
      res.error.status === 400 ||
      res.error.message?.includes('column') ||
      res.error.message?.includes('Bad Request')
    );

    if (stillHasSchemaError && strictFallback) {
      console.warn(`[syncApiService] ${table} aplicando fallback estricto final...`);
      const strictlyPayload = strictFallback(payload, res.error.message, res.error.details);

      res = await supabase.from(table).upsert(strictlyPayload, { onConflict: primaryConflict });
      if (res.error && (res.error.code === '42P10' || res.error.message?.includes('ON CONFLICT') || res.error.message?.includes('on_conflict'))) {
        res = await supabase.from(table).upsert(strictlyPayload, { onConflict: secondaryConflict });
      }
    }
  }

  // Manejo defensivo de error de clave foránea (FK 23503 / 409: Key is not present in table "accounts")
  const isForeignKeyError = res.error && (
    res.error.code === '23503' ||
    res.error.status === 409 ||
    res.error.message?.includes('Key is not present in table') ||
    res.error.details?.includes('Key is not present in table') ||
    res.error.details?.includes('foreign key') ||
    res.error.message?.includes('foreign key')
  );

  if (isForeignKeyError && Array.isArray(payload)) {
    const hasAccountIdField = payload.some(item => item && ('account_id' in item || 'accountId' in item));
    if (hasAccountIdField) {
      console.warn(`[syncApiService] ${table} falló por clave foránea (23503/409). Reintentando con account_id: null...`);
      const sanitizedFkPayload = payload.map(item => ({
        ...item,
        account_id: null
      }));

      res = await supabase.from(table).upsert(sanitizedFkPayload, { onConflict: primaryConflict });
      if (res.error && (res.error.code === '42P10' || res.error.message?.includes('ON CONFLICT') || res.error.message?.includes('on_conflict'))) {
        res = await supabase.from(table).upsert(sanitizedFkPayload, { onConflict: secondaryConflict });
      }
    }
  }

  if (res.error) {
    console.error(`[syncApiService] Error en ${table} upsert:`, {
      message: res.error.message,
      details: res.error.details,
      hint: res.error.hint,
      code: res.error.code
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

  const profileName = profile.name || 'Usuario';
  const profilePhoto = profile.photo || null;

  // Intentar update primero (aprovecha la RLS policy "Users can update own profile")
  let profRes = await supabase.from('profiles')
    .update({
      display_name: profileName,
      photo_url: profilePhoto,
      updated_at: nowIso
    })
    .eq('id', userId);

  // Si falla por columnas diferentes (ej. schema estándar con full_name/avatar_url)
  if (profRes.error && (profRes.error.message?.includes('column') || profRes.error.code === '42703')) {
    profRes = await supabase.from('profiles')
      .update({
        full_name: profileName,
        avatar_url: profilePhoto,
        updated_at: nowIso
      })
      .eq('id', userId);
  }

  // Si update no aplicó o falló, intentar upsert con ambas combinaciones
  if (profRes.error) {
    let upRes = await supabase.from('profiles').upsert([{
      id: userId,
      email: email || null,
      display_name: profileName,
      photo_url: profilePhoto,
      updated_at: nowIso
    }], { onConflict: 'id' });

    if (upRes.error && (upRes.error.message?.includes('column') || upRes.error.code === '42703')) {
      upRes = await supabase.from('profiles').upsert([{
        id: userId,
        email: email || null,
        full_name: profileName,
        avatar_url: profilePhoto,
        updated_at: nowIso
      }], { onConflict: 'id' });
    }

    if (upRes.error) {
      console.error('[syncApiService] Error en profiles upsert:', {
        message: upRes.error.message,
        details: upRes.error.details,
        hint: upRes.error.hint,
        code: upRes.error.code
      });
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
    console.warn('[syncApiService] Fallo en upsert budgets con payload completo (400/schema):', bRes.error.message || bRes.error);
    try {
      bRes = await supabase.from('budgets').upsert(fallbackBudgetsPayload, { onConflict: 'id' });
    } catch (fallbackErr) {
      console.warn('[syncApiService] Reintento esencial budgets omitido:', fallbackErr);
    }
  }
  return bRes;
}

export async function syncUserSettings(userId, globalLimit, nowIso = new Date().toISOString()) {
  if (!isSupabaseConfigured || !supabase || !userId) return { error: null };
  try {
    const { error: settingsError } = await supabase
      .from('user_settings')
      .upsert(
        { user_id: userId, global_budget_limit: globalLimit, updated_at: nowIso },
        { onConflict: 'user_id' }
      );

    if (settingsError) {
      console.warn('[syncApiService] Upsert en user_settings omitido (404/PGRST204):', settingsError.message || settingsError);
    }
    return { error: settingsError };
  } catch (settingsEx) {
    console.warn('[syncApiService] Fallo defensivo al persistir en user_settings:', settingsEx);
    return { error: settingsEx };
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
