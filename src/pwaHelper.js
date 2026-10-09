/**
 * Utilidades PWA — Solo activas en producción
 * En desarrollo (localhost / Vite dev) no se registra ni se actualiza
 * el Service Worker para evitar errores SecurityError de MIME type.
 */

export function initPWA() {
  // Guardia de entorno: solo ejecutar en producción
  const isProd = typeof import.meta !== 'undefined'
    ? import.meta.env?.PROD === true
    : (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');

  if (!isProd) {
    console.log('[PWA] Modo desarrollo — Service Worker desactivado.');
    return;
  }

  // 1. Garantizar que el almacenamiento local sea persistente
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    (async () => {
      try {
        const isPersisted = await navigator.storage.persist();
        if (isPersisted) {
          console.log('[PWA] Almacenamiento persistente: CONCEDIDO');
        }
      } catch (err) {
        // Fallo no crítico en navegadores que no soportan persist
      }
    })();
  }

  // 2. Actualizar SW cuando la app recupera el foco y recargar al actualizarse (solo producción)
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        (async () => {
          try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) await reg.update();
          } catch (err) {
            // Ignorar errores transitorios de red al actualizar SW
          }
        })();
      }
    });
  }
}
