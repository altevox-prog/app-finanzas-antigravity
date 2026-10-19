import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  ChevronDown, 
  Check, 
  X
} from 'lucide-react';
import CategoryIcon from './CategoryIcon';

/**
 * Determina si una categoría corresponde a compromisos fijos, servicios, deudas o suscripciones
 */
function isRecurringCategory(cat, selectedId) {
  if (!cat) return false;
  // Si coincide con la selección actual del registro, mantenerla para no perder datos al editar
  if (selectedId && (cat.id === selectedId || cat.name === selectedId)) return true;

  // Categorías personalizadas del usuario creadas al vuelo o marcadas como custom
  if (
    cat.is_custom || 
    cat.custom || 
    cat.isCustom || 
    String(cat.id).startsWith('cat-custom') || 
    /cat-\d+/.test(String(cat.id))
  ) {
    return true;
  }

  // Si es de tipo ingreso, permitir en pagos recurrentes (salario, arriendos, rentas)
  if (cat.type === 'income') return true;

  const id = (cat.id || '').toLowerCase();
  const name = (cat.name || '').toLowerCase();

  // Exclusiones explícitas de consumo variable / impulsivo
  if (
    id === 'cat-alimentacion' || name.includes('alimentac') || name.includes('restaurante') ||
    id === 'cat-compras' || name.includes('compras') || name.includes('ropa') ||
    id === 'cat-viajes' || name.includes('viaje') ||
    id === 'cat-cuidado-personal' || name.includes('cuidado personal')
  ) {
    return false;
  }

  // Inclusiones de gastos fijos y suscripciones recurrentes
  const isVivienda = id === 'cat-vivienda' || name.includes('vivienda') || name.includes('hogar');
  const isServicios = id === 'cat-servicios' || name.includes('servicio');
  const isSuscripciones = id === 'cat-ocio' || name.includes('suscripci') || name.includes('streaming') || name.includes('ocio');
  const isTransporte = id === 'cat-transporte' || name.includes('transporte');
  const isSalud = id === 'cat-salud' || name.includes('salud') || name.includes('bienestar');
  const isFinanzas = id === 'cat-finanzas-seguros' || name.includes('finanza') || name.includes('seguro') || name.includes('deuda');
  const isEducacion = id === 'cat-educacion' || name.includes('educaci');

  return isVivienda || isServicios || isSuscripciones || isTransporte || isSalud || isFinanzas || isEducacion;
}

/**
 * CategoryBottomSheetPicker
 * Selector de categorías y subcategorías de alta fluidez en modo solo selección:
 * - Scroll vertical nativo fluido (sin scroll-snap, timers ni listeners de scroll).
 * - Selección táctil instantánea de categoría y subcategoría.
 * - Barra de búsqueda superior para filtrado rápido.
 * - Carrusel horizontal de subcategorías contextuales.
 * - Cero re-renders durante el desplazamiento.
 */
