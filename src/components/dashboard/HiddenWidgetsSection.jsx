import React from 'react';
import { EyeOff, Plus, Wallet } from 'lucide-react';

/**
 * HiddenWidgetsSection
 * Bandeja de widgets ocultos del Dashboard. Permite visualizar qué widgets
 * están actualmente desactivados y reactivarlos/mostrarlos con un clic.
 */
export default function HiddenWidgetsSection({
  hiddenWidgets = [],
  onToggleVisibility = () => {},
  widgetIconMap = {},
  className = ''
}) {
  const safeList = Array.isArray(hiddenWidgets) ? hiddenWidgets : [];

  return (
    <div 
      className={`w-full mt-6 p-4 sm:p-5 rounded-2xl border border-dashed border-slate-300 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/5 backdrop-blur-md transition-all animate-fadeIn ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            Widgets ocultos {safeList.length > 0 ? `(${safeList.length})` : ''}
          </h4>
        </div>
        {safeList.length === 0 && (
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Todos los widgets están visibles
          </span>
        )}
      </div>

      {safeList.length > 0 ? (
        <div className="flex flex-wrap gap-2.5">
          {safeList.map((hw) => {
            const label = hw.label || hw.name || hw.id;
            const IconComponent = (widgetIconMap && widgetIconMap[hw.icon]) ? widgetIconMap[hw.icon] : Wallet;
            return (
              <div
                key={hw.id}
                className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500/50 transition-all group"
              >
                <IconComponent className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate max-w-[160px]">{label}</span>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => onToggleVisibility(e, hw.id, true)}
                  className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:text-white transition-all cursor-pointer font-bold text-[11px]"
                  title={`Restaurar widget ${label}`}
                  aria-label={`Restaurar widget ${label}`}
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>+ Mostrar</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-1 px-1">
          Todos los widgets están activos. Para ocultar alguno, pulsa el botón rojo en la esquina del widget mientras reorganizas.
        </p>
      )}
    </div>
  );
}

export { HiddenWidgetsSection };
