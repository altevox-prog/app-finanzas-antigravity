import React from 'react';
import { Search } from 'lucide-react';
import SegmentedControl from '../../common/SegmentedControl';

/**
 * TransactionFilterBar
 * Barra de búsqueda, control segmentado de tipo/período y carrusel de filtrado por cuenta.
 */
export default function TransactionFilterBar({
  searchTerm = '',
  onSearchChange,
  typeFilter = 'all',
  onTypeFilterChange,
  selectedDay = null,
  onSelectDay,
  accountFilter = 'all',
  onAccountFilterChange,
  accounts = []
}) {
  return (
    <div className="space-y-2 mb-3">
      {/* iOS Style Search Bar */}
      <div className="relative w-full">
        <Search className="w-3.5 h-3.5 opacity-40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nota, categoría o cuenta..."
          value={searchTerm}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none transition-all"
        />
        {searchTerm && (
          <button 
            type="button"
            onClick={() => onSearchChange && onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100 cursor-pointer"
            title="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      {/* Segmented Control Tipo: Todos | Ingresos | Gastos y Selector de Período */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex-1">
          <SegmentedControl
            options={[
              { id: 'all', label: 'Todos' },
              { id: 'income', label: 'Ingresos' },
              { id: 'expense', label: 'Gastos' }
            ]}
            value={typeFilter}
            onChange={onTypeFilterChange}
            size="md"
          />
        </div>
        {onSelectDay && (
          <div className="w-full sm:w-44 shrink-0">
            <SegmentedControl
              options={[
                { id: 'month', label: 'Mes' },
                { id: 'day', label: selectedDay ? `Día ${selectedDay.split('-')[2]}` : 'Día' }
              ]}
              value={selectedDay ? 'day' : 'month'}
              onChange={(val) => {
                if (val === 'month') {
                  onSelectDay(null);
                } else {
                  const today = new Date().toISOString().split('T')[0];
                  onSelectDay(selectedDay || today);
                }
              }}
              size="md"
            />
          </div>
        )}
      </div>

      {/* Quick Filter Horizontal Scroll by Account */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-0.5 pr-6">
        <button
          type="button"
          onClick={() => onAccountFilterChange && onAccountFilterChange('all')}
          className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
            accountFilter === 'all'
              ? 'bg-[#007AFF] text-white shadow-sm font-bold'
              : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 opacity-75 hover:opacity-100'
          }`}
        >
          Todas
        </button>
        {accounts.map((acc) => (
          <button
            key={acc.id}
            type="button"
            onClick={() => onAccountFilterChange && onAccountFilterChange(acc.id)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
              accountFilter === acc.id
                ? 'bg-[#007AFF] text-white shadow-sm font-bold'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 opacity-75 hover:opacity-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: acc.color || '#007AFF' }} />
            <span>{acc.name}</span>
          </button>
        ))}
        {/* Espaciador final para evitar recorte de la última tarjeta al final del scroll */}
        <div className="w-4 shrink-0 h-1 pointer-events-none" aria-hidden="true" />
      </div>
    </div>
  );
}
