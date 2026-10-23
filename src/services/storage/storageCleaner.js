/**
 * storageCleaner.js
 * Purga y limpieza de almacenamiento local, sesión, IndexedDB y datos remotos
 * preservando tokens de autenticación de Supabase.
 */

import { supabase, isSupabaseConfigured } from '../supabaseClient';

const PRESERVED_PREFIXES = ['sb-', 'auth-token', 'supabase.auth'];
const ONBOARDING_KEYS_REGEX = /^(presu_tutorial_completed|has_completed_tutorial|tutorial_completed|hasSeenTutorial|tutorial_seen|app_onboarding_completed|has_completed_onboarding|hasCompletedOnboarding)/;

export function isPreservedKey(key) {
  if (!key) return false;
  return PRESERVED_PREFIXES.some(p => key.includes(p)) || ONBOARDING_KEYS_REGEX.test(key);
}

export function clearLocalDataPreservingAuth(user = null) {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage) {
      const preserved = {};
      Object.keys(localStorage).forEach(key => {
        if (isPreservedKey(key)) preserved[key] = localStorage.getItem(key);
        else localStorage.removeItem(key);
      });

      ['recurring_payments', 'app_recurring', 'presu_subscriptions_v1', 'subscriptions'].forEach(k => localStorage.removeItem(k));
      Object.entries(preserved).forEach(([k, v]) => v != null && localStorage.setItem(k, v));

      const onboardingFlags = [
        'presu_tutorial_completed', 'has_completed_tutorial', 'tutorial_completed',
        'hasSeenTutorial', 'tutorial_seen', 'app_onboarding_completed',
        'has_completed_onboarding', 'hasCompletedOnboarding'
      ];
      onboardingFlags.forEach(k => localStorage.setItem(k, 'true'));

      const uid = user?.id && user.id !== 'local-user' ? user.id : null;
      if (uid) {
        ['presu_tutorial_completed', 'has_completed_tutorial', 'tutorial_completed', 'has_completed_onboarding', 'hasCompletedOnboarding'].forEach(k => {
          localStorage.setItem(`${k}_${uid}`, 'true');
        });
      }
    }

    if (window.sessionStorage) {
      const preservedSession = {};
      Object.keys(sessionStorage).forEach(key => {
        if (PRESERVED_PREFIXES.some(p => key.includes(p))) preservedSession[key] = sessionStorage.getItem(key);
        else sessionStorage.removeItem(key);
      });
      Object.entries(preservedSession).forEach(([k, v]) => v != null && sessionStorage.setItem(k, v));
    }
  } catch (e) {
    console.warn('[storageCleaner] Error clearing non-auth storage:', e);
  }
}

export async function clearIndexedDatabases() {
  try {
    if (typeof window !== 'undefined' && window.indexedDB?.databases) {
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name && !db.name.includes('auth')) window.indexedDB.deleteDatabase(db.name);
      }
    }
  } catch (e) {
    console.warn('[storageCleaner] Error clearing IndexedDB:', e);
  }
}

const safeDelete = async (table, uid) => {
  try {
    await supabase.from(table).delete().eq('user_id', uid);
  } catch (_) {}
};

export async function clearRemoteUserData(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return;
  try {
    // Tablas dependientes primero
    await safeDelete('debt_payments', userId);
    await safeDelete('transactions', userId);

    // Purgas de budgets y pagos recurrentes
    const { error: budgetError } = await supabase.from('budgets').delete().eq('user_id', userId);
    if (budgetError) throw new Error(`Error en budgets: ${budgetError.message}`);

    await safeDelete('recurring_payments', userId);

    // Entidades principales restantes
    await Promise.allSettled([
      supabase.from('debts').delete().eq('user_id', userId),
      supabase.from('investments').delete().eq('user_id', userId),
      supabase.from('savings_goals').delete().eq('user_id', userId),
      supabase.from('categories').delete().eq('user_id', userId),
      supabase.from('user_settings').update({ global_budget_limit: 0, updated_at: new Date().toISOString() }).eq('user_id', userId)
    ]);

    await safeDelete('accounts', userId);
  } catch (cloudErr) {
    console.error('[storageCleaner] Error al eliminar datos en Supabase:', cloudErr);
    throw cloudErr;
  }
}

export function clearSessionFinancialStorage() {
  if (typeof window === 'undefined') return;
  try {
    const preserved = {};
    ['presu_theme', 'app_theme', 'theme'].forEach(key => {
      const val = localStorage.getItem(key);
      if (val !== null) preserved[key] = val;
    });

    localStorage.clear();
    Object.entries(preserved).forEach(([k, v]) => localStorage.setItem(k, v));
    if (window.sessionStorage) sessionStorage.clear();
    clearIndexedDatabases().catch(() => {});
  } catch (err) {
    console.warn('[storageCleaner] Error al limpiar almacenamiento financiero:', err);
  }
}
