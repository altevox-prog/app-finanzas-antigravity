import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WEEKS_TEMPLATE = [
  { name: 'Sem 1', range: 'Días 1 - 7', start: 1, end: 7 },
  { name: 'Sem 2', range: 'Días 8 - 14', start: 8, end: 14 },
  { name: 'Sem 3', range: 'Días 15 - 21', start: 15, end: 21 },
  { name: 'Sem 4', range: 'Días 22 - 28', start: 22, end: 28 },
  { name: 'Sem 5', range: 'Días 29+', start: 29, end: 31 }
];

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function WeeklyExpensesChart({
  transactions = [],
  selectedDate = new Date(),
  selectedDay = null,
  currentMonthLabel = '',
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  onSelectWeek = null,
  className = ''
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const targetDate = useMemo(() => (selectedDate ? new Date(selectedDate) : new Date()), [selectedDate]);
  const targetYear = targetDate.getFullYear(), targetMonth = targetDate.getMonth();

  const { weeksData, totalMonthExpense } = useMemo(() => {
    const weeks = WEEKS_TEMPLATE.map((w) => ({ ...w, expense: 0 }));
    if (Array.isArray(transactions)) {
      transactions.forEach((tx) => {
        if (!tx?.date) return;
        const [y, m, dStr] = String(tx.date).split('T')[0].split('-').map(Number);
        if (y !== targetYear || (m - 1) !== targetMonth) return;
        const type = String(tx.type || '').toLowerCase();
        const isTransfer = Boolean(
          tx.isTransfer || tx.is_transfer || type === 'transfer' || type === 'transferencia' ||
          tx.categoryId === 'cat-transfer' || tx.category_id === 'cat-transfer' ||
          tx.subcategoryId === 'sub-transfer-in' || tx.subcategoryId === 'sub-transfer-out'
        );
        if (isTransfer || (type !== 'expense' && type !== 'gasto')) return;
        const targetWeek = weeks.find((w) => dStr >= w.start && dStr <= w.end);
        if (targetWeek) targetWeek.expense += Math.abs(Number(tx.amount) || 0);
      });
    }

    const maxExp = Math.max(...weeks.map((w) => w.expense || 0), 1);
    const hasExp = weeks.some((w) => (w.expense || 0) > 0);
    const now = new Date();
    const isCurrentMonth = targetYear === now.getFullYear() && targetMonth === now.getMonth();
    const currentDayNum = selectedDay ? parseInt(String(selectedDay).split('T')[0].split('-')[2], 10) : now.getDate();

    let total = 0;
    const formatted = weeks.map((w) => {
      const raw = w.expense || 0;
      total += raw;
      const pct = hasExp && raw > 0 ? Math.min(Math.max(Math.round((raw / maxExp) * 85), 10), 85) : 0;
      return {
        label: w.name, name: w.name, range: w.range, start: w.start, end: w.end,
        value: raw, total: raw, percentage: pct,
        active: isCurrentMonth && currentDayNum >= w.start && currentDayNum <= w.end
      };
    });

    return { weeksData: formatted, totalMonthExpense: total };
  }, [transactions, targetYear, targetMonth, selectedDay]);

  const periodLabel = useMemo(() => {
    if (selectedDay) {
      const dayNum = parseInt(String(selectedDay).split('T')[0].split('-')[2], 10);
      return `Día ${dayNum} · ${(MONTH_NAMES[targetMonth] || '').slice(0, 3)}`;
    }
    return currentMonthLabel || `${MONTH_NAMES[targetMonth]} ${targetYear}`;
  }, [selectedDay, currentMonthLabel, targetMonth, targetYear]);

  const activeWeekItem = weeksData.find((w) => w.active) || weeksData[0] || { label: 'Sem 1', range: '', value: 0 };
  const displayedFooterItem = hoveredIndex !== null && weeksData[hoveredIndex] ? weeksData[hoveredIndex] : activeWeekItem;

  return (
    <div
      onClick={() => setHoveredIndex(null)}
      className={`h-full flex flex-col justify-between p-5 rounded-3xl border border-slate-300/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] hover:border-emerald-500/40 transition-all select-none relative ${className}`}
    >
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 tracking-tight">Actividad de Gastos</h3>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Egresos por semana · {periodLabel}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block tracking-wider">Total mes</span>
          <span className="text-xs font-semibold font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatMoney(totalMonthExpense)}</span>
        </div>
      </div>

      <div className="h-36 sm:h-40 flex items-end justify-between gap-2 sm:gap-3 px-2 sm:px-4 py-2 max-w-sm sm:max-w-md mx-auto relative w-full">
        {weeksData.map((item, idx) => {
          const rawValue = item.total ?? item.value ?? 0;
          const isHovered = hoveredIndex === idx, isClickable = rawValue > 0;

          return (
            <div
              key={item.label}
              className={`relative flex-1 max-w-[52px] sm:max-w-[60px] flex flex-col items-center justify-end h-full pt-6 select-none ${isClickable ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default'} transition-all group`}
              title={isClickable ? `Ver transacciones de ${item.label}: $${Number(rawValue).toLocaleString('es-CO')}` : item.label}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={(e) => {
                e.stopPropagation();
                setHoveredIndex((prev) => (prev === idx ? null : idx));
                if (isClickable && typeof onSelectWeek === 'function') onSelectWeek(item, idx + 1);
              }}
              onTouchStart={(e) => { e.stopPropagation(); setHoveredIndex(idx); }}
            >
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }} animate={{ opacity: 1, y: -10, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -top-7 z-50 px-2.5 py-1 rounded-lg bg-zinc-950 text-rose-300 border border-rose-500/30 text-xs font-semibold font-mono tabular-nums whitespace-nowrap shadow-xl pointer-events-none"
                  >
                    {formatMoney(rawValue)}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={`w-full max-w-[28px] sm:max-w-[32px] h-full max-h-[110px] sm:max-h-[120px] flex items-end justify-center rounded-full p-1 transition-all duration-200 ${isHovered ? 'bg-rose-500/20 ring-2 ring-rose-500/40' : 'bg-slate-100/90 dark:bg-white/[0.04]'}`}>
                <motion.div
                  className={`w-full rounded-full transition-colors ${item.active ? 'bg-rose-500/80 hover:bg-rose-500' : isHovered ? 'bg-rose-500' : rawValue > 0 ? 'bg-rose-500/35' : 'bg-transparent'}`}
                  style={{
                    height: `${item.percentage}%`,
                    transformOrigin: 'bottom',
                    boxShadow: (isHovered || item.active) && rawValue > 0 ? 'inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 0 8px rgba(244, 63, 94, 0.25)' : 'none'
                  }}
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 14, delay: idx * 0.04 }}
                />
              </div>

              <span className={`text-[10px] font-mono mt-2 transition-colors duration-150 ${item.active ? 'text-rose-400 font-bold' : isHovered ? 'text-rose-300 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="pt-2.5 mt-3 border-t border-slate-100/80 dark:border-white/[0.07] flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span className="transition-colors">
          {hoveredIndex !== null && weeksData[hoveredIndex] ? `${displayedFooterItem.label} · ${displayedFooterItem.range}` : `Semana en curso (${displayedFooterItem.label})`}
        </span>
        <span className="font-mono tabular-nums text-rose-500 dark:text-rose-400 font-semibold transition-colors">
          {formatMoney(displayedFooterItem.value || 0)}
        </span>
      </div>
    </div>
  );
}
