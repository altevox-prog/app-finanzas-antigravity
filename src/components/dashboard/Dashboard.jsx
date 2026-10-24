import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import useDashboardMetrics from '../../hooks/useDashboardMetrics';
import useWidgetReorder from '../../hooks/useWidgetReorder';
import QuickActionsFab from './QuickActionsFab';
import HiddenWidgetsSection from './HiddenWidgetsSection';
import DashboardWidgetWrapper from './DashboardWidgetWrapper';
import { useWidgetRegistry, getWidgetComponent, WIDGET_ICON_MAP } from './widgetRegistry';
import { normalizeWidgetId } from '../../utils/widgetsConfig';
import DashboardModals from './DashboardModals';
import MonthlyNetHeroCard from './MonthlyNetHeroCard';
import AccountsWidget from './widgets/AccountsWidget';
import RecentMovementsSection from './RecentMovementsSection';
import RecurringPaymentsWidget from './widgets/RecurringPaymentsWidget';
import WeeklyExpensesChart from './WeeklyExpensesChart';

export default function Dashboard({
  accounts = [], investments = [], debtsAndLoans = [], transactions = [], monthlyTransactions = null, categories = [], recurringPayments = [], subscriptions = [], monthlyStats = {}, selectedDate = new Date(), selectedDay = null,
  onSelectDay = () => {}, onOpenCalendar = () => {}, onOpenMonthPicker = null, onNavigateToTab = () => {}, setActiveTab = null, onOpenTransaction = () => {}, onOpenAddTransaction = null, onOpenAddDebt = null, onOpenAddLoan = null, onOpenAddRecurring = null,
  onAddDebtOrLoan = null, onAddRecurring = null, onAddTransaction = null, onDeleteTransaction = () => {}, onUpdateTransaction = () => {}, onAddCategory = () => {}, onAddSubcategory = () => {}, onUpdateSubcategory = () => {}, onDeleteSubcategory = () => {},
  onAddAccount = () => {}, onSelectCreditCardDetail = () => {}, currentMonthLabel = '', trm = 4050, widgetsConfig = null, widgets: widgetsProp = null, onSaveWidgets = null, allowedWidgetIds = null, className = null, financeData = {}, financeActions = {},
  isForcedMobile = false, isForcedDesktop = false, userProfile = null, livePrices = null, budgets = null, savingsGoals = [], modalControls = null, onOpenProfile = null, onOpenSavingsGoals = null
}) {
  const effectiveLivePrices = livePrices || financeData?.livePrices || {};
  const effectiveUser = userProfile || financeData?.userProfile;
  const effectiveSavingsGoals = (Array.isArray(savingsGoals) && savingsGoals.length > 0) ? savingsGoals : (financeData?.savingsGoals || []);
  const userName = (effectiveUser?.name && effectiveUser.name !== 'Usuario') ? effectiveUser.name.split(' ')[0] : 'Alex';
  const { formatMoney } = usePrivacy();

  const [modalsState, setModalsState] = useState({});
  const [selectedTxForDetail, setSelectedTxForDetail] = useState(null), [selectedTxForEdit, setSelectedTxForEdit] = useState(null), [selectedTxForReceipt, setSelectedTxForReceipt] = useState(null);

  const handleSelectTransaction = (tx) => { if (tx && typeof tx === 'object') setSelectedTxForDetail(tx); };
  const handleCloseModal = (type) => setModalsState((p) => ({ ...p, [`is${type ? type.charAt(0).toUpperCase() + type.slice(1) : ''}ModalOpen`]: false }));
  const navigateToTab = (rawTab, extra) => (financeActions?.setActiveTab || financeActions?.handleTabChange || onNavigateToTab || setActiveTab)?.({ movements: 'transactions', movimientos: 'transactions', inicio: 'dashboard', cuentas: 'accounts' }[rawTab] || rawTab, extra);

  const handleOpenDebtModal = (type = 'payable') => {
    const norm = /receivable|lent|me_deben/.test(type) ? 'receivable' : 'payable';
    const fn = onOpenAddDebt || onOpenAddLoan || financeActions?.openAddDebt || financeActions?.openAddLoan || financeActions?.handleOpenAddDebt || financeActions?.handleOpenAddLoan;
    if (fn) fn(norm); else if (onAddDebtOrLoan) setModalsState((p) => ({ ...p, isDebtModalOpen: true, debtType: norm }));
  };

  const handleOpenRecurringModal = () => (onOpenAddRecurring || financeActions?.openAddRecurring || financeActions?.handleOpenAddRecurring || financeActions?.handleOpenRecurring)?.() || (onAddRecurring && setModalsState((p) => ({ ...p, isRecurringModalOpen: true })));

  const handleOpenTxModal = (type = 'expense') => {
    const norm = /income|ingreso/.test(type) ? 'income' : /transfer|transferencia/.test(type) ? 'transfer' : 'expense';
    const fn = onOpenTransaction || onOpenAddTransaction || financeActions?.openAddTransaction || financeActions?.handleOpenAddTransaction || financeActions?.handleOpenTransaction;
    if (fn) fn(norm); else if (onAddTransaction) setModalsState((p) => ({ ...p, isTxModalOpen: true, txType: norm }));
  };

  const metrics = useDashboardMetrics({
    accounts, transactions, investments, debtsAndLoans, monthlyTransactions, monthlyStats,
    selectedDate, selectedDay, currentMonthLabel, trm, onSelectDay, livePrices: effectiveLivePrices
  });

  const WIDGET_REGISTRY = useWidgetRegistry({
    ...metrics, accounts, categories, recurringPayments, subscriptions, trm, selectedDate, selectedDay,
    currentMonthLabel, monthlyStats, transactions, budgets: budgets || financeData?.budgets, navigateToTab, handleOpenDebtModal, handleOpenTxModal,
    handleOpenRecurringModal, handleSelectTransaction, onOpenCalendar, onSelectDay, onSelectCreditCardDetail,
    financeActions, formatMoney, savingsGoals: effectiveSavingsGoals, modalControls, onOpenProfile, onOpenSavingsGoals
  });

  const getWidget = (id) => getWidgetComponent(id, WIDGET_REGISTRY);
  const reorder = useWidgetReorder({ widgetsConfig, widgetsProp, allowedWidgetIds, onSaveWidgets, getWidget });
  const { visibleWidgets, hiddenWidgets, isReordering, draggedIndex, handleFinishReordering, handleToggleVisibility } = reorder;

  const hasWidget = (id) => visibleWidgets.some((w) => normalizeWidgetId(w.id) === normalizeWidgetId(id));
  const getWidgetIndex = (id) => Math.max(0, visibleWidgets.findIndex((w) => normalizeWidgetId(w.id) === normalizeWidgetId(id)));

  const renderWrapper = (id, children, extraClasses = '') => (
    <DashboardWidgetWrapper id={id} index={getWidgetIndex(id)} isReordering={isReordering} draggedIndex={draggedIndex} className={extraClasses}
      onPressStart={reorder.handlePressStart} onPressEnd={reorder.handlePressEnd} onTouchStart={reorder.handleTouchStart} onTouchMove={reorder.handleTouchMove}
      onTouchEnd={reorder.handleTouchEnd} onDragStart={reorder.handleDragStart} onDragOver={reorder.handleDragOver} onDrop={reorder.handleDrop}
      onDragEnd={reorder.handleDragEnd} onToggleVisibility={handleToggleVisibility}>
      {children}
    </DashboardWidgetWrapper>
  );

  const colSpanLeft = isForcedMobile ? 'col-span-1 min-w-0 w-full' : 'lg:col-span-7 xl:col-span-8 min-w-0 w-full', colSpanRight = isForcedMobile ? 'col-span-1 min-w-0 w-full' : 'lg:col-span-5 xl:col-span-4 min-w-0 w-full';
  const bottomGridIds = new Set(['debts_loans', 'debts', 'investments', 'savings_rate', 'savings_goals', 'budget']);
  const reorderableWidgets = visibleWidgets.filter((w) => bottomGridIds.has(normalizeWidgetId(w.id)) || bottomGridIds.has(w.id));
  const hasExpensesWidget = visibleWidgets.some((w) => ['expenses_category', 'expenses_and_movements', 'expenses_chart', 'tus_gastos', 'donut'].includes(normalizeWidgetId(w.id)));
  const rightColumnIds = new Set(['expenses_category', 'expenses_and_movements', 'expenses_chart', 'tus_gastos', 'donut', 'recurring_payments', 'recent_movements']);
  const rightWidgets = visibleWidgets.filter((w) => {
    const nid = normalizeWidgetId(w.id);
    if (!rightColumnIds.has(nid) && !rightColumnIds.has(w.id)) return false;
    if (nid === 'recent_movements' && hasExpensesWidget) return false;
    return true;
  });

  return (
    <>
      {isReordering && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2 bg-zinc-900/90 dark:bg-zinc-800/95 text-white rounded-full shadow-2xl border border-zinc-700/60 backdrop-blur-md transition-all">
          <span className="text-xs font-semibold text-slate-200 pl-1 hidden sm:inline">Reorganizando widgets</span>
          <button type="button" onClick={handleFinishReordering} className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-full shadow transition-all cursor-pointer">
            <Check className="w-3.5 h-3.5 stroke-[3]" /><span>Listo</span>
          </button>
        </div>
      )}

      <div className={`w-full max-w-[1600px] mx-auto px-3 sm:px-6 py-4 space-y-6 ${className || ''}`}>
        <div className={`${isForcedDesktop ? 'block' : 'hidden lg:block'} pt-1`}>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Hola, {userName}</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Resumen financiero de {currentMonthLabel || 'este mes'}</p>
        </div>

        {/* Hero Fila Fija */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch w-full mb-6">
          <div className={`${colSpanLeft} min-w-0 w-full flex flex-col`}>
            <AccountsWidget accounts={accounts} transactions={transactions} trm={trm} availableLiquidBalance={metrics.availableLiquidBalance} onNavigateToTab={navigateToTab} setActiveTab={navigateToTab} onOpenAccounts={() => navigateToTab('accounts')} onSelectCreditCardDetail={onSelectCreditCardDetail} formatMoney={formatMoney} />
          </div>
          <div className={`${colSpanRight} min-w-0 w-full flex flex-col h-full [&>div]:h-full`}>
            <MonthlyNetHeroCard netBalance={metrics.netBalance} totalIncome={metrics.totalIncome} totalExpense={metrics.totalExpense} savingsRate={metrics.savingsRate} transactions={transactions} monthlyTransactions={monthlyTransactions || metrics.scopedTransactions} selectedDate={selectedDate} selectedDay={selectedDay} currentMonthLabel={currentMonthLabel} onOpenCalendar={onOpenCalendar} onOpenMonthPicker={onOpenMonthPicker || onOpenCalendar} formatMoney={formatMoney} trm={trm} />
          </div>
        </div>

        {/* Macro Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start w-full">
          <div className={`${colSpanLeft} min-w-0 w-full flex flex-col gap-5 sm:gap-6`}>
            {hasWidget('weekly_cashflow') && renderWrapper('weekly_cashflow', (
              <WeeklyExpensesChart transactions={transactions} selectedDate={selectedDate} selectedDay={selectedDay}
                currentMonthLabel={currentMonthLabel} formatMoney={formatMoney}
                onSelectWeek={(weekData, maybeRange) => {
                  const weekNum = typeof weekData === 'object' ? (weekData?.start ? Math.ceil(weekData.start / 7) : parseInt(String(weekData?.label || '').replace(/\D/g, ''), 10) || 1) : weekData;
                  navigateToTab('transactions', { week: weekNum, weekRange: typeof weekData === 'object' ? weekData?.range : maybeRange, weekData });
                }} />
            ))}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-stretch w-full min-w-0">
              {reorderableWidgets.map((w) => {
                const widgetComp = getWidget(w.id);
                if (!widgetComp) return null;
                return (
                  <div key={w.id} className="w-full h-full min-w-0">
                    {renderWrapper(w.id, widgetComp, 'h-full')}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`${colSpanRight} min-w-0 w-full flex flex-col gap-5 sm:gap-6`}>
            {rightWidgets.map((w) => {
              const widgetComp = normalizeWidgetId(w.id) === 'recent_movements'
                ? <RecentMovementsSection transactions={transactions.slice(0, 4)} accounts={accounts} onSelectTransaction={handleSelectTransaction} onNavigateToMovements={() => navigateToTab('transactions')} onNavigateToTab={navigateToTab} setActiveTab={navigateToTab} onAddTransaction={handleOpenTxModal} compactMode={false} formatMoney={formatMoney} limit={4} />
                : (getWidget(w.id) || (w.id === 'recurring_payments' && <RecurringPaymentsWidget recurringPayments={recurringPayments} subscriptions={subscriptions} />));
              if (!widgetComp) return null;
              return <div key={w.id} className="w-full min-w-0">{renderWrapper(w.id, widgetComp)}</div>;
            })}
          </div>
        </div>

        {isReordering && hiddenWidgets && hiddenWidgets.length > 0 && (
          <HiddenWidgetsSection hiddenWidgets={hiddenWidgets} onToggleVisibility={handleToggleVisibility} widgetIconMap={WIDGET_ICON_MAP} />
        )}
      </div>

      <DashboardModals modalsState={modalsState} onClose={handleCloseModal} onAddTransaction={onAddTransaction} onAddDebtOrLoan={onAddDebtOrLoan} onAddRecurring={onAddRecurring} onAddAccount={onAddAccount} onAddCategory={onAddCategory} onAddSubcategory={onAddSubcategory} onUpdateSubcategory={onUpdateSubcategory} onDeleteSubcategory={onDeleteSubcategory} onUpdateTransaction={onUpdateTransaction} onDeleteTransaction={onDeleteTransaction} selectedTxForDetail={selectedTxForDetail} setSelectedTxForDetail={setSelectedTxForDetail} selectedTxForEdit={selectedTxForEdit} setSelectedTxForEdit={setSelectedTxForEdit} selectedTxForReceipt={selectedTxForReceipt} setSelectedTxForReceipt={setSelectedTxForReceipt} accounts={accounts} categories={categories} trm={trm} />
    </>
  );
}

export { Dashboard, QuickActionsFab };
