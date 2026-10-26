import React from 'react';
import { Check } from 'lucide-react';
import CategoryIcon from '../components/CategoryIcon';
import { PRESET_COLORS } from '../constants';

export default function AddCategoryModal({
  isOpen,
  onClose,
  newCatName,
  setNewCatName,
  newCatType,
  setNewCatType,
  newCatColor,
  setNewCatColor,
  newCatIcon,
  setNewCatIcon,
  newCatInitialSub,
  setNewCatInitialSub,
  onSubmit,
  onOpenEmojiPicker
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 animate-fadeIn">
      <div 
        className="rounded-t-[28px] sm:rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border border-white/70 dark:border-white/[0.08] bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl text-slate-900 dark:text-white animate-slide-up pb-safe max-h-[90vh] overflow-y-auto"
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
              <h3 className="text-base font-bold">Crear categoría</h3>
              <p className="text-[11px] opacity-60">Personaliza nombre, icono y color</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="opacity-60 hover:opacity-100 text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center bg-white/60 dark:bg-white/10 text-slate-600 dark:text-zinc-300 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold opacity-70 mb-1">Nombre *</label>
            <input
              type="text"
              required
              placeholder="ej: Mascotas, Inversiones, Mercado..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-white/[0.05] border border-white/80 dark:border-white/[0.08] backdrop-blur-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#34C759]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold opacity-70 mb-1">Tipo</label>
              <select
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl bg-white/70 dark:bg-white/[0.05] border border-white/80 dark:border-white/[0.08] backdrop-blur-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#34C759]"
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold opacity-70 mb-1">Icono / Emoji</label>
              <button
                type="button"
                onClick={onOpenEmojiPicker}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/70 dark:bg-white/[0.05] border border-white/80 dark:border-white/[0.08] backdrop-blur-sm text-slate-900 dark:text-white hover:border-emerald-500/40 transition-all cursor-pointer group"
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
              Subcategorías iniciales (separadas por comas, opcional)
            </label>
            <input
              type="text"
              placeholder="ej: Alimento, Veterinario, Medicamentos"
              value={newCatInitialSub}
              onChange={(e) => setNewCatInitialSub(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl bg-white/70 dark:bg-white/[0.05] border border-white/80 dark:border-white/[0.08] backdrop-blur-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#34C759]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/60 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/50 dark:bg-white/[0.06] text-slate-700 dark:text-zinc-200 hover:bg-white/80 dark:hover:bg-white/[0.12] border border-white/70 dark:border-white/[0.08] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-[#34C759] hover:bg-emerald-600 text-white rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Crear categoría</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
