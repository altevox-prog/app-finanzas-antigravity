import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Repeat, Calendar, ChevronDown, Check } from 'lucide-react';

const FREQUENCY_OPTIONS = [
  { value: 'Único', label: 'Único (Fecha Límite Fija)' },
  { value: 'Quincenal', label: 'Quincenal (Días 15 y 30)' },
  { value: 'Mensual', label: 'Mensual (Día del Mes)' },
  { value: 'Semanal', label: 'Semanal (Cada 7 Días)' }
];

export default function DebtScheduleFields({
  frequency,
  setFrequency,
  dueDay,
  setDueDay,
  biweeklyDay1,
  setBiweeklyDay1,
  biweeklyDay2,
  setBiweeklyDay2,
  dueDate,
  setDueDate,
  startDate,
  formattedPreviewDate = '',
  setError,
  installments = '1'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const numInstallments = parseInt(installments, 10);
  const isMultiInstallment = !isNaN(numInstallments) && numInstallments > 1;

  const availableOptions = useMemo(() => {
    return isMultiInstallment ? FREQUENCY_OPTIONS.filter((opt) => opt.value !== 'Único') : FREQUENCY_OPTIONS;
  }, [isMultiInstallment]);

  useEffect(() => {
    if (isMultiInstallment && frequency === 'Único') setFrequency('Mensual');
  }, [isMultiInstallment, frequency, setFrequency]);

  useEffect(() => {
    if (frequency === 'Quincenal') {
      if (setBiweeklyDay1 && biweeklyDay1 !== 15) setBiweeklyDay1(15);
      if (setBiweeklyDay2 && biweeklyDay2 !== 30) setBiweeklyDay2(30);
    }
  }, [frequency, biweeklyDay1, biweeklyDay2, setBiweeklyDay1, setBiweeklyDay2]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const currentOption = availableOptions.find((opt) => opt.value === frequency) || availableOptions[0] || FREQUENCY_OPTIONS[0];

  const PreviewCard = () => (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 mt-2 animate-fadeIn">
      <div className="flex items-center">
        <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mr-2 shrink-0" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Próximo vencimiento calculado:</span>
      </div>
      <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap capitalize">
        {formattedPreviewDate}
      </span>
    </div>
  );

  return (
    <div className="p-3.5 rounded-2xl border space-y-3" style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}>
      {/* Dropdown de Frecuencia */}
      <div className="relative" ref={dropdownRef}>
        <label className="block text-[11px] font-bold uppercase tracking-wider opacity-75 mb-1.5 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <Repeat className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          Frecuencia de Pago
        </label>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full rounded-2xl border border-slate-200 dark:border-zinc-800 p-3.5 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center text-sm font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer hover:border-slate-300 dark:hover:border-zinc-700"
        >
          <span>{currentOption.label}</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-slate-100 dark:border-zinc-800 p-1.5 z-30 space-y-1 animate-fadeIn">
            {availableOptions.map((opt) => {
              const isSelected = frequency === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setFrequency(opt.value);
                    if (opt.value === 'Quincenal') {
                      if (setBiweeklyDay1) setBiweeklyDay1(15);
                      if (setBiweeklyDay2) setBiweeklyDay2(30);
                    }
                    if (setError) setError('');
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                    isSelected ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Casos según frecuencia */}
      {frequency === 'Quincenal' && <PreviewCard />}

      {frequency === 'Mensual' && (
        <div className="space-y-2.5 pt-1 animate-fadeIn">
          <div>
            <label className="block text-[11px] font-semibold opacity-80 mb-1">Día del mes para cobro o pago:</label>
            <select
              value={dueDay}
              onChange={(e) => setDueDay(parseInt(e.target.value, 10))}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border font-bold focus:outline-none"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={`m-${d}`} value={d}>Día {d} de cada mes</option>
              ))}
            </select>
          </div>
          <PreviewCard />
        </div>
      )}

      {frequency === 'Semanal' && <PreviewCard />}

      {frequency === 'Único' && (
        <div className="pt-1 animate-fadeIn">
          <label className="block text-[11px] font-semibold opacity-70 mb-1">Fecha Límite / Vencimiento Fijo *</label>
          <input
            type="date"
            required
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              if (setError) setError('');
            }}
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#007AFF] font-bold"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          />
        </div>
      )}
    </div>
  );
}
