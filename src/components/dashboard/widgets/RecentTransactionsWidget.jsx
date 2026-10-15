import React, { useMemo } from 'react';
import { Receipt, ChevronRight } from 'lucide-react';
import { getCategoryEmoji } from '../../reports/ReportsAndCharts';

/**
 * RecentTransactionsWidget
 * Tabla detallada con los últimos movimientos cronológicos del período.
 */
export default function RecentTransactionsWidget({
  transactions = [],
  categories = [],
  formatMoney = (val) => `$${val}`,
  onTransactionClick,
  onNavigateToTab,
  onAddTransaction,
  isReordering = false
}) {
  const recentTransactions = useMemo(() => {
    return (Array.isArray(transactions) ? [...transactions] : [])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);
  }, [transactions]);

  const handleNavigate = () => {
    if (isReordering) return;
    if (typeof onNavigateToTab === 'function') {
      onNavigateToTab('transactions');
    }
  };

  return (
    <div 
      onClick={handleNavigate}
      className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-4 hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer active:scale-[0.99] group"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Últimos movimientos
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Historial cronológico reciente con detalles
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>

      {/* Tabla Moderna SaaS */}
      {recentTransactions.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <Receipt className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            No hay movimientos registrados en este mes
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pl-2">Categoría</th>
                <th className="pb-3 px-2">Descripción</th>
                <th className="pb-3 px-2">Cuenta</th>
                <th className="pb-3 px-2">Fecha</th>
                <th className="pb-3 pr-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
              {recentTransactions.map((tx) => {
                const type = String(tx?.type || '').toLowerCase();
                const amt = Number(tx?.amount) || 0;
                const isTransfer = type === 'transfer' || type === 'transferencia' || Boolean(tx?.isTransfer);
                const isExpense = !isTransfer && (type === 'expense' || type === 'gasto' || type === 'egreso' || amt < 0);
                const isIncome = !isTransfer && (type === 'income' || type === 'ingreso' || (!isExpense && amt > 0));
                const displayEmoji = getCategoryEmoji(
                  { icon: tx.categoryIcon, name: tx.categoryName },
                  tx.categoryName
                );

                return (
                  <tr
                    key={tx.id}
                    onClick={(e) => {
                      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                      if (typeof onTransactionClick === 'function') onTransactionClick(tx);
                    }}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group/row cursor-pointer"
                  >
                    {/* Categoría / Emoji */}
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none select-none">
                          {displayEmoji}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {tx.categoryName || 'General'}
                        </span>
                      </div>
                    </td>

                    {/* Descripción / Nota */}
                    <td className="py-3 px-2 text-slate-600 dark:text-slate-300 font-medium truncate max-w-[180px]">
                      {tx.note || tx.subcategoryName || '—'}
                    </td>

                    {/* Cuenta */}
                    <td className="py-3 px-2 text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                      {tx.accountName || 'Principal'}
                    </td>

                    {/* Fecha */}
                    <td className="py-3 px-2 text-slate-500 dark:text-slate-400 tabular-nums">
                      {tx.date}
                    </td>

                    {/* Monto */}
                    <td className="py-3 pr-2 text-right font-bold font-mono tracking-tight tabular-nums">
                      <span className={
                        isExpense 
                          ? 'text-rose-500 dark:text-rose-400' 
                          : isIncome 
                            ? 'text-emerald-500 dark:text-emerald-400' 
                            : 'text-slate-600 dark:text-zinc-300'
                      }>
                        {isExpense ? '-' : isIncome ? '+' : ''}{formatMoney(Math.abs(amt))}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
