import React from 'react';
import { INVESTMENT_CATEGORIES } from '../../../data/initialData';

export default function InvestmentCategoryPicker({
  selectedCategory,
  onSelectCategory,
  categories = INVESTMENT_CATEGORIES
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold opacity-70 mb-1.5">
        Categoría de Inversión *
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              data-category-btn={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`p-2 rounded-xl text-left border flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                isSelected ? 'ring-2 font-black shadow-sm' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: isSelected ? `${cat.color}15` : 'var(--bg-input)',
                borderColor: isSelected ? cat.color : 'transparent',
                color: isSelected ? cat.color : 'var(--text-main)'
              }}
            >
              <span 
                className="w-2.5 h-2.5 rounded-full shrink-0" 
                style={{ backgroundColor: cat.color }} 
              />
              <span className="text-[11px] font-bold truncate">{cat.shortName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
