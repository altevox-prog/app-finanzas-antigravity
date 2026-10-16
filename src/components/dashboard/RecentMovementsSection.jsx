import React from 'react';
import { 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Inbox
} from 'lucide-react';

/**
 * RecentMovementsSection
 * Componente modular para el widget de "Movimientos Recientes" en el Dashboard.
 * Muestra el resumen de las últimas transacciones del período. Toda la tarjeta navega a transacciones.
 */
export default function RecentMovementsSection({
  transactions = [],
  onViewAll = null,
  setActiveTab = null,
  onNavigateToTab = null,
  onSelectTransaction = null,
  onOpenTransaction = null,
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  limit = 4,
  className = '',
  isReordering = false
}) {
  const safeList = Array.isArray(transactions) ? transactions : [];
  const count = safeList.length;
  const recentTransactions = safeList.slice(0, limit);

  // Redirección hacia la vista principal de transacciones
  const handleViewAll = (e) => {
    if (isReordering) return;
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (typeof onViewAll === 'function') {
      onViewAll();
    } else if (typeof setActiveTab === 'function') {
      setActiveTab('transactions');
    } else if (typeof onNavigateToTab === 'function') {
      onNavigateToTab('transactions');
    }
  };

  return (
    <div
      onClick={handleViewAll}
      className={`bg-white dark:bg-zinc-900/90 rounded-3xl border border-slate-200/60 dark:border-white/[0.08] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] p-4 sm:p-5 flex flex-col justify-between transition-all select-none hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group ${className}`}
    >
      <div>
        {/* Encabezado del widget */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
                Movimientos Recientes
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium truncate">
                {count} {count === 1 ? 'registro' : 'registros'} este período
              </p>
            </div>
          </div>
        </div>

        {/* Listado de últimas transacciones o estado vacío */}
        <div className="min-h-[140px] flex flex-col justify-center">
          {count === 0 ? (
            <div className="py-6 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 flex items-center justify-center mb-2">
                <Inbox className="w-5 h-5 opacity-70" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Sin movimientos
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                No hay ingresos ni gastos registrados este período.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {recentTransactions.map((tx, idx) => {
                const type = String(tx?.type || '').toLowerCase();
                const amt = Number(tx?.amount) || 0;
                const isTransfer = type === 'transfer' || type === 'transferencia' || Boolean(tx?.isTransfer);
                const isExpense = !isTransfer && (type === 'expense' || type === 'gasto' || type === 'egreso' || amt < 0);
                const isIncome = !isTransfer && (type === 'income' || type === 'ingreso' || (!isExpense && amt > 0));
                const noteOrCategory = tx?.note || tx?.categoryName || tx?.category || 'Movimiento';
                const accountLabel = tx?.accountName || tx?.account || '';
                const dateLabel = tx?.date ? String(tx.date).split('T')[0] : '';

                return (
                  <div
                    key={tx?.id || idx}
                    className="flex items-center justify-between py-2.5 px-1.5 -mx-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group/item"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isExpense
                            ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
                            : isIncome
                              ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                              : 'bg-slate-500/10 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {isExpense ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : isIncome ? (
                          <ArrowDownRight className="w-4 h-4" />
                        ) : (
                          <Activity className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate group-hover/item:text-emerald-600 dark:group-hover/item:text-emerald-400 transition-colors">
                          {noteOrCategory}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                          {accountLabel ? `${accountLabel} • ` : ''}
                          {dateLabel || 'Reciente'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs sm:text-sm font-bold font-mono tabular-nums whitespace-nowrap ${
                          isExpense
                            ? 'text-rose-500 dark:text-rose-400'
                            : isIncome
                              ? 'text-emerald-500 dark:text-emerald-400'
                              : 'text-slate-600 dark:text-zinc-300'
                        }`}
                      >
                        {isExpense ? '-' : isIncome ? '+' : ''}
                        {formatMoney(Math.abs(amt))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const RecentMovementsWidget = RecentMovementsSection;
export const TransactionsWidget = RecentMovementsSection;
