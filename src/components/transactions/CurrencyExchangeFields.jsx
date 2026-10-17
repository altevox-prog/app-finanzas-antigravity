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

  const numericAmount = parseFormattedAmount(amount) || 0;
  const rateNum = parseFloat(exchangeRate) || (currency === 'EUR' ? Math.round((Number(trm) || 4050) * 1.08) : Number(trm || 4050));
  const calculatedAmountCOP = numericAmount * rateNum;

  return (
    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1 mt-0.5">
      <span>
        TRM: 1 {currency} = ${Number(exchangeRate || rateNum || 0).toLocaleString('es-CO')} COP
      </span>
      <span>
        ≈ ${calculatedAmountCOP.toLocaleString('es-CO', { minimumFractionDigits: enableDecimals ? 2 : 0, maximumFractionDigits: 2 })} COP
      </span>
    </div>
  );
}
