import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  ChevronDown, 
  Check, 
  Plus, 
  X, 
  Tag
} from 'lucide-react';
import CategoryIcon from './CategoryIcon';

const ITEM_HEIGHT = 44; // Altura fija exacta de 44px (h-11) por fila

const PRESET_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', 
  '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#8E8E93'
];
const PRESET_EMOJIS = ['🏷️', '🍔', '🚗', '🏠', '🍿', '💊', '📚', '🛍️', '💰', '☕', '💡', '✈️'];

/**
 * CategoryBottomSheetPicker
 * Wheel Picker nativo de una sola capa con Scroll Snap limpio:
 * - Una sola pista en el DOM sin capas duplicadas y sin estilos 3D.
 * - Viewport central acotado a h-[220px] (5 filas exactas de 44px).
 * - Padding vertical de 88px para centrado milimétrico del primer y último ítem.
 * - Cápsula focal estilizada de alta gama (w-4/5 max-w-xs py-2.5 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30).
 * - Contraste calibrado para categorías adyacentes (distancia 1: opacity-65, distancia >= 2: opacity-30).
 * - Scroll programático exacto al hacer tap con bandera isProgrammaticScroll para eliminar el overshoot.
 * - Carrusel de subcategorías optimizado: sin píldora redundante 'Solo {Categoría}', botón [+ Nueva] al frente y píldoras con whitespace-nowrap.
 * - Normalización de combustible a '⛽ Gasolina' para evitar desbordes.
 */
