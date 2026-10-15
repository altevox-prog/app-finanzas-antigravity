import React, { useMemo } from 'react';
import { 
  Landmark, 
  HandCoins, 
  TrendingUp, 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight, 
  PiggyBank, 
  Activity, 
  CreditCard, 
  Receipt, 
  PieChart, 
  CalendarSync 
} from 'lucide-react';
import { normalizeWidgetId } from '../../utils/widgetsConfig';
import NetWorthWidget from './widgets/NetWorthWidget';
import InvestmentsWidget from './widgets/InvestmentsWidget';
import DebtsWidget from './widgets/DebtsWidget';
import AccountsWidget from './widgets/AccountsWidget';
import RecurringPaymentsWidget from './widgets/RecurringPaymentsWidget';
import TRMWidget from './widgets/TRMWidget';
import WeeklyCashflowWidget from './widgets/WeeklyCashflowWidget';
import BalanceCardsWidget, {
  LiquidBalanceWidget,
  MonthlyIncomeWidget,
  MonthlyExpenseWidget,
  SavingsRateWidget
} from './BalanceCardsWidget';
import WeeklyExpensesChart from './WeeklyExpensesChart';
import RecentMovementsSection from './RecentMovementsSection';
import BalanceWidget from './widgets/BalanceWidget';
import BudgetWidget from './widgets/BudgetWidget';
import ReportsAndCharts from '../reports/ReportsAndCharts';
import BentoMetricsGrid from '../common/BentoMetricsGrid';
import MetricCardsGrid from './widgets/MetricCardsGrid';
import TopAccountsWidget from './widgets/TopAccountsWidget';
import RecentTransactionsWidget from './widgets/RecentTransactionsWidget';

export const WIDGET_ICON_MAP = {
  Landmark,
  TrendingUp,
  HandCoins,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Activity,
  PieChart,
  CreditCard,
  Receipt,
  CalendarSync
};

/**
 * createWidgetRegistry / getWidgetRegistry
 * Factory que crea y retorna el mapa centralizado de componentes de widgets disponibles
 * para el Dashboard a partir de los datos, métricas y callbacks provistos.
 */
