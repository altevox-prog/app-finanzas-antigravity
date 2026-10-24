import { useEffect, useRef } from 'react';

// Pila global compartida en memoria para registrar modales abiertos en orden de apertura
const modalStack = [];
let isPopstateListenerActive = false;
let isProgrammaticBack = false;
let programmaticBackTimeout = null;

function globalPopstateHandler(event) {
  // Neutralizar el popstate si fue disparado programáticamente por la limpieza de un modal
  if (isProgrammaticBack) {
    isProgrammaticBack = false;
    if (programmaticBackTimeout) {
      clearTimeout(programmaticBackTimeout);
      programmaticBackTimeout = null;
    }
    event.stopImmediatePropagation?.();
    return;
  }

  if (modalStack.length === 0) return;

  // Solo el modal que está al frente de la pantalla (el último en el stack) debe cerrarse
  const topModal = modalStack[modalStack.length - 1];

  // Si el montaje es demasiado reciente (< 120ms), ignorar popstates espurios
  if (Date.now() - topModal.mountTime < 120) {
    return;
  }

  topModal.isPopped = true;
  if (typeof topModal.onClose === 'function') {
    topModal.onClose();
  }
}

function ensureGlobalListener() {
  if (typeof window === 'undefined' || isPopstateListenerActive) return;
  // Usar capture phase para interceptar y neutralizar popstates programáticos antes que cualquier otro listener
  window.addEventListener('popstate', globalPopstateHandler, true);
  isPopstateListenerActive = true;
}

/**
 * Hook para soportar el gesto de 'Volver Atrás' de Android en modales PWA.
 * Gestiona una pila jerárquica: al pulsar atrás, solo se cierra el modal superior.
 */
export function useBackHandler(isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.history || !isOpen) return;

    ensureGlobalListener();

    const modalId = `modal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const entry = {
      modalId,
      mountTime: Date.now(),
      isPopped: false,
      get onClose() {
        return onCloseRef.current;
      }
    };

    modalStack.push(entry);

    try {
      window.history.pushState({ modalOpen: true, modalId }, '');
    } catch (e) {
      console.warn('History pushState no soportado:', e);
    }

    return () => {
      // Remover de la pila
      const index = modalStack.findIndex((m) => m.modalId === modalId);
      const isTop = index === modalStack.length - 1;
      let wasPopped = false;

      if (index !== -1) {
        wasPopped = modalStack[index].isPopped;
        modalStack.splice(index, 1);
      }

      // Revertir historial solo si se cerró por botón de UI (cruz/guardar) y este modal era el tope
      try {
        if (!wasPopped && isTop && window.history?.state?.modalId === modalId) {
          isProgrammaticBack = true;
          if (programmaticBackTimeout) clearTimeout(programmaticBackTimeout);
          programmaticBackTimeout = setTimeout(() => {
            isProgrammaticBack = false;
            programmaticBackTimeout = null;
          }, 200);
          window.history.back();
        }
      } catch (e) {
        isProgrammaticBack = false;
      }
    };
  }, [isOpen]);
}
