import React from 'react';
import { 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight, 
  PiggyBank 
} from 'lucide-react';

const cardBase = "bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/[0.08] shadow-sm transition-all flex flex-col justify-between h-full select-none";

/**
 * LiquidBalanceWidget: Tarjeta de Saldo Disponible Líquido
 */
export function LiquidBalanceWidget({
  availableLiquidBalance = 0,
  netBalance = 0,
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  className = ''
}) {
  return (
    <div className={`${cardBase} ${className}`}>
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
          <Wallet className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate">Saldo disponible</span>
      </div>
      <div className="mt-2 min-w-0">
        <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums truncate leading-tight">
          {formatMoney(availableLiquidBalance)}
        </h3>
        <div className="flex items-center gap-1.5 mt-2 text-xs font-medium truncate">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${
            netBalance >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20'
          }`}>
            {netBalance >= 0 ? '+' : ''}{formatMoney(netBalance)}
          </span>
          <span className="text-slate-400 dark:text-zinc-500 truncate hidden xs:inline">mes</span>
        </div>
      </div>
    </div>
  );
}

/**
 * MonthlyIncomeWidget: Tarjeta de Ingreso del Mes
 */
export function MonthlyIncomeWidget({
  totalIncome = 0,
  incomeCount = 0,
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  className = ''
}) {
  return (
    <div className={`${cardBase} group ${className}`}>
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400">
          <ArrowDownRight className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate">Ingreso del mes</span>
      </div>
      <div className="mt-2 min-w-0">
        <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums truncate leading-tight">
          +{formatMoney(totalIncome)}
        </h3>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 truncate">
            {incomeCount || 0} ingresos
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * MonthlyExpenseWidget: Tarjeta de Gasto del Mes
 */
export function MonthlyExpenseWidget({
  totalExpense = 0,
  expenseCount = 0,
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  className = ''
}) {
  return (
    <div className={`${cardBase} group ${className}`}>
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-rose-500/10 dark:bg-zinc-800 text-rose-600 dark:text-rose-400">
          <ArrowUpRight className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate">Gasto del mes</span>
      </div>
      <div className="mt-2 min-w-0">
        <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-rose-500 dark:text-rose-400 tabular-nums truncate leading-tight">
          -{formatMoney(totalExpense)}
        </h3>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 truncate">
            {expenseCount || 0} egresos
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * SavingsRateWidget: Tarjeta de Tasa de Ahorro / Superávit
 */
export function SavingsRateWidget({
  savingsRate = 0,
  freeCash = 0,
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  className = ''
}) {
  return (
    <div className={`${cardBase} group ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/10 dark:bg-zinc-800 text-teal-600 dark:text-teal-400">
            <PiggyBank className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate">Tasa de ahorro</span>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 tabular-nums">
          {formatMoney(freeCash)} libre
        </span>
      </div>
      <div className="mt-2 min-w-0">
        <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums leading-tight">
          {savingsRate}%
        </h3>
        <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-700" 
            style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }} 
          />
        </div>
      </div>
    </div>
  );
}

/**
 * BalanceCardsWidget
 * Tarjetas de balance del Dashboard.
 * Permite renderizarse como grid completa o como tarjeta individual mediante `variant`.
 */
export default function BalanceCardsWidget(props) {
  const { variant = 'grid', className = '' } = props;
  if (variant === 'liquid') return <LiquidBalanceWidget {...props} />;
  if (variant === 'income') return <MonthlyIncomeWidget {...props} />;
  if (variant === 'expense') return <MonthlyExpenseWidget {...props} />;
  if (variant === 'savings') return <SavingsRateWidget {...props} />;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <LiquidBalanceWidget {...props} />
      <MonthlyIncomeWidget {...props} />
      <MonthlyExpenseWidget {...props} />
      <SavingsRateWidget {...props} />
    </div>
  );
}
