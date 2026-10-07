import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppHeader, BottomNav, DesktopSidebar } from './components/layout';
import { ViewRouter } from './views';
import SplashScreen from './components/SplashScreen';
import OnboardingWizard from './components/OnboardingWizard';
import { ModalContainer } from './components/modals';
import QuickActionsModal from './components/QuickActionsModal';
import { getTomorrowDebtAlerts } from './utils/debtAlerts';
import { usePrivacy } from './context/PrivacyContext';
import SyncStatusBadge from './components/SyncStatusBadge';
import { useAuth } from './context/AuthContext';
import { 
  ensureUUID 
} from './services/syncEngine';
import { DEFAULT_WIDGETS_CONFIG } from './utils/widgetsConfig';
import { 
  LayoutDashboard, 
  Receipt, 
  CreditCard, 
  HandCoins, 
  TrendingUp,
  RotateCcw,
  Plus,
  ArrowRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Settings,
  RefreshCw,
  CalendarSync,
  Pencil,
  MinusCircle,
  PlusCircle,
  X
} from 'lucide-react';
import Toaster from './components/Toaster';
import { toast } from './utils/toast';
import { 
  mergeRecords, 
  reconcileAccounts, 
  reconcileTransactions, 
  generateUUID
} from './utils/recordMerger';
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

const DEFAULT_WIDGETS = DEFAULT_WIDGETS_CONFIG;

