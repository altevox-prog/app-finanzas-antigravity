import React, { useState, useEffect } from 'react';
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

  // Detección responsive para límites adaptativos de transacciones (móvil vs escritorio)
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const updateMatch = (e) => setIsDesktopViewport(e.matches);
    setIsDesktopViewport(media.matches);
    if (media.addEventListener) {
      media.addEventListener('change', updateMatch);
      return () => media.removeEventListener('change', updateMatch);
    } else if (media.addListener) {
      media.addListener(updateMatch);
      return () => media.removeListener(updateMatch);
    }
  }, []);

  const isEffectiveDesktop = isForcedDesktop || (!isForcedMobile && isDesktopViewport);
  const recentTxLimit = 4;

  const handleSelectTransaction = (tx) => {
    if (!tx || typeof tx !== 'object') return;
    setSelectedTxForDetail(tx);
  };

  const handleCloseModal = (type) => setModalsState(prev => ({ 
    ...prev, [`is${type ? type.charAt(0).toUpperCase() + type.slice(1) : ''}ModalOpen`]: false 
  }));

  const navigateToTab = (rawTab, extra) => {
    const tab = (rawTab === 'movements' || rawTab === 'movimientos') ? 'transactions' : (rawTab === 'inicio') ? 'dashboard' : (rawTab === 'cuentas') ? 'accounts' : rawTab;
    if (financeActions?.setActiveTab) financeActions.setActiveTab(tab, extra);
    else if (financeActions?.handleTabChange) financeActions.handleTabChange(tab, extra);
    else if (typeof onNavigateToTab === 'function') onNavigateToTab(tab, extra);
    else if (typeof setActiveTab === 'function') setActiveTab(tab, extra);
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
    const norm = (type === 'income' || type === 'ingreso') 
      ? 'income' 
      : (type === 'transfer' || type === 'transferencia') 
        ? 'transfer' 
        : 'expense';
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

  const hasWidget = (id) => {
    const norm = normalizeWidgetId(id);
    return visibleWidgets.some(w => normalizeWidgetId(w.id) === norm);
  };

  const getWidgetIndex = (id) => {
    const norm = normalizeWidgetId(id);
    const idx = visibleWidgets.findIndex(w => normalizeWidgetId(w.id) === norm);
    return idx >= 0 ? idx : 0;
  };

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

      {/* Bento Grid Principal In-Situ (Estructura Unificada para Lectura y Edición) */}
      <div className={`w-full max-w-[1600px] mx-auto px-3 sm:px-6 py-4 space-y-6 ${className || ''}`}>
        {/* 1. Header Saludo */}
        <div className={`${isForcedDesktop ? 'block' : 'hidden lg:block'} pt-1`}>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Hola, {userName}
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Resumen financiero de {currentMonthLabel || 'este mes'}
          </p>
        </div>

        {/* 1. FILA 1: HERO HEADER FIJO (Inmóvil, permanente, no reordenable) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch w-full mb-6">
          <div className={`${isForcedDesktop ? 'lg:col-span-7 xl:col-span-8' : (isForcedMobile ? 'col-span-1' : 'lg:col-span-7 xl:col-span-8')} flex flex-col`}>
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
          </div>

          <div className={`${isForcedDesktop ? 'lg:col-span-5 xl:col-span-4' : (isForcedMobile ? 'col-span-1' : 'lg:col-span-5 xl:col-span-4')} flex flex-col h-full [&>div]:h-full`}>
            <MonthlyNetHeroCard
              netBalance={metrics.netBalance}
              totalIncome={metrics.totalIncome}
              totalExpense={metrics.totalExpense}
              savingsRate={metrics.savingsRate}
              transactions={transactions}
              monthlyTransactions={monthlyTransactions || metrics.scopedTransactions}
              selectedDate={selectedDate}
              selectedDay={selectedDay}
              currentMonthLabel={currentMonthLabel}
              onOpenCalendar={onOpenCalendar}
              onOpenMonthPicker={onOpenMonthPicker || onOpenCalendar}
              formatMoney={formatMoney}
              trm={trm}
            />
          </div>
        </div>

        {/* 2. CONTENEDOR PRINCIPAL: MACRO BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start w-full">
          
          {/* COLUMNA IZQUIERDA: Operativa y Patrimonial (lg:col-span-7 xl:col-span-8) */}
          <div className={`${isForcedDesktop ? 'lg:col-span-7 xl:col-span-8' : (isForcedMobile ? 'col-span-1' : 'lg:col-span-7 xl:col-span-8')} flex flex-col gap-5 sm:gap-6`}>
            {/* 1. Actividad de Gastos */}
            {hasWidget('weekly_cashflow') && (
              <DashboardWidgetWrapper
                id="weekly_cashflow"
                index={getWidgetIndex('weekly_cashflow')}
                isReordering={isReordering}
                draggedIndex={draggedIndex}
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
                <WeeklyExpensesChart
                  transactions={transactions}
                  selectedDate={selectedDate}
                  selectedDay={selectedDay}
                  currentMonthLabel={currentMonthLabel}
                  formatMoney={formatMoney}
                  onSelectWeek={(weekData, maybeRange) => {
                    const weekNum = typeof weekData === 'object'
                      ? (weekData?.start ? Math.ceil(weekData.start / 7) : parseInt(String(weekData?.label || '').replace(/\D/g, ''), 10) || 1)
                    : weekData;
                    const weekRange = typeof weekData === 'object' ? weekData?.range : maybeRange;
                    navigateToTab('transactions', { week: weekNum, weekRange, weekData });
                  }}
                />
              </DashboardWidgetWrapper>
            )}

            {/* 2. Préstamos e Inversiones (Lado a Lado) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch w-full">
              {hasWidget('debts_loans') && (
                <div className="w-full h-full">
                  <DashboardWidgetWrapper
                    id="debts_loans"
                    index={getWidgetIndex('debts_loans')}
                    isReordering={isReordering}
                    draggedIndex={draggedIndex}
                    className="h-full"
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
                    {getWidget('debts_loans') || getWidget('debts')}
                  </DashboardWidgetWrapper>
                </div>
              )}

              {hasWidget('investments') && (
                <div className="w-full h-full">
                  <DashboardWidgetWrapper
                    id="investments"
                    index={getWidgetIndex('investments')}
                    isReordering={isReordering}
                    draggedIndex={draggedIndex}
                    className="h-full"
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
                    {getWidget('investments')}
                  </DashboardWidgetWrapper>
                </div>
              )}
            </div>

            {/* 3. Tasa de Ahorro y Presupuesto Mensual (Lado a Lado en Columna Izquierda) */}
            {(hasWidget('savings_rate') || hasWidget('budget')) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch w-full">
                {hasWidget('savings_rate') && (
                  <div className="w-full h-full">
                    <DashboardWidgetWrapper
                      id="savings_rate"
                      index={getWidgetIndex('savings_rate')}
                      isReordering={isReordering}
                      draggedIndex={draggedIndex}
                      className="h-full"
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
                      {getWidget('savings_rate')}
                    </DashboardWidgetWrapper>
                  </div>
                )}

                {hasWidget('budget') && (
                  <div className="w-full h-full">
                    <DashboardWidgetWrapper
                      id="budget"
                      index={getWidgetIndex('budget')}
                      isReordering={isReordering}
                      draggedIndex={draggedIndex}
                      className="h-full"
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
                      {getWidget('budget')}
                    </DashboardWidgetWrapper>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: Analítica y Flujo (lg:col-span-5 xl:col-span-4) */}
          <div className={`${isForcedDesktop ? 'lg:col-span-5 xl:col-span-4' : (isForcedMobile ? 'col-span-1' : 'lg:col-span-5 xl:col-span-4')} flex flex-col gap-5 sm:gap-6`}>
            {/* 1. Tus Gastos (Dona) */}
            {hasWidget('expenses_category') && (
              <DashboardWidgetWrapper
                id="expenses_category"
                index={getWidgetIndex('expenses_category')}
                isReordering={isReordering}
                draggedIndex={draggedIndex}
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
                {getWidget('expenses_category') || getWidget('expenses_chart') || getWidget('tus_gastos') || getWidget('donut')}
              </DashboardWidgetWrapper>
            )}

            {/* 2. Pagos Recurrentes (Integrado en la columna derecha para cerrar el hueco) */}
            {hasWidget('recurring_payments') && (
              <DashboardWidgetWrapper
                id="recurring_payments"
                index={getWidgetIndex('recurring_payments')}
                isReordering={isReordering}
                draggedIndex={draggedIndex}
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
                {getWidget('recurring_payments') || <RecurringPaymentsWidget recurringPayments={recurringPayments} subscriptions={subscriptions} />}
              </DashboardWidgetWrapper>
            )}

            {/* 3. Movimientos Recientes */}
            {hasWidget('recent_movements') && (
              <DashboardWidgetWrapper
                id="recent_movements"
                index={getWidgetIndex('recent_movements')}
                isReordering={isReordering}
                draggedIndex={draggedIndex}
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
                <RecentMovementsSection
                  transactions={transactions.slice(0, recentTxLimit)}
                  accounts={accounts}
                  onSelectTransaction={handleSelectTransaction}
                  onNavigateToMovements={() => navigateToTab('transactions')}
                  onNavigateToTab={navigateToTab}
                  setActiveTab={navigateToTab}
                  onAddTransaction={handleOpenTxModal}
                  compactMode={false}
                  formatMoney={formatMoney}
                  limit={recentTxLimit}
                />
              </DashboardWidgetWrapper>
            )}
          </div>

        </div>



        {/* Sección de widgets ocultos en modo reorganización */}
        {isReordering && hiddenWidgets && hiddenWidgets.length > 0 && (
          <HiddenWidgetsSection 
            hiddenWidgets={hiddenWidgets} 
            onToggleVisibility={handleToggleVisibility} 
            widgetIconMap={WIDGET_ICON_MAP} 
          />
        )}
      </div>

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
