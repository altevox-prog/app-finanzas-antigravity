import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Clock, 
  Eye 
} from 'lucide-react';
import { MONTH_NAMES } from '../../data/initialData';
import { useBackHandler } from '../../hooks/useBackHandler';
import { safeNumber } from '../../utils/financeMath';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function DesktopMonthPicker({
  isOpen,
  onClose,
  selectedDate = new Date(),
  onChangeMonth,
  selectedDay = null,
  onSelectDay = null,
  onClearSelectedDay = null,
  transactions = []
}) {
  useBackHandler(isOpen, onClose);

  const pickerRef = useRef(null);

  // Fecha activa para la vista del calendario
  const [viewDate, setViewDate] = useState(() => {
    return selectedDate instanceof Date ? selectedDate : new Date();
  });

  // Modo de vista: 'days' (por defecto) o 'months' (para saltar de mes rápidamente)
  const [viewMode, setViewMode] = useState('days');

  useEffect(() => {
    if (isOpen) {
      setViewDate(selectedDate instanceof Date ? selectedDate : new Date());
      setViewMode('days');
    }
  }, [isOpen, selectedDate]);

  // Cerrar al presionar Escape o clic fuera
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Fecha de hoy
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Navegación de mes
  const handlePrevMonth = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const newDate = new Date(currentYear, currentMonth - 1, 1);
    setViewDate(newDate);
    if (onChangeMonth) onChangeMonth(newDate);
  };

  const handleNextMonth = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const newDate = new Date(currentYear, currentMonth + 1, 1);
    setViewDate(newDate);
    if (onChangeMonth) onChangeMonth(newDate);
  };

  // Ir a Hoy / Mes Actual
  const handleGoToToday = () => {
    const now = new Date();
    setViewDate(now);
    if (onChangeMonth) onChangeMonth(now);
    if (onSelectDay) onSelectDay(todayStr);
    setTimeout(() => {
      onClose();
    }, 150);
  };

  // Ver todo el mes (limpiar filtro de día)
  const handleViewAllMonth = () => {
    if (onSelectDay) onSelectDay(null);
    if (onClearSelectedDay) onClearSelectedDay();
    setTimeout(() => {
      onClose();
    }, 150);
  };

  // Selección rápida de día (1 clic)
  const handleDayClick = (dateStr) => {
    if (onSelectDay) {
      onSelectDay(dateStr);
    }
    setTimeout(() => {
      onClose();
    }, 150);
  };

  // Cálculos del calendario
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Lunes = 0

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Mapeo de transacciones por día (excluyendo transferencias)
  const dayStatsMap = {};
  (Array.isArray(transactions) ? transactions : []).forEach((tx) => {
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

  // Generar celdas de la cuadrícula
  const calendarCells = [];

  // Días previos atenuados
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    calendarCells.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      dateStr: null
    });
  }

  // Días del mes en curso
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

  // Completar múltiplos de 7 para rejilla limpia
  const totalSlots = Math.ceil(calendarCells.length / 7) * 7;
  let nextMonthDay = 1;
  while (calendarCells.length < totalSlots) {
    calendarCells.push({
      day: nextMonthDay++,
      isCurrentMonth: false,
      dateStr: null
    });
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn select-none">
      <div
        ref={pickerRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm sm:max-w-md bg-white dark:bg-[#121622] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/10 p-5 space-y-4 animate-scaleUp"
      >
        {/* Cabecera del Calendario: Mes, Año y Controles ← y → */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight capitalize">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Navegación rápida entre meses */}
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer active:scale-90"
              title="Mes anterior"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer active:scale-90"
              title="Mes siguiente"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer ml-1"
              title="Cerrar"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Encabezado con los 7 días de la semana */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 py-1">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="py-0.5">{wd}</div>
          ))}
        </div>

        {/* Rejilla Mensual de Días (Grid 7x5 o 7x6) */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarCells.map((cell, idx) => {
            if (!cell.isCurrentMonth) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="h-9 flex items-center justify-center text-xs text-slate-300 dark:text-white/10 pointer-events-none"
                >
                  {cell.day}
                </div>
              );
            }

            const hasActivity = cell.stats && cell.stats.count > 0;

            return (
              <button
                key={`day-${cell.dateStr}`}
                type="button"
                onClick={() => handleDayClick(cell.dateStr)}
                className={`h-9 relative flex flex-col items-center justify-center rounded-xl text-xs transition-all cursor-pointer active:scale-90 ${
                  cell.isSelected
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                    : cell.isToday
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold ring-1.5 ring-emerald-500/40'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 font-medium'
                }`}
              >
                <span>{cell.day}</span>

                {/* Puntos Indicadores (dots) de transacciones */}
                {hasActivity && (
                  <div className="flex items-center gap-0.5 absolute bottom-1">
                    {cell.stats.hasIncome && (
                      <span className={`w-1 h-1 rounded-full ${cell.isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                    )}
                    {cell.stats.hasExpense && (
                      <span className={`w-1 h-1 rounded-full ${cell.isSelected ? 'bg-white' : 'bg-rose-500'}`} />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Acciones Rápidas Inferiores: Hoy y Ver Todo el Mes */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleGoToToday}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Ir a la fecha de hoy"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Hoy</span>
          </button>

          <button
            type="button"
            onClick={handleViewAllMonth}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Ver transacciones de todo el mes"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Ver todo el mes</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
