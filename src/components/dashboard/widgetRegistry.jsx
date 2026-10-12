import React from 'react';
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
import BalanceWidget from '../BalanceWidget';
import BudgetWidget from '../BudgetWidget';
import ReportsAndCharts from '../ReportsAndCharts';
import BentoMetricsGrid from '../common/BentoMetricsGrid';

/**
 * createWidgetRegistry
 * Factory que crea y retorna el mapa centralizado de componentes de widgets disponibles
 * para el Dashboard a partir de los datos, métricas y callbacks provistos.
 *
 * @param {Object} params
 * @returns {Record<string, React.ReactNode>} WIDGET_REGISTRY
 */
export function createWidgetRegistry({
  // Métricas de patrimonio, inversiones y deudas
  netWorthCOP,
  totalAssetsCOP,
  debtsAndLoansMetrics = {},
  isNetWorthPositive,
  investmentsMetrics = {},
  // Liquidez, ingresos y egresos
  availableLiquidBalance,
  netBalance,
  totalIncome,
  totalExpense,
  savingsRate,
  freeCash,
  // Transacciones y estado del mes
  scopedTransactions = [],
  displayTransactions = [],
  transactions = [],
  monthlyStats = {},
  selectedDate,
  selectedDay,
  currentMonthLabel,
  isTransferTx = () => false,
  // Cuentas, categorías, pagos recurrentes
  accounts = [],
  categories = [],
  recurringPayments = [],
  subscriptions = [],
  trm = 4050,
  // Flujo de caja semanal
  weeklyCashFlow = [],
  hoveredWeekIndex,
  setHoveredWeekIndex,
  currentPeriod,
  periodOptions,
  handlePeriodChange,
  // Bento
  bentoPeriodLabel,
  // Handlers y navegación
  navigateToTab = () => {},
  handleOpenDebtModal = () => {},
  handleOpenTxModal = () => {},
  handleOpenRecurringModal = () => {},
  onOpenCalendar = () => {},
  onSelectDay = () => {},
  onSelectCreditCardDetail = () => {},
  financeActions = {},
  // Formateadores
  formatMoney = (val) => val
} = {}) {
  return {
    // 1. Patrimonio total
    net_worth: (
      <NetWorthWidget
        netWorthCOP={netWorthCOP}
        totalAssetsCOP={totalAssetsCOP}
        totalPayableCOP={debtsAndLoansMetrics.totalPayableCOP}
        isNetWorthPositive={isNetWorthPositive}
        formatMoney={formatMoney}
      />
    ),

    // 2. Inversiones
    investments: (
      <InvestmentsWidget
        investmentsMetrics={investmentsMetrics}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
        formatMoney={formatMoney}
      />
    ),

    // 3. Préstamos y deudas
    debts: (
      <DebtsWidget
        debtsAndLoansMetrics={debtsAndLoansMetrics}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
        onOpenAddDebt={handleOpenDebtModal}
        onOpenAddLoan={handleOpenDebtModal}
        setIsNewDebtModalOpen={handleOpenDebtModal}
        formatMoney={formatMoney}
      />
    ),

    // 4. Saldo disponible líquido
    liquid_balance: (
      <LiquidBalanceWidget
        availableLiquidBalance={availableLiquidBalance}
        netBalance={netBalance}
        formatMoney={formatMoney}
      />
    ),

    // 5. Ingreso del mes
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

    // 6. Gasto del mes
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

    // 7. Tasa de ahorro / Superávit
    savings_rate: (
      <SavingsRateWidget
        savingsRate={savingsRate}
        freeCash={freeCash}
        formatMoney={formatMoney}
      />
    ),

    // 8. Flujo de caja semanal / Actividad de gastos (WeeklyExpensesChart)
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

    // 9. Tus gastos
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

    // 10. Mis cuentas
    my_accounts: (
      <AccountsWidget
        accounts={accounts}
        transactions={transactions}
        trm={trm}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
        onSelectCreditCardDetail={onSelectCreditCardDetail}
        formatMoney={formatMoney}
      />
    ),

    // 11. Últimos movimientos
    recent_movements: (
      <RecentMovementsSection
        transactions={displayTransactions}
        onViewAll={() => navigateToTab('transactions')}
        setActiveTab={navigateToTab}
        onNavigateToTab={navigateToTab}
        onSelectTransaction={handleOpenTxModal}
        onOpenTransaction={handleOpenTxModal}
        onOpenAddTransaction={handleOpenTxModal}
        formatMoney={formatMoney}
      />
    ),

    // 12. Pagos recurrentes
    recurring_payments: (
      <RecurringPaymentsWidget
        recurringPayments={recurringPayments}
        subscriptions={subscriptions}
        formatMoney={formatMoney}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
        onOpenAddRecurring={handleOpenRecurringModal}
        setIsRecurringModalOpen={handleOpenRecurringModal}
      />
    ),

    // 13. Balance general
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

    // 14. Presupuesto
    budget: <BudgetWidget monthlyStats={monthlyStats} />,

    // 15. Bento metrics grid
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

    // 16. Cuadrícula consolidada de tarjetas de balance
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
    )
  };
}
