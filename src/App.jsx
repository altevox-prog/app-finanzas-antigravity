import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppHeader, BottomNav, DesktopSidebar } from './components/layout';
import { ViewRouter } from './views';
import SplashScreen from './components/SplashScreen';
import OnboardingWizard from './components/OnboardingWizard';
import { ModalContainer } from './components/modals';
import QuickActionsModal from './components/QuickActionsModal';
import { usePrivacy } from './context/PrivacyContext';
import SyncStatusBadge from './components/SyncStatusBadge';
import { useAuth } from './context/AuthContext';
import { RotateCcw, RefreshCw, X } from 'lucide-react';
import Toaster from './components/Toaster';
import { toast } from './utils/toast';
import { useViewMode } from './hooks/useViewMode';
import { useDebtAlerts } from './hooks/useDebtAlerts';
import { useTheme } from './hooks/useTheme';
import { useAppSecurity } from './hooks/useAppSecurity';
import { useOnboarding } from './hooks/useOnboarding';
import { useDashboardWidgets } from './hooks/useDashboardWidgets';
import { useUserProfile } from './hooks/useUserProfile';
import { useTRM } from './hooks/useTRM';
import { useCategories } from './hooks/useCategories';
import { useBudgets } from './hooks/useBudgets';
import { useSavingsGoals } from './hooks/useSavingsGoals';
import { useRecurringPayments } from './hooks/useRecurringPayments';
import { useInvestments } from './hooks/useInvestments';
import { useDebts } from './hooks/useDebts';
import { useAccounts } from './hooks/useAccounts';
import { useTransactions } from './hooks/useTransactions';
import { useFinanceAnalytics } from './hooks/useFinanceAnalytics';
import { useDateNavigation } from './hooks/useDateNavigation';
import { useDataManagement } from './hooks/useDataManagement';
import { useNavigationTabs } from './hooks/useNavigationTabs';
import { useFinancialOperations } from './hooks/useFinancialOperations';
import { useModalControls } from './hooks/useModalControls';
import { useDataSync } from './hooks/useDataSync';

