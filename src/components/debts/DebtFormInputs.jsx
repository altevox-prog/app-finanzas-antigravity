import React from 'react';
import { Percent, ShieldCheck } from 'lucide-react';
import DebtScheduleFields from './DebtScheduleFields';
import DebtInterestAlertCard from './DebtInterestAlertCard';
import AmountInput from '../common/AmountInput';
import { formatCurrencyInput } from '../../utils/currencyFormatter';

export default function DebtFormInputs({
  type,
  name,
  setName,
  totalAmount,
  setTotalAmount,
  enableDecimals,
  installments,
  setInstallments,
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
  setStartDate,
  interestRate,
  setInterestRate,
  insuranceFee,
  setInsuranceFee,
  notes,
  setNotes,
  monthsElapsed,
  monthlyRate,
  accruedInterest,
  principalAmount,
  formattedPreviewDate,
  setError
}) {
  return (
    <div className="space-y-3.5">
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
          Nombre de la Persona o Entidad *
        </label>
        <input
          type="text"
          required
          placeholder={type === 'receivable' ? 'ej: Carlos Mendoza, Andrés...' : 'ej: Banco Santander, Tarjeta Visa...'}
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
            Monto Base Total ($ COP) *
          </label>
          <AmountInput
            value={totalAmount}
            onChange={(cleanVal) => { setTotalAmount(cleanVal); setError(''); }}
            enableDecimals={enableDecimals}
            required
            onFocus={(e) => e.target.select()}
            prefix={<span className="text-xs opacity-50 font-bold">$</span>}
            className="w-full h-11 text-xs sm:text-sm pl-8 pr-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-bold font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
            Número de Cuotas
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="1"
            value={installments}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setInstallments(e.target.value)}
            className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono tabular-nums"
          />
        </div>
      </div>

      <DebtScheduleFields
        frequency={frequency}
        setFrequency={setFrequency}
        dueDay={dueDay}
        setDueDay={setDueDay}
        biweeklyDay1={biweeklyDay1}
        setBiweeklyDay1={setBiweeklyDay1}
        biweeklyDay2={biweeklyDay2}
        setBiweeklyDay2={setBiweeklyDay2}
        dueDate={dueDate}
        setDueDate={setDueDate}
        startDate={startDate}
        formattedPreviewDate={formattedPreviewDate}
        setError={setError}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
            Fecha de Inicio / Desembolso
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
            Tasa de Interés Total (%)
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0"
              value={interestRate}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setInterestRate(e.target.value)}
              className="w-full h-11 text-xs sm:text-sm pl-3.5 pr-8 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono tabular-nums"
            />
            <Percent className="w-3.5 h-3.5 opacity-40 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      <DebtInterestAlertCard
        monthsElapsed={monthsElapsed}
        monthlyRate={monthlyRate}
        accruedInterest={accruedInterest}
        principalAmount={principalAmount}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold opacity-70 mb-1">
            Cargos de Seguro / Trámite ($)
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0"
              value={insuranceFee}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setInsuranceFee(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
            <ShieldCheck className="w-3.5 h-3.5 opacity-40 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold opacity-70 mb-1">
            Notas o Comentarios (Opcional)
          </label>
          <input
            type="text"
            placeholder="Detalles sobre el préstamo o cuotas..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          />
        </div>
      </div>
    </div>
  );
}
