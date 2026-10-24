import React, { useState } from 'react';
import { PieChart } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import { getCategoryEmoji } from './utils/reportHelpers';
import Expenses3DDonut from '../dashboard/components/Expenses3DDonut';
import { useCategoryExpenses } from '../../hooks/useCategoryExpenses';

export { getCategoryEmoji };

export default function ReportsAndCharts({ 
  transactions = [], 
  categories = [], 
  selectedDate = new Date(), 
  selectedDay = null, 
  financeActions = null,
  onNavigateToTab = null,
  setActiveTab = null,
  onViewAll = null
}) {
  const { formatMoney } = usePrivacy();
  const [hoveredCategoryId, setHoveredCategoryId] = useState(null);

  const handleNav = (tab = 'transactions') => {
    const target = (tab === 'movements' || tab === 'movimientos') ? 'transactions' : tab;
    if (typeof onViewAll === 'function') onViewAll();
    else if (financeActions?.setActiveTab) financeActions.setActiveTab(target);
    else if (financeActions?.handleTabChange) financeActions.handleTabChange(target);
    else if (typeof onNavigateToTab === 'function') onNavigateToTab(target);
    else if (typeof setActiveTab === 'function') setActiveTab(target);
  };

  const { totalExpense, categoryExpenses } = useCategoryExpenses(transactions, categories, selectedDate, selectedDay);

  return (
    <div 
      onClick={() => handleNav('transactions')}
      className="h-auto flex flex-col py-2 px-3.5 sm:px-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 shadow-sm hover:border-emerald-500/40 hover:shadow-sm transition-all cursor-pointer group select-none"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <PieChart className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Tus gastos</span>
        </span>
        {totalExpense > 0 && (
          <span className="text-xs font-black text-slate-900 dark:text-slate-50 tabular-nums tracking-tight">
            {formatMoney(totalExpense)}
          </span>
        )}
      </div>

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

      {categoryExpenses.length === 0 ? (
        <div className="flex items-center justify-center pt-1 pb-0.5">
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] text-xs text-slate-400 dark:text-zinc-500 font-medium">
            <span>🌱 Sin gastos registrados este mes</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-1 pb-0.5 w-full">
          {categoryExpenses.map((cat, index) => {
            const isHovered = hoveredCategoryId === cat.id;
            return (
              <div 
                key={`cat-pill-${cat.id || cat.name || index}`}
                onMouseEnter={() => setHoveredCategoryId(cat.id)}
                onMouseLeave={() => setHoveredCategoryId(null)}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-white/[0.04] border transition-all cursor-pointer select-none ${
                  isHovered 
                    ? 'border-emerald-500/50 bg-emerald-500/10 shadow-xs scale-105' 
                    : 'border-slate-100 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.15]'
                }`}
                title={`${cat.name}: $ ${Number(cat.amount).toLocaleString('es-CO')} (${cat.percentage}%)`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: cat.color }} />
                <span className="text-xs text-slate-600 dark:text-zinc-300 font-medium truncate max-w-[110px]">{cat.name}</span>
                <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-semibold tabular-nums">{cat.percentage}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
