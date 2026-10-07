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
import { useBackHandler } from '../../hooks/useBackHandler';
import { useAuth } from '../../context/AuthContext';
import { 
  getStoredWidgetsConfig, 
  saveStoredWidgetsConfig, 
  DEFAULT_WIDGETS_CONFIG 
} from '../../utils/widgetsConfig';

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

  const [currentWidgets, setCurrentWidgets] = useState(() => {
    const candidate = widgetsConfig || widgets;
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
    return getStoredWidgetsConfig();
  });
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Sync state ONLY when modal opens
  useEffect(() => {
    if (isOpen) {
      const candidate = widgetsConfig || widgets;
      if (Array.isArray(candidate) && candidate.length > 0) {
        setCurrentWidgets([...candidate]);
      } else {
        setCurrentWidgets([...getStoredWidgetsConfig()]);
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

  const handleToggleVisible = (id) => {
    setCurrentWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
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

  const visibleCount = currentWidgets.filter((w) => w.visible).length;

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
                {visibleCount} de 12 activos en la pestaña Inicio
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
        <div className="space-y-2.5 overflow-y-auto flex-1 pr-0.5 py-1">
          {currentWidgets.map((w, index) => {
            const IconComponent = ICON_MAP[w.icon] || Wallet;
            const isFirst = index === 0;
            const isLast = index === currentWidgets.length - 1;
            const isDragging = draggedIndex === index;

            return (
              <div
                key={w.id}
                draggable
                onDragStart={(e) => {
                  setDraggedIndex(index);
                  e.dataTransfer.effectAllowed = 'move';
                  try {
                    e.dataTransfer.setData('text/plain', String(index));
                  } catch {}
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedIndex !== null && draggedIndex !== index) {
                    handleMove(draggedIndex, index);
                  }
                  setDraggedIndex(null);
                }}
                onDragEnd={() => setDraggedIndex(null)}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 select-none ${
                  isDragging ? 'opacity-40 scale-[0.98] ring-2 ring-emerald-500' : ''
                } ${
                  w.visible ? 'shadow-2xs opacity-100' : 'opacity-50 border-dashed'
                }`}
                style={{
                  backgroundColor: w.visible ? 'var(--bg-card)' : 'var(--bg-card-sub)',
                  borderColor: 'var(--border-color)'
                }}
              >
                {/* Drag handle & Icon & Title */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-4 h-4 opacity-40 shrink-0 text-slate-400" />
                  
                  <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                    style={{ 
                      backgroundColor: w.visible ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-input)',
                      color: w.visible ? '#10B981' : 'var(--text-main)'
                    }}
                  >
                    <IconComponent className="w-4 h-4 text-emerald-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] sm:text-[14px] font-bold truncate block" style={{ color: 'var(--text-main)' }}>
                        {w.label || w.name}
                      </span>
                      {!w.visible && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-slate-500/15 text-slate-400 font-medium shrink-0">
                          Oculto
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">
                      {w.description}
                    </p>
                  </div>
                </div>

                {/* Controls: Reorder buttons + Visibility toggle */}
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
                        handleMove(index, index - 1);
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
                        handleMove(index, index + 1);
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

                  {/* Visibility Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleVisible(w.id);
                    }}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                      w.visible 
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20' 
                        : 'bg-slate-500/15 text-slate-400 hover:text-slate-200'
                    }`}
                    title={w.visible ? "Ocultar widget" : "Mostrar widget"}
                    aria-label={w.visible ? "Ocultar" : "Mostrar"}
                  >
                    {w.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
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
