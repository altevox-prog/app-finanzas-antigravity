import React, { useMemo, useState } from 'react';
import SegmentedControl from '../common/SegmentedControl';
import { safeNumber } from '../../utils/financeMath';
import { usePrivacy } from '../../context/PrivacyContext';

export default function DesktopWeeklyCashFlowChart({
  transactions = [],
  currentMonthTxs: propCurrentMonthTxs,
  selectedDate = new Date(),
  currentPeriod,
  setPeriod,
  periodOptions = [
    { id: 'month', label: 'Mensual' },
    { id: 'week', label: 'Semanal' },
    { id: 'day', label: 'Diario' }
  ]
}) {
  const { formatMoney } = usePrivacy();
  const [hoveredWeekIndex, setHoveredWeekIndex] = useState(null);

  // Transacciones del mes en curso si no se proveen directamente
  const currentMonthTxs = useMemo(() => {
    if (propCurrentMonthTxs) return propCurrentMonthTxs;
    const currentYear = selectedDate.getFullYear();
    const currentMonth = selectedDate.getMonth();
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      const d = new Date(tx.date + 'T00:00:00');
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [propCurrentMonthTxs, transactions, selectedDate]);

  // Cálculo semanal del flujo de caja (Semanas 1 a 5)
  const weeklyCashFlow = useMemo(() => {
    const weeks = [
      { name: 'Sem 1', range: 'Días 1 - 7', start: 1, end: 7, income: 0, expense: 0 },
      { name: 'Sem 2', range: 'Días 8 - 14', start: 8, end: 14, income: 0, expense: 0 },
      { name: 'Sem 3', range: 'Días 15 - 21', start: 15, end: 21, income: 0, expense: 0 },
      { name: 'Sem 4', range: 'Días 22 - 28', start: 22, end: 28, income: 0, expense: 0 },
      { name: 'Sem 5', range: 'Días 29+', start: 29, end: 31, income: 0, expense: 0 }
    ];

    currentMonthTxs.forEach((tx) => {
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

      const day = parseInt(tx.date.split('-')[2], 10);
      const amt = safeNumber(tx.amount);
      const targetWeek = weeks.find((w) => day >= w.start && day <= w.end);
      if (targetWeek) {
        if (type === 'income' || type === 'ingreso') targetWeek.income += amt;
        if (type === 'expense' || type === 'gasto') targetWeek.expense += amt;
      }
    });

    const maxVal = Math.max(
      ...weeks.map((w) => Math.max(w.income, w.expense)),
      100000
    );

    return { weeks, maxVal };
  }, [currentMonthTxs]);

  return (
    <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Flujo de caja semanal
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Ingresos vs. gastos
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Distribución acumulada a lo largo del mes en curso
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de período con SegmentedControl */}
          {setPeriod && (
            <div className="w-56 sm:w-60">
              <SegmentedControl
                options={periodOptions}
                value={currentPeriod}
                onChange={setPeriod}
                size="sm"
              />
            </div>
          )}

          {/* Leyenda interactiva */}
          <div className="hidden sm:flex items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">Ingresos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-600 dark:text-slate-300">Gastos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Barras SVG con escala calibrada */}
      <div className="pt-2">
        <div className="grid grid-cols-5 gap-2 sm:gap-4 h-48 sm:h-52 items-end pt-6 pb-2 px-2 border-b border-slate-100 dark:border-white/5">
          {weeklyCashFlow.weeks.map((week, idx) => {
            const incomeHeight = Math.max(6, Math.round((week.income / weeklyCashFlow.maxVal) * 160));
            const expenseHeight = Math.max(6, Math.round((week.expense / weeklyCashFlow.maxVal) * 160));
            const isHovered = hoveredWeekIndex === idx;

            return (
              <div
                key={week.name}
                onMouseEnter={() => setHoveredWeekIndex(idx)}
                onMouseLeave={() => setHoveredWeekIndex(null)}
                className={`flex flex-col items-center justify-end h-full group relative transition-all ${
                  isHovered ? 'opacity-100' : 'hover:opacity-90'
                }`}
              >
                {/* Tooltip flotante con montos al pasar el cursor */}
                {isHovered && (
                  <div className="absolute -top-14 z-20 px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-black text-white text-[11px] shadow-xl border border-white/10 pointer-events-none whitespace-nowrap animate-fadeIn flex flex-col gap-0.5">
                    <span className="text-emerald-400 font-bold">+{formatMoney(week.income)}</span>
                    <span className="text-rose-400 font-bold">-{formatMoney(week.expense)}</span>
                  </div>
                )}

                {/* Par de Barras: Ingreso (Verde) y Gasto (Rojo) */}
                <div className="flex items-end gap-1.5 sm:gap-2 w-full justify-center">
                  {/* Barra Ingreso */}
                  <div className="w-3.5 sm:w-5 bg-slate-100 dark:bg-white/5 rounded-t-xl overflow-hidden flex items-end">
                    <div
                      className="w-full bg-emerald-500 rounded-t-xl transition-all duration-700 group-hover:brightness-110 shadow-sm"
                      style={{ height: `${incomeHeight}px` }}
                    />
                  </div>
                  {/* Barra Gasto */}
                  <div className="w-3.5 sm:w-5 bg-slate-100 dark:bg-white/5 rounded-t-xl overflow-hidden flex items-end">
                    <div
                      className="w-full bg-rose-500 rounded-t-xl transition-all duration-700 group-hover:brightness-110 shadow-sm"
                      style={{ height: `${expenseHeight}px` }}
                    />
                  </div>
                </div>

                {/* Etiqueta de la semana */}
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-2 block">
                  {week.name}
                </span>
                <span className="text-[9px] text-slate-400 block -mt-0.5">
                  {week.range}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
