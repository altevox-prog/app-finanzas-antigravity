/**
 * pwaUpdate.js
 * Utilidades para verificación de nueva versión y ciclo de vida del Service Worker (PWA / Vercel).
 */

export const APP_VERSION = '1.0.0';

/**
 * Obtiene el identificador de compilación local actual.
 */
export function getLocalBuildId() {
  if (typeof __APP_BUILD_TIME__ !== 'undefined') {
    return __APP_BUILD_TIME__;
  }
  return (typeof localStorage !== 'undefined' && localStorage.getItem('app_build_id')) || APP_VERSION;
}

/**
 * Verifica si existe una nueva versión disponible comparando el Service Worker
 * y consultando /version.json en Vercel anti-caché.
 * 
 * @returns {Promise<{ hasUpdate: boolean, reason: string, remoteVersion: string|null, registration: ServiceWorkerRegistration|null }>}
 */
export async function checkForAppUpdates() {
  let hasUpdate = false;
  let reason = 'none';
  let remoteVersion = null;
  let registration = null;

  // 1. Verificación del Service Worker nativo
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        // Forzar actualización sin usar la caché HTTP del navegador
        try {
          if ('updateViaCache' in registration) {
            registration.updateViaCache = 'none';
          }
        } catch (_) {}

        await registration.update();

        // Si ya hay un worker esperando en segundo plano
        if (registration.waiting) {
          hasUpdate = true;
          reason = 'sw_waiting';
        } else if (registration.installing) {
          hasUpdate = true;
          reason = 'sw_installing';
        }
      }
    } catch (swErr) {
      console.warn('[PWA] Error en registro SW:', swErr);
    }
  }

  // 2. Verificación directa contra Vercel vía /version.json
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (res.ok) {
      const data = await res.json();
      remoteVersion = data?.buildId || data?.buildTime || data?.version;
      const localVersion = getLocalBuildId();

      if (localVersion && remoteVersion && localVersion !== remoteVersion) {
        hasUpdate = true;
        reason = 'version_mismatch';
      } else if (typeof localStorage !== 'undefined' && !localStorage.getItem('app_build_id') && remoteVersion) {
        localStorage.setItem('app_build_id', remoteVersion);
      }
    }
  } catch (fetchErr) {
    console.warn('[PWA] Error consultando /version.json:', fetchErr);
  }

  return {
    hasUpdate,
    reason,
    remoteVersion,
    registration
  };
}

/**
 * Aplica la actualización encontrada:
 * 1. Envía SKIP_WAITING al worker activo y al worker waiting
 * 2. Limpia todos los caches del navegador (CacheStorage)
 * 3. Actualiza el build id en localStorage
 * 4. Recarga la ventana para cargar la versión fresca
 */
export async function applyAppUpdate(remoteVersion = null, registration = null) {
  try {
    // 1. Notificar al Service Worker para omitir espera y tomar control inmediato
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = registration || (await navigator.serviceWorker.getRegistration());

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      }

      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      if (reg?.installing) {
        reg.installing.postMessage({ type: 'SKIP_WAITING' });
      }

      if (reg?.active) {
        reg.active.postMessage({ type: 'SKIP_WAITING' });
      }
    }

    // 2. Limpiar todos los caches obsoletos del navegador (CacheStorage)
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      } catch (cErr) {
        console.warn('[PWA] Error limpiando CacheStorage:', cErr);
      }
    }

    // 3. Persistir la nueva versión en localStorage
    if (remoteVersion && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('app_build_id', remoteVersion);
      } catch (_) {}
    }

    // 4. Esperar un instante para que el SW tome control y recargar
    setTimeout(() => {
      window.location.reload();
    }, 250);
  } catch (err) {
    console.error('[PWA] Error aplicando actualización:', err);
    window.location.reload();
  }
}

