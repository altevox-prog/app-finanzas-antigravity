import React from 'react';
import AddTransactionModal from './AddTransactionModal';
import TransferModal from './TransferModal';
import AddLoanModal from './AddLoanModal';
import AddRecurringModal from './AddRecurringModal';
import EditWidgetsModal from './EditWidgetsModal';
import ProfileModal from './ProfileModal';
import AddInvestmentModal from '../AddInvestmentModal';
import DesktopMonthPicker from '../DesktopMonthPicker';
import CalendarDropdown from '../CalendarDropdown';
import CreditCardDetailModal from '../CreditCardDetailModal';
import OnboardingFlow from '../OnboardingFlow';
import LockScreen from '../LockScreen';
import { DEFAULT_WIDGETS_CONFIG } from '../../utils/widgetsConfig';

/**
 * ModalContainer
 * Orquestador centralizado de todos los modales, overlays y diálogos emergentes de la aplicación.
 */
export default function ModalContainer({
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
  handleResetData
}) {
  return (
    <>
      {/* 1. Modal Global para Nuevo Movimiento (AddTransactionModal) */}
      {isAddTxOpen && (
        <AddTransactionModal
          isOpen={isAddTxOpen}
          onClose={() => setIsAddTxOpen && setIsAddTxOpen(false)}
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

      {/* 2. Modal Global para Transferencia entre Cuentas */}
      {isTransferModalOpen && (
        <TransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen && setIsTransferModalOpen(false)}
          accounts={accounts}
          transactions={transactions}
          onTransfer={async (transferData) => {
            if (handleExecuteTransfer) await handleExecuteTransfer(transferData);
            if (setIsTransferModalOpen) setIsTransferModalOpen(false);
          }}
          trm={trm}
        />
      )}

      {/* 3. Modal Global para Nueva Inversión */}
      {(isAddInvestmentOpen || isNewInvestmentModalOpen) && (
        <AddInvestmentModal
          isOpen={isAddInvestmentOpen || isNewInvestmentModalOpen}
          onClose={() => {
            if (setIsAddInvestmentOpen) setIsAddInvestmentOpen(false);
            if (setIsNewInvestmentModalOpen) setIsNewInvestmentModalOpen(false);
          }}
          onSave={(newInv) => {
            if (handleAddInvestment) handleAddInvestment(newInv);
            if (setIsAddInvestmentOpen) setIsAddInvestmentOpen(false);
            if (setIsNewInvestmentModalOpen) setIsNewInvestmentModalOpen(false);
            if (handleTabChange) handleTabChange('investments');
          }}
        />
      )}

      {/* 4. Modal Global para Nuevo Préstamo o Deuda */}
      {isAddLoanOpen && (
        <AddLoanModal
          isOpen={isAddLoanOpen}
          initialType={addLoanInitialType}
          defaultType={addLoanInitialType}
          onClose={() => setIsAddLoanOpen && setIsAddLoanOpen(false)}
          onSave={(newItem) => {
            if (handleAddDebtOrLoan) handleAddDebtOrLoan(newItem);
            if (setIsAddLoanOpen) setIsAddLoanOpen(false);
            if (handleTabChange) handleTabChange('debts');
          }}
        />
      )}

      {/* 5. Modal Global para Nuevo Pago Recurrente */}
      {isAddRecurringOpen && (
        <AddRecurringModal
          isOpen={isAddRecurringOpen}
          onClose={() => setIsAddRecurringOpen && setIsAddRecurringOpen(false)}
          onSave={(newItem) => {
            if (handleAddRecurring) handleAddRecurring(newItem);
            if (setIsAddRecurringOpen) setIsAddRecurringOpen(false);
            if (handleTabChange) handleTabChange('recurring');
          }}
          accounts={accounts}
          categories={categories}
          onAddCategory={handleAddCategory}
          onAddSubcategory={handleAddSubcategory}
          trm={trm}
        />
      )}

      {/* 6. Modal Selector de Mes / Año de Escritorio */}
      {showMonthPicker && (
        <DesktopMonthPicker
          isOpen={showMonthPicker}
          onClose={() => setShowMonthPicker && setShowMonthPicker(false)}
          selectedDate={selectedDate}
          onChangeMonth={(newDate) => {
            if (setSelectedDate) setSelectedDate(newDate);
            if (setSelectedDay) setSelectedDay(null);
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
        user={user}
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
