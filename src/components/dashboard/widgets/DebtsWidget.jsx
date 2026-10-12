import React from 'react';
import { HandCoins, Plus, ArrowRight } from 'lucide-react';

/**
 * DebtsWidget
 * Widget de Préstamos y Deudas para el Dashboard.
 */
export default function DebtsWidget({
  debtsAndLoansMetrics = { totalReceivableCOP: 0, totalPayableCOP: 0, receivableCount: 0, payableCount: 0 },
  onNavigateToTab = () => {},
  setActiveTab = null,
  onOpenAddDebt = null,
  onOpenAddLoan = null,
  setIsNewDebtModalOpen = null,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`
}) {
  const handleNav = (tab = 'debts') => {
    if (typeof onNavigateToTab === 'function') onNavigateToTab(tab);
    else if (typeof setActiveTab === 'function') setActiveTab(tab);
  };

  const handleAdd = (e, type = 'payable') => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (typeof onOpenAddDebt === 'function') {
      onOpenAddDebt(type);
    } else if (typeof setIsNewDebtModalOpen === 'function') {
      setIsNewDebtModalOpen(true);
    } else if (typeof onOpenAddLoan === 'function') {
      onOpenAddLoan(type);
    } else {
      handleNav('debts');
    }
  };

  const totalActivos = (debtsAndLoansMetrics.receivableCount || 0) + (debtsAndLoansMetrics.payableCount || 0);

  return (
    <div 
      onClick={() => handleNav('debts')}
      className="min-h-[140px] p-5 sm:p-6 bg-white dark:bg-zinc-900/90 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <HandCoins className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Préstamos y Deudas</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-semibold">
              {totalActivos} activos
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
                handleAdd(e, 'payable');
              }}
              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm"
              title="Añadir deuda o préstamo"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </div>
        </div>

        {/* Bloque resumido y armonizado */}
        <div className="grid grid-cols-2 gap-2 my-1">
          <div 
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAdd(e, 'receivable');
            }}
            className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors cursor-pointer"
            title="Registrar préstamo que me deben"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block truncate">
              Me deben ({debtsAndLoansMetrics.receivableCount || 0})
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight block mt-0.5 truncate">
              {formatMoney(debtsAndLoansMetrics.totalReceivableCOP)}
            </span>
          </div>

          <div 
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAdd(e, 'payable');
            }}
            className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 transition-colors cursor-pointer"
            title="Registrar deuda que debo pagar"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 block truncate">
              Debo ({debtsAndLoansMetrics.payableCount || 0})
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums tracking-tight block mt-0.5 truncate">
              -{formatMoney(debtsAndLoansMetrics.totalPayableCOP)}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
        <span className="text-slate-400 text-[11px] font-medium font-mono">
          Balance crediticio neto
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNav('debts');
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

export { DebtsWidget };
