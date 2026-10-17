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

/**
 * WeeklyExpensesChart
 * Widget independiente de "Actividad de Gastos" (Egresos por semana).
 * Agrupa los egresos del mes seleccionado en 5 semanas estándar y los visualiza
 * mediante barras cilíndricas animadas (Pill Bars).
 */
export default function WeeklyExpensesChart({
  transactions = [],
  selectedDate = new Date(),
  selectedDay = null,
  currentMonthLabel = '',
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  height = 180,
  className = ''
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const targetDate = useMemo(() => {
    return selectedDate ? new Date(selectedDate) : new Date();
  }, [selectedDate]);

  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  // 1. Filtrado temporal al mes en curso (independiente de si hay un día activo)
  const monthTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter((t) => {
      if (!t || !t.date) return false;
      const dateStr = String(t.date).split('T')[0];
      const parts = dateStr.split('-');
      if (parts.length < 3) return false;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1; // 0-indexed
      return y === targetYear && m === targetMonth;
    });
  }, [transactions, targetYear, targetMonth]);

  // 2. Cálculo agrupado de egresos por semana
  const { weeksData, maxExpense, hasAnyExpense } = useMemo(() => {
    const weeks = WEEKS_TEMPLATE.map((w) => ({ ...w, expense: 0 }));

    monthTransactions.forEach((tx) => {
      if (!tx || !tx.date) return;
      const type = String(tx.type || '').toLowerCase();
      const isTransfer = Boolean(
        tx.isTransfer ||
        tx.is_transfer ||
        type === 'transfer' ||
        type === 'transferencia' ||
        tx.categoryId === 'cat-transfer' ||
        tx.category_id === 'cat-transfer' ||
        tx.subcategoryId === 'sub-transfer-in' ||
        tx.subcategoryId === 'sub-transfer-out'
      );
      if (isTransfer) return;

      const isExpense = type === 'expense' || type === 'gasto';
      if (!isExpense) return;

      const dateStr = String(tx.date).split('T')[0];
      const day = parseInt(dateStr.split('-')[2], 10);
      if (isNaN(day)) return;

      const amt = Math.abs(Number(tx.amount) || 0);
      const targetWeek = weeks.find((w) => day >= w.start && day <= w.end);
      if (targetWeek) {
        targetWeek.expense += amt;
      }
    });

    const maxExp = Math.max(...weeks.map((w) => w.expense), 0);
    const hasExpense = maxExp > 0;

    const now = new Date();
    const isCurrentMonth = targetYear === now.getFullYear() && targetMonth === now.getMonth();
    const currentDayNum = selectedDay
      ? parseInt(String(selectedDay).split('T')[0].split('-')[2], 10)
      : now.getDate();

    const formatted = weeks.map((w) => {
      const isActive = isCurrentMonth && currentDayNum >= w.start && currentDayNum <= w.end;
      const rawValue = w.expense;

      // CORRECCIÓN DE BUG:
      // Si no hay transacciones o el valor es 0, la altura es estrictamente 0%.
      // No se inyectan alturas mock ni se divide por cero.
      let percentage = 0;
      if (hasExpense && rawValue > 0) {
        percentage = Math.max(Math.round((rawValue / maxExp) * 100), 8);
      }

      return {
        label: w.name,
        range: w.range,
        value: rawValue,
        percentage,
        active: isActive
      };
    });

    return {
      weeksData: formatted,
      maxExpense: maxExp,
      hasAnyExpense: hasExpense
    };
  }, [monthTransactions, targetYear, targetMonth, selectedDay]);

  // 3. Etiqueta del período para el subtítulo
  const periodLabel = useMemo(() => {
    if (selectedDay) {
      const dayNum = parseInt(String(selectedDay).split('T')[0].split('-')[2], 10);
      const monthShort = (MONTH_NAMES[targetMonth] || '').slice(0, 3);
      return `Día ${dayNum} · ${monthShort}`;
    }
    if (currentMonthLabel) return currentMonthLabel;
    return `${MONTH_NAMES[targetMonth]} ${targetYear}`;
  }, [selectedDay, currentMonthLabel, targetMonth, targetYear]);

  return (
    <div
      className={`h-full flex flex-col justify-between p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#12151E] shadow-sm hover:border-emerald-500/40 hover:shadow-sm transition-all select-none relative ${className}`}
    >
      {/* Encabezado del Widget */}
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Actividad de Gastos
          </h3>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Egresos por semana · {periodLabel}
          </p>
        </div>

        {/* Indicador de valor al interactuar */}
        {hoveredIndex !== null && weeksData[hoveredIndex] && (
          <div className="text-right animate-fadeIn">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
              {weeksData[hoveredIndex].label}
            </span>
            <span className="text-xs font-bold font-mono tabular-nums text-rose-400">
              {formatMoney(weeksData[hoveredIndex].value)}
            </span>
          </div>
        )}
      </div>

      {/* Área del gráfico de barras cilíndricas: Proporcionado armónicamente */}
      <div
        className="flex-1 flex items-end justify-between px-4 py-4 gap-2 sm:gap-3 max-w-sm sm:max-w-md mx-auto relative w-full"
      >
        {weeksData.map((item, idx) => {
          const rawValue = item.value;
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={item.label}
              className="relative flex-1 max-w-[52px] sm:max-w-[60px] flex flex-col items-center justify-end h-full pt-6 cursor-pointer group select-none"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => setHoveredIndex(idx)}
            >
              {/* Monto de la semana activa sobre la barra o Tooltip al interactuar */}
              <AnimatePresence>
                {isHovered ? (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: -10, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -top-7 z-50 px-2.5 py-1 rounded-lg bg-[#1A1E2B] text-rose-300 border border-rose-500/30 text-xs font-semibold font-mono tabular-nums whitespace-nowrap shadow-xl pointer-events-none"
                  >
                    {formatMoney(rawValue)}
                  </motion.div>
                ) : item.active && rawValue > 0 ? (
                  <div className="absolute -top-7 z-10 px-2.5 py-1 rounded-lg bg-[#1A1E2B] text-rose-300 border border-rose-500/30 text-xs font-semibold font-mono tabular-nums whitespace-nowrap shadow-sm pointer-events-none">
                    {formatMoney(rawValue)}
                  </div>
                ) : null}
              </AnimatePresence>

              {/* Cápsula de la barra */}
              <div
                className={`w-full max-w-[28px] sm:max-w-[32px] h-full flex items-end justify-center rounded-full p-1 transition-all duration-200 ${
                  isHovered
                    ? 'bg-rose-500/20 ring-2 ring-rose-500/40'
                    : 'bg-slate-100/90 dark:bg-white/[0.04]'
                }`}
              >
                <motion.div
                  className={`w-full rounded-full transition-colors ${
                    item.active
                      ? 'bg-rose-500/80 hover:bg-rose-500'
                      : isHovered
                      ? 'bg-rose-500'
                      : rawValue > 0
                      ? 'bg-rose-500/35'
                      : 'bg-transparent'
                  }`}
                  style={{
                    height: `${item.percentage}%`,
                    transformOrigin: 'bottom',
                    boxShadow: (isHovered || item.active) && rawValue > 0 ? 'inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 0 8px rgba(244, 63, 94, 0.25)' : 'none'
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 120,
                    damping: 14,
                    delay: idx * 0.04
                  }}
                />
              </div>

              {/* Etiqueta inferior de la semana */}
              <span
                className={`text-[10px] font-mono mt-2 transition-colors duration-150 ${
                  item.active
                    ? 'text-rose-400 font-bold'
                    : isHovered
                    ? 'text-rose-300 font-bold'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Pie sutil del widget para simetría de altura con widget vecino */}
      <div className="pt-2.5 mt-3 border-t border-slate-100/80 dark:border-white/[0.07] flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span>Semana en curso ({weeksData.find(w => w.active)?.label || 'Sem 3'})</span>
        <span className="font-mono tabular-nums text-rose-400 font-semibold">
          {formatMoney(weeksData.find(w => w.active)?.value || 0)}
        </span>
      </div>
    </div>
  );
}
