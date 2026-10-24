import React from 'react';
import { Percent, ShieldCheck } from 'lucide-react';
import DebtScheduleFields from './DebtScheduleFields';
import DebtInterestAlertCard from './DebtInterestAlertCard';
import AmountInput from '../common/AmountInput';

const INPUT_CLS = "w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60";
const LABEL_CLS = "block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5";

export default function DebtFormInputs({
  type, name, setName, totalAmount, setTotalAmount, enableDecimals, installments, setInstallments,
  frequency, setFrequency, dueDay, setDueDay, biweeklyDay1, setBiweeklyDay1, biweeklyDay2, setBiweeklyDay2,
  dueDate, setDueDate, startDate, setStartDate, interestRate, setInterestRate, insuranceFee, setInsuranceFee,
  monthsElapsed, monthlyRate, accruedInterest, principalAmount, formattedPreviewDate, setError
}) {
  return (
    <div className="space-y-3.5">
      <div>
        <label className={LABEL_CLS}>Nombre de la Persona o Entidad *</label>
        <input
          type="text" required placeholder={type === 'receivable' ? 'ej: Carlos Mendoza, Andrés...' : 'ej: Banco Santander, Tarjeta Visa...'}
          value={name} onChange={(e) => { setName(e.target.value); setError(''); }} className={INPUT_CLS}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLS}>Monto Base Total ($ COP) *</label>
          <AmountInput
            value={totalAmount} onChange={(cleanVal) => { setTotalAmount(cleanVal); setError(''); }}
            enableDecimals={enableDecimals} required onFocus={(e) => e.target.select()}
            prefix={<span className="text-xs opacity-50 font-bold">$</span>}
            className={`${INPUT_CLS} pl-8 pr-3.5 font-bold font-mono`}
          />
        </div>

        <div>
          <label className={LABEL_CLS}>Número de Cuotas</label>
          <input
            type="number" inputMode="numeric" min="1" placeholder="1" value={installments} onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const val = e.target.value; setInstallments(val);
              const n = parseInt(val, 10);
              if (!isNaN(n) && n > 1 && frequency === 'Único') setFrequency('Mensual');
            }}
            className={`${INPUT_CLS} font-mono tabular-nums`}
          />
        </div>
      </div>

      <DebtScheduleFields
        frequency={frequency} setFrequency={setFrequency} dueDay={dueDay} setDueDay={setDueDay}
        biweeklyDay1={biweeklyDay1} setBiweeklyDay1={setBiweeklyDay1} biweeklyDay2={biweeklyDay2} setBiweeklyDay2={setBiweeklyDay2}
        dueDate={dueDate} setDueDate={setDueDate} startDate={startDate} formattedPreviewDate={formattedPreviewDate}
        setError={setError} installments={installments}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLS}>Fecha de Inicio / Desembolso</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={INPUT_CLS} />
        </div>

        <div>
          <label className={LABEL_CLS}>Tasa de Interés Total (%)</label>
          <div className="relative">
            <input
              type="number" inputMode="decimal" step="0.01" min="0" placeholder="0" value={interestRate}
              onFocus={(e) => e.target.select()} onChange={(e) => setInterestRate(e.target.value)}
              className={`${INPUT_CLS} pl-3.5 pr-8 font-mono tabular-nums`}
            />
            <Percent className="w-3.5 h-3.5 opacity-40 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      <DebtInterestAlertCard
        monthsElapsed={monthsElapsed} monthlyRate={monthlyRate} accruedInterest={accruedInterest} principalAmount={principalAmount}
      />

      <div>
        <label className="block text-[11px] font-semibold opacity-70 mb-1">Cargos de Seguro / Trámite ($)</label>
        <div className="relative">
          <AmountInput
            value={insuranceFee}
            onChange={(cleanVal) => setInsuranceFee(cleanVal)}
            placeholder="0"
            enableDecimals={enableDecimals}
            onFocus={(e) => e.target.select()}
            className={INPUT_CLS}
          />
          <ShieldCheck className="w-3.5 h-3.5 opacity-40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
