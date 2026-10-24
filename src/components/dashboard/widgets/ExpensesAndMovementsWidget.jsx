import React, { useState } from 'react';
import { PieChart } from 'lucide-react';
import { usePrivacy } from '../../../context/PrivacyContext';
import { useCategoryExpenses } from '../../../hooks/useCategoryExpenses';
import Expenses3DDonut from '../components/Expenses3DDonut';
import RecentMovementsList from './RecentMovementsList';

/**
 * ExpensesAndMovementsWidget
 * Widget integrado armónico: Resumen de Gastos (Donut 3D) y Últimos Registros.
 */
export default function ExpensesAndMovementsWidget({
  transactions = [],
  categories = [],
  selectedDate = new Date(),
  selectedDay = null,
  financeActions = null,
  onNavigateToTab = null,
  setActiveTab = null,
  onViewAll = null,
  onNavigateToMovements = null,
  onSelectTransaction = null,
  formatMoney: propFormatMoney,
  isReordering = false,
  className = '',
  limit = 4
}) {
  const { formatMoney: privacyFormatMoney } = usePrivacy();
  const formatMoney = propFormatMoney || privacyFormatMoney;
  const [hoveredCategoryId, setHoveredCategoryId] = useState(null);

  const handleNav = (tab = 'transactions') => {
    if (isReordering) return;
    const target = (tab === 'movements' || tab === 'movimientos') ? 'transactions' : tab;
    if (typeof onViewAll === 'function') onViewAll();
    else if (typeof onNavigateToMovements === 'function') onNavigateToMovements();
    else if (financeActions?.setActiveTab) financeActions.setActiveTab(target);
    else if (financeActions?.handleTabChange) financeActions.handleTabChange(target);
    else if (typeof onNavigateToTab === 'function') onNavigateToTab(target);
    else if (typeof setActiveTab === 'function') setActiveTab(target);
  };

  const { totalExpense, categoryExpenses } = useCategoryExpenses(transactions, categories, selectedDate, selectedDay);

  return (
    <div
      onClick={() => handleNav('transactions')}
      className={`rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200/60 dark:border-white/[0.08] p-4 sm:p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] hover:border-emerald-500/40 hover:shadow-md flex flex-col justify-between transition-all select-none cursor-pointer group min-w-0 w-full ${className}`}
    >
      {/* SECCIÓN SUPERIOR: RESUMEN DE GASTOS */}
      <div className="w-full min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Resumen de gastos</span>
          </span>
        </div>

        {/* Gráfico Donut Pseudo-3D */}
        <div className="w-full flex items-center justify-center py-2">
          <Expenses3DDonut
            totalExpense={totalExpense}
            categoryBreakdown={categoryExpenses}
            formatMoney={formatMoney}
            size={180}
            hoveredCategoryId={hoveredCategoryId}
            setHoveredCategoryId={setHoveredCategoryId}
          />
        </div>

        {/* Píldoras de categoría */}
        {categoryExpenses.length === 0 ? (
          <div className="flex items-center justify-center pt-1 pb-1">
            <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">🌱 Sin gastos registrados este mes</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 w-full">
            {categoryExpenses.slice(0, 5).map((cat, index) => {
              const isHovered = hoveredCategoryId === cat.id;
              return (
                <div
                  key={`cat-${cat.id || index}`}
                  onMouseEnter={() => setHoveredCategoryId(cat.id)}
                  onMouseLeave={() => setHoveredCategoryId(null)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 dark:bg-white/[0.04] border transition-all text-xs ${
                    isHovered
                      ? 'border-emerald-500/50 bg-emerald-500/10 scale-105'
                      : 'border-slate-100 dark:border-white/[0.06]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-600 dark:text-zinc-300 font-medium truncate max-w-[90px]">{cat.name}</span>
                  <span className="text-slate-400 dark:text-zinc-500 text-[10px] font-mono font-semibold tabular-nums">{cat.percentage}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN INFERIOR: ÚLTIMOS REGISTROS */}
      <div className="w-full min-w-0">
        <div className="pt-3 mt-1 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between mb-2 px-0.5">
          <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
            Últimos Registros
          </span>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
            {transactions?.length || 0} movimientos
          </span>
        </div>

        <RecentMovementsList
          transactions={transactions}
          limit={limit}
          onSelectTransaction={onSelectTransaction}
          formatMoney={formatMoney}
          isReordering={isReordering}
        />
      </div>
    </div>
  );
}
