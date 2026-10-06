/**
 * Sistema Global de Notificaciones Toast de Presu App
 * Permite invocar toast.success, toast.error, toast.info desde cualquier componente
 */

export const toast = {
  success: (message) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: { message, type: 'success', id: Date.now() + Math.random() }
        })
      );
    }
  },
  error: (message) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: { message, type: 'error', id: Date.now() + Math.random() }
        })
      );
    }
  },
  info: (message) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: { message, type: 'info', id: Date.now() + Math.random() }
        })
      );
    }
  }
};

export default toast;
