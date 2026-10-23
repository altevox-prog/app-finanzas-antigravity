import React from 'react';
import EditCrossCurrencyFields from './EditCrossCurrencyFields';
import { formatCurrencyInput, parseFormattedAmount } from '../../../../utils/currencyFormatter';

const CURRENCIES = [{ code: 'COP', label: 'COP' }, { code: 'USD', label: 'USD $' }, { code: 'EUR', label: 'EUR €' }];

export default function EditTransactionAmountSection({
  form, setForm, isTransfer, isCrossCurrency,
  fromCurr, toCurr, enableDecimals, trm, numAmount, destAmountNum
}) {
  const displayCurrency = isTransfer ? fromCurr : (form.originalCurrency === 'COP' ? '$ COP' : form.originalCurrency);
  const symbol = (isTransfer ? fromCurr : form.originalCurrency) === 'EUR' ? '€' : '$';

  const handleAmountChange = (val) => {
    const formatted = formatCurrencyInput(val, enableDecimals);
    setForm((p) => {
      let nextDest = p.destinationAmount;
      if (isCrossCurrency && !p.destinationAmount) {
        const num = parseFormattedAmount(formatted);
        if (num > 0) {
          const r = Number(trm) || 4000;
          if (fromCurr === 'USD' && toCurr === 'COP') nextDest = formatCurrencyInput(Math.round(num * r), enableDecimals);
          else if (fromCurr === 'COP' && toCurr === 'USD') nextDest = formatCurrencyInput(Number((num / r).toFixed(2)), enableDecimals);
          else if (fromCurr === 'EUR' && toCurr === 'COP') nextDest = formatCurrencyInput(Math.round(num * Math.round(r * 1.08)), enableDecimals);
          else if (fromCurr === 'COP' && toCurr === 'EUR') nextDest = formatCurrencyInput(Number((num / Math.round(r * 1.08)).toFixed(2)), enableDecimals);
        }
      }
      return { ...p, amount: formatted, destinationAmount: nextDest };
    });
  };

  return (
    <div className="sm:col-span-2 space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
          {isCrossCurrency ? `Monto a enviar (${fromCurr}) *` : `Monto (${displayCurrency}) *`}
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 font-black text-lg text-slate-900 dark:text-zinc-100">{symbol}</span>
          <input
            type="text" inputMode="decimal" placeholder="0" required value={form.amount}
            onFocus={(e) => e.target.select()} onChange={(e) => handleAmountChange(e.target.value)}
            className="w-full pl-8 pr-3.5 h-12 text-2xl font-bold font-mono tracking-tight bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 tabular-nums"
          />
        </div>
        {!isTransfer && (
          <div className="flex items-center gap-1.5 mt-2">
            {CURRENCIES.map((c) => (
              <button
                key={c.code} type="button"
                onClick={() => setForm((p) => ({ ...p, originalCurrency: c.code, exchangeRate: c.code === 'USD' ? String(trm || 4000) : c.code === 'EUR' ? '4400' : '1' }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${form.originalCurrency === c.code ? 'bg-emerald-500 text-white shadow-sm font-bold scale-[1.02]' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {isCrossCurrency && (
        <EditCrossCurrencyFields
          destinationAmount={form.destinationAmount}
          onChangeDestinationAmount={(v) => setForm((p) => ({ ...p, destinationAmount: formatCurrencyInput(v, enableDecimals) }))}
          sentAmount={numAmount} destAmountNum={destAmountNum} fromCurr={fromCurr} toCurr={toCurr}
        />
      )}
    </div>
  );
}
