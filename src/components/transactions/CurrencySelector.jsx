import React from 'react';
import CurrencyExchangeFields from './CurrencyExchangeFields';

const CURRENCIES = [
  { code: 'COP', label: 'COP' },
  { code: 'USD', label: 'USD $' },
  { code: 'EUR', label: 'EUR €' }
];

export default function CurrencySelector({
  currency = 'COP',
  exchangeRate,
  setExchangeRate,
  onCurrencyChange,
  trm = 4050,
  amount = '',
  enableDecimals = false
}) {
  const handleSelectCurrency = (e, code) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    let rate = '1';
    if (code === 'USD') {
      rate = String(trm || 4000);
    } else if (code === 'EUR') {
      const eurRate = Math.round((Number(trm) || 4050) * 1.08);
      rate = String(eurRate || 4400);
    }

    if (typeof setExchangeRate === 'function') {
      setExchangeRate(rate);
    }
    if (typeof onCurrencyChange === 'function') {
      onCurrencyChange(code, rate);
    }
  };

  return (
    <>
      {/* Selector horizontal compacto con chips: COP, USD, EUR */}
      <div className="flex items-center gap-1.5 mt-2.5">
        {CURRENCIES.map((c) => {
          const isSelected = currency === c.code;
          return (
            <button
              key={c.code}
              type="button"
              onClick={(e) => handleSelectCurrency(e, c.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-sm font-bold scale-[1.02]'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-700'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Lógica de Conversión y Tasa de Cambio (TRM) Oficial Automática */}
      <CurrencyExchangeFields
        currency={currency}
        exchangeRate={exchangeRate}
        setExchangeRate={setExchangeRate}
        amount={amount}
        enableDecimals={enableDecimals}
        trm={trm}
      />
    </>
  );
}
