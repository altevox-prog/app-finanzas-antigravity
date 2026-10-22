import React, { useMemo } from 'react';
import { 
  Landmark, HandCoins, TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, 
  PiggyBank, Activity, CreditCard, Receipt, PieChart, CalendarSync, Target 
} from 'lucide-react';
import { normalizeWidgetId } from '../../utils/widgetsConfig';
import InvestmentsWidget from './widgets/InvestmentsWidget';
import DebtsWidget from './widgets/DebtsWidget';
import RecurringPaymentsWidget from './widgets/RecurringPaymentsWidget';
import { SavingsRateWidget } from './BalanceCardsWidget';
import WeeklyExpensesChart from './WeeklyExpensesChart';
import RecentMovementsSection from './RecentMovementsSection';
import ReportsAndCharts from '../reports/ReportsAndCharts';
import BudgetWidget from './widgets/BudgetWidget';

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
  navigateToTab = () => {},
  handleSelectTransaction = () => {},
  onOpenCalendar = () => {},
  financeActions = {},
  formatMoney = (val) => val,
  budgets = {}
} = {}) {
  return {
    investments: <InvestmentsWidget investmentsMetrics={investmentsMetrics} onNavigateToTab={navigateToTab} setActiveTab={navigateToTab} formatMoney={formatMoney} />,
    debts: <DebtsWidget debtsAndLoansMetrics={debtsAndLoansMetrics} onNavigateToTab={navigateToTab} setActiveTab={navigateToTab} formatMoney={formatMoney} />,
    savings_rate: <SavingsRateWidget savingsRate={savingsRate} freeCash={freeCash !== undefined ? freeCash : Math.max(0, netBalance || 0)} formatMoney={formatMoney} />,
    budget: <BudgetWidget budgets={budgets} monthlyStats={monthlyStats} totalIncome={totalIncome} totalExpense={totalExpense} formatMoney={formatMoney} />,
    weekly_cashflow: <WeeklyExpensesChart transactions={transactions} selectedDate={selectedDate} selectedDay={selectedDay} currentMonthLabel={currentMonthLabel} formatMoney={formatMoney} />,
    expenses_category: <ReportsAndCharts transactions={transactions} categories={categories} selectedDate={selectedDate} selectedDay={selectedDay} onOpenCalendar={onOpenCalendar} financeActions={financeActions} onNavigateToTab={navigateToTab} setActiveTab={navigateToTab} />,
    recent_movements: <RecentMovementsSection transactions={displayTransactions} onViewAll={() => navigateToTab('transactions')} setActiveTab={navigateToTab} onNavigateToTab={navigateToTab} onSelectTransaction={handleSelectTransaction} onOpenTransaction={handleSelectTransaction} formatMoney={formatMoney} />,
    recurring_payments: <RecurringPaymentsWidget recurringPayments={recurringPayments} subscriptions={subscriptions} formatMoney={formatMoney} onNavigateToTab={navigateToTab} setActiveTab={navigateToTab} />
  };
}

export const getWidgetRegistry = createWidgetRegistry;

/**
 * getWidgetComponent: Resuelve un widget ID desde el registro normalizando la llave
 */
export const getWidgetComponent = (id, registry) => {
  if (!registry || !id) return null;
  const norm = normalizeWidgetId(id);
  return registry[norm] || registry[id] || ((norm === 'debts_loans' || id === 'debts_loans') ? registry.debts : null);
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
    params.trm, params.weeklyCashFlow, params.hoveredWeekIndex, params.setHoveredWeekIndex,
    params.navigateToTab, params.handleOpenDebtModal, params.handleOpenTxModal,
    params.handleOpenRecurringModal, params.handleSelectTransaction, params.onOpenCalendar,
    params.onSelectDay, params.onSelectCreditCardDetail, params.financeActions, params.formatMoney,
    params.budgets
  ]);
}
