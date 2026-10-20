import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivacy } from '../context/PrivacyContext';
import { useAuth } from '../context/AuthContext';
import { clearSessionFinancialStorage } from '../services/storage/storageCleaner';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { INITIAL_SAVINGS_GOALS } from '../data/initialData';
import { processDueRecurringPayments } from '../services/recurring/recurringAutoProcessor';

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
import { useRecurringPayments } from './useRecurringPayments';
import { useInvestments } from './useInvestments';
import useInvestmentQuotes from '../components/investments/hooks/useInvestmentQuotes';
import { useDebts } from './useDebts';
import { useAccounts } from './useAccounts';
import { useTransactions } from './useTransactions';
import { useFinanceAnalytics } from './useFinanceAnalytics';
import { useDateNavigation } from './useDateNavigation';
import { useDataManagement } from './useDataManagement';
import { useNavigationTabs } from './useNavigationTabs';
import { useModalControls } from './useModalControls';
import { useDataSync } from './useDataSync';
import { useScrollRestoration } from './useScrollRestoration';
import { useFinanceContext } from './useFinanceContext';

export function sanitizeGoal(g) {
  if (!g) return null;
  const rawD = g.deadline || g.target_date || g.dueDate, safeDate = rawD ? String(rawD).split('T')[0] : '';
  const rawAcc = g.target_account_id !== undefined ? g.target_account_id : g.targetAccountId;
  const target = Number(g.target_amount ?? g.targetAmount ?? 0), current = Number(g.current_amount ?? g.currentAmount ?? 0);
  const notifDay = Number(g.notification_day ?? g.notificationDay ?? 15), notify = Boolean(g.notify_enabled ?? g.notifyEnabled ?? true);
  return {
    ...g, id: String(g.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `goal-${Date.now()}`)),
    name: (g.name || 'Nueva Meta').trim(), target_amount: target, targetAmount: target, current_amount: current, currentAmount: current,
    deadline: safeDate, target_date: safeDate, dueDate: safeDate, icon: g.icon || 'Target', color: g.color || '#10B981',
    target_account_id: rawAcc ? String(rawAcc) : null, targetAccountId: rawAcc ? String(rawAcc) : null,
    months: Number(g.months || 6), notification_day: notifDay, notificationDay: notifDay, notify_enabled: notify, notifyEnabled: notify
  };
}

function getInitialSavingsGoals() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SAVINGS_GOALS) || localStorage.getItem('savingsGoals');
    if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed)) return parsed.map(sanitizeGoal).filter(Boolean); }
  } catch {}
  return INITIAL_SAVINGS_GOALS;
}

