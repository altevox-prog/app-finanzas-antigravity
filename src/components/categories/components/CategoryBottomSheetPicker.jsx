import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import CategoryIcon from './CategoryIcon';

function isRecurringCategory(cat, selectedId) {
  if (!cat) return false;
  if (selectedId && (cat.id === selectedId || cat.name === selectedId)) return true;
  if (cat.is_custom || cat.custom || cat.isCustom || String(cat.id).startsWith('cat-custom') || /cat-\d+/.test(String(cat.id)) || cat.type === 'income') return true;
  const id = (cat.id || '').toLowerCase(), name = (cat.name || '').toLowerCase();
  if (['cat-alimentacion', 'cat-compras', 'cat-viajes', 'cat-cuidado-personal'].includes(id) || /alimentac|restaurante|compras|ropa|viaje|cuidado personal/.test(name)) return false;
  return /vivienda|hogar|servicio|suscripci|streaming|ocio|transporte|salud|bienestar|finanza|seguro|deuda|educaci/.test(`${id} ${name}`);
}

const cleanGasName = (n = '') => n.replace(/⛽?\s*Gasolina\s*\/\s*Combustible/i, '⛽ Gasolina').replace(/Gasolina\s*\/\s*Combustible/i, 'Gasolina');

export default function CategoryBottomSheetPicker({
  categories = [], selectedCategoryId = '', onSelectCategory = () => {},
  selectedSubcategoryId = '', onSelectSubcategory = () => {}, type = 'expense',
  scope = 'all', placeholder = 'Seleccionar categoría', disabled = false, className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const containerRef = useRef(null);
  const subcategoriesRowRef = useRef(null);
  const dragRef = useRef({ isDown: false, moved: false, startX: 0, scrollLeft: 0 });

  const categoriesList = useMemo(() => {
    const arr = (Array.isArray(categories) ? categories.filter(Boolean) : []).filter((c) => !c.type || c.type === type || c.type === 'both');
    return scope === 'recurring' ? arr.filter((cat) => isRecurringCategory(cat, selectedCategoryId)) : arr;
  }, [categories, type, scope, selectedCategoryId]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categoriesList;
    return categoriesList.filter((cat) => cat.name?.toLowerCase().includes(q) || (Array.isArray(cat.subcategories) && cat.subcategories.some((s) => s?.name?.toLowerCase().includes(q))));
  }, [categoriesList, searchQuery]);

  const selectedCategory = useMemo(() => categoriesList.find((c) => c && (c.id === selectedCategoryId || c.name === selectedCategoryId)) || null, [categoriesList, selectedCategoryId]);
  const selectedSubcategory = useMemo(() => (!selectedCategory || !Array.isArray(selectedCategory.subcategories)) ? null : (selectedCategory.subcategories.find((s) => s && (s.id === selectedSubcategoryId || s.name === selectedSubcategoryId)) || null), [selectedCategory, selectedSubcategoryId]);
  const activeSubcategories = useMemo(() => (!selectedCategory || !Array.isArray(selectedCategory.subcategories)) ? [] : selectedCategory.subcategories.filter((s) => { const l = (s?.name || '').toLowerCase(); return s && !l.includes('universidad') && !l.includes('colegio'); }), [selectedCategory]);

  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => { containerRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 40);
    return () => { document.body.style.overflow = orig; clearTimeout(timer); };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && isOpen) setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleCategoryClick = (cat) => {
    onSelectCategory(cat.id);
    if (!(cat.subcategories || []).some((s) => s.id === selectedSubcategoryId || s.name === selectedSubcategoryId)) onSelectSubcategory('');
  };

  const handlePointerDown = (e) => {
    if (e.button === 0 || e.pointerType !== 'mouse') {
      const c = subcategoriesRowRef.current;
      if (c) dragRef.current = { isDown: true, moved: false, startX: e.pageX - c.offsetLeft, scrollLeft: c.scrollLeft };
    }
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.isDown || !subcategoriesRowRef.current) return;
    e.preventDefault();
    const walk = (e.pageX - subcategoriesRowRef.current.offsetLeft - dragRef.current.startX) * 1.5;
    if (Math.abs(walk) > 5) dragRef.current.moved = true;
    subcategoriesRowRef.current.scrollLeft = dragRef.current.scrollLeft - walk;
  };

  const renderTrigger = () => {
    if (!selectedCategory) return <span className="text-slate-400 dark:text-zinc-500 font-normal">{placeholder}</span>;
    const subName = selectedSubcategory?.name ? cleanGasName(selectedSubcategory.name) : null;
    return (
      <div className="flex items-center gap-2 min-w-0">
        <CategoryIcon category={selectedCategory} size="sm" />
        <div className="flex items-center gap-1.5 min-w-0 text-sm truncate">
          <span className="font-semibold text-slate-800 dark:text-zinc-100 truncate">{selectedCategory.name}</span>
          {subName && <><span className="text-slate-400 font-medium">›</span><span className="font-medium text-emerald-600 dark:text-emerald-400 truncate">{subName}</span></>}
        </div>
      </div>
    );
  };

  return (
    <>
      <button type="button" onClick={() => !disabled && setIsOpen(true)} disabled={disabled} className={`w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/60 hover:bg-slate-100 flex items-center justify-between text-left cursor-pointer active:scale-[0.99] select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
        <div className="min-w-0 flex-1 mr-2">{renderTrigger()}</div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 animate-fadeIn">
          <div onClick={() => setIsOpen(false)} className="fixed inset-0 z-[999998] bg-black/60 backdrop-blur-sm cursor-pointer" />
          <div className="relative z-[999999] w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden animate-scaleIn">
            <div className="pt-4 pb-2.5 px-5 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between shrink-0">
              <div><h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Categoría</h3><p className="text-[11px] text-slate-400">Selecciona categoría y subcategoría</p></div>
              <button type="button" onClick={() => setIsOpen(false)} className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs active:scale-95 cursor-pointer">Listo</button>
            </div>

            <div className="px-4 py-2.5 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar categoría..." className="w-full h-10 pl-9 pr-8 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/60" />
                {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-[10px]"><X className="w-3 h-3" /></button>}
              </div>
            </div>

            <div ref={containerRef} className="overflow-y-auto overscroll-contain max-h-[260px] px-3 py-1 space-y-1 select-none">
              {filteredCategories.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No hay categorías que coincidan</div>
              ) : (
                filteredCategories.map((cat) => {
                  const isSel = cat && (cat.id === selectedCategoryId || cat.name === selectedCategoryId);
                  return (
                    <button key={cat.id} type="button" data-selected={isSel} onClick={() => handleCategoryClick(cat)} className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-left cursor-pointer active:scale-[0.99] ${isSel ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 font-semibold shadow-xs' : 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'}`}>
                      <div className="flex items-center gap-2.5 min-w-0"><CategoryIcon category={cat} size="sm" /><span className="truncate text-sm">{cat.name}</span></div>
                      {isSel && <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 ml-2 shadow-xs"><Check className="w-3.5 h-3.5 stroke-[2.5]" /></div>}
                    </button>
                  );
                })
              )}
            </div>

            {selectedCategory && (
              <div className="shrink-0 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-4 pt-3 pb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subcategoría (opcional):</span>
                  {selectedSubcategoryId && <button type="button" onClick={() => onSelectSubcategory('')} className="text-[11px] text-slate-400 hover:text-rose-500 font-medium cursor-pointer">Quitar selección</button>}
                </div>
                {activeSubcategories.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">Esta categoría no tiene subcategorías.</p>
                ) : (
                  <div ref={subcategoriesRowRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={() => { dragRef.current.isDown = false; }} onPointerLeave={() => { dragRef.current.isDown = false; }} onWheel={(e) => { if (subcategoriesRowRef.current && e.deltaY !== 0) subcategoriesRowRef.current.scrollLeft += e.deltaY; }} className="flex items-center gap-2 overflow-x-auto px-0.5 py-1.5 no-scrollbar select-none cursor-grab active:cursor-grabbing">
                    {activeSubcategories.map((sub) => {
                      const isSubSel = selectedSubcategoryId === sub.id || selectedSubcategoryId === sub.name;
                      return (
                        <button key={sub.id} type="button" onClick={() => !dragRef.current.moved && onSelectSubcategory(isSubSel ? '' : sub.id)} className={`whitespace-nowrap px-3.5 py-1.5 text-xs rounded-xl shrink-0 cursor-pointer active:scale-95 border ${isSubSel ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs ring-2 ring-emerald-500/20 font-semibold' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'}`}>
                          {cleanGasName(sub.name || '')}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
