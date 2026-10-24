import React from 'react';
import { Activity } from 'lucide-react';
import { consolidateTransfers } from '../../utils/transferTxUtils';
import RecentMovementsList from './widgets/RecentMovementsList';

/**
 * RecentMovementsSection
 * Componente modular para el widget de "Movimientos Recientes" en el Dashboard.
 */
export default function RecentMovementsSection({
  transactions = [], onViewAll = null, setActiveTab = null, onNavigateToTab = null,
  onNavigateToMovements = null, onSelectTransaction = null, formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  limit = 4, className = '', compactMode = false, isReordering = false
}) {
  const safeList = Array.isArray(transactions) ? transactions : [];
  const consolidatedList = consolidateTransfers(safeList, 'all');
  const count = consolidatedList.length;

  const handleViewAll = (e) => {
    if (isReordering) return;
    if (e?.stopPropagation) e.stopPropagation();
    if (typeof onNavigateToMovements === 'function') onNavigateToMovements();
    else if (typeof onViewAll === 'function') onViewAll();
    else if (typeof setActiveTab === 'function') setActiveTab('transactions');
    else if (typeof onNavigateToTab === 'function') onNavigateToTab('transactions');
  };

  return (
    <div
      onClick={handleViewAll}
      className={`${compactMode ? 'p-0 bg-transparent border-0 shadow-none' : 'rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200/60 dark:border-white/[0.08] p-4 sm:p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] hover:border-emerald-500/40 hover:shadow-md'} flex flex-col justify-start gap-3 transition-all select-none cursor-pointer active:scale-[0.99] group min-w-0 w-full ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">Movimientos Recientes</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                {count} {count === 1 ? 'registro' : 'registros'} este período
              </p>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col">
          <RecentMovementsList
            transactions={transactions}
            limit={limit}
            onSelectTransaction={onSelectTransaction}
            formatMoney={formatMoney}
            isReordering={isReordering}
          />
        </div>
      </div>
    </div>
  );
}

export const RecentMovementsWidget = RecentMovementsSection;
export const TransactionsWidget = RecentMovementsSection;
