import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Layers, Pencil, Trash2, X, Plus } from 'lucide-react';

const PRESET_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', '#007AFF', '#AF52DE'
];

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
  const [editingSubId, setEditingSubId] = useState(null);
  const [editSubName, setEditSubName] = useState('');
  const [editSubColor, setEditSubColor] = useState('#007AFF');

  // Estado para "+ Crear nueva subcategoría"
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

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setIsCreatingNew(false);
    }
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
    <div className="relative w-full" ref={containerRef}>
      {/* Botón selector táctil (NO editable para evitar levantar teclado ni selección de texto en móvil) */}
      <button 
        type="button"
        onClick={toggleDropdown}
        className="w-full relative flex items-center justify-between pl-3 pr-8 py-2.5 border border-transparent rounded-xl text-xs font-semibold focus:outline-none transition-all cursor-pointer text-left select-none"
        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {selectedSub ? (
            <span className="truncate font-semibold">{selectedSub.name}</span>
          ) : (
            <span className="truncate opacity-50 font-normal">{placeholder}</span>
          )}
        </div>
        <ChevronDown 
          className={`w-4 h-4 opacity-50 absolute right-2.5 pointer-events-none transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Menú desplegable táctil */}
      {isOpen && (
        <div 
          className="absolute left-0 right-0 top-full mt-1 rounded-2xl shadow-2xl border max-h-64 overflow-y-auto z-50 animate-slide-up p-1.5 divide-y"
          style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        >
          <div className="space-y-0.5">
            {/* Opción sin subcategoría */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full px-3 py-2 text-left text-xs rounded-xl transition-colors cursor-pointer ${
                !selectedSubcategoryId ? 'bg-blue-500/10 text-[#007AFF] font-bold' : 'opacity-60 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              (Sin subcategoría)
            </button>

            {subcategoriesList.map((sub) => {
              const isSelected = sub.id === selectedSubcategoryId;
              const isEditingThis = editingSubId === sub.id;

              if (isEditingThis) {
                return (
                  <div
                    key={sub.id}
                    className="p-2 rounded-xl border border-[#34C759] space-y-1.5"
                    style={{ backgroundColor: 'var(--bg-input)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={editSubName}
                        onChange={(e) => setEditSubName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (editSubName.trim() && onUpdateSubcategory) {
                              onUpdateSubcategory(parentCategoryId, sub.id, editSubName.trim(), editSubColor);
                            }
                            setEditingSubId(null);
                          } else if (e.key === 'Escape') {
                            setEditingSubId(null);
                          }
                        }}
                        className="flex-1 text-xs bg-transparent focus:outline-none font-semibold"
                        style={{ color: 'var(--text-main)' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editSubName.trim() && onUpdateSubcategory) {
                            onUpdateSubcategory(parentCategoryId, sub.id, editSubName.trim(), editSubColor);
                          }
                          setEditingSubId(null);
                        }}
                        className="p-1 text-[#34C759] hover:opacity-80 cursor-pointer"
                        title="Guardar"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSubId(null)}
                        className="p-1 opacity-50 hover:opacity-100 cursor-pointer"
                        style={{ color: 'var(--text-main)' }}
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 pt-1 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <span className="text-[10px] opacity-60 mr-1">Color:</span>
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditSubColor(c)}
                          className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer ${
                            editSubColor === c ? 'scale-125 ring-1 ring-[#34C759]' : 'opacity-80 hover:scale-110'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={sub.id}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors group cursor-pointer ${
                    isSelected ? 'bg-blue-500/15 font-bold text-[#007AFF]' : 'hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                  }`}
                  style={{ color: isSelected ? 'var(--accent-color)' : 'var(--text-main)' }}
                  onClick={() => handleSelect(sub)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: sub.color || '#007AFF' }}
                    />
                    <span className="truncate">{sub.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#007AFF]" />}
                    {onUpdateSubcategory && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSubId(sub.id);
                          setEditSubName(sub.name);
                          setEditSubColor(sub.color || '#007AFF');
                        }}
                        className="p-1 opacity-40 hover:opacity-100 hover:text-[#007AFF] rounded transition-opacity cursor-pointer"
                        title="Editar subcategoría"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    {onDeleteSubcategory && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Eliminar la subcategoría "${sub.name}"?`)) {
                            onDeleteSubcategory(parentCategoryId, sub.id);
                            if (selectedSubcategoryId === sub.id) {
                              onSelectSubcategory('');
                            }
                          }
                        }}
                        className="p-1 opacity-40 hover:opacity-100 hover:text-rose-600 rounded transition-opacity cursor-pointer"
                        title="Eliminar subcategoría"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
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
                className="w-full flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors text-left cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear nueva subcategoría</span>
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
                    className="px-2.5 py-1 text-[11px] rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    disabled={!newSubName.trim()}
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
