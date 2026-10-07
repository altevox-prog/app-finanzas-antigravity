import React from 'react';
import DashboardView from './DashboardView';
import TransactionsView from './TransactionsView';
import AccountsView from './AccountsView';
import DebtsView from './DebtsView';
import InvestmentsView from './InvestmentsView';
import RecurringView from './RecurringView';
import TaxView from './TaxView';

/**
 * ViewRouter
 * Enrutador y conmutador condicional de las vistas principales de la aplicación según `activeTab`.
 * Mantiene intactas las claves de reinicio (`tabResetKeys`), props analíticas y callbacks de navegación.
 */
export default function ViewRouter({
  activeTab = 'dashboard',
  tabResetKeys = {},
  financeData = {},
  financeActions = {},
  ...rest
}) {
  // Soporte directo para objetos agrupados (financeData, financeActions) y props individuales
  const merged = { ...financeData, ...financeActions, ...rest, activeTab, tabResetKeys };

  const {
    // Datos financieros y analíticos
    accounts = [],
    investments = [],
    debtsAndLoans = [],
    transactions = [],
    monthlyTransactions = [],
    categories = [],
    recurringPayments = [],
    subscriptions = [],
    monthlyStats = {},
    selectedDate = new Date(),
    selectedDay = null,
    setSelectedDay,
    currentMonthLabel = '',
    trm = 4050,
    widgets = [],
    setWidgets,

    // Alertas
    tomorrowDebtAlerts = [],
    handleReviewDebtAlert,
    handleDismissAlert,
    formatMoney,

    // Estados de navegación y modales
    fromSettings = false,
    handleGoBackFromSubView,
    handleTabChange,
    setIsCalendarOpen,
    setIsEditWidgetsModalOpen,
    setIsAddTxOpen,
    handleOpenTransaction,
    setSelectedCreditCardDetail,
    setIsAddRecurringOpen,
    setIsNewRecurringModalOpen,
    handleOpenAddDebt,
    handleOpenAddLoan,
    setAddLoanInitialType,
    setIsAddLoanOpen,

    // Handlers CRUD
    handleAddTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleAddSubcategory,
    handleUpdateSubcategory,
    handleDeleteSubcategory,
    handleAddAccount,
    handleUpdateAccount,
    handleDeleteAccount,
    handleReorderAccounts,
    handleAddDebtOrLoan,
    handleUpdateDebtOrLoan,
    handleAddPayment,
    handleAddDisbursement,
    handleDeletePayment,
    handleDeleteDebtOrLoan,
    handleAddInvestment,
    handleUpdateInvestment,
    handleDeleteInvestment,
    handleAddRecurring,
    handleUpdateRecurring,
    handleDeleteRecurring,
    handleToggleActiveRecurring
  } = merged;
  return (
    <>
      {/* Tab 1: Dashboard Inicio */}
      {activeTab === 'dashboard' && (
        <DashboardView
          key={`dashboard-${tabResetKeys?.dashboard || 0}`}
          alerts={tomorrowDebtAlerts}
          onReviewAlert={handleReviewDebtAlert}
          onDismissAlert={handleDismissAlert}
          formatMoney={formatMoney}
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
          onOpenCalendar={() => setIsCalendarOpen && setIsCalendarOpen(true)}
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
            if (setIsAddRecurringOpen) setIsAddRecurringOpen(true);
            if (setIsNewRecurringModalOpen) setIsNewRecurringModalOpen(true);
          }}
          currentMonthLabel={currentMonthLabel}
          trm={trm}
          widgetsConfig={widgets}
          widgets={widgets}
          onCustomizeWidgets={() => setIsEditWidgetsModalOpen && setIsEditWidgetsModalOpen(true)}
          onSaveWidgets={(newCfg) => setWidgets && setWidgets(newCfg)}
        />
      )}

      {/* Tab 2: Movimientos */}
      {activeTab === 'transactions' && (
        <TransactionsView
          key={`transactions-list-${tabResetKeys?.transactions || 0}`}
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
      )}

      {/* Tab 3: Cuentas y Métodos de Pago */}
      {activeTab === 'accounts' && (
        <AccountsView
          key={`accounts-${tabResetKeys?.accounts || 0}`}
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
        <DebtsView
          key={`debts-${tabResetKeys?.debts || 0}`}
          debtsAndLoans={debtsAndLoans}
          accounts={accounts}
          onAddDebtOrLoan={handleAddDebtOrLoan}
          onUpdateDebtOrLoan={handleUpdateDebtOrLoan}
          onAddPayment={handleAddPayment}
          onAddDisbursement={handleAddDisbursement}
          onDeletePayment={handleDeletePayment}
          onDeleteDebtOrLoan={handleDeleteDebtOrLoan}
          onOpenAddDebt={(type = 'payable') => handleOpenAddDebt && handleOpenAddDebt(type)}
          onOpenAddLoan={(type = 'receivable') => handleOpenAddLoan && handleOpenAddLoan(type)}
          setIsAddLoanOpen={(val) => {
            if (typeof val === 'string') {
              const target = (val === 'payable' || val === 'borrowed' || val === 'debo') ? 'payable' : 'receivable';
              if (setAddLoanInitialType) setAddLoanInitialType(target);
              if (setIsAddLoanOpen) setIsAddLoanOpen(true);
            } else {
              if (setIsAddLoanOpen) setIsAddLoanOpen(Boolean(val));
            }
          }}
        />
      )}

      {/* Tab 5: Inversiones y Patrimonio */}
      {activeTab === 'investments' && (
        <InvestmentsView
          key={`investments-${tabResetKeys?.investments || 0}`}
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
          key={`recurring-${tabResetKeys?.recurring || 0}`}
          recurringPayments={recurringPayments}
          onAddRecurring={handleAddRecurring}
          onUpdateRecurring={handleUpdateRecurring}
          onDeleteRecurring={handleDeleteRecurring}
          onToggleActiveRecurring={handleToggleActiveRecurring}
          onOpenCreateModal={() => setIsAddRecurringOpen && setIsAddRecurringOpen(true)}
          onOpenAddRecurring={() => setIsAddRecurringOpen && setIsAddRecurringOpen(true)}
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
        <TaxView
          transactions={transactions}
          accounts={accounts}
          investments={investments}
          onBack={handleGoBackFromSubView}
          onClose={handleGoBackFromSubView}
          fromSettings={fromSettings}
        />
      )}
    </>
  );
}
