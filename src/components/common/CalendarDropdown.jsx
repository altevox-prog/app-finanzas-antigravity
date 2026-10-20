import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Eye, Clock } from 'lucide-react';
import { MONTH_NAMES } from '../../data/initialData';
import { useBackHandler } from '../../hooks/useBackHandler';
import { safeNumber } from '../../utils/financeMath';

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

/**
 * CalendarDropdown
 * Selector modal de fecha y vista mensual con indicadores de ingresos/gastos por día.
 */
export default function CalendarDropdown({
  selectedDate,
  currentDate,
  onChangeMonth,
  selectedDay,
  onSelectDay,
  transactions = [],
  isOpen,
  onClose
}) {
  useBackHandler(isOpen, onClose);
  const dropdownRef = useRef(null);

  const activeDate = selectedDate instanceof Date ? selectedDate : (currentDate instanceof Date ? currentDate : new Date());
  const currentYear = activeDate.getFullYear();
  const currentMonth = activeDate.getMonth();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Cálculos de calendario y mapa de actividad
  const firstDay = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Lunes = 0
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrev = new Date(currentYear, currentMonth, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  const dayStatsMap = {};
  transactions.forEach((tx) => {
    if (!tx?.date) return;
    const type = String(tx.type || '').toLowerCase();
    const isTx = !(tx.isTransfer || tx.is_transfer || type === 'transfer' || type === 'transferencia' || tx.categoryId === 'cat-transfer' || tx.category_id === 'cat-transfer');
    if (!isTx) return;

    const entry = (dayStatsMap[tx.date] = dayStatsMap[tx.date] || { count: 0, hasExpense: false, hasIncome: false });
    entry.count += 1;
    if (type === 'expense' || type === 'gasto') entry.hasExpense = true;
    else if (type === 'income' || type === 'ingreso') entry.hasIncome = true;
  });

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, isCurrent: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, isCurrent: true, dateStr: dStr, isToday: dStr === todayStr, isSelected: dStr === selectedDay, stats: dayStatsMap[dStr] });
  }
  const totalSlots = Math.ceil(cells.length / 7) * 7;
  let nextDay = 1;
  while (cells.length < totalSlots) cells.push({ day: nextDay++, isCurrent: false });

  const selectAndClose = (dStr) => {
    onSelectDay?.(dStr);
    setTimeout(onClose, 150);
  };

  const navMonth = (offset) => (e) => {
    e.stopPropagation();
    onChangeMonth?.(new Date(currentYear, currentMonth + offset, 1));
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn" onClick={onClose}>
      <div 
        ref={dropdownRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[340px] sm:max-w-[360px] rounded-3xl shadow-2xl border p-4 sm:p-5 animate-modal-pop max-h-[92vh] overflow-y-auto flex flex-col space-y-3"
        style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
      >
        {/* Controles de Mes */}
        <div className="flex items-center justify-between pb-2.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-1">
            <button type="button" onClick={navMonth(-1)} className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-transform cursor-pointer" title="Mes anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 font-extrabold text-sm capitalize truncate">
              <CalendarIcon className="w-4 h-4 text-[#007AFF] shrink-0" />
              <span>{MONTH_NAMES[currentMonth]} {currentYear}</span>
            </div>
            <button type="button" onClick={navMonth(1)} className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-transform cursor-pointer" title="Mes siguiente">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 text-xs font-bold transition-all active:scale-90 cursor-pointer" style={{ backgroundColor: 'var(--bg-card-sub)' }} title="Cerrar">
            ✕
          </button>
        </div>

        {/* Días semana */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold opacity-40">
          {WEEKDAYS.map((wd) => <div key={wd} className="py-0.5">{wd}</div>)}
        </div>

        {/* Grilla */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {cells.map((cell, idx) => {
            if (!cell.isCurrent) return <div key={idx} className="h-8 flex items-center justify-center text-xs opacity-15 pointer-events-none">{cell.day}</div>;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => selectAndClose(cell.dateStr)}
                style={{ color: cell.isSelected ? '#ffffff' : 'var(--text-main)' }}
                className={`h-8 relative flex flex-col items-center justify-center rounded-xl text-xs font-semibold transition-all group active:scale-90 cursor-pointer ${
                  cell.isSelected ? 'bg-[#007AFF] text-white font-black shadow-sm' : cell.isToday ? 'bg-blue-500/15 text-[#007AFF] font-bold ring-1 ring-[#007AFF]/40' : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span>{cell.day}</span>
                {cell.stats?.count > 0 && (
                  <div className="flex items-center gap-0.5 absolute bottom-0.5">
                    {cell.stats.hasIncome && <span className={`w-1 h-1 rounded-full ${cell.isSelected ? 'bg-white' : 'bg-[#34C759]'}`} />}
                    {cell.stats.hasExpense && <span className={`w-1 h-1 rounded-full ${cell.isSelected ? 'bg-white' : 'bg-[#FF3B30]'}`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Accesos rápidos */}
        <div className="pt-2.5 border-t grid grid-cols-2 gap-2" style={{ borderColor: 'var(--border-color)' }}>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              onChangeMonth?.(now);
              selectAndClose(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
            }}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all active:scale-95 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Hoy</span>
          </button>
          <button
            type="button"
            onClick={() => selectAndClose(null)}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all active:scale-95 cursor-pointer"
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
