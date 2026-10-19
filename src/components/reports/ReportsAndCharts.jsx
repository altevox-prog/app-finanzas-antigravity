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

  const topCategories = useMemo(() => categoryExpenses.slice(0, 4), [categoryExpenses]);
  const remainingCount = Math.max(0, categoryExpenses.length - 4);
  const hoveredCategory = useMemo(() => categoryExpenses.find(c => c.id === hoveredCategoryId), [categoryExpenses, hoveredCategoryId]);

  // Period label for pill
  const periodLabel = selectedDay 
    ? selectedDay.split('-').slice(1).join('/')
    : `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  return (
    <div 
      onClick={() => handleNav('transactions')}
      className="h-auto flex flex-col p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#12151E] shadow-sm hover:border-emerald-500/40 hover:shadow-sm transition-all cursor-pointer group select-none"
    >
      {/* Cabecera limpia interna con total */}
      <div className="flex items-center justify-between gap-2 mb-3.5">
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

      {/* Zona de visualización (Layout Horizontal 2 Columnas) */}
      <div className="flex items-center justify-between gap-3">
        {/* Columna Izquierda (Mini-Dona estilizada) */}
        <CategoryDonutChart
          categories={categoryExpenses}
          totalExpenses={totalExpense}
          hoveredCategoryId={hoveredCategoryId}
          setHoveredCategoryId={setHoveredCategoryId}
          formatMoney={formatMoney}
          getCategoryEmoji={getCategoryEmoji}
        />

        {/* Columna Derecha (Icono si vacío, o Top 4 categorías) */}
        {categoryExpenses.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center pl-2 py-4">
            <span className="text-2xl mb-1">🌱</span>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sin gastos este mes</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Tus finanzas están al día</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center gap-2 pl-1 min-w-0">
            {topCategories.map((cat, index) => {
              const displayEmoji = getCategoryEmoji(cat, cat.name);
              const isHovered = hoveredCategoryId === cat.id;

              return (
                <div 
                  key={`top-cat-${cat.id || cat.name || 'unassigned'}-${index}`} 
                  onMouseEnter={() => setHoveredCategoryId(cat.id)}
                  onMouseLeave={() => setHoveredCategoryId(null)}
                  className={`flex flex-col gap-1 group/row rounded-lg p-1 transition-all ${
                    isHovered ? 'bg-slate-100/80 dark:bg-white/[0.04]' : ''
                  }`}
                  title={`${cat.name}: ${formatMoney(cat.amount)}`}
                >
                  <div className="flex items-center justify-between text-[11px] leading-tight">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 truncate">
                      <span className="text-xs shrink-0 leading-none">{displayEmoji}</span>
                      <span className="truncate group-hover/row:text-emerald-500 transition-colors">
                        {cat.name}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                      <span className="font-semibold text-slate-400 dark:text-slate-500 text-[10px] tabular-nums">
                        {cat.percentage}%
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                        {formatMoney(cat.amount)}
                      </span>
                    </div>
                  </div>
                  {/* Barra compacta de progreso con su color */}
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, Math.max(4, cat.exactPercent))}%`, 
                        backgroundColor: cat.color 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
