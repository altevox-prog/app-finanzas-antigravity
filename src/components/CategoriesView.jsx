import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Tag 
} from 'lucide-react';
import CategoryIcon, { DynamicIcon, AVAILABLE_ICONS } from './CategoryIcon';
import EmojiPickerModal from './EmojiPickerModal';
import SegmentedControl from './common/SegmentedControl';
import { DEFAULT_CATEGORIES } from '../data/initialData';
import { PRESET_COLORS } from './categories/constants';
import AddCategoryModal from './categories/modals/AddCategoryModal';
import EditCategoryModal from './categories/modals/EditCategoryModal';
import CategoryCard from './categories/components/CategoryCard';

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
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5 min-w-0">
          {!hideBackButton && (onBack || fromSettings) && (
            <button
              type="button"
              onClick={handleGoBack}
              className="p-2 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 opacity-75 hover:opacity-100 active:scale-90 transition-all cursor-pointer"
              title="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            {!hideBackButton && (
              <h2 className="text-[17px] sm:text-[18px] font-bold truncate leading-tight text-slate-900 dark:text-white">
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
          className="w-9 h-9 bg-[#34C759] hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
          title="Nueva Categoría"
        >
          <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Pestañas Segmentadas: Gastos vs Ingresos */}
      <div className="mb-4">
        <SegmentedControl
          options={[
            { id: 'expense', label: `Gastos (${expenseCategories.length})` },
            { id: 'income', label: `Ingresos (${incomeCategories.length})` }
          ]}
          value={activeTab}
          onChange={setActiveTab}
          size="md"
        />
      </div>

      {/* Listado de Categorías */}
      <div className="space-y-2.5">
        {currentList.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border bg-white dark:bg-zinc-900/90 border-slate-200/80 dark:border-white/[0.08]">
            <Tag className="w-8 h-8 opacity-30 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200">No hay categorías de {activeTab === 'expense' ? 'gastos' : 'ingresos'} aún</p>
            <button
              type="button"
              onClick={() => handleOpenAddModal(activeTab)}
              className="mt-3 px-3 py-1.5 rounded-xl bg-[#34C759] text-white text-xs font-bold active:scale-95 cursor-pointer"
            >
              Crear primera categoría
            </button>
          </div>
        ) : (
          currentList.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              isExpanded={!!expandedCategories[cat.id]}
              onToggleExpand={() => toggleCategory(cat.id)}
              onEditCategory={handleOpenEditCategory}
              onDeleteCategory={onDeleteCategory}
              canDeleteCategory={currentList.length > 1}
              // Subcategorías
              subInput={subInputs[cat.id] || ''}
              setSubInput={(val) => setSubInputs(prev => ({ ...prev, [cat.id]: val }))}
              isActiveSubInput={activeSubInputCatId === cat.id}
              onOpenSubInput={() => setActiveSubInputCatId(cat.id)}
              onCloseSubInput={() => setActiveSubInputCatId(null)}
              onSubmitSubcategory={handleQuickAddSub}
              editingSubId={editingSubId}
              editSubName={editSubName}
              setEditSubName={setEditSubName}
              editSubColor={editSubColor}
              setEditSubColor={setEditSubColor}
              onStartEditSub={(sub) => {
                setEditingSubId(sub.id);
                setEditSubName(sub.name);
                setEditSubColor(sub.color || cat.color || '#007AFF');
              }}
              onCancelEditSub={() => setEditingSubId(null)}
              onSaveEditSub={handleSaveSubcategory}
              onDeleteSubcategory={onDeleteSubcategory}
            />
          ))
        )}
      </div>

      {/* MODAL PARA CREAR NUEVA CATEGORÍA */}
      <AddCategoryModal
        isOpen={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        newCatName={newCatName}
        setNewCatName={setNewCatName}
        newCatType={newCatType}
        setNewCatType={setNewCatType}
        newCatColor={newCatColor}
        setNewCatColor={setNewCatColor}
        newCatIcon={newCatIcon}
        setNewCatIcon={setNewCatIcon}
        newCatInitialSub={newCatInitialSub}
        setNewCatInitialSub={setNewCatInitialSub}
        onSubmit={handleCreateCategory}
        onOpenEmojiPicker={() => {
          setEmojiPickerTarget('new');
          setShowEmojiPicker(true);
        }}
      />

      {/* MODAL PARA EDITAR CATEGORÍA */}
      <EditCategoryModal
        isOpen={Boolean(editingCategory)}
        editingCategory={editingCategory}
        onClose={() => setEditingCategory(null)}
        editCatName={editCatName}
        setEditCatName={setEditCatName}
        editCatType={editCatType}
        setEditCatType={setEditCatType}
        editCatColor={editCatColor}
        setEditCatColor={setEditCatColor}
        editCatIcon={editCatIcon}
        setEditCatIcon={setEditCatIcon}
        onSubmit={handleSaveEditCategory}
        onOpenEmojiPicker={() => {
          setEmojiPickerTarget('edit');
          setShowEmojiPicker(true);
        }}
        onDeleteCategory={onDeleteCategory}
        canDelete={currentList.length > 1}
      />

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
