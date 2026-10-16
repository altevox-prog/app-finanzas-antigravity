import React from 'react';
import { Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePrivacy } from '../../../context/PrivacyContext';

export default function BudgetWidget({
  monthlyStats
}) {
  const { formatMoney } = usePrivacy();

  const totalIncome = monthlyStats.totalIncome || 0;
  const totalExpense = monthlyStats.totalExpense || 0;
  const remaining = Math.max(0, totalIncome - totalExpense);

  // If no income, calculate percentage against reference or 0
  const budgetRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
  const clampedPercent = Math.min(100, Math.round(budgetRatio));

  const isHealthy = budgetRatio < 75;
  const isWarning = budgetRatio >= 75 && budgetRatio <= 100;
  const isExceeded = budgetRatio > 100;

  const statusLabel = isExceeded ? 'Déficit superado' : isWarning ? 'Cerca del límite' : 'Presupuesto saludable';

  // Contraste optimizado WCAG para Modo Claro y Modo Oscuro
  const statusBadgeClasses = isExceeded
    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25'
    : isWarning
    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25'
    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25';

  const statusTextClasses = isExceeded
    ? 'text-rose-700 dark:text-rose-400'
    : isWarning
    ? 'text-amber-700 dark:text-amber-400'
    : 'text-emerald-700 dark:text-emerald-400';

  const progressBarColor = isExceeded ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981';

  return (
    <div 
      className="p-4 sm:p-5 rounded-3xl border border-slate-200/60 dark:border-white/[0.08] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] transition-all relative overflow-hidden bg-white dark:bg-zinc-900/90"
    >
      <div className="flex items-center justify-between mb-3.5 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div 
            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0"
          >
            <Target className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="truncate">
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100 leading-tight truncate">
              Meta y Presupuesto
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
              Consumo mensual de ingresos
            </p>
          </div>
        </div>

        <span 
          className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 flex items-center gap-1 tabular-nums shrink-0"
        >
          {isHealthy && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
          {isWarning && <AlertTriangle className="w-3 h-3 text-amber-500" />}
          {isExceeded && <AlertTriangle className="w-3 h-3 text-rose-500" />}
          <span>{clampedPercent}% • {statusLabel}</span>
        </span>
      </div>

      {/* Barra de Progreso del Presupuesto */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-mono font-medium tabular-nums">
          <span className="text-slate-500 dark:text-zinc-400">
            {clampedPercent}% ejecutado
          </span>
          <span className={`font-semibold ${statusTextClasses}`}>
            {isExceeded ? 'Excedido en ' + formatMoney(totalExpense - totalIncome) : 'Margen: ' + formatMoney(remaining)}
          </span>
        </div>

        {/* Riel y Relleno de Progreso estandarizados */}
        <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3 mb-2">
          <div 
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${Math.max(4, clampedPercent)}%`, 
              backgroundColor: progressBarColor 
            }}
          />
        </div>
      </div>

      {/* Desglose inferior */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/80 dark:border-white/[0.08] text-xs">
        <div>
          <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono block">Total Gastado</span>
          <span className="text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums text-rose-600 dark:text-rose-400 block mt-0.5">
            {formatMoney(totalExpense)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono block">Capacidad / Ingresos</span>
          <span className="text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400 block mt-0.5">
            {formatMoney(totalIncome)}
          </span>
        </div>
      </div>
    </div>
  );
}
