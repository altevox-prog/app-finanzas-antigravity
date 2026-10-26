import React, { useMemo } from 'react';
import { 
  Landmark, HandCoins, TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, 
  PiggyBank, Activity, CreditCard, Receipt, PieChart, CalendarSync, Target 
} from 'lucide-react';
import { normalizeWidgetId } from '../../utils/widgetsConfig';
import InvestmentsWidget from './widgets/InvestmentsWidget';
import DebtsWidget from './widgets/DebtsWidget';
import RecurringPaymentsWidget from './widgets/RecurringPaymentsWidget';
import SavingsGoalsWidget from './widgets/SavingsGoalsWidget';
import WeeklyExpensesChart from './WeeklyExpensesChart';
import ReportsAndCharts from '../reports/ReportsAndCharts';
import BudgetWidget from './widgets/BudgetWidget';
import ExpensesAndMovementsWidget from './widgets/ExpensesAndMovementsWidget';
import DebtsAndBudgetWidget from './widgets/DebtsAndBudgetWidget';

export const WIDGET_ICON_MAP = {
  Landmark, TrendingUp, HandCoins, Wallet, ArrowDownRight, ArrowUpRight,
  PiggyBank, Activity, PieChart, CreditCard, Receipt, CalendarSync, Target
};

/**
 * createWidgetRegistry: Factory que crea el mapa de widgets disponibles para Dashboard
 */
export function createWidgetRegistry({
  debtsAndLoansMetrics = {},
  investmentsMetrics = {},
  totalIncome,
  totalExpense,
  savingsRate,
  freeCash,
  netBalance,
  displayTransactions = [],
  transactions = [],
  monthlyStats = {},
  selectedDate,
  selectedDay,
  currentMonthLabel,
  categories = [],
  recurringPayments = [],
  subscriptions = [],
  savingsGoals = [],
  navigateToTab = () => {},
  setActiveTab = null,
  handleSelectTransaction = () => {},
  onOpenCalendar = () => {},
  financeActions = {},
  formatMoney = (val) => val,
  budgets = {},
  onOpenProfile,
  modalControls,
  onOpenSavingsGoals
} = {}) {
  const resolvedSetActiveTab = setActiveTab || navigateToTab || (() => {});

  const handleOpenSavingsGoalsView = () => {
    if (onOpenSavingsGoals) {
      onOpenSavingsGoals();
    } else if (modalControls?.openProfileModal) {
      modalControls.openProfileModal('savings_goals');
    } else if (modalControls?.handleOpenProfile) {
      modalControls.handleOpenProfile('savings_goals');
    } else if (onOpenProfile) {
      onOpenProfile('savings_goals');
    } else if (navigateToTab) {
      navigateToTab('profile', { subview: 'savings_goals' });
    }
  };

  const savingsGoalsComp = (
    <SavingsGoalsWidget
      savingsGoals={savingsGoals}
      formatMoney={formatMoney}
      onOpenSavingsGoals={handleOpenSavingsGoalsView}
    />
  );

  const expensesAndMovementsComp = (
    <ExpensesAndMovementsWidget
      transactions={transactions}
      categories={categories}
      selectedDate={selectedDate}
      selectedDay={selectedDay}
      financeActions={financeActions}
      onNavigateToTab={navigateToTab}
      setActiveTab={resolvedSetActiveTab}
      onViewAll={() => navigateToTab('transactions')}
      onNavigateToMovements={() => navigateToTab('transactions')}
      onSelectTransaction={handleSelectTransaction}
      formatMoney={formatMoney}
    />
  );

  const debtsAndBudgetComp = (
    <DebtsAndBudgetWidget
      debtsAndLoansMetrics={debtsAndLoansMetrics}
      monthlyStats={monthlyStats}
      totalIncome={totalIncome}
      totalExpense={totalExpense}
      budgets={budgets}
      onNavigateToTab={navigateToTab}
      setActiveTab={resolvedSetActiveTab}
      formatMoney={formatMoney}
    />
  );

  return {
    investments: <InvestmentsWidget investmentsMetrics={investmentsMetrics} onNavigateToTab={navigateToTab} setActiveTab={resolvedSetActiveTab} formatMoney={formatMoney} />,
    debts: debtsAndBudgetComp,
    debts_loans: debtsAndBudgetComp,
    budget: debtsAndBudgetComp,
    debts_and_budget: debtsAndBudgetComp,
    savings_rate: savingsGoalsComp,
    savings_goals: savingsGoalsComp,
    weekly_cashflow: <WeeklyExpensesChart transactions={transactions} selectedDate={selectedDate} selectedDay={selectedDay} currentMonthLabel={currentMonthLabel} formatMoney={formatMoney} />,
    expenses_category: expensesAndMovementsComp,
    expenses_and_movements: expensesAndMovementsComp,
    recurring_payments: <RecurringPaymentsWidget recurringPayments={recurringPayments} subscriptions={subscriptions} formatMoney={formatMoney} onNavigateToTab={navigateToTab} setActiveTab={resolvedSetActiveTab} />
  };
}

export const getWidgetRegistry = createWidgetRegistry;

/**
 * getWidgetComponent: Resuelve un widget ID desde el registro normalizando la llave
 */
export const getWidgetComponent = (id, registry) => {
  if (!registry || !id) return null;
  const norm = normalizeWidgetId(id);
  return registry[norm] || registry[id] || ((norm === 'debts_loans' || id === 'debts_loans' || norm === 'budget' || id === 'budget' || norm === 'debts' || id === 'debts') ? registry.debts_and_budget : null);
};

/**
 * useWidgetRegistry: Hook memorizado para el registro de widgets en Dashboard
 */
export function useWidgetRegistry(params = {}) {
  return useMemo(() => createWidgetRegistry(params), [
    params.debtsAndLoansMetrics, params.investmentsMetrics, params.totalIncome, params.totalExpense,
    params.savingsRate, params.freeCash, params.displayTransactions, params.transactions,
    params.monthlyStats, params.selectedDate, params.selectedDay, params.currentMonthLabel,
    params.accounts, params.categories, params.recurringPayments, params.subscriptions,
    params.savingsGoals, params.onOpenProfile, params.modalControls, params.onOpenSavingsGoals,
    params.trm, params.weeklyCashFlow, params.hoveredWeekIndex, params.setHoveredWeekIndex,
    params.navigateToTab, params.setActiveTab, params.handleOpenDebtModal, params.handleOpenTxModal,
    params.handleOpenRecurringModal, params.handleSelectTransaction, params.onOpenCalendar,
    params.onSelectDay, params.onSelectCreditCardDetail, params.financeActions, params.formatMoney,
    params.budgets
  ]);
}
