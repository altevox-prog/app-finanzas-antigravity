/**
 * Sistema Global de Notificaciones Toast de Presu App
 * Permite invocar toast.success, toast.error, toast.info desde cualquier componente
 */

export const toast = {
  success: (message, options) => {
    if (typeof window !== 'undefined') {
      const detail = typeof message === 'object' && message !== null
        ? { type: 'success', id: Date.now() + Math.random(), ...message }
        : { message, ...(typeof options === 'object' && options !== null ? options : {}), type: 'success', id: Date.now() + Math.random() };
      window.dispatchEvent(
        new CustomEvent('app-toast', { detail })
      );
    }
  },
  error: (message, options) => {
    if (typeof window !== 'undefined') {
      const detail = typeof message === 'object' && message !== null
        ? { type: 'error', id: Date.now() + Math.random(), ...message }
        : { message, ...(typeof options === 'object' && options !== null ? options : {}), type: 'error', id: Date.now() + Math.random() };
      window.dispatchEvent(
        new CustomEvent('app-toast', { detail })
      );
    }
  },
  info: (message, options) => {
    if (typeof window !== 'undefined') {
      const detail = typeof message === 'object' && message !== null
        ? { type: 'info', id: Date.now() + Math.random(), ...message }
        : { message, ...(typeof options === 'object' && options !== null ? options : {}), type: 'info', id: Date.now() + Math.random() };
      window.dispatchEvent(
        new CustomEvent('app-toast', { detail })
      );
    }
  }
};

export default toast;
