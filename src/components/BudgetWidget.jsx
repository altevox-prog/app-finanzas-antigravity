import React from 'react';
import { Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';

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
      className="p-4 sm:p-5 rounded-3xl border shadow-sm transition-all relative overflow-hidden bg-white dark:bg-[#12141C] border-slate-200/80 dark:border-white/10"
    >
      <div className="flex items-center justify-between mb-3.5 gap-2">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          >
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[14px] sm:text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Meta y Presupuesto
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              Consumo mensual de ingresos
            </p>
          </div>
        </div>

        <span 
          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 tabular-nums shrink-0 ${statusBadgeClasses}`}
        >
          {isHealthy && <CheckCircle2 className="w-3 h-3" />}
          {isWarning && <AlertTriangle className="w-3 h-3" />}
          {isExceeded && <AlertTriangle className="w-3 h-3" />}
          {statusLabel}
        </span>
      </div>

      {/* Barra de Progreso del Presupuesto */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold tabular-nums">
          <span className="text-slate-600 dark:text-slate-400 text-[12px] font-medium">
            {clampedPercent}% ejecutado
          </span>
          <span className={`font-bold text-[12px] ${statusTextClasses}`}>
            {isExceeded ? 'Excedido en ' + formatMoney(totalExpense - totalIncome) : 'Margen: ' + formatMoney(remaining)}
          </span>
        </div>

        {/* Fondo de barra: bg-slate-200 en claro para contraste perfecto sobre blanco */}
        <div className="w-full h-2.5 rounded-full overflow-hidden p-0.5 bg-slate-200 dark:bg-slate-800">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${Math.max(4, clampedPercent)}%`, 
              backgroundColor: progressBarColor 
            }}
          />
        </div>
      </div>

      {/* Desglose inferior */}
      <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-200/80 dark:border-white/10 text-xs">
        <div>
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium block">Total Gastado</span>
          <span className="text-[14px] font-bold text-rose-600 dark:text-rose-400 tabular-nums block mt-0.5">
            {formatMoney(totalExpense)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium block">Capacidad / Ingresos</span>
          <span className="text-[14px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums block mt-0.5">
            {formatMoney(totalIncome)}
          </span>
        </div>
      </div>
    </div>
  );
}
