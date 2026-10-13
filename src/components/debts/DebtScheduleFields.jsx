import React from 'react';
import { Repeat, CalendarDays } from 'lucide-react';

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
  setError
}) {
  return (
    <div 
      className="p-3.5 rounded-2xl border space-y-3"
      style={{ 
        backgroundColor: 'var(--bg-card-sub)', 
        borderColor: 'var(--border-color)' 
      }}
    >
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider opacity-75 mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
          <Repeat className="w-3.5 h-3.5 text-blue-500" />
          Frecuencia de Pago
        </label>
        <select
          value={frequency}
          onChange={(e) => {
            setFrequency(e.target.value);
            if (setError) setError('');
          }}
          className="w-full text-xs px-3.5 py-2.5 rounded-xl border font-bold focus:outline-none focus:ring-1 focus:ring-[#007AFF] cursor-pointer"
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        >
          <option value="Único">Único (Fecha Límite Fija)</option>
          <option value="Quincenal">Quincenal (Días 15 y 30)</option>
          <option value="Mensual">Mensual (Día del Mes)</option>
          <option value="Semanal">Semanal (Cada 7 Días)</option>
        </select>
      </div>

      {/* 1. CASO QUINCENAL: Selección de los 2 días de corte y cálculo automático */}
      {frequency === 'Quincenal' && (
        <div className="space-y-2.5 pt-1 animate-fadeIn">
          <label className="block text-[11px] font-semibold opacity-80">
            Días de corte quincenal:
          </label>
          
          {/* Botones de Presets Rápidos */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setBiweeklyDay1(15); setBiweeklyDay2(30); }}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                biweeklyDay1 === 15 && biweeklyDay2 === 30
                  ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              Días 15 y 30
            </button>
            <button
              type="button"
              onClick={() => { setBiweeklyDay1(5); setBiweeklyDay2(20); }}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                biweeklyDay1 === 5 && biweeklyDay2 === 20
                  ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              Días 5 y 20
            </button>
            <button
              type="button"
              onClick={() => { setBiweeklyDay1(10); setBiweeklyDay2(25); }}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                biweeklyDay1 === 10 && biweeklyDay2 === 25
                  ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              Días 10 y 25
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <span className="text-[10px] font-semibold opacity-60 block mb-1">Primer Corte (Día)</span>
              <select
                value={biweeklyDay1}
                onChange={(e) => setBiweeklyDay1(parseInt(e.target.value, 10))}
                className="w-full text-xs px-3 py-2 rounded-xl border font-bold focus:outline-none"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={`d1-${d}`} value={d}>Día {d}</option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-[10px] font-semibold opacity-60 block mb-1">Segundo Corte (Día)</span>
              <select
                value={biweeklyDay2}
                onChange={(e) => setBiweeklyDay2(parseInt(e.target.value, 10))}
                className="w-full text-xs px-3 py-2 rounded-xl border font-bold focus:outline-none"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={`d2-${d}`} value={d}>{d === 31 ? 'Día 31 (Fin de mes)' : `Día ${d}`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Previsualización del Próximo Corte con Fecha Deshabilitada */}
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 shrink-0 text-blue-500" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                  Próximo corte calculado:
                </span>
                <span className="font-extrabold capitalize">{formattedPreviewDate}</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20">
              Quincenal
            </span>
          </div>
        </div>
      )}

      {/* 2. CASO MENSUAL: Selector del día del mes (1 al 31) */}
      {frequency === 'Mensual' && (
        <div className="space-y-2.5 pt-1 animate-fadeIn">
          <div>
            <label className="block text-[11px] font-semibold opacity-80 mb-1">
              Día del mes para cobro o pago:
            </label>
            <select
              value={dueDay}
              onChange={(e) => setDueDay(parseInt(e.target.value, 10))}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border font-bold focus:outline-none"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={`m-${d}`} value={d}>
                  Día {d} de cada mes
                </option>
              ))}
            </select>
          </div>

          {/* Previsualización del Próximo Vencimiento */}
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 shrink-0 text-purple-500" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                  Próximo vencimiento calculado:
                </span>
                <span className="font-extrabold capitalize">{formattedPreviewDate}</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/20">
              Mensual
            </span>
          </div>
        </div>
      )}

      {/* 3. CASO SEMANAL: Cálculo desde fecha de inicio */}
      {frequency === 'Semanal' && (
        <div className="space-y-2 pt-1 animate-fadeIn">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 shrink-0 text-emerald-500" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                  Próximo cobro/pago semanal:
                </span>
                <span className="font-extrabold capitalize">{formattedPreviewDate}</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20">
              Semanal
            </span>
          </div>
        </div>
      )}

      {/* 4. CASO ÚNICO: Selector de fecha fija explícita */}
      {frequency === 'Único' && (
        <div className="pt-1 animate-fadeIn">
          <label className="block text-[11px] font-semibold opacity-70 mb-1">
            Fecha Límite / Vencimiento Fijo *
          </label>
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

      <p className="text-[10px] text-slate-500 dark:text-slate-400">
        Te enviaremos una notificación automática 1 día antes del vencimiento o cobro.
      </p>
    </div>
  );
}
