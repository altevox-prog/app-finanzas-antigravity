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
    'weekly_cashflow', 'pill_bar_chart', 'weekly_cashflow_classic',
    'recent_movements', 'movimientos_recientes', 'recent_transactions',
    'expenses_category', 'gastos_categoria', 'charts',
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
  id,
  widget,
  index = 0,
  isReordering = false,
  draggedIndex = null,
  isWide,
  // Handlers para modo normal (pulsación larga / mouse & touch)
  onPressStart,
  onPressEnd,
  // Handlers para modo reorganización (arrastre & touch)
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggleVisibility,
  children
}) {
  const widgetId = id || widget?.id;
  if (!children) return null;

  const wide = typeof isWide === 'boolean' ? isWide : isWideWidget(widgetId);

  // MODO REORGANIZACIÓN
  if (isReordering) {
    const isDragging = draggedIndex !== null && draggedIndex !== undefined;
    const isCurrentlyDragged = draggedIndex === index;
    const isJigglingAlt = index % 2 === 1;

    // Desactivar animaciones continuas durante el arrastre activo para estabilizar las coordenadas
    const animationClass = isDragging 
      ? '!animate-none' 
      : (isJigglingAlt ? 'animate-jiggle-alt' : 'animate-jiggle');

    // Desactivar transiciones CSS durante reorganización/arrastre para evitar competición con el cálculo de coordenadas
    const transitionClass = (isReordering || isDragging)
      ? '!transition-none'
      : 'transition-transform duration-150';

    return (
      <div
        data-widget-index={index}
        onDragOver={(e) => onDragOver?.(e, index)}
        onDrop={onDrop}
        className={`relative ${
          wide ? 'col-span-1 md:col-span-2 lg:col-span-3' : 'col-span-1'
        } w-full select-none touch-pan-y ${transitionClass} ${animationClass} ${
          isCurrentlyDragged ? 'opacity-40 scale-[0.98]' : (isDragging ? '' : 'hover:scale-[1.01]')
        }`}
        style={{
          willChange: isReordering ? 'transform' : 'auto',
          transform: 'translate3d(0, 0, 0)',
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
          className="absolute -top-3 left-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 dark:bg-zinc-800 text-white shadow-xl border border-white/20 cursor-grab active:cursor-grabbing touch-none select-none pointer-events-auto"
          title="Arrastra desde aquí para mover el widget"
          aria-label="Manija para mover widget"
        >
          <GripVertical className="w-3.5 h-3.5 opacity-90 text-slate-300 pointer-events-none select-none" />
          <span className="text-[11px] font-bold tracking-tight pointer-events-none select-none">Mover</span>
        </div>

        {/* Botón flotante para ocultar widget en modo reorganización */}
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => onToggleVisibility?.(e, widgetId, false)}
          className="absolute -top-2.5 -right-2.5 z-30 w-7 h-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer border-2 border-white dark:border-slate-900 pointer-events-auto"
          title="Ocultar widget"
          aria-label="Ocultar widget"
        >
          <EyeOff className="w-3.5 h-3.5 stroke-[2.5] pointer-events-none select-none" />
        </button>

        {/* Contenido del widget sin eventos interactivos ni transiciones internas durante reordenamiento */}
        <div 
          className="pointer-events-none select-none [&_*]:!pointer-events-none [&_*]:!transition-none"
          style={{ 
            willChange: isReordering ? 'transform' : 'auto',
            transform: 'translate3d(0, 0, 0)' 
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
      onMouseDown={index >= 0 && onPressStart ? () => onPressStart(index) : undefined}
      onMouseUp={onPressEnd}
      onMouseLeave={onPressEnd}
      onTouchStart={index >= 0 && onTouchStart ? (e) => onTouchStart(e, index) : undefined}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      className={`w-full touch-pan-y ${wide ? 'col-span-1 md:col-span-2 lg:col-span-3' : 'col-span-1'}`}
      style={{
        transform: 'translate3d(0, 0, 0)',
      }}
    >
      {children}
    </div>
  );
}
