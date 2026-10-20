import React, { useState, useEffect } from 'react';
import { 
  X, ChevronUp, ChevronDown, EyeOff, RotateCcw, Check, GripVertical, Plus, 
  Wallet, CreditCard, BarChart3, Receipt, Target, SlidersHorizontal, Landmark, 
  TrendingUp, HandCoins, DollarSign, CalendarSync, Calendar, ArrowDownRight, 
  ArrowUpRight, PiggyBank, Activity, PieChart 
} from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { useAuth } from '../../../context/AuthContext';
import { getStoredWidgetsConfig, saveStoredWidgetsConfig, DEFAULT_WIDGETS_CONFIG, normalizeWidgetId } from '../../../utils/widgetsConfig';

const ICON_MAP = { Landmark, TrendingUp, HandCoins, Wallet, ArrowDownRight, ArrowUpRight, PiggyBank, Activity, PieChart, CreditCard, Receipt, CalendarSync, BarChart3, Calendar, Target, DollarSign };

export default function EditWidgetsModal({ isOpen, onClose, widgetsConfig, widgets, onSave, onReset }) {
  const { user } = useAuth();

  const ensureAllWidgets = (list) => {
    if (!Array.isArray(list)) return [...DEFAULT_WIDGETS_CONFIG];
    const validDefIds = new Set(DEFAULT_WIDGETS_CONFIG.map((dw) => dw.id));
    const filtered = list.filter((w) => {
      const norm = normalizeWidgetId(w.id);
      return norm !== 'liquid_balance' && norm !== 'my_accounts' && validDefIds.has(norm);
    });
    const existing = new Set(filtered.map((w) => normalizeWidgetId(w.id)));
    const merged = [...filtered];
    DEFAULT_WIDGETS_CONFIG.forEach((dw) => {
      if (!existing.has(normalizeWidgetId(dw.id))) merged.push({ ...dw, visible: false, hidden: true });
    });
    return merged;
  };

  const [currentWidgets, setCurrentWidgets] = useState(() => {
    const candidate = widgetsConfig || widgets;
    return ensureAllWidgets(Array.isArray(candidate) && candidate.length > 0 ? candidate : getStoredWidgetsConfig());
  });
  const [draggedIndex, setDraggedIndex] = useState(null);

  const persistWidgets = async (list) => {
    try {
      ['monety_widgets_order_v2', 'monety_widgets_config', 'presu_widget_order'].forEach((k) => localStorage.setItem(k, JSON.stringify(list)));
      await saveStoredWidgetsConfig(list, user?.id);
    } catch (err) { console.error('Error al persistir widgets:', err); }
  };

  const handleClose = () => {
    persistWidgets([...currentWidgets]);
    onSave?.([...currentWidgets]);
    onClose();
  };

  useBackHandler(isOpen, handleClose);

  useEffect(() => {
    if (isOpen) {
      const candidate = widgetsConfig || widgets;
      setCurrentWidgets(ensureAllWidgets(Array.isArray(candidate) && candidate.length > 0 ? candidate : getStoredWidgetsConfig()));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMove = (from, to) => {
    if (to < 0 || to >= currentWidgets.length) return;
    const updated = [...currentWidgets], [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    setCurrentWidgets(updated);
  };

  const handleToggleVisible = (id, forceVisible = null) => {
    const norm = normalizeWidgetId(id);
    setCurrentWidgets((prev) => {
      let updated = [], toggled = null;
      prev.forEach((w) => {
        if (w.id === id || normalizeWidgetId(w.id) === norm) {
          const nextVal = forceVisible !== null ? forceVisible : !w.visible;
          if (nextVal) toggled = { ...w, visible: true, hidden: false };
          else updated.push({ ...w, visible: false, hidden: true });
        } else updated.push(w);
      });
      return toggled ? [...updated, toggled] : updated;
    });
  };

  const handleResetDefaults = async () => {
    if (confirm('¿Restablecer el orden y visibilidad por defecto de los widgets?')) {
      const defCopy = [...DEFAULT_WIDGETS_CONFIG];
      await persistWidgets(defCopy);
      setCurrentWidgets(defCopy);
      onReset?.([...defCopy]);
      onSave?.([...defCopy]);
      onClose();
    }
  };

  const activeWidgets = currentWidgets.filter((w) => w.visible !== false && !w.hidden);
  const hiddenWidgets = currentWidgets.filter((w) => w.visible === false || w.hidden === true);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 animate-fadeIn" onClick={handleClose}>
      <div onClick={(e) => e.stopPropagation()} className="rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border animate-slide-up pb-safe max-h-[85vh] flex flex-col" style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
        <div className="w-10 h-1 bg-slate-400/40 rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold"><SlidersHorizontal className="w-4 h-4" /></div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Personalizar widgets</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{activeWidgets.length} de {currentWidgets.length} activos en Inicio</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all cursor-pointer" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1 py-1 touch-pan-y overscroll-contain">
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Widgets activos ({activeWidgets.length})</span>
              <span className="text-[10px] text-slate-400">Arrastra o usa las flechas para ordenar</span>
            </div>

            {activeWidgets.map((w, activeIdx) => {
              const IconComp = ICON_MAP[w.icon] || Wallet, isFirst = activeIdx === 0, isLast = activeIdx === activeWidgets.length - 1;
              const fullIndex = currentWidgets.findIndex((cw) => cw.id === w.id), isDragging = draggedIndex === fullIndex;

              return (
                <div
                  key={w.id} draggable
                  onDragStart={(e) => { setDraggedIndex(fullIndex); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={(e) => { e.preventDefault(); if (draggedIndex !== null && draggedIndex !== fullIndex) handleMove(draggedIndex, fullIndex); setDraggedIndex(null); }}
                  onDragEnd={() => setDraggedIndex(null)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 select-none touch-pan-y shadow-sm ${isDragging ? 'opacity-40 scale-[0.98] ring-2 ring-emerald-500' : ''}`}
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 opacity-40 shrink-0 text-slate-400" />
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/15 text-emerald-500"><IconComp className="w-4 h-4 text-emerald-500" /></div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] sm:text-[14px] font-bold truncate block" style={{ color: 'var(--text-main)' }}>{w.label || w.name}</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">{w.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5 p-0.5 rounded-xl" style={{ backgroundColor: 'var(--bg-input)' }}>
                      <button type="button" disabled={isFirst} onClick={() => { const prev = activeWidgets[activeIdx - 1]; if (prev) handleMove(fullIndex, currentWidgets.findIndex((c) => c.id === prev.id)); }} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isFirst ? 'opacity-20 cursor-not-allowed' : 'opacity-70 hover:opacity-100 hover:text-emerald-500 active:scale-90 cursor-pointer'}`} title="Subir widget"><ChevronUp className="w-4 h-4" /></button>
                      <button type="button" disabled={isLast} onClick={() => { const next = activeWidgets[activeIdx + 1]; if (next) handleMove(fullIndex, currentWidgets.findIndex((c) => c.id === next.id)); }} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isLast ? 'opacity-20 cursor-not-allowed' : 'opacity-70 hover:opacity-100 hover:text-emerald-500 active:scale-90 cursor-pointer'}`} title="Bajar widget"><ChevronDown className="w-4 h-4" /></button>
                    </div>
                    <button type="button" onClick={() => handleToggleVisible(w.id, false)} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer bg-slate-500/10 hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 border border-transparent hover:border-rose-500/20" title="Ocultar widget"><EyeOff className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-dashed border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5"><EyeOff className="w-3.5 h-3.5 text-slate-400" /><span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Widgets Ocultos ({hiddenWidgets.length})</span></div>
              <span className="text-[10px] text-slate-400">Toca "+ Mostrar" para reactivar</span>
            </div>

            {hiddenWidgets.length > 0 ? (
              <div className="space-y-2">
                {hiddenWidgets.map((hw) => {
                  const IconComp = ICON_MAP[hw.icon] || Wallet;
                  return (
                    <div key={hw.id} className="p-2.5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-between gap-2.5 transition-all select-none touch-pan-y" style={{ backgroundColor: 'var(--bg-card-sub)' }}>
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 opacity-60" style={{ backgroundColor: 'var(--bg-input)' }}><IconComp className="w-4 h-4 text-slate-400" /></div>
                        <div className="min-w-0 flex-1"><span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate block">{hw.label || hw.name}</span><p className="text-[10px] text-slate-400 font-normal truncate">{hw.description}</p></div>
                      </div>
                      <button type="button" onClick={() => handleToggleVisible(hw.id, true)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:text-white text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 border border-emerald-500/20" title={`Mostrar widget ${hw.label || hw.name}`}>
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" /><span>+ Mostrar</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 px-1 py-1">No hay ningún widget oculto. Todos los widgets están visibles en tu panel principal.</p>
            )}
          </div>
        </div>

        <div className="pt-4 border-t mt-3 flex items-center justify-between gap-3 shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <button type="button" onClick={handleResetDefaults} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 active:scale-95 transition-all cursor-pointer" title="Restablecer orden inicial"><RotateCcw className="w-3.5 h-3.5" /><span>Por defecto</span></button>
          <button type="button" onClick={handleClose} className="flex-1 max-w-[200px] py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"><Check className="w-4 h-4" /><span>Guardar cambios</span></button>
        </div>
      </div>
    </div>
  );
}
