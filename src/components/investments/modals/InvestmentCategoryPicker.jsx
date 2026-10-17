import React from 'react';
import { ChevronDown } from 'lucide-react';
import { INVESTMENT_CATEGORIES } from '../../../data/initialData';

export default function InvestmentCategoryPicker({
  selectedCategory,
  onSelectCategory,
  categories = INVESTMENT_CATEGORIES
}) {
  const activeCat = categories.find((c) => c.id === selectedCategory) || categories[0];

  return (
    <div>
      <label className="block text-[11px] font-bold opacity-70 mb-1">
        Categoría de Inversión *
      </label>
      <div className="relative flex items-center">
        {/* Indicador visual de categoría: únicamente punto de color temático */}
        <div className="absolute left-3.5 flex items-center pointer-events-none z-10">
          <span 
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
            style={{ backgroundColor: activeCat?.color || '#007AFF' }} 
          />
        </div>

        {/* Selector Dropdown compacto (<select> estilizado) */}
        <select
          value={selectedCategory}
          onChange={(e) => onSelectCategory(e.target.value)}
          className="w-full text-xs font-bold pl-8 pr-8 py-2.5 rounded-xl border border-transparent appearance-none focus:outline-none cursor-pointer transition-all shadow-xs"
          style={{
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-main)'
          }}
        >
          {categories.map((cat) => (
            <option
              key={cat.id}
              value={cat.id}
              className="text-slate-900 bg-white dark:text-white dark:bg-[#1A1F2C]"
            >
              {cat.name}
            </option>
          ))}
        </select>

        <ChevronDown className="absolute right-3 w-4 h-4 opacity-50 pointer-events-none" />
      </div>
    </div>
  );
}

