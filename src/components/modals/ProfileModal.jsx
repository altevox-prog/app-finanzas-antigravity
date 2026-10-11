import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Check, 
  Lock, 
  Fingerprint, 
  CreditCard, 
  Tag, 
  CalendarSync, 
  ChevronRight, 
  Trash2, 
  Plus, 
  ShieldCheck, 
  AlertCircle, 
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Tv,
  Music,
  Cloud,
  Bell,
  Clock,
  Zap,
  RotateCcw,
  Sparkles,
  PieChart,
  Target,
  PiggyBank,
  TrendingUp,
  Calendar,
  Download,
  Upload,
  UploadCloud,
  Database,
  FileJson,
  FileSpreadsheet,
  HardDriveDownload,
  RefreshCw,
  Landmark,
  Coins,
  Sun,
  Moon,
  LogOut,
  AlertTriangle,
  Settings,
  Sliders,
  Pencil,
  Edit,
  Edit2,
  Wallet
} from 'lucide-react';
import GoalModal from './GoalModal';
import { usePrivacy } from '../../context/PrivacyContext';
import CategoriesView from '../CategoriesView';
import UpdateAppButton from '../UpdateAppButton';
import BrandIcon from '../BrandIcon';
import TaxView from '../TaxView';
import { downloadBackupJSON, downloadTransactionsCSV, downloadInvestmentsCSV, parseAndValidateBackup } from '../../utils/exportUtils';
import { useBackHandler } from '../../hooks/useBackHandler';
import { useAuth } from '../../context/AuthContext';
import { signInWithGoogle, signOutUser, supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { safeNumber } from '../../utils/financeMath';
import Avatar from '../ui/Avatar';

export default function ProfileModal({
  isOpen,
  onClose,
  onOpenAuth,
  userProfile,
  onUpdateProfile,
  securitySettings,
  onUpdateSecurity,
  subscriptions = [],
  onAddSubscription,
  onDeleteSubscription,
  accountsCount = 0,
  categoriesCount = 0,
  onOpenAccounts,
  onOpenCategories,
  theme = 'dark',
  onThemeChange,
  budgets = { global: 0, categories: {} },
  onUpdateBudgets,
  savingsGoals = [],
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  transactions = [],
  categories = [],
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  investments = [],
  debtsAndLoans = [],
  accounts = [],
  trm = 4000,
  onRestoreBackup,
  onFactoryReset,
  onOpenTutorial,
  onNavigateToRecurring,
  onManualCloudSync
}) {
  const { formatMoney, enableDecimals, toggleEnableDecimals } = usePrivacy();
  const { user, setUser, signOut } = useAuth();

  // Internal view state: 'main' | 'subscriptions' | 'pin_setup' | 'budgets' | 'savings_goals' | 'categories' | 'tax'
  const [currentView, setCurrentView] = useState('main');

  // Sistema de 4 Pestañas en el Centro de Control: 'finances' | 'security' | 'cloud' | 'system'
  const [activeTab, setActiveTab] = useState('finances');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isCloudUser = Boolean(
    user && 
    user.id && 
    user.id !== 'local-user' && 
    user.email && 
    user.email !== 'local@device'
  );

  // Edit Name State
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userProfile?.name || 'Usuario');

  useEffect(() => {
    if (userProfile?.name) {
      setTempName(userProfile.name);
    }
  }, [userProfile?.name]);

  // PIN Setup State
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // New Subscription Form State
  const [showAddSubForm, setShowAddSubForm] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubAmount, setNewSubAmount] = useState('');
  const [newSubBillingDay, setNewSubBillingDay] = useState(1);
  const [newSubFrequency, setNewSubFrequency] = useState('monthly');
  const [newSubCategory, setNewSubCategory] = useState('Entretenimiento');

  // Budgets State & Editing
  const [isEditingGlobalBudget, setIsEditingGlobalBudget] = useState(false);
  const [tempGlobalBudget, setTempGlobalBudget] = useState(budgets?.global || 0);
  const [editingCatBudgetId, setEditingCatBudgetId] = useState(null);
  const [tempCatBudgetAmount, setTempCatBudgetAmount] = useState('');

  // Savings Goals State & New Goal Form
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('0');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [editingGoal, setEditingGoal] = useState(null);
  const [editGoalName, setEditGoalName] = useState('');
  const [editGoalTarget, setEditGoalTarget] = useState('');
  const [editGoalCurrent, setEditGoalCurrent] = useState('0');
  const [editGoalDate, setEditGoalDate] = useState('');
  const [contributeGoalId, setContributeGoalId] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');

  // Toast / Feedback message
  const [toastMessage, setToastMessage] = useState(null);

  const fileInputRef = useRef(null);
  
  // Backup & Restore State
  const restoreInputRef = useRef(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupPreview, setBackupPreview] = useState(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Manejador centralizado de tecla Volver / Popstate para navegación interna escalonada
  useBackHandler(isOpen, () => {
    if (showAddGoalForm || editingGoal) {
      setShowAddGoalForm(false);
      setEditingGoal(null);
      return;
    }
    if (showAddSubForm) {
      setShowAddSubForm(false);
      return;
    }
    if (isEditingGlobalBudget) {
      setIsEditingGlobalBudget(false);
      return;
    }
    if (editingCatBudgetId) {
      setEditingCatBudgetId(null);
      return;
    }
    if (currentView !== 'main') {
      setCurrentView('main');
    } else {
      onClose();
    }
  });

  // Cada vez que se abre el modal de perfil, regresar siempre a la pantalla raíz principal ('main')
  useEffect(() => {
    if (isOpen) {
      setCurrentView('main');
      setActiveTab('finances');
      setIsEditingName(false);
      setShowAddSubForm(false);
      setShowAddGoalForm(false);
      setIsEditingGlobalBudget(false);
      setEditingCatBudgetId(null);
      setBackupPreview(null);
      setShowResetConfirm(false);
      setConfirmDeleteText('');
      setShowLogoutConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Calculate current month's expenses
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthExpenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const isTransfer = t.isTransfer || t.is_transfer || t.type === 'transfer' || t.type === 'transferencia' || t.categoryId === 'cat-transfer' || t.subcategoryId === 'sub-transfer-in' || t.subcategoryId === 'sub-transfer-out';
    if (isTransfer) return false;
    const d = new Date(t.date + 'T00:00:00');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalMonthExpense = monthExpenses.reduce((sum, t) => sum + safeNumber(t.amount), 0);

  // Group expenses by category
  const expenseByCatMap = {};
  monthExpenses.forEach((t) => {
    expenseByCatMap[t.categoryId] = (expenseByCatMap[t.categoryId] || 0) + safeNumber(t.amount);
  });

  // Profile Image Upload with Canvas Resize
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona un archivo de imagen válido.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onUpdateProfile({
          ...userProfile,
          photo: compressedDataUrl
        });
        showToast('Foto de perfil actualizada.');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    onUpdateProfile({
      ...userProfile,
      photo: null
    });
    showToast('Foto eliminada. Se mostrarán tus iniciales.');
  };

  const handleSaveName = () => {
    const cleanName = tempName.trim();
    if (!cleanName) {
      showToast('El nombre no puede estar vacío.', true);
      return;
    }
    const parts = cleanName.split(' ').filter(Boolean);
    const initials = parts.length > 1 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : cleanName.slice(0, 2).toUpperCase();

    onUpdateProfile({
      ...userProfile,
      name: cleanName,
      initials
    });
    setIsEditingName(false);
    showToast('Nombre actualizado.');
  };

  // Toggle PIN
  const handleTogglePin = () => {
    if (securitySettings?.pinEnabled) {
      onUpdateSecurity({
        ...securitySettings,
        pinEnabled: false,
        pin: '',
        biometricsEnabled: false
      });
      try {
        localStorage.setItem('security_pin_enabled', 'false');
        localStorage.setItem('security_pin_code', '');
        localStorage.setItem('presu_app_locked', 'false');
      } catch {}
      showToast('Bloqueo por PIN desactivado.');
    } else {
      setNewPin('');
      setConfirmPin('');
      setPinError('');
      setCurrentView('pin_setup');
    }
  };

  const handleSavePin = (e) => {
    e.preventDefault();
    if (newPin.length < 4 || newPin.length > 6) {
      setPinError('El PIN debe tener entre 4 y 6 dígitos numéricos.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('Los PINs ingresados no coinciden.');
      return;
    }

    onUpdateSecurity({
      ...securitySettings,
      pin: newPin,
      pinEnabled: true
    });
    setCurrentView('main');
    showToast('PIN de seguridad configurado y protección activada.');
  };

  // Toggle Biometrics with WebAuthn Registration
  const handleToggleBiometrics = async () => {
    if (securitySettings?.biometricsEnabled) {
      onUpdateSecurity({
        ...securitySettings,
        biometricsEnabled: false
      });
      localStorage.setItem('security_biometric_enabled', 'false');
      localStorage.removeItem('security_biometric_cred_id');
      showToast('Autenticación biométrica desactivada.');
      return;
    }

    // Requiere tener activo el PIN antes de habilitar la biometría
    if (!securitySettings?.pinEnabled || !securitySettings?.pin || securitySettings.pin.length < 4) {
      showToast('Debes configurar y activar primero un PIN de seguridad antes de habilitar la huella.', true);
      return;
    }

    // 1. Verifica si window.PublicKeyCredential existe
    if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) {
      showToast('Tu dispositivo o navegador no soporta autenticación biométrica en esta app', true);
      return;
    }

    try {
      // Verifica si PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable() retorna true
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.();
      if (!isAvailable) {
        showToast('Tu dispositivo o navegador no soporta autenticación biométrica en esta app', true);
        return;
      }

      // Registro biométrico estándar para autenticadores de plataforma (Android / WebAuthn)
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: 'Monety',
            id: window.location.hostname
          },
          user: {
            id: userId,
            name: 'usuario@monety.local',
            displayName: 'Usuario Monety'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' }
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          timeout: 60000
        }
      });

      if (credential) {
        const rawIdArray = Array.from(new Uint8Array(credential.rawId));
        localStorage.setItem('security_biometric_enabled', 'true');
        localStorage.setItem('security_biometric_cred_id', JSON.stringify(rawIdArray));
        onUpdateSecurity({
          ...securitySettings,
          biometricsEnabled: true
        });
        showToast('¡Huella dactilar activada correctamente!');
      }
    } catch (err) {
      console.warn('Error en registro biométrico:', err);
      // Envuelto en try/catch para que si el usuario cancela o hay error, el switch permanezca apagado sin romper la app
      if (err.name === 'NotAllowedError') {
        showToast('Registro biométrico cancelado o no autorizado. Se mantiene solo el PIN.', true);
      } else {
        showToast('No se pudo registrar la huella en este dispositivo. Mantén solo el PIN.', true);
      }
    }
  };

  // Subscriptions
  const handleCreateSubscription = (e) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubAmount || Number(newSubAmount) <= 0) {
      showToast('Por favor completa el nombre y un monto válido.', true);
      return;
    }

    const sub = {
      id: `sub-${Date.now()}`,
      name: newSubName.trim(),
      amount: Number(newSubAmount),
      frequency: newSubFrequency,
      billingDay: Number(newSubBillingDay) || 1,
      category: newSubCategory,
      icon: newSubCategory === 'Música' ? 'Music' : newSubCategory === 'Nube y Datos' ? 'Cloud' : 'Tv',
      active: true
    };

    onAddSubscription(sub);
    setNewSubName('');
    setNewSubAmount('');
    setShowAddSubForm(false);
    showToast(`Suscripción ${sub.name} agregada.`);
  };

  const totalMonthlySubscriptions = subscriptions.reduce((sum, s) => {
    if (!s.active) return sum;
    const sAmount = safeNumber(s.amount);
    return sum + (s.frequency === 'yearly' ? Math.round(sAmount / 12) : sAmount);
  }, 0);

  // Budgets Handlers
  const handleSaveGlobalBudget = () => {
    const val = Number(tempGlobalBudget || 0);
    if (val < 0) {
      showToast('Ingresa un monto válido para el presupuesto.', true);
      return;
    }
    const updated = {
      ...budgets,
      global: val
    };
    if (typeof onUpdateBudgets === 'function') {
      onUpdateBudgets(updated);
    }
    try {
      localStorage.setItem('presu_budgets_v1', JSON.stringify(updated));
      localStorage.setItem('budgets', JSON.stringify(updated));
      localStorage.setItem('global_budget_limit', String(val));
    } catch {}

    // Persistir directamente en Supabase si hay sesión activa
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const targetUserId = authData?.user?.id || (user?.id !== 'local-user' ? user?.id : null);
          if (targetUserId) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            let budgetId = localStorage.getItem('global_budget_id');
            if (!budgetId || !uuidRegex.test(budgetId)) {
              if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                try { budgetId = crypto.randomUUID(); } catch {}
              }
              if (!budgetId || !uuidRegex.test(budgetId)) {
                budgetId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                  const r = (Math.random() * 16) | 0;
                  const v = c === 'x' ? r : (r & 0x3) | 0x8;
                  return v.toString(16);
                });
              }
              try {
                localStorage.setItem('global_budget_id', budgetId);
              } catch {}
            }

            const nowIso = new Date().toISOString();
            const budgetRecord = {
              id: budgetId,
              user_id: targetUserId,
              name: 'Límite Global',
              category: 'General',
              period: 'monthly',
              amount: Number(val) || 0,
              is_global: true,
              updated_at: nowIso
            };

            const { error: bErr } = await supabase.from('budgets').upsert([budgetRecord], { onConflict: 'id' });
            if (bErr) {
              console.warn('[ProfileModal] Upsert en budgets falló (400/schema):', bErr.message || bErr);
              // Fallback defensivo a localStorage bajo la clave global_budget_limit
              try {
                localStorage.setItem('global_budget_limit', String(Number(val) || 0));
              } catch {}

              // Reintento defensivo con columnas básicas si rechaza is_global o name
              try {
                await supabase.from('budgets').upsert([{
                  id: budgetId,
                  user_id: targetUserId,
                  name: 'Límite Global',
                  category: 'General',
                  period: 'monthly',
                  amount: Number(val) || 0,
                  updated_at: nowIso
                }], { onConflict: 'id' });
              } catch (reErr) {
                console.warn('[ProfileModal] Reintento básico de budgets omitido:', reErr);
              }
            } else {
              try {
                localStorage.setItem('global_budget_limit', String(Number(val) || 0));
              } catch {}
            }

            try {
              const { error: settingsError } = await supabase
                .from('user_settings')
                .upsert(
                  { user_id: targetUserId, global_budget_limit: val, updated_at: nowIso },
                  { onConflict: 'user_id' }
                );

              if (settingsError) {
                console.warn('[ProfileModal] Upsert en user_settings omitido (404/PGRST204):', settingsError.message || settingsError);
              }
            } catch (settingsEx) {
              console.warn('[ProfileModal] Fallo defensivo al persistir en user_settings:', settingsEx);
            }

            try {
              localStorage.setItem('user_settings', JSON.stringify({
                user_id: targetUserId,
                global_budget_limit: val,
                updated_at: nowIso
              }));
            } catch {}
          }
        } catch (e) {
          console.warn('Error al guardar presupuesto en Supabase:', e);
          try {
            localStorage.setItem('global_budget_limit', String(Number(val) || 0));
          } catch {}
        }
      })();
    }

    setIsEditingGlobalBudget(false);
    showToast(val > 0 ? 'Presupuesto global actualizado.' : 'Límite global eliminado ($0).');
  };

  const handleSaveCategoryBudget = (catId) => {
    const val = Number(tempCatBudgetAmount);
    if (val < 0) {
      showToast('Ingresa un monto válido.', true);
      return;
    }
    onUpdateBudgets({
      ...budgets,
      categories: {
        ...budgets.categories,
        [catId]: val
      }
    });
    setEditingCatBudgetId(null);
    setTempCatBudgetAmount('');
    showToast('Límite de categoría actualizado.');
  };

  // Savings Goals Handlers
  const handleCreateGoal = (e) => {
    e.preventDefault();
    if (!newGoalName.trim() || !newGoalTarget || Number(newGoalTarget) <= 0) {
      showToast('Ingresa un nombre y monto objetivo válido.', true);
      return;
    }

    let safeDate = '';
    if (newGoalDate) {
      try {
        safeDate = new Date(newGoalDate).toISOString().split('T')[0];
      } catch (e) {
        safeDate = String(newGoalDate).split('T')[0];
      }
    }

    const goal = {
      id: `goal-${Date.now()}`,
      name: newGoalName.trim(),
      targetAmount: Number(newGoalTarget),
      currentAmount: Number(newGoalCurrent) || 0,
      dueDate: safeDate,
      target_date: safeDate,
      deadline: safeDate,
      category: 'Ahorro'
    };

    onAddGoal(goal);
    setNewGoalName('');
    setNewGoalTarget('');
    setNewGoalCurrent('0');
    setNewGoalDate('');
    setShowAddGoalForm(false);
    showToast(`Meta "${goal.name}" creada.`);
  };

  const handleOpenEditGoal = (goal) => {
    setEditingGoal(goal);
    setEditGoalName(goal.name || '');
    setEditGoalTarget(String(goal.targetAmount || goal.target_amount || ''));
    setEditGoalCurrent(String(goal.currentAmount || goal.current_amount || '0'));
    const d = goal.target_date || goal.dueDate || goal.deadline || '';
    setEditGoalDate(d ? new Date(d).toISOString().split('T')[0] : '');
  };

  const handleSaveEditGoal = (e) => {
    e.preventDefault();
    if (!editingGoal || !editGoalName.trim() || Number(editGoalTarget) <= 0) return;

    let safeDate = '';
    if (editGoalDate) {
      try {
        safeDate = new Date(editGoalDate).toISOString().split('T')[0];
      } catch (e) {
        safeDate = String(editGoalDate).split('T')[0];
      }
    }

    const updated = {
      ...editingGoal,
      name: editGoalName.trim(),
      targetAmount: Number(editGoalTarget),
      currentAmount: Number(editGoalCurrent) || 0,
      dueDate: safeDate,
      target_date: safeDate,
      deadline: safeDate
    };

    onUpdateGoal(updated);
    setEditingGoal(null);
    showToast(`Meta "${updated.name}" actualizada.`);
  };

  const handleContributeToGoal = (goalId) => {
    const val = Number(contributeAmount);
    if (val <= 0) {
      showToast('Ingresa un monto válido para abonar.', true);
      return;
    }
    const targetGoal = savingsGoals.find(g => g.id === goalId);
    if (!targetGoal) return;

    onUpdateGoal({
      ...targetGoal,
      currentAmount: safeNumber(targetGoal.currentAmount) + val
    });
    setContributeGoalId(null);
    setContributeAmount('');
    showToast(`¡Abono de ${formatMoney(val)} registrado con éxito!`);
  };

  const totalSavedAcrossGoals = savingsGoals.reduce((sum, g) => sum + safeNumber(g.currentAmount), 0);
  const totalTargetAcrossGoals = savingsGoals.reduce((sum, g) => sum + safeNumber(g.targetAmount), 0);

  // --- Export / Backup Handlers ---
  const handleExportJSON = () => {
    downloadBackupJSON({
      transactions,
      investments,
      accounts,
      categories,
      debtsAndLoans,
      budgets,
      savingsGoals,
      subscriptions,
      recurring_payments: subscriptions,
      userProfile,
      securitySettings,
      trm,
      theme
    });
    showToast('Copia de seguridad descargada exitosamente.');
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsRestoring(true);
    try {
      const parsed = await parseAndValidateBackup(file);
      setBackupPreview(parsed);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setIsRestoring(false);
      if (restoreInputRef.current) restoreInputRef.current.value = '';
    }
  };

  const confirmRestore = async () => {
    if (!backupPreview || !onRestoreBackup) return;
    onRestoreBackup(backupPreview);
    setBackupPreview(null);
    showToast('¡Copia de seguridad restaurada con éxito!');
  };

  const handleCloudSync = async () => {
    if (typeof onManualCloudSync === 'function') {
      setIsCloudSyncing(true);
      try {
        const res = await onManualCloudSync();
        if (res && res.success === false) {
          showToast(res.error?.message || 'Error al sincronizar con la nube', true);
        } else {
          showToast('¡Datos sincronizados con éxito en la nube!');
        }
      } catch {
        showToast('Error al conectar con la nube', true);
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleFullLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
      if (typeof signOut === 'function') {
        await signOut();
      }
      setShowLogoutConfirm(false);
      onClose();
      showToast('Sesión cerrada exitosamente.');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      showToast('Error al cerrar sesión', true);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleFullReset = async () => {
    if (onFactoryReset) {
      await onFactoryReset(true);
      return;
    }

    try {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase.auth.getUser();
          const userId = data?.user?.id || (user?.id !== 'local-user' ? user?.id : null);
          if (userId) {
            await Promise.allSettled([
              supabase.from('transactions').delete().eq('user_id', userId),
              supabase.from('debts').delete().eq('user_id', userId),
              supabase.from('recurring_payments').delete().eq('user_id', userId),
              supabase.from('investments').delete().eq('user_id', userId),
              supabase.from('savings_goals').delete().eq('user_id', userId),
              supabase.from('budgets').delete().eq('user_id', userId),
              supabase.from('categories').delete().eq('user_id', userId),
              supabase.from('accounts').delete().eq('user_id', userId)
            ]);
            try {
              await supabase.from('accounts').delete().eq('user_id', userId);
            } catch {}
          }
        } catch (cloudErr) {
          console.warn('Error al borrar datos en Supabase:', cloudErr);
        }
      }

      // Preservar tokens de sesión de Supabase y banderas de tutorial/onboarding
      try {
        const isPreservedKey = (key) => {
          if (!key) return false;
          // Tokens y sesiones de autenticación
          if (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase.auth')) return true;
          // Banderas de tutorial y onboarding
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
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        Object.entries(preservedData).forEach(([k, v]) => {
          if (v !== null) localStorage.setItem(k, v);
        });

        // Asegurar que las banderas de tutorial y onboarding continúen en true
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
      } catch (e) {
        console.warn('Error clearing localStorage:', e);
      }
    } catch (error) {
      console.error('Error al restablecer la aplicación:', error);
    }
  };

  const handleConfirmFactoryReset = async () => {
    if (confirmDeleteText.trim().toUpperCase() !== 'BORRAR') {
      return;
    }

    try {
      setIsResetting(true);
      if (onFactoryReset) {
        await onFactoryReset(true);
      } else {
        await handleFullReset();
      }

      // Asegurar explícitamente persistencia del tutorial completado
      localStorage.setItem('presu_tutorial_completed', 'true');
      localStorage.setItem('has_completed_tutorial', 'true');
      localStorage.setItem('tutorial_completed', 'true');
      localStorage.setItem('hasSeenTutorial', 'true');
      localStorage.setItem('tutorial_seen', 'true');
      localStorage.setItem('app_onboarding_completed', 'true');
      localStorage.setItem('has_completed_onboarding', 'true');
      localStorage.setItem('hasCompletedOnboarding', 'true');

      showToast('Todos los datos han sido restablecidos');
      setShowResetConfirm(false);
      setConfirmDeleteText('');
      onClose();
    } catch (err) {
      console.error('Error al restablecer:', err);
      showToast('Error al restablecer los datos', true);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
      <div 
        className="rounded-t-2xl sm:rounded-2xl w-full max-w-lg lg:max-w-xl mx-auto shadow-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-slide-up transition-all"
      >
        {/* iOS Handle Indicator para Móvil */}
        <div className="w-12 h-1.5 bg-slate-400/30 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* ============================================================== */}
        {/* CABECERA FIJA (HEADER)                                         */}
        {/* ============================================================== */}
        <div 
          className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] shrink-0 bg-slate-50/70 dark:bg-black/30 backdrop-blur-md"
        >
          {currentView === 'main' ? (
            <>
              <div className="flex items-start justify-between gap-3">
                {/* Foto/Avatar editable con badge de cámara + nombre y correo */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="relative group shrink-0">
                    <Avatar 
                      src={user?.user_metadata?.avatar_url || userProfile?.avatar_url || userProfile?.photo} 
                      name={user?.user_metadata?.full_name || userProfile?.name} 
                      email={user?.email}
                      size="xl" 
                      showStatus={true} 
                      isOnline={Boolean(user?.id && user?.id !== 'local-user')} 
                    />

                    {/* Badge de cámara */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900 active:scale-90 transition-all cursor-pointer"
                      title="Cambiar foto de perfil"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="hidden" 
                    />
                  </div>

                  {/* Nombre dinámico y Correo de sesión + Estado de conexión */}
                  <div className="min-w-0 flex-1">
                    {isEditingName ? (
                      <div className="flex items-center gap-1.5 max-w-xs">
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          placeholder="Tu nombre"
                          maxLength={32}
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                          className="w-full px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleSaveName}
                          className="p-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white shrink-0 cursor-pointer active:scale-95"
                          title="Guardar nombre"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => setIsEditingName(true)}
                        className="group cursor-pointer inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                        title="Toca para editar tu nombre"
                      >
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate leading-tight">
                          {userProfile?.name || 'Usuario'}
                        </h2>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold opacity-75 group-hover:opacity-100">
                          (Editar)
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                      {user?.email || 'Modo local (sin cuenta vinculada)'}
                    </p>

                    {/* Indicador de estado de conexión */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {isOnline ? (user?.id ? 'En línea / Sincronizado' : 'En línea (Modo local)') : 'Modo sin conexión'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón de cierre (X) arriba a la derecha */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer shrink-0"
                  title="Cerrar Centro de Control"
                  aria-label="Cerrar Centro de Control"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sistema de 4 Pestañas (Tabs) */}
              <div className="grid grid-cols-4 gap-1 p-1 mt-4 rounded-xl bg-slate-200/70 dark:bg-white/5 border border-slate-300/40 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('finances')}
                  className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeTab === 'finances'
                      ? 'bg-white dark:bg-[#151922] text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <PieChart className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Gestión</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeTab === 'security'
                      ? 'bg-white dark:bg-[#151922] text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Seguridad</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('cloud')}
                  className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeTab === 'cloud'
                      ? 'bg-white dark:bg-[#151922] text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Nube</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('system')}
                  className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeTab === 'system'
                      ? 'bg-white dark:bg-[#151922] text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Ajustes</span>
                </button>
              </div>
            </>
          ) : (
            /* Header de Subvistas */
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setCurrentView('main')}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  title="Volver"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-[17px] sm:text-[18px] font-bold tracking-tight">
                  {currentView === 'subscriptions' && 'Suscripciones Recurrentes'}
                  {currentView === 'pin_setup' && 'Configurar PIN de Seguridad'}
                  {currentView === 'budgets' && 'Presupuestos de Gasto'}
                  {currentView === 'savings_goals' && 'Metas de Ahorro'}
                  {currentView === 'categories' && 'Mis Categorías'}
                  {currentView === 'tax' && 'Impuestos y Declaración de Renta'}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className={`mx-4 mt-3 p-3 rounded-2xl text-xs flex items-center gap-2 border animate-fadeIn shrink-0 ${
            toastMessage.isError 
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1 font-medium">{toastMessage.text}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto scroll-touch px-5 py-4 space-y-6 flex-1 scroll-smooth pb-safe">

          {/* ============================================================== */}
          {/* VIEW: MAIN PROFILE & CONTROL CENTER                            */}
          {/* ============================================================== */}
          {currentView === 'main' && (
            <>
              {/* TAB 1: GESTIÓN & FINANZAS */}
              {activeTab === 'finances' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* 1. Bloque Planificación: Presupuestos de Gasto y Metas de Ahorro */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 px-1">
                      <Target className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                      <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Planificación Financiera
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {/* Presupuestos de Gasto */}
                      <button
                        type="button"
                        onClick={() => setCurrentView('budgets')}
                        className="w-full p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 dark:text-violet-400 shrink-0">
                            <PieChart className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors">
                              Presupuestos de Gasto
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {budgets?.global && Number(budgets.global) > 0
                                ? `Límite global: ${formatMoney(budgets.global)} (${Math.round((totalMonthExpense / budgets.global) * 100)}% consumido)`
                                : 'Sin límite configurado'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                      </button>

                      {/* Metas de Ahorro */}
                      <button
                        type="button"
                        onClick={() => setCurrentView('savings_goals')}
                        className="w-full p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <PiggyBank className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              Metas de Ahorro
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {savingsGoals.length} metas ({formatMoney(totalSavedAcrossGoals)} de {formatMoney(totalTargetAcrossGoals)})
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                      </button>

                      {/* Pagos Recurrentes (Dentro de Planificación Financiera) */}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof onNavigateToRecurring === 'function') {
                            onNavigateToRecurring();
                          } else {
                            setCurrentView('subscriptions');
                          }
                        }}
                        className="w-full p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <CalendarSync className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                              Pagos Recurrentes
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {subscriptions.length} configurados ({formatMoney(totalMonthlySubscriptions)}/mes)
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                      </button>
                    </div>
                  </div>

                  {/* 2. Bloque Cuentas: Mis Cuentas y Mis Categorías */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 px-1">
                      <CreditCard className="w-4 h-4 text-[#007AFF]" />
                      <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Cuentas y Métodos
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {/* Mis Cuentas */}
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAccounts?.();
                        }}
                        className="w-full p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#007AFF] shrink-0">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100 group-hover:text-[#007AFF] transition-colors">
                              Mis Cuentas
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {accountsCount} cuentas bancarias, billeteras y efectivo
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#007AFF] transition-colors" />
                      </button>

                      {/* Mis Categorías */}
                      <button
                        type="button"
                        onClick={() => setCurrentView('categories')}
                        className="w-full p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                            <Tag className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              Mis Categorías
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {categoriesCount} rubros de ingresos y gastos personalizados
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-colors" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SEGURIDAD & ACCESO */}
              {activeTab === 'security' && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Bloque de Contraseña y Huella */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 px-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                      <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Credenciales del Dispositivo
                      </h3>
                    </div>

                    <div 
                      className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 space-y-3.5"
                    >
                      {/* Toggle PIN - Fila táctil completa */}
                      <div 
                        onClick={handleTogglePin}
                        className="min-h-[48px] p-2.5 sm:p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors gap-3 select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                            <Lock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">Bloqueo con Contraseña / PIN</p>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Solicitar PIN al iniciar o reanudar sesión</p>
                          </div>
                        </div>

                        <div className="relative inline-flex items-center shrink-0 pointer-events-none">
                          <input 
                            type="checkbox" 
                            checked={Boolean(securitySettings?.pinEnabled)} 
                            readOnly
                            className="sr-only peer" 
                          />
                          <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </div>
                      </div>

                      {/* Si el PIN está activo, permitir cambiarlo */}
                      {securitySettings?.pinEnabled && (
                        <div className="pt-2 px-2 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> PIN Activo
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewPin('');
                              setConfirmPin('');
                              setPinError('');
                              setCurrentView('pin_setup');
                            }}
                            className="text-[12px] font-bold text-[#007AFF] hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Cambiar PIN</span>
                          </button>
                        </div>
                      )}

                      {/* Toggle Biometría WebAuthn - Fila táctil completa */}
                      <div 
                        onClick={handleToggleBiometrics}
                        className="pt-3 border-t border-slate-200/80 dark:border-white/[0.08] min-h-[48px] p-2.5 sm:p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors gap-3 select-none" 
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                            <Fingerprint className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">Bloqueo con Huella / Biometría</p>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Autenticación biométrica mediante WebAuthn</p>
                          </div>
                        </div>

                        <div className="relative inline-flex items-center shrink-0 pointer-events-none">
                          <input 
                            type="checkbox" 
                            checked={Boolean(securitySettings?.biometricsEnabled)} 
                            readOnly
                            className="sr-only peer" 
                          />
                          <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: ALMACENAMIENTO & DATOS */}
              {activeTab === 'cloud' && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Módulo de Acceso con Google y Supabase Auth */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 px-1">
                      <Cloud className="w-4 h-4 text-blue-500" />
                      <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Acceso y Sincronización en la Nube
                      </h3>
                    </div>

                    {isCloudUser ? (
                      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                              name={user?.user_metadata?.full_name}
                              email={user?.email}
                              size="lg"
                              showStatus={true}
                              isOnline={true}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                  {user?.user_metadata?.full_name || 'Cuenta Google'}
                                </h4>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Conectado
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-mono">
                                {user?.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-700/60">
                          {typeof onManualCloudSync === 'function' && (
                            <button
                              type="button"
                              onClick={handleCloudSync}
                              disabled={isCloudSyncing}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-500/20 text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                              <span>{isCloudSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowLogoutConfirm(true)}
                            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-500/20 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Cerrar sesión</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Acceso y Respaldo Multi-cuenta
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            Inicia sesión para sincronizar automáticamente tus finanzas de forma segura en la nube y acceder desde cualquier dispositivo.
                          </p>
                        </div>

                        {/* Botón oficial 'Continuar con Google' */}
                        <button
                          type="button"
                          onClick={() => signInWithGoogle()}
                          className="w-full py-2.5 px-4 font-medium flex items-center justify-center gap-3 rounded-xl bg-white text-gray-800 hover:bg-gray-100 dark:bg-slate-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>Continuar con Google</span>
                        </button>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Autenticación oficial vía Supabase Auth. Los datos se almacenan exclusivamente bajo tu cuenta.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tarjeta Unificada de Estado: Almacenamiento y Privacidad */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 px-1">
                      <ShieldCheck className={`w-4 h-4 ${isCloudUser ? 'text-emerald-500' : 'text-amber-500'}`} />
                      <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Almacenamiento y Privacidad
                      </h3>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                            isCloudUser
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                              : 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
                          }`}>
                            {isCloudUser ? <Cloud className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                {isCloudUser ? 'Sincronización en la Nube' : 'Modo Local'}
                              </h4>
                              {isCloudUser ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Sincronización en la Nube Activa
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  Modo Local (Sin sincronizar)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              {isCloudUser
                                ? 'Tus datos se respaldan de forma segura en tu cuenta en la nube, con una copia local en este dispositivo para respuesta instantánea y disponibilidad offline.'
                                : 'Tus datos residen únicamente en este navegador (localStorage). Inicia sesión con tu correo para habilitar respaldo multi-dispositivo.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Módulo de Copias de Seguridad y Archivos */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-2 px-1">
                      <Database className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Copias de seguridad y archivos
                      </h3>
                    </div>

                    {/* Grid organizado de 3 accesos con diseño homogéneo */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Respaldo JSON */}
                      <button
                        type="button"
                        onClick={handleExportJSON}
                        className="flex sm:flex-col items-center sm:items-start justify-between sm:justify-center p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 active:scale-95 transition-all cursor-pointer group text-left shadow-sm"
                      >
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 sm:mb-2.5">
                          <Database className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 pr-2 sm:pr-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition-colors">
                            Copia de seguridad completa
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Formato JSON
                          </p>
                        </div>
                        <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 shrink-0 sm:hidden" />
                      </button>

                      {/* Gastos a Excel */}
                      <button
                        type="button"
                        onClick={() => downloadTransactionsCSV(transactions)}
                        className="flex sm:flex-col items-center sm:items-start justify-between sm:justify-center p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 active:scale-95 transition-all cursor-pointer group text-left shadow-sm"
                      >
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 sm:mb-2.5">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 pr-2 sm:pr-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-500 transition-colors">
                            Gastos a Excel
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Archivo CSV
                          </p>
                        </div>
                        <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 shrink-0 sm:hidden" />
                      </button>

                      {/* Inversiones a Excel */}
                      <button
                        type="button"
                        onClick={() => downloadInvestmentsCSV(investments, trm)}
                        className="flex sm:flex-col items-center sm:items-start justify-between sm:justify-center p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 active:scale-95 transition-all cursor-pointer group text-left shadow-sm"
                      >
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0 sm:mb-2.5">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 pr-2 sm:pr-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-500 transition-colors">
                            Inversiones a Excel
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Portafolio CSV
                          </p>
                        </div>
                        <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0 sm:hidden" />
                      </button>
                    </div>

                    {/* Tarjeta de Restauración */}
                    <div 
                      onClick={() => restoreInputRef.current?.click()}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 active:scale-98 transition-all cursor-pointer flex items-center justify-between gap-3.5 group shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-200/70 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-colors">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                            Restaurar desde archivo JSON
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            Seleccionar archivo JSON previo para recuperar tus datos
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isRestoring}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:border-emerald-500/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0 shadow-sm"
                      >
                        {isRestoring ? 'Restaurando...' : 'Examinar'}
                      </button>
                    </div>
                    <input 
                      type="file" 
                      ref={restoreInputRef} 
                      accept=".json,application/json" 
                      onChange={handleFileSelect} 
                      className="hidden" 
                    />
                  </div>

                  {/* Zona de peligro: restablecer app */}
                  <div className="pt-2">
                    <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-2.5">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400">Zona de peligro: restablecer datos</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            Elimina de forma permanente todas las transacciones, cuentas e inversiones en la nube y en este dispositivo, manteniendo tu sesión activa.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteText('');
                          setShowResetConfirm(true);
                        }}
                        className="w-full py-2 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition-colors cursor-pointer active:scale-98"
                      >
                        Restablecer y borrar todos los datos
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: AJUSTES & SISTEMA */}
              {activeTab === 'system' && (
                <div className="space-y-5 animate-fadeIn">
                  {/* 1. Alternador de Modo Claro / Modo Oscuro */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 px-1">
                      {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                      <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Apariencia y Tema
                      </h3>
                    </div>

                    <div 
                      className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                            {theme === 'dark' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">
                              Modo {theme === 'dark' ? 'Oscuro' : 'Claro'}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {theme === 'dark' ? 'Interfaz nocturna optimizada de bajo brillo.' : 'Interfaz clara de alto contraste.'}
                            </p>
                          </div>
                        </div>

                        {/* Selector de Tema */}
                        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-200/60 dark:bg-white/5 border border-slate-300/40 dark:border-white/10 shrink-0">
                          <button
                            type="button"
                            onClick={() => onThemeChange?.('light')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              theme === 'light'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <Sun className="w-3.5 h-3.5 text-amber-500" />
                            <span>Claro</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onThemeChange?.('dark')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              theme === 'dark'
                                ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <Moon className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Oscuro</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Switch Permitir decimales en montos */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 px-1">
                      <Coins className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                      <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Preferencias de Moneda
                      </h3>
                    </div>

                    <div 
                      className="p-1 sm:p-1.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90"
                    >
                      <div 
                        onClick={toggleEnableDecimals}
                        className="min-h-[48px] p-2.5 sm:p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors gap-3 select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                            <Coins className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">
                              Permitir decimales en montos
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                              Habilita 2 decimales para precisión contable o transacciones en USD.
                            </p>
                          </div>
                        </div>

                        <div className="relative inline-flex items-center shrink-0 pointer-events-none">
                          <input 
                            type="checkbox" 
                            checked={Boolean(enableDecimals)} 
                            readOnly
                            className="sr-only peer" 
                          />
                          <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Bloque de Versión de la aplicación y Buscar actualización */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center gap-2 px-1">
                      <RefreshCw className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Versión del Sistema
                      </h3>
                    </div>

                    <UpdateAppButton />

                    <div className="px-1 text-center">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium tabular-nums">
                        Monety v1.0.0 (Producción PWA)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* VIEW: PRESUPUESTOS */}
          {currentView === 'budgets' && (
            <div className="space-y-4">
              {/* Presupuesto Global Mensual */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-3 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider font-mono">Presupuesto Mensual Global</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">Límite general para todo el mes</p>
                  </div>
                  {!isEditingGlobalBudget ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTempGlobalBudget(budgets?.global ? budgets.global.toString() : '');
                        setIsEditingGlobalBudget(true);
                      }}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Modificar
                    </button>
                  ) : null}
                </div>

                {isEditingGlobalBudget ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={tempGlobalBudget}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setTempGlobalBudget(e.target.value)}
                      placeholder="Sin límite ($0)"
                      className="flex-1 h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-zinc-100 text-xs sm:text-sm font-mono font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                    />
                    <button
                      type="button"
                      onClick={handleSaveGlobalBudget}
                      className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shrink-0 cursor-pointer shadow-sm active:scale-95 transition-all"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingGlobalBudget(false)}
                      className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <span className="text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-zinc-100">
                        {formatMoney(totalMonthExpense)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono tabular-nums">
                        {budgets?.global && Number(budgets.global) > 0 ? `de ${formatMoney(budgets.global)}` : 'Sin límite configurado'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {(() => {
                      const globalLimit = budgets?.global || 0;
                      if (globalLimit === 0) {
                        return (
                          <div className="space-y-1">
                            <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3 mb-2">
                              <div className="h-full rounded-full" style={{ width: '0%' }} />
                            </div>
                            <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-zinc-400">
                              <span>0% consumido</span>
                              <span>Sin límite global asignado</span>
                            </div>
                          </div>
                        );
                      }
                      const percent = Math.min(100, Math.round((totalMonthExpense / globalLimit) * 100));
                      const isOver = totalMonthExpense > globalLimit;
                      const barColor = isOver ? '#EF4444' : percent > 80 ? '#F59E0B' : '#10B981';
                      const textColorClass = isOver 
                        ? 'text-rose-600 dark:text-rose-400 font-semibold' 
                        : percent > 80 
                        ? 'text-amber-600 dark:text-amber-400 font-semibold' 
                        : 'text-emerald-600 dark:text-emerald-400 font-semibold';
                      const remaining = Math.max(0, globalLimit - totalMonthExpense);

                      return (
                        <div className="space-y-1">
                          <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3 mb-2">
                            <div 
                              className="h-full rounded-full transition-all duration-500 ease-out" 
                              style={{ width: `${Math.max(4, percent)}%`, backgroundColor: barColor }} 
                            />
                          </div>
                          <div className="flex justify-between text-xs font-mono tabular-nums">
                            <span className={textColorClass}>{percent}% consumido</span>
                            <span className="text-slate-500 dark:text-zinc-400">
                              {isOver ? `Excedido en ${formatMoney(totalMonthExpense - globalLimit)}` : `Disponible: ${formatMoney(remaining)}`}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Presupuestos por Categoría */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider font-mono px-1">
                  Límites por Categoría
                </h4>

                <div className="space-y-2">
                  {categories.filter(c => c.type === 'expense').map((cat) => {
                    const spent = expenseByCatMap[cat.id] || 0;
                    const catLimit = budgets?.categories?.[cat.id] || 0;
                    const percent = catLimit > 0 ? Math.min(100, Math.round((spent / catLimit) * 100)) : 0;
                    const isOver = catLimit > 0 && spent > catLimit;
                    const barColor = isOver ? '#EF4444' : percent > 80 ? '#F59E0B' : cat.color || '#10B981';
                    const textColorClass = isOver 
                      ? 'text-rose-600 dark:text-rose-400 font-semibold' 
                      : percent > 80 
                      ? 'text-amber-600 dark:text-amber-400 font-semibold' 
                      : 'text-emerald-600 dark:text-emerald-400 font-semibold';

                    return (
                      <div 
                        key={cat.id} 
                        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] space-y-2.5 shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span 
                              className="w-3 h-3 rounded-full shrink-0" 
                              style={{ backgroundColor: cat.color || '#10B981' }} 
                            />
                            <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100 truncate">{cat.name}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold font-mono text-slate-900 dark:text-zinc-100 tabular-nums">
                              {formatMoney(spent)}
                              {catLimit > 0 && (
                                <span className="text-slate-500 dark:text-zinc-400 font-normal"> / {formatMoney(catLimit)}</span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCatBudgetId(cat.id);
                                setTempCatBudgetAmount(catLimit > 0 ? catLimit.toString() : '');
                              }}
                              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ml-1"
                            >
                              {catLimit > 0 ? 'Editar' : 'Fijar'}
                            </button>
                          </div>
                        </div>

                        {/* Inline editor */}
                        {editingCatBudgetId === cat.id && (
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-white/[0.06] animate-fadeIn">
                            <input
                              type="number"
                              inputMode="decimal"
                              value={tempCatBudgetAmount}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => setTempCatBudgetAmount(e.target.value)}
                              placeholder="Límite para esta categoría"
                              className="flex-1 h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm font-mono tabular-nums text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveCategoryBudget(cat.id)}
                              className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-sm"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCatBudgetId(null)}
                              className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        {catLimit > 0 && (
                          <div className="space-y-1">
                            <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-2 mb-1.5">
                              <div 
                                className="h-full rounded-full transition-all duration-500 ease-out" 
                                style={{ width: `${Math.max(3, percent)}%`, backgroundColor: barColor }} 
                              />
                            </div>
                            <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-zinc-400 tabular-nums">
                              <span className={textColorClass}>{percent}% consumido</span>
                              <span>
                                {isOver ? `Excedido en ${formatMoney(spent - catLimit)}` : `Quedan ${formatMoney(catLimit - spent)}`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: METAS DE AHORRO */}
          {currentView === 'savings_goals' && (
            <div className="space-y-4">
              {/* Header con resumen de metas y botón '+' compacto */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex items-center justify-between transition-all">
                <div>
                  <p className="text-xs uppercase tracking-wider font-bold font-mono text-emerald-600 dark:text-emerald-400">Total Ahorrado</p>
                  <p className="text-lg sm:text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums mt-0.5">
                    {formatMoney(totalSavedAcrossGoals)}
                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-normal font-mono tabular-nums tracking-tight"> / {formatMoney(totalTargetAcrossGoals)}</span>
                  </p>
                </div>
                {/* Botón '+' para abrir GoalModal sólo si ya existen metas */}
                {savingsGoals.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingGoal(null);
                      setShowAddGoalForm(true);
                    }}
                    className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
                    title="Nueva Meta de Ahorro"
                    aria-label="Agregar meta de ahorro"
                  >
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </button>
                )}
              </div>

              {/* Modal Especializado para Crear o Editar Meta de Ahorro */}
              {(showAddGoalForm || !!editingGoal) && (
                <GoalModal
                  isOpen={showAddGoalForm || !!editingGoal}
                  disableBackHandler={true}
                  onClose={() => {
                    setShowAddGoalForm(false);
                    setEditingGoal(null);
                  }}
                  onSave={(goalData) => {
                    if (editingGoal) {
                      onUpdateGoal(goalData);
                      showToast(`Meta "${goalData.name}" actualizada.`);
                    } else {
                      onAddGoal(goalData);
                      showToast(`Meta "${goalData.name}" creada.`);
                    }
                    setShowAddGoalForm(false);
                    setEditingGoal(null);
                  }}
                  goal={editingGoal}
                  accounts={accounts}
                  formatMoney={formatMoney}
                />
              )}

              {/* Lista de Metas */}
              <div className="space-y-3">
                {savingsGoals.length === 0 ? (
                  <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 space-y-3 bg-slate-50/50 dark:bg-white/[0.01]">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">No tienes metas de ahorro registradas aún</p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">Establece objetivos financieros con cuotas mensuales sugeridas.</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingGoal(null);
                        setShowAddGoalForm(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar meta de ahorro</span>
                    </button>
                  </div>
                ) : (
                  savingsGoals.map((goal) => {
                    const current = Number(goal.currentAmount || 0);
                    const target = Number(goal.targetAmount || 1);
                    const percent = Math.min(100, Math.round((current / target) * 100));

                    // Days remaining
                    let daysLeftText = null;
                    const rawDueDate = goal.target_date || goal.dueDate || goal.deadline;
                    if (rawDueDate) {
                      const due = new Date(String(rawDueDate).split('T')[0] + 'T00:00:00');
                      const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                      if (diffDays > 0) {
                        daysLeftText = `${diffDays} días restantes`;
                      } else if (diffDays === 0) {
                        daysLeftText = 'Vence hoy';
                      } else {
                        daysLeftText = 'Plazo cumplido';
                      }
                    }

                    const targetAcc = (accounts || []).find(a => String(a.id) === String(goal.target_account_id || goal.targetAccountId));
                    const monthsCount = Math.max(1, Number(goal.months) || 1);
                    const remainingGoal = Math.max(0, target - current);
                    const suggestedQuota = Math.round(remainingGoal / monthsCount);
                    const notifDay = goal.notification_day || goal.notificationDay;

                    const barColor = percent >= 100 ? '#10B981' : percent >= 50 ? '#10B981' : percent >= 20 ? '#F59E0B' : '#0D9488';

                    return (
                      <div
                        key={goal.id}
                        className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-sm transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                              <Target className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100 truncate">{goal.name}</h5>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                {daysLeftText && (
                                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{daysLeftText}</span>
                                  </span>
                                )}
                                {targetAcc && (
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                                    <Wallet className="w-3 h-3 shrink-0" />
                                    <span>{targetAcc.name}</span>
                                  </span>
                                )}
                                {suggestedQuota > 0 && (
                                  <span className="text-xs text-teal-600 dark:text-teal-400 font-mono">
                                    Cuota: {formatMoney(suggestedQuota)}/m ({monthsCount}m)
                                  </span>
                                )}
                                {goal.notify_enabled !== false && notifDay && (
                                  <span className="text-xs text-amber-600 dark:text-amber-400 font-mono flex items-center gap-0.5">
                                    <Bell className="w-2.5 h-2.5" />
                                    <span>Día {notifDay}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300">
                              {percent}%
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setContributeGoalId(contributeGoalId === goal.id ? null : goal.id);
                                setContributeAmount('');
                              }}
                              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                              <span>Abonar</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOpenEditGoal(goal);
                              }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
                              title="Editar meta"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (confirm(`¿Eliminar la meta "${goal.name}"?`)) {
                                  onDeleteGoal(goal.id);
                                }
                              }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                              title="Eliminar meta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Modal inline de abono estandarizado en h-11 */}
                        {contributeGoalId === goal.id && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-emerald-500/30 flex items-center gap-2 animate-fadeIn">
                            <input
                              type="number"
                              inputMode="decimal"
                              placeholder="Monto a abonar ($)"
                              value={contributeAmount}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => setContributeAmount(e.target.value)}
                              className="flex-1 h-11 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm font-mono tabular-nums text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleContributeToGoal(goal.id);
                              }}
                              className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-sm cursor-pointer"
                            >
                              Abonar
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setContributeGoalId(null);
                              }}
                              className="h-11 px-3 rounded-xl text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-xs transition-colors cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        {/* Progress bar y montos */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-baseline gap-2">
                            <span className="text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-zinc-100">
                              {formatMoney(current)}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono tabular-nums tracking-tight">
                              Meta: {formatMoney(target)}
                            </span>
                          </div>

                          {/* Riel y Relleno de Barra de Progreso */}
                          <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3 mb-2">
                            <div 
                              className="h-full rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${Math.max(4, percent)}%`, backgroundColor: barColor }}
                            />
                          </div>

                          <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-zinc-400 tabular-nums">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{percent}% alcanzado</span>
                            <span>Faltan {formatMoney(Math.max(0, target - current))}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* VIEW: PIN SETUP */}
          {currentView === 'pin_setup' && (
            <form onSubmit={handleSavePin} className="space-y-4 pt-2">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Define tu PIN de Acceso</h3>
                <p className="text-xs text-slate-400">
                  Ingresa un código numérico de 4 a 6 dígitos para proteger tu información.
                </p>
              </div>

              {pinError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-medium">
                  {pinError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Nuevo PIN (4 a 6 dígitos)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    autoFocus
                    className="w-full px-4 py-3 rounded-2xl bg-slate-900/80 border border-white/10 text-center text-2xl tracking-widest font-mono text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Confirmar PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-slate-900/80 border border-white/10 text-center text-2xl tracking-widest font-mono text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('main')}
                  className="flex-1 py-3 rounded-2xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Guardar PIN
                </button>
              </div>
            </form>
          )}

          {/* VIEW: SUBSCRIPTIONS */}
          {currentView === 'subscriptions' && (
            <div className="space-y-4">
              {/* Tarjeta Superior de Resumen ('Total Recurrente') */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#12141C] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    TOTAL MENSUAL RECURRENTE
                  </p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatMoney(totalMonthlySubscriptions)}
                    </span>
                    <span className="text-sm font-normal text-slate-400 dark:text-slate-500">
                      / mes
                    </span>
                  </div>
                </div>

                {/* Botón '+' con color de acento esmeralda */}
                <button
                  type="button"
                  onClick={() => setShowAddSubForm(prev => !prev)}
                  className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
                  title={showAddSubForm ? 'Cerrar formulario' : 'Nueva Suscripción'}
                  aria-label="Nueva Suscripción"
                >
                  <Plus className={`w-5 h-5 stroke-[2.5] transition-transform duration-200 ${showAddSubForm ? 'rotate-45' : ''}`} />
                </button>
              </div>

              {/* Formulario para agregar suscripción */}
              {showAddSubForm && (
                <form onSubmit={handleCreateSubscription} className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 space-y-3.5 shadow-sm animate-fadeIn">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-white/10">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Añadir Pago Recurrente</h4>
                    <button
                      type="button"
                      onClick={() => setShowAddSubForm(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">Nombre del Servicio *</label>
                      <input
                        type="text"
                        placeholder="Ej. Netflix, Spotify, Gimnasio, iCloud..."
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">Monto ($ COP) *</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={newSubAmount}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setNewSubAmount(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-bold tabular-nums transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">Día de Cobro (1-31) *</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={newSubBillingDay}
                        onChange={(e) => setNewSubBillingDay(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-bold tabular-nums transition-colors"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold block mb-1">Frecuencia</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setNewSubFrequency('monthly')}
                          className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            newSubFrequency === 'monthly'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                          }`}
                        >
                          Mensual
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewSubFrequency('yearly')}
                          className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            newSubFrequency === 'yearly'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                          }`}
                        >
                          Anual
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddSubForm(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      Guardar Suscripción
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de suscripciones / Estado Vacío */}
              {subscriptions.length === 0 ? (
                <div className="py-12 px-4 rounded-2xl bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 text-center space-y-3 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
                    <CalendarSync className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      No tienes suscripciones activas
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto mt-1">
                      Registra tus servicios recurrentes (Netflix, Spotify, gimnasio, software) para monitorear tu gasto mensual automático.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddSubForm(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Añadir primera suscripción</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {subscriptions.map((sub) => {
                    const isMusic = sub.icon === 'Music' || sub.category === 'Música' || /spotify|apple music|deezer|tidal|music/i.test(sub.name);
                    const isCloud = sub.icon === 'Cloud' || sub.category === 'Nube y Datos' || /icloud|google one|drive|dropbox|onedrive/i.test(sub.name);
                    const isVideo = /netflix|disney|hbo|max|prime|star|paramount|crunchyroll|youtube|tv/i.test(sub.name);

                    return (
                      <div
                        key={sub.id}
                        className="bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 transition-all hover:border-emerald-500/40 shadow-sm flex items-center justify-between gap-3"
                      >
                        {/* Lado izquierdo: Icono e Info */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                            <BrandIcon 
                              name={sub.name} 
                              size={22} 
                              fallback={
                                isMusic ? (
                                  <Music className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                ) : isCloud ? (
                                  <Cloud className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                                ) : isVideo ? (
                                  <Tv className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                                ) : (
                                  <CalendarSync className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                                )
                              } 
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-base text-slate-900 dark:text-white truncate">
                              {sub.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                              Día {sub.billingDay} de cada mes · {sub.frequency === 'yearly' ? 'Cobro Anual' : 'Cobro Mensual'}
                            </p>
                          </div>
                        </div>

                        {/* Lado derecho: Monto y Acciones */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <span className="font-bold text-base tabular-nums text-slate-900 dark:text-white">
                            {formatMoney(sub.amount)}
                          </span>

                          <button
                            type="button"
                            onClick={() => onDeleteSubscription(sub.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="Eliminar suscripción"
                            aria-label={`Eliminar suscripción ${sub.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW: MIS CATEGORÍAS */}
          {currentView === 'categories' && (
            <CategoriesView
              categories={categories}
              onAddCategory={onAddCategory}
              onUpdateCategory={onUpdateCategory}
              onDeleteCategory={onDeleteCategory}
              onAddSubcategory={onAddSubcategory}
              onUpdateSubcategory={onUpdateSubcategory}
              onDeleteSubcategory={onDeleteSubcategory}
              onBack={() => setCurrentView('main')}
              hideBackButton={true}
            />
          )}

          {/* VIEW: IMPUESTOS Y DECLARACIÓN DE RENTA DIAN */}
          {currentView === 'tax' && (
            <TaxView
              transactions={transactions}
              accounts={accounts}
              investments={investments}
              onBack={() => setCurrentView('main')}
              onClose={onClose}
            />
          )}

        </div>

        {/* Pie Fijo (Footer) con Botón de Cerrar Sesión destacado en tono carmesí/rojo suave */}
        {currentView === 'main' && (
          <div 
            className="p-3.5 sm:p-4 border-t border-slate-200/80 dark:border-white/[0.08] shrink-0 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-black/40 backdrop-blur-md"
          >
            <div className="min-w-0 flex-1 hidden sm:block">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                {userProfile?.name || 'Usuario'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                Tus datos se guardan únicamente en este dispositivo
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm ml-auto"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMACIÓN DE RESTAURACIÓN */}
      {backupPreview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn">
          <div 
            className="w-full max-w-sm rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900 shadow-2xl p-5 flex flex-col items-center text-center animate-slide-up"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
              <Database className="w-6 h-6 text-[#FF9500]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirmar Restauración</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 mb-4">
              Se sobrescribirán tus datos actuales con la copia de seguridad. ¿Deseas continuar?
            </p>
            
            <div className="w-full space-y-2 mb-5">
              <div className="flex justify-between items-center p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-zinc-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Movimientos</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{backupPreview.summary?.transactionsCount || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-zinc-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Inversiones</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{backupPreview.summary?.investmentsCount || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-zinc-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Cuentas</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{backupPreview.summary?.accountsCount || 0}</span>
              </div>
            </div>

            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={() => setBackupPreview(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-zinc-200 text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmRestore}
                className="flex-1 py-2.5 rounded-xl bg-[#FF9500] hover:bg-[#E58600] text-white text-sm font-bold transition-colors"
              >
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DOBLE CONFIRMACIÓN DE BORRADO DE DATOS (ZONA DE PELIGRO) */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fadeIn">
          <div 
            className="w-full max-w-sm rounded-2xl border border-rose-500/40 shadow-2xl p-5 sm:p-6 flex flex-col items-center text-center animate-slide-up bg-white dark:bg-zinc-900"
          >
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mb-3.5 text-rose-500 ring-4 ring-rose-500/10">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              ¿Estás completamente seguro?
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 mb-2 leading-relaxed">
              Esta acción eliminará de forma permanente todas tus cuentas, transacciones, deudas y configuraciones en la nube y en este dispositivo. No podrás recuperar esta información.
            </p>

            <div className="w-full my-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-left">
              <label htmlFor="confirm-delete-input" className="block text-[11px] font-semibold text-rose-600 dark:text-rose-400 mb-1.5 text-center">
                Escribe <span className="font-extrabold uppercase tracking-widest text-rose-700 dark:text-rose-300">BORRAR</span> para confirmar:
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
                placeholder="Escribe BORRAR"
                autoComplete="off"
                spellCheck="false"
                disabled={isResetting}
                className="w-full px-3 py-2 text-center text-xs font-bold tracking-widest rounded-xl bg-white dark:bg-black/60 border border-rose-500/30 text-rose-600 dark:text-rose-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>

            <p className="text-[11px] text-rose-500 font-semibold mb-4">
              ⚠️ Esta acción no se puede deshacer.
            </p>

            <div className="flex w-full gap-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => {
                  setShowResetConfirm(false);
                  setConfirmDeleteText('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={confirmDeleteText.trim().toUpperCase() !== 'BORRAR' || isResetting}
                onClick={handleConfirmFactoryReset}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  confirmDeleteText.trim().toUpperCase() !== 'BORRAR' || isResetting
                    ? 'bg-rose-500/20 text-rose-300/60 dark:text-rose-400/40 cursor-not-allowed border border-rose-500/10 opacity-70'
                    : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95 shadow-md shadow-rose-600/30'
                }`}
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  'Sí, eliminar todo definitivamente'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE CERRAR SESIÓN */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fadeIn">
          <div 
            className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-5 flex flex-col items-center text-center animate-slide-up bg-white dark:bg-[#12141C]"
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3 text-rose-500">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">¿Cerrar Sesión?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-4 leading-relaxed">
              Se desconectará la cuenta de Google activa manteniendo tus datos locales protegidos en este dispositivo.
            </p>
            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFullLogout}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
