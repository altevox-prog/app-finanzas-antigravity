import React from 'react';
import SegmentedControl from '../../common/SegmentedControl';
import { calculateCDTMaturityReturn } from '../../../utils/financeMath';
import { parseFormattedAmount } from '../../../utils/currencyFormatter';

const INPUT_STYLE = { backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' };
const INPUT_CLS = "w-full text-xs font-semibold px-3 py-2 rounded-xl border border-transparent focus:outline-none";

export default function FixedIncomeFields({
  subType = 'cdt', setSubType, interestRate, setInterestRate,
  startDate, setStartDate, dueDate, setDueDate, investedAmount = '0', currency = 'COP'
}) {
  const numInvested = parseFormattedAmount(investedAmount);
  const numRate = parseFloat(interestRate) || 0;

  const daysTerm = (startDate && dueDate)
    ? Math.max(1, Math.round((new Date(dueDate + 'T00:00:00') - new Date(startDate + 'T00:00:00')) / 86400000))
    : 180;

  const stats = (numInvested > 0 && numRate > 0)
    ? calculateCDTMaturityReturn(numInvested, numRate, daysTerm, 0.04)
    : null;

  return (
    <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
      <div>
        <label className="block text-[11px] font-bold opacity-70 mb-1">Tipo de Renta Fija</label>
        <SegmentedControl
          options={[{ id: 'cdt', label: 'CDT Bancario' }, { id: 'bond', label: 'Bono' }]}
          value={subType} onChange={setSubType} size="sm"
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold opacity-70 mb-1">Tasa de Interés (% E.A.) *</label>
        <input
          type="number" step="0.01" min="0" placeholder="ej. 11.5"
          value={interestRate} onChange={(e) => setInterestRate(e.target.value)}
          className={INPUT_CLS} style={INPUT_STYLE} required
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[10px] font-bold opacity-70 mb-1">Fecha de Inicio *</label>
          <input
            type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className={INPUT_CLS} style={INPUT_STYLE} required
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold opacity-70 mb-1">Fecha de Vencimiento *</label>
          <input
            type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className={INPUT_CLS} style={INPUT_STYLE} required
          />
        </div>
      </div>

      {stats && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
          <div className="flex justify-between text-emerald-800 dark:text-emerald-300 font-semibold">
            <span>Rendimiento proyectado ({daysTerm} días):</span>
            <span className="font-mono font-bold">+${Math.round(stats.netReturn).toLocaleString('es-CO')} {currency}</span>
          </div>
          <div className="flex justify-between text-[11px] text-emerald-700 dark:text-emerald-400">
            <span>Total al vencimiento:</span>
            <span className="font-mono font-bold">${Math.round(stats.maturityTotal).toLocaleString('es-CO')} {currency}</span>
          </div>
        </div>
      )}
    </div>
  );
}
