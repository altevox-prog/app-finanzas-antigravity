import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Check, 
  GripVertical,
  Plus,
  Wallet,
  CreditCard,
  BarChart3,
  Receipt,
  Target,
  SlidersHorizontal,
  Landmark,
  TrendingUp,
  HandCoins,
  DollarSign,
  CalendarSync,
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Activity,
  PieChart
} from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { useAuth } from '../../../context/AuthContext';
import { 
  getStoredWidgetsConfig, 
  saveStoredWidgetsConfig, 
  DEFAULT_WIDGETS_CONFIG,
  normalizeWidgetId
} from '../../../utils/widgetsConfig';

const ICON_MAP = {
  Landmark,
  TrendingUp,
  HandCoins,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Activity,
  PieChart,
  CreditCard,
  Receipt,
  CalendarSync,
  BarChart3,
  Calendar,
  Target,
  DollarSign
};

export default function EditWidgetsModal({
  isOpen,
  onClose,
  widgetsConfig,
  widgets,
  onSave,
  onReset
}) {
  const { user } = useAuth();

  const handleClose = () => {
    const newList = [...currentWidgets];
    try {
      localStorage.setItem('monety_widgets_config', JSON.stringify(newList));
      saveStoredWidgetsConfig(newList, user?.id);
    } catch (err) {
      console.error('Error al persistir monety_widgets_config al cerrar:', err);
    }
    if (onSave) onSave(newList);
    onClose();
  };

  useBackHandler(isOpen, handleClose);

  const ensureAllWidgets = (list) => {
    if (!Array.isArray(list)) return [...DEFAULT_WIDGETS_CONFIG];
    const existingIds = new Set(list.map(w => normalizeWidgetId(w.id)));
    const merged = [...list];
    DEFAULT_WIDGETS_CONFIG.forEach(dw => {
      const norm = normalizeWidgetId(dw.id);
      if (!existingIds.has(norm)) {
        merged.push({ ...dw, visible: false, hidden: true });
      }
    });
    return merged;
  };

  const [currentWidgets, setCurrentWidgets] = useState(() => {
    const candidate = widgetsConfig || widgets;
    if (Array.isArray(candidate) && candidate.length > 0) return ensureAllWidgets(candidate);
    return ensureAllWidgets(getStoredWidgetsConfig());
  });
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Sync state ONLY when modal opens
  useEffect(() => {
    if (isOpen) {
      const candidate = widgetsConfig || widgets;
      if (Array.isArray(candidate) && candidate.length > 0) {
        setCurrentWidgets(ensureAllWidgets(candidate));
      } else {
        setCurrentWidgets(ensureAllWidgets(getStoredWidgetsConfig()));
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMove = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= currentWidgets.length) return;
    const updated = [...currentWidgets];
    const [item] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, item);
    setCurrentWidgets(updated);
  };

  const handleToggleVisible = (id, forceVisible = null) => {
    const norm = normalizeWidgetId(id);
    setCurrentWidgets((prev) =>
      prev.map((w) => {
        if (w.id === id || normalizeWidgetId(w.id) === norm || normalizeWidgetId(w.id) === id) {
          const nextVal = forceVisible !== null ? forceVisible : !w.visible;
          return { ...w, visible: nextVal, hidden: !nextVal };
        }
        return w;
      })
    );
  };

  const handleSave = async () => {
    const newList = [...currentWidgets];
    try {
      localStorage.setItem('monety_widgets_order_v2', JSON.stringify(newList));
      localStorage.setItem('monety_widgets_config', JSON.stringify(newList));
      localStorage.setItem('presu_widget_order', JSON.stringify(newList));
      await saveStoredWidgetsConfig(newList, user?.id);
    } catch (err) {
      console.error('Error al persistir monety_widgets_config:', err);
    }
    if (onSave) onSave([...newList]);
    onClose();
  };

  const handleResetDefaults = async () => {
    if (confirm('¿Restablecer el orden y visibilidad por defecto de los widgets?')) {
      const defCopy = [...DEFAULT_WIDGETS_CONFIG];
      try {
        localStorage.setItem('monety_widgets_order_v2', JSON.stringify(defCopy));
        localStorage.setItem('monety_widgets_config', JSON.stringify(defCopy));
        localStorage.setItem('presu_widget_order', JSON.stringify(defCopy));
        await saveStoredWidgetsConfig(defCopy, user?.id);
      } catch (err) {
        console.error(err);
      }
      setCurrentWidgets(defCopy);
      if (onReset) onReset([...defCopy]);
      if (onSave) onSave([...defCopy]);
      onClose();
    }
  };

  const activeWidgets = currentWidgets.filter((w) => w.visible !== false && !w.hidden);
  const hiddenWidgets = currentWidgets.filter((w) => w.visible === false || w.hidden === true);
  const visibleCount = activeWidgets.length;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 animate-fadeIn"
      onClick={handleClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border animate-slide-up pb-safe max-h-[85vh] flex flex-col"
        style={{ 
          backgroundColor: 'var(--modal-bg)', 
          borderColor: 'var(--border-color)', 
          color: 'var(--text-main)' 
        }}
      >
        {/* iOS Handle Indicator */}
        <div className="w-10 h-1 bg-slate-400/40 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Personalizar Widgets</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                {visibleCount} de {currentWidgets.length} activos en la pestaña Inicio
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of Widgets with Reorder & Visibility */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1 py-1 touch-pan-y overscroll-contain">
          {/* 1. Sección de Widgets Activos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Widgets activos ({activeWidgets.length})
              </span>
              <span className="text-[10px] text-slate-400">
                Arrastra o usa las flechas para ordenar
              </span>
            </div>

            {activeWidgets.map((w, activeIdx) => {
              const IconComponent = ICON_MAP[w.icon] || Wallet;
              const isFirst = activeIdx === 0;
              const isLast = activeIdx === activeWidgets.length - 1;
              const fullIndex = currentWidgets.findIndex(cw => cw.id === w.id);
              const isDragging = draggedIndex === fullIndex;

              return (
                <div
                  key={w.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggedIndex(fullIndex);
                    e.dataTransfer.effectAllowed = 'move';
                    try {
                      e.dataTransfer.setData('text/plain', String(fullIndex));
                    } catch {}
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedIndex !== null && draggedIndex !== fullIndex) {
                      handleMove(draggedIndex, fullIndex);
                    }
                    setDraggedIndex(null);
                  }}
                  onDragEnd={() => setDraggedIndex(null)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 select-none touch-pan-y ${
                    isDragging ? 'opacity-40 scale-[0.98] ring-2 ring-emerald-500' : ''
                  } shadow-sm opacity-100`}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)'
                  }}
                >
                  {/* Drag handle & Icon & Title */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 opacity-40 shrink-0 text-slate-400" />
                    
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors bg-emerald-500/15 text-emerald-500"
                    >
                      <IconComponent className="w-4 h-4 text-emerald-500" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] sm:text-[14px] font-bold truncate block" style={{ color: 'var(--text-main)' }}>
                        {w.label || w.name}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">
                        {w.description}
                      </p>
                    </div>
                  </div>

                  {/* Controls: Reorder buttons + Ocultar button */}
                  <div 
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {/* Reorder Arrows */}
                    <div 
                      className="flex items-center gap-0.5 p-0.5 rounded-xl" 
                      style={{ backgroundColor: 'var(--bg-input)' }}
                    >
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const prevActive = activeWidgets[activeIdx - 1];
                          if (prevActive) {
                            const fromIdx = currentWidgets.findIndex(cw => cw.id === w.id);
                            const toIdx = currentWidgets.findIndex(cw => cw.id === prevActive.id);
                            handleMove(fromIdx, toIdx);
                          }
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          isFirst 
                            ? 'opacity-20 cursor-not-allowed' 
                            : 'opacity-70 hover:opacity-100 hover:text-emerald-500 active:scale-90 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer'
                        }`}
                        title="Subir widget"
                        aria-label="Subir"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        disabled={isLast}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const nextActive = activeWidgets[activeIdx + 1];
                          if (nextActive) {
                            const fromIdx = currentWidgets.findIndex(cw => cw.id === w.id);
                            const toIdx = currentWidgets.findIndex(cw => cw.id === nextActive.id);
                            handleMove(fromIdx, toIdx);
                          }
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          isLast 
                            ? 'opacity-20 cursor-not-allowed' 
                            : 'opacity-70 hover:opacity-100 hover:text-emerald-500 active:scale-90 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer'
                        }`}
                        title="Bajar widget"
                        aria-label="Bajar"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Botón Ocultar */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleVisible(w.id, false);
                      }}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer bg-slate-500/10 hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 border border-transparent hover:border-rose-500/20"
                      title="Ocultar widget"
                      aria-label="Ocultar"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. Sección de Widgets Ocultos / Agregar Widgets */}
          <div className="pt-3 border-t border-dashed border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Widgets Ocultos ({hiddenWidgets.length})
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Toca "+ Mostrar" para reactivar
              </span>
            </div>

            {hiddenWidgets.length > 0 ? (
              <div className="space-y-2">
                {hiddenWidgets.map((hw) => {
                  const IconComponent = ICON_MAP[hw.icon] || Wallet;
                  return (
                    <div
                      key={hw.id}
                      className="p-2.5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-between gap-2.5 transition-all select-none touch-pan-y"
                      style={{
                        backgroundColor: 'var(--bg-card-sub)'
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 opacity-60"
                          style={{ 
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-main)'
                          }}
                        >
                          <IconComponent className="w-4 h-4 text-slate-400" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate block">
                            {hw.label || hw.name}
                          </span>
                          <p className="text-[10px] text-slate-400 font-normal truncate">
                            {hw.description}
                          </p>
                        </div>
                      </div>

                      {/* Botón explícito + Mostrar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleVisible(hw.id, true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:text-white text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 border border-emerald-500/20"
                        title={`Mostrar widget ${hw.label || hw.name}`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>+ Mostrar</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 px-1 py-1">
                No hay ningún widget oculto. Todos los widgets están visibles en tu panel principal.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t mt-3 flex items-center justify-between gap-3 shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 active:scale-95 transition-all cursor-pointer"
            title="Restablecer orden inicial"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Por defecto</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 max-w-[200px] py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Guardar cambios</span>
          </button>
        </div>
      </div>
    </div>
  );
}
