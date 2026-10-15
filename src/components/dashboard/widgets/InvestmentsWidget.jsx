import React from 'react';
import { TrendingUp } from 'lucide-react';

/**
 * InvestmentsWidget
 * Widget de Inversiones y Activos para el Dashboard.
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
      className={`min-h-[140px] p-5 sm:p-6 bg-white dark:bg-zinc-900/90 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
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

export { InvestmentsWidget };
