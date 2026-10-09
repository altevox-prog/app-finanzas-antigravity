/**
 * share-modal.js
 * Script defensivo para el modal de compartir.
 * Evita el error 'Cannot read properties of null (reading addEventListener)'.
 */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  function initShareModal() {
    const ids = [
      'share-btn',
      'shareModal',
      'share-modal',
      'btn-share-receipt',
      'btn-download-receipt',
      'share-receipt-content',
      'btn-share'
    ];

    ids.forEach(function (id) {
      const el = document.getElementById(id);
      if (el && typeof el.addEventListener === 'function') {
        el.addEventListener('click', function () {
          // Manejador seguro y defensivo
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', initShareModal);
    }
  } else {
    initShareModal();
  }
})();
