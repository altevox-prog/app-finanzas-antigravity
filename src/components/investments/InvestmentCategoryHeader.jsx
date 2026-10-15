import React from 'react';
import InvestmentCategoryPicker from './modals/InvestmentCategoryPicker';

const CATEGORY_SUGGESTIONS = {
  crypto: ['Binance', 'Kraken', 'Hapi', 'Phantom'],
  variable: ['Hapi', 'Interactive Brokers', 'trii', 'XTB'],
  fixed: ['Bancolombia', 'Nu', 'Davivienda', 'Tyba'],
  liquidity: ['Nu', 'Lulo Bank', 'Bancolombia', 'Tyba']
};

const FINANCIAL_INSTITUTIONS_OPTIONS = [
  'Nu',
  'Bancolombia',
  'Hapi',
  'Binance',
  'Interactive Brokers',
  'Tyba',
  'Lulo Bank',
  'Davivienda',
  'Kraken',
  'Phantom',
  'trii',
  'XTB',
  'BBVA',
  'Littio',
  'Finandina',
  'Pibank',
  'RappiCuenta'
];

const getInstitutionPlaceholder = (cat) => {
  switch (cat) {
    case 'crypto':
      return 'ej. Binance, Kraken, Hapi, Phantom...';
    case 'variable':
      return 'ej. Hapi, Interactive Brokers, trii, XTB...';
    case 'fixed':
      return 'ej. Bancolombia, Nu, Davivienda, Tyba...';
    case 'liquidity':
      return 'ej. Nu, Lulo Bank, Bancolombia, Tyba...';
    default:
      return 'ej. Bancolombia, Nu, Hapi, Binance...';
  }
};

export default function InvestmentCategoryHeader({
  category,
  onCategoryChange,
  handleCategoryChange,
  institution,
  setInstitution,
  isEditing = false
}) {
  const onSelectCat = onCategoryChange || handleCategoryChange;
  const suggestions = CATEGORY_SUGGESTIONS[category] || CATEGORY_SUGGESTIONS.variable;

  return (
    <div className="space-y-3">
      {/* Selector de Categorías Principales */}
      <InvestmentCategoryPicker
        selectedCategory={category}
        onSelectCategory={onSelectCat}
      />

      {/* Entidad / Broker / Plataforma */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[11px] font-bold opacity-70">
            Entidad / Broker / Plataforma
          </label>
          <span className="text-[10px] opacity-50">Para agrupar en portafolio</span>
        </div>
        <input
          type="text"
          list="financial-institutions-list"
          placeholder={getInstitutionPlaceholder(category)}
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none transition-all"
          style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
        />
        <datalist id="financial-institutions-list">
          {FINANCIAL_INSTITUTIONS_OPTIONS.map((inst) => (
            <option key={inst} value={inst} />
          ))}
        </datalist>

        {/* Sugerencias contextuales de Entidad / Broker (en una sola línea con scroll horizontal) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 mt-1.5">
          <span className="text-[10px] opacity-40 font-semibold mr-0.5 shrink-0">Sugerencias:</span>
          {suggestions.map((inst) => {
            const isSelected = institution.toLowerCase() === inst.toLowerCase();
            return (
              <button
                key={inst}
                type="button"
                onClick={() => setInstitution(inst)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200/60 dark:bg-white/5 opacity-70 hover:opacity-100 text-slate-700 dark:text-slate-300'
                }`}
              >
                {inst}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
