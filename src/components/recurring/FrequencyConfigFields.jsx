import React from 'react';

export const DAYS_OF_WEEK = [
  { id: 1, name: 'Lunes' },
  { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' },
  { id: 5, name: 'Viernes' },
  { id: 6, name: 'Sábado' },
  { id: 0, name: 'Domingo' }
];

export default function FrequencyConfigFields({
  frequency,
  setFrequency,
  nextDate,
  setNextDate,
  billingDay,
  setBillingDay,
  billingDayOfWeek,
  setBillingDayOfWeek
}) {
  const handleDateChange = (val) => {
    setNextDate(val);
    if (val && setBillingDay) {
      const parts = val.split('-');
      if (parts.length >= 3) {
        setBillingDay(String(parseInt(parts[2], 10)));
      }
      if (setBillingDayOfWeek) {
        const d = new Date(val + 'T00:00:00');
        setBillingDayOfWeek(d.getDay());
      }
    }
  };

  const handleFrequencyChange = (val) => {
    setFrequency(val);
    if (nextDate && setBillingDay) {
      const parts = nextDate.split('-');
      if (parts.length >= 3) {
        setBillingDay(String(parseInt(parts[2], 10)));
      }
      if (setBillingDayOfWeek) {
        const d = new Date(nextDate + 'T00:00:00');
        setBillingDayOfWeek(d.getDay());
      }
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
          Frecuencia de Pago *
        </label>
        <select
          name="frequency"
          value={frequency}
          onChange={(e) => handleFrequencyChange(e.target.value)}
          className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900/60 p-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          <option value="weekly" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Semanal</option>
          <option value="biweekly" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Quincenal</option>
          <option value="monthly" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Mensual</option>
          <option value="bimonthly" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Bimestral (cada 2 meses)</option>
          <option value="quarterly" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Trimestral (cada 3 meses)</option>
          <option value="semiannual" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Semestral (cada 6 meses)</option>
          <option value="yearly" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Anual</option>
        </select>
      </div>

      {/* Próxima Fecha (Control canónico) */}
      <div>
        <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
          Próxima Fecha de Cobro / Pago *
        </label>
        <input
          type="date"
          name="next_date"
          required
          value={nextDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-zinc-900/60 text-slate-900 dark:text-zinc-100 cursor-pointer"
        />
      </div>
    </div>
  );
}
