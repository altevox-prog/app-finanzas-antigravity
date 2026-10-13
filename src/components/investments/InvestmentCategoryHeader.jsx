import React from 'react';
import InvestmentCategoryPicker from './modals/InvestmentCategoryPicker';

const SUGGESTED_INSTITUTIONS = ['Nu', 'Bancolombia', 'Lulo Bank', 'Davivienda', 'Binance', 'Tyba', 'Hapi'];

const FINANCIAL_INSTITUTIONS_OPTIONS = [
  'Nu',
  'Bancolombia',
  'Lulo Bank',
  'Davivienda',
  'BBVA',
  'Tyba',
  'Trii',
  'Littio',
  'Binance',
  'Interactive Brokers',
  'Hapi',
  'Finandina',
  'Pibank',
  'RappiCuenta',
  'Fiducuenta'
];

export default function InvestmentCategoryHeader({
  category,
  onCategoryChange,
  handleCategoryChange,
  institution,
  setInstitution,
  isEditing = false
}) {
  const onSelectCat = onCategoryChange || handleCategoryChange;

  return (
    <div className="space-y-4">
      {/* Selector de Categorías Principales */}
      <InvestmentCategoryPicker
        selectedCategory={category}
        onSelectCategory={onSelectCat}
      />

      {/* Entidad Financiera / Banco */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[11px] font-bold opacity-70">
            Entidad Financiera / Banco
          </label>
          <span className="text-[10px] opacity-50">Para agrupar en portafolio</span>
        </div>
        <input
          type="text"
          list="financial-institutions-list"
          placeholder="ej. Nu, Bancolombia, Lulo Bank, Binance, Hapi, Tyba..."
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

        {/* Chips rápidos de bancos/entidades más comunes */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {SUGGESTED_INSTITUTIONS.map((inst) => {
            const isSelected = institution.toLowerCase() === inst.toLowerCase();
            return (
              <button
                key={inst}
                type="button"
                onClick={() => setInstitution(inst)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white'
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
