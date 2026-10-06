import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Pencil, 
  Tag, 
  Check, 
  FolderPlus, 
  CornerDownRight, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Sparkles
} from 'lucide-react';
import CategoryIcon, { DynamicIcon, AVAILABLE_ICONS } from './CategoryIcon';
import EmojiPickerModal from './EmojiPickerModal';
import { DEFAULT_CATEGORIES } from '../data/initialData';

const PRESET_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', 
  '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#8E8E93'
];

export default function CategoriesView({
  categories = [],
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  onBack,
  fromSettings = false,
  previousView,
  hideBackButton = false
}) {
  const [activeTab, setActiveTab] = useState('expense'); // 'expense' | 'income'

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else if (fromSettings || previousView === 'settings') {
      if (typeof window !== 'undefined' && window.history.length > 2) {
        window.history.back();
      }
    } else if (typeof window !== 'undefined' && window.history.length > 2) {
      window.history.back();
    }
  };
  
  // Safe handleAddCategory helper
  const handleAddCategory = () => {
    if (typeof setIsNewCategoryModalOpen === 'function') {
      setIsNewCategoryModalOpen(true);
    } else {
      setShowAddCategory(true);
    }
  };

  // Emoji Picker Modal State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState('new'); // 'new' | 'edit'

  // New Category Modal
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('expense');
  const [newCatColor, setNewCatColor] = useState('#FF9500');
  const [newCatIcon, setNewCatIcon] = useState('🍔');
  const [newCatInitialSub, setNewCatInitialSub] = useState('');

  // Edit Category Modal
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatType, setEditCatType] = useState('expense');
  const [editCatColor, setEditCatColor] = useState('#FF9500');
  const [editCatIcon, setEditCatIcon] = useState('🍔');

  // Subcategory Edit & Inline Add
  const [editingSubId, setEditingSubId] = useState(null);
  const [editSubName, setEditSubName] = useState('');
  const [editSubColor, setEditSubColor] = useState('#007AFF');
  const [subInputs, setSubInputs] = useState({});
  const [activeSubInputCatId, setActiveSubInputCatId] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (catId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const handleOpenAddModal = (defaultType = activeTab) => {
    setNewCatType(defaultType);
    setNewCatColor(defaultType === 'income' ? '#34C759' : '#FF9500');
    setNewCatIcon(defaultType === 'income' ? '💰' : '🍔');
    setNewCatName('');
    setNewCatInitialSub('');
    setShowAddCategory(true);
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const initialSubs = newCatInitialSub.trim() 
      ? newCatInitialSub.split(',').map((s, idx) => ({ id: `sub-${Date.now()}-${idx}`, name: s.trim() })).filter(s => s.name)
      : [];

    const newCat = {
      id: 'cat-' + Date.now(),
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor,
      icon: newCatIcon,
      subcategories: initialSubs
    };

    if (onAddCategory) {
      onAddCategory(newCat);
    }
    setNewCatName('');
    setNewCatInitialSub('');
    setShowAddCategory(false);
  };

  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatType(cat.type);
    setEditCatColor(cat.color || '#FF9500');
    setEditCatIcon(cat.icon || (cat.type === 'income' ? '💰' : '🍔'));
  };

  const handleSaveEditCategory = (e) => {
    e.preventDefault();
    if (!editingCategory || !editCatName.trim()) return;

    const updated = {
      ...editingCategory,
      name: editCatName.trim(),
      type: editCatType,
      color: editCatColor,
      icon: editCatIcon
    };

    if (onUpdateCategory) {
      onUpdateCategory(updated);
    }
    setEditingCategory(null);
  };

  const handleSaveSubcategory = (catId, subId) => {
    if (!editSubName.trim()) {
      setEditingSubId(null);
      return;
    }
    if (onUpdateSubcategory) {
      onUpdateSubcategory(catId, subId, editSubName.trim(), editSubColor);
    }
    setEditingSubId(null);
  };

  const handleQuickAddSub = (catId) => {
    const val = (subInputs[catId] || '').trim();
    if (!val) return;

    if (onAddSubcategory) {
      onAddSubcategory(catId, val);
    }
    setSubInputs(prev => ({ ...prev, [catId]: '' }));
    setActiveSubInputCatId(null);
  };

  // Normalización exhaustiva: acepta strings, tipos en español o inglés, y garantiza subcategories: []
  const normalizedCategories = useMemo(() => {
    let source = Array.isArray(categories) && categories.length > 0 ? categories : [];
    if (source.length === 0) {
      try {
        const local = localStorage.getItem('app_categories') || localStorage.getItem('presu_categories') || localStorage.getItem('categories');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) source = parsed;
        }
      } catch {}
    }
    if (source.length === 0) {
      source = DEFAULT_CATEGORIES;
    }

    return source.map((cat, idx) => {
      // Si la categoría viene como string simple (formato legacy)
      if (typeof cat === 'string') {
        const lower = cat.toLowerCase().trim();
        const isIncome = lower.includes('ingreso') || lower.includes('salario') || lower.includes('sueldo');
        return {
          id: `cat-${idx}-${cat.replace(/\s+/g, '-').toLowerCase()}`,
          name: cat.trim(),
          type: isIncome ? 'income' : 'expense',
          color: isIncome ? '#34C759' : '#FF9500',
          icon: isIncome ? '💰' : '📦',
          subcategories: []
        };
      }

      if (!cat || typeof cat !== 'object') return null;

      // Normalizar type: 'expense' | 'income' (acepta gasto, egreso, expense / ingreso, income)
      const rawType = String(cat.type || '').toLowerCase().trim();
      let type = 'expense';
      if (
        rawType === 'income' || 
        rawType === 'ingreso' || 
        rawType === 'ingresos' ||
        String(cat.name || '').toLowerCase().includes('ingreso') ||
        String(cat.name || '').toLowerCase().includes('salario')
      ) {
        type = 'income';
      }

      // Normalizar arreglo de subcategorías garantizado
      let subcategories = [];
      if (Array.isArray(cat.subcategories)) {
        subcategories = cat.subcategories.map((sub, sIdx) => {
          if (typeof sub === 'string') {
            return { id: `sub-${cat.id || idx}-${sIdx}`, name: sub.trim() };
          }
          if (sub && typeof sub === 'object') {
            return {
              id: sub.id || `sub-${cat.id || idx}-${sIdx}`,
              name: (sub.name || '').trim() || String(sub),
              color: sub.color
            };
          }
          return null;
        }).filter(Boolean);
      }

      return {
        ...cat,
        id: cat.id || `cat-${idx}-${(cat.name || 'item').replace(/\s+/g, '-').toLowerCase()}`,
        name: (cat.name || 'Sin nombre').trim(),
        type,
        color: cat.color || (type === 'income' ? '#34C759' : '#FF9500'),
        icon: cat.icon || (type === 'income' ? '💰' : '🍔'),
        subcategories
      };
    }).filter(Boolean);
  }, [categories]);

  const expenseCategories = normalizedCategories.filter(c => c.type === 'expense');
  const incomeCategories = normalizedCategories.filter(c => c.type === 'income');
  const currentList = activeTab === 'expense' ? expenseCategories : incomeCategories;

  // Auto-seleccionar la pestaña con elementos si al inicio una de ellas está vacía
  useEffect(() => {
    if (activeTab === 'expense' && expenseCategories.length === 0 && incomeCategories.length > 0) {
      setActiveTab('income');
    }
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Encabezado con Botón + Circular */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          {!hideBackButton && (onBack || fromSettings) && (
            <button
              type="button"
              onClick={handleGoBack}
              className="p-2 rounded-xl border opacity-75 hover:opacity-100 active:scale-90 transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              title="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            {!hideBackButton && (
              <h2 className="text-[17px] sm:text-[18px] font-bold truncate leading-tight" style={{ color: 'var(--text-main)' }}>
                Mis Categorías
              </h2>
            )}
            <p className="text-[12px] text-slate-500 dark:text-slate-400 font-normal truncate">
              Organiza tus rubros de gastos e ingresos
            </p>
          </div>
        </div>

        {/* Botón Circular + para Crear Categoría */}
        <button
          type="button"
          onClick={() => handleOpenAddModal(activeTab)}
          className="w-9 h-9 bg-[#34C759] hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
          title="Nueva Categoría"
        >
          <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Pestañas Segmentadas: Gastos vs Ingresos */}
      <div className="ios-segmented w-full p-1 rounded-2xl flex">
        <button
          type="button"
          onClick={() => setActiveTab('expense')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'expense'
              ? 'bg-[#FF3B30] text-white shadow-xs font-bold'
              : 'opacity-60 hover:opacity-100'
          }`}
          style={{
            backgroundColor: activeTab === 'expense' ? undefined : 'transparent',
            color: activeTab === 'expense' ? '#FFFFFF' : 'var(--text-main)'
          }}
        >
          <span className="w-2 h-2 rounded-full bg-white opacity-80" />
          <span>Gastos ({expenseCategories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('income')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'income'
              ? 'bg-[#34C759] text-white shadow-xs font-bold'
              : 'opacity-60 hover:opacity-100'
          }`}
          style={{
            backgroundColor: activeTab === 'income' ? undefined : 'transparent',
            color: activeTab === 'income' ? '#FFFFFF' : 'var(--text-main)'
          }}
        >
          <span className="w-2 h-2 rounded-full bg-white opacity-80" />
          <span>Ingresos ({incomeCategories.length})</span>
        </button>
      </div>

      {/* Listado de Categorías */}
      <div className="space-y-2.5">
        {currentList.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border" style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}>
            <Tag className="w-8 h-8 opacity-30 mx-auto mb-2" />
            <p className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>No hay categorías de {activeTab === 'expense' ? 'gastos' : 'ingresos'} aún</p>
            <button
              type="button"
              onClick={() => handleOpenAddModal(activeTab)}
              className="mt-3 px-3 py-1.5 rounded-xl bg-[#34C759] text-white text-xs font-bold active:scale-95 cursor-pointer"
            >
              Crear primera categoría
            </button>
          </div>
        ) : (
          currentList.map((cat) => {
            const subcats = cat.subcategories || [];
            const isAddingSub = activeSubInputCatId === cat.id;
            const isExpanded = !!expandedCategories[cat.id];

            return (
              <div 
                key={cat.id} 
                className="rounded-2xl border transition-all overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}
              >
                {/* Cabecera de Categoría: Icono Circular + Nombre + Acciones */}
                <div 
                  className="p-3 sm:p-3.5 flex items-center justify-between cursor-pointer active:opacity-80 select-none gap-2"
                  onClick={() => toggleCategory(cat.id)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Icono Squircle con Color Personalizado y Emoji Nativo */}
                    <CategoryIcon 
                      icon={cat.icon} 
                      category={cat} 
                      color={cat.color || '#FF9500'} 
                      size="md" 
                      withBadge={true} 
                    />

                    <div className="min-w-0 flex-1">
                      <span className="text-[14px] sm:text-[15px] font-bold truncate block leading-tight" style={{ color: 'var(--text-main)' }}>
                        {cat.name}
                      </span>
                      <span className="text-[11px] opacity-60 font-normal block mt-0.5">
                        {subcats.length === 0 ? 'Sin subcategorías' : `${subcats.length} subcategoría${subcats.length === 1 ? '' : 's'}`}
                      </span>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditCategory(cat)}
                      title="Editar categoría"
                      className="p-2 opacity-50 hover:opacity-100 hover:text-[#007AFF] rounded-xl transition-colors active:scale-90 cursor-pointer"
                      style={{ color: 'var(--text-main)' }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {currentList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de eliminar la categoría "${cat.name}"?`)) {
                            onDeleteCategory(cat.id);
                          }
                        }}
                        title="Eliminar categoría"
                        className="p-2 opacity-50 hover:opacity-100 hover:text-rose-500 rounded-xl transition-colors active:scale-90 cursor-pointer"
                        style={{ color: 'var(--text-main)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      title={isExpanded ? 'Contraer' : 'Expandir subcategorías'}
                      className="p-2 opacity-60 hover:opacity-100 rounded-xl transition-transform active:scale-90 cursor-pointer"
                      style={{ color: 'var(--text-main)' }}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-[#34C759]" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Desplegable de Subcategorías */}
                {isExpanded && (
                  <div 
                    className="px-3.5 pb-3.5 pt-2.5 border-t animate-slide-up space-y-2.5" 
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                        Subcategorías / Etiquetas de {cat.name}
                      </span>
                      {!isAddingSub && (
                        <button
                          type="button"
                          onClick={() => setActiveSubInputCatId(cat.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#34C759] hover:underline active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Añadir</span>
                        </button>
                      )}
                    </div>

                    {subcats.length === 0 ? (
                      <p className="text-[11px] opacity-50 py-1 italic">
                        Sin subcategorías aún. Toca "Añadir" para crear una.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {subcats.map((sub) => {
                          const isEditingThisSub = editingSubId === sub.id;

                          if (isEditingThisSub) {
                            return (
                              <div 
                                key={sub.id} 
                                className="flex flex-col gap-1.5 p-2 rounded-xl border border-[#34C759] w-full sm:w-auto"
                                style={{ backgroundColor: 'var(--bg-input)' }}
                              >
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editSubName}
                                    onChange={(e) => setEditSubName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveSubcategory(cat.id, sub.id);
                                      if (e.key === 'Escape') setEditingSubId(null);
                                    }}
                                    className="text-xs bg-transparent focus:outline-none flex-1 font-medium"
                                    style={{ color: 'var(--text-main)' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveSubcategory(cat.id, sub.id)}
                                    className="text-[#34C759] hover:opacity-80 p-1 cursor-pointer"
                                    title="Guardar"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSubId(null)}
                                    className="opacity-50 hover:opacity-100 p-1 cursor-pointer"
                                    style={{ color: 'var(--text-main)' }}
                                    title="Cancelar"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-1.5 pt-1 border-t" style={{ borderColor: 'var(--border-color)' }}>
                                  <span className="text-[10px] opacity-60">Color:</span>
                                  {PRESET_COLORS.slice(0, 6).map((c) => (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => setEditSubColor(c)}
                                      className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer ${editSubColor === c ? 'scale-125 ring-1 ring-[#34C759]' : 'opacity-80 hover:scale-110'}`}
                                      style={{ backgroundColor: c }}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <span 
                              key={sub.id}
                              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border shadow-2xs group/sub"
                              style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                            >
                              <span 
                                className="w-2 h-2 rounded-full shrink-0" 
                                style={{ backgroundColor: sub.color || cat.color || '#007AFF' }} 
                              />
                              <span className="truncate max-w-[120px]">{sub.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSubId(sub.id);
                                  setEditSubName(sub.name);
                                  setEditSubColor(sub.color || cat.color || '#007AFF');
                                }}
                                title="Editar etiqueta"
                                className="opacity-40 hover:opacity-100 hover:text-[#007AFF] transition-colors p-0.5 cursor-pointer"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`¿Eliminar la etiqueta "${sub.name}"?`)) {
                                    onDeleteSubcategory(cat.id, sub.id);
                                  }
                                }}
                                title="Eliminar etiqueta"
                                className="opacity-40 hover:opacity-100 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Input rápido para añadir subcategoría */}
                    {isAddingSub && (
                      <div className="pt-2 border-t flex items-center gap-1.5 animate-slide-up" style={{ borderColor: 'var(--border-color)' }}>
                        <CornerDownRight className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Nueva subcategoría..."
                          value={subInputs[cat.id] || ''}
                          onChange={(e) => setSubInputs({ ...subInputs, [cat.id]: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAddSub(cat.id); }}
                          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#34C759]"
                          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleQuickAddSub(cat.id)}
                          className="px-2.5 py-1.5 text-xs font-bold bg-[#34C759] text-white rounded-lg hover:bg-emerald-600 active:scale-95 cursor-pointer"
                        >
                          Añadir
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSubInputCatId(null)}
                          className="p-1.5 opacity-60 hover:opacity-100 rounded-lg cursor-pointer"
                          style={{ color: 'var(--text-main)' }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL PARA CREAR NUEVA CATEGORÍA */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 animate-fadeIn">
          <div 
            className="rounded-t-[28px] sm:rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border animate-slide-up pb-safe max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          >
            <div className="w-10 h-1 bg-slate-400/40 rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <CategoryIcon 
                  icon={newCatIcon} 
                  color={newCatColor} 
                  size="md" 
                  withBadge={true} 
                />
                <div>
                  <h3 className="text-base font-bold">Crear Categoría</h3>
                  <p className="text-[11px] opacity-60">Personaliza nombre, icono y color</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCategory(false)}
                className="opacity-60 hover:opacity-100 text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: 'var(--bg-card-sub)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold opacity-70 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Mascotas, Inversiones, Mercado..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-[#34C759]"
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold opacity-70 mb-1">Tipo</label>
                  <select
                    value={newCatType}
                    onChange={(e) => setNewCatType(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-[#34C759]"
                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                  >
                    <option value="expense">Gasto</option>
                    <option value="income">Ingreso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold opacity-70 mb-1">Icono / Emoji</label>
                  <button
                    type="button"
                    onClick={() => {
                      setEmojiPickerTarget('new');
                      setShowEmojiPicker(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-transparent hover:border-emerald-500/40 transition-all cursor-pointer group"
                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon icon={newCatIcon} color={newCatColor} size="sm" withBadge={true} />
                      <span className="text-xs font-semibold">Elegir emoji</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                      Cambiar
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold opacity-70 mb-1.5">Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewCatColor(col)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${newCatColor === col ? 'scale-125 ring-2 ring-[#34C759] ring-offset-2' : 'hover:scale-110'}`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold opacity-70 mb-1">
                  Subcategorías Iniciales (separadas por comas, opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej: Alimento, Veterinario, Medicamentos"
                  value={newCatInitialSub}
                  onChange={(e) => setNewCatInitialSub(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-[#34C759]"
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-card-sub)', color: 'var(--text-main)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#34C759] hover:bg-emerald-600 text-white rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Crear Categoría</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA EDITAR CATEGORÍA */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 animate-fadeIn">
          <div 
            className="rounded-t-[28px] sm:rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border animate-slide-up pb-safe max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          >
            <div className="w-10 h-1 bg-slate-400/40 rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <CategoryIcon 
                  icon={editCatIcon} 
                  color={editCatColor} 
                  size="md" 
                  withBadge={true} 
                />
                <div>
                  <h3 className="text-base font-bold">Editar Categoría</h3>
                  <p className="text-[11px] opacity-60">Modifica nombre, icono o color</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="opacity-60 hover:opacity-100 text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: 'var(--bg-card-sub)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditCategory} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold opacity-70 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="w-full text-sm font-bold px-3.5 py-2.5 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-[#34C759]"
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold opacity-70 mb-1">Tipo</label>
                  <select
                    value={editCatType}
                    onChange={(e) => setEditCatType(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-[#34C759]"
                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                  >
                    <option value="expense">Gasto</option>
                    <option value="income">Ingreso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold opacity-70 mb-1">Icono / Emoji</label>
                  <button
                    type="button"
                    onClick={() => {
                      setEmojiPickerTarget('edit');
                      setShowEmojiPicker(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-transparent hover:border-emerald-500/40 transition-all cursor-pointer group"
                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon icon={editCatIcon} color={editCatColor} size="sm" withBadge={true} />
                      <span className="text-xs font-semibold">Elegir emoji</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                      Cambiar
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold opacity-70 mb-1.5">Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setEditCatColor(col)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${editCatColor === col ? 'scale-125 ring-2 ring-[#34C759] ring-offset-2' : 'hover:scale-110'}`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                {currentList.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`¿Estás seguro de eliminar la categoría "${editingCategory.name}"?`)) {
                        onDeleteCategory(editingCategory.id);
                        setEditingCategory(null);
                      }
                    }}
                    className="px-3 py-2 text-xs font-semibold text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-card-sub)', color: 'var(--text-main)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-[#34C759] hover:bg-emerald-600 text-white rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SELECTOR DE EMOJIS ESTILO WHATSAPP */}
      <EmojiPickerModal
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        selectedEmoji={emojiPickerTarget === 'edit' ? editCatIcon : newCatIcon}
        onSelectEmoji={(emoji) => {
          if (emojiPickerTarget === 'edit') {
            setEditCatIcon(emoji);
          } else {
            setNewCatIcon(emoji);
          }
        }}
      />
    </div>
  );
}
