import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  getStoredWidgetsConfig, 
  saveStoredWidgetsConfig,
  normalizeWidgetId,
  DEFAULT_WIDGETS_CONFIG
} from '../utils/widgetsConfig';

/**
 * useWidgetReorder
 * Custom hook para la gestión centralizada de reordenamiento de widgets,
 * interacción estilo iOS (long press, wiggle animation, manijas de arrastre)
 * y persistencia en almacenamiento local / eventos de sincronización.
 */
export function useWidgetReorder({
  widgetsConfig = null,
  widgetsProp = null,
  allowedWidgetIds = null,
  onSaveWidgets = null,
  getWidget = null
} = {}) {
  // 1. Estado central de widgets basado en configuración inicial o guardada
  const [widgets, setWidgets] = useState(() => {
    const candidate = widgetsConfig || widgetsProp;
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
    return getStoredWidgetsConfig();
  });

/**
 * Verifica si el puntero ha superado el punto medio del elemento objetivo
 * en la dirección del movimiento, evitando rebotes entre posiciones adyacentes.
 */
function hasCrossedMidpoint(pointerX, pointerY, targetRect, fromIndex, toIndex) {
  if (!targetRect || fromIndex === null || fromIndex === undefined || fromIndex === toIndex) {
    return false;
  }

  const midX = targetRect.left + targetRect.width / 2;
  const midY = targetRect.top + targetRect.height / 2;

  // Si nos movemos hacia adelante en el arreglo (hacia abajo o a la derecha)
  if (fromIndex < toIndex) {
    if (Math.abs(pointerY - midY) > targetRect.height * 0.15) {
      return pointerY > midY;
    }
    return pointerX > midX;
  } else {
    // Si nos movemos hacia atrás en el arreglo (hacia arriba o a la izquierda)
    if (Math.abs(pointerY - midY) > targetRect.height * 0.15) {
      return pointerY < midY;
    }
    return pointerX < midX;
  }
}

const SWAP_THROTTLE_MS = 100;

  // 2. Estados y referencias para interacción (Long press & Drag-and-Drop)
  const [isReordering, setIsReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const longPressTimerRef = useRef(null);
  const pressedIndexRef = useRef(null);
  const draggedIndexRef = useRef(null);
  const lastSwapTimeRef = useRef(0);
  const widgetsRef = useRef(widgets);
  const isReorderingRef = useRef(isReordering);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const autoScrollRafRef = useRef(null);
  const autoScrollSpeedRef = useRef(0);
  const lastTouchPosRef = useRef(null);

  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  useEffect(() => {
    isReorderingRef.current = isReordering;
  }, [isReordering]);

  // Serialización primitiva para evitar bucles infinitos de renderizado
  const serializedCandidateConfig = useMemo(() => {
    const candidate = widgetsConfig || widgetsProp;
    if (Array.isArray(candidate) && candidate.length > 0) {
      try {
        return JSON.stringify(candidate);
      } catch (_) {
        return '';
      }
    }
    return '';
  }, [widgetsConfig, widgetsProp]);

  // Sincronización segura de widgets con props externas
  useEffect(() => {
    if (isReorderingRef.current || !serializedCandidateConfig) return;
    try {
      const currentSerialized = JSON.stringify(widgetsRef.current);
      if (serializedCandidateConfig !== currentSerialized) {
        const parsed = JSON.parse(serializedCandidateConfig);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWidgets(parsed);
        }
      }
    } catch (_) {}
  }, [serializedCandidateConfig]);

  // Listener para sincronización con eventos globales de ventana
  useEffect(() => {
    let isMounted = true;
    const handleSync = (e) => {
      if (isReorderingRef.current) return;
      try {
        const next = (e?.detail && Array.isArray(e.detail) && e.detail.length > 0)
          ? e.detail
          : getStoredWidgetsConfig();
        const nextStr = JSON.stringify(next);
        const currStr = JSON.stringify(widgetsRef.current);
        if (nextStr !== currStr) {
          queueMicrotask(() => {
            if (isMounted && !isReorderingRef.current) {
              setWidgets(next);
            }
          });
        }
      } catch (_) {}
    };

    window.addEventListener('monety_widgets_order_v2_updated', handleSync);
    window.addEventListener('monety_widgets_config_updated', handleSync);
    window.addEventListener('presu_widget_order_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      isMounted = false;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
      window.removeEventListener('monety_widgets_order_v2_updated', handleSync);
      window.removeEventListener('monety_widgets_config_updated', handleSync);
      window.removeEventListener('presu_widget_order_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Disparador háptico seguro contra bloqueos del navegador
  const triggerHaptic = useCallback((pattern = 50) => {
    try {
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        if (typeof document !== 'undefined' && typeof document.hasFocus === 'function' && !document.hasFocus()) {
          return;
        }
        if (typeof navigator.userActivation !== 'undefined' && !navigator.userActivation.hasBeenActive) {
          return;
        }
        navigator.vibrate(pattern);
      }
    } catch (_) {}
  }, []);

  // Handlers para detección de pulsación prolongada (500ms)
  const handlePressStart = useCallback((index = null) => {
    if (isReorderingRef.current) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    if (index !== null) {
      pressedIndexRef.current = index;
    }
    longPressTimerRef.current = setTimeout(() => {
      setIsReordering(true);
      if (pressedIndexRef.current !== null && pressedIndexRef.current !== undefined) {
        draggedIndexRef.current = pressedIndexRef.current;
        setDraggedIndex(pressedIndexRef.current);
      }
      triggerHaptic(50);
    }, 500);
  }, [triggerHaptic]);

  const handlePressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pressedIndexRef.current = null;
  }, []);

  // Intercambio atómico unificado para Drag & Drop
  const handleSwapWidgets = useCallback((targetIndex) => {
    const currentIndex = draggedIndexRef.current;
    if (currentIndex === null || currentIndex === undefined || currentIndex === targetIndex) {
      return;
    }

    setWidgets((prevWidgets) => {
      const visibleList = prevWidgets.filter(w => {
        if (!w.visible) return false;
        const norm = normalizeWidgetId(w.id);
        if (norm === 'trm' || norm === 'trm_oficial' || w.id === 'trm' || w.id === 'trm_oficial') return false;
        if (allowedWidgetIds && Array.isArray(allowedWidgetIds)) {
          if (!allowedWidgetIds.includes(norm) && !allowedWidgetIds.includes(w.id)) return false;
        }
        return getWidget ? Boolean(getWidget(w.id)) : true;
      });

      const sourceItem = visibleList[currentIndex];
      const targetItem = visibleList[targetIndex];

      if (!sourceItem || !targetItem || sourceItem.id === targetItem.id) {
        return prevWidgets;
      }

      const fromIndexInPrev = prevWidgets.findIndex(w => w.id === sourceItem.id);
      const toIndexInPrev = prevWidgets.findIndex(w => w.id === targetItem.id);

      if (fromIndexInPrev === -1 || toIndexInPrev === -1) {
        return prevWidgets;
      }

      const updated = [...prevWidgets];
      const [moved] = updated.splice(fromIndexInPrev, 1);
      updated.splice(toIndexInPrev, 0, moved);
      widgetsRef.current = updated;
      try {
        localStorage.setItem('monety_widgets_order_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    triggerHaptic(20);

    draggedIndexRef.current = targetIndex;
    setDraggedIndex(targetIndex);
  }, [allowedWidgetIds, getWidget, triggerHaptic]);

  // Control de auto-scroll suave en bordes de viewport durante el arrastre
  const stopAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
    autoScrollSpeedRef.current = 0;
  }, []);

  const updateAutoScroll = useCallback((clientY) => {
    if (typeof window === 'undefined') return;
    const threshold = 95;
    const maxSpeed = 16;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    let speed = 0;
    if (clientY < threshold) {
      // Cerca del borde superior: scroll hacia arriba
      const factor = Math.max(0, (threshold - clientY) / threshold);
      speed = -Math.max(3, Math.round(factor * maxSpeed));
    } else if (clientY > viewportHeight - threshold) {
      // Cerca del borde inferior: scroll hacia abajo
      const factor = Math.max(0, (clientY - (viewportHeight - threshold)) / threshold);
      speed = Math.max(3, Math.round(factor * maxSpeed));
    }

    autoScrollSpeedRef.current = speed;

    if (speed !== 0 && !autoScrollRafRef.current) {
      const step = () => {
        if (autoScrollSpeedRef.current !== 0 && isReorderingRef.current && draggedIndexRef.current !== null) {
          window.scrollBy({ top: autoScrollSpeedRef.current, behavior: 'auto' });

          // Re-evaluar widget bajo el puntero mientras la pantalla se desplaza
          if (lastTouchPosRef.current) {
            const { x, y } = lastTouchPosRef.current;
            const targetEl = document.elementFromPoint(x, y)?.closest('[data-widget-index]');
            if (targetEl) {
              const targetIndex = Number(targetEl.getAttribute('data-widget-index'));
              const currIdx = draggedIndexRef.current;
              if (!isNaN(targetIndex) && targetIndex !== currIdx) {
                const targetRect = targetEl.getBoundingClientRect();
                if (hasCrossedMidpoint(x, y, targetRect, currIdx, targetIndex)) {
                  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                  if (now - lastSwapTimeRef.current >= SWAP_THROTTLE_MS) {
                    lastSwapTimeRef.current = now;
                    handleSwapWidgets(targetIndex);
                  }
                }
              }
            }
          }

          autoScrollRafRef.current = requestAnimationFrame(step);
        } else {
          autoScrollRafRef.current = null;
        }
      };
      autoScrollRafRef.current = requestAnimationFrame(step);
    } else if (speed === 0 && autoScrollRafRef.current) {
      stopAutoScroll();
    }
  }, [handleSwapWidgets, stopAutoScroll]);

  // Drag & Drop nativo HTML5 para ratón (PC)
  const handleDragStart = useCallback((e, index) => {
    if (!isReorderingRef.current) return;
    draggedIndexRef.current = index;
    setDraggedIndex(index);
    if (e && e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', String(index));
      } catch (_) {}
    }
  }, []);

  const handleDragOver = useCallback((e, targetIndex) => {
    if (!isReorderingRef.current) return;
    if (e) {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
      updateAutoScroll(e.clientY);
    }

    const currentIndex = draggedIndexRef.current;
    if (currentIndex === null || currentIndex === undefined || currentIndex === targetIndex) {
      return;
    }

    // Throttling: evitar llamadas continuas a 60fps
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (now - lastSwapTimeRef.current < SWAP_THROTTLE_MS) {
      return;
    }

    // Comprobación de umbral de punto medio para evitar rebotes entre posiciones adyacentes
    const targetEl = e.currentTarget?.closest('[data-widget-index]') || e.currentTarget;
    const targetRect = targetEl?.getBoundingClientRect();

    if (hasCrossedMidpoint(e.clientX, e.clientY, targetRect, currentIndex, targetIndex)) {
      lastSwapTimeRef.current = now;
      handleSwapWidgets(targetIndex);
    }
  }, [handleSwapWidgets, updateAutoScroll]);

  const handleDrop = useCallback((e) => {
    stopAutoScroll();
    if (!isReorderingRef.current) return;
    if (e) e.preventDefault();
    draggedIndexRef.current = null;
    setDraggedIndex(null);
    lastSwapTimeRef.current = 0;

    const currentWidgets = widgetsRef.current;
    localStorage.setItem('monety_widgets_order_v2', JSON.stringify(currentWidgets));
    saveStoredWidgetsConfig(currentWidgets, null);
    if (onSaveWidgets) onSaveWidgets(currentWidgets);
  }, [onSaveWidgets, stopAutoScroll]);

  const handleDragEnd = useCallback(() => {
    stopAutoScroll();
    draggedIndexRef.current = null;
    setDraggedIndex(null);
    lastSwapTimeRef.current = 0;

    const currentWidgets = widgetsRef.current;
    localStorage.setItem('monety_widgets_order_v2', JSON.stringify(currentWidgets));
    saveStoredWidgetsConfig(currentWidgets, null);
    if (onSaveWidgets) onSaveWidgets(currentWidgets);
  }, [onSaveWidgets, stopAutoScroll]);

  // Manejadores Táctiles (Touch Events) para Móviles / Pantallas Táctiles
  const handleTouchStart = useCallback((e, index) => {
    if (e.target && typeof e.target.closest === 'function') {
      if (e.target.closest('button, a, input, select, textarea, [data-no-drag], .overflow-x-auto, .no-scrollbar')) {
        return;
      }
    }
    if (e.touches && e.touches[0]) {
      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastTouchPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (isReorderingRef.current) {
      draggedIndexRef.current = index;
      setDraggedIndex(index);
      triggerHaptic(25);
    } else {
      handlePressStart(index);
    }
  }, [handlePressStart, triggerHaptic]);

  const handleTouchMove = useCallback((e) => {
    if (!isReorderingRef.current) {
      if (touchStartPosRef.current && e.touches && e.touches[0]) {
        const diffY = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
        const diffX = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
        if (diffY > 10 || diffX > 10) {
          handlePressEnd();
          return;
        }
      }
      return;
    }

    const currentIndex = draggedIndexRef.current;
    if (currentIndex === null || currentIndex === undefined) {
      return;
    }

    const touch = e.touches && e.touches[0];
    if (!touch) return;

    lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };

    // Auto-scroll activo en márgenes de viewport
    updateAutoScroll(touch.clientY);

    // Throttling: evitar procesar ráfagas de eventos táctiles
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (now - lastSwapTimeRef.current < SWAP_THROTTLE_MS) {
      return;
    }

    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-widget-index]');
    if (!targetEl) return;

    const targetIndex = Number(targetEl.getAttribute('data-widget-index'));
    if (isNaN(targetIndex) || targetIndex === currentIndex) return;

    // Comprobación de umbral de punto medio para evitar rebotes entre posiciones adyacentes
    const targetRect = targetEl.getBoundingClientRect();
    if (hasCrossedMidpoint(touch.clientX, touch.clientY, targetRect, currentIndex, targetIndex)) {
      lastSwapTimeRef.current = now;
      handleSwapWidgets(targetIndex);
    }
  }, [handlePressEnd, handleSwapWidgets, updateAutoScroll]);

  const handleTouchEnd = useCallback(() => {
    stopAutoScroll();
    lastTouchPosRef.current = null;
    handlePressEnd();
    if (isReorderingRef.current) {
      draggedIndexRef.current = null;
      setDraggedIndex(null);
      lastSwapTimeRef.current = 0;

      const currentWidgets = widgetsRef.current;
      localStorage.setItem('monety_widgets_order_v2', JSON.stringify(currentWidgets));
      saveStoredWidgetsConfig(currentWidgets, null);
      if (onSaveWidgets) onSaveWidgets(currentWidgets);
    }
  }, [handlePressEnd, onSaveWidgets, stopAutoScroll]);

  const handleFinishReordering = useCallback(() => {
    stopAutoScroll();
    lastTouchPosRef.current = null;
    setIsReordering(false);
    draggedIndexRef.current = null;
    setDraggedIndex(null);
    pressedIndexRef.current = null;
    lastSwapTimeRef.current = 0;

    const currentWidgets = widgetsRef.current;
    localStorage.setItem('monety_widgets_order_v2', JSON.stringify(currentWidgets));
    saveStoredWidgetsConfig(currentWidgets, null);
    if (onSaveWidgets) onSaveWidgets(currentWidgets);
  }, [onSaveWidgets, stopAutoScroll]);

  // Control de visibilidad de widgets (ocultar / restaurar)
  const handleToggleVisibility = useCallback((e, widgetId, newVisible) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();

    const currentList = widgetsRef.current || widgets;
    const normTarget = normalizeWidgetId(widgetId);
    let found = false;

    let updated = [];
    let toggledWidget = null;

    currentList.forEach((w) => {
      if (w.id === widgetId || normalizeWidgetId(w.id) === normTarget) {
        found = true;
        if (newVisible) {
          // Si se hace visible, se aparta para anexarlo al final
          toggledWidget = { ...w, visible: true, hidden: false };
        } else {
          // Si se oculta, se mantiene su registro con visible=false
          updated.push({ ...w, visible: false, hidden: true });
        }
      } else {
        updated.push(w);
      }
    });

    if (toggledWidget) {
      // Inserción estricta al final de la lista
      updated.push(toggledWidget);
    } else if (!found && newVisible) {
      const defWidget = DEFAULT_WIDGETS_CONFIG.find(dw => dw.id === widgetId || normalizeWidgetId(dw.id) === normTarget);
      if (defWidget) {
        updated.push({ ...defWidget, visible: true, hidden: false });
      }
    }

    widgetsRef.current = updated;
    setWidgets(updated);
    localStorage.setItem('monety_widgets_order_v2', JSON.stringify(updated));
    saveStoredWidgetsConfig(updated, null);
    if (onSaveWidgets) onSaveWidgets(updated);
  }, [widgets, onSaveWidgets]);

  // Widgets visibles
  const visibleWidgets = useMemo(() => {
    return widgets.filter(w => {
      if (!w.visible) return false;
      const norm = normalizeWidgetId(w.id);
      if (
        norm === 'trm' || 
        norm === 'trm_oficial' || 
        w.id === 'trm' || 
        w.id === 'trm_oficial' ||
        norm === 'liquid_balance' ||
        norm === 'available_balance' ||
        norm === 'my_accounts' ||
        norm === 'accounts'
      ) return false;
      if (allowedWidgetIds && Array.isArray(allowedWidgetIds)) {
        if (!allowedWidgetIds.includes(norm) && !allowedWidgetIds.includes(w.id)) return false;
      }
      return getWidget ? Boolean(getWidget(w.id)) : true;
    });
  }, [widgets, allowedWidgetIds, getWidget]);

  // Widgets ocultos (para la bandeja inferior durante reorganización)
  const hiddenWidgets = useMemo(() => {
    const list = widgets.filter((w) => {
      const norm = normalizeWidgetId(w.id);
      if (
        norm === 'liquid_balance' ||
        norm === 'available_balance' ||
        norm === 'my_accounts' ||
        norm === 'accounts'
      ) return false;
      return w.visible === false || w.hidden === true;
    });
    const visibleIds = new Set(visibleWidgets.map(w => normalizeWidgetId(w.id)));
    const existingHiddenIds = new Set(list.map(w => normalizeWidgetId(w.id)));

    DEFAULT_WIDGETS_CONFIG.forEach(dw => {
      const norm = normalizeWidgetId(dw.id);
      if (
        norm === 'trm' || 
        norm === 'trm_oficial' ||
        norm === 'liquid_balance' ||
        norm === 'available_balance' ||
        norm === 'my_accounts' ||
        norm === 'accounts'
      ) return;
      if (allowedWidgetIds && Array.isArray(allowedWidgetIds) && !allowedWidgetIds.includes(norm)) return;
      if (!visibleIds.has(norm) && !existingHiddenIds.has(norm)) {
        list.push({ ...dw, visible: false, hidden: true });
      }
    });
    return list;
  }, [widgets, visibleWidgets, allowedWidgetIds]);

  return {
    widgets,
    setWidgets,
    visibleWidgets,
    hiddenWidgets,
    isReordering,
    setIsReordering,
    draggedIndex,
    setDraggedIndex,
    isDragging: draggedIndex !== null && draggedIndex !== undefined,
    handlePressStart,
    handlePressEnd,
    handleSwapWidgets,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleFinishReordering,
    handleToggleVisibility,
    longPressTimerRef,
    pressedIndexRef,
    draggedIndexRef,
    widgetsRef,
    isReorderingRef,
    touchStartPosRef
  };
}

export default useWidgetReorder;
