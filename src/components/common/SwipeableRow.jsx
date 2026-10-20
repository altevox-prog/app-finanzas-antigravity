import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

/**
 * SwipeableRow: Componente unificado y ligero para acciones de deslizamiento horizontal (Swipe Actions).
 * Soporta Mobile, Tablet y Desktop con Pointer Events.
 */
export default function SwipeableRow({
  children,
  onEdit,
  onDelete,
  className = '',
  contentClassName = '',
  disabled = false,
  threshold = 45,
  actionWidth = 76
}) {
  const [offset, setOffset] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const containerRef = useRef(null);
  const dragStartRef = useRef(null);
  const isDraggingRef = useRef(false);
  const axisLockRef = useRef(null);
  const hasDraggedRef = useRef(false);
  const activePointerIdRef = useRef(null);

  useEffect(() => {
    if (offset === 0) return;
    const handleGlobalPointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOffset(0);
    };
    window.addEventListener('pointerdown', handleGlobalPointerDown);
    return () => window.removeEventListener('pointerdown', handleGlobalPointerDown);
  }, [offset]);

  const handlePointerDown = (e) => {
    if (disabled || (e.button !== undefined && e.button !== 0)) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY, initialOffset: offset, time: Date.now() };
    activePointerIdRef.current = e.pointerId;
    isDraggingRef.current = false;
    axisLockRef.current = null;
  };

  const handlePointerMove = (e) => {
    if (!dragStartRef.current || (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) || axisLockRef.current === 'y') return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (axisLockRef.current === null) {
      if (Math.hypot(dx, dy) < 6) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        axisLockRef.current = 'y';
        return;
      }
      axisLockRef.current = 'x';
      isDraggingRef.current = true;
      hasDraggedRef.current = true;
      setIsInteracting(true);
      try { e.target?.setPointerCapture?.(e.pointerId); } catch (_) {}
    }

    if (axisLockRef.current === 'x') {
      let nextOffset = dragStartRef.current.initialOffset + dx;
      if (!onEdit && nextOffset > 0) nextOffset = 0;
      if (!onDelete && nextOffset < 0) nextOffset = 0;

      const maxLimit = actionWidth + 24;
      if (nextOffset > maxLimit) nextOffset = maxLimit + (nextOffset - maxLimit) * 0.2;
      else if (nextOffset < -maxLimit) nextOffset = -maxLimit + (nextOffset + maxLimit) * 0.2;

      setOffset(nextOffset);
    }
  };

  const handlePointerUp = (e) => {
    if (!dragStartRef.current) return;
    const wasDragging = isDraggingRef.current;
    const dx = e.clientX - dragStartRef.current.x;
    const dt = Date.now() - dragStartRef.current.time;

    try {
      if (activePointerIdRef.current !== null) e.target?.releasePointerCapture?.(activePointerIdRef.current);
    } catch (_) {}

    dragStartRef.current = null;
    activePointerIdRef.current = null;
    isDraggingRef.current = false;
    axisLockRef.current = null;
    setIsInteracting(false);

    if (wasDragging) {
      const isQuickFlick = dt < 300 && Math.abs(dx) > 20;
      if ((offset > threshold || (isQuickFlick && dx > 0)) && onEdit) setOffset(actionWidth);
      else if ((offset < -threshold || (isQuickFlick && dx < 0)) && onDelete) setOffset(-actionWidth);
      else setOffset(0);
    }
  };

  const handleClickCapture = (e) => {
    if (hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      hasDraggedRef.current = false;
      return;
    }
    if (offset !== 0) {
      e.stopPropagation();
      e.preventDefault();
      setOffset(0);
    }
  };

  const handleAction = (callback) => (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setOffset(0);
    if (callback) callback();
  };

  return (
    <div ref={containerRef} className={`relative overflow-hidden group select-none ${className}`} style={{ touchAction: 'pan-y' }}>
      {/* Acción Izquierda: Editar */}
      {onEdit && (
        <div
          className="absolute inset-y-0 left-0 bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-start z-0 transition-opacity"
          style={{ width: `${Math.max(actionWidth + 10, offset)}px`, opacity: offset > 5 ? 1 : 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleAction(onEdit)}
            className="h-full px-4 sm:px-5 flex flex-col items-center justify-center gap-1 text-white hover:brightness-110 active:scale-95 transition-all cursor-pointer font-bold select-none"
            title="Editar"
            aria-label="Editar"
          >
            <Pencil className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[10px] uppercase tracking-wider font-bold">Editar</span>
          </button>
        </div>
      )}

      {/* Acción Derecha: Eliminar */}
      {onDelete && (
        <div
          className="absolute inset-y-0 right-0 bg-rose-600 dark:bg-rose-500 text-white flex items-center justify-end z-0 transition-opacity"
          style={{ width: `${Math.max(actionWidth + 10, -offset)}px`, opacity: offset < -5 ? 1 : 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleAction(onDelete)}
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
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={handleClickCapture}
        className={`relative z-10 w-full touch-pan-y ${contentClassName}`}
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transition: isInteracting ? 'none' : 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)',
          willChange: isInteracting ? 'transform' : 'auto',
          touchAction: 'pan-y'
        }}
      >
        {children}
      </div>
    </div>
  );
}
