import React from 'react';
import { CalendarSync, ChevronRight } from 'lucide-react';
import { safeNumber } from '../../../utils/financeMath';

/**
 * RecurringPaymentsWidget
 * Subcomponente de pagos periódicos y suscripciones fijas para el Dashboard.
 */
export default function RecurringPaymentsWidget({
  recurringPayments = [],
  subscriptions = [],
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`,
  onNavigateToTab = () => {},
  setActiveTab = null,
  isReordering = false
}) {
  const handleNav = (tab = 'recurring') => {
    if (isReordering) return;
    if (typeof onNavigateToTab === 'function') onNavigateToTab(tab);
    else if (typeof setActiveTab === 'function') setActiveTab(tab);
  };

  const allRecurring = recurringPayments.length > 0 ? recurringPayments : subscriptions;
  const activeRecurring = allRecurring.filter(r => r.isActive !== false);
  const totalMonth = activeRecurring.reduce((sum, item) => {
    const amt = safeNumber(item.amount);
    if (item.type === 'income') return sum;
    if (item.frequency === 'yearly') return sum + Math.round(amt / 12);
    if (item.frequency === 'biweekly') return sum + (amt * 2);
    if (item.frequency === 'weekly') return sum + Math.round(amt * 4.33);
    return sum + amt;
  }, 0);

  return (
    <div 
      onClick={() => handleNav('recurring')}
      className="p-4 sm:p-5 bg-white dark:bg-zinc-900/90 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group overflow-hidden"
    >
      <div>
        {/* Cabecera interna limpia ([📅] Presupuesto mensual) sin elementos flotantes externos */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 min-w-0">
            <CalendarSync className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate uppercase">PRESUPUESTO MENSUAL</span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Cuerpo */}
        <div className="mt-1">
          {activeRecurring.length === 0 ? (
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Sin pagos activos
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                No tienes suscripciones o pagos periódicos este mes.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-zinc-100 leading-none">
                  {formatMoney(totalMonth)}
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  / mes
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                Total programado para el período
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { RecurringPaymentsWidget };
