import React from 'react';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank
} from 'lucide-react';

/**
 * MetricCardsGrid
 * Grid superior de 4 tarjetas Bento KPI: Saldo disponible, Ingresos, Gastos y Tasa de ahorro.
 */
export default function MetricCardsGrid({
  totalIncome = 0,
  totalExpense = 0,
  netBalance = 0,
  savingsRate = 0,
  availableLiquidBalance = 0,
  freeCash = 0,
  formatMoney = (val) => `$${val}`,
  monthlyStats = {}
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* KPI 1: Saldo Disponible Líquido */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/[0.08] transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Saldo disponible líquido
            </span>
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums">
            {formatMoney(availableLiquidBalance)}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${
              netBalance >= 0 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20'
            }`}>
              {netBalance >= 0 ? '+' : ''}{formatMoney(netBalance)}
            </span>
            <span className="text-slate-400 dark:text-zinc-500">balance del mes</span>
          </div>
        </div>
      </div>

      {/* KPI 2: Ingresos del Mes */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/[0.08] transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Ingresos del mes
            </span>
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{formatMoney(totalIncome)}
          </h3>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {monthlyStats?.incomeCount || 0} movimientos
            </span>
          </div>
        </div>
      </div>

      {/* KPI 3: Gastos del Mes */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/[0.08] transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 dark:bg-zinc-800 text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Gastos del mes
            </span>
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-rose-500 dark:text-rose-400 tabular-nums">
            -{formatMoney(totalExpense)}
          </h3>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              {monthlyStats?.expenseCount || 0} compras y egresos
            </span>
          </div>
        </div>
      </div>

      {/* KPI 4: Tasa de Ahorro / Superávit */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/[0.08] transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/10 dark:bg-zinc-800 text-teal-600 dark:text-teal-400">
              <PiggyBank className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Tasa de ahorro
            </span>
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 tabular-nums">
            {formatMoney(freeCash)} libre
          </span>
        </div>
        <div className="mt-2">
          <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums">
            {savingsRate}%
          </h3>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3">
            <div 
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-700" 
              style={{ width: `${Math.min(savingsRate, 100)}%` }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
