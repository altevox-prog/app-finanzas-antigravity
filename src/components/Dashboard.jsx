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
import { getAccountNativeBalance, formatNativeCurrency } from '../utils/currencyUtils';
import { 
  toSafeNumber, 
  safeNumber,
  calculateSavingsRate, 
  calculateNetFlow,
  calculateNetWorth
} from '../utils/financeMath';
import { 
  getStoredWidgetsConfig, 
  saveStoredWidgetsConfig,
  normalizeWidgetId,
  DEFAULT_WIDGETS_CONFIG
} from '../utils/widgetsConfig';
import BalanceWidget from './BalanceWidget';
import BudgetWidget from './BudgetWidget';
import ReportsAndCharts from './ReportsAndCharts';
import AccountsWidgetComponent from './AccountsWidget';
import RecentMovementsSection, { RecentMovementsWidget, TransactionsWidget } from './dashboard/RecentMovementsSection';
import BentoMetricsGrid from './common/BentoMetricsGrid';
import WeeklyExpensesChart from './dashboard/WeeklyExpensesChart';
import BalanceCardsWidget, {
  LiquidBalanceWidget,
  MonthlyIncomeWidget,
  MonthlyExpenseWidget,
  SavingsRateWidget
} from './dashboard/BalanceCardsWidget';
import SegmentedControl from './common/SegmentedControl';
import { MONTH_NAMES } from '../data/initialData';

// ============================================================================
// SUBCOMPONENTE 1: WIDGET DE PATRIMONIO TOTAL NETO
// ============================================================================
export function NetWorthWidget({
  netWorthCOP = 0,
  totalAssetsCOP = 0,
  totalPayableCOP = 0,
  isNetWorthPositive = true,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`,
  onNavigateToTab = () => {},
  setActiveTab = null
}) {
  const handleNav = (tab = 'accounts') => {
    if (typeof onNavigateToTab === 'function') onNavigateToTab(tab);
    else if (typeof setActiveTab === 'function') setActiveTab(tab);
  };

  return (
    <div 
      onClick={() => handleNav('accounts')}
      className="min-h-[140px] p-5 sm:p-6 bg-white dark:bg-zinc-900/90 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Patrimonio Total</span>
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
            isNetWorthPositive 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}>
            {isNetWorthPositive ? 'Solvente' : 'Pasivo Alto'}
          </span>
        </div>

        <div className="mt-1">
          <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-zinc-100 leading-none">
            {formatMoney(netWorthCOP)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 font-mono">
            Activos totales: <strong className="text-slate-700 dark:text-zinc-300 font-bold font-mono tracking-tight tabular-nums">{formatMoney(totalAssetsCOP)}</strong>
          </p>
        </div>
      </div>

      <div className="pt-3 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-500 dark:text-zinc-400 font-medium">
          Debo actualmente:
        </span>
        <span className="font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
          -{formatMoney(totalPayableCOP)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTE 2: WIDGET DE PRÉSTAMOS Y DEUDAS
// ============================================================================
export function DebtsWidget({
  debtsAndLoansMetrics = { totalReceivableCOP: 0, totalPayableCOP: 0, receivableCount: 0, payableCount: 0 },
  onNavigateToTab = () => {},
  setActiveTab = null,
  onOpenAddDebt = null,
  onOpenAddLoan = null,
  setIsNewDebtModalOpen = null,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`
}) {
  const handleNav = (tab = 'debts') => {
    if (typeof onNavigateToTab === 'function') onNavigateToTab(tab);
    else if (typeof setActiveTab === 'function') setActiveTab(tab);
  };

  const handleAdd = (e, type = 'payable') => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (typeof onOpenAddDebt === 'function') {
      onOpenAddDebt(type);
    } else if (typeof setIsNewDebtModalOpen === 'function') {
      setIsNewDebtModalOpen(true);
    } else if (typeof onOpenAddLoan === 'function') {
      onOpenAddLoan(type);
    } else {
      handleNav('debts');
    }
  };

  const totalActivos = (debtsAndLoansMetrics.receivableCount || 0) + (debtsAndLoansMetrics.payableCount || 0);

  return (
    <div 
      onClick={() => handleNav('debts')}
      className="min-h-[140px] p-5 sm:p-6 bg-white dark:bg-zinc-900/90 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <HandCoins className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Préstamos y Deudas</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-semibold">
              {totalActivos} activos
            </span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAdd(e, 'payable');
              }}
              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm"
              title="Añadir deuda o préstamo"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </div>
        </div>

        {/* Bloque resumido y armonizado */}
        <div className="grid grid-cols-2 gap-2 my-1">
          <div 
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAdd(e, 'receivable');
            }}
            className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors cursor-pointer"
            title="Registrar préstamo que me deben"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block truncate">
              Me deben ({debtsAndLoansMetrics.receivableCount || 0})
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight block mt-0.5 truncate">
              {formatMoney(debtsAndLoansMetrics.totalReceivableCOP)}
            </span>
          </div>

          <div 
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAdd(e, 'payable');
            }}
            className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 transition-colors cursor-pointer"
            title="Registrar deuda que debo pagar"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 block truncate">
              Debo ({debtsAndLoansMetrics.payableCount || 0})
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums tracking-tight block mt-0.5 truncate">
              -{formatMoney(debtsAndLoansMetrics.totalPayableCOP)}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
        <span className="text-slate-400 text-[11px] font-medium font-mono">
          Balance crediticio neto
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNav('debts');
          }}
          className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform hover:underline cursor-pointer"
        >
          <span>Gestionar</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTE 3: WIDGET DE INVERSIONES
