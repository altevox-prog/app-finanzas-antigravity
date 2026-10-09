import React from 'react';
import { Activity, Plus, ArrowRight } from 'lucide-react';

/**
 * RecentMovementsWidget (TransactionsWidget)
 * Widget de movimientos recientes para el Dashboard financiero.
 * Permite visualizar el último movimiento registrado del mes y redirige
 * a la pestaña principal de movimientos al hacer clic en la tarjeta o en 'Ver todos'.
 * El botón '+ Nuevo' mantiene e.stopPropagation() para abrir únicamente el modal de nueva transacción.
 */
export function RecentMovementsWidget({
  transactions = [],
  onNavigateToTab = null,
  setActiveTab = null,
  financeActions = null,
  onOpenTransaction = null,
  onOpenAddTransaction = null,
  setIsAddTransactionOpen = null,
  setIsTransactionModalOpen = null,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`
}) {
  // Redirección directa a la pestaña de movimientos sin abrir ningún modal emergente
  const handleNav = (tab = 'transactions') => {
    const targetTab = (tab === 'movements' || tab === 'movimientos') ? 'transactions' : tab;
    if (financeActions && typeof financeActions.setActiveTab === 'function') {
      financeActions.setActiveTab(targetTab);
    } else if (financeActions && typeof financeActions.handleTabChange === 'function') {
      financeActions.handleTabChange(targetTab);
    } else if (typeof onNavigateToTab === 'function') {
      onNavigateToTab(targetTab);
    } else if (typeof setActiveTab === 'function') {
      setActiveTab(targetTab);
    }
  };

  // Apertura exclusiva del modal de registrar movimiento con stopPropagation estricto
  const handleAdd = (e, type = 'expense') => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (financeActions && typeof financeActions.handleOpenAddTransaction === 'function') {
      financeActions.handleOpenAddTransaction(type);
    } else if (financeActions && typeof financeActions.handleOpenTransaction === 'function') {
      financeActions.handleOpenTransaction(type);
    } else if (typeof onOpenAddTransaction === 'function') {
      onOpenAddTransaction(type);
    } else if (typeof onOpenTransaction === 'function') {
      onOpenTransaction(type);
    } else if (typeof setIsAddTransactionOpen === 'function') {
      setIsAddTransactionOpen(true);
    } else if (typeof setIsTransactionModalOpen === 'function') {
      setIsTransactionModalOpen(true);
    }
  };

  const safeList = Array.isArray(transactions) ? transactions : [];
  const count = safeList.length;
  const recentTx = count > 0 ? safeList[0] : null;

  return (
    <div
      onClick={() => {
        if (financeActions && typeof financeActions.setActiveTab === 'function') {
          financeActions.setActiveTab('transactions');
        } else {
          handleNav('transactions');
        }
      }}
      className="min-h-[140px] p-4 sm:p-6 rounded-3xl border shadow-xs flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-md cursor-pointer active:scale-[0.99] group overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-card, #ffffff)',
        borderColor: 'var(--border-color, rgba(226, 232, 240, 0.8))'
      }}
    >
      <div>
        {/* Cabecera interna */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 min-w-0">
            <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate sm:hidden">Movimientos</span>
            <span className="truncate hidden sm:inline">Movimientos Recientes</span>
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
              {count} {count === 1 ? 'registro' : 'registros'}
            </span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (financeActions && typeof financeActions.handleOpenAddTransaction === 'function') {
                  financeActions.handleOpenAddTransaction('expense');
                } else if (financeActions && typeof financeActions.handleOpenTransaction === 'function') {
                  financeActions.handleOpenTransaction('expense');
                } else {
                  handleAdd(e, 'expense');
                }
              }}
              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Añadir nuevo movimiento"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo</span>
            </button>
          </div>
        </div>

        {/* Contenido / Estado vacío o resumen de último movimiento */}
        <div className="mt-1">
          {count === 0 ? (
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Sin movimientos
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                No hay ingresos ni gastos registrados este mes.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                  {recentTx?.note || recentTx?.categoryName || 'Último movimiento'}
                </span>
                <span
                  className={`text-sm sm:text-base font-black tabular-nums tracking-tight shrink-0 ${
                    recentTx?.type === 'income'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {recentTx?.type === 'income' ? '+' : '-'}
                  {formatMoney(recentTx?.amount || 0)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">
                {recentTx?.accountName ? `${recentTx.accountName} • ` : ''}
                {recentTx?.date || 'Reciente'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer con enlace a Historial completo / Ver todos */}
      <div className="pt-3 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          Historial completo
        </span>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (financeActions && typeof financeActions.setActiveTab === 'function') {
              financeActions.setActiveTab('transactions');
            } else {
              handleNav('transactions');
            }
          }}
          className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform hover:underline cursor-pointer"
        >
          <span>Ver todos</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export const TransactionsWidget = RecentMovementsWidget;
export default RecentMovementsWidget;
