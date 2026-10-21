import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const DashboardView = lazy(() => import('./DashboardView'));
const TransactionsView = lazy(() => import('./TransactionsView'));
const AccountsView = lazy(() => import('./AccountsView'));
const DebtsView = lazy(() => import('./DebtsView'));
const InvestmentsView = lazy(() => import('./InvestmentsView'));
const RecurringView = lazy(() => import('./RecurringView'));
const TaxView = lazy(() => import('./TaxView'));
const NetWorthView = lazy(() => import('./NetWorthView'));
const InvoicingView = lazy(() => import('../components/invoicing/InvoicingView'));

const TAB_ALIAS = {
  inicio: 'dashboard', movements: 'transactions', movimientos: 'transactions',
  loans: 'debts', taxes: 'tax', impuestos: 'tax', networth: 'net_worth', patrimonio: 'net_worth',
  facturacion: 'invoicing', facturas: 'invoicing', invoice: 'invoicing'
};

export default function ViewRouter({
  activeTab = 'dashboard', tabResetKeys = {}, financeData = {}, financeActions = {}, ...rest
}) {
  const merged = { ...financeData, ...financeActions, ...rest, activeTab, tabResetKeys };
  const {
    accounts = [], investments = [], debtsAndLoans = [], transactions = [], monthlyTransactions = [], categories = [], recurringPayments = [], subscriptions = [], monthlyStats = {},
    selectedDate = new Date(), selectedDay = null, setSelectedDay, currentMonthLabel = '', trm = 4050, widgets = [], setWidgets, tomorrowDebtAlerts = [], handleReviewDebtAlert, handleDismissAlert,
    formatMoney, fromSettings = false, handleGoBackFromSubView, handleTabChange, setIsCalendarOpen, setIsEditWidgetsModalOpen, setIsAddTxOpen, handleOpenTransaction, setSelectedCreditCardDetail,
    setIsAddRecurringOpen, handleOpenAddDebt, handleOpenAddLoan, setAddLoanInitialType, setIsAddLoanOpen, handleAddTransaction, handleUpdateTransaction, handleDeleteTransaction, handleAddCategory,
    handleUpdateCategory, handleDeleteCategory, handleAddSubcategory, handleUpdateSubcategory, handleDeleteSubcategory, handleAddAccount, handleUpdateAccount, handleDeleteAccount,
    handleReorderAccounts, handleAddDebtOrLoan, handleUpdateDebtOrLoan, handleAddPayment, handleAddDisbursement, handleDeletePayment, handleDeleteDebtOrLoan, handleAddInvestment,
    handleUpdateInvestment, handleDeleteInvestment, handleAddRecurring, handleUpdateRecurring, handleDeleteRecurring, handleToggleActiveRecurring
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
  const tab = TAB_ALIAS[String(activeTab).toLowerCase()] || String(activeTab).toLowerCase();

  const renderActiveView = () => {
    switch (tab) {
      case 'dashboard':
        return (
          <DashboardView
            key={`dashboard-${tabResetKeys?.dashboard || tabResetKeys?.inicio || 0}`}
            financeData={financeData} financeActions={financeActions} userProfile={merged.userProfile || financeData?.userProfile}
            isForcedDesktop={merged.isForcedDesktop} alerts={tomorrowDebtAlerts} onReviewAlert={handleReviewDebtAlert} onDismissAlert={handleDismissAlert} formatMoney={formatMoney} accounts={accounts} investments={investments}
            debtsAndLoans={debtsAndLoans} transactions={transactions} monthlyTransactions={monthlyTransactions} categories={categories} recurringPayments={recurringPayments} subscriptions={subscriptions} monthlyStats={monthlyStats}
            selectedDate={selectedDate} selectedDay={selectedDay} onSelectDay={setSelectedDay} onOpenCalendar={() => setIsCalendarOpen?.(true)} onOpenMonthPicker={openMonthPicker} onNavigateToTab={handleTabChange}
            onOpenTransaction={openTx} onOpenAddTransaction={openTx} onOpenAddDebt={openDebt} onOpenAddLoan={openLoan} onAddTransaction={handleAddTransaction} onAddDebtOrLoan={handleAddDebtOrLoan} onAddRecurring={handleAddRecurring}
            onDeleteTransaction={handleDeleteTransaction} onUpdateTransaction={handleUpdateTransaction} onAddCategory={handleAddCategory} onAddSubcategory={handleAddSubcategory} onUpdateSubcategory={handleUpdateSubcategory} onDeleteSubcategory={handleDeleteSubcategory}
            onAddAccount={handleAddAccount} onSelectCreditCardDetail={setSelectedCreditCardDetail} onOpenAddRecurring={openRecurring} currentMonthLabel={currentMonthLabel} trm={trm} widgetsConfig={widgets} widgets={widgets}
            onCustomizeWidgets={() => setIsEditWidgetsModalOpen?.(true)} onSaveWidgets={(newCfg) => setWidgets && queueMicrotask(() => setWidgets(newCfg))} livePrices={merged.livePrices || financeData?.livePrices}
          />
        );
      case 'transactions':
        return (
          <TransactionsView
            key={`transactions-list-${tabResetKeys?.transactions || 0}`} onBack={handleBack}
            transactions={monthlyTransactions && monthlyTransactions.length > 0 ? monthlyTransactions : transactions}
            onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onUpdateTransaction={handleUpdateTransaction} onAddCategory={handleAddCategory}
            onAddSubcategory={handleAddSubcategory} onUpdateSubcategory={handleUpdateSubcategory} onDeleteSubcategory={handleDeleteSubcategory} onAddAccount={handleAddAccount}
            categories={categories} accounts={accounts} currentMonthLabel={currentMonthLabel} selectedDate={selectedDate} selectedDay={selectedDay} onSelectDay={setSelectedDay} monthlyStats={monthlyStats}
            onOpenMonthPicker={openMonthPicker} onOpenCalendar={() => setIsCalendarOpen?.(true)} modalControls={merged.modalControls || merged} onOpenTransaction={openTx} onOpenAddTransaction={openTx}
            setIsAddTransactionOpen={merged.setIsAddTransactionOpen || merged.setIsAddTxOpen || setIsAddTxOpen} trm={trm}
          />
        );
      case 'accounts':
        return (
          <AccountsView
            key={`accounts-${tabResetKeys?.accounts || 0}`} accounts={accounts} transactions={transactions}
            onAddAccount={handleAddAccount} onUpdateAccount={handleUpdateAccount} onDeleteAccount={handleDeleteAccount}
            onReorderAccounts={handleReorderAccounts} onAddTransaction={handleAddTransaction}
            onOpenCreditCardDetail={setSelectedCreditCardDetail} trm={trm} onBack={handleBack} fromSettings={fromSettings}
          />
        );
      case 'debts':
        return (
          <DebtsView
            key={`debts-${tabResetKeys?.debts || 0}-${merged.debtsInitialTab || activeTab}`}
            initialTab={merged.debtsInitialTab || (String(activeTab).toLowerCase() === 'loans' ? 'receivable' : 'payable')}
            onBack={handleBack} debtsAndLoans={debtsAndLoans} accounts={accounts} onAddDebtOrLoan={handleAddDebtOrLoan} onUpdateDebtOrLoan={handleUpdateDebtOrLoan}
            onAddPayment={handleAddPayment} onAddDisbursement={handleAddDisbursement} onDeletePayment={handleDeletePayment} onDeleteDebtOrLoan={handleDeleteDebtOrLoan}
            modalControls={merged.modalControls || merged} onOpenAddDebt={(t = 'payable') => openDebt?.(t)} onOpenAddLoan={(t = 'receivable') => openLoan?.(t)}
            setIsAddLoanOpen={(val) => {
              if (typeof val !== 'string') return (merged.setIsAddLoanOpen || setIsAddLoanOpen)?.(Boolean(val));
              const t = ['payable', 'borrowed', 'debo'].includes(val) ? 'payable' : 'receivable';
              merged.setLoanType?.(t) ?? setAddLoanInitialType?.(t);
              merged.openAddLoan?.(t) ?? setIsAddLoanOpen?.(true);
            }}
          />
        );
      case 'investments':
        return (
          <InvestmentsView
            key={`investments-${tabResetKeys?.investments || 0}`} onBack={handleBack} investments={investments} accounts={accounts}
            onAddInvestment={handleAddInvestment} onUpdateInvestment={handleUpdateInvestment} onDeleteInvestment={handleDeleteInvestment} onAddTransaction={handleAddTransaction} trm={trm}
            livePrices={merged.livePrices || financeData?.livePrices} handleRefreshQuotes={merged.handleRefreshQuotes || financeActions?.handleRefreshQuotes}
            isRefreshing={merged.isRefreshingQuotes !== undefined ? merged.isRefreshingQuotes : financeData?.isRefreshingQuotes}
          />
        );
      case 'recurring':
        return (
          <RecurringView
            key={`recurring-${tabResetKeys?.recurring || 0}`} recurringPayments={recurringPayments} onAddRecurring={handleAddRecurring} onUpdateRecurring={handleUpdateRecurring}
            onDeleteRecurring={handleDeleteRecurring} onToggleActiveRecurring={handleToggleActiveRecurring} onOpenCreateModal={() => setIsAddRecurringOpen?.(true)}
            onOpenAddRecurring={() => setIsAddRecurringOpen?.(true)} setIsAddRecurringOpen={setIsAddRecurringOpen} onBack={handleBack} fromSettings={fromSettings}
            accounts={accounts} categories={categories} onAddCategory={handleAddCategory} onAddSubcategory={handleAddSubcategory} trm={trm} onAddTransaction={handleAddTransaction}
          />
        );
      case 'tax':
        return <TaxView transactions={transactions} accounts={accounts} investments={investments} onBack={handleBack} onClose={handleBack} fromSettings={fromSettings} />;
      case 'invoicing':
        return (
          <InvoicingView
            onBack={handleBack}
            accounts={accounts}
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        );
      case 'net_worth':
        return (
          <NetWorthView
            key={`networth-${tabResetKeys?.net_worth || 0}`} accounts={accounts} transactions={transactions}
            investments={investments} debtsAndLoans={debtsAndLoans} trm={trm} onBack={handleBack} fromSettings={fromSettings}
            onNavigate={(targetTab, source) => handleTabChange?.(targetTab, source || 'net_worth')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center min-h-[40vh] p-8"><Loader2 className="w-8 h-8 animate-spin text-emerald-500/60" /></div>}>
      {renderActiveView()}
    </Suspense>
  );
}
