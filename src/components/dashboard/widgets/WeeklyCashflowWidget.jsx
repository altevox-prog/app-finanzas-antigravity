import React from 'react';
import SegmentedControl from '../../common/SegmentedControl';

/**
 * WeeklyCashflowWidget
 * Subcomponente de distribución semanal de flujo de caja para el Dashboard.
 */
export default function WeeklyCashflowWidget({
  weeklyCashFlow,
  hoveredWeekIndex,
  setHoveredWeekIndex,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`,
  currentPeriod,
  setPeriod,
  periodOptions = [
    { id: 'month', label: 'Mensual' },
    { id: 'week', label: 'Semanal' },
    { id: 'day', label: 'Diario' }
  ]
}) {
  const weeks = weeklyCashFlow?.weeks || [];
  const maxVal = weeklyCashFlow?.maxVal || 100000;

  return (
    <div 
      className="p-5 sm:p-6 bg-white dark:bg-zinc-900/90 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Flujo de caja semanal
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Ingresos vs. gastos
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Distribución acumulada a lo largo del mes en curso
          </p>
        </div>

        <div className="flex items-center gap-3">
          {setPeriod && (
            <div className="w-56 sm:w-60">
              <SegmentedControl
                options={periodOptions}
                value={currentPeriod}
                onChange={setPeriod}
                size="sm"
              />
            </div>
          )}

          <div className="hidden sm:flex items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">Ingresos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-600 dark:text-slate-300">Gastos</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <div className="grid grid-cols-5 gap-2 sm:gap-4 h-48 sm:h-52 items-end pt-6 pb-2 px-2 border-b border-slate-100 dark:border-white/5">
          {weeks.map((week, idx) => {
            const incomeHeight = Math.max(6, Math.round((week.income / maxVal) * 160));
            const expenseHeight = Math.max(6, Math.round((week.expense / maxVal) * 160));
            const isHovered = hoveredWeekIndex === idx;

            return (
              <div
                key={week.name}
                onMouseEnter={() => setHoveredWeekIndex && setHoveredWeekIndex(idx)}
                onMouseLeave={() => setHoveredWeekIndex && setHoveredWeekIndex(null)}
                className={`flex flex-col items-center justify-end h-full group relative transition-all ${
                  isHovered ? 'opacity-100' : 'hover:opacity-90'
                }`}
              >
                {isHovered && (
                  <div className="absolute -top-14 z-20 px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-black text-white text-[11px] shadow-xl border border-white/10 pointer-events-none whitespace-nowrap animate-fadeIn flex flex-col gap-0.5">
                    <span className="text-emerald-400 font-bold">+{formatMoney(week.income)}</span>
                    <span className="text-rose-400 font-bold">-{formatMoney(week.expense)}</span>
                  </div>
                )}

                <div className="flex items-end gap-1.5 sm:gap-2 w-full justify-center">
                  <div className="w-3.5 sm:w-5 bg-slate-100 dark:bg-white/5 rounded-t-xl overflow-hidden flex items-end">
                    <div
                      className="w-full bg-emerald-500 rounded-t-xl transition-all duration-700 group-hover:brightness-110 shadow-sm"
                      style={{ height: `${incomeHeight}px` }}
                    />
                  </div>
                  <div className="w-3.5 sm:w-5 bg-slate-100 dark:bg-white/5 rounded-t-xl overflow-hidden flex items-end">
                    <div
                      className="w-full bg-rose-500 rounded-t-xl transition-all duration-700 group-hover:brightness-110 shadow-sm"
                      style={{ height: `${expenseHeight}px` }}
                    />
                  </div>
                </div>

                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-2 block">
                  {week.name}
                </span>
                <span className="text-[9px] text-slate-400 block -mt-0.5">
                  {week.range}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { WeeklyCashflowWidget };
