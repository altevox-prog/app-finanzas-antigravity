import React from 'react';
import { TrendingUp } from 'lucide-react';

/**
 * InvestmentsWidget
 * Widget de Inversiones y Activos para el Dashboard.
 * Armonizado para paridad de altura idéntica con DebtsWidget.
 */
export default function InvestmentsWidget({
  investmentsMetrics = { totalCurrentValueCOP: 0, totalInvestedCostCOP: 0, netProfitCOP: 0, profitPercentage: 0, isPositive: true },
  onNavigateToTab = () => {},
  setActiveTab = null,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`,
  className = '',
  isReordering = false
}) {
  const handleNav = (tab = 'investments') => {
    if (isReordering) return;
    if (typeof onNavigateToTab === 'function') onNavigateToTab(tab);
    else if (typeof setActiveTab === 'function') setActiveTab(tab);
  };

  return (
    <div 
      onClick={() => handleNav('investments')}
      className={`h-full flex flex-col justify-between min-w-0 w-full rounded-3xl bg-white dark:bg-zinc-900/90 p-3.5 sm:p-4 border border-slate-300/80 dark:border-white/[0.08] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] select-none cursor-pointer transition-all hover:border-emerald-500/40 hover:shadow-md active:scale-[0.99] group ${className}`}
    >
      <div>
        {/* Encabezado */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Inversiones</span>
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono tabular-nums border ${
            investmentsMetrics.isPositive 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}>
            {investmentsMetrics.isPositive ? '+' : ''}{investmentsMetrics.profitPercentage.toFixed(2)}%
          </span>
        </div>

        {/* Bloque resumido y armonizado (Paridad simétrica con DebtsWidget) */}
        <div className="grid grid-cols-2 gap-2 my-0.5">
          <div 
            className="py-1.5 px-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-white/[0.08] hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60 transition-colors"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 block truncate">
              Capital invertido
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-zinc-100 tabular-nums tracking-tight block mt-0.5 truncate">
              {formatMoney(investmentsMetrics.totalInvestedCostCOP)}
            </span>
          </div>

          <div 
            className={`py-1.5 px-2.5 rounded-2xl transition-colors border ${
              investmentsMetrics.isPositive
                ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15'
                : 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/15'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider block truncate ${
              investmentsMetrics.isPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
            }`}>
              Rentabilidad
            </span>
            <span className={`text-sm sm:text-base font-bold font-mono tabular-nums tracking-tight block mt-0.5 truncate ${
              investmentsMetrics.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {investmentsMetrics.isPositive ? '+' : ''}{formatMoney(investmentsMetrics.netProfitCOP)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { InvestmentsWidget };
