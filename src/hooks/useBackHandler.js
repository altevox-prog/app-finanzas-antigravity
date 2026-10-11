import { useEffect, useRef } from 'react';

/**
 * Hook para soportar el gesto de 'Volver Atrás' de Android en modales PWA.
 * Cada vez que se abre un modal, introduce un estado en el historial de navegación
 * para que el gesto de retroceso del sistema cierre el modal en lugar de salirse de la PWA.
 */
export function useBackHandler(isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.history || !isOpen) return;

    const modalId = `modal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const mountTime = Date.now();
    let isPopped = false;

    try {
      window.history.pushState({ modalOpen: true, modalId }, '');
    } catch (e) {
      console.warn('History pushState no soportado:', e);
    }

    const handlePopState = (event) => {
      // 1. Evitar auto-cierre prematuro por popstates espurios durante el ciclo de montaje (< 120ms)
      if (Date.now() - mountTime < 120) {
        return;
      }

      // 2. Si el estado del historial aún contiene este modalId, no es una navegación hacia atrás
      if (event.state?.modalId === modalId) {
        return;
      }

      isPopped = true;
      if (typeof onCloseRef.current === 'function') {
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Revertir historial solo si se cerró por UI externa y el tope del stack aún es este modal
      try {
        if (!isPopped && window.history?.state?.modalId === modalId) {
          window.history.back();
        }
      } catch (e) {
        // ignore
      }
    };
  }, [isOpen]);
}

export default useBackHandler;
