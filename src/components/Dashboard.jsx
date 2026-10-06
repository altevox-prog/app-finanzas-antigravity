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
  EyeOff
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
  normalizeWidgetId 
} from '../utils/widgetsConfig';
import BalanceWidget from './BalanceWidget';
import BudgetWidget from './BudgetWidget';
import ReportsAndCharts from './ReportsAndCharts';
import TransactionList from './TransactionList';
import BrandIcon from './BrandIcon';
import AccountsWidgetComponent from './AccountsWidget';
import AddLoanModal from './AddLoanModal';
import AddRecurringModal from './AddRecurringModal';
import AddTransactionModal from './AddTransactionModal';

// Aliases para nombres semánticos de widgets y modales
const GoalsWidget = BudgetWidget;
const CategoriesWidget = ReportsAndCharts;
const NewDebtModal = AddLoanModal;
const NewRecurringModal = AddRecurringModal;
const NewTransactionModal = AddTransactionModal;

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
      className="min-h-[140px] p-5 sm:p-6 rounded-3xl border shadow-xs flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group"
      style={{ 
        backgroundColor: 'var(--bg-card, #ffffff)', 
        borderColor: 'var(--border-color, rgba(226, 232, 240, 0.8))' 
      }}
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
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight leading-none">
            {formatMoney(netWorthCOP)}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Activos totales: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{formatMoney(totalAssetsCOP)}</strong>
          </p>
        </div>
      </div>

      <div className="pt-3 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          Debo actualmente:
        </span>
        <span className="font-black text-rose-600 dark:text-rose-400 tabular-nums">
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
      className="min-h-[140px] p-5 sm:p-6 rounded-3xl border shadow-xs flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group"
      style={{ 
        backgroundColor: 'var(--bg-card, #ffffff)', 
        borderColor: 'var(--border-color, rgba(226, 232, 240, 0.8))' 
      }}
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
              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-2xs"
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
            <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight block mt-0.5 truncate">
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
            <span className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 tabular-nums tracking-tight block mt-0.5 truncate">
              -{formatMoney(debtsAndLoansMetrics.totalPayableCOP)}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
        <span className="text-slate-400 text-[11px] font-medium">
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
      className="min-h-[140px] p-5 sm:p-6 rounded-3xl border shadow-xs flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group"
      style={{ 
        backgroundColor: 'var(--bg-card, #ffffff)', 
        borderColor: 'var(--border-color, rgba(226, 232, 240, 0.8))' 
      }}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Inversiones</span>
          </span>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
              investmentsMetrics.isPositive 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}>
              {investmentsMetrics.isPositive ? '+' : ''}{investmentsMetrics.profitPercentage.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="mt-1">
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight leading-none">
            {formatMoney(investmentsMetrics.totalCurrentValueCOP)}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Capital invertido: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{formatMoney(investmentsMetrics.totalInvestedCostCOP)}</strong>
          </p>
        </div>
      </div>

      <div className="pt-3 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          Rentabilidad neta:
        </span>
        <span className={`font-black tabular-nums ${
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
// SUBCOMPONENTE 5: WIDGET DE MOVIMIENTOS RECIENTES
// ============================================================================
export function TransactionsWidget({
  transactions = [],
  onNavigateToTab = () => {},
  setActiveTab = null,
  onOpenTransaction = null,
  onOpenAddTransaction = null,
  setIsAddTransactionOpen = null,
  setIsTransactionModalOpen = null,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`
}) {
  const handleNav = (tab = 'transactions') => {
    if (typeof onNavigateToTab === 'function') onNavigateToTab(tab);
    else if (typeof setActiveTab === 'function') setActiveTab(tab);
  };

  const handleAdd = (e, type = 'expense') => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (typeof onOpenAddTransaction === 'function') {
      onOpenAddTransaction(type);
    } else if (typeof onOpenTransaction === 'function') {
      onOpenTransaction(type);
    } else if (typeof setIsTransactionModalOpen === 'function') {
      setIsTransactionModalOpen(true);
    } else if (typeof setIsAddTransactionOpen === 'function') {
      setIsAddTransactionOpen(true);
    } else {
      handleNav('transactions');
    }
  };

  const safeList = Array.isArray(transactions) ? transactions : [];
  const count = safeList.length;
  const recentTx = count > 0 ? safeList[0] : null;

  return (
    <div 
      onClick={() => handleNav('transactions')}
      className="min-h-[140px] p-4 sm:p-6 rounded-3xl border shadow-xs flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group overflow-hidden"
      style={{ 
        backgroundColor: 'var(--bg-card, #ffffff)', 
        borderColor: 'var(--border-color, rgba(226, 232, 240, 0.8))' 
      }}
    >
      <div>
        {/* Cabecera interna sin encabezados duplicados ni botones flotantes externos */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 min-w-0">
            <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate sm:hidden">Movimientos</span>
            <span className="truncate hidden sm:inline">Movimientos Recientes</span>
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
              {count} {count === 1 ? 'registro' : 'registros'}
            </span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => handleAdd(e, 'expense')}
              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Añadir nuevo movimiento"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo</span>
            </button>
          </div>
        </div>

        {/* Contenido / Estado vacío o resumen de último movimiento */}
        <div className="mt-1">
          {count === 0 ? (
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Sin movimientos
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                No hay ingresos ni gastos registrados este mes.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                  {recentTx?.note || recentTx?.categoryName || 'Último movimiento'}
                </span>
                <span className={`text-sm sm:text-base font-black tabular-nums tracking-tight shrink-0 ${
                  recentTx?.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {recentTx?.type === 'income' ? '+' : '-'}{formatMoney(recentTx?.amount || 0)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">
                {recentTx?.accountName ? `${recentTx.accountName} • ` : ''}{recentTx?.date || 'Reciente'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer homogéneo */}
      <div className="pt-3 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          Historial completo
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNav('transactions');
          }}
          className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform hover:underline cursor-pointer"
        >
          <span>Ver todos</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export const RecentMovementsWidget = TransactionsWidget;

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
      className="min-h-[140px] p-4 sm:p-5 rounded-3xl border shadow-xs flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group overflow-hidden"
      style={{ 
        backgroundColor: 'var(--bg-card, #ffffff)', 
        borderColor: 'var(--border-color, rgba(226, 232, 240, 0.8))' 
      }}
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
            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
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
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight leading-none">
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
    <div className="flex items-center justify-between p-3 px-3.5 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-white/5 shadow-2xs select-none">
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
        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
          ${Number(trm || 4050).toLocaleString('es-CO')}
        </span>
        <span className="text-[9px] text-slate-400 block font-semibold uppercase tracking-wider">COP</span>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTE 8: WIDGET DE SALDO DISPONIBLE LÍQUIDO (KPI Compacto)
// ============================================================================
export function LiquidBalanceWidget({
  availableLiquidBalance = 0,
  netBalance = 0,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`
}) {
  return (
    <div 
      className="p-3.5 sm:p-4 rounded-2xl border shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full group"
      style={{ 
        backgroundColor: 'var(--bg-card, #ffffff)', 
        borderColor: 'var(--border-color, rgba(226, 232, 240, 0.8))' 
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
          Saldo disponible
        </span>
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 dark:bg-[#29D691]/15 text-emerald-600 dark:text-[#29D691] flex items-center justify-center shrink-0">
          <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      </div>
      <div className="mt-2 min-w-0">
        <h3 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight truncate leading-tight">
          {formatMoney(availableLiquidBalance)}
        </h3>
        <div className="flex items-center gap-1 mt-1 text-[10px] sm:text-[11px] font-semibold truncate">
          <span className={`inline-flex items-center px-1.5 py-0.2 rounded-md ${
            netBalance >= 0 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#29D691]' 
              : 'bg-rose-500/10 text-rose-500'
          }`}>
            {netBalance >= 0 ? '+' : ''}{formatMoney(netBalance)}
          </span>
          <span className="text-slate-400 dark:text-slate-500 truncate hidden xs:inline">mes</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTE 9: WIDGET DE INGRESO DEL MES (KPI Compacto)
// ============================================================================
export function MonthlyIncomeWidget({
  totalIncome = 0,
  incomeCount = 0,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`
}) {
  return (
    <div 
      className="p-3.5 sm:p-4 rounded-2xl border shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full group"
      style={{ 
        backgroundColor: 'var(--bg-card, #ffffff)', 
        borderColor: 'var(--border-color, rgba(226, 232, 240, 0.8))' 
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
          Ingreso del mes
        </span>
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 dark:bg-[#29D691]/15 text-emerald-600 dark:text-[#29D691] flex items-center justify-center shrink-0">
          <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      </div>
      <div className="mt-2 min-w-0">
        <h3 className="text-base sm:text-lg md:text-xl font-black text-emerald-600 dark:text-[#29D691] tabular-nums tracking-tight truncate leading-tight">
          +{formatMoney(totalIncome)}
        </h3>
        <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-1 truncate">
          {incomeCount || 0} ingresos
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTE 10: WIDGET DE GASTO DEL MES (KPI Compacto)
// ============================================================================
export function MonthlyExpenseWidget({
  totalExpense = 0,
  expenseCount = 0,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`
}) {
  return (
    <div 
      className="p-3.5 sm:p-4 rounded-2xl border shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full group"
      style={{ 
        backgroundColor: 'var(--bg-card, #ffffff)', 
        borderColor: 'var(--border-color, rgba(226, 232, 240, 0.8))' 
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
          Gasto del mes
        </span>
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
          <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      </div>
      <div className="mt-2 min-w-0">
        <h3 className="text-base sm:text-lg md:text-xl font-black text-rose-500 tabular-nums tracking-tight truncate leading-tight">
          -{formatMoney(totalExpense)}
        </h3>
        <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-1 truncate">
          {expenseCount || 0} compras y egresos
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTE 11: WIDGET DE TASA DE AHORRO / SUPERÁVIT (KPI Compacto)
// ============================================================================
export function SavingsRateWidget({
  savingsRate = 0,
  freeCash = 0,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`
}) {
  return (
    <div 
      className="p-3.5 sm:p-4 rounded-2xl border shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full group"
      style={{ 
        backgroundColor: 'var(--bg-card, #ffffff)', 
        borderColor: 'var(--border-color, rgba(226, 232, 240, 0.8))' 
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
          Tasa de ahorro
        </span>
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-teal-500/10 dark:bg-[#29D691]/15 text-teal-600 dark:text-[#29D691] flex items-center justify-center shrink-0">
          <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      </div>
      <div className="mt-2 min-w-0">
        <div className="flex items-baseline justify-between gap-1 truncate">
          <h3 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight leading-tight">
            {savingsRate}%
          </h3>
          <span className="text-[10px] sm:text-xs font-bold text-teal-600 dark:text-[#29D691] tabular-nums truncate">
            {formatMoney(freeCash)}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mt-1.5">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 to-[#29D691] rounded-full transition-all duration-700" 
            style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }} 
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTE 12: WIDGET DE FLUJO DE CAJA SEMANAL
// ============================================================================
export function WeeklyCashflowWidget({
  weeklyCashFlow,
  hoveredWeekIndex,
  setHoveredWeekIndex,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`
}) {
  const weeks = weeklyCashFlow?.weeks || [];
  const maxVal = weeklyCashFlow?.maxVal || 100000;

  return (
    <div 
      className="p-5 sm:p-6 rounded-3xl border shadow-xs space-y-4"
      style={{ 
        backgroundColor: 'var(--bg-card, #ffffff)', 
        borderColor: 'var(--border-color, rgba(226, 232, 240, 0.8))' 
      }}
    >
      <div className="flex items-center justify-between">
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

        <div className="flex items-center gap-3 text-xs font-semibold">
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
                      className="w-full bg-emerald-500 rounded-t-xl transition-all duration-700 group-hover:brightness-110 shadow-xs"
                      style={{ height: `${incomeHeight}px` }}
                    />
                  </div>
                  <div className="w-3.5 sm:w-5 bg-slate-100 dark:bg-white/5 rounded-t-xl overflow-hidden flex items-end">
                    <div
                      className="w-full bg-rose-500 rounded-t-xl transition-all duration-700 group-hover:brightness-110 shadow-xs"
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
  setIsTransactionModalOpen: setIsTransactionModalOpenProp = null,
  setIsAddTransactionOpen = null,
  onOpenAddDebt = null,
  onOpenAddLoan = null,
  setIsNewDebtModalOpen: setIsNewDebtModalOpenProp = null,
  setIsAddLoanOpen = null,
  onOpenAddRecurring = null,
  setIsRecurringModalOpen: setIsRecurringModalOpenProp = null,
  setIsAddRecurringOpen = null,
  onAddDebtOrLoan = null,
  onSaveDebt = null,
  onAddRecurring = null,
  onSaveRecurring = null,
  onAddTransaction = null,
  onSaveTransaction = null,
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
  className = null
}) {
  const { formatMoney } = usePrivacy();
  const trmValue = toSafeNumber(trm) || 4050;

  // Estados de modales gestionados directamente en Dashboard para evitar parpadeos y pérdidas de evento
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtModalInitialType, setDebtModalInitialType] = useState('payable');
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [txModalDefaultType, setTxModalDefaultType] = useState('expense');

  // Helpers unificados para navegación de pestañas y apertura de modales reales
  const navigateToTab = (tab) => {
    if (typeof onNavigateToTab === 'function') {
      onNavigateToTab(tab);
    } else if (typeof setActiveTab === 'function') {
      setActiveTab(tab);
    }
  };

  const handleOpenDebtModal = (type = 'payable') => {
    const norm = (type === 'receivable' || type === 'lent' || type === 'me_deben') ? 'receivable' : 'payable';
    if (typeof onOpenAddDebt === 'function') {
      onOpenAddDebt(norm);
    } else if (typeof setIsNewDebtModalOpenProp === 'function') {
      setIsNewDebtModalOpenProp(true);
    } else {
      setDebtModalInitialType(norm);
      setIsDebtModalOpen(true);
    }
  };

  const handleOpenRecurringModal = () => {
    if (typeof onOpenAddRecurring === 'function') {
      onOpenAddRecurring();
    } else if (typeof setIsRecurringModalOpenProp === 'function') {
      setIsRecurringModalOpenProp(true);
    } else {
      setIsRecurringModalOpen(true);
    }
  };

  const handleOpenTxModal = (type = 'expense') => {
    const norm = (type === 'income' || type === 'ingreso') ? 'income' : 'expense';
    if (typeof onOpenAddTransaction === 'function') {
      onOpenAddTransaction(norm);
    } else if (typeof onOpenTransaction === 'function') {
      onOpenTransaction(norm);
    } else if (typeof setIsTransactionModalOpenProp === 'function') {
      setIsTransactionModalOpenProp(true);
    } else {
      setTxModalDefaultType(norm);
      setIsTransactionModalOpen(true);
    }
  };

  const handleSaveDebt = (newItem) => {
    if (typeof onAddDebtOrLoan === 'function') {
      onAddDebtOrLoan(newItem);
    } else if (typeof onSaveDebt === 'function') {
      onSaveDebt(newItem);
    } else {
      try {
        const raw = localStorage.getItem('finanzas_debts_v3') || localStorage.getItem('app_loans') || '[]';
        const list = JSON.parse(raw);
        const next = [newItem, ...list];
        localStorage.setItem('finanzas_debts_v3', JSON.stringify(next));
        localStorage.setItem('app_loans', JSON.stringify(next));
        localStorage.setItem('presu_debts_and_loans', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('debts-updated', { detail: next }));
      } catch (e) {}
    }
    setIsDebtModalOpen(false);
  };

  const handleSaveRecurring = (newItem) => {
    if (typeof onAddRecurring === 'function') {
      onAddRecurring(newItem);
    } else if (typeof onSaveRecurring === 'function') {
      onSaveRecurring(newItem);
    } else {
      try {
        const raw = localStorage.getItem('subscriptions') || localStorage.getItem('app_recurring') || '[]';
        const list = JSON.parse(raw);
        const next = [newItem, ...list];
        localStorage.setItem('subscriptions', JSON.stringify(next));
        localStorage.setItem('app_recurring', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('recurring-updated', { detail: next }));
      } catch (e) {}
    }
    setIsRecurringModalOpen(false);
  };

  const handleSaveTransaction = (newTx) => {
    if (typeof onAddTransaction === 'function') {
      onAddTransaction(newTx);
    } else if (typeof onSaveTransaction === 'function') {
      onSaveTransaction(newTx);
    } else {
      try {
        const raw = localStorage.getItem('presu_transactions') || '[]';
        const list = JSON.parse(raw);
        const next = [newTx, ...list];
        localStorage.setItem('presu_transactions', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('transactions-updated', { detail: next }));
      } catch (e) {}
    }
    setIsTransactionModalOpen(false);
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
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [transactions, currentYear, currentMonth]);

  const displayTransactions = monthlyTransactions || scopedTransactions;

  // 6. CÁLCULO DE MÉTRICAS MENSUALES Y FLUJO SEMANAL
  const totalIncome = toSafeNumber(monthlyStats.totalIncome);
  const totalExpense = toSafeNumber(monthlyStats.totalExpense);
  const netBalance = monthlyStats.netBalance !== undefined 
    ? toSafeNumber(monthlyStats.netBalance) 
    : calculateNetFlow(totalIncome, totalExpense);
  const availableLiquidBalance = toSafeNumber(monthlyStats.availableLiquidBalance);
  const savingsRate = calculateSavingsRate(totalIncome, totalExpense);
  const freeCash = Math.max(0, netBalance);

  const [hoveredWeekIndex, setHoveredWeekIndex] = useState(null);

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
        incomeCount={monthlyStats.incomeCount || 0}
        formatMoney={formatMoney}
      />
    ),

    // 6. Gasto del mes
    monthly_expense: (
      <MonthlyExpenseWidget
        totalExpense={totalExpense}
        expenseCount={monthlyStats.expenseCount || 0}
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

    // 8. Flujo de caja semanal
    weekly_cashflow: (
      <WeeklyCashflowWidget
        weeklyCashFlow={weeklyCashFlow}
        hoveredWeekIndex={hoveredWeekIndex}
        setHoveredWeekIndex={setHoveredWeekIndex}
        formatMoney={formatMoney}
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
      <TransactionsWidget
        transactions={displayTransactions}
        onDeleteTransaction={onDeleteTransaction}
        onUpdateTransaction={onUpdateTransaction}
        onAddCategory={handleAddCategory}
        onAddSubcategory={handleAddSubcategory}
        onUpdateSubcategory={onUpdateSubcategory}
        onDeleteSubcategory={onDeleteSubcategory}
        onAddAccount={handleAddAccount}
        categories={categories}
        accounts={accounts}
        currentMonthLabel={currentMonthLabel}
        selectedDay={selectedDay}
        onSelectDay={onSelectDay}
        onViewAll={() => navigateToTab('transactions')}
        onOpenTransaction={handleOpenTxModal}
        onOpenAddTransaction={handleOpenTxModal}
        setIsTransactionModalOpen={handleOpenTxModal}
        setIsAddTransactionOpen={handleOpenTxModal}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
        trm={trm}
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

    // Alias retrocompatibles para configuración previa
    pagos_recurrentes: (
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
    recurring: (
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

    // Balance general
    balance_general: (
      <BalanceWidget
        monthlyStats={monthlyStats}
        selectedDate={selectedDate}
        selectedDay={selectedDay}
        onSelectDay={onSelectDay}
        onOpenCalendar={onOpenCalendar}
        txCount={scopedTransactions.length}
      />
    ),
    balance: (
      <BalanceWidget
        monthlyStats={monthlyStats}
        selectedDate={selectedDate}
        selectedDay={selectedDay}
        onSelectDay={onSelectDay}
        onOpenCalendar={onOpenCalendar}
        txCount={scopedTransactions.length}
      />
    ),

    // Gastos por categoría
    gastos_categoria: (
      <CategoriesWidget
        transactions={transactions}
        categories={categories}
        selectedDate={selectedDate}
        selectedDay={selectedDay}
        onOpenCalendar={onOpenCalendar}
      />
    ),
    charts: (
      <CategoriesWidget
        transactions={transactions}
        categories={categories}
        selectedDate={selectedDate}
        selectedDay={selectedDay}
        onOpenCalendar={onOpenCalendar}
      />
    ),

    // Mis cuentas
    mis_cuentas: (
      <AccountsWidget
        accounts={accounts}
        transactions={transactions}
        trm={trm}
        onNavigateToTab={onNavigateToTab}
        onSelectCreditCardDetail={onSelectCreditCardDetail}
        formatMoney={formatMoney}
      />
    ),
    accounts: (
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

    // Movimientos recientes
    movimientos_recientes: (
      <TransactionsWidget
        transactions={displayTransactions}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
        onOpenTransaction={handleOpenTxModal}
        onOpenAddTransaction={handleOpenTxModal}
        setIsTransactionModalOpen={handleOpenTxModal}
        setIsAddTransactionOpen={handleOpenTxModal}
        formatMoney={formatMoney}
      />
    ),
    recent_transactions: (
      <TransactionsWidget
        transactions={displayTransactions}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
        onOpenTransaction={handleOpenTxModal}
        onOpenAddTransaction={handleOpenTxModal}
        setIsTransactionModalOpen={handleOpenTxModal}
        setIsAddTransactionOpen={handleOpenTxModal}
        formatMoney={formatMoney}
      />
    ),

    // Presupuesto y metas
    presupuesto_metas: <GoalsWidget monthlyStats={monthlyStats} />,
    budget: <GoalsWidget monthlyStats={monthlyStats} />,

    // Alias retrocompatibles para configuración previa
    patrimonio_total: (
      <NetWorthWidget
        netWorthCOP={netWorthCOP}
        totalAssetsCOP={totalAssetsCOP}
        totalPayableCOP={debtsAndLoansMetrics.totalPayableCOP}
        isNetWorthPositive={isNetWorthPositive}
        formatMoney={formatMoney}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
      />
    ),
    patrimonio: (
      <NetWorthWidget
        netWorthCOP={netWorthCOP}
        totalAssetsCOP={totalAssetsCOP}
        totalPayableCOP={debtsAndLoansMetrics.totalPayableCOP}
        isNetWorthPositive={isNetWorthPositive}
        formatMoney={formatMoney}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
      />
    ),
    inversiones: (
      <InvestmentsWidget
        investmentsMetrics={investmentsMetrics}
        onNavigateToTab={navigateToTab}
        setActiveTab={navigateToTab}
        formatMoney={formatMoney}
      />
    ),
    prestamos_deudas: (
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
    prestamos: (
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

    // TRM Oficial
    trm_oficial: <TRMWidget trm={trm} />,
    trm: <TRMWidget trm={trm} />
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
    const handleSync = (e) => {
      if (isReorderingRef.current) return;
      try {
        const next = (e?.detail && Array.isArray(e.detail) && e.detail.length > 0)
          ? e.detail
          : getStoredWidgetsConfig();
        const nextStr = JSON.stringify(next);
        const currStr = JSON.stringify(widgetsRef.current);
        if (nextStr !== currStr) {
          setWidgets(next);
        }
      } catch (_) {}
    };

    window.addEventListener('monety_widgets_order_v2_updated', handleSync);
    window.addEventListener('monety_widgets_config_updated', handleSync);
    window.addEventListener('presu_widget_order_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('monety_widgets_order_v2_updated', handleSync);
      window.removeEventListener('monety_widgets_config_updated', handleSync);
      window.removeEventListener('presu_widget_order_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

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
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch (_) {}
      }
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
        return Boolean(WIDGET_COMPONENTS[w.id] || WIDGET_COMPONENTS[normalizeWidgetId(w.id)]);
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

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(20);
      } catch (_) {}
    }

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
    if (isReorderingRef.current || isReordering) {
      draggedIndexRef.current = index;
      setDraggedIndex(index);
    } else {
      handlePressStart(index);
    }
  };

  const handleTouchMove = (e) => {
    if (!isReorderingRef.current && !isReordering) {
      handlePressEnd();
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

    setWidgets((prevWidgets) => {
      const updated = prevWidgets.map((w) => {
        if (w.id === widgetId || normalizeWidgetId(w.id) === normalizeWidgetId(widgetId)) {
          return { ...w, visible: newVisible };
        }
        return w;
      });

      // Si se restaura (newVisible: true), devolverlo al inicio como solicita el requerimiento
      if (newVisible) {
        const targetIdx = updated.findIndex(
          (w) => w.id === widgetId || normalizeWidgetId(w.id) === normalizeWidgetId(widgetId)
        );
        if (targetIdx > 0) {
          const [restoredItem] = updated.splice(targetIdx, 1);
          updated.unshift(restoredItem);
        }
      }

      localStorage.setItem('monety_widgets_order_v2', JSON.stringify(updated));
      saveStoredWidgetsConfig(updated, null);
      if (onSaveWidgets) onSaveWidgets(updated);
      return updated;
    });
  };

  const visibleWidgets = widgets.filter(w => {
    if (!w.visible) return false;
    if (allowedWidgetIds && Array.isArray(allowedWidgetIds)) {
      const norm = normalizeWidgetId(w.id);
      if (!allowedWidgetIds.includes(norm) && !allowedWidgetIds.includes(w.id)) return false;
    }
    return Boolean(WIDGET_COMPONENTS[w.id] || WIDGET_COMPONENTS[normalizeWidgetId(w.id)]);
  });

  const hiddenWidgets = widgets.filter((w) => !w.visible);

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

      <div className={`${className || "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full"} ${isReordering ? 'touch-none select-none' : ''}`}>
        {visibleWidgets.map((w, index) => {
          const widgetComponent = WIDGET_COMPONENTS[w.id] || WIDGET_COMPONENTS[normalizeWidgetId(w.id)];
          if (!widgetComponent) return null;

          const isFull = ['my_accounts', 'weekly_cashflow'].includes(w.id) || ['my_accounts', 'weekly_cashflow'].includes(normalizeWidgetId(w.id));
          const isJigglingAlt = index % 2 === 1;

          return (
            <div 
              key={w.id} 
              data-widget-index={index}
              draggable={isReordering}
              onMouseDown={() => handlePressStart(index)}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={(e) => handleTouchStart(e, index)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              className={`relative transition-transform duration-150 ${isFull ? 'col-span-full' : 'col-span-1'} ${
                isReordering 
                  ? `${isJigglingAlt ? 'animate-jiggle-alt' : 'animate-jiggle'} cursor-grab active:cursor-grabbing select-none touch-none ${
                      draggedIndex === index ? 'opacity-40 scale-[0.98]' : 'hover:scale-[1.01]'
                    }` 
                  : ''
              }`}
            >
              {/* Botón flotante para ocultar widget en modo reorganización */}
              {isReordering && (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => handleToggleVisibility(e, w.id, false)}
                  className="absolute -top-2 -right-2 z-20 w-7 h-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer border-2 border-white dark:border-slate-900 pointer-events-auto"
                  title="Ocultar widget"
                  aria-label="Ocultar widget"
                >
                  <EyeOff className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              )}

              <div className={isReordering ? 'pointer-events-none' : ''}>
                {widgetComponent}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bandeja de widgets ocultos (solo visible mientras isReordering sea true) */}
      {isReordering && hiddenWidgets.length > 0 && (
        <div className="w-full mt-6 p-4 sm:p-5 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 backdrop-blur-md transition-all animate-fadeIn">
          <div className="flex items-center gap-2 mb-3 px-1">
            <EyeOff className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Widgets ocultos ({hiddenWidgets.length})
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {hiddenWidgets.map((hw) => {
              const label = hw.label || hw.name || hw.id;
              return (
                <div
                  key={hw.id}
                  className="inline-flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 rounded-full bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-2xs text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500/50 transition-all group"
                >
                  <span>{label}</span>
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => handleToggleVisibility(e, hw.id, true)}
                    className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-600 text-emerald-600 hover:text-white transition-all cursor-pointer font-bold text-[11px]"
                    title={`Restaurar widget ${label}`}
                    aria-label={`Restaurar widget ${label}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Préstamos y Deudas declarado en el Dashboard */}
      {isDebtModalOpen && (
        <NewDebtModal
          isOpen={isDebtModalOpen}
          initialType={debtModalInitialType}
          defaultType={debtModalInitialType}
          onClose={() => setIsDebtModalOpen(false)}
          onSave={handleSaveDebt}
        />
      )}

      {/* Modal de Pagos Recurrentes declarado en el Dashboard */}
      {isRecurringModalOpen && (
        <NewRecurringModal
          isOpen={isRecurringModalOpen}
          onClose={() => setIsRecurringModalOpen(false)}
          onSave={handleSaveRecurring}
          accounts={accounts}
          categories={categories}
          onAddCategory={onAddCategory}
          onAddSubcategory={onAddSubcategory}
          trm={trmValue}
        />
      )}

      {/* Modal de Nueva Transacción / Movimiento declarado en el Dashboard */}
      {isTransactionModalOpen && (
        <NewTransactionModal
          isOpen={isTransactionModalOpen}
          defaultType={txModalDefaultType}
          defaultDate={selectedDay || new Date().toISOString().split('T')[0]}
          onClose={() => setIsTransactionModalOpen(false)}
          onSave={handleSaveTransaction}
          accounts={accounts}
          categories={categories}
          onAddCategory={onAddCategory}
          onAddSubcategory={onAddSubcategory}
          onUpdateSubcategory={onUpdateSubcategory}
          onDeleteSubcategory={onDeleteSubcategory}
          onAddAccount={onAddAccount}
          trm={trmValue}
        />
      )}
    </>
  );
}

export { Dashboard };
