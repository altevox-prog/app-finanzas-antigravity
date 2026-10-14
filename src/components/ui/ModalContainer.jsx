import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AddTransactionModal from '../transactions/modals/AddTransactionModal';
import TransferModal from '../transactions/modals/TransferModal';
import AddLoanModal from '../debts/AddLoanModal';
import AddRecurringModal from '../recurring/modals/AddRecurringModal';
import EditWidgetsModal from '../dashboard/modals/EditWidgetsModal';
import ProfileModal from '../profile/modals/ProfileModal';
import AddInvestmentModal from '../investments/modals/AddInvestmentModal';
import DesktopMonthPicker from '../layout/DesktopMonthPicker';
import CalendarDropdown from '../common/CalendarDropdown';
import CreditCardDetailModal from '../accounts/modals/CreditCardDetailModal';
import OnboardingFlow from '../onboarding/OnboardingFlow';
import LockScreen from '../auth/LockScreen';
import { DEFAULT_WIDGETS_CONFIG } from '../../utils/widgetsConfig';

/**
 * ModalContainer
 * Orquestador centralizado de todos los modales, overlays y diálogos emergentes de la aplicación.
 */
export default function ModalContainer({
  modalControls,
  financeData = {},
  financeActions = {},
  ...rest
}) {
  // Soporte directo para objetos agrupados (financeData, financeActions) y props individuales
  const merged = { ...financeData, ...financeActions, ...rest, ...(modalControls || rest.modalControls || {}) };

  const {
    // Flags y setters de visibilidad
    isAddTxOpen,
    setIsAddTxOpen,
    txDefaultType = 'expense',
    isTransferModalOpen,
    setIsTransferModalOpen,
    isAddInvestmentOpen,
    setIsAddInvestmentOpen,
    isNewInvestmentModalOpen,
    setIsNewInvestmentModalOpen,
    isAddLoanOpen,
    setIsAddLoanOpen,
    addLoanInitialType = 'receivable',
    isAddRecurringOpen,
    setIsAddRecurringOpen,
    showMonthPicker,
    setShowMonthPicker,
    isCalendarOpen,
    setIsCalendarOpen,
    selectedCreditCardDetail,
    setSelectedCreditCardDetail,
    isEditWidgetsModalOpen,
    setIsEditWidgetsModalOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isProfileOpen,
    profileResetKey = 0,
    showTutorial,
    setShowTutorial,
    isLocked,
    handleUnlock,
    handleVerifyPin,
    handleUpdatePin,
    failedAttempts,

    // Datos financieros y estados de configuración
    accounts = [],
    categories = [],
    transactions = [],
    investments = [],
    debtsAndLoans = [],
    subscriptions = [],
    setSubscriptions,
    savingsGoals = [],
    budgets = {},
    setBudgets,
    widgets = DEFAULT_WIDGETS_CONFIG,
    setWidgets,
    userProfile = { name: 'Usuario' },
    securitySettings = {},
    setSecuritySettings,
    user = null,
    trm = 4050,
    theme = 'dark',
    setTheme,
    selectedDate = new Date(),
    setSelectedDate,
    selectedDay = null,
    setSelectedDay,

    // Handlers CRUD y callbacks de eventos
    handleSaveTransaction,
    handleAddTransaction,
    handleExecuteTransfer,
    handleAddInvestment,
    handleAddDebtOrLoan,
    handleAddRecurring,
    handleUpdateProfile,
    handleAddGoal,
    handleUpdateGoal,
    handleDeleteGoal,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleAddSubcategory,
    handleUpdateSubcategory,
    handleDeleteSubcategory,
    handleAddAccount,
    handleTabChange,
    setFromSettings,
    handleRestoreBackup,
    handleResetData,
    onLogout
  } = merged;

  const isTxOpen = Boolean(
    merged.isAddTransactionOpen ||
    merged.isTxOpen ||
    merged.isAddTxOpen ||
    merged.isTransactionModalOpen ||
    merged.isNewTxModalOpen
  );
  const isLoanOpen = Boolean(
    merged.isAddLoanOpen ||
    merged.isLoanOpen ||
    merged.isDebtModalOpen ||
    merged.isAddDebtOpen ||
    merged.isNewDebtModalOpen
  );
  const isRecurringOpen = Boolean(
    merged.isAddRecurringOpen ||
    merged.isRecurringOpen ||
    merged.isRecurringModalOpen ||
    merged.isNewRecurringModalOpen
  );
  const isTransferOpen = Boolean(
    merged.isTransferOpen ||
    merged.isTransferModalOpen
  );
  const isInvestmentOpen = Boolean(
    merged.isAddInvestmentOpen ||
    merged.isInvestmentOpen ||
    merged.isNewInvestmentModalOpen
  );

  const closeTx = () => {
    if (typeof merged.closeAddTransaction === 'function') merged.closeAddTransaction();
    else if (typeof merged.closeTx === 'function') merged.closeTx();
    else if (typeof merged.closeTransactionModal === 'function') merged.closeTransactionModal();
    else if (typeof merged.handleCloseTransaction === 'function') merged.handleCloseTransaction();
    if (typeof merged.setIsAddTxOpen === 'function') merged.setIsAddTxOpen(false);
    if (typeof merged.setIsAddTransactionOpen === 'function') merged.setIsAddTransactionOpen(false);
    if (typeof merged.setIsNewTxModalOpen === 'function') merged.setIsNewTxModalOpen(false);
  };

  const closeLoan = () => {
    if (typeof merged.closeAddLoan === 'function') merged.closeAddLoan();
    else if (typeof merged.closeLoan === 'function') merged.closeLoan();
    else if (typeof merged.closeAddDebt === 'function') merged.closeAddDebt();
    else if (typeof merged.closeDebtModal === 'function') merged.closeDebtModal();
    else if (typeof merged.handleCloseLoan === 'function') merged.handleCloseLoan();
    if (typeof merged.setIsAddLoanOpen === 'function') merged.setIsAddLoanOpen(false);
    if (typeof merged.setIsNewDebtModalOpen === 'function') merged.setIsNewDebtModalOpen(false);
  };

  const closeRecurring = () => {
    if (typeof merged.closeAddRecurring === 'function') merged.closeAddRecurring();
    else if (typeof merged.closeRecurring === 'function') merged.closeRecurring();
    else if (typeof merged.closeRecurringModal === 'function') merged.closeRecurringModal();
    else if (typeof merged.handleCloseRecurring === 'function') merged.handleCloseRecurring();
    if (typeof merged.setIsAddRecurringOpen === 'function') merged.setIsAddRecurringOpen(false);
    if (typeof merged.setIsNewRecurringModalOpen === 'function') merged.setIsNewRecurringModalOpen(false);
  };

  const closeTransfer = () => {
    if (typeof merged.closeTransfer === 'function') merged.closeTransfer();
    else if (typeof merged.closeTransferModal === 'function') merged.closeTransferModal();
    else if (typeof merged.handleCloseTransfer === 'function') merged.handleCloseTransfer();
    if (typeof merged.setIsTransferModalOpen === 'function') merged.setIsTransferModalOpen(false);
  };

  const closeInvestment = () => {
    if (typeof merged.closeInvestment === 'function') merged.closeInvestment();
    else if (typeof merged.closeInvestmentModal === 'function') merged.closeInvestmentModal();
    else if (typeof merged.handleCloseInvestment === 'function') merged.handleCloseInvestment();
    if (typeof merged.setIsAddInvestmentOpen === 'function') merged.setIsAddInvestmentOpen(false);
    if (typeof merged.setIsNewInvestmentModalOpen === 'function') merged.setIsNewInvestmentModalOpen(false);
  };

  return (
    <>
      {/* 1. Modal Global para Nuevo Movimiento (AddTransactionModal) */}
      <AnimatePresence mode="wait">
        {isTxOpen && (
          <AddTransactionModal
            isOpen={isTxOpen}
            onClose={merged.closeAddTransaction || merged.closeTx || merged.closeTransactionModal || closeTx}
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
      </AnimatePresence>

      {/* 2. Modal Global para Transferencia entre Cuentas */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={merged.closeTransfer || merged.closeTransferModal || closeTransfer}
        accounts={accounts}
        transactions={transactions}
        onTransfer={async (transferData) => {
          if (handleExecuteTransfer) await handleExecuteTransfer(transferData);
          closeTransfer();
        }}
        trm={trm}
      />

      {/* 3. Modal Global para Nueva Inversión */}
      <AnimatePresence mode="wait">
        {isInvestmentOpen && (
          <AddInvestmentModal
            isOpen={isInvestmentOpen}
            onClose={merged.closeInvestment || merged.closeInvestmentModal || closeInvestment}
            onSave={(newInv) => {
              if (handleAddInvestment) handleAddInvestment(newInv);
              closeInvestment();
              if (handleTabChange) handleTabChange('investments');
            }}
          />
        )}
      </AnimatePresence>

      {/* 4. Modal Global para Nuevo Préstamo o Deuda */}
      <AnimatePresence mode="wait">
        {isLoanOpen && (
          <AddLoanModal
            isOpen={isLoanOpen}
            initialType={addLoanInitialType}
            defaultType={addLoanInitialType}
            onClose={merged.closeAddLoan || merged.closeLoan || merged.closeAddDebt || merged.closeDebtModal || closeLoan}
            onSave={(newItem) => {
              if (handleAddDebtOrLoan) handleAddDebtOrLoan(newItem);
              closeLoan();
              if (handleTabChange) handleTabChange('debts');
            }}
          />
        )}
      </AnimatePresence>

      {/* 5. Modal Global para Nuevo Pago Recurrente */}
      <AddRecurringModal
        isOpen={isRecurringOpen}
        onClose={merged.closeAddRecurring || merged.closeRecurring || merged.closeRecurringModal || closeRecurring}
        onSave={(newItem) => {
          if (handleAddRecurring) handleAddRecurring(newItem);
          closeRecurring();
          if (handleTabChange) handleTabChange('recurring');
        }}
        accounts={accounts}
        categories={categories}
        onAddCategory={handleAddCategory}
        onAddSubcategory={handleAddSubcategory}
        trm={trm}
      />

      {/* 6. Modal Selector de Mes / Año de Escritorio */}
      {showMonthPicker && (
        <DesktopMonthPicker
          isOpen={showMonthPicker}
          onClose={() => setShowMonthPicker && setShowMonthPicker(false)}
          selectedDate={selectedDate}
          onChangeMonth={(newDate) => {
            if (setSelectedDate) setSelectedDate(newDate);
          }}
          selectedDay={selectedDay}
          onSelectDay={(day) => setSelectedDay && setSelectedDay(day)}
          onClearSelectedDay={() => setSelectedDay && setSelectedDay(null)}
          transactions={transactions}
        />
      )}

      {/* 7. Modal Centrado para Calendario y Filtro por Día */}
      {isCalendarOpen && (
        <CalendarDropdown
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen && setIsCalendarOpen(false)}
          selectedDate={selectedDate}
          onChangeMonth={setSelectedDate}
          selectedDay={selectedDay}
          onSelectDay={(day) => {
            if (setSelectedDay) setSelectedDay(day);
          }}
          transactions={transactions}
        />
      )}

      {/* 8. Modal Global de Detalle de Tarjeta de Crédito */}
      {selectedCreditCardDetail && (
        <CreditCardDetailModal
          isOpen={Boolean(selectedCreditCardDetail)}
          onClose={() => setSelectedCreditCardDetail && setSelectedCreditCardDetail(null)}
          card={accounts.find(a => a.id === selectedCreditCardDetail?.id) || selectedCreditCardDetail}
          transactions={transactions}
          accounts={accounts}
          onAddTransaction={handleAddTransaction}
          onOpenEdit={() => {
            if (setSelectedCreditCardDetail) setSelectedCreditCardDetail(null);
            if (handleTabChange) handleTabChange('accounts');
          }}
        />
      )}

      {/* 9. Modal para Personalizar / Reordenar Widgets del Dashboard */}
      {isEditWidgetsModalOpen && (
        <EditWidgetsModal
          isOpen={isEditWidgetsModalOpen}
          onClose={() => setIsEditWidgetsModalOpen && setIsEditWidgetsModalOpen(false)}
          widgetsConfig={widgets}
          widgets={widgets}
          onSave={(newWidgets) => {
            if (setWidgets) setWidgets([...newWidgets]);
          }}
          onReset={(defWidgets) => {
            if (setWidgets) setWidgets([...(defWidgets || DEFAULT_WIDGETS_CONFIG)]);
          }}
        />
      )}

      {/* 10. Modal de Mi Perfil y Ajustes */}
      <ProfileModal
        key={`profile-modal-${profileResetKey}`}
        isOpen={Boolean(isSettingsOpen || isProfileOpen)}
        onClose={() => setIsSettingsOpen && setIsSettingsOpen(false)}
        userProfile={userProfile}
        onUpdateProfile={handleUpdateProfile}
        securitySettings={securitySettings}
        onUpdateSecurity={setSecuritySettings}
        subscriptions={subscriptions}
        onAddSubscription={(newSub) => setSubscriptions && setSubscriptions(prev => [newSub, ...prev])}
        onDeleteSubscription={(id) => setSubscriptions && setSubscriptions(prev => prev.filter(s => s.id !== id))}
        accountsCount={accounts.length}
        categoriesCount={categories.length}
        onOpenAccounts={() => {
          if (setFromSettings) setFromSettings(true);
          if (handleTabChange) handleTabChange('accounts', 'settings');
        }}
        onNavigateToRecurring={() => {
          if (setIsSettingsOpen) setIsSettingsOpen(false);
          if (setFromSettings) setFromSettings(true);
          if (handleTabChange) handleTabChange('recurring', 'settings');
        }}
        onOpenTutorial={() => {
          if (setIsSettingsOpen) setIsSettingsOpen(false);
          if (setShowTutorial) setShowTutorial(true);
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
        onManualCloudSync={merged.pushLocalToCloud}
        syncStatus={merged.syncStatus}
        user={user}
        onLogout={onLogout}
      />

      {/* 11. Modal / Overlay del Tutorial rápido */}
      {showTutorial && (
        <OnboardingFlow
          tutorialOnly={true}
          onClose={() => setShowTutorial && setShowTutorial(false)}
        />
      )}

      {/* 12. Pantalla de Bloqueo de Seguridad (Lock Screen) */}
      {isLocked && Boolean(securitySettings?.pinEnabled) && Boolean(securitySettings?.pin && String(securitySettings.pin).trim().length >= 4) && (
        <LockScreen
          userProfile={userProfile}
          expectedPin={securitySettings?.pin || ''}
          biometricsEnabled={Boolean(securitySettings?.biometricsEnabled)}
          onUnlock={handleUnlock}
          failedAttempts={failedAttempts}
        />
      )}
    </>
  );
}
