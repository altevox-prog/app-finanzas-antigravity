/**
 * share-modal.js
 * Módulo defensivo para el modal de compartir.
 * Evita el error 'Cannot read properties of null (reading addEventListener)'.
 */

export function safeAddEventListener(target, event, handler, options) {
  if (!target || !event || typeof handler !== 'function') {
    return () => {};
  }

  const el = typeof target === 'string'
    ? (typeof document !== 'undefined' ? (document.getElementById(target) || document.querySelector(target)) : null)
    : target;

  if (el && typeof el.addEventListener === 'function') {
    el.addEventListener(event, handler, options);
    return () => {
      if (el && typeof el.removeEventListener === 'function') {
        el.removeEventListener(event, handler, options);
      }
    };
  }

  return () => {};
}

export function initShareModalListeners() {
  if (typeof document === 'undefined') return;

  const ids = [
    'share-btn',
    'shareModal',
    'share-modal',
    'btn-share-receipt',
    'btn-download-receipt',
    'share-receipt-content',
    'btn-share'
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el && typeof el.addEventListener === 'function') {
      el.addEventListener('click', () => {
        // Manejador protegido
      });
    }
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener?.('DOMContentLoaded', initShareModalListeners);
  } else {
    initShareModalListeners();
  }
}

export default {
  safeAddEventListener,
  initShareModalListeners
};
