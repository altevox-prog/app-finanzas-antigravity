import React, { useState, useEffect } from 'react';
import DebtAlertBanner from '../components/debts/DebtAlertBanner';
import Dashboard from '../components/dashboard/Dashboard';

/**
 * DashboardView
 * Vista principal del Dashboard financiero que integra alertas preventivas
 * de deudas y los widgets configurables de balance, presupuesto, métricas y accesos directos.
 */
export default function DashboardView(props) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = (e) => {
      const target = e?.target === document || !e?.target ? window : e.target;
      const currentScroll = target.scrollY !== undefined ? target.scrollY : (target.scrollTop || 0);
      setIsScrolled(currentScroll > 15);
    };

    // Escuchar en el contenedor con scroll o en window
    const scrollContainer = document.querySelector('main') || window;
    handleScroll({ target: scrollContainer });
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const {
    modalControls = {},
    onOpenAddDebt = () => {},
    onOpenDebt = () => {},
    onOpenAddLoan = () => {},
    onOpenLoan = () => {},
    alerts = [],
    onReviewAlert,
    onDismissAlert,
    formatMoney,
    accounts = [],
    investments = [],
    debtsAndLoans = [],
    transactions = [],
    monthlyTransactions = [],
    categories = [],
    recurringPayments = [],
    subscriptions = [],
    monthlyStats = {},
    selectedDate,
    selectedDay,
    onSelectDay,
    onOpenCalendar,
    onOpenMonthPicker,
    onNavigateToTab,
    onOpenTransaction,
    onOpenAddTransaction,
    onAddTransaction,
    onAddDebtOrLoan,
    onAddRecurring,
    onDeleteTransaction,
    onUpdateTransaction,
    onAddCategory,
    onAddSubcategory,
    onUpdateSubcategory,
    onDeleteSubcategory,
    onAddAccount,
    onSelectCreditCardDetail,
    onOpenAddRecurring,
    currentMonthLabel,
    trm = 4050,
    widgetsConfig,
    widgets,
    onCustomizeWidgets,
    onSaveWidgets,
    financeData = {},
    financeActions = {},
    ...restProps
  } = props;
  const isForcedMobile = Boolean(props.isForcedMobile || restProps.isForcedMobile || financeData?.isForcedMobile);
  const isForcedDesktop = Boolean(props.isForcedDesktop || restProps.isForcedDesktop || financeData?.isForcedDesktop);
  const userProfile = props.userProfile || restProps.userProfile || financeData?.userProfile;

  return (
    <div className="w-full flex flex-col gap-3.5 sm:gap-4 pb-4 sm:pb-6 lg:pb-12">
      {/* Banner preventivo de recordatorios y alertas para mañana */}
      {alerts && alerts.length > 0 && (
        <DebtAlertBanner
          alerts={alerts}
          onReview={onReviewAlert}
          onDismiss={onDismissAlert}
          formatMoney={formatMoney}
        />
      )}

      {/* Widgets Financieros Modulares y Dinámicos */}
      <Dashboard
        isScrolled={isScrolled}
        isForcedMobile={isForcedMobile}
        isForcedDesktop={isForcedDesktop}
        userProfile={userProfile}
        financeData={financeData}
        financeActions={financeActions}
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
        onSelectDay={onSelectDay}
        onOpenCalendar={onOpenCalendar}
        onOpenMonthPicker={onOpenMonthPicker || props.onOpenMonthPicker || financeActions?.onOpenMonthPicker || onOpenCalendar}
        onNavigateToTab={onNavigateToTab || financeActions?.handleTabChange || financeActions?.setActiveTab}
        onOpenTransaction={onOpenTransaction || onOpenAddTransaction || modalControls?.openAddTransaction || modalControls?.openTransactionModal || financeActions?.openAddTransaction || financeActions?.handleOpenTransaction}
        onOpenAddTransaction={onOpenAddTransaction || onOpenTransaction || modalControls?.openAddTransaction || modalControls?.openTransactionModal || financeActions?.openAddTransaction || financeActions?.handleOpenTransaction}
        onAddTransaction={onAddTransaction}
        onAddDebtOrLoan={onAddDebtOrLoan}
        onOpenAddDebt={onOpenAddDebt || onOpenDebt || modalControls?.openAddDebt || modalControls?.openAddLoan || financeActions?.openAddDebt || financeActions?.handleOpenAddDebt}
        onOpenAddLoan={onOpenAddLoan || onOpenLoan || modalControls?.openAddLoan || modalControls?.openAddDebt || financeActions?.openAddLoan || financeActions?.handleOpenAddLoan}
        onAddRecurring={onAddRecurring}
        onDeleteTransaction={onDeleteTransaction}
        onUpdateTransaction={onUpdateTransaction}
        onAddCategory={onAddCategory}
        onAddSubcategory={onAddSubcategory}
        onUpdateSubcategory={onUpdateSubcategory}
        onDeleteSubcategory={onDeleteSubcategory}
        onAddAccount={onAddAccount}
        onSelectCreditCardDetail={onSelectCreditCardDetail}
        onOpenAddRecurring={onOpenAddRecurring || financeActions?.handleOpenAddRecurring || financeActions?.handleOpenRecurring}
        currentMonthLabel={currentMonthLabel}
        trm={trm}
        widgetsConfig={widgetsConfig || widgets}
        widgets={widgets || widgetsConfig}
        onCustomizeWidgets={onCustomizeWidgets}
        onSaveWidgets={onSaveWidgets}
      />
    </div>
  );
}
