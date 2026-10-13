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
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[11px] font-bold opacity-60 uppercase tracking-wider mb-1.5">
          Frecuencia de Pago *
        </label>
        <select
          name="frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
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

      {/* Próxima Fecha */}
      <div>
        <label className="block text-[11px] font-semibold opacity-60 mb-1">
          Próxima Fecha de Cobro / Pago *
        </label>
        <input
          type="date"
          name="next_date"
          required
          value={nextDate}
          onChange={(e) => {
            setNextDate(e.target.value);
            if (e.target.value) {
              const d = new Date(e.target.value + 'T00:00:00');
              setBillingDay(String(d.getDate()));
              setBillingDayOfWeek(d.getDay());
            }
          }}
          className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-semibold border border-slate-200/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white cursor-pointer"
        />
      </div>

      {/* Selector condicional según la frecuencia */}
      {frequency === 'monthly' && (
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Día del mes para el cobro:
            </label>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              Día {billingDay}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="31"
            value={billingDay}
            onChange={(e) => setBillingDay(e.target.value)}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
            <span>1</span>
            <span>15</span>
            <span>31</span>
          </div>
        </div>
      )}

      {frequency === 'biweekly' && (
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>Corte quincenal automático:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
            Días 15 y 30 de cada mes
          </span>
        </div>
      )}

      {frequency === 'weekly' && (
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Día de la semana:
          </label>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {DAYS_OF_WEEK.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setBillingDayOfWeek(d.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                  billingDayOfWeek === d.id
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/5'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
