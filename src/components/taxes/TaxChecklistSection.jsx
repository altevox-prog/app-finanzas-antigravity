import React, { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { DEFAULT_CHECKLIST_ITEMS } from '../../utils/taxUtils';

export default function TaxChecklistSection({
  checklist = {},
  toggleChecklistStep,
  items = DEFAULT_CHECKLIST_ITEMS
}) {
  const completedStepsCount = useMemo(() => {
    return items.filter(step => checklist[step.id]).length;
  }, [items, checklist]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100">
            Ruta y Checklist de la Renta
          </h3>
        </div>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {completedStepsCount} de {items.length} listos
        </span>
      </div>

      {/* Barra de progreso del checklist */}
      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${(completedStepsCount / items.length) * 100}%` }}
        />
      </div>

      {/* Pasos interactivos estilo checklist */}
      <div className="p-5 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-white/70 dark:border-white/[0.08] space-y-3 shadow-xs">
        {items.map((step, index) => {
          const isDone = Boolean(checklist[step.id]);

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => toggleChecklistStep(step.id)}
              className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer group active:scale-[0.99] ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/25 dark:bg-emerald-500/10'
                  : 'bg-white/40 dark:bg-white/[0.04] border-white/60 dark:border-white/[0.06] hover:bg-white/60 dark:hover:bg-white/[0.08]'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-white/30 group-hover:border-emerald-500 transition-colors" />
                )}
              </div>

              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-zinc-400">
                    Paso {index + 1}
                  </span>
                  <h5 className={`text-xs sm:text-sm font-semibold transition-all ${
                    isDone
                      ? 'line-through text-slate-400 dark:text-slate-500'
                      : 'text-slate-900 dark:text-white'
                  }`}>
                    {step.title}
                  </h5>
                </div>
                <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium leading-relaxed">
                  {step.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
