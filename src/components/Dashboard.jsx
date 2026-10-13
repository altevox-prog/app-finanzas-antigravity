import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  Landmark, 
  HandCoins, 
  TrendingUp, 
  ArrowRight, 
  SlidersHorizontal,
  CalendarSync,
  Plus,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Activity,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  CreditCard,
  Receipt,
  PieChart
} from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import useDashboardMetrics from '../hooks/useDashboardMetrics';
import { 
  normalizeWidgetId
} from '../utils/widgetsConfig';
import useWidgetReorder from '../hooks/useWidgetReorder';
import QuickActionsFab from './dashboard/QuickActionsFab';
import SegmentedControl from './common/SegmentedControl';
import { MONTH_NAMES } from '../data/initialData';
import HiddenWidgetsSection from './dashboard/HiddenWidgetsSection';
import DashboardWidgetWrapper, { isWideWidget } from './dashboard/DashboardWidgetWrapper';
import { createWidgetRegistry } from './dashboard/widgetRegistry';

// Re-exports de compatibilidad para módulos que consumían widgets satélite desde Dashboard.jsx
import NetWorthWidget from './dashboard/widgets/NetWorthWidget';
import DebtsWidget from './dashboard/widgets/DebtsWidget';
import InvestmentsWidget from './dashboard/widgets/InvestmentsWidget';
import AccountsWidget from './dashboard/widgets/AccountsWidget';
import RecurringPaymentsWidget from './dashboard/widgets/RecurringPaymentsWidget';
import TRMWidget from './dashboard/widgets/TRMWidget';
import WeeklyCashflowWidget from './dashboard/widgets/WeeklyCashflowWidget';
import RecentMovementsSection, { RecentMovementsWidget, TransactionsWidget } from './dashboard/RecentMovementsSection';
import BalanceCardsWidget, {
  LiquidBalanceWidget,
  MonthlyIncomeWidget,
  MonthlyExpenseWidget,
  SavingsRateWidget
} from './dashboard/BalanceCardsWidget';

// ============================================================================
// WIDGETS SATÉLITE MODULARIZADOS (Re-exportaciones para compatibilidad)
// ============================================================================
export { 
  NetWorthWidget, 
  DebtsWidget, 
  InvestmentsWidget,
  AccountsWidget,
  RecentMovementsSection, 
  RecentMovementsWidget, 
  TransactionsWidget,
  RecurringPaymentsWidget,
  TRMWidget,
  WeeklyCashflowWidget,
  BalanceCardsWidget, 
  LiquidBalanceWidget, 
  MonthlyIncomeWidget, 
  MonthlyExpenseWidget, 
  SavingsRateWidget 
};

