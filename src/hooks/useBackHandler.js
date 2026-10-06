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
    if (typeof window === 'undefined' || !window.history) return;

    if (isOpen) {
      let isPopped = false;
      try {
        window.history.pushState({ modalOpen: true }, '');
      } catch (e) {
        console.warn('History pushState no soportado:', e);
      }

      const handlePopState = () => {
        isPopped = true;
        if (onCloseRef.current) {
          onCloseRef.current();
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        // Si el modal se cerró por UI (botón X, cancelar o guardar) y no por popstate,
        // revertimos la entrada de historial para mantener el stack limpio
        try {
          if (!isPopped && window.history?.state?.modalOpen) {
            window.history.back();
          }
        } catch (e) {
          // ignore
        }
      };
    }
  }, [isOpen]);
}

export default useBackHandler;
