import React from 'react';
import { 
  Activity, 
  Plus, 
  ArrowRight, 
  ArrowUpRight, 
  ArrowDownRight,
  Inbox
} from 'lucide-react';

/**
 * RecentMovementsSection
 * Componente modular para el widget de "Movimientos Recientes" en el Dashboard.
 * Muestra el encabezado con acción rápida (+ Nuevo), una vista previa de las
 * últimas transacciones del período y acceso directo al historial completo ('Ver todos').
 */
export default function RecentMovementsSection({
  transactions = [],
  onViewAll = null,
  setActiveTab = null,
  onNavigateToTab = null,
  onSelectTransaction = null,
  onOpenTransaction = null,
  onOpenAddTransaction = null,
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  limit = 4,
  className = ''
}) {
  const safeList = Array.isArray(transactions) ? transactions : [];
  const count = safeList.length;
  const recentTransactions = safeList.slice(0, limit);

  // Redirección hacia la vista principal de transacciones
  const handleViewAll = (e) => {
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

  // Apertura del modal de nueva transacción
  const handleAddNew = (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (typeof onOpenAddTransaction === 'function') {
      onOpenAddTransaction('expense');
    } else if (typeof onOpenTransaction === 'function') {
      onOpenTransaction('expense');
    } else {
      handleViewAll(e);
    }
  };

  // Apertura del modal de detalle / edición de una transacción
  const handleItemClick = (e, tx) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (typeof onSelectTransaction === 'function') {
      onSelectTransaction(tx);
    } else if (typeof onOpenTransaction === 'function') {
      onOpenTransaction(tx);
    } else {
      handleViewAll(e);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-zinc-900/90 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm p-4 sm:p-5 flex flex-col justify-between transition-all select-none ${className}`}
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

          {/* Botón de acción rápida '+ Nuevo' */}
          <button
            type="button"
            onClick={handleAddNew}
            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
            title="Añadir nuevo movimiento"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo</span>
          </button>
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
                const isIncome = String(tx?.type || '').toLowerCase() === 'income' || String(tx?.type || '').toLowerCase() === 'ingreso';
                const noteOrCategory = tx?.note || tx?.categoryName || tx?.category || 'Movimiento';
                const accountLabel = tx?.accountName || tx?.account || '';
                const dateLabel = tx?.date ? String(tx.date).split('T')[0] : '';

                return (
                  <div
                    key={tx?.id || idx}
                    onClick={(e) => handleItemClick(e, tx)}
                    className="flex items-center justify-between py-2.5 px-1.5 -mx-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    title="Ver o editar movimiento"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isIncome
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownRight className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
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
                        className={`text-xs sm:text-sm font-bold font-mono tabular-nums ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatMoney(Math.abs(Number(tx?.amount) || 0))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer con acceso al historial completo */}
      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-zinc-400 font-medium text-[11px]">
          Historial completo
        </span>
        <button
          type="button"
          onClick={handleViewAll}
          className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px] hover:underline cursor-pointer group"
          title="Ver todos los movimientos"
        >
          <span>Ver todos</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

export const RecentMovementsWidget = RecentMovementsSection;
export const TransactionsWidget = RecentMovementsSection;
