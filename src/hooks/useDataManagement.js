import { useRef, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { saveAccountsToStorage } from '../services/storageService';
import toast from '../utils/toast';
import {
  clearLocalDataPreservingAuth,
  clearIndexedDatabases,
  clearRemoteUserData
} from '../services/storage/storageCleaner';
import {
  restoreBackupData,
  setupOnboardingProfileAndSecurity
} from '../services/storage/backupRestorer';
import { registerBiometrics } from '../services/storage/biometricAuth';

/**
 * useDataManagement
 * Hook orquestador para el mantenimiento y ciclo de vida de datos:
 * - Reset de fábrica con purga local/remota preservando sesión.
 * - Importación y restauración de copias de seguridad.
 * - Finalización y configuración del Onboarding inicial.
 */
export function useDataManagement({
  isResettingRef: externalIsResettingRef,
  user,
  resetTransactions, resetAccounts, resetDebts, resetInvestments, resetRecurringPayments, resetSavingsGoals, resetBudgets,
  setTransactions, setAccounts, setCategories, setDebtsAndLoans, setInvestments, setBudgets, setSavingsGoals,
  setRecurringPayments, setUserProfile, setSecuritySettings, setTrm, setTheme, setSelectedDay, setIsLocked, setShowTutorial, completeOnboarding
} = {}) {
  const internalIsResettingRef = useRef(false);
  const isResettingRef = externalIsResettingRef || internalIsResettingRef;

  // 1. Reset de Datos (Preservando sesión activa y eliminando registros en Supabase)
  const handleFactoryReset = useCallback(async (skipConfirm = false) => {
    if (!skipConfirm) {
      const msg = '¿Estás seguro de restablecer todos los datos? Se borrarán todas las transacciones, cuentas, deudas e inversiones en la nube y en este dispositivo. Tu sesión continuará activa.';
      const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(msg) : true;
      if (!confirmed) return false;
    }

    try {
      if (isResettingRef) isResettingRef.current = true;
      const targetUserId = user?.id && user.id !== 'local-user' ? user.id : null;
      if (targetUserId) await clearRemoteUserData(targetUserId);

      clearLocalDataPreservingAuth(user);

      [resetTransactions, resetAccounts, resetDebts, resetInvestments, resetRecurringPayments, resetSavingsGoals, resetBudgets].forEach(fn => fn?.());
      [setTransactions, setAccounts, setDebtsAndLoans, setInvestments, setRecurringPayments, setSavingsGoals, setCategories].forEach(fn => fn?.([]));
      setBudgets?.({ global: 0, categories: {} });

      await clearIndexedDatabases();

      if (isResettingRef) setTimeout(() => { isResettingRef.current = false; }, 500);
      setShowTutorial?.(false);
      toast.success('Todos los datos han sido restablecidos');
      return true;
    } catch (error) {
      console.error('[useDataManagement] Error al restablecer datos:', error);
      clearLocalDataPreservingAuth(user);
      setShowTutorial?.(false);
      if (isResettingRef) isResettingRef.current = false;
      toast.error('Error al restablecer los datos');
      return false;
    }
  }, [
    isResettingRef, user, setShowTutorial,
    resetTransactions, resetAccounts, resetDebts, resetInvestments, resetRecurringPayments, resetSavingsGoals, resetBudgets,
    setTransactions, setAccounts, setDebtsAndLoans, setInvestments, setRecurringPayments, setSavingsGoals, setCategories, setBudgets
  ]);

  const handleFullReset = handleFactoryReset;
  const handleResetData = handleFactoryReset;

  // 2. Restauración e Importación de Respaldo (Backup)
  const handleRestoreBackup = useCallback((backupData) => {
    return restoreBackupData(backupData, {
      setTransactions, setAccounts, setCategories, setDebtsAndLoans, setInvestments,
      setBudgets, setSavingsGoals, setRecurringPayments, setUserProfile, setSecuritySettings,
      setTrm, setTheme, completeOnboarding, setSelectedDay, userId: user?.id
    });
  }, [
    user?.id, setTransactions, setAccounts, setCategories, setDebtsAndLoans, setInvestments,
    setBudgets, setSavingsGoals, setRecurringPayments, setUserProfile, setSecuritySettings,
    setTrm, setTheme, completeOnboarding, setSelectedDay
  ]);

  const handleImportBackup = handleRestoreBackup;

  // 3. Handler para completar el Onboarding inicial
  const handleOnboardingComplete = useCallback(async ({
    name, pin, biometricsEnabled, accounts = [], userProfile: customProfile,
    enableDecimals, defaultCurrency, showTutorialAfter
  } = {}) => {
    const finalAccounts = Array.isArray(accounts) ? accounts : [];
    setAccounts?.(finalAccounts);
    saveAccountsToStorage(finalAccounts);
    ['presu_accounts', STORAGE_KEYS.ACCOUNTS, 'user_accounts', 'accounts'].forEach(k => localStorage.setItem(k, JSON.stringify(finalAccounts)));

    [resetTransactions, resetDebts, resetInvestments].forEach(fn => fn?.());

    const { finalName } = setupOnboardingProfileAndSecurity({
      user, name, customProfile, pin, biometricsEnabled, setUserProfile, setSecuritySettings
    });

    if (enableDecimals !== undefined) localStorage.setItem('app_enable_decimals', String(enableDecimals));
    if (defaultCurrency) localStorage.setItem('app_default_currency', defaultCurrency);
    if (biometricsEnabled) await registerBiometrics(finalName);

    completeOnboarding?.(user?.id);
    setIsLocked?.(false);
    localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false');

    const isTutorialDone = ['presu_tutorial_completed', 'has_completed_tutorial', 'tutorial_completed'].some(k => localStorage.getItem(k) === 'true');
    if (showTutorialAfter || !isTutorialDone) setShowTutorial?.(true);
  }, [user, setAccounts, resetTransactions, resetDebts, resetInvestments, setUserProfile, setSecuritySettings, completeOnboarding, setIsLocked, setShowTutorial]);

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
