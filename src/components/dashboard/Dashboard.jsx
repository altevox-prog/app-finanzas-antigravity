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
  accounts = [], investments = [], debtsAndLoans = [], transactions = [], monthlyTransactions = null,
  categories = [], recurringPayments = [], subscriptions = [], monthlyStats = {}, selectedDate = new Date(),
  selectedDay = null, onSelectDay = () => {}, onOpenCalendar = () => {}, onOpenMonthPicker = null,
  onNavigateToTab = () => {}, setActiveTab = null, onOpenTransaction = () => {}, onOpenAddTransaction = null,
  onOpenAddDebt = null, onOpenAddLoan = null, onOpenAddRecurring = null, onAddDebtOrLoan = null,
  onAddRecurring = null, onAddTransaction = null, onDeleteTransaction = () => {}, onUpdateTransaction = () => {},
  onAddCategory = () => {}, onAddSubcategory = () => {}, onUpdateSubcategory = () => {}, onDeleteSubcategory = () => {},
  onAddAccount = () => {}, onSelectCreditCardDetail = () => {}, currentMonthLabel = '', trm = 4050,
  widgetsConfig = null, widgets: widgetsProp = null, onSaveWidgets = null, allowedWidgetIds = null, className = null,
  financeData = {}, financeActions = {}, isForcedMobile = false, isForcedDesktop = false, userProfile = null, livePrices = null
}) {
  const effectiveLivePrices = livePrices || financeData?.livePrices || {};
  const effectiveUser = userProfile || financeData?.userProfile;
  const userName = (effectiveUser?.name && effectiveUser.name !== 'Usuario') ? effectiveUser.name.split(' ')[0] : 'Alex';
  const { formatMoney } = usePrivacy();

  const [modalsState, setModalsState] = useState({});
  const [selectedTxForDetail, setSelectedTxForDetail] = useState(null);
  const [selectedTxForEdit, setSelectedTxForEdit] = useState(null);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState(null);

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
    currentMonthLabel, monthlyStats, transactions, navigateToTab, handleOpenDebtModal, handleOpenTxModal,
    handleOpenRecurringModal, handleSelectTransaction, onOpenCalendar, onSelectDay, onSelectCreditCardDetail,
    financeActions, formatMoney
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

  const colSpanLeft = isForcedMobile ? 'col-span-1' : 'lg:col-span-7 xl:col-span-8', colSpanRight = isForcedMobile ? 'col-span-1' : 'lg:col-span-5 xl:col-span-4';
  const widgetPairs = [
    [hasWidget('debts_loans') && { id: 'debts_loans', comp: getWidget('debts_loans') || getWidget('debts') }, hasWidget('investments') && { id: 'investments', comp: getWidget('investments') }].filter(Boolean),
    [hasWidget('savings_rate') && { id: 'savings_rate', comp: getWidget('savings_rate') }, hasWidget('budget') && { id: 'budget', comp: getWidget('budget') }].filter(Boolean)
  ];

  return (
    <>
      {isReordering && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2 bg-slate-900/90 dark:bg-slate-800/95 text-white rounded-full shadow-2xl border border-slate-700/60 backdrop-blur-md transition-all">
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
          <div className={`${colSpanLeft} flex flex-col`}>
            <AccountsWidget accounts={accounts} transactions={transactions} trm={trm} availableLiquidBalance={metrics.availableLiquidBalance}
              onNavigateToTab={navigateToTab} setActiveTab={navigateToTab} onOpenAccounts={() => navigateToTab('accounts')}
              onSelectCreditCardDetail={onSelectCreditCardDetail} formatMoney={formatMoney} />
          </div>
          <div className={`${colSpanRight} flex flex-col h-full [&>div]:h-full`}>
            <MonthlyNetHeroCard netBalance={metrics.netBalance} totalIncome={metrics.totalIncome} totalExpense={metrics.totalExpense}
              savingsRate={metrics.savingsRate} transactions={transactions} monthlyTransactions={monthlyTransactions || metrics.scopedTransactions}
              selectedDate={selectedDate} selectedDay={selectedDay} currentMonthLabel={currentMonthLabel}
              onOpenCalendar={onOpenCalendar} onOpenMonthPicker={onOpenMonthPicker || onOpenCalendar} formatMoney={formatMoney} trm={trm} />
          </div>
        </div>

        {/* Macro Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start w-full">
          <div className={`${colSpanLeft} flex flex-col gap-5 sm:gap-6`}>
            {hasWidget('weekly_cashflow') && renderWrapper('weekly_cashflow', (
              <WeeklyExpensesChart transactions={transactions} selectedDate={selectedDate} selectedDay={selectedDay}
                currentMonthLabel={currentMonthLabel} formatMoney={formatMoney}
                onSelectWeek={(weekData, maybeRange) => {
                  const weekNum = typeof weekData === 'object' ? (weekData?.start ? Math.ceil(weekData.start / 7) : parseInt(String(weekData?.label || '').replace(/\D/g, ''), 10) || 1) : weekData;
                  navigateToTab('transactions', { week: weekNum, weekRange: typeof weekData === 'object' ? weekData?.range : maybeRange, weekData });
                }} />
            ))}
            {widgetPairs.map((pair, idx) => pair.length > 0 && (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch w-full">
                {pair.map((w) => <div key={w.id} className="w-full h-full">{renderWrapper(w.id, w.comp, 'h-full')}</div>)}
              </div>
            ))}
          </div>

          <div className={`${colSpanRight} flex flex-col gap-5 sm:gap-6`}>
            {hasWidget('expenses_category') && renderWrapper('expenses_category', getWidget('expenses_category') || getWidget('expenses_chart') || getWidget('tus_gastos') || getWidget('donut'))}
            {hasWidget('recurring_payments') && renderWrapper('recurring_payments', getWidget('recurring_payments') || <RecurringPaymentsWidget recurringPayments={recurringPayments} subscriptions={subscriptions} />)}
            {hasWidget('recent_movements') && renderWrapper('recent_movements', (
              <RecentMovementsSection transactions={transactions.slice(0, 4)} accounts={accounts} onSelectTransaction={handleSelectTransaction}
                onNavigateToMovements={() => navigateToTab('transactions')} onNavigateToTab={navigateToTab} setActiveTab={navigateToTab}
                onAddTransaction={handleOpenTxModal} compactMode={false} formatMoney={formatMoney} limit={4} />
            ))}
          </div>
        </div>

        {isReordering && hiddenWidgets && hiddenWidgets.length > 0 && (
          <HiddenWidgetsSection hiddenWidgets={hiddenWidgets} onToggleVisibility={handleToggleVisibility} widgetIconMap={WIDGET_ICON_MAP} />
        )}
      </div>

      <DashboardModals modalsState={modalsState} onClose={handleCloseModal} onAddTransaction={onAddTransaction} onAddDebtOrLoan={onAddDebtOrLoan}
        onAddRecurring={onAddRecurring} onAddAccount={onAddAccount} onAddCategory={onAddCategory} onAddSubcategory={onAddSubcategory}
        onUpdateSubcategory={onUpdateSubcategory} onDeleteSubcategory={onDeleteSubcategory} onUpdateTransaction={onUpdateTransaction}
        onDeleteTransaction={onDeleteTransaction} selectedTxForDetail={selectedTxForDetail} setSelectedTxForDetail={setSelectedTxForDetail}
        selectedTxForEdit={selectedTxForEdit} setSelectedTxForEdit={setSelectedTxForEdit} selectedTxForReceipt={selectedTxForReceipt}
        setSelectedTxForReceipt={setSelectedTxForReceipt} accounts={accounts} categories={categories} trm={trm} />
    </>
  );
}

export { Dashboard, QuickActionsFab };
