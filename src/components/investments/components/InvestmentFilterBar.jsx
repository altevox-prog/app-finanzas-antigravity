import React from 'react';
import { List, Building2 } from 'lucide-react';

/**
 * InvestmentFilterBar
 * Renderiza el carrusel de categorías para filtrado y la barra de controles de vista
 * (alternar entre vista plana de todas las inversiones o agrupada por entidad bancaria).
 */
export default function InvestmentFilterBar({
  categories = [],
  selectedCategory = 'all',
  onSelectCategory,
  viewGrouping = 'flat',
  onChangeViewGrouping,
  totalFilteredCount = 0,
  totalGroupedCount = 0,
  investments = []
}) {
  const totalCount = investments.length > 0 ? investments.length : totalFilteredCount;
  const showViewControls = (investments && investments.length > 0) || totalFilteredCount > 0 || totalGroupedCount > 0;

  return (
    <div className="space-y-2.5">
      {/* 1. BARRA DE FILTROS POR CATEGORÍA */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full">
        <button
          type="button"
          onClick={() => onSelectCategory && onSelectCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer active:scale-95 ${
            selectedCategory === 'all'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
              : 'bg-white/80 dark:bg-zinc-900/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
          }`}
        >
          Todos ({totalCount})
        </button>

        {categories.map(cat => {
          const count = investments.length > 0
            ? investments.filter(i => i.category === cat.id || i.assetType === cat.id).length
            : (cat.count ?? null);

          if (count === 0 && selectedCategory !== cat.id) return null;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory && onSelectCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isSelected
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-zinc-900/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              <span>{cat.shortName || cat.name}{count !== null ? ` (${count})` : ''}</span>
            </button>
          );
        })}
      </div>

      {/* 2. SELECTOR DE VISTA (POR BANCO VS TODOS) Y CONTADOR */}
      {showViewControls && (
        <div className="flex items-center justify-between gap-2">
          <div className="bg-slate-100 dark:bg-zinc-900/70 p-1 rounded-xl flex gap-1 border border-slate-200/50 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => onChangeViewGrouping && onChangeViewGrouping('flat')}
              className={`py-1.5 sm:py-2 px-3 rounded-lg flex items-center justify-center text-xs font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-98 ${
                viewGrouping === 'flat'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span className="whitespace-nowrap">Todas las Inversiones</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeViewGrouping && onChangeViewGrouping('by_institution')}
              className={`py-1.5 sm:py-2 px-3 rounded-lg flex items-center justify-center text-xs font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-98 ${
                viewGrouping === 'by_institution'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span className="whitespace-nowrap">Por Entidad / Banco</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline whitespace-nowrap">
            {viewGrouping === 'flat' 
              ? `${totalFilteredCount} activos listados` 
              : `${totalGroupedCount} entidades consolidadas`}
          </span>
        </div>
      )}
    </div>
  );
}
