import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  INITIAL_ACCOUNTS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_DEBTS_AND_LOANS, 
  INITIAL_INVESTMENTS,
  MONTH_NAMES,
  formatCurrency
} from './data/initialData';
import Header from './components/Header';
import CalendarDropdown from './components/CalendarDropdown';
import TransactionForm from './components/TransactionForm';
import AddTransactionModal from './components/AddTransactionModal';
import TransactionList from './components/TransactionList';
import TransactionsView from './components/TransactionsView';
import AccountsAndCategories from './components/AccountsAndCategories';
import ReportsAndCharts from './components/ReportsAndCharts';
import LoansAndDebts from './components/LoansAndDebts';
import InvestmentsView from './components/InvestmentsView';
import InvestmentFormModal from './components/InvestmentFormModal';
import AddInvestmentModal from './components/AddInvestmentModal';
import DebtFormModal from './components/DebtFormModal';
import AddLoanModal from './components/AddLoanModal';
import BalanceWidget from './components/BalanceWidget';
import BudgetWidget from './components/BudgetWidget';
import EditWidgetsModal from './components/EditWidgetsModal';
import ProfileModal from './components/ProfileModal';
import LockScreen from './components/LockScreen';
import SplashScreen from './components/SplashScreen';
import CreditCardDetailModal from './components/CreditCardDetailModal';
import BrandIcon from './components/BrandIcon';
import OnboardingFlow from './components/OnboardingFlow';
import OnboardingWizard from './components/OnboardingWizard';
import DebtAlertBanner from './components/DebtAlertBanner';
import RecurringView from './components/RecurringView';
import AddRecurringModal from './components/AddRecurringModal';
import DesktopSidebar from './components/DesktopSidebar';
import Dashboard from './components/Dashboard';
import DesktopMonthPicker from './components/DesktopMonthPicker';
import TaxView from './components/TaxView';
import TransferModal from './components/TransferModal';
import QuickActionsModal from './components/QuickActionsModal';
import BottomNav from './components/BottomNav';
import { getTomorrowDebtAlerts, calculateElapsedMonths } from './utils/debtAlerts';
import { usePrivacy } from './context/PrivacyContext';
import { 
  getAccountNativeBalance, 
  formatNativeCurrency, 
  convertToCOP 
} from './utils/currencyUtils';
import {
  toSafeNumber,
  calculateNetFlow,
  calculateDebtStats,
  calculateSavingsRate
} from './utils/financeMath';
import SyncStatusBadge from './components/SyncStatusBadge';
import { useAuth } from './context/AuthContext';
import { 
  ensureUUID,
  normalizeAccountType
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
  Calendar,
  Pencil,
  ChevronDown,
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
  saveAccountsToStorage, 
  saveTransactionsToStorage, 
  saveInvestmentsToStorage, 
  saveDebtsToStorage 
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

  // Initialize state with localStorage or defaults (Lazy Initialization directa sin duplicaciones)
  const [transactions, setTransactions] = useState(() => {
    // Mismo mapa usado en la migración de cuentas para mantener integridad referencial
    const TX_LEGACY_ID_MAP = {
      'acc-1': '00000001-0000-4000-8000-000000000001',
      'acc-2': '00000002-0000-4000-8000-000000000002',
      'acc-3': '00000003-0000-4000-8000-000000000003',
      'acc-4': '00000004-0000-4000-8000-000000000004',
      'acc-5': '00000005-0000-4000-8000-000000000005'
    };
    try {
      const local = localStorage.getItem('presu_transactions') ||
                    localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) ||
                    localStorage.getItem('app_transactions');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          const seen = new Set();
          let needsWrite = false;
          const result = parsed.filter(t => {
            if (!t || !t.id) return false;
            if (seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
          }).map((t) => {
            const txIdOK = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            // Migrar accountId legacy si corresponde
            const rawAccId = t.accountId || t.account_id;
            const migratedAccId = rawAccId && TX_LEGACY_ID_MAP[rawAccId]
              ? (needsWrite = true, TX_LEGACY_ID_MAP[rawAccId])
              : rawAccId;
            return {
              ...t,
              id: (t.id && txIdOK.test(t.id)) ? t.id : (t.id || generateUUID()),
              accountId: migratedAccId || t.accountId,
              amount: toSafeNumber(t.amount),
              originalAmount: toSafeNumber(t.originalAmount ?? t.amount),
              exchangeRate: toSafeNumber(t.exchangeRate || 1)
            };
          });
          if (needsWrite) {
            try {
              localStorage.setItem('presu_transactions', JSON.stringify(result));
            } catch {}
          }
          return result;
        }
      }
      return [];
    } catch (e) {
      console.error('Error parseando transacciones:', e);
      return [];
    }
  });

  const [accounts, setAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem('presu_accounts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  const [debtsAndLoans, setDebtsAndLoans] = useState(() => {
    const saved = localStorage.getItem('user_debts') || localStorage.getItem(STORAGE_KEYS.DEBTS);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error parseando deudas:', e);
      }
    }
    return INITIAL_DEBTS_AND_LOANS;
  });

  const [investments, setInvestments] = useState(() => {
    const saved = localStorage.getItem('presu_investments') ||
                  localStorage.getItem('user_investments') ||
                  localStorage.getItem('app_investments');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        // Si contiene datos de prueba antiguos ('inv-1' o 'VOO Vanguard'), limpiarlo a vacío
        if (Array.isArray(parsed) && parsed.some(inv => inv.id === 'inv-1' || inv.name?.includes('VOO Vanguard'))) {
          saveInvestmentsToStorage([]);
          return [];
        }
        return Array.isArray(parsed) ? parsed.map(inv => ({
          ...inv,
          quantity: toSafeNumber(inv.quantity || inv.shares),
          buyPrice: toSafeNumber(inv.buyPrice || inv.purchasePrice),
          currentPrice: toSafeNumber(inv.currentPrice || inv.unitPrice || inv.buyPrice)
        })) : [];
      } catch (e) {
        return [];
      }
    }
    return []; // Si no hay nada guardado, inicia completamente vacía
  });

  // Sincronización y estado de la Tasa Representativa del Mercado (TRM)
  const { trm, setTrm, updateTRM } = useTRM(isResettingRef);

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
    setTransactions([]);
    localStorage.setItem('presu_transactions', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    localStorage.setItem('app_transactions', JSON.stringify([]));
    localStorage.setItem('transactions', JSON.stringify([]));
    saveTransactionsToStorage([]);

    setDebtsAndLoans([]);
    localStorage.setItem('user_debts', JSON.stringify([]));
    localStorage.setItem('app_loans', JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.DEBTS_AND_LOANS, JSON.stringify([]));

    setInvestments([]);
    localStorage.setItem('user_investments', JSON.stringify([]));
    localStorage.setItem('presu_investments', JSON.stringify([]));
    localStorage.setItem('app_investments', JSON.stringify([]));
    saveInvestmentsToStorage([]);

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


  useEffect(() => {
    if (isResettingRef.current) return;
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    if (isResettingRef.current) return;
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    localStorage.setItem('user_accounts', JSON.stringify(accounts));
  }, [accounts]);


  useEffect(() => {
    if (isResettingRef.current) return;
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debtsAndLoans));
    localStorage.setItem('user_debts', JSON.stringify(debtsAndLoans));
  }, [debtsAndLoans]);

  useEffect(() => {
    // Purga de claves legadas y datos residuales de prueba
    try {
      localStorage.removeItem('finanzas_investments_v1');
      localStorage.removeItem('investments_initialized');
      const saved = localStorage.getItem('user_investments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some(inv => inv.id === 'inv-1' || inv.name?.includes('VOO Vanguard'))) {
          localStorage.setItem('user_investments', JSON.stringify([]));
          setInvestments([]);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isResettingRef.current) return;
    localStorage.setItem('user_investments', JSON.stringify(investments));
  }, [investments]);








  // Compute monthly transactions and metrics
  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  const monthlyTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date + 'T00:00:00');
    return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
  });

  // Calculate statistics (scoped to selectedDay if set, otherwise whole month)
  const scopedTransactions = selectedDay 
    ? monthlyTransactions.filter((tx) => tx.date === selectedDay)
    : monthlyTransactions;

  const isTransferTx = (tx) => Boolean(
    tx && (
      tx.isTransfer ||
      tx.is_transfer ||
      tx.type === 'transfer' ||
      tx.type === 'transferencia' ||
      tx.categoryId === 'cat-transfer' ||
      tx.category_id === 'cat-transfer' ||
      tx.subcategoryId === 'sub-transfer-in' ||
      tx.subcategoryId === 'sub-transfer-out'
    )
  );

  const totalIncome = scopedTransactions
    .filter((tx) => tx && (tx.type === 'income' || tx.type === 'ingreso') && !isTransferTx(tx))
    .reduce((sum, tx) => sum + toSafeNumber(tx.amount), 0);

  const totalExpense = scopedTransactions
    .filter((tx) => tx && (tx.type === 'expense' || tx.type === 'gasto') && !isTransferTx(tx))
    .reduce((sum, tx) => sum + toSafeNumber(tx.amount), 0);

  const netBalance = calculateNetFlow(totalIncome, totalExpense);

  // Saldo Disponible Líquido: Sumando exclusivamente el saldo positivo de las cuentas líquidas del usuario (Efectivo, Cuentas de ahorros/débito, Billeteras). Excluye tarjetas de crédito, deudas y pasivos.
  // Convierte automáticamente cuentas en USD y EUR a COP con la TRM oficial
  const isLiquidAccount = (acc) => {
    if (!acc) return false;
    const t = String(acc.type || '').toLowerCase();
    // Excluir tarjetas de crédito, deudas, préstamos y pasivos
    if (t === 'card' || t === 'credit' || t === 'credit_card' || t === 'debt' || t === 'loan' || t === 'liability') {
      return false;
    }
    return true;
  };

  const liquidAccounts = accounts.filter(isLiquidAccount);
  const availableLiquidBalance = liquidAccounts.reduce((sum, acc) => {
    const balNative = toSafeNumber(getAccountNativeBalance(acc, transactions, trm));
    if (balNative <= 0) return sum;
    const balCOP = convertToCOP(balNative, acc.currency || 'COP', trm);
    return sum + toSafeNumber(balCOP);
  }, 0);

  // Active debts count con validación matemática contra saldos negativos o redondeos float
  const activeDebtsCount = debtsAndLoans.filter((item) => {
    const base = toSafeNumber(item.principalAmount || item.totalAmount);
    const accruedInterest = base * (toSafeNumber(item.interestRate) / 100);
    const insurance = toSafeNumber(item.insuranceFee);
    const stats = calculateDebtStats(base, item.payments, {
      accruedInterest: accruedInterest + insurance
    });
    return !stats.isPaid && stats.outstandingBalance > 0.01;
  }).length;

  const savingsRate = calculateSavingsRate(totalIncome, totalExpense);

  const monthlyStats = {
    totalIncome,
    totalExpense,
    netBalance,
    availableLiquidBalance,
    savingsRate,
    incomeCount: scopedTransactions.filter((tx) => (tx?.type === 'income' || tx?.type === 'ingreso') && !isTransferTx(tx)).length,
    expenseCount: scopedTransactions.filter((tx) => (tx?.type === 'expense' || tx?.type === 'gasto') && !isTransferTx(tx)).length,
    activeDebtsCount
  };

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

  // Transaction Actions
  const handleAddTransaction = async (newTx) => {
    const id = (newTx.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newTx.id))
      ? newTx.id
      : generateUUID();
    const sanitizedTx = {
      ...newTx,
      id,
      amount: toSafeNumber(newTx.amount),
      originalAmount: toSafeNumber(newTx.originalAmount ?? newTx.amount),
      exchangeRate: toSafeNumber(newTx.exchangeRate || 1),
      updated_at: new Date().toISOString()
    };
    const updated = [sanitizedTx, ...transactions.filter(t => t.id !== id)];

    // 1. Escribir inmediatamente en localStorage de forma síncrona
    try {
      localStorage.setItem('presu_transactions', JSON.stringify(updated));
      saveTransactionsToStorage(updated);
      setTransactions(updated);
    } catch (localErr) {
      console.error("Fallo real en localStorage:", localErr);
      toast.error("Error al guardar localmente");
      return;
    }

    // Si es un movimiento de tipo transferencia con origen y destino válidos
    const isTxTransfer = Boolean(
      sanitizedTx.isTransfer ||
      sanitizedTx.is_transfer ||
      sanitizedTx.type === 'transfer' ||
      sanitizedTx.type === 'transferencia'
    );
    const fromId = sanitizedTx.fromAccountId || sanitizedTx.from_account_id;
    const toId = sanitizedTx.toAccountId || sanitizedTx.to_account_id;

    let updatedAccounts = accounts;
    if (isTxTransfer && fromId && toId && fromId !== toId) {
      const transferAmount = toSafeNumber(sanitizedTx.originalAmount || sanitizedTx.amount);
      updatedAccounts = accounts.map((acc) => {
        if (acc.id === fromId) {
          const currentBalance = toSafeNumber(acc.balance);
          return {
            ...acc,
            initialBalance: acc.initialBalance !== undefined ? acc.initialBalance : currentBalance,
            balance: currentBalance - transferAmount,
            currentBalance: currentBalance - transferAmount,
            updated_at: new Date().toISOString()
          };
        }
        if (acc.id === toId) {
          const currentBalance = toSafeNumber(acc.balance);
          return {
            ...acc,
            initialBalance: acc.initialBalance !== undefined ? acc.initialBalance : currentBalance,
            balance: currentBalance + transferAmount,
            currentBalance: currentBalance + transferAmount,
            updated_at: new Date().toISOString()
          };
        }
        return acc;
      });
      setAccounts(updatedAccounts);
      localStorage.setItem('presu_accounts', JSON.stringify(updatedAccounts));
      saveAccountsToStorage(updatedAccounts);
    }

    // 2. Notificar éxito garantizado al usuario
    toast.success('Movimiento registrado con éxito');

  };
  const handleSaveTransaction = handleAddTransaction;

  const handleUpdateTransaction = async (updatedTx) => {
    const sanitizedTx = {
      ...updatedTx,
      amount: toSafeNumber(updatedTx.amount),
      originalAmount: toSafeNumber(updatedTx.originalAmount ?? updatedTx.amount),
      exchangeRate: toSafeNumber(updatedTx.exchangeRate || 1),
      updated_at: new Date().toISOString()
    };
    const updated = transactions.map((t) => (t.id === sanitizedTx.id ? sanitizedTx : t));

    // 1. Escribir inmediatamente en localStorage de forma síncrona
    try {
      localStorage.setItem('presu_transactions', JSON.stringify(updated));
      saveTransactionsToStorage(updated);
      setTransactions(updated);
    } catch (localErr) {
      console.error("Fallo real en localStorage:", localErr);
      toast.error("Error al guardar localmente");
      return;
    }

    // 2. Notificar éxito garantizado
    toast.success('Movimiento actualizado con éxito');
  };

  const handleDeleteTransaction = async (txId) => {
    const updated = transactions.filter((t) => t.id !== txId && ensureUUID(t.id) !== txId);

    // 1. Escribir inmediatamente en localStorage de forma síncrona
    localStorage.setItem('presu_transactions', JSON.stringify(updated));
    saveTransactionsToStorage(updated);

    // 2. Actualizar el estado de React
    setTransactions(updated);
    toast.info('Elemento eliminado');
  };

  // Transferencia entre cuentas
  const handleExecuteTransfer = async ({
    fromAcc,
    toAcc,
    amount,
    destAmount,
    fromCurrency,
    toCurrency,
    date,
    note
  }) => {
    if (!fromAcc?.id || !toAcc?.id || fromAcc.id === toAcc.id) {
      toast.error('Selecciona cuentas de origen y destino válidas y diferentes');
      return;
    }

    const transferAmount = toSafeNumber(amount);
    if (transferAmount <= 0) {
      toast.error('El monto a transferir debe ser mayor a 0');
      return;
    }

    const cleanDestAmount = destAmount !== undefined ? toSafeNumber(destAmount) : transferAmount;
    const rate = fromCurrency === 'USD' ? (Number(trm) || 4050) : fromCurrency === 'EUR' ? Math.round((Number(trm) || 4050) * 1.08) : 1;
    const copAmount = fromCurrency === 'COP' ? transferAmount : Math.round(transferAmount * rate);

    const outId = generateUUID();
    const inId = generateUUID();

    // Débito / Gasto en cuenta origen
    const outTx = {
      id: outId,
      date: date || new Date().toISOString().split('T')[0],
      type: 'expense',
      amount: copAmount,
      originalAmount: transferAmount,
      originalCurrency: fromCurrency,
      exchangeRate: rate,
      categoryId: 'cat-transfer',
      categoryName: 'Transferencias',
      subcategoryId: 'sub-transfer-out',
      subcategoryName: 'Transferencia Enviada',
      accountId: fromAcc.id,
      accountName: fromAcc.name,
      fromAccountId: fromAcc.id,   // FK explícito para Supabase
      toAccountId: toAcc.id,       // FK explícito para Supabase
      note: note ? `Transferencia a ${toAcc.name}: ${note}` : `Transferencia a ${toAcc.name}`,
      notes: note ? `Transferencia a ${toAcc.name}: ${note}` : `Transferencia a ${toAcc.name}`,
      isTransfer: true,
      updated_at: new Date().toISOString()
    };

    // Crédito / Ingreso en cuenta destino
    const inRate = toCurrency === 'USD' ? (Number(trm) || 4050) : toCurrency === 'EUR' ? Math.round((Number(trm) || 4050) * 1.08) : 1;
    const inTx = {
      id: inId,
      date: date || new Date().toISOString().split('T')[0],
      type: 'income',
      amount: copAmount,
      originalAmount: cleanDestAmount,
      originalCurrency: toCurrency,
      exchangeRate: inRate,
      categoryId: 'cat-transfer',
      categoryName: 'Transferencias',
      subcategoryId: 'sub-transfer-in',
      subcategoryName: 'Transferencia Recibida',
      accountId: toAcc.id,
      accountName: toAcc.name,
      fromAccountId: fromAcc.id,   // FK explícito para Supabase
      toAccountId: toAcc.id,       // FK explícito para Supabase
      note: note ? `Transferencia desde ${fromAcc.name}: ${note}` : `Transferencia desde ${fromAcc.name}`,
      notes: note ? `Transferencia desde ${fromAcc.name}: ${note}` : `Transferencia desde ${fromAcc.name}`,
      isTransfer: true,
      updated_at: new Date().toISOString()
    };

    // 1. Actualización atómica de saldos de ambas cuentas en estado y localStorage
    const updatedAccounts = accounts.map((acc) => {
      if (acc.id === fromAcc.id) {
        const currentBalance = toSafeNumber(acc.balance);
        return {
          ...acc,
          initialBalance: acc.initialBalance !== undefined ? acc.initialBalance : currentBalance,
          balance: currentBalance - transferAmount,
          currentBalance: currentBalance - transferAmount,
          updated_at: new Date().toISOString()
        };
      }
      if (acc.id === toAcc.id) {
        const currentBalance = toSafeNumber(acc.balance);
        return {
          ...acc,
          initialBalance: acc.initialBalance !== undefined ? acc.initialBalance : currentBalance,
          balance: currentBalance + cleanDestAmount,
          currentBalance: currentBalance + cleanDestAmount,
          updated_at: new Date().toISOString()
        };
      }
      return acc;
    });

    // 1. Actualización local garantizada
    const nextTxs = [inTx, outTx, ...transactions];
    try {
      setAccounts(updatedAccounts);
      localStorage.setItem('presu_accounts', JSON.stringify(updatedAccounts));
      saveAccountsToStorage(updatedAccounts);
      localStorage.setItem('presu_transactions', JSON.stringify(nextTxs));
      saveTransactionsToStorage(nextTxs);
      setTransactions(nextTxs);
    } catch (localErr) {
      console.error("Fallo real en localStorage:", localErr);
      toast.error("Error al guardar localmente");
      return;
    }
    setIsTransferModalOpen(false);

    // 2. Notificar éxito garantizado
    toast.success('Movimiento registrado con éxito');

  };

  // Account Actions
  const handleAddAccount = async (newAcc) => {
    const id = (newAcc.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newAcc.id))
      ? newAcc.id
      : generateUUID();
    const parsedInitialBalance = toSafeNumber(newAcc.initialBalance ?? newAcc.balance ?? 0);
    const normalizedAcc = {
      ...newAcc,
      id,
      name: (newAcc.name || 'Cuenta').trim(),
      type: normalizeAccountType(newAcc.type),
      currency: (newAcc.currency || 'COP').toUpperCase(),
      initialBalance: parsedInitialBalance,
      balance: parsedInitialBalance,
      currentBalance: parsedInitialBalance,
      color: newAcc.color || '#007AFF',
      icon: newAcc.icon || 'Building2',
      updated_at: new Date().toISOString()
    };

    // 1. Generar nuevo arreglo eliminando duplicados por ID o por firma idéntica
    const nextAccs = [
      ...accounts.filter(a => a.id !== id && `${(a.name || '').trim().toLowerCase()}___${(a.currency || 'COP').toUpperCase()}` !== `${normalizedAcc.name.toLowerCase()}___${normalizedAcc.currency}`),
      normalizedAcc
    ];

    // 2. Escribir inmediatamente en localStorage de forma síncrona
    try {
      localStorage.setItem('presu_accounts', JSON.stringify(nextAccs));
      saveAccountsToStorage(nextAccs);
      setAccounts(nextAccs);
    } catch (localErr) {
      console.error("Fallo real en localStorage:", localErr);
      toast.error("Error al guardar localmente");
      return;
    }

    // 3. Notificar éxito garantizado
    toast.success('Cuenta guardada correctamente');
  };
  const handleSaveAccount = handleAddAccount;

  const handleUpdateAccount = async (updatedAcc) => {
    const existing = accounts.find((a) => a.id === updatedAcc.id) || {};
    const parsedInitialBalance = toSafeNumber(updatedAcc.initialBalance ?? existing.initialBalance ?? 0);
    const liveBalance = getAccountNativeBalance({ ...existing, ...updatedAcc, initialBalance: parsedInitialBalance }, transactions, trm);

    const normalizedAcc = {
      ...existing,
      ...updatedAcc,
      id: updatedAcc.id,
      name: (updatedAcc.name || existing.name || 'Cuenta').trim(),
      type: normalizeAccountType(updatedAcc.type || existing.type),
      currency: (updatedAcc.currency || existing.currency || 'COP').toUpperCase(),
      initialBalance: parsedInitialBalance,
      balance: liveBalance,
      currentBalance: liveBalance,
      color: updatedAcc.color || existing.color || '#007AFF',
      icon: updatedAcc.icon || existing.icon || 'Building2',
      updated_at: new Date().toISOString()
    };

    // 1. Generar nuevo arreglo
    const nextAccs = accounts.map((a) => (a.id === normalizedAcc.id ? normalizedAcc : a));

    // 2. Escribir inmediatamente en localStorage de forma síncrona
    try {
      localStorage.setItem('presu_accounts', JSON.stringify(nextAccs));
      saveAccountsToStorage(nextAccs);
      setAccounts(nextAccs);
      setTransactions((prev) =>
        prev.map((t) => (t.accountId === normalizedAcc.id ? { ...t, accountName: normalizedAcc.name } : t))
      );
    } catch (localErr) {
      console.error("Fallo real en localStorage:", localErr);
      toast.error("Error al guardar localmente");
      return;
    }

    // 3. Notificar éxito garantizado
    toast.success('Cuenta guardada correctamente');
  };

  const handleDeleteAccount = async (accountId) => {
    try {
      const canonicalId = ensureUUID(accountId);

      // Eliminar en local
      const updated = accounts.filter(acc => acc.id !== accountId && ensureUUID(acc.id) !== accountId);
      setAccounts(updated);
      localStorage.setItem('presu_accounts', JSON.stringify(updated));
      saveAccountsToStorage(updated);

      // Reconciliar transacciones locales vinculadas
      setTransactions((prev) => {
        const nextTxs = prev.filter(t => t.accountId !== accountId && t.accountId !== canonicalId);
        localStorage.setItem('presu_transactions', JSON.stringify(nextTxs));
        return nextTxs;
      });

      toast.success('Cuenta eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar cuenta:', error);
      toast.error('No se pudo eliminar la cuenta');
    }
  };
  const deleteAccount = handleDeleteAccount;

  const handleReorderAccounts = (newAccounts) => {
    setAccounts(newAccounts);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(newAccounts));
  };


  // Loans & Debts Actions
  const handleAddDebtOrLoan = async (newItem) => {
    const nextDebts = [newItem, ...debtsAndLoans];
    setDebtsAndLoans(nextDebts);
    saveDebtsToStorage(nextDebts);
  };
  const handleSaveLoan = handleAddDebtOrLoan;

  const handleUpdateDebtOrLoan = async (updatedItem) => {
    const nextDebts = debtsAndLoans.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item));
    setDebtsAndLoans(nextDebts);
    saveDebtsToStorage(nextDebts);
  };

  const handleAddPayment = (itemId, payment) => {
    const debtItem = debtsAndLoans.find((d) => d.id === itemId);
    const capAmt = payment.capitalAmount !== undefined ? Number(payment.capitalAmount) : (payment.mode === 'interest' ? 0 : Number(payment.amount) || 0);
    const intAmt = payment.interestAmount !== undefined ? Number(payment.interestAmount) : (payment.mode === 'interest' ? Number(payment.amount) || 0 : 0);
    const totAmt = Number(payment.amount) || (capAmt + intAmt);
    const isReceivable = debtItem?.type === 'receivable';
    const debtName = debtItem?.personName || debtItem?.name || (isReceivable ? 'Préstamo' : 'Deuda');

    const createdTxIds = [];
    const newTransactions = [];

    // Ensure category Finanzas exists or find it
    const existingFinanzas = categories.find(c => c.name?.toLowerCase().trim() === 'finanzas');
    const finanzasCatId = existingFinanzas?.id || 'cat-finanzas';

    if (!existingFinanzas) {
      setCategories(prev => {
        if (prev.some(c => c.name?.toLowerCase().trim() === 'finanzas')) return prev;
        const newFinCat = {
          id: 'cat-finanzas',
          name: 'Finanzas',
          type: 'expense',
          color: '#007AFF',
          icon: '💳',
          subcategories: [
            { id: 'sub-amortizacion-deuda', name: 'Amortización de deuda' },
            { id: 'sub-intereses-deuda', name: 'Intereses de deuda' },
            { id: 'sub-cobro-prestamo', name: 'Cobro de préstamo' }
          ]
        };
        const updated = [...prev, newFinCat];
        try { localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated)); } catch {}
        try { localStorage.setItem('categories', JSON.stringify(updated)); } catch {}
        return updated;
      });
    }

    const targetAccId = payment.accountId || accounts[0]?.id || 'acc-1';
    const targetAcc = accounts.find(a => a.id === targetAccId);
    const targetAccName = payment.accountName || targetAcc?.name || 'Principal';

    // 1. Movimiento de intereses (si hubo intereses)
    if (intAmt > 0) {
      const txIntId = 'tx-int-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      createdTxIds.push(txIntId);
      const newTxInt = {
        id: txIntId,
        date: payment.date || new Date().toISOString().split('T')[0],
        type: isReceivable ? 'income' : 'expense',
        amount: intAmt,
        originalCurrency: 'COP',
        originalAmount: intAmt,
        exchangeRate: 1,
        categoryId: isReceivable ? 'cat-8' : finanzasCatId,
        categoryName: isReceivable ? 'Ingresos' : 'Finanzas',
        subcategoryId: isReceivable ? 'sub-intereses-cobrados' : 'sub-intereses-deuda',
        subcategoryName: isReceivable ? 'Intereses cobrados' : 'Intereses de deuda',
        accountId: targetAccId,
        accountName: targetAccName,
        note: payment.note ? `${payment.note} (Intereses ${debtName})` : `Intereses de deuda - ${debtName}`,
        debtId: itemId,
        paymentId: payment.id,
        isDebtPayment: true
      };
      newTransactions.push(newTxInt);
    }

    // 2. Movimiento de capital (si hubo capital)
    if (capAmt > 0) {
      const txCapId = 'tx-cap-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      createdTxIds.push(txCapId);
      const newTxCap = {
        id: txCapId,
        date: payment.date || new Date().toISOString().split('T')[0],
        type: isReceivable ? 'income' : 'expense',
        amount: capAmt,
        originalCurrency: 'COP',
        originalAmount: capAmt,
        exchangeRate: 1,
        categoryId: finanzasCatId,
        categoryName: 'Finanzas',
        subcategoryId: isReceivable ? 'sub-cobro-prestamo' : 'sub-amortizacion-deuda',
        subcategoryName: isReceivable ? 'Cobro de préstamo / Capital' : 'Amortización de deuda',
        accountId: targetAccId,
        accountName: targetAccName,
        note: payment.note ? `${payment.note} (Capital ${debtName})` : `Amortización de deuda - ${debtName}`,
        debtId: itemId,
        paymentId: payment.id,
        isDebtPayment: true
      };
      newTransactions.push(newTxCap);
    }

    // Save transactions to update account balance and activity history
    if (newTransactions.length > 0) {
      setTransactions((prev) => {
        const nextTxList = [...newTransactions, ...prev];
        saveTransactionsToStorage(nextTxList);
        return nextTxList;
      });
    }

    // Actualización atómica de saldo en la cuenta seleccionada
    if (targetAccId && totAmt > 0) {
      setAccounts((prevAccounts) => {
        const updated = prevAccounts.map((acc) => {
          if (acc.id === targetAccId) {
            const curBal = Number(acc.balance) || 0;
            // Si es cobro de préstamo (receivable), el dinero ingresa (+) a la cuenta seleccionada.
            // Si es pago de deuda (payable), el dinero sale (-) de la cuenta seleccionada.
            const newBal = isReceivable ? curBal + totAmt : curBal - totAmt;
            return { ...acc, balance: newBal, updated_at: new Date().toISOString() };
          }
          return acc;
        });
        saveAccountsToStorage(updated);
        return updated;
      });
    }

    // Save payment with transactionIds and update debt remainingAmount
    const enrichedPayment = {
      ...payment,
      capitalAmount: capAmt,
      interestAmount: intAmt,
      amount: totAmt,
      accountId: targetAccId,
      accountName: targetAccName,
      transactionIds: createdTxIds
    };

    setDebtsAndLoans((prev) => {
      const nextDebts = prev.map((item) => {
        if (item.id === itemId) {
          const payments = [...(item.payments || []), enrichedPayment];
          const base = Number(item.principalAmount || item.totalAmount) || 0;
          const rate = Number(item.interestRate) || 0;
          const months = item.startDate ? calculateElapsedMonths(item.startDate) : (Number(item.monthsElapsed) || 0);
          const accruedInt = (months > 0 && rate > 0)
            ? Math.round(base * (rate / 100) * months)
            : (item.accruedInterest !== undefined ? Number(item.accruedInterest) : 0);

          const totalCapPaid = payments.reduce((s, p) => s + (p.capitalAmount !== undefined ? Number(p.capitalAmount) : (p.mode === 'interest' ? 0 : Number(p.amount) || 0)), 0);
          const totalIntPaid = payments.reduce((s, p) => s + (p.interestAmount !== undefined ? Number(p.interestAmount) : (p.mode === 'interest' ? Number(p.amount) || 0 : 0)), 0);

          const remCap = Math.max(0, base - totalCapPaid);
          const remInt = Math.max(0, accruedInt - totalIntPaid);
          const totRem = remCap + remInt;
          const isPaid = totRem <= 1 || remCap <= 0.01;

          const updated = {
            ...item,
            principalAmount: base,
            accruedInterest: accruedInt,
            monthsElapsed: months,
            remainingCapital: remCap,
            remainingInterest: remInt,
            totalRemaining: totRem,
            remainingAmount: remCap,
            remaining_amount: remCap,
            isPaid,
            is_paid: isPaid,
            status: isPaid ? 'paid' : (item.status === 'paid' ? 'active' : (item.status || 'active')),
            payments
          };
          return updated;
        }
        return item;
      });
      saveDebtsToStorage(nextDebts);
      return nextDebts;
    });
  };

  const handleDeletePayment = (itemId, paymentId) => {
    const debtItem = debtsAndLoans.find((d) => d.id === itemId);
    const paymentToDelete = debtItem?.payments?.find((p) => p.id === paymentId);

    // Revertir el saldo en la cuenta afectada
    if (paymentToDelete && paymentToDelete.accountId) {
      const isReceivable = debtItem?.type === 'receivable';
      const totAmt = Number(paymentToDelete.amount) || 0;
      if (totAmt > 0) {
        setAccounts((prevAccounts) => {
          const updated = prevAccounts.map((acc) => {
            if (acc.id === paymentToDelete.accountId) {
              const curBal = Number(acc.balance) || 0;
              // Al revertir: si fue cobro (+), ahora resta (-); si fue pago (-), ahora suma (+)
              const newBal = isReceivable ? curBal - totAmt : curBal + totAmt;
              return { ...acc, balance: newBal, updated_at: new Date().toISOString() };
            }
            return acc;
          });
          saveAccountsToStorage(updated);
          return updated;
        });
      }
    }

    setDebtsAndLoans((prev) => {
      const nextDebts = prev.map((item) => {
        if (item.id === itemId) {
          const remainingPayments = (item.payments || []).filter((p) => p.id !== paymentId);
          const base = Number(item.principalAmount || item.totalAmount) || 0;
          const rate = Number(item.interestRate) || 0;
          const months = item.startDate ? calculateElapsedMonths(item.startDate) : (Number(item.monthsElapsed) || 0);
          const accruedInt = (months > 0 && rate > 0)
            ? Math.round(base * (rate / 100) * months)
            : (item.accruedInterest !== undefined ? Number(item.accruedInterest) : 0);

          const totalCapPaid = remainingPayments.reduce((s, p) => s + (p.capitalAmount !== undefined ? Number(p.capitalAmount) : (p.mode === 'interest' ? 0 : Number(p.amount) || 0)), 0);
          const totalIntPaid = remainingPayments.reduce((s, p) => s + (p.interestAmount !== undefined ? Number(p.interestAmount) : (p.mode === 'interest' ? Number(p.amount) || 0 : 0)), 0);

          const remCap = Math.max(0, base - totalCapPaid);
          const remInt = Math.max(0, accruedInt - totalIntPaid);
          const totRem = remCap + remInt;
          const isPaid = totRem <= 1 || remCap <= 0.01;

          const updated = {
            ...item,
            principalAmount: base,
            accruedInterest: accruedInt,
            monthsElapsed: months,
            remainingCapital: remCap,
            remainingInterest: remInt,
            totalRemaining: totRem,
            remainingAmount: remCap,
            remaining_amount: remCap,
            isPaid,
            is_paid: isPaid,
            status: isPaid ? 'paid' : (item.status === 'paid' ? 'active' : (item.status || 'active')),
            payments: remainingPayments
          };
          return updated;
        }
        return item;
      });
      saveDebtsToStorage(nextDebts);
      return nextDebts;
    });

    // Revert balance by deleting linked transactions
    setTransactions((prev) => {
      const remaining = prev.filter((t) => t.paymentId !== paymentId);
      saveTransactionsToStorage(remaining);
      return remaining;
    });
  };

  const handleAddDisbursement = (debtId, disbursementData) => {
    const { amount, date, fromAccountId, notes } = disbursementData;
    const disbAmount = Number(amount) || 0;
    if (disbAmount <= 0) return;

    const debtItem = debtsAndLoans.find((d) => d.id === debtId);
    if (!debtItem) return;

    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const fromAccName = fromAcc?.name || 'Cuenta Principal';
    const debtName = debtItem.personName || debtItem.name || 'Préstamo';

    // 1. Descontar inmediatamente el dinero prestado de la cuenta de origen
    if (fromAccountId) {
      setAccounts((prevAccounts) => {
        const updated = prevAccounts.map((acc) => {
          if (acc.id === fromAccountId) {
            const curBal = Number(acc.balance) || 0;
            const newBal = curBal - disbAmount;
            return { ...acc, balance: newBal, updated_at: new Date().toISOString() };
          }
          return acc;
        });
        saveAccountsToStorage(updated);
        return updated;
      });
    }

    // 2. Registrar transacción de gasto en transactions
    const txId = 'tx-disb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newTx = {
      id: txId,
      date: date || new Date().toISOString().split('T')[0],
      type: 'expense',
      amount: disbAmount,
      originalCurrency: 'COP',
      originalAmount: disbAmount,
      exchangeRate: 1,
      categoryId: 'cat-finanzas',
      categoryName: 'Finanzas',
      subcategoryId: 'sub-desembolso-prestamo',
      subcategoryName: 'Desembolso de préstamo',
      accountId: fromAccountId,
      accountName: fromAccName,
      note: notes ? `${notes} (Desembolso adicional a ${debtName})` : `Desembolso adicional - Préstamo a ${debtName}`,
      debtId: debtId,
      isDebtDisbursement: true
    };

    setTransactions((prev) => {
      const nextTxList = [newTx, ...prev];
      saveTransactionsToStorage(nextTxList);
      return nextTxList;
    });

    // 3. Registrar el desembolso y sumar el monto al capital del préstamo
    const newDisbursementRecord = {
      id: 'disb-' + Date.now(),
      amount: disbAmount,
      date: date || new Date().toISOString().split('T')[0],
      fromAccountId,
      fromAccountName: fromAccName,
      notes: notes || '',
      transactionId: txId
    };

    setDebtsAndLoans((prev) => {
      const nextDebts = prev.map((item) => {
        if (item.id === debtId) {
          const oldBase = Number(item.principalAmount || item.totalAmount) || 0;
          const newBase = oldBase + disbAmount;
          const oldTotal = Number(item.totalAmount) || oldBase;
          const newTotal = oldTotal + disbAmount;
          const disbursements = [...(item.disbursements || []), newDisbursementRecord];

          // Recalcular saldo pendiente
          const payments = item.payments || [];
          const totalCapPaid = payments.reduce((s, p) => s + (p.capitalAmount !== undefined ? Number(p.capitalAmount) : (p.mode === 'interest' ? 0 : Number(p.amount) || 0)), 0);
          const remCap = Math.max(0, newBase - totalCapPaid);
          const remInt = Number(item.remainingInterest) || 0;
          const totRem = remCap + remInt;
          const isPaid = totRem <= 1 || remCap <= 0.01;

          const updated = {
            ...item,
            principalAmount: newBase,
            totalAmount: newTotal,
            remainingCapital: remCap,
            remainingAmount: remCap,
            remaining_amount: remCap,
            totalRemaining: totRem,
            isPaid,
            is_paid: isPaid,
            status: isPaid ? 'paid' : (item.status === 'paid' ? 'active' : (item.status || 'active')),
            disbursements
          };
          return updated;
        }
        return item;
      });
      saveDebtsToStorage(nextDebts);
      return nextDebts;
    });
  };

  const handleDeleteDebtOrLoan = async (itemId) => {
    if (confirm('¿Eliminar este registro de deuda/préstamo?')) {
      const nextDebts = debtsAndLoans.filter((item) => item.id !== itemId);
      setDebtsAndLoans(nextDebts);
      saveDebtsToStorage(nextDebts);

      const nextTxs = transactions.filter((t) => t.debtId !== itemId);
      setTransactions(nextTxs);
      saveTransactionsToStorage(nextTxs);

      toast.info('Elemento eliminado');
    }
  };

  // Investment Actions
  const handleAddInvestment = async (newInv) => {
    const sanitizedInv = {
      ...newInv,
      quantity: toSafeNumber(newInv.quantity || newInv.shares),
      buyPrice: toSafeNumber(newInv.buyPrice || newInv.purchasePrice),
      currentPrice: toSafeNumber(newInv.currentPrice || newInv.unitPrice || newInv.buyPrice)
    };
    const next = [sanitizedInv, ...investments];

    // 1. Guardado local garantizado
    try {
      setInvestments(next);
      saveInvestmentsToStorage(next);
    } catch (localErr) {
      console.error("Fallo real en localStorage:", localErr);
      toast.error("Error al guardar localmente");
      return;
    }

    // 2. Notificar éxito garantizado
    toast.success('Inversión guardada correctamente');
  };
  const handleSaveInvestment = handleAddInvestment;

  const handleUpdateInvestment = async (updatedInv) => {
    const sanitizedInv = {
      ...updatedInv,
      quantity: toSafeNumber(updatedInv.quantity || updatedInv.shares),
      buyPrice: toSafeNumber(updatedInv.buyPrice || updatedInv.purchasePrice),
      currentPrice: toSafeNumber(updatedInv.currentPrice || updatedInv.unitPrice || updatedInv.buyPrice)
    };
    const next = investments.map((inv) => (inv.id === sanitizedInv.id ? sanitizedInv : inv));

    // 1. Guardado local garantizado
    try {
      setInvestments(next);
      saveInvestmentsToStorage(next);
    } catch (localErr) {
      console.error("Fallo real en localStorage:", localErr);
      toast.error("Error al guardar localmente");
      return;
    }

    // 2. Notificar éxito garantizado
    toast.success('Inversión actualizada correctamente');
  };

  const handleDeleteInvestment = async (invId) => {
    const next = investments.filter((inv) => inv.id !== invId);
    setInvestments(next);
    saveInvestmentsToStorage(next);
    toast.info('Elemento eliminado');
  };

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
      setTransactions([]);
      setAccounts([]);
      setDebtsAndLoans([]);
      setInvestments([]);
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

  const currentMonthLabel = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

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
        onTabChange={handleTabChange}
        onOpenTransaction={handleOpenTransaction}
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
        {/* Barra de Estado iOS simulada para móviles en tablet reducida (< lg) */}
        <div 
          className={`${isForcedMobile ? 'flex' : isForcedDesktop ? 'hidden' : 'hidden sm:flex lg:hidden'} items-center justify-between px-7 pt-3 pb-1 text-xs font-semibold select-none shrink-0 z-40 bg-slate-50/90 dark:bg-[#090A0F]/90 text-slate-900 dark:text-slate-100`} 
          style={{ backgroundColor: 'var(--header-bg)', color: 'var(--text-main)' }}
        >
          <span className="text-[11px] font-bold">9:41</span>
          <div className="w-24 h-4.5 bg-black rounded-full shadow-inner flex items-center justify-end px-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="font-bold">5G</span>
            <div className="w-4 h-2.5 border border-current rounded-xs p-0.5 flex items-center">
              <div className="w-full h-full bg-current rounded-2xs"></div>
            </div>
          </div>
        </div>

        {/* Top Header Móvil (< lg) */}
        <div className={mobileOnlyClass}>
          <Header 
            monthlyStats={monthlyStats} 
            userProfile={userProfile}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onOpenProfile={handleOpenProfile}
            onOpenSettings={handleOpenProfile}
            onOpenAuth={() => {}}
            onLogout={() => {
              setIsLocked(true);
            }}
            accounts={accounts}
            subscriptions={subscriptions}
            debtsAndLoans={debtsAndLoans}
            savingsGoals={savingsGoals}
          />
        </div>

        {/* Top Header Panorámico de Escritorio (visible en lg:) */}
        <header className={`${desktopOnlyClass} border-b border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-[#0B0E14]/80 backdrop-blur-md sticky top-0 z-20 shrink-0 select-none`}>
          <div className="max-w-[1550px] w-full mx-auto px-6 py-4.5 flex sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {activeTab === 'dashboard' && 'Panel financiero'}
                {activeTab === 'transactions' && 'Historial de movimientos'}
                {activeTab === 'accounts' && 'Cuentas y métodos de pago'}
                {activeTab === 'recurring' && 'Pagos recurrentes y suscripciones'}
                {activeTab === 'tax' && 'Impuestos y declaración de renta'}
                {activeTab === 'debts' && 'Préstamos y deudas'}
                {activeTab === 'investments' && 'Inversiones y patrimonio'}
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Bienvenido de nuevo, {userProfile?.name?.split(' ')[0] || 'Usuario'} • {currentMonthLabel}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Selector de Mes Interactivo */}
              <button
                type="button"
                onClick={() => setShowMonthPicker(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer border border-slate-200/80 dark:border-white/10 shadow-2xs group"
                title="Abrir selector de mes y año"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span>{selectedDay ? selectedDay : currentMonthLabel}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>

              {/* TRM Oficial Automatizado (No editable) */}
              <div 
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 select-none shadow-2xs"
                title="Tasa Representativa del Mercado (TRM) oficial sincronizada automáticamente con datos abiertos"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>TRM Oficial: ${Number(trm).toLocaleString('es-CO')} COP</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area con altura adaptable y separación inferior anti-solapamiento */}
        <main ref={mainContentRef} className="flex-1 w-full px-3.5 sm:px-4 lg:px-0 py-2.5 sm:py-3 lg:py-0 pb-28 sm:pb-32 lg:pb-12 relative lg:overflow-y-auto space-y-3.5 sm:space-y-4 lg:space-y-0">
          <div className="w-full lg:max-w-[1550px] lg:mx-auto lg:px-6 lg:py-6">
            
            {/* Tab 1: Dashboard Inicio */}
            {activeTab === 'dashboard' && (
              <div key={`dashboard-${tabResetKeys.dashboard}`} className="w-full flex flex-col gap-4">
                {/* Banner preventivo de recordatorios y alertas para mañana */}
                <DebtAlertBanner
                  alerts={tomorrowDebtAlerts}
                  onReview={handleReviewDebtAlert}
                  onDismiss={handleDismissAlert}
                  formatMoney={formatMoney}
                />

                {/* Widgets Financieros Modulares y Dinámicos (ordenados por el usuario, responsivo para móvil, tablet y PC) */}
                <Dashboard
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
              </div>
            )}

          {/* Tab 2: Movimientos */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
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
            </div>
          )}

          {/* Tab 3: Cuentas y Métodos de Pago */}
          {activeTab === 'accounts' && (
            <AccountsAndCategories
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
            <LoansAndDebts
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
            <div className="w-full space-y-4">
              <TaxView
                transactions={transactions}
                accounts={accounts}
                investments={investments}
                onBack={handleGoBackFromSubView}
                onClose={handleGoBackFromSubView}
                fromSettings={fromSettings}
              />
            </div>
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

        {/* Modal Global para Nuevo Movimiento (AddTransactionModal) */}
        {(isAddTxOpen || isAddTransactionOpen) && (
          <AddTransactionModal
            isOpen={isAddTxOpen || isAddTransactionOpen}
            onClose={() => {
              setIsAddTxOpen(false);
              setIsAddTransactionOpen(false);
            }}
            onSave={handleSaveTransaction}
            onAddTransaction={handleAddTransaction}
            accounts={accounts}
            categories={categories}
            onAddCategory={handleAddCategory}
            onAddSubcategory={handleAddSubcategory}
            onUpdateSubcategory={handleUpdateSubcategory}
            onDeleteSubcategory={handleDeleteSubcategory}
            onAddAccount={handleAddAccount}
            defaultDate={selectedDay || new Date().toISOString().split('T')[0]}
            defaultType={txDefaultType || 'expense'}
            trm={trm}
          />
        )}

        {/* Modal Global para Transferencia entre Cuentas */}
        {isTransferModalOpen && (
          <TransferModal
            isOpen={isTransferModalOpen}
            onClose={() => setIsTransferModalOpen(false)}
            accounts={accounts}
            transactions={transactions}
            onTransfer={handleExecuteTransfer}
            trm={trm}
          />
        )}

        {/* Modal Global para Nueva Inversión */}
        {(isAddInvestmentOpen || isNewInvestmentModalOpen) && (
          <AddInvestmentModal
            isOpen={isAddInvestmentOpen || isNewInvestmentModalOpen}
            onClose={() => {
              setIsAddInvestmentOpen(false);
              setIsNewInvestmentModalOpen(false);
            }}
            onSave={(newInv) => {
              handleAddInvestment(newInv);
              setIsAddInvestmentOpen(false);
              setIsNewInvestmentModalOpen(false);
              handleTabChange('investments');
            }}
          />
        )}

        {/* Modal Global para Nuevo Préstamo o Deuda */}
        {(isAddLoanOpen || isNewDebtModalOpen) && (
          <AddLoanModal
            isOpen={isAddLoanOpen || isNewDebtModalOpen}
            initialType={addLoanInitialType}
            defaultType={addLoanInitialType}
            onClose={() => {
              setIsAddLoanOpen(false);
              setIsNewDebtModalOpen(false);
            }}
            onSave={(newItem) => {
              handleAddDebtOrLoan(newItem);
              setIsAddLoanOpen(false);
              setIsNewDebtModalOpen(false);
              handleTabChange('debts');
            }}
          />
        )}

        {/* Modal Global para Nuevo Pago Recurrente */}
        {(isAddRecurringOpen || isNewRecurringModalOpen) && (
          <AddRecurringModal
            isOpen={isAddRecurringOpen || isNewRecurringModalOpen}
            onClose={() => {
              setIsAddRecurringOpen(false);
              setIsNewRecurringModalOpen(false);
            }}
            onSave={(newItem) => {
              handleAddRecurring(newItem);
              setIsAddRecurringOpen(false);
              setIsNewRecurringModalOpen(false);
              handleTabChange('recurring');
            }}
            accounts={accounts}
            categories={categories}
            onAddCategory={handleAddCategory}
            onAddSubcategory={handleAddSubcategory}
            trm={trm}
          />
        )}

        {/* Modal Selector de Mes / Año de Escritorio */}
        <DesktopMonthPicker
          isOpen={showMonthPicker}
          onClose={() => setShowMonthPicker(false)}
          selectedDate={selectedDate}
          onChangeMonth={(newDate) => {
            setSelectedDate(newDate);
            setSelectedDay(null);
          }}
          selectedDay={selectedDay}
          onSelectDay={(day) => setSelectedDay(day)}
          onClearSelectedDay={() => setSelectedDay(null)}
          transactions={transactions}
        />

        {/* Modal Centrado para Calendario y Filtro por Día */}
        {isCalendarOpen && (
          <CalendarDropdown
            isOpen={isCalendarOpen}
            onClose={() => setIsCalendarOpen(false)}
            selectedDate={selectedDate}
            onChangeMonth={setSelectedDate}
            selectedDay={selectedDay}
            onSelectDay={(day) => {
              setSelectedDay(day);
            }}
            transactions={transactions}
          />
        )}

        {/* Modal Global de Detalle de Tarjeta de Crédito */}
        {selectedCreditCardDetail && (
          <CreditCardDetailModal
            isOpen={!!selectedCreditCardDetail}
            onClose={() => setSelectedCreditCardDetail(null)}
            card={accounts.find(a => a.id === selectedCreditCardDetail.id) || selectedCreditCardDetail}
            transactions={transactions}
            accounts={accounts}
            onAddTransaction={handleAddTransaction}
            onOpenEdit={(card) => {
              setSelectedCreditCardDetail(null);
              handleTabChange('accounts');
            }}
          />
        )}

        {/* Modal para Personalizar / Reordenar Widgets del Dashboard */}
        <EditWidgetsModal
          isOpen={isEditWidgetsModalOpen}
          onClose={() => setIsEditWidgetsModalOpen(false)}
          widgetsConfig={widgets}
          widgets={widgets}
          onSave={(newWidgets) => {
            setWidgets([...newWidgets]);
          }}
          onReset={(defWidgets) => {
            setWidgets([...(defWidgets || DEFAULT_WIDGETS_CONFIG)]);
          }}
        />

        {/* Modal de Mi Perfil y Ajustes */}
        <ProfileModal
          key={`profile-modal-${profileResetKey}`}
          isOpen={isSettingsOpen || isProfileOpen}
          onClose={() => setIsSettingsOpen(false)}
          userProfile={userProfile}
          onUpdateProfile={handleUpdateProfile}
          securitySettings={securitySettings}
          onUpdateSecurity={setSecuritySettings}
          subscriptions={subscriptions}
          onAddSubscription={(newSub) => setSubscriptions(prev => [newSub, ...prev])}
          onDeleteSubscription={(id) => setSubscriptions(prev => prev.filter(s => s.id !== id))}
          accountsCount={accounts.length}
          categoriesCount={categories.length}
          onOpenAccounts={() => {
            setFromSettings(true);
            handleTabChange('accounts', 'settings');
          }}
          onNavigateToRecurring={() => {
            setIsSettingsOpen(false);
            setFromSettings(true);
            handleTabChange('recurring', 'settings');
          }}
          onOpenTutorial={() => {
            setIsSettingsOpen(false);
            setShowTutorial(true);
          }}
          theme={theme}
          onThemeChange={setTheme}
          budgets={budgets}
          onUpdateBudgets={setBudgets}
          savingsGoals={savingsGoals}
          onAddGoal={handleAddGoal}
          onUpdateGoal={handleUpdateGoal}
          onDeleteGoal={handleDeleteGoal}
          transactions={transactions}
          categories={categories}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onAddSubcategory={handleAddSubcategory}
          onUpdateSubcategory={handleUpdateSubcategory}
          onDeleteSubcategory={handleDeleteSubcategory}
          investments={investments}
          debtsAndLoans={debtsAndLoans}
          accounts={accounts}
          trm={trm}
          onOpenAuth={() => {}}
          onRestoreBackup={handleRestoreBackup}
          onFactoryReset={handleResetData}
          user={user}
        />

        {/* Modal / Overlay del Tutorial rápido (repetible desde Perfil) */}
        {showTutorial && (
          <OnboardingFlow
            tutorialOnly={true}
            onClose={() => setShowTutorial(false)}
          />
        )}

        {/* Pantalla de Bloqueo de Seguridad (Lock Screen) - Sólo exigible si hay PIN activo no vacío */}
        {isLocked && Boolean(securitySettings?.pinEnabled) && Boolean(securitySettings?.pin && String(securitySettings.pin).trim().length >= 4) && (
          <LockScreen
            userProfile={userProfile}
            expectedPin={securitySettings?.pin || ''}
            biometricsEnabled={Boolean(securitySettings?.biometricsEnabled)}
            onUnlock={handleUnlock}
          />
        )}

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
