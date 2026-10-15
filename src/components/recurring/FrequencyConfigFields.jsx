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
        <label className="block text-[11px] font-bold opacity-60 uppercase tracking-wider mb-1.5">
          Frecuencia de Pago *
        </label>
        <select
          name="frequency"
          value={frequency}
          onChange={(e) => handleFrequencyChange(e.target.value)}
          className="w-full rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          <option value="weekly" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Semanal</option>
          <option value="biweekly" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Quincenal</option>
          <option value="monthly" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Mensual</option>
          <option value="bimonthly" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Bimestral (cada 2 meses)</option>
          <option value="quarterly" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Trimestral (cada 3 meses)</option>
          <option value="semiannual" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Semestral (cada 6 meses)</option>
          <option value="yearly" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Anual</option>
        </select>
      </div>

      {/* Próxima Fecha (Control canónico) */}
      <div>
        <label className="block text-[11px] font-semibold opacity-60 mb-1">
          Próxima Fecha de Cobro / Pago *
        </label>
        <input
          type="date"
          name="next_date"
          required
          value={nextDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-semibold border border-slate-200/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white cursor-pointer"
        />
      </div>
    </div>
  );
}
