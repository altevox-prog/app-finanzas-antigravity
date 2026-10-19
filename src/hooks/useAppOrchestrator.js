import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivacy } from '../context/PrivacyContext';
import { useAuth } from '../context/AuthContext';
import { clearSessionFinancialStorage } from '../services/storage/storageCleaner';
import { useViewMode } from './useViewMode';
import { useDebtAlerts } from './useDebtAlerts';
import { useTheme } from './useTheme';
import { useAppSecurity } from './useAppSecurity';
import { useOnboarding } from './useOnboarding';
import { useDashboardWidgets } from './useDashboardWidgets';
import { useUserProfile } from './useUserProfile';
import { useTRM } from './useTRM';
import { useCategories } from './useCategories';
import { useBudgets } from './useBudgets';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { INITIAL_SAVINGS_GOALS } from '../data/initialData';
import { useRecurringPayments } from './useRecurringPayments';

function getInitialSavingsGoals() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SAVINGS_GOALS) ||
                  localStorage.getItem('savingsGoals') ||
                  localStorage.getItem('savings') ||
                  localStorage.getItem('goals');
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error parseando metas de ahorro:', e);
  }
  return INITIAL_SAVINGS_GOALS;
}

function sanitizeGoal(goal) {
  const rawDate = goal.target_date || goal.dueDate || goal.deadline || '';
  let safeDate = '';
  if (rawDate) {
    try {
      safeDate = new Date(rawDate).toISOString().split('T')[0];
    } catch {
      safeDate = String(rawDate).split('T')[0];
    }
  }
  return {
    ...goal,
    id: goal.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `goal-${Date.now()}`),
    target_date: safeDate,
    dueDate: safeDate,
    deadline: safeDate,
    target_account_id: goal.target_account_id || goal.targetAccountId || null,
    targetAccountId: goal.target_account_id || goal.targetAccountId || null,
    months: goal.months ? Number(goal.months) : 6,
    notification_day: goal.notification_day ? Number(goal.notification_day) : (goal.notificationDay ? Number(goal.notificationDay) : 15),
    notificationDay: goal.notification_day ? Number(goal.notification_day) : (goal.notificationDay ? Number(goal.notificationDay) : 15),
    notify_enabled: goal.notify_enabled !== undefined ? Boolean(goal.notify_enabled) : (goal.notifyEnabled !== undefined ? Boolean(goal.notifyEnabled) : true),
    notifyEnabled: goal.notify_enabled !== undefined ? Boolean(goal.notify_enabled) : (goal.notifyEnabled !== undefined ? Boolean(goal.notifyEnabled) : true)
  };
}
import { useInvestments } from './useInvestments';
import useInvestmentQuotes from '../components/investments/hooks/useInvestmentQuotes';
import { useDebts } from './useDebts';
import { useAccounts } from './useAccounts';
import { useTransactions } from './useTransactions';
import { useFinanceAnalytics } from './useFinanceAnalytics';
import { useDateNavigation } from './useDateNavigation';
import { useDataManagement } from './useDataManagement';
import { useNavigationTabs } from './useNavigationTabs';
import { useModalControls } from './useModalControls';
import { useDataSync } from './useDataSync';
import { useScrollRestoration } from './useScrollRestoration';
import { useFinanceContext } from './useFinanceContext';
import { processDueRecurringPayments } from '../services/recurring/recurringAutoProcessor';

/**
 * useAppOrchestrator
 * Hook orquestador principal que centraliza todo el estado, ciclo de vida,
 * sincronización y callbacks de la aplicación para desacoplar App.jsx.
 */