export function createWidgetRegistry({
  netWorthCOP,
  totalAssetsCOP,
  debtsAndLoansMetrics = {},
  isNetWorthPositive,
  investmentsMetrics = {},
  availableLiquidBalance,
  netBalance,
  totalIncome,
  totalExpense,
  savingsRate,
  freeCash,
  scopedTransactions = [],
  displayTransactions = [],
  transactions = [],
  monthlyStats = {},
  selectedDate,
  selectedDay,
  currentMonthLabel,
  isTransferTx = () => false,
  accounts = [],
  categories = [],
  recurringPayments = [],
  subscriptions = [],
  trm = 4050,
  weeklyCashFlow = [],
  hoveredWeekIndex,
  setHoveredWeekIndex,
  currentPeriod,
  periodOptions,
  handlePeriodChange,
  bentoPeriodLabel,
  navigateToTab = () => {},
  handleOpenDebtModal = () => {},
  handleOpenTxModal = () => {},
  handleOpenRecurringModal = () => {},
  handleSelectTransaction = () => {},
  onOpenCalendar = () => {},
  onSelectDay = () => {},
  onSelectCreditCardDetail = () => {},
  financeActions = {},
  formatMoney = (val) => val
} = {}) {
  return {
    net_worth: (
      <NetWorthWidget
        netWorthCOP={netWorthCOP}
        totalAssetsCOP={totalAssetsCOP}
        totalPayableCOP={debtsAndLoansMetrics.totalPayableCOP}
        isNetWorthPositive={isNetWorthPositive}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
        formatMoney={formatMoney}
      />
    ),

    investments: (
      <InvestmentsWidget
        investmentsMetrics={investmentsMetrics}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
        formatMoney={formatMoney}
      />
    ),

    debts: (
      <DebtsWidget
        debtsAndLoansMetrics={debtsAndLoansMetrics}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
        formatMoney={formatMoney}
      />
    ),

    liquid_balance: (
      <LiquidBalanceWidget
        availableLiquidBalance={availableLiquidBalance}
        netBalance={netBalance}
        formatMoney={formatMoney}
      />
    ),

    monthly_income: (
      <MonthlyIncomeWidget
        totalIncome={totalIncome}
        incomeCount={selectedDay 
          ? scopedTransactions.filter(t => (t?.type === 'income' || t?.type === 'ingreso') && !isTransferTx(t)).length
          : (monthlyStats.incomeCount || 0)
        }
        formatMoney={formatMoney}
      />
    ),

    monthly_expense: (
      <MonthlyExpenseWidget
        totalExpense={totalExpense}
        expenseCount={selectedDay
          ? scopedTransactions.filter(t => (t?.type === 'expense' || t?.type === 'gasto') && !isTransferTx(t)).length
          : (monthlyStats.expenseCount || 0)
        }
        formatMoney={formatMoney}
      />
    ),

    savings_rate: (
      <SavingsRateWidget
        savingsRate={savingsRate}
        freeCash={freeCash}
        formatMoney={formatMoney}
      />
    ),

    weekly_cashflow: (
      <WeeklyExpensesChart
        transactions={transactions}
        selectedDate={selectedDate}
        selectedDay={selectedDay}
        currentMonthLabel={currentMonthLabel}
        formatMoney={formatMoney}
      />
    ),

    weekly_cashflow_classic: (
      <WeeklyCashflowWidget
        weeklyCashFlow={weeklyCashFlow}
        hoveredWeekIndex={hoveredWeekIndex}
        setHoveredWeekIndex={setHoveredWeekIndex}
        formatMoney={formatMoney}
        currentPeriod={currentPeriod}
        setPeriod={handlePeriodChange}
        periodOptions={periodOptions}
      />
    ),

    expenses_category: (
      <ReportsAndCharts
        transactions={transactions}
        categories={categories}
        selectedDate={selectedDate}
        selectedDay={selectedDay}
        onOpenCalendar={onOpenCalendar}
        financeActions={financeActions}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
      />
    ),

    my_accounts: (
      <AccountsWidget
        accounts={accounts}
        transactions={transactions}
        trm={trm}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
        onOpenAccounts={() => navigateToTab('accounts')}
        formatMoney={formatMoney}
      />
    ),

    recent_movements: (
      <RecentMovementsSection
        transactions={displayTransactions}
        onViewAll={() => navigateToTab('transactions')}
        setActiveTab={navigateToTab}
        onNavigateToTab={navigateToTab}
        onSelectTransaction={handleSelectTransaction}
        onOpenTransaction={handleSelectTransaction}
        formatMoney={formatMoney}
      />
    ),

    recurring_payments: (
      <RecurringPaymentsWidget
        recurringPayments={recurringPayments}
        subscriptions={subscriptions}
        formatMoney={formatMoney}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
      />
    ),

    balance_general: (
      <BalanceWidget
        monthlyStats={{
          ...monthlyStats,
          availableLiquidBalance: availableLiquidBalance,
          totalIncome: totalIncome,
          totalExpense: totalExpense,
          netBalance: netBalance
        }}
        selectedDate={selectedDate}
        selectedDay={selectedDay}
        onSelectDay={onSelectDay}
        onOpenCalendar={onOpenCalendar}
        txCount={scopedTransactions.length}
      />
    ),

    budget: <BudgetWidget monthlyStats={monthlyStats} />,

    bento_metrics: (
      <BentoMetricsGrid
        netWorth={netWorthCOP}
        totalAssets={totalAssetsCOP}
        totalPayable={debtsAndLoansMetrics.totalPayableCOP}
        periodLabel={bentoPeriodLabel}
        monthlyIncome={totalIncome}
        monthlyExpenses={totalExpense}
        savingsRate={savingsRate}
        formatMoney={formatMoney}
        onHeroClick={() => navigateToTab('accounts')}
        onIncomeClick={() => navigateToTab('transactions')}
        onExpenseClick={() => navigateToTab('transactions')}
      />
    ),

    balance_cards: (
      <BalanceCardsWidget
        availableLiquidBalance={availableLiquidBalance}
        netBalance={netBalance}
        totalIncome={totalIncome}
        incomeCount={selectedDay 
          ? scopedTransactions.filter(t => (t?.type === 'income' || t?.type === 'ingreso') && !isTransferTx(t)).length
          : (monthlyStats.incomeCount || 0)
        }
        totalExpense={totalExpense}
        expenseCount={selectedDay
          ? scopedTransactions.filter(t => (t?.type === 'expense' || t?.type === 'gasto') && !isTransferTx(t)).length
          : (monthlyStats.expenseCount || 0)
        }
        savingsRate={savingsRate}
        freeCash={freeCash}
        accounts={accounts}
        formatMoney={formatMoney}
      />
    ),

    metric_cards_grid: (
      <MetricCardsGrid
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        netBalance={netBalance}
        savingsRate={savingsRate}
        availableLiquidBalance={availableLiquidBalance}
        freeCash={freeCash}
        formatMoney={formatMoney}
        monthlyStats={monthlyStats}
      />
    ),

    top_accounts: (
      <TopAccountsWidget
        accounts={accounts}
        transactions={transactions}
        trm={trm}
        formatMoney={formatMoney}
        onAccountClick={() => navigateToTab('accounts')}
        onNavigateToTab={navigateToTab}
      />
    ),

    recent_transactions: (
      <RecentTransactionsWidget
        transactions={displayTransactions}
        formatMoney={formatMoney}
        onTransactionClick={handleSelectTransaction}
        onNavigateToTab={navigateToTab}
      />
    )
  };
}

export const getWidgetRegistry = createWidgetRegistry;

/**
 * getWidgetComponent
 * Resuelve un widget ID desde el registro normalizando la llave.
 */
export const getWidgetComponent = (id, registry) => {
  if (!registry || !id) return null;
  return registry[normalizeWidgetId(id)] || registry[id] || null;
};

/**
 * useWidgetRegistry
 * Custom hook memorizado para generar el registro de widgets en Dashboard
 */
export function useWidgetRegistry(params = {}) {
  return useMemo(() => createWidgetRegistry(params), [
    params.netWorthCOP,
    params.totalAssetsCOP,
    params.debtsAndLoansMetrics,
    params.isNetWorthPositive,
    params.investmentsMetrics,
    params.availableLiquidBalance,
    params.netBalance,
    params.totalIncome,
    params.totalExpense,
    params.savingsRate,
    params.freeCash,
    params.scopedTransactions,
    params.displayTransactions,
    params.transactions,
    params.monthlyStats,
    params.selectedDate,
    params.selectedDay,
    params.currentMonthLabel,
    params.isTransferTx,
    params.accounts,
    params.categories,
    params.recurringPayments,
    params.subscriptions,
    params.trm,
    params.weeklyCashFlow,
    params.hoveredWeekIndex,
    params.setHoveredWeekIndex,
    params.currentPeriod,
    params.periodOptions,
    params.handlePeriodChange,
    params.bentoPeriodLabel,
    params.navigateToTab,
    params.handleOpenDebtModal,
    params.handleOpenTxModal,
    params.handleOpenRecurringModal,
    params.handleSelectTransaction,
    params.onOpenCalendar,
    params.onSelectDay,
    params.onSelectCreditCardDetail,
    params.financeActions,
    params.formatMoney
  ]);
}
