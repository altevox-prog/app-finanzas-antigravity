import React from 'react';
import { Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePrivacy } from '../../../context/PrivacyContext';

export default function BudgetWidget({
  monthlyStats = {},
  totalIncome: propIncome,
  totalExpense: propExpense,
  budgets,
  globalBudget,
  formatMoney: propFormatMoney
}) {
  const { formatMoney: privacyFormatMoney } = usePrivacy();
  const formatMoney = propFormatMoney || privacyFormatMoney;

  const totalIncome = Number(propIncome ?? monthlyStats?.totalIncome ?? 0);
  const totalSpent = Number(propExpense ?? monthlyStats?.totalExpense ?? 0);

  const resolveGlobalBudget = () => {
    if (globalBudget !== undefined && Number(globalBudget) > 0) return Number(globalBudget);
    if (budgets?.global && Number(budgets.global) > 0) return Number(budgets.global);
    if (monthlyStats?.globalBudget && Number(monthlyStats.globalBudget) > 0) return Number(monthlyStats.globalBudget);
    try {
      const storedLimit = localStorage.getItem('global_budget_limit');
      if (storedLimit && Number(storedLimit) > 0) return Number(storedLimit);
      const storedBudgets = JSON.parse(localStorage.getItem('presu_budgets_v1') || localStorage.getItem('budgets') || '{}');
      if (storedBudgets?.global && Number(storedBudgets.global) > 0) return Number(storedBudgets.global);
      const userSettings = JSON.parse(localStorage.getItem('user_settings') || '{}');
      if (userSettings?.global_budget_limit && Number(userSettings.global_budget_limit) > 0) return Number(userSettings.global_budget_limit);
    } catch {}
    return 0;
  };

  const configuredBudget = resolveGlobalBudget();
  const hasConfiguredBudget = configuredBudget > 0;
  const budgetLimit = hasConfiguredBudget ? configuredBudget : totalIncome;
  const limitLabel = hasConfiguredBudget ? 'Presupuesto Global' : 'Capacidad / Ingresos';

  const percentage = budgetLimit > 0 ? (totalSpent / budgetLimit) * 100 : 0;
  const clampedPercent = Math.min(100, Math.round(percentage));
  const remaining = budgetLimit - totalSpent;

  const isExceeded = budgetLimit > 0 ? totalSpent > budgetLimit : totalSpent > 0;
  const isWarning = !isExceeded && percentage >= 80 && percentage <= 100;
  const isHealthy = !isExceeded && !isWarning;

  const statusLabel = isExceeded ? 'Presupuesto excedido' : isWarning ? 'Consumo moderado' : 'En meta';

  const statusTextClasses = isExceeded
    ? 'text-rose-600 dark:text-rose-400'
    : isWarning
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';

  const statusBadgeClasses = isExceeded
    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    : isWarning
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';

  const progressBarColor = isExceeded ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981';

  return (
    <div className="h-full flex flex-col justify-between min-w-0 w-full rounded-3xl bg-white dark:bg-zinc-900/90 p-4 sm:p-5 border border-slate-300/80 dark:border-white/[0.08] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] select-none relative overflow-hidden">
      <div>
        <div className="flex items-center justify-between mb-3.5 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100 leading-tight">
                Presupuesto
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono truncate">
                {hasConfiguredBudget ? 'Límite mensual global' : 'Basado en ingresos'}
              </p>
            </div>
          </div>

          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 tabular-nums shrink-0 ${statusBadgeClasses}`}>
            {isHealthy && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            {isWarning && <AlertTriangle className="w-3 h-3 text-amber-500" />}
            {isExceeded && <AlertTriangle className="w-3 h-3 text-rose-500" />}
            <span>{clampedPercent}% • {statusLabel}</span>
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-mono font-medium tabular-nums">
            <span className="text-slate-500 dark:text-zinc-400">
              {clampedPercent}% ejecutado
            </span>
            <span className={`font-semibold ${statusTextClasses}`}>
              {isExceeded ? `Excedido en ${formatMoney(totalSpent - budgetLimit)}` : `Disponible: ${formatMoney(remaining)}`}
            </span>
          </div>

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
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/80 dark:border-white/[0.08] text-xs">
        <div>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono block">Total Gastado</span>
          <span className="text-base sm:text-lg font-bold font-mono tracking-tight tabular-nums text-rose-600 dark:text-rose-400 block mt-0.5">
            {formatMoney(totalSpent)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono block">{limitLabel}</span>
          <span className="text-base sm:text-lg font-bold font-mono tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400 block mt-0.5">
            {formatMoney(budgetLimit)}
          </span>
        </div>
      </div>
    </div>
  );
}