export function useAppOrchestrator() {
  const { formatMoney } = usePrivacy();
  const { user, setUser, loading: authLoading, signOut } = useAuth();

  const { theme, setTheme, handleToggleTheme } = useTheme();

  // Gestión centralizada de modales, visibilidad y superposiciones
  const modalControls = useModalControls();
  const {
    isAddTxOpen, setIsAddTxOpen, isSettingsOpen, setIsSettingsOpen,
    isActionMenuOpen, setIsActionMenuOpen, handleOpenTransaction,
    handleOpenAddLoan, handleOpenAddDebt, handleOpenTransfer,
    handleOpenRecurring, handleOpenInvestment, handleOpenProfile, handleCloseAllModals
  } = modalControls;

  // PWA Update notification banner state
  const [hasPwaUpdate, setHasPwaUpdate] = useState(false);
  useEffect(() => {
    const handleUpdate = () => setHasPwaUpdate(true);
    window.addEventListener('pwa-update-available', handleUpdate);
    return () => window.removeEventListener('pwa-update-available', handleUpdate);
  }, []);

  // Flags de control para evitar sobreescritura de almacenamiento
  const isResettingRef = useRef(false);
  const transactionsRef = useRef([]);
  const setTransactionsRef = useRef(null);

  // Sincronización y estado de la Tasa Representativa del Mercado (TRM)
  const { trm, setTrm, updateTRM } = useTRM(isResettingRef);

  // Estado y sincronización de Perfil de Usuario
  const { userProfile, setUserProfile, handleUpdateProfile } = useUserProfile({ user, isResettingRef });

  // Cuentas state & actions
  const {
    accounts, setAccounts, handleAddAccount, handleSaveAccount, handleUpdateAccount,
    handleDeleteAccount, deleteAccount, handleReorderAccounts, updateAccountsOrder,
    fetchAccounts, handleArchiveAccount, handleAdjustAccountBalance, resetAccounts
  } = useAccounts({ isResettingRef, transactionsRef, setTransactionsRef, trm });

  // Transacciones state & actions
  const {
    transactions, setTransactions, handleAddTransaction: baseAddTransaction,
    handleSaveTransaction: baseSaveTransaction, handleUpdateTransaction: baseUpdateTransaction,
    handleDeleteTransaction: baseDeleteTransaction, handleExecuteTransfer: baseExecuteTransfer, resetTransactions
  } = useTransactions({ isResettingRef, accounts, setAccounts, trm });

  transactionsRef.current = transactions;
  setTransactionsRef.current = setTransactions;

  // Gestión de categorías y subcategorías
  const {
    categories, setCategories, handleAddCategory, handleUpdateCategory, handleDeleteCategory,
    handleAddSubcategory, handleUpdateSubcategory, handleDeleteSubcategory, resetCategories
  } = useCategories({
    isResettingRef,
    onCategoryUpdated: (cat) => setTransactions(prev => prev.map(t => t.categoryId === cat.id ? { ...t, categoryName: cat.name } : t)),
    onSubcategoryUpdated: (subId, name) => setTransactions(prev => prev.map(t => t.subcategoryId === subId ? { ...t, subcategoryName: name.trim() } : t))
  });

  // Deudas y préstamos state & actions
  const {
    debtsAndLoans, setDebtsAndLoans, handleAddDebtOrLoan: baseAddDebtOrLoan, handleSaveLoan: baseSaveLoan,
    handleUpdateDebtOrLoan, handleAddPayment: baseAddPayment, handleDeletePayment: baseDeletePayment,
    handleAddDisbursement: baseAddDisbursement, handleDeleteDebtOrLoan: baseDeleteDebtOrLoan, resetDebts
  } = useDebts({ isResettingRef, accounts, categories, setAccounts, setTransactions, setCategories });

  // Inversiones y portafolio state & actions
  const {
    investments, setInvestments, handleAddInvestment: baseAddInvestment, handleSaveInvestment: baseSaveInvestment,
    handleUpdateInvestment: baseUpdateInvestment, handleDeleteInvestment: baseDeleteInvestment, resetInvestments
  } = useInvestments(isResettingRef);

  // Cotizaciones de mercado en tiempo real para activos de inversión
  const { livePrices, handleRefreshQuotes, isRefreshing: isRefreshingQuotes } = useInvestmentQuotes({ investments });

  // Modo de visualización responsive y vistas fijas
  const { viewMode, isForcedMobile, isForcedDesktop, desktopOnlyClass, desktopBlockClass, mobileOnlyClass } = useViewMode();

  // Configuración y visibilidad de Widgets del Dashboard
  const { widgets, setWidgets, isEditWidgetsModalOpen, setIsEditWidgetsModalOpen } = useDashboardWidgets({ userId: user?.id, isResettingRef });

  // Control de estado de onboarding y tutorial
  const { isOnboardingActive, setIsOnboardingActive, isOnboardingLoading, showTutorial, setShowTutorial, completeOnboarding } = useOnboarding({ user });

  // Security settings (PIN and Biometrics) y estado de bloqueo de app
  const {
    securitySettings, setSecuritySettings, isLocked, setIsLocked,
    handleUnlock, handleVerifyPin, handleUpdatePin, failedAttempts, lockApp
  } = useAppSecurity(isResettingRef);

  // Pagos recurrentes y suscripciones state & actions
  const {
    recurringPayments, setRecurringPayments, subscriptions, setSubscriptions,
    handleAddRecurring, handleSaveRecurring, handleUpdateRecurring, handleDeleteRecurring,
    handleToggleActiveRecurring, resetRecurringPayments
  } = useRecurringPayments(isResettingRef);

  // Evaluación y ejecución automática de movimientos recurrentes vencidos
  useEffect(() => {
    if (isResettingRef?.current || !recurringPayments || recurringPayments.length === 0) return;
    processDueRecurringPayments({
      recurringPayments,
      onAddTransaction: baseAddTransaction,
      onUpdateRecurring: handleUpdateRecurring
    });
  }, [recurringPayments, baseAddTransaction, handleUpdateRecurring, isResettingRef]);

  // Presupuestos & Metas state & actions
  const { budgets, setBudgets, updateGlobalBudget, updateCategoryBudget, removeCategoryBudget, resetBudgets } = useBudgets(isResettingRef);
  
  // Metas de ahorro state & actions
  const [savingsGoals, setSavingsGoals] = useState(getInitialSavingsGoals);

  // Persistencia reactiva en localStorage de metas de ahorro
  useEffect(() => {
    if (isResettingRef?.current) return;
    try {
      const serialized = JSON.stringify(savingsGoals);
      localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, serialized);
      localStorage.setItem('savingsGoals', serialized);
      localStorage.setItem('savings', serialized);
      localStorage.setItem('goals', serialized);
    } catch (e) {
      console.error('Error guardando metas de ahorro:', e);
    }
  }, [savingsGoals, isResettingRef]);

  const handleAddGoal = useCallback(async (newGoal) => {
    const goalItem = sanitizeGoal(newGoal);
    setSavingsGoals((prev) => [goalItem, ...(prev || []).filter((g) => g.id !== goalItem.id)]);
    return goalItem;
  }, []);

  const handleUpdateGoal = useCallback(async (updatedGoal) => {
    const goalItem = sanitizeGoal(updatedGoal);
    setSavingsGoals((prev) => (prev || []).map((g) => (g.id === goalItem.id ? goalItem : g)));
    return goalItem;
  }, []);

  const handleDeleteGoal = useCallback(async (goalId) => {
    setSavingsGoals((prev) => (prev || []).filter((g) => g.id !== goalId));
  }, []);

  const handleContributeGoal = useCallback(async (goalId, amount) => {
    const val = Number(amount) || 0;
    if (val <= 0) return;
    setSavingsGoals((prev) => (prev || []).map((g) => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        currentAmount: (Number(g.currentAmount) || 0) + val
      };
    }));
  }, []);

  const resetSavingsGoals = useCallback(() => {
    setSavingsGoals(INITIAL_SAVINGS_GOALS);
    try {
      const serialized = JSON.stringify(INITIAL_SAVINGS_GOALS);
      localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, serialized);
      localStorage.setItem('savingsGoals', serialized);
      localStorage.setItem('savings', serialized);
      localStorage.setItem('goals', serialized);
    } catch {}
  }, []);

  // Control y navegación unificada de fechas
  const {
    selectedDate, setSelectedDate, selectedMonth, selectedYear, selectedDay, setSelectedDay,
    showMonthPicker, setShowMonthPicker, currentMonthLabel, handlePrevMonth, handleNextMonth,
    handleResetToToday, handleChangeMonth, handleSelectDay, handleClearSelectedDay
  } = useDateNavigation();

  // Gestión global de datos, reseteo de fábrica, respaldos y onboarding
  const {
    handleFactoryReset, handleFullReset, handleResetData, handleRestoreBackup, handleImportBackup, handleOnboardingComplete
  } = useDataManagement({
    isResettingRef, user, resetTransactions, resetAccounts, resetDebts, resetInvestments, resetRecurringPayments,
    resetSavingsGoals, resetBudgets, setTransactions, setAccounts, setCategories, setDebtsAndLoans, setInvestments,
    setBudgets, setSavingsGoals, setRecurringPayments, setUserProfile, setSecuritySettings, setTrm, setTheme,
    setSelectedDay, setIsLocked, setShowTutorial, completeOnboarding
  });

  // Limpieza total y reactiva de los estados financieros de React a cero
  const resetAllFinancialStates = useCallback(() => {
    if (isResettingRef) isResettingRef.current = true;
    try {
      if (typeof resetTransactions === 'function') resetTransactions();
      if (typeof resetAccounts === 'function') resetAccounts();
      if (typeof resetDebts === 'function') resetDebts();
      if (typeof resetInvestments === 'function') resetInvestments();
      if (typeof resetRecurringPayments === 'function') resetRecurringPayments();
      if (typeof resetSavingsGoals === 'function') resetSavingsGoals();
      if (typeof resetBudgets === 'function') resetBudgets();
      if (typeof resetCategories === 'function') resetCategories();

      if (typeof setTransactions === 'function') setTransactions([]);
      if (typeof setAccounts === 'function') setAccounts([]);
      if (typeof setDebtsAndLoans === 'function') setDebtsAndLoans([]);
      if (typeof setInvestments === 'function') setInvestments([]);
      if (typeof setRecurringPayments === 'function') setRecurringPayments([]);
      if (typeof setSavingsGoals === 'function') setSavingsGoals([]);
      if (typeof setCategories === 'function') setCategories([]);
      if (typeof setBudgets === 'function') setBudgets({ global: 0, categories: {} });
      if (typeof setUserProfile === 'function') setUserProfile({ name: 'Usuario', email: '' });
      if (typeof setIsLocked === 'function') setIsLocked(false);
      if (typeof setSecuritySettings === 'function') setSecuritySettings({ pinEnabled: false, pin: '', biometricsEnabled: false });
    } catch (resetErr) {
      console.warn('[useAppOrchestrator] Error al resetear estados de React:', resetErr);
    } finally {
      setTimeout(() => {
        if (isResettingRef) isResettingRef.current = false;
      }, 300);
    }
  }, [
    isResettingRef, resetTransactions, resetAccounts, resetDebts, resetInvestments,
    resetRecurringPayments, resetSavingsGoals, resetBudgets, resetCategories,
    setTransactions, setAccounts, setDebtsAndLoans, setInvestments,
    setRecurringPayments, setSavingsGoals, setCategories, setBudgets,
    setUserProfile, setIsLocked, setSecuritySettings
  ]);

  // Cierre de sesión seguro, reactivo y desacoplado (sin recarga forzada)
  const handleGlobalLogout = useCallback(async () => {
    try {
      resetAllFinancialStates();
      clearSessionFinancialStorage();
      if (typeof signOut === 'function') {
        await signOut();
      }
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  }, [resetAllFinancialStates, signOut]);

  // Escuchar evento monety:signout en caso de que signOut provenga de otra fuente
  useEffect(() => {
    const handleSignoutEvent = () => {
      resetAllFinancialStates();
    };
    window.addEventListener('monety:signout', handleSignoutEvent);
    return () => window.removeEventListener('monety:signout', handleSignoutEvent);
  }, [resetAllFinancialStates]);

  // Sincronización en segundo plano con Supabase (Local-First Cloud Sync)
  const { syncStatus, syncUser, isCloudEnabled, pushLocalToCloud, pullCloudToLocal } = useDataSync({
    accounts, setAccounts, transactions, setTransactions, debtsAndLoans, setDebtsAndLoans,
    investments, setInvestments, recurringPayments, setRecurringPayments, budgets, setBudgets,
    categories, setCategories, savingsGoals, setSavingsGoals, userProfile, setUserProfile
  });

  // Cierre preventivo de menús y modales al cambiar de pestaña
  const handleCloseOverlaysOnTabChange = useCallback(() => {
    handleCloseAllModals();
    setIsEditWidgetsModalOpen(false);
  }, [handleCloseAllModals, setIsEditWidgetsModalOpen]);

  // Gestión centralizada de pestañas, scroll y reseteos
  const {
    activeTab, setActiveTab, tabResetKeys, handleTabChange, handleResetTab,
    mainContentRef, fromSettings, setFromSettings, handleGoBackFromSubView, debtsInitialTab
  } = useNavigationTabs({
    initialTab: 'dashboard',
    onTabChange: handleCloseOverlaysOnTabChange,
    onOpenProfile: handleOpenProfile
  });

  // Restauración y persistencia ergonómica de posición de scroll por pestaña (Principio 9)
  useScrollRestoration(activeTab, mainContentRef);

  // Cálculos derivados y métricas analíticas memorizadas
  const { monthlyTransactions, scopedTransactions, monthlyStats, netWorth, taxMetrics } = useFinanceAnalytics({
    transactions, accounts, investments, debtsAndLoans, selectedDate, selectedMonth, selectedYear, selectedDay, trm, livePrices
  });

  // Sistema de Alertas Preventivas y Notificaciones PWA
  const { tomorrowDebtAlerts, handleDismissAlert, handleReviewDebtAlert } = useDebtAlerts({
    debtsAndLoans, accounts, onNavigateToDebts: () => handleTabChange('debts')
  });

  // Orquestación centralizada de operaciones financieras y contextos memorizados
  const { financeData, financeActions, financialOps } = useFinanceContext({
    accounts, setAccounts, transactions, setTransactions, categories, setCategories, debtsAndLoans, setDebtsAndLoans,
    investments, setInvestments, recurringPayments, setRecurringPayments, subscriptions, setSubscriptions,
    budgets, setBudgets, savingsGoals, setSavingsGoals, userProfile, setUserProfile, trm, user, theme, setTheme,
    securitySettings, setSecuritySettings, isLocked, failedAttempts, showTutorial, setShowTutorial, isResettingRef,
    baseAddTransaction, baseSaveTransaction, baseUpdateTransaction, baseDeleteTransaction, baseExecuteTransfer,
    baseAddPayment, baseDeletePayment, baseAddDisbursement, baseAddInvestment, baseSaveInvestment, baseUpdateInvestment,
    baseDeleteInvestment, baseAddDebtOrLoan, baseSaveLoan, baseDeleteDebtOrLoan, handleAddCategory, handleUpdateCategory,
    handleDeleteCategory, handleAddSubcategory, handleUpdateSubcategory, handleDeleteSubcategory, handleAddAccount,
    handleUpdateAccount, handleDeleteAccount, handleReorderAccounts, updateAccountsOrder, fetchAccounts,
    handleUpdateDebtOrLoan, handleAddRecurring,
    handleUpdateRecurring, handleDeleteRecurring, handleToggleActiveRecurring, handleAddGoal, handleUpdateGoal,
    handleDeleteGoal, handleUpdateProfile, handleRestoreBackup, handleResetData, pushLocalToCloud, pullCloudToLocal,
    handleGlobalLogout, syncStatus, syncUser, isCloudEnabled, selectedDate, setSelectedDate, selectedMonth, selectedYear,
    selectedDay, setSelectedDay, showMonthPicker, setShowMonthPicker, currentMonthLabel, handlePrevMonth, handleNextMonth,
    handleResetToToday, handleChangeMonth, widgets, setWidgets, isEditWidgetsModalOpen, setIsEditWidgetsModalOpen,
    tomorrowDebtAlerts, handleDismissAlert, handleReviewDebtAlert, formatMoney, fromSettings, setFromSettings,
    handleGoBackFromSubView, handleUnlock, handleVerifyPin, handleUpdatePin, monthlyTransactions, scopedTransactions,
    monthlyStats, netWorth, taxMetrics, activeTab, handleTabChange, handleResetTab, modalControls,
    livePrices
  });

  return {
    user, setUser, authLoading, isOnboardingActive, isOnboardingLoading, handleOnboardingComplete, handleRestoreBackup, viewMode, isForcedMobile,
    isForcedDesktop, desktopOnlyClass, desktopBlockClass, mobileOnlyClass, activeTab, setActiveTab, tabResetKeys,
    handleTabChange, handleResetTab, mainContentRef, fromSettings, setFromSettings, handleGoBackFromSubView, debtsInitialTab, theme,
    setTheme, handleToggleTheme, securitySettings, setSecuritySettings, isLocked, setIsLocked, handleUnlock,
    handleVerifyPin, handleUpdatePin, failedAttempts, lockApp, handleGlobalLogout, modalControls, isAddTxOpen,
    setIsAddTxOpen, isSettingsOpen, setIsSettingsOpen, isActionMenuOpen, setIsActionMenuOpen, handleOpenTransaction,
    handleOpenAddLoan, handleOpenAddDebt, handleOpenTransfer, handleOpenRecurring, handleOpenInvestment,
    handleOpenProfile, handleCloseAllModals, selectedDate, setSelectedDate, selectedMonth, selectedYear, selectedDay,
    setSelectedDay, showMonthPicker, setShowMonthPicker, currentMonthLabel, handlePrevMonth, handleNextMonth,
    handleResetToToday, handleChangeMonth, handleSelectDay, handleClearSelectedDay, trm, setTrm, updateTRM, syncStatus,
    syncUser, isCloudEnabled, pushLocalToCloud, pullCloudToLocal, accounts, setAccounts, transactions, setTransactions,
    categories, setCategories, debtsAndLoans, setDebtsAndLoans, investments, setInvestments, recurringPayments,
    setRecurringPayments, subscriptions, setSubscriptions, budgets, setBudgets, savingsGoals, setSavingsGoals,
    userProfile, setUserProfile, handleUpdateProfile, widgets, setWidgets, isEditWidgetsModalOpen,
    setIsEditWidgetsModalOpen, showTutorial, setShowTutorial, monthlyTransactions, scopedTransactions, monthlyStats,
    netWorth, taxMetrics, tomorrowDebtAlerts, handleDismissAlert, handleReviewDebtAlert, hasPwaUpdate, setHasPwaUpdate,
    handleFullReset, handleFactoryReset, handleResetData, handleImportBackup, formatMoney, financeData, financeActions,
    financialOps, handleReorderAccounts, updateAccountsOrder, fetchAccounts,
    livePrices, handleRefreshQuotes, isRefreshingQuotes
  };
}

export default useAppOrchestrator;
