/**
 * pwaUpdate.js
 * Utilidades para verificación de nueva versión y ciclo de vida del Service Worker (PWA / Vercel).
 */

export const APP_VERSION = '1.0.0';

export function getLocalBuildId() {
  if (typeof __APP_BUILD_TIME__ !== 'undefined') return __APP_BUILD_TIME__;
  return (typeof localStorage !== 'undefined' && localStorage.getItem('app_build_id')) || APP_VERSION;
}

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
        try {
          if ('updateViaCache' in registration) registration.updateViaCache = 'none';
        } catch (_) {}

        await registration.update();

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

  return { hasUpdate, reason, remoteVersion, registration };
}

/**
 * Aplica la actualización sincronizada con el ciclo de vida del Service Worker.
 */
export async function applyAppUpdate(remoteVersion = null, registration = null) {
  let reloaded = false;
  const triggerReload = () => {
    if (reloaded || typeof window === 'undefined') return;
    reloaded = true;
    window.location.reload();
  };

  try {
    // 1. Escuchar controllerchange y notificar SKIP_WAITING
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', triggerReload, { once: true });

      const reg = registration || (await navigator.serviceWorker.getRegistration());
      [navigator.serviceWorker.controller, reg?.waiting, reg?.installing, reg?.active].forEach((sw) => {
        sw?.postMessage?.({ type: 'SKIP_WAITING' });
      });
    }

    // 2. Limpiar caches obsoletos del navegador (CacheStorage)
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
      try { localStorage.setItem('app_build_id', remoteVersion); } catch (_) {}
    }

    // 4. Fallback de seguridad en caso de que controllerchange no dispare
    setTimeout(triggerReload, 1200);
  } catch (err) {
    console.warn('[PWA] Error aplicando actualización:', err);
    setTimeout(triggerReload, 1200);
  }
}