export function useAppOrchestrator() {
  const { formatMoney } = usePrivacy();
  const { user, setUser, loading: authLoading, signOut } = useAuth();
  const { theme, setTheme, handleToggleTheme } = useTheme();

  const modalControls = useModalControls();
  const { isAddTxOpen, setIsAddTxOpen, isSettingsOpen, setIsSettingsOpen, isActionMenuOpen, setIsActionMenuOpen, handleOpenTransaction, handleOpenAddLoan, handleOpenAddDebt, handleOpenTransfer, handleOpenRecurring, handleOpenInvestment, handleOpenProfile, handleCloseAllModals } = modalControls;

  const [hasPwaUpdate, setHasPwaUpdate] = useState(false);
  const isResettingRef = useRef(false);
  const transactionsRef = useRef([]);
  const setTransactionsRef = useRef(null);

  const { trm, setTrm, updateTRM } = useTRM(isResettingRef);
  const { userProfile, setUserProfile, handleUpdateProfile } = useUserProfile({ user, isResettingRef });

  const { accounts, setAccounts, handleAddAccount, handleSaveAccount, handleUpdateAccount, handleDeleteAccount, deleteAccount, handleReorderAccounts, updateAccountsOrder, fetchAccounts, handleArchiveAccount, handleAdjustAccountBalance, resetAccounts } = useAccounts({ isResettingRef, transactionsRef, setTransactionsRef, trm });
  const { transactions, setTransactions, handleAddTransaction: baseAddTransaction, handleSaveTransaction: baseSaveTransaction, handleUpdateTransaction: baseUpdateTransaction, handleDeleteTransaction: baseDeleteTransaction, handleExecuteTransfer: baseExecuteTransfer, resetTransactions } = useTransactions({ isResettingRef, accounts, setAccounts, trm });

  transactionsRef.current = transactions;
  setTransactionsRef.current = setTransactions;

  const { categories, setCategories, handleAddCategory, handleUpdateCategory, handleDeleteCategory, handleAddSubcategory, handleUpdateSubcategory, handleDeleteSubcategory, resetCategories } = useCategories({
    isResettingRef,
    onCategoryUpdated: (cat) => setTransactions((prev) => prev.map((t) => t.categoryId === cat.id ? { ...t, categoryName: cat.name } : t)),
    onSubcategoryUpdated: (subId, name) => setTransactions((prev) => prev.map((t) => t.subcategoryId === subId ? { ...t, subcategoryName: name.trim() } : t))
  });

  const { debtsAndLoans, setDebtsAndLoans, handleAddDebtOrLoan: baseAddDebtOrLoan, handleSaveLoan: baseSaveLoan, handleUpdateDebtOrLoan, handleAddPayment: baseAddPayment, handleDeletePayment: baseDeletePayment, handleAddDisbursement: baseAddDisbursement, handleDeleteDebtOrLoan: baseDeleteDebtOrLoan, resetDebts } = useDebts({ isResettingRef, accounts, categories, setAccounts, setTransactions, setCategories });
  const { investments, setInvestments, handleAddInvestment: baseAddInvestment, handleSaveInvestment: baseSaveInvestment, handleUpdateInvestment: baseUpdateInvestment, handleDeleteInvestment: baseDeleteInvestment, resetInvestments } = useInvestments(isResettingRef);
  const { livePrices, handleRefreshQuotes, isRefreshing: isRefreshingQuotes } = useInvestmentQuotes({ investments });

  const { viewMode, isForcedMobile, isForcedDesktop, desktopOnlyClass, desktopBlockClass, mobileOnlyClass } = useViewMode();
  const { widgets, setWidgets, isEditWidgetsModalOpen, setIsEditWidgetsModalOpen } = useDashboardWidgets({ userId: user?.id, isResettingRef });
  const { isOnboardingActive, setIsOnboardingActive, isOnboardingLoading, showTutorial, setShowTutorial, completeOnboarding } = useOnboarding({ user });
  const { securitySettings, setSecuritySettings, isLocked, setIsLocked, handleUnlock, handleVerifyPin, handleUpdatePin, failedAttempts, lockApp } = useAppSecurity(isResettingRef);
  const { recurringPayments, setRecurringPayments, subscriptions, setSubscriptions, handleAddRecurring, handleSaveRecurring, handleUpdateRecurring, handleDeleteRecurring, handleToggleActiveRecurring, resetRecurringPayments } = useRecurringPayments(isResettingRef);

  useEffect(() => {
    if (isResettingRef.current || !recurringPayments?.length) return;
    processDueRecurringPayments({ recurringPayments, onAddTransaction: baseAddTransaction, onUpdateRecurring: handleUpdateRecurring });
  }, [recurringPayments, baseAddTransaction, handleUpdateRecurring]);

  const { budgets, setBudgets, updateGlobalBudget, updateCategoryBudget, removeCategoryBudget, resetBudgets } = useBudgets(isResettingRef);
  const [savingsGoals, setSavingsGoals] = useState(getInitialSavingsGoals);

  useEffect(() => {
    if (isResettingRef.current) return;
    try { localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, JSON.stringify(savingsGoals)); } catch {}
  }, [savingsGoals]);

  const handleAddGoal = useCallback(async (g) => { const item = sanitizeGoal(g); if (item?.id) setSavingsGoals((prev) => [item, ...(Array.isArray(prev) ? prev : []).filter((x) => String(x?.id) !== String(item.id))]); return item; }, []);
  const handleUpdateGoal = useCallback(async (g) => { const item = sanitizeGoal(g); if (item?.id) setSavingsGoals((prev) => (Array.isArray(prev) ? prev : []).map((x) => String(x?.id) === String(item.id) ? { ...x, ...item } : x)); return item; }, []);
  const handleDeleteGoal = useCallback(async (id) => { if (!id) return; setSavingsGoals((prev) => (Array.isArray(prev) ? prev : []).filter((g) => String(g?.id) !== String(id))); if (isSupabaseConfigured && supabase) supabase.from('savings_goals').delete().eq('id', String(id)).catch(() => {}); }, []);
  const handleContributeGoal = useCallback(async (id, amt) => { const val = Number(amt) || 0; if (val > 0) setSavingsGoals((prev) => (Array.isArray(prev) ? prev : []).map((g) => String(g?.id) === String(id) ? sanitizeGoal({ ...g, currentAmount: (Number(g.currentAmount || 0) + val) }) : g)); }, []);
  const resetSavingsGoals = useCallback(() => { setSavingsGoals(INITIAL_SAVINGS_GOALS); try { localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, JSON.stringify(INITIAL_SAVINGS_GOALS)); } catch {} }, []);

  const { selectedDate, setSelectedDate, selectedMonth, selectedYear, selectedDay, setSelectedDay, showMonthPicker, setShowMonthPicker, currentMonthLabel, handlePrevMonth, handleNextMonth, handleResetToToday, handleChangeMonth, handleSelectDay, handleClearSelectedDay } = useDateNavigation();
  const { handleFactoryReset, handleFullReset, handleResetData, handleRestoreBackup, handleImportBackup, handleOnboardingComplete } = useDataManagement({
    isResettingRef, user, resetTransactions, resetAccounts, resetDebts, resetInvestments, resetRecurringPayments, resetSavingsGoals, resetBudgets, setTransactions, setAccounts, setCategories, setDebtsAndLoans, setInvestments, setBudgets, setSavingsGoals, setRecurringPayments, setUserProfile, setSecuritySettings, setTrm, setTheme, setSelectedDay, setIsLocked, setShowTutorial, completeOnboarding
  });

  const resetAllFinancialStates = useCallback(() => {
    isResettingRef.current = true;
    try {
      [resetTransactions, resetAccounts, resetDebts, resetInvestments, resetRecurringPayments, resetSavingsGoals, resetBudgets, resetCategories].forEach((fn) => fn?.());
      setTransactions([]); setAccounts([]); setDebtsAndLoans([]); setInvestments([]); setRecurringPayments([]); setSavingsGoals([]); setCategories([]);
      setBudgets({ global: 0, categories: {} }); setUserProfile({ name: 'Usuario', email: '' }); setIsLocked(false); setSecuritySettings({ pinEnabled: false, pin: '', biometricsEnabled: false });
    } finally { setTimeout(() => { isResettingRef.current = false; }, 300); }
  }, [resetTransactions, resetAccounts, resetDebts, resetInvestments, resetRecurringPayments, resetSavingsGoals, resetBudgets, resetCategories, setTransactions, setAccounts, setDebtsAndLoans, setInvestments, setRecurringPayments, setSavingsGoals, setCategories, setBudgets, setUserProfile, setIsLocked, setSecuritySettings]);

  const handleGlobalLogout = useCallback(async () => { try { resetAllFinancialStates(); clearSessionFinancialStorage(); await signOut?.(); } catch {} }, [resetAllFinancialStates, signOut]);

  useEffect(() => {
    const onPwa = () => setHasPwaUpdate(true), onOut = () => resetAllFinancialStates();
    window.addEventListener('pwa-update-available', onPwa); window.addEventListener('monety:signout', onOut);
    return () => { window.removeEventListener('pwa-update-available', onPwa); window.removeEventListener('monety:signout', onOut); };
  }, [resetAllFinancialStates]);

  const { syncStatus, syncUser, isCloudEnabled, pushLocalToCloud, pullCloudToLocal } = useDataSync({
    accounts, setAccounts, transactions, setTransactions, debtsAndLoans, setDebtsAndLoans, investments, setInvestments, recurringPayments, setRecurringPayments, budgets, setBudgets, categories, setCategories, savingsGoals, setSavingsGoals, userProfile, setUserProfile
  });

  const { activeTab, setActiveTab, tabResetKeys, handleTabChange, handleResetTab, mainContentRef, fromSettings, setFromSettings, handleGoBackFromSubView, debtsInitialTab } = useNavigationTabs({
    initialTab: 'dashboard', onTabChange: () => { handleCloseAllModals(); setIsEditWidgetsModalOpen(false); }, onOpenProfile: handleOpenProfile
  });

  useScrollRestoration(activeTab, mainContentRef);
  const { monthlyTransactions, scopedTransactions, monthlyStats, netWorth, taxMetrics } = useFinanceAnalytics({ transactions, accounts, investments, debtsAndLoans, selectedDate, selectedMonth, selectedYear, selectedDay, trm, livePrices });
  const { tomorrowDebtAlerts, handleDismissAlert, handleReviewDebtAlert } = useDebtAlerts({ debtsAndLoans, accounts, onNavigateToDebts: () => handleTabChange('debts') });

  const { financeData, financeActions, financialOps } = useFinanceContext({
    accounts, setAccounts, transactions, setTransactions, categories, setCategories, debtsAndLoans, setDebtsAndLoans, investments, setInvestments, recurringPayments, setRecurringPayments, subscriptions, setSubscriptions, budgets, setBudgets, savingsGoals, setSavingsGoals, userProfile, setUserProfile, trm, user, theme, setTheme, securitySettings, setSecuritySettings, isLocked, failedAttempts, showTutorial, setShowTutorial, isResettingRef, baseAddTransaction, baseSaveTransaction, baseUpdateTransaction, baseDeleteTransaction, baseExecuteTransfer, baseAddPayment, baseDeletePayment, baseAddDisbursement, baseAddInvestment, baseSaveInvestment, baseUpdateInvestment, baseDeleteInvestment, baseAddDebtOrLoan, baseSaveLoan, baseDeleteDebtOrLoan, handleAddCategory, handleUpdateCategory, handleDeleteCategory, handleAddSubcategory, handleUpdateSubcategory, handleDeleteSubcategory, handleAddAccount, handleUpdateAccount, handleDeleteAccount, handleReorderAccounts, updateAccountsOrder, fetchAccounts, handleUpdateDebtOrLoan, handleAddRecurring, handleUpdateRecurring, handleDeleteRecurring, handleToggleActiveRecurring, handleAddGoal, handleUpdateGoal, handleDeleteGoal, handleUpdateProfile, handleRestoreBackup, handleResetData, pushLocalToCloud, pullCloudToLocal, handleGlobalLogout, syncStatus, syncUser, isCloudEnabled, selectedDate, setSelectedDate, selectedMonth, selectedYear, selectedDay, setSelectedDay, showMonthPicker, setShowMonthPicker, currentMonthLabel, handlePrevMonth, handleNextMonth, handleResetToToday, handleChangeMonth, widgets, setWidgets, isEditWidgetsModalOpen, setIsEditWidgetsModalOpen, tomorrowDebtAlerts, handleDismissAlert, handleReviewDebtAlert, formatMoney, fromSettings, setFromSettings, handleGoBackFromSubView, handleUnlock, handleVerifyPin, handleUpdatePin, monthlyTransactions, scopedTransactions, monthlyStats, netWorth, taxMetrics, activeTab, handleTabChange, handleResetTab, modalControls, livePrices
  });

  return {
    user, setUser, authLoading, isOnboardingActive, isOnboardingLoading, handleOnboardingComplete, handleRestoreBackup, isReady: true, refreshAllData: pullCloudToLocal,
    viewMode, isForcedMobile, isForcedDesktop, desktopOnlyClass, desktopBlockClass, mobileOnlyClass, activeTab, setActiveTab, tabResetKeys, handleTabChange, handleResetTab, mainContentRef, fromSettings, setFromSettings, handleGoBackFromSubView, debtsInitialTab, theme, setTheme, handleToggleTheme,
    securitySettings, setSecuritySettings, isLocked, setIsLocked, handleUnlock, handleVerifyPin, handleUpdatePin, failedAttempts, lockApp, handleGlobalLogout,
    modalControls, isAddTxOpen, setIsAddTxOpen, isSettingsOpen, setIsSettingsOpen, isActionMenuOpen, setIsActionMenuOpen, handleOpenTransaction, handleOpenAddLoan, handleOpenAddDebt, handleOpenTransfer, handleOpenRecurring, handleOpenInvestment, handleOpenProfile, handleCloseAllModals,
    selectedDate, setSelectedDate, selectedMonth, selectedYear, selectedDay, setSelectedDay, showMonthPicker, setShowMonthPicker, currentMonthLabel, handlePrevMonth, handleNextMonth, handleResetToToday, handleChangeMonth, handleSelectDay, handleClearSelectedDay,
    trm, setTrm, updateTRM, syncStatus, syncUser, isCloudEnabled, pushLocalToCloud, pullCloudToLocal, accounts, setAccounts, transactions, setTransactions, categories, setCategories, debtsAndLoans, setDebtsAndLoans, investments, setInvestments, recurringPayments, setRecurringPayments, subscriptions, setSubscriptions, budgets, setBudgets, savingsGoals, setSavingsGoals, userProfile, setUserProfile, handleUpdateProfile,
    widgets, setWidgets, isEditWidgetsModalOpen, setIsEditWidgetsModalOpen, showTutorial, setShowTutorial, monthlyTransactions, scopedTransactions, monthlyStats, netWorth, taxMetrics, tomorrowDebtAlerts, handleDismissAlert, handleReviewDebtAlert, hasPwaUpdate, setHasPwaUpdate,
    handleFullReset, handleFactoryReset, handleResetData, handleImportBackup, formatMoney, financeData, financeActions, financialOps, handleReorderAccounts, updateAccountsOrder, fetchAccounts, livePrices, handleRefreshQuotes, isRefreshingQuotes
  };
}

export default useAppOrchestrator;
