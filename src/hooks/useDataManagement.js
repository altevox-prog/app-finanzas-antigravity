import { useRef, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { saveAccountsToStorage } from '../services/storageService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import toast from '../utils/toast';

/**
 * useDataManagement
 * Hook centralizado para el mantenimiento global de datos:
 * - Reset de fábrica y purga completa del almacenamiento (local, session, IndexedDB, caches).
 * - Importación y restauración de copias de seguridad (backup).
 * - Finalización y configuración de Onboarding inicial.
 * - Gestión unificada del flag de control de reseteo (isResettingRef).
 */
export function useDataManagement({
  isResettingRef: externalIsResettingRef,
  user,
  // Funciones de reseteo de hooks
  resetTransactions,
  resetAccounts,
  resetDebts,
  resetInvestments,
  resetRecurringPayments,
  resetSavingsGoals,
  resetBudgets,
  // Setters de estado de datos
  setTransactions,
  setAccounts,
  setCategories,
  setDebtsAndLoans,
  setInvestments,
  setBudgets,
  setSavingsGoals,
  setRecurringPayments,
  setUserProfile,
  setSecuritySettings,
  setTrm,
  setTheme,
  setSelectedDay,
  setIsLocked,
  setShowTutorial,
  completeOnboarding
} = {}) {
  const internalIsResettingRef = useRef(false);
  const isResettingRef = externalIsResettingRef || internalIsResettingRef;

  // Helper para purgar datos locales de la app PRESERVANDO los tokens de Supabase Auth y banderas de tutorial/onboarding
  const clearLocalDataPreservingAuth = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      if (window.localStorage) {
        const isPreservedKey = (key) => {
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
        };

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
      console.warn('Error clearing non-auth storage:', e);
    }
  }, [user]);

  // 1. Reset de Datos (Preservando sesión activa y eliminando registros en Supabase)
  const handleFactoryReset = useCallback(async (skipConfirm = false) => {
    if (!skipConfirm) {
      let confirmed = false;
      try {
        confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
          ? window.confirm(
              '¿Estás seguro de restablecer todos los datos? Se borrarán todas las transacciones, cuentas, deudas e inversiones en la nube y en este dispositivo. Tu sesión continuará activa.'
            )
          : true;
      } catch {
        confirmed = true;
      }
      if (!confirmed) return false;
    }

    try {
      if (isResettingRef) isResettingRef.current = true;

      // 1. Borrado remoto real en Supabase para el usuario activo (SIN llamar a signOut)
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const targetUserId = authData?.user?.id || (user?.id !== 'local-user' ? user?.id : null);

          if (targetUserId) {
            console.log('Eliminando registros de usuario en Supabase para:', targetUserId);
            // Primero eliminar registros de tablas dependientes y luego accounts
            await Promise.allSettled([
              supabase.from('transactions').delete().eq('user_id', targetUserId),
              supabase.from('debts').delete().eq('user_id', targetUserId),
              supabase.from('recurring_payments').delete().eq('user_id', targetUserId),
              supabase.from('investments').delete().eq('user_id', targetUserId),
              supabase.from('savings_goals').delete().eq('user_id', targetUserId),
              supabase.from('budgets').delete().eq('user_id', targetUserId),
              supabase.from('categories').delete().eq('user_id', targetUserId),
              supabase.from('accounts').delete().eq('user_id', targetUserId)
            ]);

            // Reintento de accounts por si hubo restricción de clave foránea previa
            try {
              await supabase.from('accounts').delete().eq('user_id', targetUserId);
            } catch {}
          }
        } catch (cloudErr) {
          console.warn('Error al eliminar datos en Supabase durante el reset:', cloudErr);
        }
      }

      // 2. Limpieza de almacenamiento local preservando las claves de autenticación
      clearLocalDataPreservingAuth();

      // 3. Resetear inmediatamente el estado en memoria de React a ceros / arreglos vacíos
      if (resetTransactions) resetTransactions();
      if (resetAccounts) resetAccounts();
      if (resetDebts) resetDebts();
      if (resetInvestments) resetInvestments();
      if (resetRecurringPayments) resetRecurringPayments();
      if (resetSavingsGoals) resetSavingsGoals();
      if (resetBudgets) resetBudgets();

      if (setTransactions) setTransactions([]);
      if (setAccounts) setAccounts([]);
      if (setDebtsAndLoans) setDebtsAndLoans([]);
      if (setInvestments) setInvestments([]);
      if (setRecurringPayments) setRecurringPayments([]);
      if (setSavingsGoals) setSavingsGoals([]);
      if (setCategories) setCategories([]);
      if (setBudgets) setBudgets({ global: 0, categories: {} });

      // 4. Limpieza de bases de datos locales en IndexedDB preservando auth
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
        console.warn('Error clearing IndexedDB:', e);
      }

      // 5. Restablecer flag de reseteo para permitir nuevas operaciones normales
      if (isResettingRef) {
        setTimeout(() => {
          isResettingRef.current = false;
        }, 500);
      }

      // 6. Asegurar que el modal del tutorial permanezca cerrado y no se reactive tras el reseteo
      if (setShowTutorial) {
        setShowTutorial(false);
      }
      localStorage.setItem('presu_tutorial_completed', 'true');
      localStorage.setItem('has_completed_tutorial', 'true');
      localStorage.setItem('tutorial_completed', 'true');
      localStorage.setItem('hasSeenTutorial', 'true');
      localStorage.setItem('tutorial_seen', 'true');
      localStorage.setItem('app_onboarding_completed', 'true');
      localStorage.setItem('has_completed_onboarding', 'true');
      localStorage.setItem('hasCompletedOnboarding', 'true');
      if (user?.id && user.id !== 'local-user') {
        localStorage.setItem(`presu_tutorial_completed_${user.id}`, 'true');
        localStorage.setItem(`has_completed_tutorial_${user.id}`, 'true');
        localStorage.setItem(`tutorial_completed_${user.id}`, 'true');
        localStorage.setItem(`has_completed_onboarding_${user.id}`, 'true');
        localStorage.setItem(`hasCompletedOnboarding_${user.id}`, 'true');
      }

      // 7. Notificación de éxito al usuario manteniendo la pantalla y sesión activas
      toast.success('Todos los datos han sido restablecidos');
      return true;
    } catch (error) {
      console.error('Error al restablecer datos:', error);
      clearLocalDataPreservingAuth();
      if (setShowTutorial) {
        setShowTutorial(false);
      }
      if (isResettingRef) {
        isResettingRef.current = false;
      }
      toast.error('Error al restablecer los datos');
      return false;
    }
  }, [
    isResettingRef,
    user,
    setShowTutorial,
    clearLocalDataPreservingAuth,
    resetTransactions,
    resetAccounts,
    resetDebts,
    resetInvestments,
    resetRecurringPayments,
    resetSavingsGoals,
    resetBudgets,
    setTransactions,
    setAccounts,
    setDebtsAndLoans,
    setInvestments,
    setRecurringPayments,
    setSavingsGoals,
    setCategories,
    setBudgets
  ]);

  const handleFullReset = handleFactoryReset;
  const handleResetData = handleFactoryReset;

  // 2. Restauración e Importación de Respaldo (Backup)
  const handleRestoreBackup = useCallback((backupData) => {
    if (!backupData || !backupData.data) return;
    const d = backupData.data;

    if (d.transactions && setTransactions) setTransactions(d.transactions);
    if (d.accounts && setAccounts) setAccounts(d.accounts);
    if (d.categories && setCategories) setCategories(d.categories);
    if ((d.debtsAndLoans || d.debts) && setDebtsAndLoans) setDebtsAndLoans(d.debtsAndLoans || d.debts);
    if (d.investments && setInvestments) {
      setInvestments(d.investments);
      localStorage.setItem('investments_initialized', 'true');
      localStorage.setItem('user_investments', JSON.stringify(d.investments));
    }
    if (d.budgets && setBudgets) setBudgets(d.budgets);
    if (d.savingsGoals && setSavingsGoals) setSavingsGoals(d.savingsGoals);
    if ((d.recurring_payments || d.subscriptions) && setRecurringPayments) setRecurringPayments(d.recurring_payments || d.subscriptions);

    if (d.securitySettings && setSecuritySettings) {
      const rawPin = d.securitySettings.pin || '';
      const hasPin = Boolean(rawPin && String(rawPin).trim().length >= 4);
      const cleanSec = {
        pinEnabled: hasPin && Boolean(d.securitySettings.pinEnabled),
        pin: hasPin ? String(rawPin).trim() : '',
        biometricsEnabled: Boolean(d.securitySettings.biometricsEnabled)
      };
      setSecuritySettings(cleanSec);
      localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_ENABLED, cleanSec.pinEnabled ? 'true' : 'false');
      localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_CODE, cleanSec.pin);
      localStorage.setItem('security_pin_enabled', cleanSec.pinEnabled ? 'true' : 'false');
      localStorage.setItem('security_pin_code', cleanSec.pin);
      localStorage.setItem(STORAGE_KEYS.SECURITY_BIOMETRIC_ENABLED, cleanSec.biometricsEnabled ? 'true' : 'false');
    }

    if (d.trm && setTrm) setTrm(Number(d.trm) || 4000);
    if (d.theme && setTheme) setTheme(d.theme);

    // Almacenar en localStorage para asegurar persistencia inmediata con todas las claves y alias
    if (d.transactions) {
      const str = JSON.stringify(d.transactions);
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, str);
      localStorage.setItem('transactions', str);
      localStorage.setItem('app_transactions', str);
    }
    if (d.accounts) {
      const str = JSON.stringify(d.accounts);
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, str);
      localStorage.setItem('user_accounts', str);
      localStorage.setItem('accounts', str);
      localStorage.setItem('app_accounts', str);
    }
    if (d.categories) {
      const str = JSON.stringify(d.categories);
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, str);
      localStorage.setItem('categories', str);
      localStorage.setItem('app_categories', str);
    }
    if (d.debtsAndLoans || d.debts) {
      const debtsData = d.debtsAndLoans || d.debts;
      const str = JSON.stringify(debtsData);
      localStorage.setItem(STORAGE_KEYS.DEBTS, str);
      localStorage.setItem('user_debts', str);
      localStorage.setItem('debts', str);
      localStorage.setItem('app_loans', str);
    }
    if (d.investments) {
      const str = JSON.stringify(d.investments);
      localStorage.setItem('app_investments', str);
    }
    if (d.budgets) {
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(d.budgets));
      localStorage.setItem('budgets', JSON.stringify(d.budgets));
    }
    if (d.savingsGoals || d.savings || d.goals) {
      const sGoals = d.savingsGoals || d.savings || d.goals;
      localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, JSON.stringify(sGoals));
      localStorage.setItem('savings', JSON.stringify(sGoals));
      localStorage.setItem('goals', JSON.stringify(sGoals));
    }
    if (d.recurring_payments || d.subscriptions) {
      const recData = d.recurring_payments || d.subscriptions;
      const str = JSON.stringify(recData);
      localStorage.setItem('recurring_payments', str);
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, str);
      localStorage.setItem('subscriptions', str);
      localStorage.setItem('app_recurring', str);
    }
    if (d.userProfile || d.user || d.profile) {
      const prof = d.userProfile || d.user || d.profile;
      if (setUserProfile) setUserProfile(prof);
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(prof));
      if (prof.name) {
        localStorage.setItem('user_profile_name', prof.name);
        localStorage.setItem('user_name', prof.name);
      }
      localStorage.setItem('user', JSON.stringify(prof));
      localStorage.setItem('profile', JSON.stringify(prof));
    }
    if (d.securitySettings || d.security) {
      const sec = d.securitySettings || d.security;
      const rawPin = sec.pin || '';
      const hasPin = Boolean(rawPin && String(rawPin).trim().length >= 4);
      const cleanSec = {
        pinEnabled: hasPin && Boolean(sec.pinEnabled),
        pin: hasPin ? String(rawPin).trim() : '',
        biometricsEnabled: Boolean(sec.biometricsEnabled)
      };
      if (setSecuritySettings) setSecuritySettings(cleanSec);
      localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(cleanSec));
      localStorage.setItem('presu_security_v1', JSON.stringify(cleanSec));
      localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_ENABLED, cleanSec.pinEnabled ? 'true' : 'false');
      localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_CODE, cleanSec.pin);
      localStorage.setItem('security_pin_enabled', cleanSec.pinEnabled ? 'true' : 'false');
      localStorage.setItem('security_pin_code', cleanSec.pin);
      if (cleanSec.pin) {
        localStorage.setItem('user_pin', cleanSec.pin);
      } else {
        localStorage.removeItem('user_pin');
      }
    }
    if (d.trm) localStorage.setItem(STORAGE_KEYS.TRM, (d.trm || 4000).toString());
    if (d.theme) {
      localStorage.setItem(STORAGE_KEYS.THEME, d.theme);
      localStorage.setItem('app_theme', d.theme);
    }

    if (completeOnboarding) completeOnboarding(user?.id);
    localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false');

    if (setSelectedDay) setSelectedDay(null);
  }, [
    user,
    setTransactions,
    setAccounts,
    setCategories,
    setDebtsAndLoans,
    setInvestments,
    setBudgets,
    setSavingsGoals,
    setRecurringPayments,
    setSecuritySettings,
    setUserProfile,
    setTrm,
    setTheme,
    completeOnboarding,
    setSelectedDay
  ]);

  const handleImportBackup = handleRestoreBackup;

  // 3. Handler para completar el Onboarding inicial
  const handleOnboardingComplete = useCallback(async ({
    name,
    pin,
    biometricsEnabled,
    accounts: initialAccounts,
    userProfile: customProfile,
    securitySettings: customSec,
    enableDecimals,
    defaultCurrency,
    showTutorialAfter
  } = {}) => {
    // Configurar cuentas iniciales
    const finalAccounts = Array.isArray(initialAccounts) ? initialAccounts : [];
    if (setAccounts) setAccounts(finalAccounts);
    localStorage.setItem('presu_accounts', JSON.stringify(finalAccounts));
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(finalAccounts));
    localStorage.setItem('user_accounts', JSON.stringify(finalAccounts));
    localStorage.setItem('accounts', JSON.stringify(finalAccounts));
    saveAccountsToStorage(finalAccounts);

    // Asegurar colecciones en blanco al empezar desde cero
    if (resetTransactions) resetTransactions();
    if (resetDebts) resetDebts();
    if (resetInvestments) resetInvestments();

    const rawFullName = user?.user_metadata?.full_name ||
                        user?.user_metadata?.name ||
                        name ||
                        customProfile?.name ||
                        'Usuario';
    const finalName = rawFullName.trim();
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || customProfile?.photo || null;
    const initials = finalName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || finalName.slice(0, 2).toUpperCase();

    const newProfile = {
      name: finalName,
      photo: avatarUrl,
      initials
    };
    if (setUserProfile) setUserProfile(newProfile);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(newProfile));
    localStorage.setItem('user_profile_name', finalName);
    localStorage.setItem('user_name', finalName);

    const cleanPin = pin ? String(pin).trim() : '';
    const hasPin = Boolean(cleanPin && cleanPin.length >= 4);
    const newSec = {
      pinEnabled: hasPin,
      pin: hasPin ? cleanPin : '',
      biometricsEnabled: Boolean(biometricsEnabled)
    };
    if (setSecuritySettings) setSecuritySettings(newSec);
    localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_ENABLED, newSec.pinEnabled ? 'true' : 'false');
    localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_CODE, newSec.pin);
    localStorage.setItem('security_pin_enabled', newSec.pinEnabled ? 'true' : 'false');
    localStorage.setItem('security_pin_code', newSec.pin);
    localStorage.setItem(STORAGE_KEYS.SECURITY_BIOMETRIC_ENABLED, biometricsEnabled ? 'true' : 'false');
    localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(newSec));
    localStorage.setItem('presu_security_v1', JSON.stringify(newSec));

    if (enableDecimals !== undefined) {
      localStorage.setItem('app_enable_decimals', String(enableDecimals));
    }
    if (defaultCurrency) {
      localStorage.setItem('app_default_currency', defaultCurrency);
    }

    if (biometricsEnabled && typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials) {
      const alreadySaved = localStorage.getItem('security_biometric_cred_id');
      if (!alreadySaved) {
        try {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);
          const userId = new Uint8Array(16);
          window.crypto.getRandomValues(userId);
          const credential = await navigator.credentials.create({
            publicKey: {
              challenge,
              rp: { name: 'Presu App', id: window.location.hostname },
              user: { id: userId, name: finalName, displayName: finalName },
              pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
              authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
              timeout: 60000
            }
          });
          if (credential) {
            const rawIdArray = Array.from(new Uint8Array(credential.rawId));
            localStorage.setItem('security_biometric_cred_id', JSON.stringify(rawIdArray));
          }
        } catch (err) {
          console.warn('Biometría registrada para próximos accesos:', err);
        }
      }
    }

    // Marcar explícitamente como completado en storage y perfil
    if (completeOnboarding) completeOnboarding(user?.id);

    if (setIsLocked) setIsLocked(false);
    localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false');

    const isTutorialDone =
      localStorage.getItem('presu_tutorial_completed') === 'true' ||
      localStorage.getItem('has_completed_tutorial') === 'true' ||
      localStorage.getItem('tutorial_completed') === 'true';

    if (showTutorialAfter || !isTutorialDone) {
      if (setShowTutorial) setShowTutorial(true);
    }
  }, [
    user,
    setAccounts,
    resetTransactions,
    resetDebts,
    resetInvestments,
    setUserProfile,
    setSecuritySettings,
    completeOnboarding,
    setIsLocked,
    setShowTutorial
  ]);

  return {
    isResettingRef,
    handleFactoryReset,
    handleFullReset,
    handleResetData,
    handleRestoreBackup,
    handleImportBackup,
    handleOnboardingComplete
  };
}

export default useDataManagement;
