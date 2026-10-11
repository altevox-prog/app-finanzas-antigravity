import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Eye, Check } from 'lucide-react';
import { MONTH_NAMES } from '../data/initialData';
import { usePrivacy } from '../context/PrivacyContext';
import { useBackHandler } from '../hooks/useBackHandler';
import { safeNumber } from '../utils/financeMath';

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export default function CalendarDropdown({
  selectedDate,
  currentDate,
  onChangeMonth,
  selectedDay, // 'YYYY-MM-DD' or null
  onSelectDay,
  transactions = [],
  isOpen,
  onClose
}) {
  useBackHandler(isOpen, onClose);

  const dropdownRef = useRef(null);
  const { formatMoney } = usePrivacy();

  const activeDate = selectedDate instanceof Date 
    ? selectedDate 
    : (currentDate instanceof Date ? currentDate : new Date());
  const currentYear = activeDate.getFullYear();
  const currentMonth = activeDate.getMonth();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calendar calculations
  // First day of month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  // Get day of week (0 = Sun, 1 = Mon ... 6 = Sat). We want Monday as 0:
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  // Total days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Days in previous month
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Map of transactions per day in this month (excluyendo transferencias)
  const dayStatsMap = {};
  transactions.forEach(tx => {
    if (!tx || !tx.date) return;
    const isTransfer = Boolean(
      tx.isTransfer ||
      tx.is_transfer ||
      tx.type === 'transfer' ||
      tx.type === 'transferencia' ||
      tx.categoryId === 'cat-transfer' ||
      tx.category_id === 'cat-transfer' ||
      tx.subcategoryId === 'sub-transfer-in' ||
      tx.subcategoryId === 'sub-transfer-out'
    );
    if (isTransfer) return;

    if (!dayStatsMap[tx.date]) {
      dayStatsMap[tx.date] = { hasExpense: false, hasIncome: false, totalExp: 0, totalInc: 0, count: 0 };
    }
    dayStatsMap[tx.date].count += 1;
    const txType = String(tx.type || '').toLowerCase();
    const amt = safeNumber(tx.amount);
    if (txType === 'expense' || txType === 'gasto') {
      dayStatsMap[tx.date].hasExpense = true;
      dayStatsMap[tx.date].totalExp += amt;
    } else if (txType === 'income' || txType === 'ingreso') {
      dayStatsMap[tx.date].hasIncome = true;
      dayStatsMap[tx.date].totalInc += amt;
    }
  });

  // Check today's date string
  const todayStr = new Date().toISOString().split('T')[0];

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (onChangeMonth) {
      onChangeMonth(new Date(currentYear, currentMonth - 1, 1));
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (onChangeMonth) {
      onChangeMonth(new Date(currentYear, currentMonth + 1, 1));
    }
  };

  // Generate day cells
  const calendarCells = [];

  // Prev month padding days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    calendarCells.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      dateStr: null
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const formattedDay = String(day).padStart(2, '0');
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

    calendarCells.push({
      day,
      isCurrentMonth: true,
      dateStr,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDay,
      stats: dayStatsMap[dateStr] || null
    });
  }

  // Remaining slots to complete 6 rows or clean grid (multiple of 7)
  const totalSlots = Math.ceil(calendarCells.length / 7) * 7;
  let nextMonthDay = 1;
  while (calendarCells.length < totalSlots) {
    calendarCells.push({
      day: nextMonthDay++,
      isCurrentMonth: false,
      dateStr: null
    });
  }

  // Calculate stats for currently selected day
  const selectedDayStats = selectedDay ? dayStatsMap[selectedDay] : null;

  return (
    <div 
      className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        ref={dropdownRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[340px] sm:max-w-[360px] rounded-3xl shadow-2xl border p-4 sm:p-5 animate-modal-pop max-h-[92vh] overflow-y-auto flex flex-col space-y-3"
        style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
      >
        {/* Header con navegación y botón de cerrar */}
        <div className="flex items-center justify-between pb-2.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-transform"
              style={{ color: 'var(--text-main)' }}
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 font-extrabold text-sm capitalize truncate" style={{ color: 'var(--text-main)' }}>
              <CalendarIcon className="w-4 h-4 text-[#007AFF] shrink-0" />
              <span>{MONTH_NAMES[currentMonth]} {currentYear}</span>
              {selectedDay && (
                <span className="text-[10px] font-black bg-[#007AFF] text-white px-2 py-0.5 rounded-full ml-1 shrink-0">
                  Día {parseInt(selectedDay.split('-')[2], 10)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-transform"
              style={{ color: 'var(--text-main)' }}
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 text-xs font-bold transition-all active:scale-90"
            style={{ backgroundColor: 'var(--bg-card-sub)' }}
            title="Cerrar calendario"
          >
            ✕
          </button>
        </div>

        {/* Fila de Días de la Semana: 7 columnas perfectamente alineadas */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold opacity-40">
          {WEEKDAYS.map(wd => (
            <div key={wd} className="py-0.5">{wd}</div>
          ))}
        </div>

        {/* Cuadrícula de Días: 7 columnas completas */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarCells.map((cell, idx) => {
            if (!cell.isCurrentMonth) {
              return (
                <div key={idx} className="h-8 flex items-center justify-center text-xs opacity-15 pointer-events-none select-none">
                  {cell.day}
                </div>
              );
            }

            const hasActivity = cell.stats && cell.stats.count > 0;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSelectDay(cell.dateStr);
                }}
                style={{ color: cell.isSelected ? '#ffffff' : 'var(--text-main)' }}
                className={`h-8 relative flex flex-col items-center justify-center rounded-xl text-xs font-semibold transition-all group active:scale-90 ${
                  cell.isSelected
                    ? 'bg-[#007AFF] text-white font-black shadow-sm'
                    : cell.isToday
                      ? 'bg-blue-500/15 text-[#007AFF] font-bold ring-1 ring-[#007AFF]/40'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span>{cell.day}</span>

                {/* Indicadores de actividad */}
                {hasActivity && (
                  <div className="flex items-center gap-0.5 absolute bottom-0.5">
                    {cell.stats.hasIncome && (
                      <span className={`w-1 h-1 rounded-full ${cell.isSelected ? 'bg-white' : 'bg-[#34C759]'}`} />
                    )}
                    {cell.stats.hasExpense && (
                      <span className={`w-1 h-1 rounded-full ${cell.isSelected ? 'bg-white' : 'bg-[#FF3B30]'}`} />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Panel Inferior: Estadísticas del día seleccionado o leyenda */}
        <div className="pt-2.5 border-t space-y-2.5" style={{ borderColor: 'var(--border-color)' }}>
          {selectedDay ? (
            <div 
              className="p-2.5 rounded-2xl flex items-center justify-between gap-2"
              style={{ backgroundColor: 'var(--bg-card-sub)' }}
            >
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-60 truncate">
                  {selectedDay.split('-')[2]} de {MONTH_NAMES[parseInt(selectedDay.split('-')[1]) - 1]}
                </span>
                <div className="flex items-center gap-2 mt-0.5 text-xs font-extrabold flex-wrap">
                  {selectedDayStats ? (
                    <>
                      <span className="text-[#FF3B30]">Gastos: -{formatMoney(selectedDayStats.totalExp)}</span>
                      {selectedDayStats.totalInc > 0 && (
                        <span className="text-[#34C759]">Ingresos: +{formatMoney(selectedDayStats.totalInc)}</span>
                      )}
                    </>
                  ) : (
                    <span className="opacity-60 font-medium text-[11px]">Sin movimientos registrados</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectDay(null)}
                  className="p-1.5 opacity-60 hover:opacity-100 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Quitar filtro de día"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectDay) onSelectDay(selectedDay);
                    onClose();
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer"
                  title="Ver movimientos de este día"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Ver este día</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] opacity-60 px-1 py-0.5">
              <span>Toca un día para filtrar</span>
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" /> Gastos</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" /> Ingresos</span>
              </span>
            </div>
          )}

          {selectedDay && (
            <button
              type="button"
              onClick={() => {
                if (onSelectDay) onSelectDay(selectedDay);
                onClose();
              }}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Ver este día ({selectedDay.split('-')[2]} de {MONTH_NAMES[parseInt(selectedDay.split('-')[1]) - 1]})</span>
            </button>
          )}

          {/* Botón Ver Todo el Mes */}
          <button
            type="button"
            onClick={() => {
              onSelectDay(null);
              onClose();
            }}
            className="w-full py-2 font-bold rounded-xl text-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 border cursor-pointer"
            style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          >
            <Eye className="w-3.5 h-3.5 opacity-60" />
            <span>Ver todo el mes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
