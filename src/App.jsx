import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppHeader, BottomNav, DesktopSidebar } from './components/layout';
import { 
  DashboardView, 
  TransactionsView, 
  AccountsView, 
  DebtsView, 
  InvestmentsView, 
  RecurringView, 
  TaxView 
} from './views';
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
import { STORAGE_KEYS } from './constants/storageKeys';
import { 
  saveAccountsToStorage 
} from './services/storageService';
import { useTheme } from './hooks/useTheme';
import { useSecurity } from './hooks/useSecurity';
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

const DEFAULT_WIDGETS = DEFAULT_WIDGETS_CONFIG;

export default function App() {
  const { isPrivacyMode, formatMoney } = usePrivacy();
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme, handleToggleTheme } = useTheme();

  // ==============================================================
  // ESTADOS CENTRALIZADOS DE MODALES
  // ==============================================================
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [addLoanInitialType, setAddLoanInitialType] = useState('receivable');
  const [isAddInvestmentOpen, setIsAddInvestmentOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenAddLoan = (type = 'receivable') => {
    const norm = (type === 'payable' || type === 'borrowed' || type === 'debo') ? 'payable' : 'receivable';
    setAddLoanInitialType(norm);
    setIsAddLoanOpen(true);
  };

  const handleOpenAddDebt = (type = 'payable') => {
    const norm = (type === 'receivable' || type === 'lent' || type === 'me_deben') ? 'receivable' : 'payable';
    setAddLoanInitialType(norm);
    setIsAddLoanOpen(true);
  };

  // Aliases retrocompatibles para integración fluida en toda la app:
  const isAddTransactionOpen = isAddTxOpen;
  const setIsAddTransactionOpen = setIsAddTxOpen;
  const isNewTxModalOpen = isAddTxOpen;
  const setIsNewTxModalOpen = setIsAddTxOpen;
  const isProfileOpen = isSettingsOpen;
  const setIsProfileOpen = setIsSettingsOpen;
  const isNewDebtModalOpen = isAddLoanOpen;
  const setIsNewDebtModalOpen = setIsAddLoanOpen;
  const isNewRecurringModalOpen = isAddRecurringOpen;
  const setIsNewRecurringModalOpen = setIsAddRecurringOpen;
  const isNewInvestmentModalOpen = isAddInvestmentOpen;
  const setIsNewInvestmentModalOpen = setIsAddInvestmentOpen;

  // Manejador centralizado con log de depuración y soporte para 'expense' | 'income'
  const handleOpenTransaction = (type = 'expense') => {
    const safeType = type === 'income' ? 'income' : 'expense';
    console.log('>>> Abriendo AddTransactionModal...', safeType);
    setTxDefaultType(safeType);
    setIsAddTxOpen(true);
  };

  // Modal State for Calendar Dropdown
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  // Global Action Menu State for central FAB (+) button
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  // Default type for opening transaction form ('expense' | 'income')
  const [txDefaultType, setTxDefaultType] = useState('expense');
  // Modal State for Transfers between accounts
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  // Modal State for Credit Card Detail
  const [selectedCreditCardDetail, setSelectedCreditCardDetail] = useState(null);
  // PWA Update notification banner state
  const [hasPwaUpdate, setHasPwaUpdate] = useState(false);
  // Ref for scrolling main content to top on tab change
  const mainContentRef = useRef(null);

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
    handleAddTransaction,
    handleSaveTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleExecuteTransfer,
    handleTransfer,
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
    handleAddDebtOrLoan,
    handleSaveLoan,
    handleUpdateDebtOrLoan,
    handleAddPayment,
    handleDeletePayment,
    handleAddDisbursement,
    handleDeleteDebtOrLoan,
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
    handleAddInvestment,
    handleSaveInvestment,
    handleUpdateInvestment,
    handleDeleteInvestment,
    resetInvestments
  } = useInvestments(isResettingRef);


  const [showMonthPicker, setShowMonthPicker] = useState(false);

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
    handleUnlock
  } = useSecurity(isResettingRef);

  // Handler para completar el Onboarding inicial
  const handleOnboardingComplete = async ({ 
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
    // Configurar cuentas iniciales (un arreglo vacío [] es completamente válido y por defecto al empezar de cero)
    const finalAccounts = Array.isArray(initialAccounts) ? initialAccounts : [];
    setAccounts(finalAccounts);
    localStorage.setItem('presu_accounts', JSON.stringify(finalAccounts));
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(finalAccounts));
    localStorage.setItem('user_accounts', JSON.stringify(finalAccounts));
    localStorage.setItem('accounts', JSON.stringify(finalAccounts));
    saveAccountsToStorage(finalAccounts);

    // Al reiniciar o completar onboarding inicial, asegurar transacciones, inversiones y deudas estrictamente en blanco
    resetTransactions();

    resetDebts();

    resetInvestments();

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
    setUserProfile(newProfile);
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
    setSecuritySettings(newSec);
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

    // 2. Marcar explícitamente como completado en storage y perfil
    completeOnboarding(user?.id);

    setIsLocked(false);
    localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false');

    const isTutorialDone = 
      localStorage.getItem('presu_tutorial_completed') === 'true' ||
      localStorage.getItem('has_completed_tutorial') === 'true' ||
      localStorage.getItem('tutorial_completed') === 'true';

    if (showTutorialAfter || !isTutorialDone) {
      setShowTutorial(true);
    }
  };

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

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null); // 'YYYY-MM-DD' or null for whole month
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fromSettings, setFromSettings] = useState(false);

  // Claves de reseteo para forzar estado inicial limpio al seleccionar cualquier pestaña
  const [tabResetKeys, setTabResetKeys] = useState({
    dashboard: 0,
    transactions: 0,
    investments: 0,
    debts: 0,
    accounts: 0,
    recurring: 0
  });
  const [profileResetKey, setProfileResetKey] = useState(0);

  // Apertura limpia de Perfil (cierra otros elementos y resetea a la vista raíz principal)
  const handleOpenProfile = () => {
    setIsActionMenuOpen(false);
    setIsAddTransactionOpen(false);
    setIsNewInvestmentModalOpen(false);
    setIsAddLoanOpen(false);
    setIsAddRecurringOpen(false);
    setIsCalendarOpen(false);
    setIsEditWidgetsModalOpen(false);
    setProfileResetKey((prev) => prev + 1);
    setIsSettingsOpen(true);
  };

  // Manejador de retorno para subvistas accesibles desde Configuración o Dashboard
  const handleGoBackFromSubView = () => {
    if (fromSettings) {
      setFromSettings(false);
      handleOpenProfile();
    } else {
      handleTabChange('dashboard');
    }
  };
  
  // Reseteo de Estado al Cambiar o Volver a Pulsar cualquier Pestaña:
  // 1. Cierra todos los modales abiertos, menús flotantes (+) y bottom sheets
  // 2. Fuerza el reinicio a la pantalla raíz y variables de sub-navegación internas
  // 3. Restablece el scroll de la ventana y contenedor principal al inicio (0, 0)
  const handleTabChange = (rawTab, fromSource = null) => {
    const tab = rawTab === 'loans' ? 'debts' : rawTab;
    if (fromSource === 'settings') {
      setFromSettings(true);
    } else if (fromSource !== 'keep') {
      setFromSettings(false);
    }

    // 1. Cierre garantizado de menús flotantes y bottom sheets
    setIsActionMenuOpen(false);
    setIsAddTransactionOpen(false);
    setIsNewInvestmentModalOpen(false);
    setIsAddLoanOpen(false);
    setIsAddRecurringOpen(false);
    setIsCalendarOpen(false);
    setIsSettingsOpen(false);
    setIsEditWidgetsModalOpen(false);
    setSelectedCreditCardDetail(null);
    setSelectedDay(null);
    
    // 2. Forzar reseteo de sub-vistas internas
    setTabResetKeys((prev) => ({
      ...prev,
      [tab]: (prev[tab] || 0) + 1
    }));

    if (tab === 'profile' || tab === 'settings' || tab === 'configuracion' || tab === 'ajustes') {
      handleOpenProfile();
      return;
    }
    
    // 3. Scroll automático al tope inmediato en todos los contenedores posibles
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      mainContentRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
    
    setActiveTab(tab);
  };

  // Garantizar que cualquier navegación a 'settings' o 'profile' abra limpiamente el modal de Configuración
  useEffect(() => {
    if (activeTab === 'settings' || activeTab === 'profile' || activeTab === 'configuracion' || activeTab === 'ajustes') {
      handleOpenProfile();
      setActiveTab('dashboard');
    }
  }, [activeTab]);
















  // Cálculos derivados y métricas analíticas memorizadas
  const {
    currentYear,
    currentMonth,
    currentMonthLabel,
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








  // Reset de Fábrica Total y Purga Completa
  const handleFactoryReset = async (skipConfirm = false) => {
    if (!skipConfirm) {
      let confirmed = false;
      try {
        confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
          ? window.confirm(
              '¿Estás seguro de restablecer Monety? Se borrarán todas las cuentas, inversiones, deudas, transacciones y configuraciones, y la app volverá a la pantalla de bienvenida.'
            )
          : true;
      } catch (e) {
        confirmed = true;
      }
      if (!confirmed) return;
    }

    try {
      isResettingRef.current = true;

      // 1. VACIADO ABSOLUTO INMEDIATO DEL ALMACENAMIENTO (Requerimiento prioritario)
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}

      // 2. Resetear inmediatamente el estado en memoria de React a ceros absolutos
      resetTransactions();
      resetAccounts();
      resetDebts();
      resetInvestments();
      resetRecurringPayments();
      resetSavingsGoals();
      resetBudgets();

      // 3. Modo Local: purga exclusiva en dispositivo
      // No se requieren llamadas a servidores remotos

      // 4. Limpieza de Service Worker Caches
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch (e) {}

      // 5. Purga de bases de datos locales en indexedDB
      try {
        if (typeof window !== 'undefined' && window.indexedDB && window.indexedDB.databases) {
          const dbs = await window.indexedDB.databases();
          for (const db of dbs) {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name);
            }
          }
        }
      } catch (e) {}

      // 6. Purga total definitiva después de auth/db para evitar cualquier reescritura
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}

      // 7. Redirección forzada al root/onboarding descartando caché en memoria
      window.location.replace('/');
    } catch (error) {
      console.error('Error al restablecer de fábrica:', error);
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      window.location.replace('/');
    }
  };

  const handleFullReset = handleFactoryReset;
  const handleResetData = handleFactoryReset;

  const handleRestoreBackup = (backupData) => {
    if (!backupData || !backupData.data) return;
    const d = backupData.data;
    
    if (d.transactions) setTransactions(d.transactions);
    if (d.accounts) setAccounts(d.accounts);
    if (d.categories) setCategories(d.categories);
    if (d.debtsAndLoans || d.debts) setDebtsAndLoans(d.debtsAndLoans || d.debts);
    if (d.investments) {
      setInvestments(d.investments);
      localStorage.setItem('investments_initialized', 'true');
      localStorage.setItem('user_investments', JSON.stringify(d.investments));
    }
    if (d.budgets) setBudgets(d.budgets);
    if (d.savingsGoals) setSavingsGoals(d.savingsGoals);
    if (d.recurring_payments || d.subscriptions) setRecurringPayments(d.recurring_payments || d.subscriptions);
    if (d.securitySettings) {
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
    if (d.trm) setTrm(Number(d.trm) || 4000);
    if (d.theme) setTheme(d.theme);
    
    // Almacenar en localStorage para asegurar la persistencia inmediata con todas las claves y alias
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

    completeOnboarding(user?.id);
    localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false');

    setSelectedDay(null);
  };

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
          selectedDay={selectedDay}
          onOpenMonthPicker={() => setShowMonthPicker(true)}
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
            
            {/* Tab 1: Dashboard Inicio */}
            {activeTab === 'dashboard' && (
              <DashboardView
                key={`dashboard-${tabResetKeys.dashboard}`}
                alerts={tomorrowDebtAlerts}
                onReviewAlert={handleReviewDebtAlert}
                onDismissAlert={handleDismissAlert}
                formatMoney={formatMoney}
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
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                onOpenCalendar={() => setIsCalendarOpen(true)}
                onNavigateToTab={handleTabChange}
                onOpenTransaction={handleOpenTransaction}
                onAddTransaction={handleAddTransaction}
                onAddDebtOrLoan={handleAddDebtOrLoan}
                onAddRecurring={handleAddRecurring}
                onDeleteTransaction={handleDeleteTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                onAddCategory={handleAddCategory}
                onAddSubcategory={handleAddSubcategory}
                onUpdateSubcategory={handleUpdateSubcategory}
                onDeleteSubcategory={handleDeleteSubcategory}
                onAddAccount={handleAddAccount}
                onSelectCreditCardDetail={setSelectedCreditCardDetail}
                onOpenAddRecurring={() => {
                  setIsAddRecurringOpen(true);
                  setIsNewRecurringModalOpen(true);
                }}
                currentMonthLabel={currentMonthLabel}
                trm={trm}
                widgetsConfig={widgets}
                widgets={widgets}
                onCustomizeWidgets={() => setIsEditWidgetsModalOpen(true)}
                onSaveWidgets={(newCfg) => setWidgets(newCfg)}
              />
            )}

            {/* Tab 2: Movimientos */}
            {activeTab === 'transactions' && (
              <TransactionsView
                key={`transactions-list-${tabResetKeys.transactions}`}
                transactions={monthlyTransactions}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                onAddCategory={handleAddCategory}
                onAddSubcategory={handleAddSubcategory}
                onUpdateSubcategory={handleUpdateSubcategory}
                onDeleteSubcategory={handleDeleteSubcategory}
                onAddAccount={handleAddAccount}
                categories={categories}
                accounts={accounts}
                currentMonthLabel={currentMonthLabel}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                onOpenTransaction={handleOpenTransaction}
                onOpenAddTransaction={handleOpenTransaction}
                setIsAddTransactionOpen={setIsAddTxOpen}
                trm={trm}
              />
            )}

            {/* Tab 3: Cuentas y Métodos de Pago */}
            {activeTab === 'accounts' && (
              <AccountsView
                key={`accounts-${tabResetKeys.accounts}`}
                accounts={accounts}
                transactions={transactions}
                onAddAccount={handleAddAccount}
                onUpdateAccount={handleUpdateAccount}
                onDeleteAccount={handleDeleteAccount}
                onReorderAccounts={handleReorderAccounts}
                onAddTransaction={handleAddTransaction}
                onOpenCreditCardDetail={setSelectedCreditCardDetail}
                trm={trm}
                onBack={handleGoBackFromSubView}
                fromSettings={fromSettings}
              />
            )}

            {/* Tab 4: Préstamos y Deudas */}
            {(activeTab === 'debts' || activeTab === 'loans') && (
              <DebtsView
                key={`debts-${tabResetKeys.debts}`}
                debtsAndLoans={debtsAndLoans}
                accounts={accounts}
                onAddDebtOrLoan={handleAddDebtOrLoan}
                onUpdateDebtOrLoan={handleUpdateDebtOrLoan}
                onAddPayment={handleAddPayment}
                onAddDisbursement={handleAddDisbursement}
                onDeletePayment={handleDeletePayment}
                onDeleteDebtOrLoan={handleDeleteDebtOrLoan}
                onOpenAddDebt={(type = 'payable') => handleOpenAddDebt(type)}
                onOpenAddLoan={(type = 'receivable') => handleOpenAddLoan(type)}
                setIsAddLoanOpen={(val) => {
                  if (typeof val === 'string') {
                    const target = (val === 'payable' || val === 'borrowed' || val === 'debo') ? 'payable' : 'receivable';
                    setAddLoanInitialType(target);
                    setIsAddLoanOpen(true);
                  } else {
                    setIsAddLoanOpen(Boolean(val));
                  }
                }}
              />
            )}

            {/* Tab 5: Inversiones y Patrimonio */}
            {activeTab === 'investments' && (
              <InvestmentsView
                key={`investments-${tabResetKeys.investments}`}
                investments={investments}
                onAddInvestment={handleAddInvestment}
                onUpdateInvestment={handleUpdateInvestment}
                onDeleteInvestment={handleDeleteInvestment}
                trm={trm}
              />
            )}

            {/* Vista Dedicada: Pagos Recurrentes */}
            {activeTab === 'recurring' && (
              <RecurringView
                key={`recurring-${tabResetKeys.recurring || 0}`}
                recurringPayments={recurringPayments}
                onAddRecurring={handleAddRecurring}
                onUpdateRecurring={handleUpdateRecurring}
                onDeleteRecurring={handleDeleteRecurring}
                onToggleActiveRecurring={handleToggleActiveRecurring}
                onOpenCreateModal={() => setIsAddRecurringOpen(true)}
                onOpenAddRecurring={() => setIsAddRecurringOpen(true)}
                setIsAddRecurringOpen={setIsAddRecurringOpen}
                onBack={handleGoBackFromSubView}
                fromSettings={fromSettings}
                accounts={accounts}
                categories={categories}
                onAddCategory={handleAddCategory}
                onAddSubcategory={handleAddSubcategory}
                trm={trm}
              />
            )}

            {/* Vista Dedicada: Impuestos y Declaración de Renta DIAN */}
            {activeTab === 'tax' && (
              <TaxView
                transactions={transactions}
                accounts={accounts}
                investments={investments}
                onBack={handleGoBackFromSubView}
                onClose={handleGoBackFromSubView}
                fromSettings={fromSettings}
              />
            )}

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
          isAddTxOpen={isAddTxOpen}
          setIsAddTxOpen={setIsAddTxOpen}
          txDefaultType={txDefaultType}
          isTransferModalOpen={isTransferModalOpen}
          setIsTransferModalOpen={setIsTransferModalOpen}
          isAddInvestmentOpen={isAddInvestmentOpen}
          setIsAddInvestmentOpen={setIsAddInvestmentOpen}
          isNewInvestmentModalOpen={isNewInvestmentModalOpen}
          setIsNewInvestmentModalOpen={setIsNewInvestmentModalOpen}
          isAddLoanOpen={isAddLoanOpen}
          setIsAddLoanOpen={setIsAddLoanOpen}
          addLoanInitialType={addLoanInitialType}
          isAddRecurringOpen={isAddRecurringOpen}
          setIsAddRecurringOpen={setIsAddRecurringOpen}
          showMonthPicker={showMonthPicker}
          setShowMonthPicker={setShowMonthPicker}
          isCalendarOpen={isCalendarOpen}
          setIsCalendarOpen={setIsCalendarOpen}
          selectedCreditCardDetail={selectedCreditCardDetail}
          setSelectedCreditCardDetail={setSelectedCreditCardDetail}
          isEditWidgetsModalOpen={isEditWidgetsModalOpen}
          setIsEditWidgetsModalOpen={setIsEditWidgetsModalOpen}
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
          isProfileOpen={isProfileOpen}
          profileResetKey={profileResetKey}
          showTutorial={showTutorial}
          setShowTutorial={setShowTutorial}
          isLocked={isLocked}
          handleUnlock={handleUnlock}
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
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
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
