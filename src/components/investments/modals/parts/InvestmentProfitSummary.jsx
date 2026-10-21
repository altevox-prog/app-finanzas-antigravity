import React from 'react';

export default function InvestmentProfitSummary({ shares, buyPrice, currentPrice, currency = 'USD' }) {
  const numShares = parseFloat(String(shares || '').replace(/,/g, '.').trim());
  const numBuy = parseFloat(String(buyPrice || '').replace(/,/g, '.').trim());
  const numCurrent = parseFloat(String(currentPrice || '').replace(/,/g, '.').trim());

  if (isNaN(numShares) || numShares <= 0 || isNaN(numBuy) || numBuy <= 0) {
    return null;
  }

  const effectiveCurrent = !isNaN(numCurrent) && numCurrent > 0 ? numCurrent : numBuy;
  const totalCost = numShares * numBuy;
  const totalValue = numShares * effectiveCurrent;
  const diff = totalValue - totalCost;
  const pct = totalCost > 0 ? (diff / totalCost) * 100 : 0;
  const isPositive = diff >= 0;

  const formatVal = (val) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 space-y-1.5 text-xs animate-fadeIn">
      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
        <span>Capital Invertido:</span>
        <span className="font-mono font-bold text-slate-900 dark:text-white">${formatVal(totalCost)} {currency}</span>
      </div>
      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
        <span>Valor Total:</span>
        <span className="font-mono font-bold text-slate-900 dark:text-white">${formatVal(totalValue)} {currency}</span>
      </div>
      <div className={`flex justify-between items-center font-semibold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        <span>Rentabilidad estimada:</span>
        <span className="font-mono font-bold">
          {isPositive ? '+' : ''}${formatVal(diff)} ({isPositive ? '+' : ''}{pct.toFixed(2)}%)
        </span>
      </div>
    </div>
  );
}
