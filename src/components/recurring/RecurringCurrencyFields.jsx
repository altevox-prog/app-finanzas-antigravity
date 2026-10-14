import React from 'react';
import { parseFormattedAmount } from '../../utils/currencyFormatter';

export const DEFAULT_RECURRING_CURRENCIES = [
  { code: 'COP', label: 'COP' },
  { code: 'USD', label: 'USD $' },
  { code: 'EUR', label: 'EUR €' }
];

/**
 * RecurringCurrencyFields
 * Selector de divisas (COP, USD, EUR) y panel informativo de tasa de cambio (TRM)
 * con cálculo reactivo del equivalente en balance para pagos recurrentes.
 *
 * @param {Object} props
 * @param {string} props.currency Divisa actual seleccionada ('COP' | 'USD' | 'EUR')
 * @param {Function} props.setCurrency Función setter para la divisa
 * @param {string} props.exchangeRate Tasa de cambio actual
 * @param {Function} props.setExchangeRate Función setter para la tasa de cambio
 * @param {number|string} [props.trm] Tasa de cambio oficial del contexto
 * @param {string|number} [props.amount] Monto ingresado en el input para previsualización
 * @param {boolean} [props.enableDecimals] Flag para formateo con decimales
 * @param {Array<{code: string, label: string}>} [props.currencies] Lista de monedas disponibles
 * @param {boolean} [props.disabled] Estado de deshabilitado
 */
export default function RecurringCurrencyFields({
  currency = 'COP',
  setCurrency,
  exchangeRate = '1',
  setExchangeRate,
  trm = 4050,
  amount = '',
  enableDecimals = false,
  currencies = DEFAULT_RECURRING_CURRENCIES,
  disabled = false
}) {
  const handleSelectCurrency = (code) => {
    if (disabled || typeof setCurrency !== 'function') {
      return;
    }

    setCurrency(code);

    if (typeof setExchangeRate === 'function') {
      if (code === 'USD') {
        setExchangeRate(String(trm || 4000));
      } else if (code === 'EUR') {
        setExchangeRate('4400');
      } else {
        setExchangeRate('1');
      }
    }
  };

  const parsedAmount = parseFormattedAmount(amount) || 0;
  const numericRate = parseFloat(exchangeRate) || 0;
  const balanceEquivalent = parsedAmount * numericRate;

  return (
    <>
      {/* Selector horizontal de moneda */}
      <div className="flex items-center gap-1.5 mt-2">
        {currencies.map((c) => {
          const isSelected = currency === c.code;
          return (
            <button
              key={c.code}
              type="button"
              disabled={disabled}
              onClick={() => handleSelectCurrency(c.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-500 text-white shadow-sm font-bold scale-[1.02]'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/10'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Campo dinámico de TRM si USD / EUR */}
      {currency !== 'COP' && (
        <div className="mt-2.5 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-500/20 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Tasa oficial de cambio</span>
            </label>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              1 {currency} = ${Number(exchangeRate || trm || 4050).toLocaleString('es-CO')} COP
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              readOnly
              value={`TRM: $${Number(exchangeRate || trm || 4050).toLocaleString('es-CO')} COP (Sincronizada automáticamente)`}
              className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-200/80 dark:border-emerald-500/30 bg-emerald-100/50 dark:bg-white/5 text-emerald-900 dark:text-emerald-200 focus:outline-none cursor-default select-none tabular-nums"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 pt-1 border-t border-emerald-200/40 dark:border-emerald-500/20">
            <span>Equivalente en balance:</span>
            <span className="font-bold tabular-nums text-emerald-800 dark:text-emerald-200 text-xs">
              $ {balanceEquivalent.toLocaleString('es-CO', {
                minimumFractionDigits: enableDecimals ? 2 : 0,
                maximumFractionDigits: 2
              })} COP
            </span>
          </div>
        </div>
      )}
    </>
  );
}