const WIDGET_ICON_MAP = {
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

// ============================================================================
// COMPONENTE PRINCIPAL DASHBOARD MODULAR Y DINÁMICO
// ============================================================================
export default function Dashboard({
  accounts = [],
  investments = [],
  debtsAndLoans = [],
  transactions = [],
  monthlyTransactions = null,
  categories = [],
  recurringPayments = [],
  subscriptions = [],
  monthlyStats = {},
  selectedDate = new Date(),
  selectedDay = null,
  onSelectDay = () => {},
  onOpenCalendar = () => {},
  onNavigateToTab = () => {},
  setActiveTab = null,
  onOpenTransaction = () => {},
  onOpenAddTransaction = null,
  onOpenAddDebt = null,
  onOpenAddLoan = null,
  onOpenAddRecurring = null,
  onAddDebtOrLoan = null,
  onAddRecurring = null,
  onAddTransaction = null,
  onDeleteTransaction = () => {},
  onUpdateTransaction = () => {},
  onAddCategory = () => {},
  onAddSubcategory = () => {},
  onUpdateSubcategory = () => {},
  onDeleteSubcategory = () => {},
  onAddAccount = () => {},
  onSelectCreditCardDetail = () => {},
  currentMonthLabel = '',
  trm = 4050,
  widgetsConfig = null,
  widgets: widgetsProp = null,
  onCustomizeWidgets = null,
  onSaveWidgets = null,
  allowedWidgetIds = null,
  className = null,
  financeData = {},
  financeActions = {}
}) {
  const { formatMoney } = usePrivacy();

  // Helpers unificados para navegación de pestañas y apertura de modales globales
  const navigateToTab = (rawTab) => {
    const tab = (rawTab === 'movements' || rawTab === 'movimientos') 
      ? 'transactions' 
      : (rawTab === 'inicio') 
      ? 'dashboard' 
      : (rawTab === 'cuentas') 
      ? 'accounts' 
      : rawTab;
    if (financeActions && typeof financeActions.setActiveTab === 'function') {
      financeActions.setActiveTab(tab);
    } else if (financeActions && typeof financeActions.handleTabChange === 'function') {
      financeActions.handleTabChange(tab);
    } else if (typeof onNavigateToTab === 'function') {
      onNavigateToTab(tab);
    } else if (typeof setActiveTab === 'function') {
      setActiveTab(tab);
    }
  };

  const handleOpenDebtModal = (type = 'payable') => {
    const norm = (type === 'receivable' || type === 'lent' || type === 'me_deben') ? 'receivable' : 'payable';
    if (typeof onOpenAddDebt === 'function') {
      onOpenAddDebt(norm);
    } else if (typeof onOpenAddLoan === 'function') {
      onOpenAddLoan(norm);
    } else if (financeActions && typeof financeActions.openAddDebt === 'function') {
      financeActions.openAddDebt(norm);
    } else if (financeActions && typeof financeActions.openAddLoan === 'function') {
      financeActions.openAddLoan(norm);
    } else if (financeActions && typeof financeActions.handleOpenAddDebt === 'function') {
      financeActions.handleOpenAddDebt(norm);
    } else if (financeActions && typeof financeActions.handleOpenAddLoan === 'function') {
      financeActions.handleOpenAddLoan(norm);
    } else if (typeof onAddDebtOrLoan === 'function') {
      onAddDebtOrLoan(norm);
    }
  };

  const handleOpenRecurringModal = () => {
    if (typeof onOpenAddRecurring === 'function') {
      onOpenAddRecurring();
    } else if (financeActions && typeof financeActions.openAddRecurring === 'function') {
      financeActions.openAddRecurring();
    } else if (financeActions && typeof financeActions.handleOpenAddRecurring === 'function') {
      financeActions.handleOpenAddRecurring();
    } else if (financeActions && typeof financeActions.handleOpenRecurring === 'function') {
      financeActions.handleOpenRecurring();
    }
  };

  const handleOpenTxModal = (type = 'expense') => {
    const norm = (type === 'income' || type === 'ingreso') ? 'income' : 'expense';
    if (typeof onOpenTransaction === 'function') {
      onOpenTransaction(norm);
    } else if (typeof onOpenAddTransaction === 'function') {
      onOpenAddTransaction(norm);
    } else if (financeActions && typeof financeActions.openAddTransaction === 'function') {
      financeActions.openAddTransaction(norm);
    } else if (financeActions && typeof financeActions.handleOpenAddTransaction === 'function') {
      financeActions.handleOpenAddTransaction(norm);
    } else if (financeActions && typeof financeActions.handleOpenTransaction === 'function') {
      financeActions.handleOpenTransaction(norm);
    }
  };

  // 1-6. HOOK MODULAR DE MÉTRICAS, PATRIMONIO Y FLUJO DE CAJA DEL DASHBOARD
  const {
    trmValue,
    netWorthMetrics,
    totalAccountsBalanceCOP,
    totalAssetsCOP,
    totalLiabilitiesCOP,
    netWorthCOP,
    isNetWorthPositive,
    investmentsMetrics,
    debtsAndLoansMetrics,
    scopedTransactions,
    displayTransactions,
    isTransferTx,
    totalIncome,
    totalExpense,
    netBalance,
    availableLiquidBalance,
    savingsRate,
    freeCash,
    bentoPeriodLabel,
    weeklyCashFlow,
    hoveredWeekIndex,
    setHoveredWeekIndex,
    currentPeriod,
    periodOptions,
    handlePeriodChange
  } = useDashboardMetrics({
    accounts,
    transactions,
    investments,
    debtsAndLoans,
    monthlyTransactions,
    monthlyStats,
    selectedDate,
    selectedDay,
    currentMonthLabel,
    trm,
    onSelectDay
  });

  // Manejadores seguros para categorías y cuentas
  const handleAddCategory = (cat) => {
    if (typeof onAddCategory === 'function') {
      onAddCategory(cat);
    } else if (typeof setIsNewCategoryModalOpen === 'function') {
      setIsNewCategoryModalOpen(true);
    }
  };

  const handleAddSubcategory = (catId, subcat) => {
    if (typeof onAddSubcategory === 'function') {
      onAddSubcategory(catId, subcat);
    }
  };

  const handleAddAccount = (acc) => {
    if (typeof onAddAccount === 'function') {
      onAddAccount(acc);
    }
  };

  // 7. REGISTRO Y MAPEO CENTRALIZADO DE LOS WIDGETS (WIDGET_REGISTRY)
  const WIDGET_REGISTRY = useMemo(() => {
    return createWidgetRegistry({
      netWorthCOP,
      totalAssetsCOP,
      debtsAndLoansMetrics,
      isNetWorthPositive,
      investmentsMetrics,
      availableLiquidBalance,
      netBalance,
      totalIncome,
      totalExpense,
      savingsRate,
      freeCash,
      scopedTransactions,
      displayTransactions,
      transactions,
      monthlyStats,
      selectedDate,
      selectedDay,
      currentMonthLabel,
      isTransferTx,
      accounts,
      categories,
      recurringPayments,
      subscriptions,
      trm,
      weeklyCashFlow,
      hoveredWeekIndex,
      setHoveredWeekIndex,
      currentPeriod,
      periodOptions,
      handlePeriodChange,
      bentoPeriodLabel,
      navigateToTab,
      handleOpenDebtModal,
      handleOpenTxModal,
      handleOpenRecurringModal,
      onOpenCalendar,
      onSelectDay,
      onSelectCreditCardDetail,
      financeActions,
      formatMoney
    });
  }, [
    netWorthCOP,
    totalAssetsCOP,
    debtsAndLoansMetrics,
    isNetWorthPositive,
    investmentsMetrics,
    availableLiquidBalance,
    netBalance,
    totalIncome,
    totalExpense,
    savingsRate,
    freeCash,
    scopedTransactions,
    displayTransactions,
    transactions,
    monthlyStats,
    selectedDate,
    selectedDay,
    currentMonthLabel,
    isTransferTx,
    accounts,
    categories,
    recurringPayments,
    subscriptions,
    trm,
    weeklyCashFlow,
    hoveredWeekIndex,
    setHoveredWeekIndex,
    currentPeriod,
    periodOptions,
    handlePeriodChange,
    bentoPeriodLabel,
    navigateToTab,
    handleOpenDebtModal,
    handleOpenTxModal,
    handleOpenRecurringModal,
    onOpenCalendar,
    onSelectDay,
    onSelectCreditCardDetail,
    financeActions,
    formatMoney
  ]);

  const getWidget = (id) => {
    return WIDGET_REGISTRY[normalizeWidgetId(id)] || WIDGET_REGISTRY[id] || null;
  };

  const WIDGET_COMPONENTS = WIDGET_REGISTRY;
  const WIDGET_MAP = WIDGET_REGISTRY;

  // 8. HOOK MODULAR DE REORDENAMIENTO, DRAG-AND-DROP Y VISIBILIDAD DE WIDGETS
  const {
    widgets,
    setWidgets,
    visibleWidgets,
    hiddenWidgets,
    isReordering,
    draggedIndex,
    handlePressStart,
    handlePressEnd,
    handleSwapWidgets,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleFinishReordering,
    handleToggleVisibility
  } = useWidgetReorder({
    widgetsConfig,
    widgetsProp,
    allowedWidgetIds,
    onSaveWidgets,
    getWidget
  });

  return (
    <>
      {/* Botón flotante 'Listo' estilo iOS cuando está activo el modo reorganización */}
      {isReordering && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2 bg-slate-900/90 dark:bg-slate-800/95 text-white rounded-full shadow-2xl border border-slate-700/60 backdrop-blur-md transition-all">
          <span className="text-xs font-semibold text-slate-200 pl-1 hidden sm:inline">
            Reorganizando widgets
          </span>
          <button
            type="button"
            onClick={handleFinishReordering}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-full shadow transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Listo</span>
          </button>
        </div>
      )}

      {isReordering ? (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full items-start touch-pan-y select-none ${className || ''}`}>
          {visibleWidgets.map((w, index) => {
            const widgetComponent = getWidget(w.id);
            if (!widgetComponent) return null;

            return (
              <DashboardWidgetWrapper
                key={w.id}
                id={w.id}
                index={index}
                isReordering={true}
                draggedIndex={draggedIndex}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onToggleVisibility={handleToggleVisibility}
              >
                {widgetComponent}
              </DashboardWidgetWrapper>
            );
          })}
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full items-start touch-pan-y ${className || ''}`}>
          {visibleWidgets.map((w, index) => {
            const widgetComponent = getWidget(w.id);
            if (!widgetComponent) return null;

            return (
              <DashboardWidgetWrapper
                key={w.id}
                id={w.id}
                index={index}
                isReordering={false}
                onPressStart={handlePressStart}
                onPressEnd={handlePressEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {widgetComponent}
              </DashboardWidgetWrapper>
            );
          })}
        </div>
      )}

      {/* Bandeja de widgets ocultos (visible durante reorganización) */}
      {isReordering && (
        <HiddenWidgetsSection
          hiddenWidgets={hiddenWidgets}
          onToggleVisibility={handleToggleVisibility}
          widgetIconMap={WIDGET_ICON_MAP}
        />
      )}

      {/* Fin de los widgets modulares del Dashboard */}
    </>
  );
}

export { Dashboard, QuickActionsFab };
