import React from 'react';
import { GripVertical, EyeOff } from 'lucide-react';
import { normalizeWidgetId } from '../../utils/widgetsConfig';

/**
 * Determina si un widget ocupa ancho completo en la cuadrícula (col-span-3)
 */
export const isWideWidget = (id) => {
  if (!id) return false;
  const norm = normalizeWidgetId(id);
  const wideIds = [
    'my_accounts', 'mis_cuentas', 'accounts',
    'bento_metrics', 'bento',
    'balance_cards'
  ];
  return wideIds.includes(norm) || wideIds.includes(id);
};

/**
 * DashboardWidgetWrapper
 * Contenedor modular para cada widget del Dashboard.
 * Maneja tanto el modo visual normal (con listener de pulsación larga / touch para activar reorganización)
 * como el modo de reorganización (con manija de arrastre 'Mover', botón para ocultar y animaciones de sacudida/jiggle).
 */
export default function DashboardWidgetWrapper({
  id, widget, index = 0, isReordering = false, draggedIndex = null, isWide,
  onPressStart, onPressEnd, onTouchStart, onTouchMove, onTouchEnd,
  onDragStart, onDragOver, onDrop, onDragEnd, onToggleVisibility, className = '', children
}) {
  const widgetId = id || widget?.id;
  if (!children) return null;

  const wide = typeof isWide === 'boolean' ? isWide : isWideWidget(widgetId);

  // MODO REORGANIZACIÓN
  if (isReordering) {
    const isCurrentlyDragged = draggedIndex === index;
    const isJigglingAlt = index % 2 === 1;

    // Desactivar animación únicamente en el widget que se arrastra activamente
    const animationClass = isCurrentlyDragged 
      ? '!animate-none' 
      : (isJigglingAlt ? 'animate-jiggle-alt' : 'animate-jiggle');

    const transitionClass = isCurrentlyDragged
      ? '!transition-none'
      : 'transition-transform duration-150';

    return (
      <div
        data-widget-index={index}
        data-widget-id={widgetId}
        draggable={true}
        onDragStart={(e) => onDragStart?.(e, index)}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver?.(e, index);
        }}
        onDrop={(e) => onDrop?.(e, index)}
        onDragEnd={onDragEnd}
        className={`relative ${
          wide ? 'col-span-1 lg:col-span-2' : 'col-span-1'
        } min-w-0 w-full overflow-hidden select-none touch-pan-y ${transitionClass} ${animationClass} ${
          isCurrentlyDragged ? 'opacity-40 scale-[0.98]' : 'hover:scale-[1.01]'
        } cursor-grab active:cursor-grabbing ${className}`}
        style={{
          touchAction: 'pan-y',
          willChange: isReordering ? 'transform' : 'auto',
        }}
      >
        {/* Manija de arrastre para móvil y PC */}
        <div
          data-drag-handle="true"
          onTouchStart={(e) => {
            e.stopPropagation();
            onTouchStart?.(e, index);
          }}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          draggable={true}
          onDragStart={(e) => onDragStart?.(e, index)}
          onDragOver={(e) => onDragOver?.(e, index)}
          onDrop={onDrop}
          onDragEnd={onDragEnd}
          style={{ touchAction: 'none' }}
          className="absolute top-2 left-3 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/95 dark:bg-zinc-800 text-white shadow-xl border border-white/20 hover:border-emerald-500/50 cursor-grab active:cursor-grabbing active:scale-105 active:bg-emerald-600 transition-all touch-none select-none pointer-events-auto"
          title="Arrastra desde aquí para mover el widget"
          aria-label="Manija para mover widget"
        >
          <GripVertical className="w-4 h-4 text-emerald-400 pointer-events-none select-none shrink-0" />
          <span className="text-xs font-bold tracking-tight pointer-events-none select-none">Mover</span>
        </div>

        {/* Botón flotante para ocultar widget en modo reorganización */}
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => onToggleVisibility?.(e, widgetId, false)}
          className="absolute top-2 right-2.5 z-30 w-7 h-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer border-2 border-white dark:border-zinc-950 pointer-events-auto"
          title="Ocultar widget"
          aria-label="Ocultar widget"
        >
          <EyeOff className="w-3.5 h-3.5 stroke-[2.5] pointer-events-none select-none" />
        </button>

        {/* Contenido del widget sin eventos interactivos ni transiciones internas durante reordenamiento */}
        <div 
          className="pointer-events-none select-none min-w-0 w-full h-full flex flex-col [&_*]:!pointer-events-none [&_*]:!transition-none"
          style={{ 
            willChange: isReordering ? 'transform' : 'auto'
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  // MODO NORMAL
  return (
    <div
      data-widget-index={index}
      data-widget-id={widgetId}
      onMouseDown={index >= 0 && onPressStart ? () => onPressStart(index) : undefined}
      onMouseUp={onPressEnd}
      onMouseLeave={onPressEnd}
      onTouchStart={index >= 0 && onTouchStart ? (e) => onTouchStart(e, index) : undefined}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      className={`relative ${
        wide ? 'col-span-1 lg:col-span-2' : 'col-span-1'
      } min-w-0 w-full overflow-hidden h-auto flex flex-col touch-pan-y ${className}`}
      style={{
        transform: 'translate3d(0, 0, 0)',
      }}
    >
      {children}
    </div>
  );
}