// ============================================================================
export function InvestmentsWidget({
  investmentsMetrics = { totalCurrentValueCOP: 0, totalInvestedCostCOP: 0, netProfitCOP: 0, profitPercentage: 0, isPositive: true },
  onNavigateToTab = () => {},
  setActiveTab = null,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`
}) {
  const handleNav = (tab = 'investments') => {
    if (typeof onNavigateToTab === 'function') onNavigateToTab(tab);
    else if (typeof setActiveTab === 'function') setActiveTab(tab);
  };

  return (
    <div 
      onClick={() => handleNav('investments')}
      className="min-h-[140px] p-5 sm:p-6 bg-white dark:bg-zinc-900/90 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Inversiones</span>
          </span>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono tabular-nums border ${
              investmentsMetrics.isPositive 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}>
              {investmentsMetrics.isPositive ? '+' : ''}{investmentsMetrics.profitPercentage.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="mt-1">
          <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-zinc-100 leading-none">
            {formatMoney(investmentsMetrics.totalCurrentValueCOP)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 font-mono">
            Capital invertido: <strong className="text-slate-700 dark:text-zinc-300 font-bold font-mono tracking-tight tabular-nums">{formatMoney(investmentsMetrics.totalInvestedCostCOP)}</strong>
          </p>
        </div>
      </div>

      <div className="pt-3 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-500 dark:text-zinc-400 font-medium">
          Rentabilidad neta:
        </span>
        <span className={`font-bold font-mono tracking-tight tabular-nums ${
          investmentsMetrics.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}>
          {investmentsMetrics.isPositive ? '+' : ''}{formatMoney(investmentsMetrics.netProfitCOP)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTE 4: WIDGET DE MIS CUENTAS (Carrusel)
// ============================================================================
export function AccountsWidget(props) {
  return <AccountsWidgetComponent {...props} />;
}

// ============================================================================
// SUBCOMPONENTE 5: WIDGET DE MOVIMIENTOS RECIENTES (Modularizado)
// ============================================================================
export { RecentMovementsSection, RecentMovementsWidget, TransactionsWidget };

// ============================================================================
// SUBCOMPONENTE 6: WIDGET DE PAGOS RECURRENTES
// ============================================================================
export function RecurringPaymentsWidget({
  recurringPayments = [],
  subscriptions = [],
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`,
  onNavigateToTab = () => {},
  setActiveTab = null,
  onOpenAddRecurring = null,
  setIsRecurringModalOpen = null
}) {
  const handleNav = (tab = 'recurring') => {
    if (typeof onNavigateToTab === 'function') onNavigateToTab(tab);
    else if (typeof setActiveTab === 'function') setActiveTab(tab);
  };

  const handleAdd = (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (typeof onOpenAddRecurring === 'function') {
      onOpenAddRecurring();
    } else if (typeof setIsRecurringModalOpen === 'function') {
      setIsRecurringModalOpen(true);
    } else {
      handleNav('recurring');
    }
  };

  const allRecurring = recurringPayments.length > 0 ? recurringPayments : subscriptions;
  const activeRecurring = allRecurring.filter(r => r.isActive !== false);
  const totalMonth = activeRecurring.reduce((sum, item) => {
    const amt = safeNumber(item.amount);
    if (item.type === 'income') return sum;
    if (item.frequency === 'yearly') return sum + Math.round(amt / 12);
    if (item.frequency === 'biweekly') return sum + (amt * 2);
    if (item.frequency === 'weekly') return sum + Math.round(amt * 4.33);
    return sum + amt;
  }, 0);

  return (
    <div 
      onClick={() => handleNav('recurring')}
      className="min-h-[140px] p-4 sm:p-5 bg-white dark:bg-zinc-900/90 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group overflow-hidden"
    >
      <div>
        {/* Cabecera interna limpia ([📅] Gasto fijo proyectado) sin elementos flotantes externos */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 min-w-0">
            <CalendarSync className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate uppercase">GASTO FIJO PROYECTADO</span>
          </span>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAdd(e);
            }}
            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
            title="Añadir nuevo pago recurrente"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir</span>
          </button>
        </div>

        {/* Cuerpo */}
        <div className="mt-1">
          {activeRecurring.length === 0 ? (
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Sin pagos activos
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                No tienes suscripciones o pagos periódicos este mes.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-zinc-100 leading-none">
                  {formatMoney(totalMonth)}
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  / mes
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                Total programado para el período
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer homogéneo */}
      <div className="pt-3 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          Pagos periódicos
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNav('recurring');
          }}
          className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform hover:underline cursor-pointer"
        >
          <span>Gestionar</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTE 7: WIDGET TRM OFICIAL
// ============================================================================
export function TRMWidget({ trm = 4050 }) {
  return (
    <div className="flex items-center justify-between p-3 px-3.5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white">TRM Oficial</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">USD/COP</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Sincronizada automáticamente • Superfinanciera
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className="text-sm font-extrabold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
          ${Number(trm || 4050).toLocaleString('es-CO')}
        </span>
        <span className="text-[9px] text-slate-400 block font-semibold uppercase tracking-wider">COP</span>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTES 8 A 11: WIDGETS DE BALANCES Y CUENTAS (Modularizados)
// ============================================================================
export { 
  BalanceCardsWidget, 
  LiquidBalanceWidget, 
  MonthlyIncomeWidget, 
  MonthlyExpenseWidget, 
  SavingsRateWidget 
};

// ============================================================================
// SUBCOMPONENTE 12: WIDGET DE FLUJO DE CAJA SEMANAL
// ============================================================================
export function WeeklyCashflowWidget({
  weeklyCashFlow,
  hoveredWeekIndex,
  setHoveredWeekIndex,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`,
  currentPeriod,
  setPeriod,
  periodOptions = [
    { id: 'month', label: 'Mensual' },
    { id: 'week', label: 'Semanal' },
    { id: 'day', label: 'Diario' }
  ]
}) {
  const weeks = weeklyCashFlow?.weeks || [];
  const maxVal = weeklyCashFlow?.maxVal || 100000;

  return (
    <div 
      className="p-5 sm:p-6 bg-white dark:bg-zinc-900/90 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Flujo de caja semanal
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Ingresos vs. gastos
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Distribución acumulada a lo largo del mes en curso
          </p>
        </div>

        <div className="flex items-center gap-3">
          {setPeriod && (
            <div className="w-56 sm:w-60">
              <SegmentedControl
                options={periodOptions}
                value={currentPeriod}
                onChange={setPeriod}
                size="sm"
              />
            </div>
          )}

          <div className="hidden sm:flex items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">Ingresos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-600 dark:text-slate-300">Gastos</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <div className="grid grid-cols-5 gap-2 sm:gap-4 h-48 sm:h-52 items-end pt-6 pb-2 px-2 border-b border-slate-100 dark:border-white/5">
          {weeks.map((week, idx) => {
            const incomeHeight = Math.max(6, Math.round((week.income / maxVal) * 160));
            const expenseHeight = Math.max(6, Math.round((week.expense / maxVal) * 160));
            const isHovered = hoveredWeekIndex === idx;

            return (
              <div
                key={week.name}
                onMouseEnter={() => setHoveredWeekIndex && setHoveredWeekIndex(idx)}
                onMouseLeave={() => setHoveredWeekIndex && setHoveredWeekIndex(null)}
                className={`flex flex-col items-center justify-end h-full group relative transition-all ${
                  isHovered ? 'opacity-100' : 'hover:opacity-90'
                }`}
              >
                {isHovered && (
                  <div className="absolute -top-14 z-20 px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-black text-white text-[11px] shadow-xl border border-white/10 pointer-events-none whitespace-nowrap animate-fadeIn flex flex-col gap-0.5">
                    <span className="text-emerald-400 font-bold">+{formatMoney(week.income)}</span>
                    <span className="text-rose-400 font-bold">-{formatMoney(week.expense)}</span>
                  </div>
                )}

                <div className="flex items-end gap-1.5 sm:gap-2 w-full justify-center">
                  <div className="w-3.5 sm:w-5 bg-slate-100 dark:bg-white/5 rounded-t-xl overflow-hidden flex items-end">
                    <div
                      className="w-full bg-emerald-500 rounded-t-xl transition-all duration-700 group-hover:brightness-110 shadow-sm"
                      style={{ height: `${incomeHeight}px` }}
                    />
                  </div>
                  <div className="w-3.5 sm:w-5 bg-slate-100 dark:bg-white/5 rounded-t-xl overflow-hidden flex items-end">
                    <div
                      className="w-full bg-rose-500 rounded-t-xl transition-all duration-700 group-hover:brightness-110 shadow-sm"
                      style={{ height: `${expenseHeight}px` }}
                    />
                  </div>
                </div>

                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-2 block">
                  {week.name}
                </span>
                <span className="text-[9px] text-slate-400 block -mt-0.5">
                  {week.range}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
  const trmValue = toSafeNumber(trm) || 4050;

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

  // 1-4. CÁLCULO ESTRICTO DE PATRIMONIO TOTAL (ECUACIÓN PATRIMONIAL)
  // Activos Totales: Suma de saldos de todas las cuentas + total valor actual de inversiones + préstamos que te deben / por cobrar (lent).
  // Pasivos Totales: Suma de todas las deudas que debes / por pagar (borrowed).
  // Patrimonio Neto: Activos Totales - Pasivos Totales.
  const netWorthMetrics = useMemo(() => {
    return calculateNetWorth({
      accounts,
      transactions,
      investments,
      debtsAndLoans,
      trm: trmValue,
      getAccountBalanceFn: getAccountNativeBalance
    });
  }, [accounts, transactions, investments, debtsAndLoans, trmValue]);

  const totalAccountsBalanceCOP = netWorthMetrics.totalAccountsBalanceCOP;
  const totalAssetsCOP = netWorthMetrics.totalAssetsCOP;
  const totalLiabilitiesCOP = netWorthMetrics.totalLiabilitiesCOP;
  const netWorthCOP = netWorthMetrics.netWorthCOP;
  const isNetWorthPositive = netWorthMetrics.isNetWorthPositive;

  // 2. MÉTRICAS DETALLADAS DE INVERSIONES
  const investmentsMetrics = useMemo(() => {
    const totalCurrentValueCOP = netWorthMetrics.totalInvestmentsValueCOP;
    const totalInvestedCostCOP = netWorthMetrics.totalInvestmentsCostCOP;
    const netProfitCOP = totalCurrentValueCOP - totalInvestedCostCOP;
    const profitPercentage = totalInvestedCostCOP > 0 ? (netProfitCOP / totalInvestedCostCOP) * 100 : 0;

    return {
      totalCurrentValueCOP,
      totalInvestedCostCOP,
      netProfitCOP,
      profitPercentage,
      isPositive: netProfitCOP >= 0
    };
  }, [netWorthMetrics]);

  // 3. MÉTRICAS DETALLADAS DE PRÉSTAMOS Y DEUDAS
  const debtsAndLoansMetrics = useMemo(() => {
    return {
      totalReceivableCOP: netWorthMetrics.totalReceivableCOP,
      totalPayableCOP: netWorthMetrics.totalPayableCOP,
      receivableCount: netWorthMetrics.receivableCount,
      payableCount: netWorthMetrics.payableCount
    };
  }, [netWorthMetrics]);

  // 5. FILTRADO DE TRANSACCIONES PARA BALANCE Y LISTA RECIENTE
  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();
  const scopedTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date + 'T00:00:00');
      if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return false;
      if (selectedDay && String(t.date).split('T')[0] !== String(selectedDay).split('T')[0]) return false;
      return true;
    });
  }, [transactions, currentYear, currentMonth, selectedDay]);

  const displayTransactions = useMemo(() => {
    if (selectedDay) {
      const targetDay = String(selectedDay).split('T')[0];
      return (transactions || []).filter(t => t && t.date && String(t.date).split('T')[0] === targetDay);
    }
    return monthlyTransactions || scopedTransactions;
  }, [transactions, monthlyTransactions, scopedTransactions, selectedDay]);

  const isTransferTx = (t) => Boolean(
    t && (
      t.isTransfer ||
      t.is_transfer ||
      t.type === 'transfer' ||
      t.type === 'transferencia' ||
      t.categoryId === 'cat-transfer' ||
      t.category_id === 'cat-transfer' ||
      t.subcategoryId === 'sub-transfer-in' ||
      t.subcategoryId === 'sub-transfer-out'
    )
  );

  // 6. CÁLCULO DE MÉTRICAS MENSUALES O DIARIAS Y FLUJO SEMANAL
  const totalIncome = useMemo(() => {
    if (selectedDay) {
      return scopedTransactions
        .filter(t => (t?.type === 'income' || t?.type === 'ingreso') && !isTransferTx(t))
        .reduce((sum, t) => sum + safeNumber(t?.amount), 0);
    }
    return toSafeNumber(monthlyStats.totalIncome);
  }, [selectedDay, scopedTransactions, monthlyStats.totalIncome]);

  const totalExpense = useMemo(() => {
    if (selectedDay) {
      return scopedTransactions
        .filter(t => (t?.type === 'expense' || t?.type === 'gasto') && !isTransferTx(t))
        .reduce((sum, t) => sum + safeNumber(t?.amount), 0);
    }
    return toSafeNumber(monthlyStats.totalExpense);
  }, [selectedDay, scopedTransactions, monthlyStats.totalExpense]);

  const netBalance = selectedDay 
    ? calculateNetFlow(totalIncome, totalExpense)
    : (monthlyStats.netBalance !== undefined ? toSafeNumber(monthlyStats.netBalance) : calculateNetFlow(totalIncome, totalExpense));
  const availableLiquidBalance = toSafeNumber(monthlyStats.availableLiquidBalance);
  const savingsRate = calculateSavingsRate(totalIncome, totalExpense);
  const freeCash = Math.max(0, netBalance);

  const bentoPeriodLabel = selectedDay
    ? `Día ${parseInt(selectedDay.split('-')[2], 10)} · ${(MONTH_NAMES?.[selectedDate.getMonth()] || '').slice(0, 3)}`
    : (currentMonthLabel || (MONTH_NAMES?.[selectedDate.getMonth()] ? `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}` : 'Mes en curso'));

  const [hoveredWeekIndex, setHoveredWeekIndex] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState(selectedDay ? 'day' : 'month');

  useEffect(() => {
    if (selectedDay && currentPeriod !== 'day') {
      setCurrentPeriod('day');
    } else if (!selectedDay && currentPeriod === 'day') {
      setCurrentPeriod('month');
    }
  }, [selectedDay]);

  const periodOptions = useMemo(() => [
    { id: 'month', label: 'Mensual' },
    { id: 'week', label: 'Semanal' },
    { id: 'day', label: 'Diario' }
  ], []);

  const handlePeriodChange = (newPeriod) => {
    setCurrentPeriod(newPeriod);
    if (newPeriod === 'month') {
      if (typeof onSelectDay === 'function') onSelectDay(null);
    } else if (newPeriod === 'day') {
      const today = new Date().toISOString().split('T')[0];
      if (typeof onSelectDay === 'function') onSelectDay(selectedDay || today);
    }
  };

  const weeklyCashFlow = useMemo(() => {
    const weeks = [
      { name: 'Sem 1', range: 'Días 1 - 7', start: 1, end: 7, income: 0, expense: 0 },
      { name: 'Sem 2', range: 'Días 8 - 14', start: 8, end: 14, income: 0, expense: 0 },
      { name: 'Sem 3', range: 'Días 15 - 21', start: 15, end: 21, income: 0, expense: 0 },
      { name: 'Sem 4', range: 'Días 22 - 28', start: 22, end: 28, income: 0, expense: 0 },
      { name: 'Sem 5', range: 'Días 29+', start: 29, end: 31, income: 0, expense: 0 }
    ];

    scopedTransactions.forEach((tx) => {
      if (!tx || !tx.date) return;
      const type = String(tx.type || '').toLowerCase();
      const isTransfer = Boolean(
        tx.isTransfer ||
        tx.is_transfer ||
        type === 'transfer' ||
        type === 'transferencia' ||
        tx.categoryId === 'cat-transfer' ||
        tx.category_id === 'cat-transfer' ||
        tx.subcategoryId === 'sub-transfer-in' ||
        tx.subcategoryId === 'sub-transfer-out'
      );
      if (isTransfer) return;

      const day = parseInt(tx.date.split('-')[2], 10);
      const amt = safeNumber(tx.amount);
      const targetWeek = weeks.find((w) => day >= w.start && day <= w.end);
      if (targetWeek) {
        if (type === 'income' || type === 'ingreso') targetWeek.income += amt;
        if (type === 'expense' || type === 'gasto') targetWeek.expense += amt;
      }
    });

    const maxVal = Math.max(
      ...weeks.map((w) => Math.max(w.income, w.expense)),
      100000
    );

    return { weeks, maxVal };
  }, [scopedTransactions]);

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

  // 7. REGISTRO Y MAPEO CENTRALIZADO DE LOS 12 WIDGETS REALES (WIDGET_REGISTRY)
  const WIDGET_REGISTRY = {
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

  const getWidget = (id) => {
    return WIDGET_REGISTRY[normalizeWidgetId(id)] || WIDGET_REGISTRY[id] || null;
  };

  const WIDGET_COMPONENTS = WIDGET_REGISTRY;
  const WIDGET_MAP = WIDGET_REGISTRY;

  // 8. ESTADO CENTRAL DEL DASHBOARD BASADO EN CONFIGURACIÓN GUARDADA
  const [widgets, setWidgets] = useState(() => {
    const candidate = widgetsConfig || widgetsProp;
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
    return getStoredWidgetsConfig();
  });

  // 9. ESTADOS Y REFERENCIAS PARA INTERACCIÓN ESTILO IOS (LONG PRESS & DRAG-AND-DROP)
  const [isReordering, setIsReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const longPressTimerRef = useRef(null);
  const pressedIndexRef = useRef(null);
  const draggedIndexRef = useRef(null);
  const widgetsRef = useRef(widgets);
  const isReorderingRef = useRef(isReordering);
  const touchStartPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  useEffect(() => {
    isReorderingRef.current = isReordering;
  }, [isReordering]);

  // Serialización primitiva para evitar bucles infinitos de renderizado
  const serializedCandidateConfig = useMemo(() => {
    const candidate = widgetsConfig || widgetsProp;
    if (Array.isArray(candidate) && candidate.length > 0) {
      try {
        return JSON.stringify(candidate);
      } catch (_) {
        return '';
      }
    }
    return '';
  }, [widgetsConfig, widgetsProp]);

  // Sincronización segura de widgets con props: solo si no está en reorganización y si los datos realmente cambiaron
  useEffect(() => {
    if (isReorderingRef.current || !serializedCandidateConfig) return;
    try {
      const currentSerialized = JSON.stringify(widgetsRef.current);
      if (serializedCandidateConfig !== currentSerialized) {
        const parsed = JSON.parse(serializedCandidateConfig);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWidgets(parsed);
        }
      }
    } catch (_) {}
  }, [serializedCandidateConfig]);

  useEffect(() => {
    let isMounted = true;
    const handleSync = (e) => {
      if (isReorderingRef.current) return;
      try {
        const next = (e?.detail && Array.isArray(e.detail) && e.detail.length > 0)
          ? e.detail
          : getStoredWidgetsConfig();
        const nextStr = JSON.stringify(next);
        const currStr = JSON.stringify(widgetsRef.current);
        if (nextStr !== currStr) {
          queueMicrotask(() => {
            if (isMounted && !isReorderingRef.current) {
              setWidgets(next);
            }
          });
        }
      } catch (_) {}
    };

    window.addEventListener('monety_widgets_order_v2_updated', handleSync);
    window.addEventListener('monety_widgets_config_updated', handleSync);
    window.addEventListener('presu_widget_order_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      isMounted = false;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      window.removeEventListener('monety_widgets_order_v2_updated', handleSync);
      window.removeEventListener('monety_widgets_config_updated', handleSync);
      window.removeEventListener('presu_widget_order_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Disparador háptico seguro contra bloqueos de intervención del navegador
  const triggerHaptic = (pattern = 50) => {
    try {
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        if (typeof document !== 'undefined' && typeof document.hasFocus === 'function' && !document.hasFocus()) {
          return;
        }
        if (typeof navigator.userActivation !== 'undefined' && !navigator.userActivation.hasBeenActive) {
          return;
        }
        navigator.vibrate(pattern);
      }
    } catch (_) {
      // Silenciar intervención de seguridad del navegador
    }
  };

  // Handlers para detección de pulsación prolongada (500ms)
  const handlePressStart = (index = null) => {
    if (isReorderingRef.current) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    if (index !== null) {
      pressedIndexRef.current = index;
    }
    longPressTimerRef.current = setTimeout(() => {
      setIsReordering(true);
      if (pressedIndexRef.current !== null && pressedIndexRef.current !== undefined) {
        draggedIndexRef.current = pressedIndexRef.current;
        setDraggedIndex(pressedIndexRef.current);
      }
      triggerHaptic(50);
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pressedIndexRef.current = null;
  };

  // Intercambio atómico unificado para Drag & Drop (Ratón en PC y Táctil en Móvil)
  const handleSwapWidgets = (targetIndex) => {
    const currentIndex = draggedIndexRef.current;
    if (currentIndex === null || currentIndex === undefined || currentIndex === targetIndex) {
      return;
    }

    setWidgets((prevWidgets) => {
      const visibleList = prevWidgets.filter(w => {
        if (!w.visible) return false;
        if (allowedWidgetIds && Array.isArray(allowedWidgetIds)) {
          const norm = normalizeWidgetId(w.id);
          if (!allowedWidgetIds.includes(norm) && !allowedWidgetIds.includes(w.id)) return false;
        }
        return Boolean(getWidget(w.id));
      });

      const sourceItem = visibleList[currentIndex];
      const targetItem = visibleList[targetIndex];

      if (!sourceItem || !targetItem || sourceItem.id === targetItem.id) {
        return prevWidgets;
      }

      const fromIndexInPrev = prevWidgets.findIndex(w => w.id === sourceItem.id);
      const toIndexInPrev = prevWidgets.findIndex(w => w.id === targetItem.id);

      if (fromIndexInPrev === -1 || toIndexInPrev === -1) {
        return prevWidgets;
      }

      const updated = [...prevWidgets];
      const [moved] = updated.splice(fromIndexInPrev, 1);
      updated.splice(toIndexInPrev, 0, moved);
      widgetsRef.current = updated;
      return updated;
    });

    triggerHaptic(20);

    draggedIndexRef.current = targetIndex;
    setDraggedIndex(targetIndex);
  };

  // Drag & Drop nativo HTML5 para ratón (PC)
  const handleDragStart = (e, index) => {
    if (!isReordering) return;
    draggedIndexRef.current = index;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch (_) {}
  };

  const handleDragOver = (e, targetIndex) => {
    if (!isReordering) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    handleSwapWidgets(targetIndex);
  };

  const handleDrop = (e) => {
    if (!isReordering) return;
    e.preventDefault();
    draggedIndexRef.current = null;
    setDraggedIndex(null);

    const currentWidgets = widgetsRef.current;
    localStorage.setItem('monety_widgets_order_v2', JSON.stringify(currentWidgets));
    saveStoredWidgetsConfig(currentWidgets, null);
    if (onSaveWidgets) onSaveWidgets(currentWidgets);
  };

  const handleDragEnd = () => {
    draggedIndexRef.current = null;
    setDraggedIndex(null);

    const currentWidgets = widgetsRef.current;
    localStorage.setItem('monety_widgets_order_v2', JSON.stringify(currentWidgets));
    saveStoredWidgetsConfig(currentWidgets, null);
    if (onSaveWidgets) onSaveWidgets(currentWidgets);
  };

  // Manejadores Táctiles (Touch Events) para Móviles / Pantallas Táctiles
  const handleTouchStart = (e, index) => {
    // Si se interactúa con un elemento interactivo o con scroll horizontal interno, no capturar para reorganización
    if (e.target && typeof e.target.closest === 'function') {
      if (e.target.closest('button, a, input, select, textarea, [data-no-drag], .overflow-x-auto, .no-scrollbar')) {
        return;
      }
    }
    if (e.touches && e.touches[0]) {
      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (isReorderingRef.current || isReordering) {
      draggedIndexRef.current = index;
      setDraggedIndex(index);
      triggerHaptic(25);
    } else {
      handlePressStart(index);
    }
  };

  const handleTouchMove = (e) => {
    if (!isReorderingRef.current) {
      if (touchStartPosRef.current && e.touches && e.touches[0]) {
        const diffY = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
        const diffX = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
        if (diffY > 10 || diffX > 10) {
          handlePressEnd();
          return;
        }
      }
      return;
    }

    // Solo prevenir scroll vertical si el usuario está arrastrando activamente desde la manija
    if (draggedIndexRef.current === null || draggedIndexRef.current === undefined) {
      return;
    }

    const touch = e.touches && e.touches[0];
    if (!touch) return;

    if (e.cancelable) {
      e.preventDefault();
    }

    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const widgetCard = targetEl?.closest('[data-widget-index]');
    if (widgetCard) {
      const targetIndex = Number(widgetCard.getAttribute('data-widget-index'));
      if (!isNaN(targetIndex)) {
        handleSwapWidgets(targetIndex);
      }
    }
  };

  const handleTouchEnd = () => {
    handlePressEnd();
    if (isReorderingRef.current || isReordering) {
      if (draggedIndexRef.current !== null) {
        draggedIndexRef.current = null;
        setDraggedIndex(null);

        const currentWidgets = widgetsRef.current;
        localStorage.setItem('monety_widgets_order_v2', JSON.stringify(currentWidgets));
        saveStoredWidgetsConfig(currentWidgets, null);
        if (onSaveWidgets) onSaveWidgets(currentWidgets);
      }
    }
  };

  const handleFinishReordering = () => {
    setIsReordering(false);
    draggedIndexRef.current = null;
    setDraggedIndex(null);
    pressedIndexRef.current = null;

    const currentWidgets = widgetsRef.current;
    localStorage.setItem('monety_widgets_order_v2', JSON.stringify(currentWidgets));
    saveStoredWidgetsConfig(currentWidgets, null);
    if (onSaveWidgets) onSaveWidgets(currentWidgets);
  };

  // Control de visibilidad de widgets (ocultar / restaurar)
  const handleToggleVisibility = (e, widgetId, newVisible) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();

    const currentList = widgetsRef.current || widgets;
    const normTarget = normalizeWidgetId(widgetId);
    let found = false;

    let updated = currentList.map((w) => {
      if (w.id === widgetId || normalizeWidgetId(w.id) === normTarget) {
        found = true;
        return { ...w, visible: newVisible, hidden: !newVisible };
      }
      return w;
    });

    // Si se está restaurando un widget que no estaba en la lista guardada, buscarlo en DEFAULT_WIDGETS_CONFIG
    if (!found && newVisible) {
      const defWidget = DEFAULT_WIDGETS_CONFIG.find(dw => dw.id === widgetId || normalizeWidgetId(dw.id) === normTarget);
      if (defWidget) {
        updated.push({ ...defWidget, visible: true, hidden: false });
      }
    }

    widgetsRef.current = updated;
    setWidgets(updated);
    localStorage.setItem('monety_widgets_order_v2', JSON.stringify(updated));
    saveStoredWidgetsConfig(updated, null);
    if (onSaveWidgets) onSaveWidgets(updated);
  };

  const visibleWidgets = widgets.filter(w => {
    if (!w.visible) return false;
    const norm = normalizeWidgetId(w.id);
    if (norm === 'trm' || norm === 'trm_oficial' || w.id === 'trm' || w.id === 'trm_oficial') return false;
    if (allowedWidgetIds && Array.isArray(allowedWidgetIds)) {
      if (!allowedWidgetIds.includes(norm) && !allowedWidgetIds.includes(w.id)) return false;
    }
    return Boolean(getWidget(w.id));
  });

  const hiddenWidgets = useMemo(() => {
    const list = widgets.filter((w) => w.visible === false || w.hidden === true);
    const visibleIds = new Set(visibleWidgets.map(w => normalizeWidgetId(w.id)));
    const existingHiddenIds = new Set(list.map(w => normalizeWidgetId(w.id)));

    DEFAULT_WIDGETS_CONFIG.forEach(dw => {
      const norm = normalizeWidgetId(dw.id);
      if (norm === 'trm' || norm === 'trm_oficial') return;
      if (allowedWidgetIds && Array.isArray(allowedWidgetIds) && !allowedWidgetIds.includes(norm)) return;
      if (!visibleIds.has(norm) && !existingHiddenIds.has(norm)) {
        list.push({ ...dw, visible: false, hidden: true });
      }
    });
    return list;
  }, [widgets, visibleWidgets, allowedWidgetIds]);

  const isWideWidget = (id) => {
    if (!id) return false;
    const norm = normalizeWidgetId(id);
    const wideIds = [
      'my_accounts', 'mis_cuentas', 'accounts',
      'weekly_cashflow', 'pill_bar_chart', 'weekly_cashflow_classic',
      'recent_movements', 'movimientos_recientes', 'recent_transactions',
      'expenses_category', 'gastos_categoria', 'charts',
      'bento_metrics', 'bento',
      'balance_cards'
    ];
    return wideIds.includes(norm) || wideIds.includes(id);
  };

  const renderWidgetWrapper = (id, index) => {
    const comp = getWidget(id);
    if (!comp) return null;
    const idx = index !== undefined ? index : visibleWidgets.findIndex(w => w.id === id || normalizeWidgetId(w.id) === normalizeWidgetId(id));
    return (
      <div
        key={id}
        data-widget-index={idx}
        onMouseDown={idx >= 0 ? () => handlePressStart(idx) : undefined}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={idx >= 0 ? (e) => handleTouchStart(e, idx) : undefined}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`w-full touch-pan-y ${isWideWidget(id) ? 'col-span-1 md:col-span-2 lg:col-span-3' : 'col-span-1'}`}
      >
        {comp}
      </div>
    );
  };

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

            const isWide = isWideWidget(w.id);
            const isJigglingAlt = index % 2 === 1;

            return (
              <div 
                key={w.id} 
                data-widget-index={index}
                className={`relative transition-transform duration-150 ${isWide ? 'col-span-1 md:col-span-2 lg:col-span-3' : 'col-span-1'} w-full ${
                  isJigglingAlt ? 'animate-jiggle-alt' : 'animate-jiggle'
                } select-none touch-pan-y ${
                  draggedIndex === index ? 'opacity-40 scale-[0.98]' : 'hover:scale-[1.01]'
                }`}
              >
                {/* Manija de arrastre restringida para móvil y PC: único sensor táctil para reordenar */}
                <div
                  data-drag-handle="true"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    handleTouchStart(e, index);
                  }}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  className="absolute -top-3 left-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 dark:bg-zinc-800 text-white shadow-xl border border-white/20 cursor-grab active:cursor-grabbing touch-none select-none pointer-events-auto"
                  title="Arrastra desde aquí para mover el widget"
                  aria-label="Manija para mover widget"
                >
                  <GripVertical className="w-3.5 h-3.5 opacity-90 text-slate-300" />
                  <span className="text-[11px] font-bold tracking-tight">Mover</span>
                </div>

                {/* Botón flotante para ocultar widget en modo reorganización */}
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => handleToggleVisibility(e, w.id, false)}
                  className="absolute -top-2.5 -right-2.5 z-30 w-7 h-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer border-2 border-white dark:border-slate-900 pointer-events-auto"
                  title="Ocultar widget"
                  aria-label="Ocultar widget"
                >
                  <EyeOff className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                <div className="pointer-events-none">
                  {widgetComponent}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full items-start touch-pan-y ${className || ''}`}>
          {visibleWidgets.map((w, index) => renderWidgetWrapper(w.id, index))}
        </div>
      )}

      {/* Bandeja de widgets ocultos (visible durante reorganización) */}
      {isReordering && (
        <div className="w-full mt-6 p-4 sm:p-5 rounded-2xl border border-dashed border-slate-300 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/5 backdrop-blur-md transition-all animate-fadeIn">
          <div className="flex items-center justify-between gap-2 mb-3 px-1">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Widgets ocultos {hiddenWidgets.length > 0 ? `(${hiddenWidgets.length})` : ''}
              </h4>
            </div>
            {hiddenWidgets.length === 0 && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Todos los widgets están visibles
              </span>
            )}
          </div>
          {hiddenWidgets.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {hiddenWidgets.map((hw) => {
                const label = hw.label || hw.name || hw.id;
                const IconComponent = WIDGET_ICON_MAP[hw.icon] || Wallet;
                return (
                  <div
                    key={hw.id}
                    className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500/50 transition-all group"
                  >
                    <IconComponent className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[160px]">{label}</span>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => handleToggleVisibility(e, hw.id, true)}
                      className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:text-white transition-all cursor-pointer font-bold text-[11px]"
                      title={`Restaurar widget ${label}`}
                      aria-label={`Restaurar widget ${label}`}
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>+ Mostrar</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-1 px-1">
              Todos los widgets están activos. Para ocultar alguno, pulsa el botón rojo en la esquina del widget mientras reorganizas.
            </p>
          )}
        </div>
      )}

      {/* Fin de los widgets modulares del Dashboard */}
    </>
  );
}

export { Dashboard };
