import React from 'react';
import { parseFormattedAmount } from '../../utils/currencyFormatter';

export default function CurrencyExchangeFields({
  currency,
  exchangeRate,
  setExchangeRate,
  amount,
  enableDecimals = false,
  trm = 4050
}) {
  if (currency === 'COP') return null;

  const numericAmount = parseFormattedAmount(amount);
  const rateNum = parseFloat(exchangeRate) || 0;
  const equivalentInCOP = numericAmount * rateNum;

  return (
    <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-500/20 space-y-2 animate-fadeIn">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tasa oficial de cambio</span>
          </label>
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            1 {currency} = ${Number(exchangeRate || 0).toLocaleString('es-CO')} COP
          </span>
        </div>
        <div className="relative">
          <input
            type="text"
            readOnly
            value={`TRM del día: $${Number(exchangeRate || trm || 4050).toLocaleString('es-CO')} COP (Sincronizada automáticamente)`}
            className="w-full h-11 px-3.5 text-xs font-semibold rounded-lg border border-emerald-200/80 dark:border-emerald-500/30 bg-emerald-100/50 dark:bg-white/5 text-emerald-900 dark:text-emerald-200 focus:outline-none cursor-default select-none tabular-nums"
          />
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 pt-1 border-t border-emerald-200/40 dark:border-emerald-500/20">
        <span>Equivalente en balance:</span>
        <span className="font-bold tabular-nums text-emerald-800 dark:text-emerald-200 text-xs">
          $ {equivalentInCOP.toLocaleString('es-CO', { minimumFractionDigits: enableDecimals ? 2 : 0, maximumFractionDigits: 2 })} COP
        </span>
      </div>
    </div>
  );
}
