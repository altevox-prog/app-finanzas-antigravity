import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import SegmentedControl from '../common/SegmentedControl';
import AmountInput from '../common/AmountInput';
import RecurringPopularPills from './RecurringPopularPills';

/**
 * RecurringBasicFields
 * Subcomponente para los campos principales del pago recurrente:
 * Selector de tipo (gasto vs ingreso), nombre/concepto con sugerencias rápidas,
 * e input de monto en COP.
 *
 * @param {Object} props
 * @param {string} props.type Tipo de flujo ('expense' | 'income')
 * @param {Function} props.setType Setter para el tipo de flujo
 * @param {string} props.name Nombre o concepto de la recurrencia
 * @param {Function} props.setName Setter para el nombre o concepto
 * @param {string} props.amount Monto como texto formateado
 * @param {Function} props.setAmount Setter para el monto
 * @param {Function} [props.formatCurrencyInput] Función de formateo de moneda en tiempo real
 * @param {boolean} [props.enableDecimals] Permitir centavos/decimales
 */
export default function RecurringBasicFields({
  type = 'expense',
  setType,
  name = '',
  setName,
  amount = '',
  setAmount,
  formatCurrencyInput,
  enableDecimals = false
}) {
  const handleAmountChange = (e) => {
    const rawVal = e.target.value;
    if (typeof formatCurrencyInput === 'function') {
      setAmount(formatCurrencyInput(rawVal, enableDecimals));
    } else {
      setAmount(rawVal);
    }
  };

  return (
    <>
      {/* 1. Selector de Tipo: Gasto Fijo vs Ingreso Periódico */}
      <div>
        <SegmentedControl
          options={[
            { id: 'expense', label: 'Gasto Fijo', icon: ArrowDownRight },
            { id: 'income', label: 'Ingreso Periódico', icon: ArrowUpRight }
          ]}
          value={type}
          onChange={setType}
          size="md"
        />
      </div>

      {/* 2. Nombre o Concepto con Píldoras de Sugerencias */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
          Nombre o Concepto *
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName?.(e.target.value)}
          placeholder="Ej. Arriendo, Internet Fibra, Netflix, Salario"
          className="w-full h-11 px-3.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-emerald-500/60 bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100"
        />

        {/* Carrusel de sugerencias rápidas */}
        <RecurringPopularPills
          onSelectSuggestion={(sug) => setName?.(sug)}
          currentValue={name}
        />
      </div>

      {/* 3. Monto en Pesos Colombianos (COP) */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
          Monto ($ COP) *
        </label>
        <AmountInput
          value={amount}
          onChange={(cleanVal) => setAmount?.(cleanVal)}
          enableDecimals={enableDecimals}
          required
          onFocus={(e) => e.target.select()}
          prefix={
            <span className="opacity-40 font-black text-lg text-slate-900 dark:text-zinc-100">
              $
            </span>
          }
          className="w-full pl-8 pr-3.5 h-12 rounded-xl text-xl font-bold font-mono tracking-tight border border-slate-200 dark:border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-emerald-500/60 bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100"
        />
      </div>
    </>
  );
}