export default function CategoryBottomSheetPicker({
  categories = [],
  selectedCategoryId = '',
  onSelectCategory = () => {},
  selectedSubcategoryId = '',
  onSelectSubcategory = () => {},
  onAddCategory = null,
  onAddSubcategory = null,
  type = 'expense', // 'expense' | 'income'
  placeholder = 'Seleccionar categoría',
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para creación rápida en línea
  const [isCreatingSub, setIsCreatingSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState(type === 'income' ? '💰' : '🏷️');

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const scrollDebounceRef = useRef(null);
  const isProgrammaticScroll = useRef(false);
  const programmaticScrollTimer = useRef(null);

  // Lista base filtrada por tipo de movimiento
  const categoriesList = useMemo(() => {
    const arr = Array.isArray(categories) ? categories.filter(Boolean) : [];
    return arr.filter(c => !c.type || c.type === type || c.type === 'both');
  }, [categories, type]);

  // Filtrado de búsqueda
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categoriesList;

    return categoriesList.filter(cat => {
      if (cat.name.toLowerCase().includes(q)) return true;
      if (Array.isArray(cat.subcategories)) {
        return cat.subcategories.some(s => s && s.name.toLowerCase().includes(q));
      }
      return false;
    });
  }, [categoriesList, searchQuery]);

  // Categoría seleccionada actualmente en el modelo
  const selectedCategory = useMemo(() => {
    return categoriesList.find(c => c && (c.id === selectedCategoryId || c.name === selectedCategoryId)) || null;
  }, [categoriesList, selectedCategoryId]);

  // Índice de la categoría activa en la lista filtrada
  const activeIndex = useMemo(() => {
    if (!selectedCategory) return 0;
    const idx = filteredCategories.findIndex(c => c && (c.id === selectedCategory.id || c.name === selectedCategory.name));
    return idx >= 0 ? idx : 0;
  }, [filteredCategories, selectedCategory]);

  // Subcategoría seleccionada actualmente
  const selectedSubcategory = useMemo(() => {
    if (!selectedCategory || !Array.isArray(selectedCategory.subcategories)) return null;
    return selectedCategory.subcategories.find(
      s => s && (s.id === selectedSubcategoryId || s.name === selectedSubcategoryId)
    ) || null;
  }, [selectedCategory, selectedSubcategoryId]);

  // Subcategorías de la categoría activa (filtrando 'Universidad / Colegio' y normalizando nombres)
  const activeSubcategories = useMemo(() => {
    if (!selectedCategory || !Array.isArray(selectedCategory.subcategories)) return [];
    return selectedCategory.subcategories
      .filter(Boolean)
      .filter(s => {
        const lower = (s.name || '').toLowerCase();
        return !lower.includes('universidad') && !lower.includes('colegio');
      });
  }, [selectedCategory]);

  // Fijar categoría cuando el scroll manual se detiene completamente (ignorado durante scroll programático)
  const onScrollSettled = useCallback(() => {
    if (isProgrammaticScroll.current) return;
    if (!containerRef.current || filteredCategories.length === 0) return;

    const st = containerRef.current.scrollTop;
    const targetIdx = Math.max(0, Math.min(filteredCategories.length - 1, Math.round(st / ITEM_HEIGHT)));
    const activeCat = filteredCategories[targetIdx];

    if (activeCat && activeCat.id !== selectedCategoryId) {
      onSelectCategory(activeCat.id);
      // Si la nueva categoría no contiene la subcategoría previamente seleccionada, limpiarla
      const subExists = (activeCat.subcategories || []).some(
        s => s.id === selectedSubcategoryId || s.name === selectedSubcategoryId
      );
      if (!subExists) {
        onSelectSubcategory('');
      }
    }
  }, [filteredCategories, selectedCategoryId, selectedSubcategoryId, onSelectCategory, onSelectSubcategory]);

  // Listener de scroll manual con debounce de 80ms
  const handleScroll = useCallback(() => {
    if (isProgrammaticScroll.current) return;

    if (scrollDebounceRef.current) {
      clearTimeout(scrollDebounceRef.current);
    }
    scrollDebounceRef.current = setTimeout(() => {
      onScrollSettled();
    }, 80);
  }, [onScrollSettled]);

  // Soporte para evento nativo 'scrollend'
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isOpen) return;

    const handleScrollEnd = () => {
      if (isProgrammaticScroll.current) {
        isProgrammaticScroll.current = false;
        return;
      }
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
      onScrollSettled();
    };

    el.addEventListener('scrollend', handleScrollEnd);
    return () => {
      el.removeEventListener('scrollend', handleScrollEnd);
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
      if (programmaticScrollTimer.current) {
        clearTimeout(programmaticScrollTimer.current);
      }
    };
  }, [isOpen, onScrollSettled]);

  // Posicionamiento centrado inicial al abrir el modal
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        if (containerRef.current && filteredCategories.length > 0) {
          const idx = filteredCategories.findIndex(
            c => c && (c.id === selectedCategoryId || c.name === selectedCategoryId)
          );
          const targetIdx = idx >= 0 ? idx : 0;
          containerRef.current.scrollTop = targetIdx * ITEM_HEIGHT;

          if (targetIdx >= 0 && filteredCategories[targetIdx]?.id !== selectedCategoryId) {
            onSelectCategory(filteredCategories[targetIdx].id);
          }
        }
      }, 30);

      return () => {
        document.body.style.overflow = originalOverflow;
        clearTimeout(timer);
      };
    }
  }, [isOpen, selectedCategoryId, filteredCategories, onSelectCategory]);

  // Re-centrar al filtrar por búsqueda
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    if (filteredCategories.length > 0) {
      const idx = filteredCategories.findIndex(
        c => c && (c.id === selectedCategoryId || c.name === selectedCategoryId)
      );
      const targetIdx = idx >= 0 ? idx : 0;
      containerRef.current.scrollTop = targetIdx * ITEM_HEIGHT;
    }
  }, [searchQuery]);

  // Cierre con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Tap directo sobre una categoría: scroll programático exacto sin sobreimpulso (overshoot fix)
  const handleItemClick = (cat, index) => {
    isProgrammaticScroll.current = true;
    if (programmaticScrollTimer.current) {
      clearTimeout(programmaticScrollTimer.current);
    }

    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: 'smooth'
      });
    }

    onSelectCategory(cat.id);
    const subExists = (cat.subcategories || []).some(
      s => s.id === selectedSubcategoryId || s.name === selectedSubcategoryId
    );
    if (!subExists) {
      onSelectSubcategory('');
    }

    programmaticScrollTimer.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 350);
  };

  // Creación rápida de nueva subcategoría
  const handleConfirmCreateSub = () => {
    const trimmed = newSubName.trim();
    if (!trimmed || !selectedCategory?.id || !onAddSubcategory) return;

    const created = onAddSubcategory(selectedCategory.id, trimmed);
    if (created && created.id) {
      onSelectSubcategory(created.id);
    }
    setNewSubName('');
    setIsCreatingSub(false);
  };

  // Creación rápida de nueva categoría
  const handleConfirmCreateCat = () => {
    const trimmed = newCatName.trim();
    if (!trimmed || !onAddCategory) return;

    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    const newCat = {
      id: 'cat-' + Date.now(),
      name: trimmed,
      type,
      color: randomColor,
      icon: newCatEmoji || (type === 'income' ? '💰' : '🏷️'),
      subcategories: []
    };

    onAddCategory(newCat);
    onSelectCategory(newCat.id);
    onSelectSubcategory('');
    setNewCatName('');
    setIsCreatingCat(false);
  };

  // Contenido de la etiqueta del selector cuando el modal está cerrado
  const renderTriggerLabel = () => {
    if (!selectedCategory) {
      return (
        <span className="text-slate-400 dark:text-zinc-500 font-normal">
          {placeholder}
        </span>
      );
    }

    // Normalizar texto de combustible para el label del botón
    const displaySubName = selectedSubcategory?.name
      ? selectedSubcategory.name
          .replace(/⛽\s*Gasolina\s*\/\s*Combustible/i, '⛽ Gasolina')
          .replace(/Gasolina\s*\/\s*Combustible/i, 'Gasolina')
      : null;

    return (
      <div className="flex items-center gap-2 min-w-0">
        <CategoryIcon category={selectedCategory} size="sm" />
        <div className="flex items-center gap-1.5 min-w-0 text-sm truncate">
          <span className="font-semibold text-slate-800 dark:text-zinc-100 truncate">
            {selectedCategory.name}
          </span>
          {displaySubName && (
            <>
              <span className="text-slate-400 dark:text-zinc-500 font-medium shrink-0">›</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400 truncate">
                {displaySubName}
              </span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 1. Botón táctil del formulario */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={`w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/60 hover:bg-slate-100/80 dark:hover:bg-zinc-800 transition-all flex items-center justify-between text-left cursor-pointer active:scale-[0.99] select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        <div className="min-w-0 flex-1 mr-2">
          {renderTriggerLabel()}
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />
      </button>

      {/* 2. Modal Selector en Portal (Tarjeta flotante centrada) */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          {/* Backdrop con cierre al tocar fuera */}
          <div 
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 cursor-pointer"
          />

          {/* Caja del modal flotante */}
          <div 
            className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden animate-scaleIn"
          >
            {/* A. Cabecera fija */}
            <div className="flex-shrink-0 pt-4 pb-2.5 px-5 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Categoría
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-400">
                    Desplaza para elegir la categoría principal
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onAddCategory && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingCat(prev => !prev)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Crear nueva categoría"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Nueva</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    Listo
                  </button>
                </div>
              </div>
            </div>

            {/* B. Barra de búsqueda fija */}
            <div className="flex-shrink-0 px-4 py-2.5">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar categoría..."
                  className="w-full h-10 pl-9 pr-8 text-xs rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center text-[10px]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Formulario desplegable para nueva categoría */}
            {isCreatingCat && (
              <div className="flex-shrink-0 mx-4 my-1.5 p-3 rounded-2xl border border-emerald-500/40 bg-slate-50 dark:bg-slate-800/80 shadow-sm space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    Nueva Categoría ({type === 'income' ? 'Ingreso' : 'Gasto'})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCat(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                  {PRESET_EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewCatEmoji(em)}
                      className={`w-7 h-7 text-sm rounded-lg flex items-center justify-center shrink-0 border ${
                        newCatEmoji === em ? 'border-emerald-500 bg-emerald-500/10' : 'border-transparent'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Nombre de la categoría..."
                    autoFocus
                    className="flex-1 h-8 px-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmCreateCat();
                      if (e.key === 'Escape') setIsCreatingCat(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleConfirmCreateCat}
                    disabled={!newCatName.trim()}
                    className="h-8 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            )}

            {/* C. Viewport Central: Wheel Picker nativo con cápsula focal estilizada y contraste equilibrado */}
            <div className="relative select-none overflow-hidden">
              {/* Máscaras de gradiente superior e inferior para efecto profundidad continuo */}
              <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-white dark:from-slate-900 to-transparent pointer-events-none z-10" />
              <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none z-10" />

              {/* Única pista de scroll vertical con Scroll Snap nativo */}
              <div
                ref={containerRef}
                onScroll={handleScroll}
                className="single-wheel-track h-[220px] overflow-y-scroll snap-y snap-mandatory relative [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                style={{
                  paddingTop: '88px',
                  paddingBottom: '88px'
                }}
              >
                {filteredCategories.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs text-slate-400 dark:text-zinc-500">
                      No hay categorías que coincidan
                    </p>
                  </div>
                ) : (
                  filteredCategories.map((cat, index) => {
                    const isSelected = cat && (cat.id === selectedCategoryId || cat.name === selectedCategoryId);
                    const distance = Math.abs(index - activeIndex);

                    return (
                      <div
                        key={cat.id}
                        onClick={() => handleItemClick(cat, index)}
                        className="w-full h-11 snap-center flex items-center justify-center cursor-pointer transition-all duration-150 select-none"
                        style={{ height: `${ITEM_HEIGHT}px` }}
                      >
                        {isSelected ? (
                          // Cápsula central activa armónica y estilizada con checkmark absoluto para centrado geométrico perfecto
                          <div className="relative w-4/5 max-w-xs mx-auto py-2.5 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 font-semibold text-base flex items-center justify-center shadow-sm shadow-emerald-500/10 transition-all duration-150">
                            <div className="flex items-center justify-center gap-2 min-w-0 text-center">
                              <CategoryIcon category={cat} size="sm" />
                              <span className="truncate">{cat.name}</span>
                            </div>
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[3] absolute right-4 shrink-0 pointer-events-none" />
                          </div>
                        ) : distance === 1 ? (
                          // Ítems contiguos (a 1 posición): centrados en el eje con contraste cómodo al 65%
                          <div className="w-full flex items-center justify-center gap-2 text-center opacity-65 text-slate-600 dark:text-slate-300 font-medium text-sm transition-all duration-150 hover:opacity-90">
                            <CategoryIcon category={cat} size="sm" />
                            <span className="truncate">{cat.name}</span>
                          </div>
                        ) : (
                          // Ítems a 2 o más posiciones: centrados en el eje con opacidad suave al 30%
                          <div className="w-full flex items-center justify-center gap-2 text-center opacity-30 text-slate-400 dark:text-slate-500 font-normal text-sm transition-all duration-150 hover:opacity-70">
                            <CategoryIcon category={cat} size="sm" />
                            <span className="truncate">{cat.name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* D. Franja inferior fija de subcategorías contextuales */}
            <div className="flex-shrink-0 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-4 pt-3 pb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Subcategoría (opcional):
                </span>
                {selectedSubcategoryId && (
                  <button
                    type="button"
                    onClick={() => onSelectSubcategory('')}
                    className="text-[11px] text-slate-400 hover:text-rose-500 font-medium transition-colors cursor-pointer"
                  >
                    Quitar selección
                  </button>
                )}
              </div>

              {/* Carrusel horizontal de subcategorías con botón [+ Nueva] al frente */}
              <div className="flex items-center gap-2 overflow-x-auto px-1 pr-10 py-1.5 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {/* 1. Botón [+ Nueva] anclado a la izquierda al alcance inmediato del pulgar */}
                {onAddSubcategory && selectedCategory && !isCreatingSub && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingSub(true)}
                    className="whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold rounded-xl flex-shrink-0 shrink-0 border border-dashed border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nueva</span>
                  </button>
                )}

                {/* 2. Píldoras de las subcategorías existentes con toggle al pulsar */}
                {activeSubcategories.map((sub) => {
                  const isSubSelected = selectedSubcategoryId === sub.id || selectedSubcategoryId === sub.name;
                  const displayName = (sub.name || '')
                    .replace(/⛽\s*Gasolina\s*\/\s*Combustible/i, '⛽ Gasolina')
                    .replace(/Gasolina\s*\/\s*Combustible/i, 'Gasolina');

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => onSelectSubcategory(isSubSelected ? '' : sub.id)}
                      className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-medium rounded-xl flex-shrink-0 shrink-0 transition-all cursor-pointer active:scale-95 border ${
                        isSubSelected
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs ring-2 ring-emerald-500/20 font-semibold'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {displayName}
                    </button>
                  );
                })}
              </div>

              {/* Micro-input inline para añadir subcategoría a la categoría actual */}
              {isCreatingSub && (
                <div className="pt-2.5 flex items-center gap-1.5 animate-fadeIn">
                  <input
                    type="text"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    placeholder={`Nueva subcategoría para ${selectedCategory?.name}...`}
                    autoFocus
                    className="flex-1 h-8 px-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmCreateSub();
                      if (e.key === 'Escape') setIsCreatingSub(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleConfirmCreateSub}
                    disabled={!newSubName.trim()}
                    className="h-8 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Crear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingSub(false);
                      setNewSubName('');
                    }}
                    className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 flex items-center justify-center text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
