import React, { useState, useMemo } from 'react';
import { PieChart } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import { safeNumber } from '../../utils/financeMath';

const MODERN_PALETTE = [
  '#10B981', // 1. Esmeralda principal (emerald-500)
  '#14B8A6', // 2. Verde azulado / Teal (teal-500)
  '#94A3B8', // 3. Pizarra secundaria (slate-400)
  '#64748B', // 4. Pizarra oscura (slate-500)
  '#059669', // 5. Esmeralda profundo (emerald-600)
  '#475569', // 6. Pizarra profunda (slate-600)
  '#34D399', // 7. Esmeralda suave (emerald-400)
  '#0EA5E9'  // 8. Azul cielo sobrio (sky-500)
];

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];


import { 
  isEmoji, 
  getCategoryEmoji, 
  formatAbbreviatedMoney 
} from './utils/reportHelpers';
import CategoryDonutChart from './components/CategoryDonutChart';

export { getCategoryEmoji };


export default function ReportsAndCharts({ 
  transactions = [], 
  categories = [], 
  selectedDate = new Date(), 
  selectedDay = null, 
  onOpenCalendar,
  financeActions = null,
  onNavigateToTab = null,
  setActiveTab = null,
  onViewAll = null
}) {
  const { formatMoney } = usePrivacy();
  const [hoveredCategoryId, setHoveredCategoryId] = useState(null);

  const handleNav = (tab = 'transactions') => {
    const targetTab = (tab === 'movements' || tab === 'movimientos') ? 'transactions' : tab;
    if (typeof onViewAll === 'function') {
      onViewAll();
    } else if (financeActions && typeof financeActions.setActiveTab === 'function') {
      financeActions.setActiveTab(targetTab);
    } else if (financeActions && typeof financeActions.handleTabChange === 'function') {
      financeActions.handleTabChange(targetTab);
    } else if (typeof onNavigateToTab === 'function') {
      onNavigateToTab(targetTab);
    } else if (typeof setActiveTab === 'function') {
      setActiveTab(targetTab);
    }
  };

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  const isTransferTx = (tx) => Boolean(
    tx && (
      tx.isTransfer ||
      tx.is_transfer ||
      tx.isDebtCapital ||
      tx.isCapitalReturn ||
      tx.type === 'transfer' ||
      tx.type === 'transferencia' ||
      tx.categoryId === 'cat-transfer' ||
      tx.category_id === 'cat-transfer' ||
      tx.subcategoryId === 'sub-transfer-in' ||
      tx.subcategoryId === 'sub-transfer-out' ||
      tx.subcategoryId === 'sub-amortizacion-deuda' ||
      tx.subcategoryId === 'sub-retorno-capital'
    )
  );

  // Filter transactions for period
  const currentMonthTxs = useMemo(() => {
    return transactions.filter(tx => {
      if (!tx || !tx.date) return false;
      const d = new Date(tx.date + 'T00:00:00');
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [transactions, currentYear, currentMonth]);

  const scopedTransactions = useMemo(() => {
    if (!selectedDay) return currentMonthTxs;
    return currentMonthTxs.filter(tx => tx.date === selectedDay);
  }, [currentMonthTxs, selectedDay]);

  const { monthExpenses, totalExpense, categoryExpenses } = useMemo(() => {
    const expenses = scopedTransactions.filter(t => (t?.type === 'expense' || t?.type === 'gasto') && !isTransferTx(t));
    const total = expenses.reduce((sum, t) => sum + safeNumber(t?.amount), 0);

    const expenseByCategoryMap = {};
    expenses.forEach(tx => {
      const catKey = tx.categoryId || tx.categoryName || 'cat-general';
      if (!expenseByCategoryMap[catKey]) {
        const cat = categories.find(c => c.id === tx.categoryId || c.name === tx.categoryName);
        expenseByCategoryMap[catKey] = {
          id: catKey,
          name: tx.categoryName || (cat ? cat.name : 'Varios'),
          icon: cat?.icon,
          color: cat?.color || null,
          amount: 0
        };
      }
      expenseByCategoryMap[catKey].amount += safeNumber(tx.amount);
    });

    const list = Object.values(expenseByCategoryMap)
      .sort((a, b) => b.amount - a.amount)
      .map((cat, index) => {
        const exactPercent = total > 0 ? (cat.amount / total) * 100 : 0;
        const roundedPercent = Math.round(exactPercent);
        return {
          ...cat,
          color: cat.color || MODERN_PALETTE[index % MODERN_PALETTE.length],
          exactPercent,
          percent: roundedPercent,
          percentage: roundedPercent
        };
      });

    return {
      monthExpenses: expenses,
      totalExpense: total,
      categoryExpenses: list
    };
  }, [scopedTransactions, categories]);

  // Period label for pill
  const periodLabel = selectedDay 
    ? selectedDay.split('-').slice(1).join('/')
    : `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  return (
    <div 
      onClick={() => handleNav('transactions')}
      className="h-auto flex flex-col py-2 px-3.5 sm:px-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#12151E] shadow-sm hover:border-emerald-500/40 hover:shadow-sm transition-all cursor-pointer group select-none"
    >
      {/* Cabecera limpia interna con total */}
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

      {/* Gráfico Donut Compacto */}
      <div className="w-full flex items-center justify-center h-[148px] max-h-[150px] py-0">
        <CategoryDonutChart
          categories={categoryExpenses}
          totalExpenses={totalExpense}
          hoveredCategoryId={hoveredCategoryId}
          setHoveredCategoryId={setHoveredCategoryId}
          formatMoney={formatMoney}
          getCategoryEmoji={getCategoryEmoji}
        />
      </div>

      {/* Leyenda Horizontal Inferior (Píldoras) */}
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
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
                  style={{ backgroundColor: cat.color }} 
                />
                <span className="text-xs text-slate-600 dark:text-zinc-300 font-medium truncate max-w-[110px]">
                  {cat.name}
                </span>
                <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-semibold tabular-nums">
                  {cat.percentage}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
