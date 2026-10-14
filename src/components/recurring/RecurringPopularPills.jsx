import React from 'react';
import { POPULAR_SUGGESTIONS } from '../../constants/recurringSuggestions';

/**
 * RecurringPopularPills
 * Carrusel horizontal de sugerencias rápidas para el concepto o nombre del pago recurrente.
 *
 * @param {Object} props
 * @param {Function} props.onSelectSuggestion Callback al presionar una sugerencia
 * @param {string} [props.currentValue] Valor actual del nombre para destacar la píldora activa
 * @param {Array<string>} [props.suggestions] Lista personalizada de sugerencias
 */
export default function RecurringPopularPills({
  onSelectSuggestion,
  currentValue = '',
  suggestions = POPULAR_SUGGESTIONS
}) {
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-2 no-scrollbar">
      {suggestions.map((sug) => {
        const isSelected = currentValue === sug;
        return (
          <button
            key={sug}
            type="button"
            onClick={() => onSelectSuggestion?.(sug)}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold shrink-0 transition-colors border cursor-pointer ${
              isSelected
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-white/5'
            }`}
          >
            {sug}
          </button>
        );
      })}
    </div>
  );
}
