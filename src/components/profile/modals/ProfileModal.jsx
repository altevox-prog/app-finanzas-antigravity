import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { usePrivacy } from '../../../context/PrivacyContext';
import CategoriesView from '../../categories/CategoriesView';
import TaxView from '../../taxes/TaxView';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { useAuth } from '../../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../../services/supabaseClient';
import { safeNumber } from '../../../utils/financeMath';
import ProfileHeader from '../components/ProfileHeader';
import ProfileTabBar from '../components/ProfileTabBar';
import ProfileFooter from '../components/ProfileFooter';
import ProfileFinancesTab from '../ProfileFinancesTab';
import ProfileSecurityTab from '../ProfileSecurityTab';
import ProfileCloudTab from '../ProfileCloudTab';
import ProfileSystemTab from '../ProfileSystemTab';
import ProfileBudgetsView from '../views/ProfileBudgetsView';
import ProfileSavingsGoalsView from '../views/ProfileSavingsGoalsView';
import ProfilePinSetupView from '../views/ProfilePinSetupView';
import ProfileSubscriptionsView from '../views/ProfileSubscriptionsView';
import ProfileResetModal from './ProfileResetModal';
import ProfileLogoutModal from './ProfileLogoutModal';
import useProfileDataActions from '../hooks/useProfileDataActions';
import useProfileSecurity from '../hooks/useProfileSecurity';
import useProfileFinances from '../hooks/useProfileFinances';
import useProfileMetrics from '../hooks/useProfileMetrics';

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
  const { user, signOut } = useAuth();

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
  

  // Acciones de datos (Cloud sync, Logout, Factory reset)
  const dataActions = useProfileDataActions({
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

  // Seguridad PIN & Biometría
  const security = useProfileSecurity({
    securitySettings,
    onUpdateSecurity,
    setCurrentView,
    showToast
  });

  // Gestión Financiera & Perfil
  const finances = useProfileFinances({
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

  // Métricas mensuales
  const metrics = useProfileMetrics({ transactions, savingsGoals, safeNumber });

  // Manejador centralizado de tecla Volver / Popstate para navegación interna escalonada
  useBackHandler(isOpen, () => {
    if (finances.showAddGoalForm || finances.editingGoal) {
      finances.setShowAddGoalForm(false);
      finances.setEditingGoal(null);
      return;
    }
    if (finances.showAddSubForm) {
      finances.setShowAddSubForm(false);
      return;
    }
    if (finances.isEditingGlobalBudget) {
      finances.setIsEditingGlobalBudget(false);
      return;
    }
    if (finances.editingCatBudgetId) {
      finances.setEditingCatBudgetId(null);
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
      finances.setIsEditingName(false);
      finances.setShowAddSubForm(false);
      finances.setShowAddGoalForm(false);
      finances.setIsEditingGlobalBudget(false);
      finances.setEditingCatBudgetId(null);
      dataActions.setShowResetConfirm(false);
      dataActions.setConfirmDeleteText('');
      dataActions.setShowLogoutConfirm(false);
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
          fileInputRef={fileInputRef}
          isOnline={isOnline}
          onClose={onClose}
          {...finances}
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
                  totalMonthExpense={metrics.totalMonthExpense}
                  savingsGoals={savingsGoals}
                  totalSavedAcrossGoals={metrics.totalSavedAcrossGoals}
                  totalTargetAcrossGoals={metrics.totalTargetAcrossGoals}
                  subscriptions={subscriptions}
                  totalMonthlySubscriptions={finances.totalMonthlySubscriptions}
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
                  handleTogglePin={security.handleTogglePin}
                  handleToggleBiometrics={security.handleToggleBiometrics}
                  onChangePinClick={() => {
                    security.setNewPin('');
                    security.setConfirmPin('');
                    security.setPinError('');
                    setCurrentView('pin_setup');
                  }}
                />
              )}

              {/* TAB 3: ALMACENAMIENTO & DATOS */}
              {activeTab === 'cloud' && (
                <ProfileCloudTab
                  user={user}
                  isCloudUser={isCloudUser}
                  onManualCloudSync={onManualCloudSync}
                  isCloudSyncing={dataActions.isCloudSyncing}
                  onLogout={() => dataActions.setShowLogoutConfirm(true)}
                  transactions={transactions}
                  investments={investments}
                  trm={trm}
                  accounts={accounts}
                  categories={categories}
                  debtsAndLoans={debtsAndLoans}
                  budgets={budgets}
                  savingsGoals={savingsGoals}
                  subscriptions={subscriptions}
                  userProfile={userProfile}
                  securitySettings={securitySettings}
                  theme={theme}
                  onRestoreBackup={onRestoreBackup}
                />
              )}

              {/* TAB 4: AJUSTES & SISTEMA */}
              {activeTab === 'system' && (
                <ProfileSystemTab
                  theme={theme}
                  onThemeChange={onThemeChange}
                  enableDecimals={enableDecimals}
                  toggleEnableDecimals={toggleEnableDecimals}
                  onResetData={() => dataActions.setShowResetConfirm(true)}
                />
              )}
            </>
          )}

          {/* VIEW: PRESUPUESTOS */}
          {currentView === 'budgets' && (
            <ProfileBudgetsView
              budgets={budgets}
              categories={categories}
              expenseByCatMap={metrics.expenseByCatMap}
              totalMonthExpense={metrics.totalMonthExpense}
              formatMoney={formatMoney}
              {...finances}
            />
          )}

          {/* VIEW: METAS DE AHORRO */}
          {currentView === 'savings_goals' && (
            <ProfileSavingsGoalsView
              savingsGoals={savingsGoals}
              totalSavedAcrossGoals={metrics.totalSavedAcrossGoals}
              totalTargetAcrossGoals={metrics.totalTargetAcrossGoals}
              formatMoney={formatMoney}
              accounts={accounts}
              onAddGoal={onAddGoal}
              onUpdateGoal={onUpdateGoal}
              onDeleteGoal={onDeleteGoal}
              showToast={showToast}
              {...finances}
            />
          )}

          {/* VIEW: PIN SETUP */}
          {currentView === 'pin_setup' && (
            <ProfilePinSetupView
              {...security}
              setCurrentView={setCurrentView}
            />
          )}

          {/* VIEW: SUBSCRIPTIONS */}
          {currentView === 'subscriptions' && (
            <ProfileSubscriptionsView
              subscriptions={subscriptions}
              formatMoney={formatMoney}
              onDeleteSubscription={onDeleteSubscription}
              {...finances}
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
          onLogoutClick={() => dataActions.setShowLogoutConfirm(true)}
        />
      </div>


      {/* MODAL DE DOBLE CONFIRMACIÓN DE BORRADO DE DATOS (ZONA DE PELIGRO) */}
      {dataActions.showResetConfirm && (
        <ProfileResetModal
          isOpen={dataActions.showResetConfirm}
          onClose={() => {
            dataActions.setShowResetConfirm(false);
            dataActions.setConfirmDeleteText('');
          }}
          confirmDeleteText={dataActions.confirmDeleteText}
          setConfirmDeleteText={dataActions.setConfirmDeleteText}
          isResetting={dataActions.isResetting}
          onConfirm={dataActions.handleConfirmFactoryReset}
        />
      )}

      {/* MODAL DE CONFIRMACIÓN DE CERRAR SESIÓN */}
      {dataActions.showLogoutConfirm && (
        <ProfileLogoutModal
          isOpen={dataActions.showLogoutConfirm}
          onClose={() => dataActions.setShowLogoutConfirm(false)}
          onConfirm={dataActions.handleFullLogout}
          isLoggingOut={dataActions.isLoggingOut}
        />
      )}
    </div>
  );
}
