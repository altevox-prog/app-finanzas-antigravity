import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Plus, Tag } from 'lucide-react';
import EmojiPickerModal from '../common/EmojiPickerModal';
import SegmentedControl from '../common/SegmentedControl';
import { DEFAULT_CATEGORIES } from '../../data/initialData';
import AddCategoryModal from './modals/AddCategoryModal';
import EditCategoryModal from './modals/EditCategoryModal';
import CategoryCard from './components/CategoryCard';

export default function CategoriesView({
  categories = [], onAddCategory, onUpdateCategory, onDeleteCategory,
  onAddSubcategory, onUpdateSubcategory, onDeleteSubcategory,
  onBack, fromSettings = false, previousView, hideBackButton = false
}) {
  const [activeTab, setActiveTab] = useState('expense');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState('new');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', type: 'expense', color: '#FF9500', icon: '🍔', initialSub: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCat, setEditCat] = useState({ name: '', type: 'expense', color: '#FF9500', icon: '🍔' });
  const [editingSubId, setEditingSubId] = useState(null);
  const [editSub, setEditSub] = useState({ name: '', color: '#007AFF' });
  const [subInputs, setSubInputs] = useState({});
  const [activeSubInputCatId, setActiveSubInputCatId] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});

  const handleGoBack = () => (onBack ? onBack() : (typeof window !== 'undefined' && window.history.length > 2 && window.history.back()));
  const toggleCategory = (catId) => setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));

  const handleOpenAddModal = (defaultType = activeTab) => {
    setNewCat({ name: '', type: defaultType, color: defaultType === 'income' ? '#34C759' : '#FF9500', icon: defaultType === 'income' ? '💰' : '🍔', initialSub: '' });
    setShowAddCategory(true);
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCat.name.trim()) return;
    const initialSubs = newCat.initialSub.trim() ? newCat.initialSub.split(',').map((s, idx) => ({ id: `sub-${Date.now()}-${idx}`, name: s.trim() })).filter((s) => s.name) : [];
    onAddCategory?.({ id: `cat-${Date.now()}`, name: newCat.name.trim(), type: newCat.type, color: newCat.color, icon: newCat.icon, subcategories: initialSubs });
    setShowAddCategory(false);
  };

  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat);
    setEditCat({ name: cat.name, type: cat.type, color: cat.color || '#FF9500', icon: cat.icon || (cat.type === 'income' ? '💰' : '🍔') });
  };

  const handleSaveEditCategory = (e) => {
    e.preventDefault();
    if (!editingCategory || !editCat.name.trim()) return;
    onUpdateCategory?.({ ...editingCategory, name: editCat.name.trim(), type: editCat.type, color: editCat.color, icon: editCat.icon });
    setEditingCategory(null);
  };

  const handleSaveSubcategory = (catId, subId) => {
    if (editSub.name.trim() && onUpdateSubcategory) onUpdateSubcategory(catId, subId, editSub.name.trim(), editSub.color);
    setEditingSubId(null);
  };

  const handleQuickAddSub = (catId) => {
    const val = (subInputs[catId] || '').trim();
    if (val && onAddSubcategory) onAddSubcategory(catId, val);
    setSubInputs((prev) => ({ ...prev, [catId]: '' }));
    setActiveSubInputCatId(null);
  };

  const normalizedCategories = useMemo(() => {
    let source = Array.isArray(categories) && categories.length > 0 ? categories : [];
    if (source.length === 0) {
      try {
        const local = localStorage.getItem('app_categories') || localStorage.getItem('presu_categories') || localStorage.getItem('categories');
        if (local) { const p = JSON.parse(local); if (Array.isArray(p) && p.length > 0) source = p; }
      } catch {}
    }
    if (source.length === 0) source = DEFAULT_CATEGORIES;

    return source.map((cat, idx) => {
      if (typeof cat === 'string') {
        const isInc = /ingreso|salario|sueldo/i.test(cat);
        return { id: `cat-${idx}-${cat.replace(/\s+/g, '-').toLowerCase()}`, name: cat.trim(), type: isInc ? 'income' : 'expense', color: isInc ? '#34C759' : '#FF9500', icon: isInc ? '💰' : '📦', subcategories: [] };
      }
      if (!cat || typeof cat !== 'object') return null;
      const isInc = ['income', 'ingreso', 'ingresos'].includes(String(cat.type || '').toLowerCase().trim()) || /ingreso|salario/i.test(cat.name || '');
      const type = isInc ? 'income' : 'expense';
      const subcategories = Array.isArray(cat.subcategories) ? cat.subcategories.map((sub, sIdx) => (typeof sub === 'string' ? { id: `sub-${cat.id || idx}-${sIdx}`, name: sub.trim() } : sub && typeof sub === 'object' ? { id: sub.id || `sub-${cat.id || idx}-${sIdx}`, name: (sub.name || '').trim() || String(sub), color: sub.color } : null)).filter(Boolean) : [];
      return { ...cat, id: cat.id || `cat-${idx}-${(cat.name || 'item').replace(/\s+/g, '-').toLowerCase()}`, name: (cat.name || 'Sin nombre').trim(), type, color: cat.color || (type === 'income' ? '#34C759' : '#FF9500'), icon: cat.icon || (type === 'income' ? '💰' : '🍔'), subcategories };
    }).filter(Boolean);
  }, [categories]);

  const expenseCategories = useMemo(() => normalizedCategories.filter((c) => c.type === 'expense'), [normalizedCategories]);
  const incomeCategories = useMemo(() => normalizedCategories.filter((c) => c.type === 'income'), [normalizedCategories]);
  const currentList = activeTab === 'expense' ? expenseCategories : incomeCategories;

  useEffect(() => {
    if (activeTab === 'expense' && expenseCategories.length === 0 && incomeCategories.length > 0) setActiveTab('income');
  }, [activeTab, expenseCategories.length, incomeCategories.length]);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5 min-w-0">
          {!hideBackButton && (onBack || fromSettings) && (
            <button type="button" onClick={handleGoBack} className="p-2 rounded-xl border border-white/80 dark:border-white/[0.08] bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md text-slate-800 dark:text-zinc-100 hover:bg-white/90 active:scale-90 transition-all cursor-pointer shadow-xs" title="Volver">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            {!hideBackButton && <h2 className="text-[17px] sm:text-[18px] font-bold truncate leading-tight text-slate-900 dark:text-white">Mis Categorías</h2>}
            <p className="text-[12px] text-slate-700 dark:text-zinc-300 font-medium truncate">Organiza tus rubros de gastos e ingresos</p>
          </div>
        </div>
        <button type="button" onClick={() => handleOpenAddModal(activeTab)} className="w-9 h-9 bg-[#34C759] hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer" title="Nueva Categoría">
          <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
        </button>
      </div>

      <div className="mb-4">
        <SegmentedControl options={[{ id: 'expense', label: `Gastos (${expenseCategories.length})` }, { id: 'income', label: `Ingresos (${incomeCategories.length})` }]} value={activeTab} onChange={setActiveTab} size="md" />
      </div>

      <div className="space-y-2.5">
        {currentList.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border-white/60 dark:border-white/[0.08] shadow-xs">
            <Tag className="w-8 h-8 opacity-30 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200">No hay categorías de {activeTab === 'expense' ? 'gastos' : 'ingresos'} aún</p>
            <button type="button" onClick={() => handleOpenAddModal(activeTab)} className="mt-3 px-3 py-1.5 rounded-xl bg-[#34C759] text-white text-xs font-bold active:scale-95 cursor-pointer">Crear primera categoría</button>
          </div>
        ) : (
          currentList.map((cat) => (
            <CategoryCard
              key={cat.id} category={cat} isExpanded={!!expandedCategories[cat.id]} onToggleExpand={() => toggleCategory(cat.id)}
              onEditCategory={handleOpenEditCategory} onDeleteCategory={onDeleteCategory} canDeleteCategory={currentList.length > 1}
              subInput={subInputs[cat.id] || ''} setSubInput={(val) => setSubInputs((prev) => ({ ...prev, [cat.id]: val }))}
              isActiveSubInput={activeSubInputCatId === cat.id} onOpenSubInput={() => setActiveSubInputCatId(cat.id)}
              onCloseSubInput={() => setActiveSubInputCatId(null)} onSubmitSubcategory={handleQuickAddSub}
              editingSubId={editingSubId} editSubName={editSub.name} setEditSubName={(name) => setEditSub((p) => ({ ...p, name }))}
              editSubColor={editSub.color} setEditSubColor={(color) => setEditSub((p) => ({ ...p, color }))}
              onStartEditSub={(sub) => { setEditingSubId(sub.id); setEditSub({ name: sub.name, color: sub.color || cat.color || '#007AFF' }); }}
              onCancelEditSub={() => setEditingSubId(null)} onSaveEditSub={handleSaveSubcategory} onDeleteSubcategory={onDeleteSubcategory}
            />
          ))
        )}
      </div>

      <AddCategoryModal
        isOpen={showAddCategory} onClose={() => setShowAddCategory(false)}
        newCatName={newCat.name} setNewCatName={(name) => setNewCat((p) => ({ ...p, name }))}
        newCatType={newCat.type} setNewCatType={(type) => setNewCat((p) => ({ ...p, type }))}
        newCatColor={newCat.color} setNewCatColor={(color) => setNewCat((p) => ({ ...p, color }))}
        newCatIcon={newCat.icon} setNewCatIcon={(icon) => setNewCat((p) => ({ ...p, icon }))}
        newCatInitialSub={newCat.initialSub} setNewCatInitialSub={(initialSub) => setNewCat((p) => ({ ...p, initialSub }))}
        onSubmit={handleCreateCategory} onOpenEmojiPicker={() => { setEmojiPickerTarget('new'); setShowEmojiPicker(true); }}
      />
      <EditCategoryModal
        isOpen={Boolean(editingCategory)} editingCategory={editingCategory} onClose={() => setEditingCategory(null)}
        editCatName={editCat.name} setEditCatName={(name) => setEditCat((p) => ({ ...p, name }))}
        editCatType={editCat.type} setNewCatType={(type) => setEditCat((p) => ({ ...p, type }))}
        editCatColor={editCat.color} setEditCatColor={(color) => setEditCat((p) => ({ ...p, color }))}
        editCatIcon={editCat.icon} setEditCatIcon={(icon) => setEditCat((p) => ({ ...p, icon }))}
        onSubmit={handleSaveEditCategory} onOpenEmojiPicker={() => { setEmojiPickerTarget('edit'); setShowEmojiPicker(true); }}
        onDeleteCategory={onDeleteCategory} canDelete={currentList.length > 1}
      />
      <EmojiPickerModal
        isOpen={showEmojiPicker} onClose={() => setShowEmojiPicker(false)}
        selectedEmoji={emojiPickerTarget === 'edit' ? editCat.icon : newCat.icon}
        onSelectEmoji={(e) => (emojiPickerTarget === 'edit' ? setEditCat((p) => ({ ...p, icon: e })) : setNewCat((p) => ({ ...p, icon: e })))} />
    </div>
  );
}
