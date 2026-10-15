import React from 'react';
import { Landmark, ChevronRight } from 'lucide-react';

/**
 * NetWorthWidget
 * Widget de Patrimonio Total Neto para el Dashboard.
 */
export default function NetWorthWidget({
  netWorthCOP = 0,
  totalAssetsCOP = 0,
  totalPayableCOP = 0,
  isNetWorthPositive = true,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`,
  onNavigateToTab = () => {},
  setActiveTab = null,
  isReordering = false
}) {
  const handleNav = (tab = 'accounts') => {
    if (isReordering) return;
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
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
              isNetWorthPositive 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}>
              {isNetWorthPositive ? 'Solvente' : 'Pasivo Alto'}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
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

export { NetWorthWidget };