export default function App() {
  const { formatMoney } = usePrivacy();
  const { user, loading: authLoading } = useAuth();
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

  // Sincronización en segundo plano con Supabase (Desconectado / Modo 100% Local-First)
  const {
    syncStatus,
    syncUser,
    isCloudEnabled,
    pushLocalToCloud,
    pullCloudToLocal
  } = useDataSync();

  // Cierre preventivo de menús y modales al cambiar de pestaña
  const handleCloseOverlaysOnTabChange = useCallback(() => {
    handleCloseAllModals();
    setIsEditWidgetsModalOpen(false);
    setSelectedDay(null);
  }, [handleCloseAllModals, setIsEditWidgetsModalOpen, setSelectedDay]);

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

  // Cálculos derivados y métricas analíticas memorizadas
  const {
    monthlyTransactions,
    scopedTransactions,
    monthlyStats,
    netWorth,
    taxMetrics  } = useFinanceAnalytics({
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
    pullCloudToLocal
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
    pullCloudToLocal
  ]);
  if (authLoading) {
    return <SplashScreen message="Verificando tu espacio..." />;
  }

  // 2. Si el Onboarding está activo y no hay usuario autenticado, mostrar la pantalla de bienvenida
  if (isOnboardingActive && (!user || user.id === 'local-user')) {
    return (
      <OnboardingWizard 
        onComplete={handleOnboardingComplete} 
        onRestoreBackup={handleRestoreBackup} 
      />
    );
  }

  return (
    <div className={`min-h-[100dvh] bg-slate-100 dark:bg-[#06070A] text-slate-900 dark:text-slate-100 flex ${
      isForcedMobile ? 'flex-col items-center justify-start p-2 sm:p-4' :
      isForcedDesktop ? 'flex-row items-stretch justify-start p-0' :
      'flex-col lg:flex-row items-center lg:items-stretch justify-start sm:justify-center lg:justify-start p-0 sm:p-4 md:p-6 lg:p-0'
    } transition-colors font-sans antialiased w-full overflow-x-hidden`}>
      {/* 1. BARRA LATERAL FIJA EN ESCRITORIO (Sidebar visible solo en lg:) */}
      <DesktopSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTabChange={handleTabChange}
        onOpenTransaction={handleOpenTransaction}
        onOpenAddTx={handleOpenTransaction}
        onAddExpense={() => handleOpenTransaction('expense')}
        onAddIncome={() => handleOpenTransaction('income')}
        onOpenTransfer={handleOpenTransfer}
        onOpenAddTransaction={handleOpenTransaction}
        onOpenNewTransaction={handleOpenTransaction}
        isAddTransactionOpen={isAddTxOpen}
        setIsAddTransactionOpen={setIsAddTxOpen}
        onOpenRecurring={handleOpenRecurring}
        onOpenLoan={() => handleOpenAddLoan('receivable')}
        onOpenDebt={() => handleOpenAddDebt('payable')}
        onOpenInvestment={handleOpenInvestment}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProfile={handleOpenProfile}
        onOpenAuth={handleOpenProfile}
        userProfile={userProfile}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onLogout={() => setIsLocked(true)}
        trm={trm}
        syncStatus={syncStatus}
        isCloudEnabled={isCloudEnabled}
        syncUser={syncUser}
        className={desktopOnlyClass}
      />

      {/* Indicador superior en pantallas móviles simuladas (< lg) */}
      <div className={`${isForcedMobile ? 'flex' : isForcedDesktop ? 'hidden' : 'hidden sm:flex lg:hidden'} items-center justify-between w-full max-w-[440px] px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium`}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">Monety</span>
          <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono">
            {isForcedMobile ? 'MÓVIL' : 'PWA'}
          </span>
        </div>
        <button 
          type="button"
          onClick={() => handleFullReset()}
          className="hover:text-slate-900 dark:hover:text-slate-200 text-[11px] flex items-center gap-1 opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
          title="Restablecer aplicación a cero"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restablecer</span>
        </button>
      </div>

      {/* Contenedor Principal: Adaptable min-h-[100dvh] en móvil (< lg), Lienzo Panorámico SaaS en lg: */}
      <div 
        className={`w-full ${
          isForcedMobile 
            ? 'max-w-[440px] mx-auto min-h-[100dvh] rounded-[40px] shadow-2xl border-[8px] border-slate-300 dark:border-slate-800' 
            : isForcedDesktop 
            ? 'max-w-none h-screen rounded-none shadow-none border-0 overflow-hidden' 
            : 'sm:max-w-[440px] lg:max-w-none min-h-[100dvh] lg:h-screen sm:rounded-[40px] lg:rounded-none sm:shadow-[0_25px_70px_rgba(0,0,0,0.25)] dark:sm:shadow-[0_25px_70px_rgba(0,0,0,0.7)] lg:shadow-none sm:border-[8px] lg:border-0 sm:border-slate-300 dark:sm:border-slate-800 lg:overflow-hidden'
        } flex flex-col justify-between relative transition-colors bg-[#F8FAFC] dark:bg-[#07090E] flex-1`}
        style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
      >
        {/* Cabecera Unificada (Barra de estado iOS, Header Móvil y Header Panorámico de Escritorio) */}
        <AppHeader
          activeTab={activeTab}
          userProfile={userProfile}
          currentMonthLabel={currentMonthLabel}
          selectedDate={selectedDate}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          selectedDay={selectedDay}
          onOpenMonthPicker={() => setShowMonthPicker(true)}
          handlePrevMonth={handlePrevMonth}
          handleNextMonth={handleNextMonth}
          handleResetToToday={handleResetToToday}
          trm={trm}
          isForcedMobile={isForcedMobile}
          isForcedDesktop={isForcedDesktop}
          mobileOnlyClass={mobileOnlyClass}
          desktopOnlyClass={desktopOnlyClass}
          monthlyStats={monthlyStats}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenProfile={handleOpenProfile}
          onOpenSettings={handleOpenProfile}
          onOpenAuth={handleOpenProfile}
          onLogout={() => setIsLocked(true)}
          syncStatus={syncStatus}
          isCloudEnabled={isCloudEnabled}
          syncUser={syncUser}
          accounts={accounts}
          subscriptions={subscriptions}
          debtsAndLoans={debtsAndLoans}
          savingsGoals={savingsGoals}
        />

        {/* Main Content Area con altura adaptable y separación inferior anti-solapamiento */}
        <main ref={mainContentRef} className="flex-1 w-full px-3.5 sm:px-4 lg:px-0 py-2.5 sm:py-3 lg:py-0 pb-28 sm:pb-32 lg:pb-12 relative lg:overflow-y-auto space-y-3.5 sm:space-y-4 lg:space-y-0">
          <div className="w-full lg:max-w-[1550px] lg:mx-auto lg:px-6 lg:py-6">
            <ViewRouter
              activeTab={activeTab}
              tabResetKeys={tabResetKeys}
              financeData={financeData}
              financeActions={financeActions}
            />
          </div>
        </main>

        {/* Barra de Navegación Inferior Estilo iOS Dock Central (Oculta en escritorio o visible según viewMode) */}
        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onTabChange={handleTabChange}
          isActionMenuOpen={isActionMenuOpen}
          setIsActionMenuOpen={setIsActionMenuOpen}
          onOpenTransaction={handleOpenTransaction}
          onOpenAddTx={handleOpenTransaction}
          onOpenTransfer={handleOpenTransfer}
          onOpenRecurring={handleOpenRecurring}
          onOpenLoan={() => handleOpenAddLoan('receivable')}
          onOpenDebt={() => handleOpenAddDebt('payable')}
          onOpenInvestment={handleOpenInvestment}
          mobileOnlyClass={mobileOnlyClass}
        />

        {/* Menú Modal del Botón '+' Reestructurado y Compacto */}
        <QuickActionsModal
          isOpen={isActionMenuOpen}
          onClose={() => setIsActionMenuOpen(false)}
          setIsOpen={setIsActionMenuOpen}
          onAddExpense={() => handleOpenTransaction('expense')}
          onAddIncome={() => handleOpenTransaction('income')}
          onOpenTransaction={handleOpenTransaction}
          onOpenNewTransaction={handleOpenTransaction}
          openModal={(modalName) => {
            if (modalName === 'expense' || modalName === 'income' || modalName === 'transaction') handleOpenTransaction();
            else if (modalName === 'transfer') handleOpenTransfer();
            else if (modalName === 'recurring') handleOpenRecurring();
            else if (modalName === 'debt') handleOpenAddDebt('payable');
            else if (modalName === 'loan') handleOpenAddLoan('receivable');
            else if (modalName === 'investment') handleOpenInvestment();
          }}
          onOpenTransfer={handleOpenTransfer}
          onOpenInvestment={handleOpenInvestment}
          onOpenRecurring={handleOpenRecurring}
          onOpenLoan={() => handleOpenAddLoan('receivable')}
          onOpenDebt={() => handleOpenAddDebt('payable')}
          setActiveTab={handleTabChange}
        />

        {/* Barra Home Indicator de iOS para Desktop (Oculta en lg:) */}
        <div className={`${isForcedMobile ? 'block' : isForcedDesktop ? 'hidden' : 'hidden sm:block lg:hidden'} fixed bottom-1 left-0 right-0 sm:max-w-[440px] sm:left-1/2 sm:-translate-x-1/2 z-50 pointer-events-none`}>
          <div className="w-32 h-1 bg-slate-400/40 rounded-full mx-auto" />
        </div>

        {/* Contenedor Orquestador de Modales y Overlays */}
        <ModalContainer
          financeData={financeData}
          financeActions={financeActions}
        />

        {/* Banner Flotante de Actualización PWA */}
        {hasPwaUpdate && (
          <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-4 z-50 animate-slide-up">
            <div className="bg-slate-900/95 dark:bg-[#12141C]/95 border border-emerald-500/40 text-white p-3 sm:p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 ring-1 ring-emerald-500/20">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-[13px] font-bold tracking-tight truncate leading-tight">
                    ¡Nueva actualización lista!
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                    Mejoras y nuevas funciones disponibles
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  Actualizar ahora
                </button>
                <button
                  type="button"
                  onClick={() => setHasPwaUpdate(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                  title="Cerrar aviso"
                  aria-label="Cerrar aviso"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sistema Global de Notificaciones Toaster */}
        <Toaster position="top-right" />
      </div>
    </div>
  );
}
