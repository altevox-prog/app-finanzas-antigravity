import React, { useMemo, useState } from 'react';
import { usePrivacy } from '../context/PrivacyContext';
import ReportsAndCharts from './ReportsAndCharts';
import { toSafeNumber, calculateSavingsRate, calculateNetFlow } from '../utils/financeMath';
import Dashboard from './Dashboard';
import DesktopWeeklyCashFlowChart from './dashboard/DesktopWeeklyCashFlowChart';
import MetricCardsGrid from './dashboard/widgets/MetricCardsGrid';
import TopAccountsWidget from './dashboard/widgets/TopAccountsWidget';
import RecentTransactionsWidget from './dashboard/widgets/RecentTransactionsWidget';

export default function DesktopDashboard({
  transactions = [],
  accounts = [],
  categories = [],
  investments = [],
  debtsAndLoans = [],
  monthlyStats = {},
  selectedDate = new Date(),
  selectedDay = null,
  onOpenCalendar,
  onSelectDay,
  onNavigateToTab,
  onOpenTransaction,
  onOpenAddTransaction,
  setIsAddTransactionOpen,
  onOpenNewTransaction,
  onOpenNewAccount,
  onEditTransaction,
  onDeleteTransaction,
  onCustomizeWidgets,
  trm = 4000,
  widgets = []
}) {
  const { formatMoney } = usePrivacy();
  const [currentPeriod, setCurrentPeriod] = useState(selectedDay ? 'day' : 'month');

  const periodOptions = [
    { id: 'month', label: 'Mensual' },
    { id: 'week', label: 'Semanal' },
    { id: 'day', label: 'Diario' }
  ];

  const setPeriod = (newPeriod) => {
    setCurrentPeriod(newPeriod);
    if (newPeriod === 'month') {
      onSelectDay?.(null);
    } else if (newPeriod === 'day') {
      const today = new Date().toISOString().split('T')[0];
      onSelectDay?.(selectedDay || today);
    }
  };

  const handleAddTx = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (onOpenTransaction) onOpenTransaction();
    else if (setIsAddTransactionOpen) setIsAddTransactionOpen(true);
    else if (onOpenAddTransaction) onOpenAddTransaction();
    else if (onOpenNewTransaction) onOpenNewTransaction();
  };

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  // Transacciones del mes seleccionado
  const currentMonthTxs = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      const d = new Date(tx.date + 'T00:00:00');
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [transactions, currentYear, currentMonth]);

  // Cálculos numéricos y métricas clave
  const totalIncome = toSafeNumber(monthlyStats.totalIncome);
  const totalExpense = toSafeNumber(monthlyStats.totalExpense);
  const netBalance = monthlyStats.netBalance !== undefined ? toSafeNumber(monthlyStats.netBalance) : calculateNetFlow(totalIncome, totalExpense);
  const availableLiquidBalance = toSafeNumber(monthlyStats.availableLiquidBalance);
  const savingsRate = calculateSavingsRate(totalIncome, totalExpense);
  const freeCash = Math.max(0, netBalance);

  return (
    <div className="w-full space-y-6">
      {/* 1. Widgets Financieros: Patrimonio Neto, Préstamos e Inversiones */}
      <Dashboard
        accounts={accounts}
        investments={investments}
        debtsAndLoans={debtsAndLoans}
        transactions={transactions}
        trm={trm}
        onNavigateToTab={onNavigateToTab}
        widgetsConfig={widgets}
        widgets={widgets}
        onCustomizeWidgets={onCustomizeWidgets}
        allowedWidgetIds={['net_worth', 'debts', 'investments', 'liquid_balance', 'balance', 'trm']}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
      />

      {/* 2. Fila Bento Grid: Tarjetas Métricas KPI */}
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

      {/* 3. Fila de Análisis Visual: Flujo Semanal y Gráfico de Gastos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <DesktopWeeklyCashFlowChart
          currentMonthTxs={currentMonthTxs}
          currentPeriod={currentPeriod}
          setPeriod={setPeriod}
          periodOptions={periodOptions}
        />
        <div className="lg:col-span-4">
          <ReportsAndCharts
            transactions={transactions}
            categories={categories}
            selectedDate={selectedDate}
            selectedDay={selectedDay}
            onOpenCalendar={onOpenCalendar}
          />
        </div>
      </div>

      {/* 4. Fila Cuentas y Últimos Movimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <TopAccountsWidget
          accounts={accounts}
          transactions={transactions}
          trm={trm}
          formatMoney={formatMoney}
          onNavigateToTab={onNavigateToTab}
          onAccountClick={onNavigateToTab}
        />
        <RecentTransactionsWidget
          transactions={currentMonthTxs}
          categories={categories}
          formatMoney={formatMoney}
          onTransactionClick={onEditTransaction || onOpenTransaction}
          onNavigateToTab={onNavigateToTab}
          onAddTransaction={handleAddTx}
        />
      </div>
    </div>
  );
}
