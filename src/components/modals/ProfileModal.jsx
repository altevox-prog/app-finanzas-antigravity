import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Check, 
  Lock, 
  Fingerprint, 
  Tag, 
  ChevronRight, 
  ShieldCheck, 
  AlertCircle, 
  ArrowLeft,
  ArrowRight,
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
  Landmark,
  Coins,
  Sun,
  Moon,
  LogOut,
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
import TaxView from '../TaxView';
import { downloadBackupJSON, downloadTransactionsCSV, downloadInvestmentsCSV, parseAndValidateBackup } from '../../utils/exportUtils';
import { useBackHandler } from '../../hooks/useBackHandler';
import { useAuth } from '../../context/AuthContext';
import { signInWithGoogle, signOutUser, supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { safeNumber } from '../../utils/financeMath';
import Avatar from '../ui/Avatar';
import ProfileFinancesTab from './profile/ProfileFinancesTab';
import ProfileSecurityTab from './profile/ProfileSecurityTab';
import ProfileCloudTab from './profile/ProfileCloudTab';
import ProfileSystemTab from './profile/ProfileSystemTab';
import ProfileBudgetsView from './profile/views/ProfileBudgetsView';
import ProfileSavingsGoalsView from './profile/views/ProfileSavingsGoalsView';
import ProfilePinSetupView from './profile/views/ProfilePinSetupView';
import ProfileSubscriptionsView from './profile/views/ProfileSubscriptionsView';
import ProfileResetModal from './profile/ProfileResetModal';
import ProfileLogoutModal from './profile/ProfileLogoutModal';
import useProfileBackup from './profile/hooks/useProfileBackup';
import useProfileDataActions from './profile/hooks/useProfileDataActions';
import useProfileSecurity from './profile/hooks/useProfileSecurity';
import useProfileFinances from './profile/hooks/useProfileFinances';

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
  onManualCloudSync,
  onLogout
}) {
  const { formatMoney, enableDecimals, toggleEnableDecimals } = usePrivacy();
  const { user, setUser, signOut } = useAuth();

  // Internal view state: 'main' | 'subscriptions' | 'pin_setup' | 'budgets' | 'savings_goals' | 'categories' | 'tax'
  const [currentView, setCurrentView] = useState('main');

  // Sistema de 4 Pestañas en el Centro de Control: 'finances' | 'security' | 'cloud' | 'system'
  const [activeTab, setActiveTab] = useState('finances');
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


  // Toast / Feedback message
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fileInputRef = useRef(null);
  
  // Backup & Restore State & Handlers
  const {
    restoreInputRef,
    isRestoring,
    backupPreview,
    setBackupPreview,
    handleExportJSON,
    handleFileSelect,
    confirmRestore
  } = useProfileBackup({
    dataToBackup: {
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
    },
    onRestoreBackup,
    showToast,
    parseAndValidateBackup,
    downloadBackupJSON
  });

  // Data actions (Cloud sync, Logout, Factory reset) via custom hook
  const {
    isCloudSyncing,
    isLoggingOut,
    isResetting,
    showResetConfirm,
    setShowResetConfirm,
    confirmDeleteText,
    setConfirmDeleteText,
    showLogoutConfirm,
    setShowLogoutConfirm,
    handleCloudSync,
    handleFullLogout,
    handleFullReset,
    handleConfirmFactoryReset
  } = useProfileDataActions({
    onManualCloudSync,
    onLogout,
    signOut,
    isSupabaseConfigured,
    supabase,
    onFactoryReset,
    onClose,
    showToast,
    user
  });

  // PIN & Biometrics Security via custom hook
  const {
    newPin,
    setNewPin,
    confirmPin,
    setConfirmPin,
    pinError,
    setPinError,
    handleTogglePin,
    handleSavePin,
    handleToggleBiometrics
  } = useProfileSecurity({
    securitySettings,
    onUpdateSecurity,
    setCurrentView,
    showToast
  });

  // Financial management & Profile editing via custom hook
  const {
    isEditingName,
    setIsEditingName,
    tempName,
    setTempName,
    handleImageChange,
    handleRemovePhoto,
    handleSaveName,
    showAddSubForm,
    setShowAddSubForm,
    newSubName,
    setNewSubName,
    newSubAmount,
    setNewSubAmount,
    newSubBillingDay,
    setNewSubBillingDay,
    newSubFrequency,
    setNewSubFrequency,
    newSubCategory,
    setNewSubCategory,
    handleCreateSubscription,
    totalMonthlySubscriptions,
    isEditingGlobalBudget,
    setIsEditingGlobalBudget,
    tempGlobalBudget,
    setTempGlobalBudget,
    editingCatBudgetId,
    setEditingCatBudgetId,
    tempCatBudgetAmount,
    setTempCatBudgetAmount,
    handleSaveGlobalBudget,
    handleSaveCategoryBudget,
    showAddGoalForm,
    setShowAddGoalForm,
    newGoalName,
    setNewGoalName,
    newGoalTarget,
    setNewGoalTarget,
    newGoalCurrent,
    setNewGoalCurrent,
    newGoalDate,
    setNewGoalDate,
    editingGoal,
    setEditingGoal,
    editGoalName,
    setEditGoalName,
    editGoalTarget,
    setEditGoalTarget,
    editGoalCurrent,
    setEditGoalCurrent,
    editGoalDate,
    setEditGoalDate,
    contributeGoalId,
    setContributeGoalId,
    contributeAmount,
    setContributeAmount,
    handleCreateGoal,
    handleOpenEditGoal,
    handleSaveEditGoal,
    handleContributeToGoal,
    totalSavedAcrossGoals,
    totalTargetAcrossGoals
  } = useProfileFinances({
    userProfile,
    onUpdateProfile,
    budgets,
    onUpdateBudgets,
    savingsGoals,
    onAddGoal,
    onUpdateGoal,
    onDeleteGoal,
    subscriptions,
    onAddSubscription,
    onDeleteSubscription,
    showToast,
    formatMoney,
    safeNumber,
    supabase,
    isSupabaseConfigured,
    user
  });

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
                <ProfileFinancesTab
                  setCurrentView={setCurrentView}
                  formatMoney={formatMoney}
                  budgets={budgets}
                  totalMonthExpense={totalMonthExpense}
                  savingsGoals={savingsGoals}
                  totalSavedAcrossGoals={totalSavedAcrossGoals}
                  totalTargetAcrossGoals={totalTargetAcrossGoals}
                  subscriptions={subscriptions}
                  totalMonthlySubscriptions={totalMonthlySubscriptions}
                  onNavigateToRecurring={onNavigateToRecurring}
                  onClose={onClose}
                  onOpenAccounts={onOpenAccounts}
                  accountsCount={accountsCount}
                  categoriesCount={categoriesCount}
                />
              )}

              {/* TAB 2: SEGURIDAD & ACCESO */}
              {activeTab === 'security' && (
                <ProfileSecurityTab
                  securitySettings={securitySettings}
                  handleTogglePin={handleTogglePin}
                  handleToggleBiometrics={handleToggleBiometrics}
                  onChangePinClick={() => {
                    setNewPin('');
                    setConfirmPin('');
                    setPinError('');
                    setCurrentView('pin_setup');
                  }}
                />
              )}

              {/* TAB 3: ALMACENAMIENTO & DATOS */}
              {activeTab === 'cloud' && (
                <ProfileCloudTab
                  isCloudUser={isCloudUser}
                  user={user}
                  onManualCloudSync={onManualCloudSync}
                  isCloudSyncing={isCloudSyncing}
                  handleCloudSync={handleCloudSync}
                  setShowLogoutConfirm={setShowLogoutConfirm}
                  handleExportJSON={handleExportJSON}
                  transactions={transactions}
                  investments={investments}
                  trm={trm}
                  restoreInputRef={restoreInputRef}
                  handleFileSelect={handleFileSelect}
                  isRestoring={isRestoring}
                  onOpenResetConfirm={() => {
                    setConfirmDeleteText('');
                    setShowResetConfirm(true);
                  }}
                />
              )}

              {/* TAB 4: AJUSTES & SISTEMA */}
              {activeTab === 'system' && (
                <ProfileSystemTab
                  theme={theme}
                  onThemeChange={onThemeChange}
                  enableDecimals={enableDecimals}
                  toggleEnableDecimals={toggleEnableDecimals}
                />
              )}
            </>
          )}

          {/* VIEW: PRESUPUESTOS */}
          {currentView === 'budgets' && (
            <ProfileBudgetsView
              budgets={budgets}
              categories={categories}
              expenseByCatMap={expenseByCatMap}
              totalMonthExpense={totalMonthExpense}
              formatMoney={formatMoney}
              isEditingGlobalBudget={isEditingGlobalBudget}
              setIsEditingGlobalBudget={setIsEditingGlobalBudget}
              tempGlobalBudget={tempGlobalBudget}
              setTempGlobalBudget={setTempGlobalBudget}
              handleSaveGlobalBudget={handleSaveGlobalBudget}
              editingCatBudgetId={editingCatBudgetId}
              setEditingCatBudgetId={setEditingCatBudgetId}
              tempCatBudgetAmount={tempCatBudgetAmount}
              setTempCatBudgetAmount={setTempCatBudgetAmount}
              handleSaveCategoryBudget={handleSaveCategoryBudget}
            />
          )}

          {/* VIEW: METAS DE AHORRO */}
          {currentView === 'savings_goals' && (
            <ProfileSavingsGoalsView
              savingsGoals={savingsGoals}
              totalSavedAcrossGoals={totalSavedAcrossGoals}
              totalTargetAcrossGoals={totalTargetAcrossGoals}
              formatMoney={formatMoney}
              accounts={accounts}
              now={now}
              showAddGoalForm={showAddGoalForm}
              setShowAddGoalForm={setShowAddGoalForm}
              editingGoal={editingGoal}
              setEditingGoal={setEditingGoal}
              onAddGoal={onAddGoal}
              onUpdateGoal={onUpdateGoal}
              onDeleteGoal={onDeleteGoal}
              showToast={showToast}
              handleOpenEditGoal={handleOpenEditGoal}
              contributeGoalId={contributeGoalId}
              setContributeGoalId={setContributeGoalId}
              contributeAmount={contributeAmount}
              setContributeAmount={setContributeAmount}
              handleContributeToGoal={handleContributeToGoal}
            />
          )}

          {/* VIEW: PIN SETUP */}
          {currentView === 'pin_setup' && (
            <ProfilePinSetupView
              handleSavePin={handleSavePin}
              newPin={newPin}
              setNewPin={setNewPin}
              confirmPin={confirmPin}
              setConfirmPin={setConfirmPin}
              pinError={pinError}
              setPinError={setPinError}
              setCurrentView={setCurrentView}
            />
          )}

          {/* VIEW: SUBSCRIPTIONS */}
          {currentView === 'subscriptions' && (
            <ProfileSubscriptionsView
              subscriptions={subscriptions}
              totalMonthlySubscriptions={totalMonthlySubscriptions}
              formatMoney={formatMoney}
              showAddSubForm={showAddSubForm}
              setShowAddSubForm={setShowAddSubForm}
              handleCreateSubscription={handleCreateSubscription}
              newSubName={newSubName}
              setNewSubName={setNewSubName}
              newSubAmount={newSubAmount}
              setNewSubAmount={setNewSubAmount}
              newSubBillingDay={newSubBillingDay}
              setNewSubBillingDay={setNewSubBillingDay}
              newSubFrequency={newSubFrequency}
              setNewSubFrequency={setNewSubFrequency}
              onDeleteSubscription={onDeleteSubscription}
            />
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
        <ProfileResetModal
          isOpen={showResetConfirm}
          onClose={() => {
            setShowResetConfirm(false);
            setConfirmDeleteText('');
          }}
          confirmDeleteText={confirmDeleteText}
          setConfirmDeleteText={setConfirmDeleteText}
          isResetting={isResetting}
          onConfirm={handleConfirmFactoryReset}
        />
      )}

      {/* MODAL DE CONFIRMACIÓN DE CERRAR SESIÓN */}
      {showLogoutConfirm && (
        <ProfileLogoutModal
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={handleFullLogout}
          isLoggingOut={isLoggingOut}
        />
      )}
    </div>
  );
}
