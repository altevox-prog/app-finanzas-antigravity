import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import useDashboardMetrics from '../hooks/useDashboardMetrics';
import useWidgetReorder from '../hooks/useWidgetReorder';
import QuickActionsFab from './dashboard/QuickActionsFab';
import HiddenWidgetsSection from './dashboard/HiddenWidgetsSection';
import DashboardWidgetWrapper from './dashboard/DashboardWidgetWrapper';
import { useWidgetRegistry, getWidgetComponent, WIDGET_ICON_MAP } from './dashboard/widgetRegistry';
import DashboardModals from './dashboard/DashboardModals';

// Re-exports de compatibilidad para módulos que consumían widgets satélite desde Dashboard.jsx
export { default as NetWorthWidget } from './dashboard/widgets/NetWorthWidget';
export { default as DebtsWidget } from './dashboard/widgets/DebtsWidget';
export { default as InvestmentsWidget } from './dashboard/widgets/InvestmentsWidget';
export { default as AccountsWidget } from './dashboard/widgets/AccountsWidget';
export { default as RecurringPaymentsWidget } from './dashboard/widgets/RecurringPaymentsWidget';
export { default as TRMWidget } from './dashboard/widgets/TRMWidget';
export { default as WeeklyCashflowWidget } from './dashboard/widgets/WeeklyCashflowWidget';
export { default as RecentMovementsSection, RecentMovementsWidget, TransactionsWidget } from './dashboard/RecentMovementsSection';
export { default as BalanceCardsWidget, LiquidBalanceWidget, MonthlyIncomeWidget, MonthlyExpenseWidget, SavingsRateWidget } from './dashboard/BalanceCardsWidget';

