import React from 'react';
import { CalendarSync, Plus, ArrowRight } from 'lucide-react';
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
  onOpenAddRecurring = null,
  setIsRecurringModalOpen = null
}) {
  const handleNav = (tab = 'recurring') => {
    if (typeof onNavigateToTab === 'function') onNavigateToTab(tab);
    else if (typeof setActiveTab === 'function') setActiveTab(tab);
  };

  const handleAdd = (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (typeof onOpenAddRecurring === 'function') {
      onOpenAddRecurring();
    } else if (typeof setIsRecurringModalOpen === 'function') {
      setIsRecurringModalOpen(true);
    } else {
      handleNav('recurring');
    }
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
      className="min-h-[140px] p-4 sm:p-5 bg-white dark:bg-zinc-900/90 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group overflow-hidden"
    >
      <div>
        {/* Cabecera interna limpia ([📅] Gasto fijo proyectado) sin elementos flotantes externos */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 min-w-0">
            <CalendarSync className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate uppercase">GASTO FIJO PROYECTADO</span>
          </span>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAdd(e);
            }}
            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
            title="Añadir nuevo pago recurrente"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir</span>
          </button>
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

      {/* Footer homogéneo */}
      <div className="pt-3 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          Pagos periódicos
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNav('recurring');
          }}
          className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform hover:underline cursor-pointer"
        >
          <span>Gestionar</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export { RecurringPaymentsWidget };
