import React from 'react';
import { ArrowDownRight } from 'lucide-react';

export function getImplicitRateLabel(sentAmount, destAmount, fromCurr, toCurr) {
  if (!sentAmount || !destAmount || sentAmount <= 0 || destAmount <= 0) return null;
  if (fromCurr === 'USD' && toCurr === 'COP') {
    return `1 USD = ${Math.round(destAmount / sentAmount).toLocaleString()} COP`;
  }
  if (fromCurr === 'COP' && toCurr === 'USD') {
    return `1 USD = ${Math.round(sentAmount / destAmount).toLocaleString()} COP`;
  }
  if (fromCurr === 'EUR' && toCurr === 'COP') {
    return `1 EUR = ${Math.round(destAmount / sentAmount).toLocaleString()} COP`;
  }
  if (fromCurr === 'COP' && toCurr === 'EUR') {
    return `1 EUR = ${Math.round(sentAmount / destAmount).toLocaleString()} COP`;
  }
  const rate = Number((destAmount / sentAmount).toFixed(4));
  return `1 ${fromCurr} = ${rate.toLocaleString()} ${toCurr}`;
}

export default function EditCrossCurrencyFields({
  destinationAmount, onChangeDestinationAmount, sentAmount, destAmountNum,
  fromCurr = 'COP', toCurr = 'COP'
}) {
  const rateLabel = getImplicitRateLabel(sentAmount, destAmountNum, fromCurr, toCurr);

  return (
    <div className="space-y-1.5 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
          Monto a recibir ({toCurr}) *
        </label>
        {rateLabel && (
          <span className="text-[11px] font-mono font-medium text-blue-700 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-900/50 px-2 py-0.5 rounded-md">
            {rateLabel}
          </span>
        )}
      </div>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 font-black text-lg text-slate-900 dark:text-zinc-100">
          {toCurr === 'EUR' ? '€' : '$'}
        </span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          required
          value={destinationAmount}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onChangeDestinationAmount(e.target.value)}
          className="w-full pl-8 pr-3.5 h-11 text-xl font-bold font-mono tracking-tight bg-white dark:bg-zinc-950 border border-blue-200 dark:border-blue-800/60 rounded-lg text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/60 tabular-nums"
        />
      </div>
      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400">
        <ArrowDownRight className="w-3 h-3 text-blue-500 shrink-0" />
        <span>Se abonará en la cuenta receptora en su moneda nativa ({toCurr})</span>
      </div>
    </div>
  );
}
