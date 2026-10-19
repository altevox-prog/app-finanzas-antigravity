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

// Re-exports de compatibilidad para módulos que consumían widgets satélite desde Dashboard.jsx
export { default as MonthlyNetHeroCard } from './MonthlyNetHeroCard';
export { default as DebtsWidget } from './widgets/DebtsWidget';
export { default as InvestmentsWidget } from './widgets/InvestmentsWidget';
export { default as AccountsWidget } from './widgets/AccountsWidget';
export { default as RecurringPaymentsWidget } from './widgets/RecurringPaymentsWidget';
export { default as TRMWidget } from './widgets/TRMWidget';
export { default as WeeklyCashflowWidget } from './widgets/WeeklyCashflowWidget';
export { default as RecentMovementsSection, RecentMovementsWidget, TransactionsWidget } from './RecentMovementsSection';
export { default as BalanceCardsWidget, LiquidBalanceWidget, MonthlyIncomeWidget, MonthlyExpenseWidget, SavingsRateWidget } from './BalanceCardsWidget';

export default function Dashboard({
  accounts = [], investments = [], debtsAndLoans = [], transactions = [],
  monthlyTransactions = null, categories = [], recurringPayments = [], subscriptions = [],
  monthlyStats = {}, selectedDate = new Date(), selectedDay = null, onSelectDay = () => {},
  onOpenCalendar = () => {}, onOpenMonthPicker = null, onNavigateToTab = () => {}, setActiveTab = null,
  onOpenTransaction = () => {}, onOpenAddTransaction = null, onOpenAddDebt = null,
  onOpenAddLoan = null, onOpenAddRecurring = null, onAddDebtOrLoan = null,
  onAddRecurring = null, onAddTransaction = null, onDeleteTransaction = () => {},
  onUpdateTransaction = () => {}, onAddCategory = () => {}, onAddSubcategory = () => {},
  onUpdateSubcategory = () => {}, onDeleteSubcategory = () => {}, onAddAccount = () => {},
  onSelectCreditCardDetail = () => {}, currentMonthLabel = '', trm = 4050,
  widgetsConfig = null, widgets: widgetsProp = null, onCustomizeWidgets = null,
  onSaveWidgets = null, allowedWidgetIds = null, className = null,
  financeData = {}, financeActions = {}, isForcedMobile = false, isForcedDesktop = false,
  userProfile = null, livePrices = null
}) {
  const effectiveLivePrices = livePrices || financeData?.livePrices || {};
  const effectiveUser = userProfile || financeData?.userProfile;
  const userName = (effectiveUser?.name && effectiveUser.name !== 'Usuario')
    ? effectiveUser.name.split(' ')[0]
    : 'Alex';
  const { formatMoney } = usePrivacy();
  const [modalsState, setModalsState] = useState({});
  const [selectedTxForDetail, setSelectedTxForDetail] = useState(null);
  const [selectedTxForEdit, setSelectedTxForEdit] = useState(null);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState(null);

  const handleSelectTransaction = (tx) => {
    if (!tx || typeof tx !== 'object') return;
    setSelectedTxForDetail(tx);
  };

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
    monthlyStats, selectedDate, selectedDay, currentMonthLabel, trm, onSelectDay,
    livePrices: effectiveLivePrices
  });

  const WIDGET_REGISTRY = useWidgetRegistry({
    ...metrics, accounts, categories, recurringPayments, subscriptions, trm,
    selectedDate, selectedDay, currentMonthLabel, monthlyStats, transactions,
    navigateToTab, handleOpenDebtModal, handleOpenTxModal, handleOpenRecurringModal,
    handleSelectTransaction,
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

      {/* Saludo y contexto de bienvenida en Escritorio / Tablet */}
      <div className={`${isForcedDesktop ? 'block' : 'hidden lg:block'} pt-1`}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
          Hola, {userName}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
          Resumen financiero y actividad
        </p>
      </div>

      {/* Hero Net Summary Card (Fijo y estático, fuera del grid de widgets reordenables) */}
      <MonthlyNetHeroCard
        netBalance={metrics.netBalance}
        totalIncome={metrics.totalIncome}
        totalExpense={metrics.totalExpense}
        transactions={transactions}
        monthlyTransactions={monthlyTransactions || metrics.scopedTransactions}
        selectedDate={selectedDate}
        selectedDay={selectedDay}
        currentMonthLabel={currentMonthLabel}
        onOpenCalendar={onOpenCalendar}
        onOpenMonthPicker={onOpenMonthPicker || onOpenCalendar}
        formatMoney={formatMoney}
      />

      {/* Bloque estático e inamovible de Cuentas (Consolidado de liquidez y tarjetas, fuera del grid) */}
      <AccountsWidget
        accounts={accounts}
        transactions={transactions}
        trm={trm}
        availableLiquidBalance={metrics.availableLiquidBalance}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
        onOpenAccounts={() => navigateToTab('accounts')}
        onSelectCreditCardDetail={onSelectCreditCardDetail}
        formatMoney={formatMoney}
      />

      {/* Reorganización de widgets: 2 columnas en Desktop (lg:grid lg:grid-cols-12 lg:gap-6), columna única en móvil */}
      {(() => {
        const renderWidgetItem = (w, index) => {
          const norm = normalizeWidgetId(w.id);
          // Omitir widgets ya consolidados en la cabecera estática superior
          if (
            norm === 'liquid_balance' || 
            norm === 'available_balance' || 
            norm === 'balance_summary' || 
            norm === 'my_accounts' || 
            norm === 'accounts' ||
            norm === 'budget' ||
            norm === 'presupuesto_metas' ||
            norm === 'meta' ||
            w.id === 'budget'
          ) {
            return null;
          }
          const isInvestments = norm === 'investments' || w.id === 'investments';
          const widgetComponent = getWidget(w.id);
          if (!widgetComponent) return null;

          const content = widgetComponent;

          return (
            <DashboardWidgetWrapper
              key={w.id} 
              id={w.id} 
              index={index} 
              isReordering={isReordering} 
              draggedIndex={draggedIndex}
              className={`${isInvestments ? (isForcedMobile ? 'hidden' : 'hidden md:block') : ''}`}
              onPressStart={handlePressStart} 
              onPressEnd={handlePressEnd}
              onTouchStart={handleTouchStart} 
              onTouchMove={handleTouchMove} 
              onTouchEnd={handleTouchEnd}
              onDragStart={handleDragStart} 
              onDragOver={handleDragOver} 
              onDrop={handleDrop} 
              onDragEnd={handleDragEnd}
              onToggleVisibility={handleToggleVisibility}
            >
              {content}
            </DashboardWidgetWrapper>
          );
        };

        const reorderStyles = isReordering 
          ? 'select-none [&_*]:!transition-none' 
          : (draggedIndex !== null ? 'cursor-grabbing' : '');

        return (
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch mt-1 mb-6 w-full touch-pan-y ${reorderStyles} ${className || ''}`}>
            {visibleWidgets.map((w, index) => renderWidgetItem(w, index))}
          </div>
        );
      })()}

      {isReordering && (
        <HiddenWidgetsSection hiddenWidgets={hiddenWidgets} onToggleVisibility={handleToggleVisibility} widgetIconMap={WIDGET_ICON_MAP} />
      )}

      <DashboardModals
        modalsState={modalsState} onClose={handleCloseModal}
        onAddTransaction={onAddTransaction} onAddDebtOrLoan={onAddDebtOrLoan}
        onAddRecurring={onAddRecurring} onAddAccount={onAddAccount}
        onAddCategory={onAddCategory} onAddSubcategory={onAddSubcategory}
        onUpdateSubcategory={onUpdateSubcategory} onDeleteSubcategory={onDeleteSubcategory}
        onUpdateTransaction={onUpdateTransaction} onDeleteTransaction={onDeleteTransaction}
        selectedTxForDetail={selectedTxForDetail} setSelectedTxForDetail={setSelectedTxForDetail}
        selectedTxForEdit={selectedTxForEdit} setSelectedTxForEdit={setSelectedTxForEdit}
        selectedTxForReceipt={selectedTxForReceipt} setSelectedTxForReceipt={setSelectedTxForReceipt}
        accounts={accounts} categories={categories} trm={trm}
      />
    </>
  );
}

export { Dashboard, QuickActionsFab };
