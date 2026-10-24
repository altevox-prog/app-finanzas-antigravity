import React, { Suspense, lazy } from 'react';
import { AnimatePresence } from 'framer-motion';
import DesktopMonthPicker from '../layout/DesktopMonthPicker';
import CalendarDropdown from '../common/CalendarDropdown';
import LockScreen from '../auth/LockScreen';
import { DEFAULT_WIDGETS_CONFIG } from '../../utils/widgetsConfig';

const AddTransactionModal = lazy(() => import('../transactions/modals/AddTransactionModal'));
const AddLoanModal = lazy(() => import('../debts/AddLoanModal'));
const AddInvestmentModal = lazy(() => import('../investments/modals/AddInvestmentModal'));
const AddAccountModal = lazy(() => import('../accounts/modals/AddAccountModal'));
const AddRecurringModal = lazy(() => import('../recurring/modals/AddRecurringModal'));
const CreditCardDetailModal = lazy(() => import('../accounts/modals/CreditCardDetailModal'));
const EditWidgetsModal = lazy(() => import('../dashboard/modals/EditWidgetsModal'));
const ProfileModal = lazy(() => import('../profile/modals/ProfileModal'));
const OnboardingFlow = lazy(() => import('../onboarding/OnboardingFlow'));

export default function ModalContainer({ modalControls, financeData = {}, financeActions = {}, ...rest }) {
  const m = { ...financeData, ...financeActions, ...rest, ...(modalControls || rest.modalControls || {}) };

  const isTransferOpen = Boolean(m.isTransferOpen || m.isTransferModalOpen);
  const isTxOpen = Boolean(m.isAddTransactionOpen || m.isTxOpen || m.isAddTxOpen || m.isTransactionModalOpen || m.isNewTxModalOpen || isTransferOpen);
  const isLoanOpen = Boolean(m.isAddLoanOpen || m.isLoanOpen || m.isDebtModalOpen || m.isAddDebtOpen || m.isNewDebtModalOpen);
  const isRecurringOpen = Boolean(m.isAddRecurringOpen || m.isRecurringOpen || m.isRecurringModalOpen || m.isNewRecurringModalOpen);
  const isInvestmentOpen = Boolean(m.isAddInvestmentOpen || m.isInvestmentOpen || m.isNewInvestmentModalOpen);

  const closeTx = () => {
    (m.closeAddTransaction || m.closeTx || m.closeTransactionModal || m.handleCloseTransaction)?.();
    m.setIsAddTxOpen?.(false); m.setIsAddTransactionOpen?.(false); m.setIsNewTxModalOpen?.(false);
    (m.closeTransfer || m.closeTransferModal || m.handleCloseTransfer)?.(); m.setIsTransferModalOpen?.(false);
  };
  const closeLoan = () => { (m.closeAddLoan || m.closeLoan || m.closeAddDebt || m.closeDebtModal || m.handleCloseLoan)?.(); m.setIsAddLoanOpen?.(false); m.setIsNewDebtModalOpen?.(false); };
  const closeRecurring = () => { (m.closeAddRecurring || m.closeRecurring || m.closeRecurringModal || m.handleCloseRecurring)?.(); m.setIsAddRecurringOpen?.(false); m.setIsNewRecurringModalOpen?.(false); };
  const closeInvestment = () => { (m.closeInvestment || m.closeInvestmentModal || m.handleCloseInvestment)?.(); m.setIsAddInvestmentOpen?.(false); m.setIsNewInvestmentModalOpen?.(false); };
  const closeProfile = () => { m.setIsSettingsOpen?.(false); m.setIsProfileOpen?.(false); };
  const navigateFromSettings = (tab) => { closeProfile(); m.setFromSettings?.(true); m.handleTabChange?.(tab, 'settings'); };
  const activeSubscriptions = (m.recurringPayments?.length > 0) ? m.recurringPayments : (m.subscriptions || []);

  return (
    <Suspense fallback={null}>
      <AnimatePresence>
        {isTxOpen && (
          <AddTransactionModal
            key="global-add-transaction-modal" isOpen={isTxOpen}
            onClose={m.closeAddTransaction || m.closeTx || m.closeTransactionModal || closeTx}
            onSave={m.handleSaveTransaction} onAddTransaction={m.handleAddTransaction}
            onTransfer={m.onTransfer || m.handleExecuteTransfer} accounts={m.accounts || []} categories={m.categories || []}
            onAddCategory={m.handleAddCategory} onAddSubcategory={m.handleAddSubcategory}
            onUpdateSubcategory={m.handleUpdateSubcategory} onDeleteSubcategory={m.handleDeleteSubcategory}
            onAddAccount={m.handleAddAccount} defaultDate={m.selectedDay || new Date().toLocaleDateString('en-CA')}
            defaultType={isTransferOpen ? 'transfer' : (m.txDefaultType || 'expense')} trm={m.trm || 4050}
            {...m}
          />
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {isInvestmentOpen && (
          <AddInvestmentModal
            isOpen={isInvestmentOpen} onClose={m.closeInvestment || m.closeInvestmentModal || closeInvestment}
            onSave={(newInv) => { m.handleAddInvestment?.(newInv); closeInvestment(); m.handleTabChange?.('investments'); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {isLoanOpen && (
          <AddLoanModal
            isOpen={isLoanOpen} initialType={m.addLoanInitialType || 'receivable'} defaultType={m.addLoanInitialType || 'receivable'}
            onClose={m.closeAddLoan || m.closeLoan || m.closeAddDebt || m.closeDebtModal || closeLoan}
            onSave={(newItem) => { m.handleAddDebtOrLoan?.(newItem); closeLoan(); m.handleTabChange?.('debts'); }}
          />
        )}
      </AnimatePresence>
      {isRecurringOpen && (
        <AddRecurringModal
          isOpen={isRecurringOpen} onClose={m.closeAddRecurring || m.closeRecurring || m.closeRecurringModal || closeRecurring}
          onSave={(newItem) => { m.handleAddRecurring?.(newItem); closeRecurring(); m.handleTabChange?.('recurring'); }}
          accounts={m.accounts || []} categories={m.categories || []}
          onAddCategory={m.handleAddCategory} onAddSubcategory={m.handleAddSubcategory} trm={m.trm || 4050}
        />
      )}
      {Boolean(m.isAccountModalOpen || m.isAddAccountOpen) && (
        <AddAccountModal
          isOpen={Boolean(m.isAccountModalOpen || m.isAddAccountOpen)}
          onClose={m.closeAccountModal || m.closeAddAccount || (() => { m.setIsAccountModalOpen?.(false); m.setIsAddAccountOpen?.(false); })}
          onCreateAccount={m.handleAddAccount} trm={m.trm || 4050}
        />
      )}
      {m.showMonthPicker && (
        <DesktopMonthPicker
          isOpen={m.showMonthPicker} onClose={() => m.setShowMonthPicker?.(false)}
          selectedDate={m.selectedDate || new Date()} onChangeMonth={(d) => m.setSelectedDate?.(d)}
          selectedDay={m.selectedDay} onSelectDay={(d) => m.setSelectedDay?.(d)}
          onClearSelectedDay={() => m.setSelectedDay?.(null)} transactions={m.transactions || []}
        />
      )}
      {m.isCalendarOpen && (
        <CalendarDropdown
          isOpen={m.isCalendarOpen} onClose={() => m.setIsCalendarOpen?.(false)}
          selectedDate={m.selectedDate || new Date()} onChangeMonth={m.setSelectedDate}
          selectedDay={m.selectedDay} onSelectDay={(d) => m.setSelectedDay?.(d)} transactions={m.transactions || []}
        />
      )}
      {Boolean(m.selectedCreditCardDetail) && (
        <CreditCardDetailModal
          isOpen={Boolean(m.selectedCreditCardDetail)} onClose={() => m.setSelectedCreditCardDetail?.(null)}
          card={(m.accounts || []).find(a => a.id === m.selectedCreditCardDetail?.id) || m.selectedCreditCardDetail}
          transactions={m.transactions || []} accounts={m.accounts || []} onAddTransaction={m.handleAddTransaction}
          onOpenEdit={() => { m.setSelectedCreditCardDetail?.(null); m.handleTabChange?.('accounts'); }}
        />
      )}
      {Boolean(m.isEditWidgetsModalOpen) && (
        <EditWidgetsModal
          isOpen={m.isEditWidgetsModalOpen} onClose={() => m.setIsEditWidgetsModalOpen?.(false)}
          widgetsConfig={m.widgets || DEFAULT_WIDGETS_CONFIG} widgets={m.widgets || DEFAULT_WIDGETS_CONFIG}
          onSave={(w) => m.setWidgets?.([...w])} onReset={(w) => m.setWidgets?.([...(w || DEFAULT_WIDGETS_CONFIG)])}
        />
      )}
      {Boolean(m.isSettingsOpen || m.isProfileOpen) && (
        <ProfileModal
          key={`profile-modal-${m.profileResetKey || 0}`} isOpen={true} onClose={closeProfile}
          initialView={m.profileInitialView || 'main'}
          userProfile={m.userProfile || { name: 'Usuario' }} onUpdateProfile={m.handleUpdateProfile}
          securitySettings={m.securitySettings || {}} onUpdateSecurity={m.setSecuritySettings} subscriptions={activeSubscriptions}
          onAddSubscription={(s) => m.handleAddRecurring ? m.handleAddRecurring(s) : m.setSubscriptions?.(prev => [s, ...prev])}
          onDeleteSubscription={(id) => { const fn = m.handleDeleteRecurring || m.onDeleteRecurring || m.deleteRecurringPayment; if (fn) fn(id); else m.setSubscriptions?.(prev => prev.filter(s => s.id !== id)); }}
          accountsCount={(m.accounts || []).length} categoriesCount={(m.categories || []).length}
          onOpenAccounts={() => navigateFromSettings('accounts')} onNavigateToRecurring={() => navigateFromSettings('recurring')}
          onNavigateToNetWorth={() => navigateFromSettings('net_worth')} onNavigate={navigateFromSettings}
          onOpenTutorial={() => { closeProfile(); m.setShowTutorial?.(true); }}
          theme={m.theme || 'dark'} onThemeChange={m.setTheme} budgets={m.budgets || {}} onUpdateBudgets={m.setBudgets}
          savingsGoals={m.savingsGoals || []} onAddGoal={m.handleAddGoal} onUpdateGoal={m.handleUpdateGoal} onDeleteGoal={m.handleDeleteGoal}
          transactions={m.transactions || []} categories={m.categories || []}
          onAddCategory={m.handleAddCategory} onUpdateCategory={m.handleUpdateCategory} onDeleteCategory={m.handleDeleteCategory}
          onAddSubcategory={m.handleAddSubcategory} onUpdateSubcategory={m.handleUpdateSubcategory} onDeleteSubcategory={m.handleDeleteSubcategory}
          investments={m.investments || []} debtsAndLoans={m.debtsAndLoans || []} accounts={m.accounts || []}
          onAddAccount={m.handleAddAccount} onUpdateAccount={m.handleUpdateAccount} onDeleteAccount={m.handleDeleteAccount} onReorderAccounts={m.handleReorderAccounts}
          trm={m.trm || 4050} onOpenAuth={() => {}} onRestoreBackup={m.handleRestoreBackup} onFactoryReset={m.handleResetData}
          onManualCloudSync={m.pushLocalToCloud} syncStatus={m.syncStatus} user={m.user} selectedDate={m.selectedDate} onLogout={m.onLogout}
        />
      )}
      {Boolean(m.showTutorial) && <OnboardingFlow tutorialOnly onClose={() => m.setShowTutorial?.(false)} />}
      {m.isLocked && Boolean(m.securitySettings?.pinEnabled) && Boolean(m.securitySettings?.pin && String(m.securitySettings.pin).trim().length >= 4) && (
        <LockScreen
          userProfile={m.userProfile} expectedPin={m.securitySettings?.pin || ''}
          biometricsEnabled={Boolean(m.securitySettings?.biometricsEnabled)} onUnlock={m.handleUnlock} failedAttempts={m.failedAttempts}
        />
      )}
    </Suspense>
  );
}
