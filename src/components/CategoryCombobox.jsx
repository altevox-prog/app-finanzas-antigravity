import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';
import CategoryIcon from './CategoryIcon';

const PRESET_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', 
  '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#8E8E93'
];

export default function CategoryCombobox({
  categories = [],
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  type = 'expense' // 'expense' | 'income'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const containerRef = useRef(null);

  const categoriesList = Array.isArray(categories) ? categories.filter(Boolean) : [];

  // Filter categories by current type
  const availableCategories = categoriesList.filter(c => c && (c.type === type || !c.type));
  const selectedCategory = availableCategories.find(c => c && c.id === selectedCategoryId) || categoriesList.find(c => c && c.id === selectedCategoryId) || null;

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

  const handleSelect = (cat) => {
    onSelectCategory(cat.id);
    setIsOpen(false);
    setIsCreatingNew(false);
  };

  const handleCreateAndSelect = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];

    const newCategory = {
      id: 'cat-' + Date.now(),
      name: trimmed,
      type,
      color: randomColor,
      icon: type === 'income' ? '💰' : '🏷️',
      subcategories: []
    };

    if (onAddCategory) {
      onAddCategory(newCategory);
    }
    onSelectCategory(newCategory.id);
    setNewCatName('');
    setIsCreatingNew(false);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setIsCreatingNew(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Botón táctil para evitar levantar teclado en celular */}
      <button 
        type="button"
        onClick={toggleDropdown}
        className="w-full relative flex items-center justify-between pl-3 pr-8 py-2 border border-transparent rounded-xl text-xs font-semibold focus:outline-none transition-all cursor-pointer text-left select-none"
        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedCategory ? (
            <>
              <CategoryIcon 
                icon={selectedCategory.icon} 
                category={selectedCategory} 
                color={selectedCategory.color} 
                size="sm" 
                withBadge={true} 
              />
              <span className="truncate font-semibold">{selectedCategory.name}</span>
            </>
          ) : (
            <span className="truncate opacity-50 font-normal">Selecciona categoría...</span>
          )}
        </div>
        <ChevronDown 
          className={`w-4 h-4 opacity-50 absolute right-3 pointer-events-none transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown menu con todas las categorías predefinidas */}
      {isOpen && (
        <div 
          className="absolute left-0 right-0 top-full mt-1 rounded-2xl shadow-2xl border max-h-60 overflow-y-auto z-50 animate-slide-up p-1.5 divide-y"
          style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        >
          <div className="space-y-0.5">
            {availableCategories.map((cat) => {
              const isSelected = cat.id === selectedCategoryId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                    isSelected ? 'bg-blue-500/15 font-bold text-[#007AFF]' : 'hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                  }`}
                  style={{ color: isSelected ? 'var(--accent-color)' : 'var(--text-main)' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CategoryIcon 
                      icon={cat.icon} 
                      category={cat} 
                      color={cat.color} 
                      size="sm" 
                      withBadge={true} 
                    />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Opción fija al final para crear nueva categoría */}
          <div className="pt-1 mt-1" style={{ borderColor: 'var(--border-color)' }}>
            {!isCreatingNew ? (
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(true);
                  setNewCatName('');
                }}
                className="w-full flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors text-left cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear nueva categoría</span>
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 space-y-2 border border-blue-500/30">
                <input
                  type="text"
                  autoFocus
                  placeholder="Nombre de la nueva categoría..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateAndSelect();
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
                    className="px-2.5 py-1 text-[11px] rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateAndSelect}
                    disabled={!newCatName.trim()}
                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-[#007AFF] text-white disabled:opacity-50 cursor-pointer"
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
