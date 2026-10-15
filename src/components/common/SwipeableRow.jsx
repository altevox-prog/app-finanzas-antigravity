import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

/**
 * SwipeableRow
 * Componente reutilizable y ligero para acciones de deslizamiento horizontal (Swipe Actions).
 * 
 * - Eventos de puntero nativos (mouse + touch) sin librerías externas.
 * - Bloqueo inteligente de eje (no interfiere con el scroll vertical nativo).
 * - Deslizar a la derecha (->) revela Editar (azul con icono de lápiz).
 * - Deslizar a la izquierda (<-) revela Eliminar (rojo con icono de papelera).
 * - Soporte para escritorio: arrastre con mouse y acceso rápido en group-hover.
 */
export default function SwipeableRow({
  children,
  onEdit,
  onDelete,
  className = '',
  contentClassName = '',
  disabled = false,
  threshold = 55,
  actionWidth = 76,
  showDesktopHover = true
}) {
  const [offset, setOffset] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const containerRef = useRef(null);
  const dragStartRef = useRef(null);
  const isDraggingRef = useRef(false);
  const axisLockRef = useRef(null); // 'x' | 'y' | null
  const hasDraggedRef = useRef(false);

  // Cerrar fila si se hace clic/pointerdown fuera mientras está abierta
  useEffect(() => {
    if (offset === 0) return;

    const handleGlobalPointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOffset(0);
      }
    };

    window.addEventListener('pointerdown', handleGlobalPointerDown);
    return () => window.removeEventListener('pointerdown', handleGlobalPointerDown);
  }, [offset]);

  const handlePointerDown = (e) => {
    if (disabled || e.button !== 0) return;

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialOffset: offset,
      time: Date.now()
    };
    isDraggingRef.current = false;
    axisLockRef.current = null;
  };

  const handlePointerMove = (e) => {
    if (!dragStartRef.current) return;

    // Si ya se bloqueó en el eje Y (scroll vertical), dejar que el navegador maneje el scroll nativo
    if (axisLockRef.current === 'y') return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Detección de eje con tolerancia de 6px
    if (axisLockRef.current === null) {
      if (Math.hypot(dx, dy) < 6) return;

      if (Math.abs(dy) >= Math.abs(dx)) {
        axisLockRef.current = 'y';
        return;
      } else {
        axisLockRef.current = 'x';
        isDraggingRef.current = true;
        hasDraggedRef.current = true;
        setIsInteracting(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
    }

    if (axisLockRef.current === 'x') {
      let nextOffset = dragStartRef.current.initialOffset + dx;

      // Restringir si la acción no está disponible
      if (!onEdit && nextOffset > 0) nextOffset = 0;
      if (!onDelete && nextOffset < 0) nextOffset = 0;

      // Resistencia elástica más allá del ancho de acción
      const maxLimit = actionWidth + 24;
      if (nextOffset > maxLimit) {
        nextOffset = maxLimit + (nextOffset - maxLimit) * 0.2;
      } else if (nextOffset < -maxLimit) {
        nextOffset = -maxLimit + (nextOffset + maxLimit) * 0.2;
      }

      setOffset(nextOffset);
    }
  };

  const handlePointerEnd = (e) => {
    if (!dragStartRef.current) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const wasDragging = isDraggingRef.current;
    const dx = e.clientX - dragStartRef.current.x;
    const dt = Date.now() - dragStartRef.current.time;

    dragStartRef.current = null;
    isDraggingRef.current = false;
    axisLockRef.current = null;
    setIsInteracting(false);

    if (wasDragging) {
      const isQuickFlick = dt < 250 && Math.abs(dx) > 25;

      if ((offset > threshold || (isQuickFlick && dx > 0)) && onEdit) {
        setOffset(actionWidth);
      } else if ((offset < -threshold || (isQuickFlick && dx < 0)) && onDelete) {
        setOffset(-actionWidth);
      } else {
        setOffset(0);
      }
    }
  };

  const handleClickCapture = (e) => {
    // Si hubo arrastre, interceptar el clic para no abrir modales o detalles
    if (hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      hasDraggedRef.current = false;
      return;
    }

    // Si la tarjeta estaba abierta y se toca el cuerpo, cerrarla en vez de activar el clic hijo
    if (offset !== 0) {
      e.stopPropagation();
      e.preventDefault();
      setOffset(0);
    }
  };

  const handleExecuteEdit = (e) => {
    e.stopPropagation();
    setOffset(0);
    if (onEdit) onEdit();
  };

  const handleExecuteDelete = (e) => {
    e.stopPropagation();
    setOffset(0);
    if (onDelete) onDelete();
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden group select-none ${className}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Acción Izquierda Revelada: EDITAR (deslizar ->) */}
      {onEdit && (
        <div
          className="absolute inset-y-0 left-0 bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-start z-0 transition-opacity"
          style={{
            width: `${Math.max(actionWidth + 10, offset)}px`,
            opacity: offset > 5 ? 1 : 0
          }}
        >
          <button
            type="button"
            onClick={handleExecuteEdit}
            className="h-full px-4 sm:px-5 flex flex-col items-center justify-center gap-1 text-white hover:brightness-110 active:scale-95 transition-all cursor-pointer font-bold select-none"
            title="Editar"
            aria-label="Editar"
          >
            <Pencil className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[10px] uppercase tracking-wider font-bold">Editar</span>
          </button>
        </div>
      )}

      {/* Acción Derecha Revelada: ELIMINAR (deslizar <-) */}
      {onDelete && (
        <div
          className="absolute inset-y-0 right-0 bg-rose-600 dark:bg-rose-500 text-white flex items-center justify-end z-0 transition-opacity"
          style={{
            width: `${Math.max(actionWidth + 10, -offset)}px`,
            opacity: offset < -5 ? 1 : 0
          }}
        >
          <button
            type="button"
            onClick={handleExecuteDelete}
            className="h-full px-4 sm:px-5 flex flex-col items-center justify-center gap-1 text-white hover:brightness-110 active:scale-95 transition-all cursor-pointer font-bold select-none"
            title="Eliminar"
            aria-label="Eliminar"
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[10px] uppercase tracking-wider font-bold">Borrar</span>
          </button>
        </div>
      )}

      {/* Contenido Deslizable */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClickCapture={handleClickCapture}
        className={`relative z-10 w-full ${contentClassName}`}
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transition: isInteracting ? 'none' : 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)',
          willChange: isInteracting ? 'transform' : 'auto'
        }}
      >
        {children}
      </div>

      {/* Acciones flotantes sutiles para ratón / pantalla grande (desktop hover) */}
      {showDesktopHover && (onEdit || onDelete) && (
        <div
          className={`hidden md:flex items-center gap-1 absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-1.5 py-1 rounded-xl shadow-md border border-slate-200/80 dark:border-white/10 pointer-events-auto transition-opacity ${
            offset !== 0 ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit && (
            <button
              type="button"
              onClick={handleExecuteEdit}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 active:scale-95 transition-all cursor-pointer"
              title="Editar"
              aria-label="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={handleExecuteDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
              title="Eliminar"
              aria-label="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
