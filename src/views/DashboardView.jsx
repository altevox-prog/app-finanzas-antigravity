import React from 'react';
import DebtAlertBanner from '../components/DebtAlertBanner';
import Dashboard from '../components/Dashboard';

/**
 * DashboardView
 * Vista principal del Dashboard financiero que integra alertas preventivas
 * de deudas y los widgets configurables de balance, presupuesto, métricas y accesos directos.
 */
export default function DashboardView({
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
  onNavigateToTab,
  onOpenTransaction,
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
  onSaveWidgets
}) {
  return (
    <div className="w-full flex flex-col gap-4">
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
        onNavigateToTab={onNavigateToTab}
        onOpenTransaction={onOpenTransaction}
        onAddTransaction={onAddTransaction}
        onAddDebtOrLoan={onAddDebtOrLoan}
        onAddRecurring={onAddRecurring}
        onDeleteTransaction={onDeleteTransaction}
        onUpdateTransaction={onUpdateTransaction}
        onAddCategory={onAddCategory}
        onAddSubcategory={onAddSubcategory}
        onUpdateSubcategory={onUpdateSubcategory}
        onDeleteSubcategory={onDeleteSubcategory}
        onAddAccount={onAddAccount}
        onSelectCreditCardDetail={onSelectCreditCardDetail}
        onOpenAddRecurring={onOpenAddRecurring}
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
