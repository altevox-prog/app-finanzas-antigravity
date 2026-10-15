import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Layers, Plus } from 'lucide-react';

export default function SubcategoryCombobox({
  subcategories = [],
  selectedSubcategoryId,
  onSelectSubcategory,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  parentCategoryId,
  placeholder = "Seleccionar subcategoría (opcional)"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newSubName, setNewSubName] = useState('');

  const containerRef = useRef(null);

  const subcategoriesList = Array.isArray(subcategories) ? subcategories.filter(Boolean) : [];
  const selectedSub = subcategoriesList.find(s => s && s.id === selectedSubcategoryId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsCreatingNew(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpen(prev => !prev);
    setIsCreatingNew(false);
  };

  const handleSelect = (sub) => {
    onSelectSubcategory(sub ? sub.id : '');
    setIsOpen(false);
    setIsCreatingNew(false);
  };

  const handleCreateNew = () => {
    const trimmed = newSubName.trim();
    if (!trimmed || !parentCategoryId) return;

    if (onAddSubcategory) {
      const created = onAddSubcategory(parentCategoryId, trimmed);
      if (created && created.id) {
        onSelectSubcategory(created.id);
      }
    }
    setNewSubName('');
    setIsCreatingNew(false);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full select-none touch-manipulation" ref={containerRef}>
      {/* Botón selector táctil (altura 44px, no editable, no selección de texto) */}
      <button 
        type="button"
        onClick={toggleDropdown}
        className="w-full min-h-[44px] h-11 relative flex items-center justify-between pl-3 pr-9 py-2.5 border border-transparent rounded-xl text-xs font-semibold focus:outline-none transition-all cursor-pointer text-left select-none touch-manipulation active:scale-[0.99]"
        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 select-none pointer-events-none">
          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0 select-none" />
          {selectedSub ? (
            <span className="truncate font-semibold select-none">{selectedSub.name}</span>
          ) : (
            <span className="truncate opacity-50 font-normal select-none">{placeholder}</span>
          )}
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center select-none pointer-events-none">
          <ChevronDown 
            className={`w-4 h-4 opacity-50 select-none pointer-events-none transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      {/* Menú desplegable táctil */}
      {isOpen && (
        <div 
          className="absolute left-0 right-0 top-full mt-1 rounded-2xl shadow-2xl border max-h-60 overflow-y-auto z-50 animate-slide-up p-1.5 divide-y select-none touch-manipulation"
          style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        >
          <div className="space-y-0.5">
            {/* Opción sin subcategoría */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full min-h-[40px] flex items-center justify-between px-3 py-2 text-left text-xs rounded-xl transition-colors cursor-pointer select-none touch-manipulation ${
                !selectedSubcategoryId ? 'bg-blue-500/10 text-[#007AFF] font-bold' : 'opacity-60 hover:bg-black/5 dark:hover:bg-white/5 font-medium'
              }`}
            >
              <span className="select-none pointer-events-none">(Sin subcategoría)</span>
              {!selectedSubcategoryId && <Check className="w-3.5 h-3.5 text-[#007AFF] shrink-0 select-none" />}
            </button>

            {subcategoriesList.map((sub) => {
              const isSelected = sub.id === selectedSubcategoryId;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSelect(sub)}
                  className={`w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer select-none touch-manipulation ${
                    isSelected ? 'bg-blue-500/15 font-bold text-[#007AFF]' : 'hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                  }`}
                  style={{ color: isSelected ? 'var(--accent-color)' : 'var(--text-main)' }}
                >
                  <div className="flex items-center gap-2 min-w-0 select-none pointer-events-none">
                    <span
                      className="w-2 h-2 rounded-full shrink-0 select-none"
                      style={{ backgroundColor: sub.color || '#007AFF' }}
                    />
                    <span className="truncate select-none">{sub.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#007AFF] shrink-0 select-none" />}
                </button>
              );
            })}
          </div>

          {/* Opción fija al final: '+ Crear nueva subcategoría' */}
          <div className="pt-1 mt-1" style={{ borderColor: 'var(--border-color)' }}>
            {!isCreatingNew ? (
              <button
                type="button"
                onClick={() => {
                  if (!parentCategoryId) {
                    alert('Por favor selecciona primero una categoría principal.');
                    return;
                  }
                  setIsCreatingNew(true);
                  setNewSubName('');
                }}
                className="w-full min-h-[40px] flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors text-left cursor-pointer select-none touch-manipulation"
              >
                <Plus className="w-4 h-4 shrink-0 select-none pointer-events-none" />
                <span className="select-none pointer-events-none">Crear nueva subcategoría</span>
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 space-y-2 border border-blue-500/30">
                <input
                  type="text"
                  autoFocus
                  placeholder="Nombre de la nueva subcategoría..."
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateNew();
                    } else if (e.key === 'Escape') {
                      setIsCreatingNew(false);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-2.5 py-1 text-[11px] rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer select-none touch-manipulation"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    disabled={!newSubName.trim()}
                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-[#007AFF] text-white disabled:opacity-50 cursor-pointer select-none touch-manipulation"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
