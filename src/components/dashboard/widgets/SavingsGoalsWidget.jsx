import React from 'react';
import { PiggyBank, ChevronRight, Plus } from 'lucide-react';

export default function SavingsGoalsWidget({
  savingsGoals = [],
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  onOpenSavingsGoals = () => {},
  className = ''
}) {
  const goals = Array.isArray(savingsGoals) ? savingsGoals : [];
  const hasGoals = goals.length > 0;

  const totalSaved = goals.reduce((sum, g) => sum + (Number(g.currentAmount ?? g.current_amount ?? g.savedAmount) || 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + (Number(g.targetAmount ?? g.target_amount ?? g.amount) || 0), 0);
  const percent = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const mainGoal = goals[0];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenSavingsGoals}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenSavingsGoals?.();
        }
      }}
      className={`h-full flex flex-col justify-between min-w-0 w-full rounded-3xl bg-white dark:bg-zinc-900/90 p-4 sm:p-5 border border-slate-200/60 dark:border-white/[0.08] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] select-none cursor-pointer transition-all hover:border-emerald-500/40 group ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <PiggyBank className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400 truncate">
            Metas de ahorro
          </span>
        </div>
        {hasGoals ? (
          <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 tabular-nums shrink-0">
            {percent}%
          </span>
        ) : (
          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 shrink-0">
            Alcancías
          </span>
        )}
      </div>

      <div className="my-2 min-w-0">
        {hasGoals ? (
          <>
            <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums truncate leading-tight">
              {formatMoney(totalSaved)}
            </h3>
            <div className="flex items-center justify-between gap-2 mt-1 min-w-0 text-xs text-slate-500 dark:text-zinc-400 font-mono">
              <span className="truncate">
                {mainGoal?.name ? mainGoal.name : `${goals.length} metas`}
              </span>
              <span className="shrink-0 tabular-nums text-slate-400 dark:text-zinc-500">
                de {formatMoney(totalTarget)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
              />
            </div>
          </>
        ) : (
          <div className="py-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Sin metas activas</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-mono">Define tus alcancías y objetivos</p>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500 group-hover:text-emerald-500 transition-colors">
        <span className="truncate">
          {hasGoals ? (goals.length > 1 ? `${goals.length} metas registradas` : 'Ver detalle') : 'Crear meta'}
        </span>
        {hasGoals ? (
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
        ) : (
          <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform shrink-0" />
        )}
      </div>
    </div>
  );
}
