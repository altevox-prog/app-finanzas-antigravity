import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import CategoriesView from '../CategoriesView';
import TaxView from '../TaxView';
import { downloadBackupJSON, parseAndValidateBackup } from '../../utils/exportUtils';
import { useBackHandler } from '../../hooks/useBackHandler';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { safeNumber } from '../../utils/financeMath';
import ProfileHeader from './profile/components/ProfileHeader';
import ProfileTabBar from './profile/components/ProfileTabBar';
import ProfileFooter from './profile/components/ProfileFooter';
import ProfileBackupPreviewModal from './profile/components/ProfileBackupPreviewModal';
import ProfileFinancesTab from './profile/ProfileFinancesTab';
import ProfileSecurityTab from '../profile/ProfileSecurityTab';
import ProfileCloudTab from '../profile/ProfileCloudTab';
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
import useProfileMetrics from './profile/hooks/useProfileMetrics';

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
    handleContributeToGoal
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

  // Derived monthly expenses & savings metrics via custom hook
  const {
    monthExpenses,
    totalMonthExpense,
    expenseByCatMap,
    totalSavedAcrossGoals,
    totalTargetAcrossGoals
  } = useProfileMetrics({ transactions, savingsGoals, safeNumber });

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
      <div 
        className="rounded-t-2xl sm:rounded-2xl w-full max-w-lg lg:max-w-xl mx-auto shadow-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-slide-up transition-all"
      >
        {/* iOS Handle Indicator para Móvil */}
        <div className="w-12 h-1.5 bg-slate-400/30 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* ============================================================== */}
        {/* CABECERA FIJA (HEADER) & TABS                                  */}
        {/* ============================================================== */}
        <ProfileHeader
          currentView={currentView}
          setCurrentView={setCurrentView}
          user={user}
          userProfile={userProfile}
          isEditingName={isEditingName}
          setIsEditingName={setIsEditingName}
          tempName={tempName}
          setTempName={setTempName}
          handleSaveName={handleSaveName}
          handleImageChange={handleImageChange}
          handleRemovePhoto={handleRemovePhoto}
          fileInputRef={fileInputRef}
          isOnline={isOnline}
          onClose={onClose}
        >
          <ProfileTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
        </ProfileHeader>

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

        {/* Pie Fijo (Footer) */}
        <ProfileFooter
          currentView={currentView}
          userProfile={userProfile}
          onLogoutClick={() => setShowLogoutConfirm(true)}
        />
      </div>

      {/* MODAL DE CONFIRMACIÓN DE RESTAURACIÓN */}
      <ProfileBackupPreviewModal
        backupPreview={backupPreview}
        onCancel={() => setBackupPreview(null)}
        onConfirm={confirmRestore}
      />

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
