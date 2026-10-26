import React from 'react';
import { HandCoins, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePrivacy } from '../../../context/PrivacyContext';

export default function DebtsAndBudgetWidget({
  debtsAndLoansMetrics = { totalReceivableCOP: 0, totalPayableCOP: 0, receivableCount: 0, payableCount: 0 },
  monthlyStats = {},
  totalIncome: propIncome,
  totalExpense: propExpense,
  budgets,
  globalBudget,
  onNavigateToTab = () => {},
  setActiveTab = null,
  formatMoney: propFormatMoney,
  isReordering = false,
  className = ''
}) {
  const { formatMoney: privacyFormatMoney } = usePrivacy();
  const formatMoney = propFormatMoney || privacyFormatMoney;

  const handleNav = (tab = 'debts') => {
    if (isReordering) return;
    if (typeof onNavigateToTab === 'function') onNavigateToTab(tab);
    else if (typeof setActiveTab === 'function') setActiveTab(tab);
  };

  const totalActivos = (debtsAndLoansMetrics.receivableCount || 0) + (debtsAndLoansMetrics.payableCount || 0);
  const netBalance = (debtsAndLoansMetrics.totalReceivableCOP || 0) - (debtsAndLoansMetrics.totalPayableCOP || 0);

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
  const limitLabel = hasConfiguredBudget ? 'Presupuesto' : 'Ingresos';

  const percentage = budgetLimit > 0 ? (totalSpent / budgetLimit) * 100 : 0;
  const clampedPercent = Math.min(100, Math.round(percentage));
  const remaining = budgetLimit - totalSpent;

  const isExceeded = budgetLimit > 0 ? totalSpent > budgetLimit : totalSpent > 0;
  const isWarning = !isExceeded && percentage >= 80 && percentage <= 100;
  const isHealthy = !isExceeded && !isWarning;

  const statusLabel = isExceeded ? 'Excedido' : isWarning ? 'Moderado' : 'En meta';
  const statusBadgeClasses = isExceeded
    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    : isWarning
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';

  const progressBarColor = isExceeded ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981';

  return (
    <div
      className={`h-full flex flex-col justify-between min-w-0 w-full rounded-3xl bg-white dark:bg-zinc-900/90 p-4 sm:p-5 border border-slate-300/80 dark:border-white/[0.08] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] select-none cursor-pointer transition-all hover:border-emerald-500/40 hover:shadow-md group ${className}`}
    >
      {/* 1. SECCIÓN SUPERIOR: PRÉSTAMOS Y DEUDAS */}
      <div onClick={() => handleNav('debts')} className="min-w-0 w-full">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <HandCoins className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Préstamos y deudas</span>
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">{totalActivos} activos</span>
        </div>

        <div className="grid grid-cols-2 gap-2 my-1.5">
          <div className="p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block truncate">
              Préstamos ({debtsAndLoansMetrics.receivableCount || 0})
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight block mt-0.5 truncate">
              {formatMoney(debtsAndLoansMetrics.totalReceivableCOP)}
            </span>
          </div>
          <div className="p-2 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 block truncate">
              Deudas ({debtsAndLoansMetrics.payableCount || 0})
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums tracking-tight block mt-0.5 truncate">
              -{formatMoney(debtsAndLoansMetrics.totalPayableCOP)}
            </span>
          </div>
        </div>

        <div className="pt-1.5 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500 dark:text-zinc-400 font-medium text-[11px]">Balance neto:</span>
          <span className={`font-bold tabular-nums text-xs ${netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {netBalance >= 0 ? '+' : ''}{formatMoney(netBalance)}
          </span>
        </div>
      </div>

      {/* 2. LÍNEA SEPARADORA */}
      <div className="border-t border-slate-100 dark:border-white/[0.06] my-3" />

      {/* 3. SECCIÓN INFERIOR: PRESUPUESTO */}
      <div onClick={() => handleNav('transactions')} className="min-w-0 w-full">
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Target className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Presupuesto
            </span>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 tabular-nums shrink-0 ${statusBadgeClasses}`}>
            {isHealthy && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            {(isWarning || isExceeded) && <AlertTriangle className="w-3 h-3" />}
            <span>{clampedPercent}% • {statusLabel}</span>
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono font-medium tabular-nums">
            <span className="text-slate-500 dark:text-zinc-400">{clampedPercent}% ejecutado</span>
            <span className={`font-semibold ${isExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {isExceeded ? `Excedido ${formatMoney(totalSpent - budgetLimit)}` : `Disponible: ${formatMoney(remaining)}`}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden my-1.5">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(4, clampedPercent)}%`, backgroundColor: progressBarColor }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.04] text-[11px] font-mono">
          <div>
            <span className="text-slate-400 block text-[10px]">Gastado</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 block truncate">{formatMoney(totalSpent)}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">{limitLabel}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block truncate">{formatMoney(budgetLimit)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
