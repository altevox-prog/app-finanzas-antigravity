import React from 'react';
import { SlidersHorizontal, Calendar, RotateCcw, X } from 'lucide-react';

export default function TransactionFilterModal({
  isOpen, onClose, hasActiveFilters, handleResetFilters,
  selectedDay, onSelectDay, handleClearSelectedDay,
  categoryFilter, setCategoryFilter, categories = [],
  accountFilter, setAccountFilter, accounts = [],
  totalItems, pillCls
}) {
  if (!isOpen) return null;

  const sections = [
    { label: 'Categoría', filter: categoryFilter, setFilter: setCategoryFilter, allText: 'Todas las categorías', items: categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon })) },
    { label: 'Cuenta o método de pago', filter: accountFilter, setFilter: setAccountFilter, allText: 'Todas las cuentas', items: accounts.map((a) => ({ id: a.id, name: a.name, color: a.color })) }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200/80 dark:border-white/10 max-h-[85vh] overflow-y-auto z-10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-[#007AFF]" /><h3 className="text-base font-bold text-slate-900 dark:text-white">Filtros de movimientos</h3></div>
          <div className="flex items-center gap-1">
            {hasActiveFilters && <button type="button" onClick={handleResetFilters} className="px-2.5 py-1 text-xs font-semibold text-rose-500 hover:text-rose-600 rounded-lg cursor-pointer">Restablecer</button>}
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer" aria-label="Cerrar filtros"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[#007AFF]" /><span>Filtrar por día</span></span>
            {selectedDay && <button type="button" onClick={handleClearSelectedDay} className="text-[11px] text-rose-500 hover:underline font-semibold cursor-pointer">Quitar día</button>}
          </div>
          <input type="date" value={selectedDay || ''} onChange={(e) => onSelectDay?.(e.target.value || null)} className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 border border-slate-200/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 cursor-pointer" />
        </div>
        {sections.map((sec) => (
          <div key={sec.label}>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-2">{sec.label}</span>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar py-1">
              <button type="button" onClick={() => sec.setFilter('all')} className={pillCls(sec.filter === 'all')}>{sec.allText}</button>
              {sec.items.map((it) => (
                <button key={it.id} type="button" onClick={() => sec.setFilter(it.id)} className={`${pillCls(sec.filter === it.id)} flex items-center gap-1.5`}>
                  {it.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: it.color || '#007AFF' }} />}
                  {it.icon && <span className="text-xs">{it.icon}</span>}
                  <span>{it.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
          {hasActiveFilters && <button type="button" onClick={handleResetFilters} className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /><span>Limpiar</span></button>}
          <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#007AFF] hover:bg-[#0062cc] active:scale-98 shadow-md cursor-pointer text-center">Ver resultados ({totalItems})</button>
        </div>
      </div>
    </div>
  );
}