export default function App() {
  const { isPrivacyMode, formatMoney } = usePrivacy();
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme, handleToggleTheme } = useTheme();

  // Gestión centralizada de modales, visibilidad y superposiciones
  const {
    isAddTxOpen,
    setIsAddTxOpen,
    isAddTransactionOpen,
    setIsAddTransactionOpen,
    isNewTxModalOpen,
    setIsNewTxModalOpen,
    txDefaultType,
    setTxDefaultType,
    isTransferModalOpen,
    setIsTransferModalOpen,
    isAddLoanOpen,
    setIsAddLoanOpen,
    addLoanInitialType,
    setAddLoanInitialType,
    isNewDebtModalOpen,
    setIsNewDebtModalOpen,
    isAddRecurringOpen,
    setIsAddRecurringOpen,
    isNewRecurringModalOpen,
    setIsNewRecurringModalOpen,
    isAddInvestmentOpen,
    setIsAddInvestmentOpen,
    isNewInvestmentModalOpen,
    setIsNewInvestmentModalOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isProfileOpen,
    setIsProfileOpen,
    isCalendarOpen,
    setIsCalendarOpen,
    isActionMenuOpen,
    setIsActionMenuOpen,
    selectedCreditCardDetail,
    setSelectedCreditCardDetail,
    profileResetKey,
    setProfileResetKey,
    handleOpenTransaction,
    handleOpenAddLoan,
    handleOpenAddDebt,
    handleOpenTransfer,
    handleOpenRecurring,
    handleOpenInvestment,
    handleOpenSettings,
    handleOpenProfile,
    handleCloseAllModals,
    modalFlags
  } = useModalControls();

  // PWA Update notification banner state
  const [hasPwaUpdate, setHasPwaUpdate] = useState(false);

  // Global Toast notification helper (delega al sistema unificado de Toaster)
  const showToast = (text, type = 'success') => {
    if (type === 'error') toast.error(text);
    else if (type === 'info') toast.info(text);
    else toast.success(text);
  };

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
  const {
    handleSaveTransaction,
    handleAddTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleExecuteTransfer,
    handleAddDebtPayment,
    handlePayDebtInstallment,
    handleAddPayment,
    handleDeletePayment,
    handleAddDisbursement,
    handleAddInvestment,
    handleDeleteInvestment,
    handleAddDebtOrLoan,
    handleSaveLoan,
    handleDeleteDebtOrLoan
  } = useFinancialOperations({
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


  // View mode switcher: 'auto' | 'mobile' | 'desktop' (soporta ?view=mobile y ?view=desktop en la URL)
  const [viewMode, setViewMode] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const v = params.get('view');
        if (v === 'mobile' || v === 'desktop' || v === 'auto') return v;
        const saved = localStorage.getItem('presu_app_view_mode');
        if (saved === 'mobile' || saved === 'desktop') return saved;
      }
    } catch {}
    return 'auto';
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (mode === 'auto') {
          url.searchParams.delete('view');
          localStorage.removeItem('presu_app_view_mode');
        } else {
          url.searchParams.set('view', mode);
          localStorage.setItem('presu_app_view_mode', mode);
        }
        window.history.pushState({}, '', url.toString());
      }
    } catch (e) {
      console.error('Error al cambiar de vista:', e);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const v = params.get('view');
        setViewMode(v === 'mobile' || v === 'desktop' || v === 'auto' ? v : 'auto');
      } catch {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  // Estado y sincronización de Perfil de Usuario
  const {
    userProfile,
    setUserProfile,
    handleUpdateProfile
  } = useUserProfile({ user, isResettingRef });

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
    totalIncome,
    totalExpense,
    netBalance,
    availableLiquidBalance,
    savingsRate,
    incomeCount,
    expenseCount,
    activeDebtsCount,
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

  // Sistema de Alertas y Recordatorios Preventivos (1 día antes)
  const [managedAlerts, setManagedAlerts] = useState(() => {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
      const today = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`managed_alerts_${today}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const tomorrowDebtAlerts = useMemo(() => {
    try {
      const all = getTomorrowDebtAlerts(debtsAndLoans || [], accounts || []);
      const managed = Array.isArray(managedAlerts) ? managedAlerts : [];
      return all.filter((a) => a && a.id && !managed.includes(a.id));
    } catch (err) {
      console.warn('Error calculando alertas preventivas:', err);
      return [];
    }
  }, [debtsAndLoans, accounts, managedAlerts]);

  const handleDismissAlert = (alertId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      setManagedAlerts((prev) => {
        const currentList = Array.isArray(prev) ? prev : [];
        const next = [...currentList, alertId];
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`managed_alerts_${today}`, JSON.stringify(next));
          }
        } catch {
          // ignore
        }
        return next;
      });
    } catch (e) {
      console.warn('Error al descartar alerta:', e);
    }
  };

  const handleReviewDebtAlert = (alert) => {
    handleTabChange('debts');
  };

  // Notificaciones del Sistema PWA (1 día antes)
  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (!Array.isArray(tomorrowDebtAlerts) || tomorrowDebtAlerts.length === 0) return;

      const todayStr = new Date().toISOString().split('T')[0];

      const dispatchNotifications = async () => {
        try {
          if (typeof Notification === 'undefined') return;

          let permission = Notification.permission;
          if (permission === 'default' && typeof Notification.requestPermission === 'function') {
            try {
              permission = await Notification.requestPermission();
            } catch (permErr) {
              console.warn('No se pudo solicitar permiso de notificación:', permErr);
            }
          }

          if (permission === 'granted') {
            tomorrowDebtAlerts.forEach((alert) => {
              try {
                if (!alert || !alert.id) return;
                const sentKey = `pwa_notif_sent_${todayStr}_${alert.id}`;
                
                let alreadySent = false;
                try {
                  if (typeof localStorage !== 'undefined') {
                    alreadySent = !!localStorage.getItem(sentKey);
                  }
                } catch {
                  alreadySent = false;
                }

                if (alreadySent) return;

                let sentViaSW = false;
                if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker && navigator.serviceWorker.controller) {
                  try {
                    navigator.serviceWorker.controller.postMessage({
                      type: 'SHOW_NOTIFICATION',
                      title: alert.title || 'Recordatorio',
                      options: {
                        body: alert.message || '',
                        icon: '/icon-192x192.png',
                        badge: '/icon-192x192.png',
                        tag: alert.id
                      }
                    });
                    sentViaSW = true;
                  } catch (swErr) {
                    console.warn('No se pudo enviar notificación vía Service Worker:', swErr);
                  }
                }

                if (!sentViaSW && typeof Notification === 'function') {
                  try {
                    new Notification(alert.title || 'Recordatorio', {
                      body: alert.message || '',
                      icon: '/icon-192x192.png'
                    });
                  } catch (directErr) {
                    console.warn('Constructor Notification no disponible directamente:', directErr);
                  }
                }

                try {
                  if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(sentKey, 'true');
                  }
                } catch {
                  // ignore
                }
              } catch (alertErr) {
                console.warn('Error al procesar notificación individual:', alertErr);
              }
            });
          }
        } catch (dispatchErr) {
          console.warn('Error en dispatchNotifications:', dispatchErr);
        }
      };

      dispatchNotifications();
    } catch (effectErr) {
      console.warn('Error en efecto de alertas de deuda:', effectErr);
    }
  }, [tomorrowDebtAlerts]);










  // 1. Pantalla de carga neutral mientras se valida la sesión y estado de onboarding
  if (authLoading) {
    return <SplashScreen message="Verificando tu espacio..." />;
  }

  // 2. Si el Onboarding está activo, mostrar la pantalla fija e ininterrumpida
  if (isOnboardingActive) {
    return (
      <OnboardingWizard 
        onComplete={handleOnboardingComplete} 
        onRestoreBackup={handleRestoreBackup} 
      />
    );
  }

  const isForcedMobile = viewMode === 'mobile';
  const isForcedDesktop = viewMode === 'desktop';

  const desktopOnlyClass = isForcedMobile ? 'hidden' : isForcedDesktop ? 'flex' : 'hidden lg:flex';
  const desktopBlockClass = isForcedMobile ? 'hidden' : isForcedDesktop ? 'block' : 'hidden lg:block';
  const mobileOnlyClass = isForcedDesktop ? 'hidden' : isForcedMobile ? 'block' : 'lg:hidden';

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
        onOpenTransfer={() => setIsTransferModalOpen(true)}
        onOpenAddTransaction={handleOpenTransaction}
        onOpenNewTransaction={handleOpenTransaction}
        isAddTransactionOpen={isAddTxOpen}
        setIsAddTransactionOpen={setIsAddTxOpen}
        onOpenRecurring={() => {
          setIsAddRecurringOpen(true);
          setIsNewRecurringModalOpen(true);
        }}
        onOpenLoan={() => handleOpenAddLoan('receivable')}
        onOpenDebt={() => handleOpenAddDebt('payable')}
        onOpenInvestment={() => {
          setIsAddInvestmentOpen(true);
          setIsNewInvestmentModalOpen(true);
        }}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProfile={() => setIsSettingsOpen(true)}
        onOpenAuth={() => {}}
        userProfile={userProfile}
        selectedDate={selectedDate}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        selectedDay={selectedDay}
        currentMonthLabel={currentMonthLabel}
        handlePrevMonth={handlePrevMonth}
        handleNextMonth={handleNextMonth}
        handleResetToToday={handleResetToToday}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onLogout={() => setIsLocked(true)}
        trm={trm}
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
          onOpenAuth={() => {}}
          onLogout={() => setIsLocked(true)}
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
              accounts={accounts}
              investments={investments}
              debtsAndLoans={debtsAndLoans}
              transactions={transactions}
              monthlyTransactions={monthlyTransactions}
              categories={categories}
              recurringPayments={recurringPayments}
              subscriptions={subscriptions}
              monthlyStats={monthlyStats}
              selectedDate={selectedDate}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              handlePrevMonth={handlePrevMonth}
              handleNextMonth={handleNextMonth}
              handleResetToToday={handleResetToToday}
              currentMonthLabel={currentMonthLabel}
              trm={trm}
              widgets={widgets}
              setWidgets={setWidgets}
              tomorrowDebtAlerts={tomorrowDebtAlerts}
              handleReviewDebtAlert={handleReviewDebtAlert}
              handleDismissAlert={handleDismissAlert}
              formatMoney={formatMoney}
              fromSettings={fromSettings}
              handleGoBackFromSubView={handleGoBackFromSubView}
              handleTabChange={handleTabChange}
              setIsCalendarOpen={setIsCalendarOpen}
              setIsEditWidgetsModalOpen={setIsEditWidgetsModalOpen}
              setIsAddTxOpen={setIsAddTxOpen}
              handleOpenTransaction={handleOpenTransaction}
              setSelectedCreditCardDetail={setSelectedCreditCardDetail}
              setIsAddRecurringOpen={setIsAddRecurringOpen}
              setIsNewRecurringModalOpen={setIsNewRecurringModalOpen}
              handleOpenAddDebt={handleOpenAddDebt}
              handleOpenAddLoan={handleOpenAddLoan}
              setAddLoanInitialType={setAddLoanInitialType}
              setIsAddLoanOpen={setIsAddLoanOpen}
              handleAddTransaction={handleAddTransaction}
              handleUpdateTransaction={handleUpdateTransaction}
              handleDeleteTransaction={handleDeleteTransaction}
              handleAddCategory={handleAddCategory}
              handleUpdateCategory={handleUpdateCategory}
              handleDeleteCategory={handleDeleteCategory}
              handleAddSubcategory={handleAddSubcategory}
              handleUpdateSubcategory={handleUpdateSubcategory}
              handleDeleteSubcategory={handleDeleteSubcategory}
              handleAddAccount={handleAddAccount}
              handleUpdateAccount={handleUpdateAccount}
              handleDeleteAccount={handleDeleteAccount}
              handleReorderAccounts={handleReorderAccounts}
              handleAddDebtOrLoan={handleAddDebtOrLoan}
              handleUpdateDebtOrLoan={handleUpdateDebtOrLoan}
              handleAddPayment={handleAddPayment}
              handleAddDisbursement={handleAddDisbursement}
              handleDeletePayment={handleDeletePayment}
              handleDeleteDebtOrLoan={handleDeleteDebtOrLoan}
              handleAddInvestment={handleAddInvestment}
              handleUpdateInvestment={handleUpdateInvestment}
              handleDeleteInvestment={handleDeleteInvestment}
              handleAddRecurring={handleAddRecurring}
              handleUpdateRecurring={handleUpdateRecurring}
              handleDeleteRecurring={handleDeleteRecurring}
              handleToggleActiveRecurring={handleToggleActiveRecurring}
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
          onOpenTransfer={() => setIsTransferModalOpen(true)}
          onOpenRecurring={() => {
            setIsAddRecurringOpen(true);
            setIsNewRecurringModalOpen(true);
          }}
          onOpenLoan={() => handleOpenAddLoan('receivable')}
          onOpenDebt={() => handleOpenAddDebt('payable')}
          onOpenInvestment={() => {
            setIsAddInvestmentOpen(true);
            setIsNewInvestmentModalOpen(true);
          }}
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
            else if (modalName === 'transfer') setIsTransferModalOpen(true);
            else if (modalName === 'recurring') {
              setIsAddRecurringOpen(true);
              setIsNewRecurringModalOpen(true);
            }
            else if (modalName === 'debt') {
              handleOpenAddDebt('payable');
            }
            else if (modalName === 'loan') {
              handleOpenAddLoan('receivable');
            }
            else if (modalName === 'investment') {
              setIsAddInvestmentOpen(true);
              setIsNewInvestmentModalOpen(true);
            }
          }}
          onOpenTransfer={() => setIsTransferModalOpen(true)}
          onOpenInvestment={() => {
            setIsAddInvestmentOpen(true);
            setIsNewInvestmentModalOpen(true);
          }}
          onOpenNewInvestment={() => {
            setIsAddInvestmentOpen(true);
            setIsNewInvestmentModalOpen(true);
          }}
          onOpenRecurring={() => {
            setIsAddRecurringOpen(true);
            setIsNewRecurringModalOpen(true);
          }}
          onOpenAddRecurring={() => {
            setIsAddRecurringOpen(true);
            setIsNewRecurringModalOpen(true);
          }}
          onOpenLoan={() => handleOpenAddLoan('receivable')}
          onOpenAddLoan={() => handleOpenAddLoan('receivable')}
          onOpenDebt={() => handleOpenAddDebt('payable')}
          onOpenAddDebt={() => handleOpenAddDebt('payable')}
          setActiveTab={handleTabChange}
        />

        {/* Barra Home Indicator de iOS para Desktop (Oculta en lg:) */}
        <div className={`${isForcedMobile ? 'block' : isForcedDesktop ? 'hidden' : 'hidden sm:block lg:hidden'} fixed bottom-1 left-0 right-0 sm:max-w-[440px] sm:left-1/2 sm:-translate-x-1/2 z-50 pointer-events-none`}>
          <div className="w-32 h-1 bg-slate-400/40 rounded-full mx-auto" />
        </div>

        {/* Contenedor Orquestador de Modales y Overlays */}
        <ModalContainer
          {...modalFlags}
          showMonthPicker={showMonthPicker}
          setShowMonthPicker={setShowMonthPicker}
          isEditWidgetsModalOpen={isEditWidgetsModalOpen}
          setIsEditWidgetsModalOpen={setIsEditWidgetsModalOpen}
          showTutorial={showTutorial}
          setShowTutorial={setShowTutorial}
          isLocked={isLocked}
          handleUnlock={handleUnlock}
          handleVerifyPin={handleVerifyPin}
          handleUpdatePin={handleUpdatePin}
          failedAttempts={failedAttempts}
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          investments={investments}
          debtsAndLoans={debtsAndLoans}
          subscriptions={subscriptions}
          setSubscriptions={setSubscriptions}
          savingsGoals={savingsGoals}
          budgets={budgets}
          setBudgets={setBudgets}
          widgets={widgets}
          setWidgets={setWidgets}
          userProfile={userProfile}
          securitySettings={securitySettings}
          setSecuritySettings={setSecuritySettings}
          user={user}
          trm={trm}
          theme={theme}
          setTheme={setTheme}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          handlePrevMonth={handlePrevMonth}
          handleNextMonth={handleNextMonth}
          handleResetToToday={handleResetToToday}
          handleChangeMonth={handleChangeMonth}
          handleSaveTransaction={handleSaveTransaction}
          handleAddTransaction={handleAddTransaction}
          handleExecuteTransfer={handleExecuteTransfer}
          handleAddInvestment={handleAddInvestment}
          handleAddDebtOrLoan={handleAddDebtOrLoan}
          handleAddRecurring={handleAddRecurring}
          handleUpdateProfile={handleUpdateProfile}
          handleAddGoal={handleAddGoal}
          handleUpdateGoal={handleUpdateGoal}
          handleDeleteGoal={handleDeleteGoal}
          handleAddCategory={handleAddCategory}
          handleUpdateCategory={handleUpdateCategory}
          handleDeleteCategory={handleDeleteCategory}
          handleAddSubcategory={handleAddSubcategory}
          handleUpdateSubcategory={handleUpdateSubcategory}
          handleDeleteSubcategory={handleDeleteSubcategory}
          handleAddAccount={handleAddAccount}
          handleTabChange={handleTabChange}
          setFromSettings={setFromSettings}
          handleRestoreBackup={handleRestoreBackup}
          handleResetData={handleResetData}
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
