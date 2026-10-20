import React from 'react';
import DashboardView from './DashboardView';
import TransactionsView from './TransactionsView';
import AccountsView from './AccountsView';
import DebtsView from './DebtsView';
import InvestmentsView from './InvestmentsView';
import RecurringView from './RecurringView';
import TaxView from './TaxView';
import NetWorthView from './NetWorthView';

/**
 * ViewRouter: Enrutador y conmutador de las vistas principales de la aplicación según `activeTab`.
 */
export default function ViewRouter({
  activeTab = 'dashboard',
  tabResetKeys = {},
  financeData = {},
  financeActions = {},
  ...rest
}) {
  const merged = { ...financeData, ...financeActions, ...rest, activeTab, tabResetKeys };

  const {
    accounts = [], investments = [], debtsAndLoans = [], transactions = [], monthlyTransactions = [],
    categories = [], recurringPayments = [], subscriptions = [], monthlyStats = {},
    selectedDate = new Date(), selectedDay = null, setSelectedDay, currentMonthLabel = '', trm = 4050,
    widgets = [], setWidgets, tomorrowDebtAlerts = [], handleReviewDebtAlert, handleDismissAlert,
    formatMoney, fromSettings = false, handleGoBackFromSubView, handleTabChange, setIsCalendarOpen,
    setIsEditWidgetsModalOpen, setIsAddTxOpen, handleOpenTransaction, setSelectedCreditCardDetail,
    setIsAddRecurringOpen, handleOpenAddDebt, handleOpenAddLoan, setAddLoanInitialType, setIsAddLoanOpen,
    handleAddTransaction, handleUpdateTransaction, handleDeleteTransaction, handleAddCategory,
    handleUpdateCategory, handleDeleteCategory, handleAddSubcategory, handleUpdateSubcategory,
    handleDeleteSubcategory, handleAddAccount, handleUpdateAccount, handleDeleteAccount,
    handleReorderAccounts, handleAddDebtOrLoan, handleUpdateDebtOrLoan, handleAddPayment,
    handleAddDisbursement, handleDeletePayment, handleDeleteDebtOrLoan, handleAddInvestment,
    handleUpdateInvestment, handleDeleteInvestment, handleAddRecurring, handleUpdateRecurring,
    handleDeleteRecurring, handleToggleActiveRecurring
  } = merged;

  const handleBack = () => {
    if (typeof handleGoBackFromSubView === 'function') handleGoBackFromSubView();
    else if (typeof handleTabChange === 'function') handleTabChange('dashboard');
    else if (typeof window !== 'undefined' && window.history.length > 2) window.history.back();
  };

  const openTx = merged.openAddTransaction || merged.openTransactionModal || merged.handleOpenTransaction || handleOpenTransaction;
  const openDebt = merged.openAddDebt || merged.openDebtModal || merged.handleOpenAddDebt || handleOpenAddDebt;
  const openLoan = merged.openAddLoan || merged.openLoanModal || merged.handleOpenAddLoan || handleOpenAddLoan;
  const openRecurring = merged.openAddRecurring || merged.handleOpenRecurring || handleOpenRecurring;
  const openMonthPicker = merged.setShowMonthPicker ? () => merged.setShowMonthPicker(true) : (() => setIsCalendarOpen?.(true));

  const tab = String(activeTab).toLowerCase();

  if (tab === 'dashboard' || tab === 'inicio') {
    return (
      <DashboardView
        key={`dashboard-${tabResetKeys?.dashboard || tabResetKeys?.inicio || 0}`}
        financeData={financeData} financeActions={financeActions} userProfile={merged.userProfile || financeData?.userProfile}
        isForcedDesktop={merged.isForcedDesktop} alerts={tomorrowDebtAlerts} onReviewAlert={handleReviewDebtAlert}
        onDismissAlert={handleDismissAlert} formatMoney={formatMoney} accounts={accounts} investments={investments}
        debtsAndLoans={debtsAndLoans} transactions={transactions} monthlyTransactions={monthlyTransactions}
        categories={categories} recurringPayments={recurringPayments} subscriptions={subscriptions} monthlyStats={monthlyStats}
        selectedDate={selectedDate} selectedDay={selectedDay} onSelectDay={setSelectedDay}
        onOpenCalendar={() => setIsCalendarOpen?.(true)} onOpenMonthPicker={openMonthPicker} onNavigateToTab={handleTabChange}
        onOpenTransaction={openTx} onOpenAddTransaction={openTx} onOpenAddDebt={openDebt} onOpenAddLoan={openLoan}
        onAddTransaction={handleAddTransaction} onAddDebtOrLoan={handleAddDebtOrLoan} onAddRecurring={handleAddRecurring}
        onDeleteTransaction={handleDeleteTransaction} onUpdateTransaction={handleUpdateTransaction} onAddCategory={handleAddCategory}
        onAddSubcategory={handleAddSubcategory} onUpdateSubcategory={handleUpdateSubcategory} onDeleteSubcategory={handleDeleteSubcategory}
        onAddAccount={handleAddAccount} onSelectCreditCardDetail={setSelectedCreditCardDetail} onOpenAddRecurring={openRecurring}
        currentMonthLabel={currentMonthLabel} trm={trm} widgetsConfig={widgets} widgets={widgets}
        onCustomizeWidgets={() => setIsEditWidgetsModalOpen?.(true)}
        onSaveWidgets={(newCfg) => setWidgets && queueMicrotask(() => setWidgets(newCfg))}
        livePrices={merged.livePrices || financeData?.livePrices}
      />
    );
  }

  if (tab === 'transactions' || tab === 'movements' || tab === 'movimientos') {
    return (
      <TransactionsView
        key={`transactions-list-${tabResetKeys?.transactions || 0}`}
        onBack={handleBack}
        transactions={monthlyTransactions && monthlyTransactions.length > 0 ? monthlyTransactions : transactions}
        onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction}
        onUpdateTransaction={handleUpdateTransaction} onAddCategory={handleAddCategory}
        onAddSubcategory={handleAddSubcategory} onUpdateSubcategory={handleUpdateSubcategory}
        onDeleteSubcategory={handleDeleteSubcategory} onAddAccount={handleAddAccount}
        categories={categories} accounts={accounts} currentMonthLabel={currentMonthLabel}
        selectedDate={selectedDate} selectedDay={selectedDay} onSelectDay={setSelectedDay} monthlyStats={monthlyStats}
        onOpenMonthPicker={openMonthPicker} onOpenCalendar={() => setIsCalendarOpen?.(true)}
        modalControls={merged.modalControls || merged} onOpenTransaction={openTx} onOpenAddTransaction={openTx}
        setIsAddTransactionOpen={merged.setIsAddTransactionOpen || merged.setIsAddTxOpen || setIsAddTxOpen}
        trm={trm}
      />
    );
  }

  if (tab === 'accounts') {
    return (
      <AccountsView
        key={`accounts-${tabResetKeys?.accounts || 0}`}
        accounts={accounts} transactions={transactions} onAddAccount={handleAddAccount}
        onUpdateAccount={handleUpdateAccount} onDeleteAccount={handleDeleteAccount}
        onReorderAccounts={handleReorderAccounts} onAddTransaction={handleAddTransaction}
        onOpenCreditCardDetail={setSelectedCreditCardDetail} trm={trm} onBack={handleBack} fromSettings={fromSettings}
      />
    );
  }

  if (tab === 'debts' || tab === 'loans') {
    return (
      <DebtsView
        key={`debts-${tabResetKeys?.debts || 0}-${merged.debtsInitialTab || activeTab}`}
        initialTab={merged.debtsInitialTab || (tab === 'loans' ? 'receivable' : 'payable')}
        onBack={handleBack} debtsAndLoans={debtsAndLoans} accounts={accounts}
        onAddDebtOrLoan={handleAddDebtOrLoan} onUpdateDebtOrLoan={handleUpdateDebtOrLoan}
        onAddPayment={handleAddPayment} onAddDisbursement={handleAddDisbursement}
        onDeletePayment={handleDeletePayment} onDeleteDebtOrLoan={handleDeleteDebtOrLoan}
        modalControls={merged.modalControls || merged}
        onOpenAddDebt={(type = 'payable') => openDebt?.(type)}
        onOpenAddLoan={(type = 'receivable') => openLoan?.(type)}
        setIsAddLoanOpen={(val) => {
          if (typeof val === 'string') {
            const target = ['payable', 'borrowed', 'debo'].includes(val) ? 'payable' : 'receivable';
            merged.setLoanType?.(target) ?? setAddLoanInitialType?.(target);
            merged.openAddLoan?.(target) ?? setIsAddLoanOpen?.(true);
          } else {
            (merged.setIsAddLoanOpen || setIsAddLoanOpen)?.(Boolean(val));
          }
        }}
      />
    );
  }

  if (tab === 'investments') {
    return (
      <InvestmentsView
        key={`investments-${tabResetKeys?.investments || 0}`}
        onBack={handleBack} investments={investments} accounts={accounts}
        onAddInvestment={handleAddInvestment} onUpdateInvestment={handleUpdateInvestment}
        onDeleteInvestment={handleDeleteInvestment} onAddTransaction={handleAddTransaction}
        trm={trm} livePrices={merged.livePrices || financeData?.livePrices}
        handleRefreshQuotes={merged.handleRefreshQuotes || financeActions?.handleRefreshQuotes}
        isRefreshing={merged.isRefreshingQuotes !== undefined ? merged.isRefreshingQuotes : financeData?.isRefreshingQuotes}
      />
    );
  }

  if (tab === 'recurring') {
    return (
      <RecurringView
        key={`recurring-${tabResetKeys?.recurring || 0}`}
        recurringPayments={recurringPayments} onAddRecurring={handleAddRecurring}
        onUpdateRecurring={handleUpdateRecurring} onDeleteRecurring={handleDeleteRecurring}
        onToggleActiveRecurring={handleToggleActiveRecurring}
        onOpenCreateModal={() => setIsAddRecurringOpen?.(true)} onOpenAddRecurring={() => setIsAddRecurringOpen?.(true)}
        setIsAddRecurringOpen={setIsAddRecurringOpen} onBack={handleBack} fromSettings={fromSettings}
        accounts={accounts} categories={categories} onAddCategory={handleAddCategory}
        onAddSubcategory={handleAddSubcategory} trm={trm} onAddTransaction={handleAddTransaction}
      />
    );
  }

  if (['tax', 'taxes', 'impuestos'].includes(tab)) {
    return <TaxView transactions={transactions} accounts={accounts} investments={investments} onBack={handleBack} onClose={handleBack} fromSettings={fromSettings} />;
  }

  if (['net_worth', 'networth', 'patrimonio'].includes(tab)) {
    return (
      <NetWorthView
        key={`networth-${tabResetKeys?.net_worth || 0}`}
        accounts={accounts} transactions={transactions} investments={investments} debtsAndLoans={debtsAndLoans}
        trm={trm} onBack={handleBack} fromSettings={fromSettings}
        onNavigate={(targetTab, source) => handleTabChange?.(targetTab, source || 'net_worth')}
      />
    );
  }

  return null;
}
