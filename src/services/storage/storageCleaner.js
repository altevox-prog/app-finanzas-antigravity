import { supabase, isSupabaseConfigured } from '../supabaseClient';

/**
 * storageCleaner.js
 * Servicios de purga y limpieza de almacenamiento local, sesión, IndexedDB
 * y datos remotos preservando tokens de autenticación de Supabase.
 */

/**
 * Determina si una clave de almacenamiento debe preservarse durante un reseteo de fábrica
 * (tokens de autenticación, sesión activa y banderas para evitar bucle de onboarding/tutorial).
 */
export function isPreservedKey(key) {
  if (!key) return false;
  // Tokens y sesiones de autenticación (Supabase / OAuth)
  if (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase.auth')) return true;
  // Preferencias de tutorial y onboarding para evitar que reaparezca tras el restablecimiento
  if (
    key === 'presu_tutorial_completed' ||
    key === 'has_completed_tutorial' ||
    key === 'tutorial_completed' ||
    key === 'hasSeenTutorial' ||
    key === 'tutorial_seen' ||
    key === 'app_onboarding_completed' ||
    key === 'has_completed_onboarding' ||
    key === 'hasCompletedOnboarding' ||
    key.startsWith('tutorial_completed_') ||
    key.startsWith('presu_tutorial_completed_') ||
    key.startsWith('has_completed_tutorial_') ||
    key.startsWith('has_completed_onboarding_') ||
    key.startsWith('hasCompletedOnboarding_')
  ) {
    return true;
  }
  return false;
}

/**
 * Limpia el almacenamiento local y de sesión preservando tokens de Supabase Auth
 * y banderas de onboarding para el usuario activo.
 */
export function clearLocalDataPreservingAuth(user = null) {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage) {
      const preservedData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && isPreservedKey(key)) {
          preservedData[key] = localStorage.getItem(key);
        }
      }

      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !isPreservedKey(key)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Purgar explícitamente cualquier clave residual de pagos recurrentes y suscripciones
      [
        'recurring_payments',
        'app_recurring',
        'presu_subscriptions_v1',
        'subscriptions'
      ].forEach((k) => localStorage.removeItem(k));

      Object.entries(preservedData).forEach(([key, val]) => {
        if (val !== null) localStorage.setItem(key, val);
      });

      // Asegurar explícitamente en true todas las banderas de tutorial y onboarding completados
      localStorage.setItem('presu_tutorial_completed', 'true');
      localStorage.setItem('has_completed_tutorial', 'true');
      localStorage.setItem('tutorial_completed', 'true');
      localStorage.setItem('hasSeenTutorial', 'true');
      localStorage.setItem('tutorial_seen', 'true');
      localStorage.setItem('app_onboarding_completed', 'true');
      localStorage.setItem('has_completed_onboarding', 'true');
      localStorage.setItem('hasCompletedOnboarding', 'true');
      const activeUserId = user?.id && user.id !== 'local-user' ? user.id : null;
      if (activeUserId) {
        localStorage.setItem(`presu_tutorial_completed_${activeUserId}`, 'true');
        localStorage.setItem(`has_completed_tutorial_${activeUserId}`, 'true');
        localStorage.setItem(`tutorial_completed_${activeUserId}`, 'true');
        localStorage.setItem(`has_completed_onboarding_${activeUserId}`, 'true');
        localStorage.setItem(`hasCompletedOnboarding_${activeUserId}`, 'true');
      }
    }

    if (window.sessionStorage) {
      const preservedSessionAuth = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase.auth'))) {
          preservedSessionAuth[key] = sessionStorage.getItem(key);
        }
      }

      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && !key.startsWith('sb-') && !key.includes('auth-token') && !key.includes('supabase.auth')) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key));

      Object.entries(preservedSessionAuth).forEach(([key, val]) => {
        if (val !== null) sessionStorage.setItem(key, val);
      });
    }
  } catch (e) {
    console.warn('[storageCleaner] Error clearing non-auth storage:', e);
  }
}

/**
 * Limpia todas las bases de datos de IndexedDB del navegador excepto las de autenticación.
 */
export async function clearIndexedDatabases() {
  try {
    if (typeof window !== 'undefined' && window.indexedDB && window.indexedDB.databases) {
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name && !db.name.includes('auth')) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    }
  } catch (e) {
    console.warn('[storageCleaner] Error clearing IndexedDB:', e);
  }
}

/**
 * Elimina los registros remotos del usuario en Supabase durante el reset de fábrica.
 */
export async function clearRemoteUserData(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return;
  try {
    console.log('[storageCleaner] Eliminando registros de usuario en Supabase para:', userId);

    // 1. Eliminar tablas secundarias/dependientes primero si existen
    try {
      await supabase.from('debt_payments').delete().eq('user_id', userId);
    } catch (_) {}

    try {
      await supabase.from('transactions').delete().eq('user_id', userId);
    } catch (_) {}

    // 2. Purga explícita y secuencial de la tabla budgets filtrando por user_id
    const { error: budgetError } = await supabase
      .from('budgets')
      .delete()
      .eq('user_id', userId);

    if (budgetError) {
      console.error('Error al purgar la tabla budgets:', budgetError.message);
      throw new Error(`Error en budgets: ${budgetError.message}`);
    }

    // 3. Purga explícita de pagos recurrentes antes de eliminar cuentas (para evitar violación de FK)
    try {
      await supabase.from('recurring_payments').delete().eq('user_id', userId);
    } catch (recErr) {
      console.warn('[storageCleaner] Error al eliminar recurring_payments en Supabase:', recErr);
    }

    // 4. Purga del resto de entidades principales del usuario
    await Promise.allSettled([
      supabase.from('debts').delete().eq('user_id', userId),
      supabase.from('recurring_payments').delete().eq('user_id', userId),
      supabase.from('investments').delete().eq('user_id', userId),
      supabase.from('savings_goals').delete().eq('user_id', userId),
      supabase.from('categories').delete().eq('user_id', userId),
      supabase.from('user_settings').update({ global_budget_limit: 0, updated_at: new Date().toISOString() }).eq('user_id', userId)
    ]);

    // 5. Purga final de cuentas una vez eliminadas las referencias foráneas
    try {
      await supabase.from('accounts').delete().eq('user_id', userId);
    } catch {}
  } catch (cloudErr) {
    console.error('[storageCleaner] Error al eliminar datos en Supabase durante el reset:', cloudErr);
    throw cloudErr;
  }
}

/**
 * Limpia totalmente todas las claves de datos financieros y de sesión en localStorage,
 * sessionStorage e IndexedDB al cerrar sesión, preservando únicamente preferencias de tema visual.
 */
export function clearSessionFinancialStorage() {
  if (typeof window === 'undefined') return;
  try {
    const keysToPreserve = ['presu_theme', 'app_theme', 'theme'];
    const preserved = {};
    for (const key of keysToPreserve) {
      const val = localStorage.getItem(key);
      if (val !== null) preserved[key] = val;
    }

    localStorage.clear();

    // Restaurar únicamente la preferencia de tema visual
    for (const [key, val] of Object.entries(preserved)) {
      localStorage.setItem(key, val);
    }

    if (window.sessionStorage) {
      sessionStorage.clear();
    }

    // Limpieza asíncrona de IndexedDB
    clearIndexedDatabases().catch(() => {});
  } catch (err) {
    console.warn('[storageCleaner] Error al limpiar almacenamiento financiero:', err);
  }
}
