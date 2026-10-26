import React from 'react';
import { HandCoins } from 'lucide-react';

/**
 * DebtsWidget
 * Widget de Préstamos y Deudas para el Dashboard.
 * Armonizado para paridad de altura idéntica con InvestmentsWidget.
 */
export default function DebtsWidget({
  debtsAndLoansMetrics = { totalReceivableCOP: 0, totalPayableCOP: 0, receivableCount: 0, payableCount: 0 },
  onNavigateToTab = () => {},
  setActiveTab = null,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`,
  isReordering = false,
  className = ''
}) {
  const handleNav = (tab = 'debts') => {
    if (isReordering) return;
    if (typeof onNavigateToTab === 'function') onNavigateToTab(tab);
    else if (typeof setActiveTab === 'function') setActiveTab(tab);
  };

  const totalActivos = (debtsAndLoansMetrics.receivableCount || 0) + (debtsAndLoansMetrics.payableCount || 0);
  const netBalance = (debtsAndLoansMetrics.totalReceivableCOP || 0) - (debtsAndLoansMetrics.totalPayableCOP || 0);

  return (
    <div 
      onClick={() => handleNav('debts')}
      className={`h-full flex flex-col justify-between min-w-0 w-full rounded-3xl bg-white dark:bg-zinc-900/90 p-4 sm:p-5 border border-slate-300/80 dark:border-white/[0.08] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] select-none cursor-pointer transition-all hover:border-emerald-500/40 hover:shadow-md active:scale-[0.99] group ${className}`}
    >
      <div>
        {/* Encabezado */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <HandCoins className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Préstamos y deudas</span>
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">
            {totalActivos} activos
          </span>
        </div>

        {/* Bloque resumido y armonizado */}
        <div className="grid grid-cols-2 gap-2 my-1">
          <div 
            className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block truncate">
              Préstamos ({debtsAndLoansMetrics.receivableCount || 0})
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight block mt-0.5 truncate">
              {formatMoney(debtsAndLoansMetrics.totalReceivableCOP)}
            </span>
          </div>

          <div 
            className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 transition-colors"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 block truncate">
              Deudas ({debtsAndLoansMetrics.payableCount || 0})
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums tracking-tight block mt-0.5 truncate">
              -{formatMoney(debtsAndLoansMetrics.totalPayableCOP)}
            </span>
          </div>
        </div>
      </div>

      {/* Pie simétrico con Inversiones */}
      <div className="pt-2.5 mt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-500 dark:text-zinc-400 font-medium">
          Balance neto:
        </span>
        <span className={`font-bold font-mono tracking-tight tabular-nums ${
          netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}>
          {netBalance >= 0 ? '+' : ''}{formatMoney(netBalance)}
        </span>
      </div>
    </div>
  );
}

export { DebtsWidget };
