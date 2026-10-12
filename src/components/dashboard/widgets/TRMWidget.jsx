import React from 'react';
import { TrendingUp } from 'lucide-react';

/**
 * TRMWidget
 * Subcomponente de cotización oficial TRM USD/COP para el Dashboard.
 */
export default function TRMWidget({ trm = 4050 }) {
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

export { TRMWidget };
