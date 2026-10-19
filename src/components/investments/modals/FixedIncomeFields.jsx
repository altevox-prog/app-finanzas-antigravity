import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { formatCurrency, formatUSD } from '../../../data/initialData';
import { toSafeNumber, calculateCDTMaturityReturn } from '../../../utils/financeMath';
import { parseFormattedAmount } from '../../../utils/currencyFormatter';

export default function FixedIncomeFields({
  subType,
  setSubType,
  interestRate,
  setInterestRate,
  startDate,
  setStartDate,
  dueDate,
  setDueDate,
  investedAmount,
  currency = 'COP',
  cdtTotalDays: propTotalDays,
  cdtDaysRemaining: propDaysRemaining,
  cdtEstimatedGain: propEstimatedGain,
  isMatured: propIsMatured
}) {
  // Real-time calculation fallback if not passed directly via props
  let totalDays = propTotalDays;
  let daysRemaining = propDaysRemaining;
  let isMatured = propIsMatured ?? false;
  let estimatedGain = propEstimatedGain;

  if (totalDays === undefined && startDate && dueDate) {
    const start = new Date(startDate + 'T00:00:00');
    const due = new Date(dueDate + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const msPerDay = 1000 * 60 * 60 * 24;
    totalDays = Math.max(1, Math.round((due - start) / msPerDay));
    const diffToDue = Math.round((due - now) / msPerDay);
    daysRemaining = diffToDue;
    isMatured = diffToDue <= 0;

    const rateNum = toSafeNumber(interestRate);
    const invNum = typeof investedAmount === 'number'
      ? investedAmount
      : parseFormattedAmount(investedAmount) || 0;

    if (invNum > 0 && rateNum > 0 && totalDays > 0) {
      const { grossReturn } = calculateCDTMaturityReturn(invNum, rateNum, totalDays);
      estimatedGain = grossReturn;
    }
  }

  const handleQuickDuration = (days) => {
    const baseStr = startDate || new Date().toISOString().split('T')[0];
    if (!startDate) {
      setStartDate(baseStr);
    }
    const baseDate = new Date(baseStr + 'T00:00:00');
    baseDate.setDate(baseDate.getDate() + days);
    setDueDate(baseDate.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Selector / Tabs de Subtipo en Renta Fija */}
      <div>
        <label className="block text-[11px] font-bold opacity-70 mb-1.5">
          Subtipo de Renta Fija *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'cdt', label: '🏛️ CDT Bancario' },
            { id: 'bond', label: '📜 Bono / General' }
          ].map((tab) => {
            const isSelected = subType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubType(tab.id)}
                className={`p-2 rounded-xl text-center text-xs font-bold transition-all border active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'border-slate-200/80 dark:border-white/10 opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isSelected ? undefined : 'var(--bg-input)',
                  color: isSelected ? undefined : 'var(--text-main)'
                }}
              >
                <span className="truncate block leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalles CDT Bancario o Bono General */}
      <div 
        className="p-3.5 rounded-2xl border space-y-2.5 animate-fadeIn"
        style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#34C759]">
          <ShieldCheck className="w-4 h-4" />
          <span>{subType === 'bond' ? 'Detalles del Bono / Renta Fija' : 'Detalles del CDT'}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-semibold opacity-60 mb-0.5">
              Tasa (% E.A.)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="10.5"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className="w-full text-xs font-bold px-2 py-1.5 rounded-lg border border-transparent focus:outline-none"
              style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold opacity-60 mb-0.5">
              Apertura
            </label>
            <input
              type="date"
              value={startDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-[11px] px-1.5 py-1.5 rounded-lg border border-transparent focus:outline-none"
              style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold opacity-60 mb-0.5">
              Vencimiento
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-[11px] px-1.5 py-1.5 rounded-lg border border-transparent focus:outline-none"
              style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
            />
          </div>
        </div>

        {/* Atajos de plazo rápido para vencimiento */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-[10px] opacity-60 font-medium">Plazo sugerido:</span>
          {[
            { label: '90 días', days: 90 },
            { label: '180 días', days: 180 },
            { label: '360 días', days: 360 }
          ].map((item) => (
            <button
              key={item.days}
              type="button"
              onClick={() => handleQuickDuration(item.days)}
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all border border-emerald-500/20 cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Cálculo en tiempo real de Días y Ganancia Estimada */}
        {totalDays && (
          <div className="pt-2 border-t flex items-center justify-between text-[11px]" style={{ borderColor: 'var(--border-color)' }}>
            <div>
              <span className="opacity-60 block text-[9px] uppercase font-bold">Plazo</span>
              <span className={`font-black ${isMatured ? 'text-[#FF3B30]' : 'text-[#007AFF]'}`}>
                {isMatured 
                  ? 'Vencido' 
                  : `Vence en ${daysRemaining} días (${totalDays}d totales)`}
              </span>
            </div>

            {estimatedGain !== null && estimatedGain !== undefined && (
              <div className="text-right">
                <span className="opacity-60 block text-[9px] uppercase font-bold">Ganancia pactada</span>
                <span className="font-black text-[#34C759]">
                  +{currency === 'USD' ? formatUSD(estimatedGain) : formatCurrency(estimatedGain)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
