import React, { useState, useEffect } from 'react';
import { PRESET_COLORS } from '../../categories/constants';
import CategoryIcon, { AVAILABLE_ICONS } from '../../categories/components/CategoryIcon';

export default function CategoryModal({ isOpen, onClose, onSave, category = null }) {
  const [formData, setFormData] = useState({
    name: '', type: 'expense', icon: '🍔', color: '#10B981', subcategories: []
  });
  const [subInput, setSubInput] = useState('');

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        type: category.type || 'expense',
        icon: category.icon || (category.type === 'income' ? '💰' : '🍔'),
        color: category.color || (category.type === 'income' ? '#34C759' : '#10B981'),
        subcategories: Array.isArray(category.subcategories) ? [...category.subcategories] : []
      });
    } else {
      setFormData({ name: '', type: 'expense', icon: '🍔', color: '#10B981', subcategories: [] });
    }
    setSubInput('');
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleAddSub = (e) => {
    e?.preventDefault?.();
    const trimmed = subInput.trim();
    if (trimmed && !formData.subcategories.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, subcategories: [...prev.subcategories, trimmed] }));
      setSubInput('');
    }
  };

  const handleRemoveSub = (sub) => {
    setFormData((prev) => ({ ...prev, subcategories: prev.subcategories.filter((s) => s !== sub) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave?.({ ...formData, name: formData.name.trim(), id: category?.id });
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 animate-fadeIn p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/[0.08] shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CategoryIcon icon={formData.icon} color={formData.color} size="md" withBadge={true} />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">{category ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">Personaliza icono, color y detalles</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 flex items-center justify-center text-sm cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-xl gap-1">
            {['expense', 'income'].map((t) => (
              <button key={t} type="button" onClick={() => setFormData((p) => ({ ...p, type: t }))}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${formData.type === t ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500 dark:text-zinc-400'}`}>
                {t === 'expense' ? 'Gasto' : 'Ingreso'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">Nombre *</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ej. Restaurantes, Gimnasio..." className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">Icono</label>
            <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-white/[0.06] max-h-28 overflow-y-auto">
              {(AVAILABLE_ICONS || []).slice(0, 24).map((ico) => (
                <button key={ico} type="button" onClick={() => setFormData((p) => ({ ...p, icon: ico }))}
                  className={`h-8 rounded-lg flex items-center justify-center text-base hover:scale-110 transition-transform ${formData.icon === ico ? 'bg-emerald-500/20 ring-1 ring-emerald-500' : ''}`}>{ico}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">Color</label>
            <div className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-white/[0.06]">
              {PRESET_COLORS.map((col) => (
                <button key={col} type="button" onClick={() => setFormData((p) => ({ ...p, color: col }))} style={{ backgroundColor: col }}
                  className={`w-6 h-6 rounded-full transition-transform ${formData.color === col ? 'scale-125 ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-zinc-900' : 'hover:scale-110'}`} />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">Subcategorías (opcional)</label>
            <div className="flex gap-2">
              <input type="text" value={subInput} onChange={(e) => setSubInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSub())}
                placeholder="Añadir subcategoría y presionar Enter" className="flex-1 h-10 px-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60" />
              <button type="button" onClick={handleAddSub} className="h-10 px-3 rounded-xl bg-slate-200 dark:bg-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-300 dark:hover:bg-zinc-600">Añadir</button>
            </div>
            {formData.subcategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.subcategories.map((sub) => (
                  <span key={sub} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium border border-emerald-200/60 dark:border-emerald-800/30">
                    {sub}<button type="button" onClick={() => handleRemoveSub(sub)} className="hover:text-rose-500 ml-1">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <button type="button" onClick={onClose} className="h-11 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer">Cancelar</button>
            <button type="submit" className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold active:scale-95 transition-all shadow-sm cursor-pointer">Guardar Categoría</button>
          </div>
        </form>
      </div>
    </div>
  );
}
