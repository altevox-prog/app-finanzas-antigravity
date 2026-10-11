import { useEffect, useRef } from 'react';

/**
 * useScrollRestoration
 * Hook para guardar y restaurar automáticamente la posición de scroll
 * por vista/pestaña (activeTab) en ventana y contenedor principal con scroll.
 * Cumple con el Principio 9 de Ergonomía Móvil y Persistencia de Scroll.
 *
 * @param {string} activeKey - Clave identificadora de la vista activa (e.g., activeTab)
 * @param {React.RefObject} containerRef - Referencia opcional al contenedor principal (mainContentRef)
 */
export function useScrollRestoration(activeKey, containerRef = null) {
  // Diccionario en memoria para registrar posiciones { [key]: scrollY }
  const scrollPositions = useRef({});
  // Clave previa para guardar la posición antes del cambio de pestaña
  const prevKeyRef = useRef(activeKey);
  const isRestoringRef = useRef(false);

  // Guarda la posición actual de scroll asociada a la clave saliente o activa
  const recordCurrentScroll = () => {
    if (isRestoringRef.current) return;
    const currentKey = prevKeyRef.current;
    if (!currentKey) return;

    let y = 0;
    if (containerRef?.current && containerRef.current.scrollTop > 0) {
      y = containerRef.current.scrollTop;
    } else if (typeof window !== 'undefined') {
      y = window.scrollY || (document.documentElement ? document.documentElement.scrollTop : 0) || (document.body ? document.body.scrollTop : 0);
    }

    scrollPositions.current[currentKey] = y;
  };

  // Escuchar eventos de scroll para actualizar la posición en tiempo real
  useEffect(() => {
    const handleScroll = () => {
      recordCurrentScroll();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const container = containerRef?.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [containerRef]);

  // Al cambiar activeKey, guardar la posición saliente y restaurar la entrante
  useEffect(() => {
    if (prevKeyRef.current === activeKey) return;

    // 1. Guardar la posición de la pestaña previa
    recordCurrentScroll();
    prevKeyRef.current = activeKey;

    // 2. Obtener posición guardada para la pestaña entrante (por defecto 0 si es la primera visita)
    const targetY = scrollPositions.current[activeKey] ?? 0;

    isRestoringRef.current = true;

    // 3. Restaurar en el siguiente frame para permitir que la vista entrante termine de renderizarse
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (containerRef?.current && containerRef.current.scrollTop !== undefined) {
          containerRef.current.scrollTo({ top: targetY, behavior: 'instant' });
          containerRef.current.scrollTop = targetY;
        }
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: targetY, behavior: 'instant' });
        }
        if (typeof document !== 'undefined') {
          if (document.documentElement) document.documentElement.scrollTop = targetY;
          if (document.body) document.body.scrollTop = targetY;
        }

        // Liberar el flag de restauración
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 50);
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [activeKey, containerRef]);

  // Permite reiniciar manualmente la posición registrada para una pestaña o la actual
  const resetScrollPosition = (key) => {
    const target = key || activeKey;
    scrollPositions.current[target] = 0;
    if (target === activeKey) {
      if (containerRef?.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'instant' });
        containerRef.current.scrollTop = 0;
      }
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  };

  return {
    scrollPositions,
    resetScrollPosition
  };
}

export default useScrollRestoration;