export default function CategoryBottomSheetPicker({
  categories = [],
  selectedCategoryId = '',
  onSelectCategory = () => {},
  selectedSubcategoryId = '',
  onSelectSubcategory = () => {},
  type = 'expense', // 'expense' | 'income'
  scope = 'all', // 'all' | 'recurring'
  placeholder = 'Seleccionar categoría',
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const containerRef = useRef(null);

  // Lista base filtrada por tipo de movimiento y ámbito (scope)
  const categoriesList = useMemo(() => {
    const arr = Array.isArray(categories) ? categories.filter(Boolean) : [];
    const byType = arr.filter(c => !c.type || c.type === type || c.type === 'both');

    if (scope === 'recurring') {
      return byType.filter(cat => isRecurringCategory(cat, selectedCategoryId));
    }

    return byType;
  }, [categories, type, scope, selectedCategoryId]);

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

  // Subcategoría seleccionada actualmente
  const selectedSubcategory = useMemo(() => {
    if (!selectedCategory || !Array.isArray(selectedCategory.subcategories)) return null;
    return selectedCategory.subcategories.find(
      s => s && (s.id === selectedSubcategoryId || s.name === selectedSubcategoryId)
    ) || null;
  }, [selectedCategory, selectedSubcategoryId]);

  // Subcategorías de la categoría activa (filtrando duplicados y casos especiales)
  const activeSubcategories = useMemo(() => {
    if (!selectedCategory || !Array.isArray(selectedCategory.subcategories)) return [];
    return selectedCategory.subcategories
      .filter(Boolean)
      .filter(s => {
        const lower = (s.name || '').toLowerCase();
        return !lower.includes('universidad') && !lower.includes('colegio');
      });
  }, [selectedCategory]);

  // Bloqueo de scroll de fondo y auto-scroll a categoría activa al abrir
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Auto-scroll para llevar el elemento seleccionado a la vista sin bloquear
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const selectedEl = containerRef.current.querySelector('[data-selected="true"]');
        if (selectedEl) {
          selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    }, 40);

    return () => {
      document.body.style.overflow = originalOverflow;
      clearTimeout(timer);
    };
  }, [isOpen]);

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

  // Selección directa e instantánea de categoría
  const handleCategoryClick = (cat) => {
    onSelectCategory(cat.id);
    // Si la nueva categoría no contiene la subcategoría seleccionada, limpiarla
    const subExists = (cat.subcategories || []).some(
      s => s.id === selectedSubcategoryId || s.name === selectedSubcategoryId
    );
    if (!subExists) {
      onSelectSubcategory('');
    }
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

  const subcategoriesRowRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const scrollStartXRef = useRef(0);
  const hasMovedRef = useRef(false);

  const handlePointerDown = (e) => {
    // Solo botón principal del mouse o toque
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const container = subcategoriesRowRef.current;
    if (!container) return;

    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartXRef.current = e.pageX - container.offsetLeft;
    scrollStartXRef.current = container.scrollLeft;
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const container = subcategoriesRowRef.current;
    if (!container) return;

    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - dragStartXRef.current) * 1.5; // multiplicador de sensibilidad
    if (Math.abs(walk) > 5) {
      hasMovedRef.current = true;
    }
    container.scrollLeft = scrollStartXRef.current - walk;
  };

  const handlePointerUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const handleWheelScroll = (e) => {
    if (!subcategoriesRowRef.current) return;
    if (e.deltaY !== 0) {
      subcategoriesRowRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <>
      {/* 1. Botón disparador del formulario */}
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
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop con cierre al tocar fuera */}
          <div 
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[999998] bg-black/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Caja del modal flotante */}
          <div 
            className="relative z-[999999] w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden animate-scaleIn"
          >
            {/* A. Cabecera fija */}
            <div className="flex-shrink-0 pt-4 pb-2.5 px-5 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Categoría
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-400">
                    Selecciona la categoría principal y subcategoría
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Listo
                </button>
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
                    className="absolute right-2.5 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center text-[10px] hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* C. Contenedor de scroll vertical nativo fluido */}
            <div
              ref={containerRef}
              className="overflow-y-auto overscroll-contain touch-pan-y max-h-[260px] px-3 py-1 space-y-1 divide-y divide-transparent select-none"
            >
              {filteredCategories.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-xs text-slate-400 dark:text-zinc-500">
                    No hay categorías que coincidan
                  </p>
                </div>
              ) : (
                filteredCategories.map((cat) => {
                  const isSelected = cat && (cat.id === selectedCategoryId || cat.name === selectedCategoryId);

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      data-selected={isSelected}
                      onClick={() => handleCategoryClick(cat)}
                      className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl flex items-center justify-between transition-colors text-left cursor-pointer active:scale-[0.99] ${
                        isSelected
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 font-semibold shadow-xs'
                          : 'bg-transparent hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CategoryIcon category={cat} size="sm" />
                        <span className="truncate text-sm">
                          {cat.name}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 ml-2 shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* D. Franja inferior fija de subcategorías contextuales */}
            {selectedCategory && (
              <div className="flex-shrink-0 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-4 pt-3 pb-5">
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

                {/* Carrusel horizontal de subcategorías con soporte Drag-to-Scroll */}
                {activeSubcategories.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                    Esta categoría no tiene subcategorías.
                  </p>
                ) : (
                  <div 
                    ref={subcategoriesRowRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUpOrLeave}
                    onPointerLeave={handlePointerUpOrLeave}
                    onWheel={handleWheelScroll}
                    className="flex items-center gap-2 overflow-x-auto px-0.5 py-1.5 no-scrollbar select-none cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {activeSubcategories.map((sub) => {
                      const isSubSelected = selectedSubcategoryId === sub.id || selectedSubcategoryId === sub.name;
                      const displayName = (sub.name || '')
                        .replace(/⛽\s*Gasolina\s*\/\s*Combustible/i, '⛽ Gasolina')
                        .replace(/Gasolina\s*\/\s*Combustible/i, 'Gasolina');

                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            if (hasMovedRef.current) return;
                            onSelectSubcategory(isSubSelected ? '' : sub.id);
                          }}
                          className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-medium rounded-xl flex-shrink-0 shrink-0 transition-all cursor-pointer select-none active:scale-95 border ${
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