export default function Dashboard({
  accounts = [], investments = [], debtsAndLoans = [], transactions = [],
  monthlyTransactions = null, categories = [], recurringPayments = [], subscriptions = [],
  monthlyStats = {}, selectedDate = new Date(), selectedDay = null, onSelectDay = () => {},
  onOpenCalendar = () => {}, onNavigateToTab = () => {}, setActiveTab = null,
  onOpenTransaction = () => {}, onOpenAddTransaction = null, onOpenAddDebt = null,
  onOpenAddLoan = null, onOpenAddRecurring = null, onAddDebtOrLoan = null,
  onAddRecurring = null, onAddTransaction = null, onDeleteTransaction = () => {},
  onUpdateTransaction = () => {}, onAddCategory = () => {}, onAddSubcategory = () => {},
  onUpdateSubcategory = () => {}, onDeleteSubcategory = () => {}, onAddAccount = () => {},
  onSelectCreditCardDetail = () => {}, currentMonthLabel = '', trm = 4050,
  widgetsConfig = null, widgets: widgetsProp = null, onCustomizeWidgets = null,
  onSaveWidgets = null, allowedWidgetIds = null, className = null,
  financeData = {}, financeActions = {}
}) {
  const { formatMoney } = usePrivacy();
  const [modalsState, setModalsState] = useState({});

  const handleCloseModal = (type) => setModalsState(prev => ({ 
    ...prev, [`is${type ? type.charAt(0).toUpperCase() + type.slice(1) : ''}ModalOpen`]: false 
  }));

  const navigateToTab = (rawTab) => {
    const tab = (rawTab === 'movements' || rawTab === 'movimientos') ? 'transactions' : (rawTab === 'inicio') ? 'dashboard' : (rawTab === 'cuentas') ? 'accounts' : rawTab;
    if (financeActions?.setActiveTab) financeActions.setActiveTab(tab);
    else if (financeActions?.handleTabChange) financeActions.handleTabChange(tab);
    else if (typeof onNavigateToTab === 'function') onNavigateToTab(tab);
    else if (typeof setActiveTab === 'function') setActiveTab(tab);
  };

  const handleOpenDebtModal = (type = 'payable') => {
    const norm = (type === 'receivable' || type === 'lent' || type === 'me_deben') ? 'receivable' : 'payable';
    if (typeof onOpenAddDebt === 'function') onOpenAddDebt(norm);
    else if (typeof onOpenAddLoan === 'function') onOpenAddLoan(norm);
    else if (financeActions?.openAddDebt) financeActions.openAddDebt(norm);
    else if (financeActions?.openAddLoan) financeActions.openAddLoan(norm);
    else if (financeActions?.handleOpenAddDebt) financeActions.handleOpenAddDebt(norm);
    else if (financeActions?.handleOpenAddLoan) financeActions.handleOpenAddLoan(norm);
    else if (typeof onAddDebtOrLoan === 'function') setModalsState(prev => ({ ...prev, isDebtModalOpen: true, debtType: norm }));
  };

  const handleOpenRecurringModal = () => {
    if (typeof onOpenAddRecurring === 'function') onOpenAddRecurring();
    else if (financeActions?.openAddRecurring) financeActions.openAddRecurring();
    else if (financeActions?.handleOpenAddRecurring) financeActions.handleOpenAddRecurring();
    else if (financeActions?.handleOpenRecurring) financeActions.handleOpenRecurring();
    else if (typeof onAddRecurring === 'function') setModalsState(prev => ({ ...prev, isRecurringModalOpen: true }));
  };

  const handleOpenTxModal = (type = 'expense') => {
    const norm = (type === 'income' || type === 'ingreso') ? 'income' : 'expense';
    if (typeof onOpenTransaction === 'function') onOpenTransaction(norm);
    else if (typeof onOpenAddTransaction === 'function') onOpenAddTransaction(norm);
    else if (financeActions?.openAddTransaction) financeActions.openAddTransaction(norm);
    else if (financeActions?.handleOpenAddTransaction) financeActions.handleOpenAddTransaction(norm);
    else if (financeActions?.handleOpenTransaction) financeActions.handleOpenTransaction(norm);
    else if (typeof onAddTransaction === 'function') setModalsState(prev => ({ ...prev, isTxModalOpen: true, txType: norm }));
  };

  const metrics = useDashboardMetrics({
    accounts, transactions, investments, debtsAndLoans, monthlyTransactions,
    monthlyStats, selectedDate, selectedDay, currentMonthLabel, trm, onSelectDay
  });

  const WIDGET_REGISTRY = useWidgetRegistry({
    ...metrics, accounts, categories, recurringPayments, subscriptions, trm,
    selectedDate, selectedDay, currentMonthLabel, monthlyStats, transactions,
    navigateToTab, handleOpenDebtModal, handleOpenTxModal, handleOpenRecurringModal,
    onOpenCalendar, onSelectDay, onSelectCreditCardDetail, financeActions, formatMoney
  });

  const getWidget = (id) => getWidgetComponent(id, WIDGET_REGISTRY);

  const {
    visibleWidgets, hiddenWidgets, isReordering, draggedIndex,
    handlePressStart, handlePressEnd, handleDragStart, handleDragOver,
    handleDrop, handleDragEnd, handleTouchStart, handleTouchMove,
    handleTouchEnd, handleFinishReordering, handleToggleVisibility
  } = useWidgetReorder({ widgetsConfig, widgetsProp, allowedWidgetIds, onSaveWidgets, getWidget });

  return (
    <>
      {isReordering && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2 bg-slate-900/90 dark:bg-slate-800/95 text-white rounded-full shadow-2xl border border-slate-700/60 backdrop-blur-md transition-all">
          <span className="text-xs font-semibold text-slate-200 pl-1 hidden sm:inline">Reorganizando widgets</span>
          <button type="button" onClick={handleFinishReordering} className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-full shadow transition-all cursor-pointer">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Listo</span>
          </button>
        </div>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full items-start touch-pan-y ${isReordering ? 'select-none' : ''} ${className || ''}`}>
        {visibleWidgets.map((w, index) => {
          const widgetComponent = getWidget(w.id);
          if (!widgetComponent) return null;
          return (
            <DashboardWidgetWrapper
              key={w.id} id={w.id} index={index} isReordering={isReordering} draggedIndex={draggedIndex}
              onPressStart={handlePressStart} onPressEnd={handlePressEnd}
              onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
              onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}
              onToggleVisibility={handleToggleVisibility}
            >
              {widgetComponent}
            </DashboardWidgetWrapper>
          );
        })}
      </div>

      {isReordering && (
        <HiddenWidgetsSection hiddenWidgets={hiddenWidgets} onToggleVisibility={handleToggleVisibility} widgetIconMap={WIDGET_ICON_MAP} />
      )}

      <DashboardModals
        modalsState={modalsState} onClose={handleCloseModal}
        onAddTransaction={onAddTransaction} onAddDebtOrLoan={onAddDebtOrLoan}
        onAddRecurring={onAddRecurring} onAddAccount={onAddAccount}
        onAddCategory={onAddCategory} onAddSubcategory={onAddSubcategory}
        accounts={accounts} categories={categories} trm={trm}
      />
    </>
  );
}

export { Dashboard, QuickActionsFab };
