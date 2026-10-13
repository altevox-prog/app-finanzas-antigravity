import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePrivacy } from '../context/PrivacyContext';
import { useAuth } from '../context/AuthContext';
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
import { useSavingsGoals } from './useSavingsGoals';
import { useRecurringPayments } from './useRecurringPayments';
import { useInvestments } from './useInvestments';
import { useDebts } from './useDebts';
import { useAccounts } from './useAccounts';
import { useTransactions } from './useTransactions';
import { useFinanceAnalytics } from './useFinanceAnalytics';
import { useDateNavigation } from './useDateNavigation';
import { useDataManagement } from './useDataManagement';
import { useNavigationTabs } from './useNavigationTabs';
import { useFinancialOperations } from './useFinancialOperations';
import { useModalControls } from './useModalControls';
import { useDataSync } from './useDataSync';
import { useScrollRestoration } from './useScrollRestoration';

/**
 * useAppOrchestrator
 * Hook orquestador principal que centraliza todo el estado, ciclo de vida,
 * sincronización y callbacks de la aplicación para desacoplar App.jsx.
 */
export function useAppOrchestrator() {
  const { formatMoney } = usePrivacy();
  const { user, loading: authLoading, signOut } = useAuth();

  // Cierre de sesión seguro y desacoplado de la pantalla de bloqueo por PIN
  const handleGlobalLogout = useCallback(async () => {
    try {
      if (typeof signOut === 'function') {
        await signOut();
      }
      try {
        if (typeof window !== 'undefined') {
          Object.keys(localStorage).forEach((key) => {
            if (
              key.startsWith('sb-') ||
              key.includes('supabase') ||
              key.includes('auth-token')
            ) {
              localStorage.removeItem(key);
            }
          });
          sessionStorage.clear();
        }
      } catch (storageErr) {
        console.warn('Error limpiando auth tokens en storage:', storageErr);
      }
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  }, [signOut]);

  const { theme, setTheme, handleToggleTheme } = useTheme();

  // Gestión centralizada de modales, visibilidad y superposiciones
  const modalControls = useModalControls();
  const {
    isAddTxOpen,
    setIsAddTxOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isActionMenuOpen,
    setIsActionMenuOpen,
    handleOpenTransaction,
    handleOpenAddLoan,
    handleOpenAddDebt,
    handleOpenTransfer,
    handleOpenRecurring,
    handleOpenInvestment,
    handleOpenProfile,
    handleCloseAllModals
  } = modalControls;

  // PWA Update notification banner state
  const [hasPwaUpdate, setHasPwaUpdate] = useState(false);

  // Escuchar evento de nueva versión disponible de PWA
  useEffect(() => {
    const handleUpdate = () => {
      setHasPwaUpdate(true);
    };
    window.addEventListener('pwa-update-available', handleUpdate);
    return () => window.removeEventListener('pwa-update-available', handleUpdate);
  }, []);

  // Flag de control para evitar que useEffects sobreescriban localStorage durante un reset de fábrica
  const isResettingRef = useRef(false);

  const transactionsRef = useRef([]);
  const setTransactionsRef = useRef(null);

  // Sincronización y estado de la Tasa Representativa del Mercado (TRM)
  const { trm, setTrm, updateTRM } = useTRM(isResettingRef);

  // Estado y sincronización de Perfil de Usuario
  const {
    userProfile,
    setUserProfile,
    handleUpdateProfile
  } = useUserProfile({ user, isResettingRef });

  // Cuentas state & actions
  const {
    accounts,
    setAccounts,
    handleAddAccount,
    handleSaveAccount,
    handleUpdateAccount,
    handleDeleteAccount,
    deleteAccount,
    handleReorderAccounts,
    handleArchiveAccount,
    handleAdjustAccountBalance,
    resetAccounts
  } = useAccounts({
    isResettingRef,
    transactionsRef,
    setTransactionsRef,
    trm
  });

  // Transacciones state & actions
  const {
    transactions,
    setTransactions,
    handleAddTransaction: baseAddTransaction,
    handleSaveTransaction: baseSaveTransaction,
    handleUpdateTransaction: baseUpdateTransaction,
    handleDeleteTransaction: baseDeleteTransaction,
    handleExecuteTransfer: baseExecuteTransfer,
    resetTransactions
  } = useTransactions({
    isResettingRef,
    accounts,
    setAccounts,
    trm
  });

  transactionsRef.current = transactions;
  setTransactionsRef.current = setTransactions;

  // Gestión de categorías y subcategorías
  const {
    categories,
    setCategories,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleAddSubcategory,
    handleUpdateSubcategory,
    handleDeleteSubcategory,
    resetCategories
  } = useCategories({
    isResettingRef,
    onCategoryUpdated: (updatedCat) => {
      setTransactions((prev) =>
        prev.map((t) => (t.categoryId === updatedCat.id ? { ...t, categoryName: updatedCat.name } : t))
      );
    },
    onSubcategoryUpdated: (subcategoryId, newName) => {
      setTransactions((prev) =>
        prev.map((t) => (t.subcategoryId === subcategoryId ? { ...t, subcategoryName: newName.trim() } : t))
      );
    }
  });

  // Deudas y préstamos state & actions
  const {
    debtsAndLoans,
    setDebtsAndLoans,
    handleAddDebtOrLoan: baseAddDebtOrLoan,
    handleSaveLoan: baseSaveLoan,
    handleUpdateDebtOrLoan,
    handleAddPayment: baseAddPayment,
    handleDeletePayment: baseDeletePayment,
    handleAddDisbursement: baseAddDisbursement,
    handleDeleteDebtOrLoan: baseDeleteDebtOrLoan,
    resetDebts
  } = useDebts({
    isResettingRef,
    accounts,
    categories,
    setAccounts,
    setTransactions,
    setCategories
  });

  // Inversiones y portafolio state & actions
  const {
    investments,
    setInvestments,
    handleAddInvestment: baseAddInvestment,
    handleSaveInvestment: baseSaveInvestment,
    handleUpdateInvestment: baseUpdateInvestment,
    handleDeleteInvestment: baseDeleteInvestment,
    resetInvestments
  } = useInvestments(isResettingRef);

  // Orquestador central de operaciones financieras cruzadas
  const financialOps = useFinancialOperations({
    accounts,
    setAccounts,
    transactions,
    setTransactions,
    debtsAndLoans,
    setDebtsAndLoans,
    investments,
    setInvestments,
    categories,
    setCategories,
    trm,
    userProfile,
    isResettingRef,
    baseAddTransaction,
    baseSaveTransaction,
    baseUpdateTransaction,
    baseDeleteTransaction,
    baseExecuteTransfer,
    baseAddPayment,
    baseDeletePayment,
    baseAddDisbursement,
    baseAddInvestment,
    baseDeleteInvestment,
    baseAddDebtOrLoan,
    baseSaveLoan,
    baseDeleteDebtOrLoan
  });

  // Modo de visualización responsive y vistas fijas
  const {
    viewMode,
    isForcedMobile,
    isForcedDesktop,
    desktopOnlyClass,
    desktopBlockClass,
    mobileOnlyClass
  } = useViewMode();

  // Configuración y visibilidad de Widgets del Dashboard
  const {
    widgets,
    setWidgets,
    isEditWidgetsModalOpen,
    setIsEditWidgetsModalOpen
  } = useDashboardWidgets({ userId: user?.id, isResettingRef });

  // Control de estado de onboarding y tutorial
  const {
    isOnboardingActive,
    setIsOnboardingActive,
    showTutorial,
    setShowTutorial,
    completeOnboarding
  } = useOnboarding();

  // Security settings (PIN and Biometrics) y estado de bloqueo de app
  const {
    securitySettings,
    setSecuritySettings,
    isLocked,
    setIsLocked,
    handleUnlock,
    handleVerifyPin,
    handleUpdatePin,
    failedAttempts,
    lockApp
  } = useAppSecurity(isResettingRef);

  // Pagos recurrentes y suscripciones state & actions
  const {
    recurringPayments,
    setRecurringPayments,
    subscriptions,
    setSubscriptions,
    handleAddRecurring,
    handleSaveRecurring,
    handleUpdateRecurring,
    handleDeleteRecurring,
    handleToggleActiveRecurring,
    resetRecurringPayments
  } = useRecurringPayments(isResettingRef);

  // Presupuestos state & actions
  const {
    budgets,
    setBudgets,
    updateGlobalBudget,
    updateCategoryBudget,
    removeCategoryBudget,
    resetBudgets
  } = useBudgets(isResettingRef);

  // Metas de Ahorro state & actions
  const {
    savingsGoals,
    setSavingsGoals,
    handleAddGoal,
    handleUpdateGoal,
    handleDeleteGoal,
    handleContributeGoal,
    resetSavingsGoals
  } = useSavingsGoals(isResettingRef);

  // Control y navegación unificada de fechas
  const {
    selectedDate,
    setSelectedDate,
    selectedMonth,
    selectedYear,
    selectedDay,
    setSelectedDay,
    showMonthPicker,
    setShowMonthPicker,
    currentMonthLabel,
    handlePrevMonth,
    handleNextMonth,
    handleResetToToday,
    handleChangeMonth,
    handleSelectDay,
    handleClearSelectedDay
  } = useDateNavigation();

  // Gestión global de datos, reseteo de fábrica, respaldos y onboarding
  const {
    handleFactoryReset,
    handleFullReset,
    handleResetData,
    handleRestoreBackup,
    handleImportBackup,
    handleOnboardingComplete
  } = useDataManagement({
    isResettingRef,
    user,
    resetTransactions,
    resetAccounts,
    resetDebts,
    resetInvestments,
    resetRecurringPayments,
    resetSavingsGoals,
    resetBudgets,
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
  });

  // Sincronización en segundo plano con Supabase (Local-First Cloud Sync)
  const {
    syncStatus,
    syncUser,
    isCloudEnabled,
    pushLocalToCloud,
    pullCloudToLocal
  } = useDataSync({
    accounts,
    setAccounts,
    transactions,
    setTransactions,
    debtsAndLoans,
    setDebtsAndLoans,
    investments,
    setInvestments,
    recurringPayments,
    setRecurringPayments,
    budgets,
    setBudgets,
    categories,
    setCategories,
    savingsGoals,
    setSavingsGoals,
    userProfile,
    setUserProfile
  });

  // Cierre preventivo de menús y modales al cambiar de pestaña
  const handleCloseOverlaysOnTabChange = useCallback(() => {
    handleCloseAllModals();
    setIsEditWidgetsModalOpen(false);
  }, [handleCloseAllModals, setIsEditWidgetsModalOpen]);

  // Gestión centralizada de pestañas, scroll y reseteos
  const {
    activeTab,
    setActiveTab,
    tabResetKeys,
    handleTabChange,
    handleResetTab,
    mainContentRef,
    fromSettings,
    setFromSettings,
    handleGoBackFromSubView
  } = useNavigationTabs({
    initialTab: 'dashboard',
    onTabChange: handleCloseOverlaysOnTabChange,
    onOpenProfile: handleOpenProfile
  });

  // Restauración y persistencia ergonómica de posición de scroll por pestaña (Principio 9)
  useScrollRestoration(activeTab, mainContentRef);

  // Cálculos derivados y métricas analíticas memorizadas
  const {
    monthlyTransactions,
    scopedTransactions,
    monthlyStats,
    netWorth,
    taxMetrics
  } = useFinanceAnalytics({
    transactions,
    accounts,
    investments,
    debtsAndLoans,
    selectedDate,
    selectedMonth,
    selectedYear,
    selectedDay,
    trm
  });

  // Sistema de Alertas Preventivas y Notificaciones PWA
  const {
    tomorrowDebtAlerts,
    handleDismissAlert,
    handleReviewDebtAlert
  } = useDebtAlerts({
    debtsAndLoans,
    accounts,
    onNavigateToDebts: () => handleTabChange('debts')
  });

  // 1. Objeto consolidado y memorizado de datos financieros
  const financeData = useMemo(() => ({
    accounts,
    transactions,
    monthlyTransactions,
    scopedTransactions,
    categories,
    investments,
    debtsAndLoans,
    recurringPayments,
    subscriptions,
    budgets,
    savingsGoals,
    monthlyStats,
    netWorth,
    taxMetrics,
    trm,
    userProfile,
    selectedDate,
    selectedMonth,
    selectedYear,
    selectedDay,
    currentMonthLabel,
    widgets,
    tomorrowDebtAlerts,
    user,
    theme,
    securitySettings,
    isLocked,
    failedAttempts,
    showTutorial,
    syncStatus,
    syncUser,
    isCloudEnabled
  }), [
    accounts,
    transactions,
    monthlyTransactions,
    scopedTransactions,
    categories,
    investments,
    debtsAndLoans,
    recurringPayments,
    subscriptions,
    budgets,
    savingsGoals,
    monthlyStats,
    netWorth,
    taxMetrics,
    trm,
    userProfile,
    selectedDate,
    selectedMonth,
    selectedYear,
    selectedDay,
    currentMonthLabel,
    widgets,
    tomorrowDebtAlerts,
    user,
    theme,
    securitySettings,
    isLocked,
    failedAttempts,
    showTutorial,
    syncStatus,
    syncUser,
    isCloudEnabled
  ]);

  // 2. Objeto consolidado y memorizado de acciones y operaciones
  const financeActions = useMemo(() => ({
    ...financialOps,
    ...modalControls,
    handleTabChange,
    handleResetTab,
    setSelectedDate,
    setSelectedDay,
    setWidgets,
    setBudgets,
    setSubscriptions,
    setSecuritySettings,
    setTheme,
    setShowTutorial,
    showMonthPicker,
    setShowMonthPicker,
    isEditWidgetsModalOpen,
    setIsEditWidgetsModalOpen,
    handleUnlock,
    handleVerifyPin,
    handleUpdatePin,
    handleReviewDebtAlert,
    handleDismissAlert,
    formatMoney,
    handleGoBackFromSubView,
    fromSettings,
    setFromSettings,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleAddSubcategory,
    handleUpdateSubcategory,
    handleDeleteSubcategory,
    handleAddAccount,
    handleUpdateAccount,
    handleDeleteAccount,
    handleReorderAccounts,
    handleUpdateDebtOrLoan,
    handleUpdateInvestment: baseUpdateInvestment,
    handleAddRecurring,
    handleUpdateRecurring,
    handleDeleteRecurring,
    handleToggleActiveRecurring,
    handleAddGoal,
    handleUpdateGoal,
    handleDeleteGoal,
    handlePrevMonth,
    handleNextMonth,
    handleResetToToday,
    handleChangeMonth,
    handleRestoreBackup,
    handleResetData,
    handleUpdateProfile,
    pushLocalToCloud,
    pullCloudToLocal,
    onLogout: handleGlobalLogout
  }), [
    financialOps,
    modalControls,
    handleTabChange,
    handleResetTab,
    setSelectedDate,
    setSelectedDay,
    setWidgets,
    setBudgets,
    setSubscriptions,
    setSecuritySettings,
    setTheme,
    setShowTutorial,
    showMonthPicker,
    setShowMonthPicker,
    isEditWidgetsModalOpen,
    setIsEditWidgetsModalOpen,
    handleUnlock,
    handleVerifyPin,
    handleUpdatePin,
    handleReviewDebtAlert,
    handleDismissAlert,
    formatMoney,
    handleGoBackFromSubView,
    fromSettings,
    setFromSettings,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleAddSubcategory,
    handleUpdateSubcategory,
    handleDeleteSubcategory,
    handleAddAccount,
    handleUpdateAccount,
    handleDeleteAccount,
    handleReorderAccounts,
    handleUpdateDebtOrLoan,
    baseUpdateInvestment,
    handleAddRecurring,
    handleUpdateRecurring,
    handleDeleteRecurring,
    handleToggleActiveRecurring,
    handleAddGoal,
    handleUpdateGoal,
    handleDeleteGoal,
    handlePrevMonth,
    handleNextMonth,
    handleResetToToday,
    handleChangeMonth,
    handleRestoreBackup,
    handleResetData,
    handleUpdateProfile,
    pushLocalToCloud,
    pullCloudToLocal,
    handleGlobalLogout
  ]);

  return {
    // Auth & Onboarding
    user,
    authLoading,
    isOnboardingActive,
    handleOnboardingComplete,
    handleRestoreBackup,

    // Layout & ViewMode
    viewMode,
    isForcedMobile,
    isForcedDesktop,
    desktopOnlyClass,
    desktopBlockClass,
    mobileOnlyClass,

    // Navigation & Tabs
    activeTab,
    setActiveTab,
    tabResetKeys,
    handleTabChange,
    handleResetTab,
    mainContentRef,
    fromSettings,
    setFromSettings,
    handleGoBackFromSubView,

    // Theme & Security
    theme,
    setTheme,
    handleToggleTheme,
    securitySettings,
    setSecuritySettings,
    isLocked,
    setIsLocked,
    handleUnlock,
    handleVerifyPin,
    handleUpdatePin,
    failedAttempts,
    lockApp,
    handleGlobalLogout,

    // Modals & Controls
    modalControls,
    isAddTxOpen,
    setIsAddTxOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isActionMenuOpen,
    setIsActionMenuOpen,
    handleOpenTransaction,
    handleOpenAddLoan,
    handleOpenAddDebt,
    handleOpenTransfer,
    handleOpenRecurring,
    handleOpenInvestment,
    handleOpenProfile,
    handleCloseAllModals,

    // Date navigation
    selectedDate,
    setSelectedDate,
    selectedMonth,
    selectedYear,
    selectedDay,
    setSelectedDay,
    showMonthPicker,
    setShowMonthPicker,
    currentMonthLabel,
    handlePrevMonth,
    handleNextMonth,
    handleResetToToday,
    handleChangeMonth,
    handleSelectDay,
    handleClearSelectedDay,

    // Sync
    trm,
    setTrm,
    updateTRM,
    syncStatus,
    syncUser,
    isCloudEnabled,
    pushLocalToCloud,
    pullCloudToLocal,

    // Data entities
    accounts,
    setAccounts,
    transactions,
    setTransactions,
    categories,
    setCategories,
    debtsAndLoans,
    setDebtsAndLoans,
    investments,
    setInvestments,
    recurringPayments,
    setRecurringPayments,
    subscriptions,
    setSubscriptions,
    budgets,
    setBudgets,
    savingsGoals,
    setSavingsGoals,
    userProfile,
    setUserProfile,
    handleUpdateProfile,
    widgets,
    setWidgets,
    isEditWidgetsModalOpen,
    setIsEditWidgetsModalOpen,
    showTutorial,
    setShowTutorial,

    // Analytics & Alerts
    monthlyTransactions,
    scopedTransactions,
    monthlyStats,
    netWorth,
    taxMetrics,
    tomorrowDebtAlerts,
    handleDismissAlert,
    handleReviewDebtAlert,

    // PWA & Management
    hasPwaUpdate,
    setHasPwaUpdate,
    handleFullReset,
    handleFactoryReset,
    handleResetData,
    handleImportBackup,
    formatMoney,

    // Consolidated objects
    financeData,
    financeActions
  };
}

export default useAppOrchestrator;
