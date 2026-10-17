import React from 'react';
import { 
  Activity, 
  ArrowUpRight,
  Inbox
} from 'lucide-react';
import CategoryIcon from '../categories/components/CategoryIcon';

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
      className={`rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/80 dark:border-white/[0.07] p-5 shadow-sm flex flex-col justify-between transition-all select-none hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group ${className}`}
    >
      <div>
        {/* Encabezado del widget */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                Movimientos Recientes
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
                {count} {count === 1 ? 'registro' : 'registros'} este período
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleViewAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors py-1 px-2 rounded-lg hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 cursor-pointer select-none"
          >
            <span>Ver todos</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Listado de últimas transacciones o estado vacío */}
        <div className="min-h-[140px] flex flex-col justify-center">
          {count === 0 ? (
            <div className="py-6 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 flex items-center justify-center mb-2">
                <Inbox className="w-5 h-5 opacity-70" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Sin movimientos
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                No hay ingresos ni gastos registrados este período.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
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
                    className="flex items-center justify-between py-2.5 px-3 border-b border-slate-100 dark:border-white/[0.04] last:border-b-0 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors rounded-xl group/item"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-white/10 shadow-xs">
                        <CategoryIcon
                          category={tx?.categoryName || tx?.category || tx?.category_id}
                          icon={tx?.category?.icon || tx?.icon}
                          status={isExpense ? 'negative' : isIncome ? 'positive' : 'neutral'}
                          size={16}
                          withBadge={false}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover/item:text-emerald-500 transition-colors">
                          {noteOrCategory}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {accountLabel ? `${accountLabel} • ` : ''}
                          {dateLabel || 'Reciente'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-semibold font-mono tracking-tight tabular-nums whitespace-nowrap ${
                          isExpense
                            ? 'text-rose-500 dark:text-rose-400'
                            : isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-700 dark:text-slate-300'
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
