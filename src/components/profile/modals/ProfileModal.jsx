import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { usePrivacy } from '../../../context/PrivacyContext';
import CategoriesView from '../../categories/CategoriesView';
import AccountsAndCategories from '../../accounts/AccountsAndCategories';
import TaxView from '../../taxes/TaxView';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { useAuth } from '../../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../../services/supabaseClient';
import { safeNumber } from '../../../utils/financeMath';
import ProfileHeader from '../components/ProfileHeader';
import ProfileTabBar from '../components/ProfileTabBar';
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
  isOpen, onClose, onOpenAuth, userProfile, onUpdateProfile, securitySettings, onUpdateSecurity,
  subscriptions = [], onAddSubscription, onDeleteSubscription, accountsCount = 0, categoriesCount = 0,
  onOpenAccounts, onOpenCategories, theme = 'dark', onThemeChange, budgets = { global: 0, categories: {} },
  onUpdateBudgets, savingsGoals = [], onAddGoal, onUpdateGoal, onDeleteGoal, transactions = [],
  categories = [], onAddCategory, onUpdateCategory, onDeleteCategory, onAddSubcategory, onUpdateSubcategory,
  onDeleteSubcategory, investments = [], debtsAndLoans = [], accounts = [], onAddAccount, onUpdateAccount,
  onDeleteAccount, onReorderAccounts, trm = 4000, onRestoreBackup, onFactoryReset, onOpenTutorial,
  onNavigateToRecurring, onNavigateToNetWorth, onNavigate, onManualCloudSync, onLogout,
  selectedDate, selectedMonth, selectedYear
}) {
  const { formatMoney, enableDecimals, toggleEnableDecimals } = usePrivacy();
  const { user, signOut } = useAuth();
  const [modalState, setModalState] = useState({ currentView: 'main', activeTab: 'finances', toastMessage: null });
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const fileInputRef = useRef(null);

  const setCurrentView = (currentView) => setModalState((p) => ({ ...p, currentView }));
  const setActiveTab = (activeTab) => setModalState((p) => ({ ...p, activeTab }));
  const showToast = (text, isError = false) => {
    setModalState((p) => ({ ...p, toastMessage: { text, isError } }));
    setTimeout(() => setModalState((p) => ({ ...p, toastMessage: null })), 3500);
  };

  useEffect(() => {
    const setOn = () => setIsOnline(true), setOff = () => setIsOnline(false);
    window.addEventListener('online', setOn); window.addEventListener('offline', setOff);
    return () => { window.removeEventListener('online', setOn); window.removeEventListener('offline', setOff); };
  }, []);

  const isCloudUser = Boolean(user?.id && user.id !== 'local-user' && user.email && user.email !== 'local@device');
  const dataActions = useProfileDataActions({ onManualCloudSync, onLogout, signOut, isSupabaseConfigured, supabase, onFactoryReset, onClose, showToast, user });
  const security = useProfileSecurity({ securitySettings, onUpdateSecurity, setCurrentView, showToast });
  const finances = useProfileFinances({ userProfile, onUpdateProfile, budgets, onUpdateBudgets, savingsGoals, onAddGoal, onUpdateGoal, onDeleteGoal, subscriptions, onAddSubscription, onDeleteSubscription, showToast, formatMoney, safeNumber, supabase, isSupabaseConfigured, user });
  const metrics = useProfileMetrics({ transactions, savingsGoals, safeNumber, selectedDate, selectedMonth, selectedYear });

  useBackHandler(isOpen, () => {
    if (finances.showAddGoalForm || finances.editingGoal) { finances.setShowAddGoalForm(false); finances.setEditingGoal(null); }
    else if (finances.showAddSubForm) finances.setShowAddSubForm(false);
    else if (finances.isEditingGlobalBudget) finances.setIsEditingGlobalBudget(false);
    else if (finances.editingCatBudgetId) finances.setEditingCatBudgetId(null);
    else if (modalState.currentView !== 'main') setCurrentView('main');
    else onClose();
  });

  useEffect(() => {
    if (isOpen) {
      setModalState((p) => ({ ...p, currentView: 'main', activeTab: 'finances' }));
      finances.setIsEditingName(false); finances.setShowAddSubForm(false); finances.setShowAddGoalForm(false);
      finances.setIsEditingGlobalBudget(false); finances.setEditingCatBudgetId(null);
      dataActions.setShowResetConfirm(false); dataActions.setConfirmDeleteText(''); dataActions.setShowLogoutConfirm(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body?.style.overflow || '';
    if (document.body) document.body.style.overflow = 'hidden';
    return () => { if (document.body) document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;
  const { currentView, activeTab, toastMessage } = modalState;

  const renderActiveTab = () => {
    if (activeTab === 'finances') return (
      <ProfileFinancesTab
        setCurrentView={setCurrentView} formatMoney={formatMoney} budgets={budgets} totalMonthExpense={metrics.totalMonthExpense}
        savingsGoals={savingsGoals} totalSavedAcrossGoals={metrics.totalSavedAcrossGoals} totalTargetAcrossGoals={metrics.totalTargetAcrossGoals}
        subscriptions={subscriptions} totalMonthlySubscriptions={finances.totalMonthlySubscriptions} onNavigateToRecurring={onNavigateToRecurring}
        onNavigateToNetWorth={onNavigateToNetWorth} onNavigate={onNavigate} onClose={onClose} onOpenAccounts={onOpenAccounts}
        accountsCount={accountsCount} categoriesCount={categoriesCount}
      />
    );
    if (activeTab === 'security') return (
      <ProfileSecurityTab
        securitySettings={securitySettings} handleTogglePin={security.handleTogglePin} handleToggleBiometrics={security.handleToggleBiometrics}
        onChangePinClick={() => { security.setNewPin(''); security.setConfirmPin(''); security.setPinError(''); setCurrentView('pin_setup'); }}
      />
    );
    if (activeTab === 'cloud') return (
      <ProfileCloudTab
        user={user} isCloudUser={isCloudUser} onManualCloudSync={onManualCloudSync} isCloudSyncing={dataActions.isCloudSyncing}
        onLogout={() => dataActions.setShowLogoutConfirm(true)} transactions={transactions} investments={investments} trm={trm}
        accounts={accounts} categories={categories} debtsAndLoans={debtsAndLoans} budgets={budgets} savingsGoals={savingsGoals}
        subscriptions={subscriptions} userProfile={userProfile} securitySettings={securitySettings} theme={theme} onRestoreBackup={onRestoreBackup}
      />
    );
    return <ProfileSystemTab theme={theme} onThemeChange={onThemeChange} enableDecimals={enableDecimals} toggleEnableDecimals={toggleEnableDecimals} onResetData={() => dataActions.setShowResetConfirm(true)} />;
  };

  const renderViewContent = () => {
    if (currentView === 'budgets') return <ProfileBudgetsView budgets={budgets} categories={categories} expenseByCatMap={metrics.expenseByCatMap} totalMonthExpense={metrics.totalMonthExpense} formatMoney={formatMoney} {...finances} />;
    if (currentView === 'savings_goals') return <ProfileSavingsGoalsView savingsGoals={savingsGoals} totalSavedAcrossGoals={metrics.totalSavedAcrossGoals} totalTargetAcrossGoals={metrics.totalTargetAcrossGoals} formatMoney={formatMoney} accounts={accounts} onAddGoal={onAddGoal} onUpdateGoal={onUpdateGoal} onDeleteGoal={onDeleteGoal} showToast={showToast} {...finances} />;
    if (currentView === 'pin_setup') return <ProfilePinSetupView {...security} setCurrentView={setCurrentView} />;
    if (currentView === 'subscriptions') return <ProfileSubscriptionsView subscriptions={subscriptions} formatMoney={formatMoney} onDeleteSubscription={onDeleteSubscription} {...finances} />;
    if (currentView === 'categories') return <CategoriesView categories={categories} onAddCategory={onAddCategory} onUpdateCategory={onUpdateCategory} onDeleteCategory={onDeleteCategory} onAddSubcategory={onAddSubcategory} onUpdateSubcategory={onUpdateSubcategory} onDeleteSubcategory={onDeleteSubcategory} onBack={() => setCurrentView('main')} hideBackButton />;
    if (currentView === 'tax') return <TaxView transactions={transactions} accounts={accounts} investments={investments} onBack={() => setCurrentView('main')} onClose={onClose} />;
    if (currentView === 'accounts') return <AccountsAndCategories accounts={accounts} transactions={transactions} onAddAccount={onAddAccount} onUpdateAccount={onUpdateAccount} onDeleteAccount={onDeleteAccount} onReorderAccounts={onReorderAccounts} isReadOnly={false} fromSettings trm={trm} onBack={() => setCurrentView('main')} />;
    return renderActiveTab();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
      <div className="relative z-10 w-full max-w-xl h-[85dvh] sm:h-[620px] max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#121214] text-slate-900 dark:text-zinc-100 shadow-2xl border border-slate-200/80 dark:border-white/[0.08] overflow-hidden animate-slide-up">
        <div className="w-12 h-1.5 bg-slate-400/30 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />
        <ProfileHeader currentView={currentView} setCurrentView={setCurrentView} user={user} userProfile={userProfile} fileInputRef={fileInputRef} isOnline={isOnline} onClose={onClose} handleSync={dataActions.handleCloudSync} isSyncing={dataActions.isCloudSyncing} handleSignOut={() => dataActions.setShowLogoutConfirm(true)} {...finances}>
          <ProfileTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
        </ProfileHeader>
        {toastMessage && (
          <div className={`mx-4 mt-3 p-3 rounded-2xl text-xs flex items-center gap-2 border animate-fadeIn shrink-0 ${toastMessage.isError ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
            <AlertCircle className="w-4 h-4 shrink-0" /><span className="flex-1 font-medium">{toastMessage.text}</span>
          </div>
        )}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar overscroll-contain pb-6">
          {renderViewContent()}
        </div>
      </div>
      {dataActions.showResetConfirm && <ProfileResetModal isOpen={dataActions.showResetConfirm} onClose={() => { dataActions.setShowResetConfirm(false); dataActions.setConfirmDeleteText(''); }} confirmDeleteText={dataActions.confirmDeleteText} setConfirmDeleteText={dataActions.setConfirmDeleteText} isResetting={dataActions.isResetting} onConfirm={dataActions.handleConfirmFactoryReset} />}
      {dataActions.showLogoutConfirm && <ProfileLogoutModal isOpen={dataActions.showLogoutConfirm} onClose={() => dataActions.setShowLogoutConfirm(false)} onConfirm={dataActions.handleFullLogout} isLoggingOut={dataActions.isLoggingOut} />}
    </div>
  );
}
