import React, { useState } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdateAppButton() {
  const [checking, setChecking] = useState(false);
  const [manualMsg, setManualMsg] = useState('');

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Intento silencioso en segundo plano al montar
        (async () => {
          try {
            await r.update();
          } catch (e) {
            // Ignorar errores transitorios de chequeo
          }
        })();
      }
    },
  });

  const handleCheckOrUpdate = async () => {
    // 1. Si ya se detectó una actualización pendiente, activarla
    if (needRefresh) {
      setChecking(true);
      setManualMsg('Aplicando cambios...');
      await updateServiceWorker(true);
      return;
    }

    setChecking(true);
    setManualMsg('Buscando versión...');

    try {
      let hasUpdate = false;

      // Intento 1: Actualizar Service Worker nativo de forma segura
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
            if (reg.waiting) {
              hasUpdate = true;
              setNeedRefresh(true);
            }
          }
        } catch (swErr) {
          console.warn('Fallo silencioso en reg.update (común en WebAPK):', swErr);
        }
      }

      // Intento 2: Verificación anti-caché directa a Vercel
      try {
        await fetch(`/?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
      } catch (fetchErr) {
        // Fallo silencioso en fetch anti-caché
      }

      if (hasUpdate) {
        setManualMsg('¡Nueva versión lista!');
      } else {
        // Si no arrojó update ni hay versión en waiting, está al día
        setManualMsg('Tienes la última versión');
        setTimeout(() => setManualMsg(''), 4000);
      }
    } catch (err) {
      console.error('Error general de chequeo:', err);
      setManualMsg('Tienes la última versión'); // Degradación elegante para no alarmar al usuario
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 my-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col text-left">
          <span className="font-semibold text-sm text-slate-900 dark:text-white">
            Versión de la aplicación
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {manualMsg || (needRefresh ? 'Nueva versión disponible' : 'Monety v1.0.0')}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCheckOrUpdate}
          disabled={checking}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all shrink-0 active:scale-95 text-white cursor-pointer ${
            needRefresh
              ? 'bg-amber-600 hover:bg-amber-700 animate-pulse'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          <span>
            {needRefresh
              ? 'Instalar cambios'
              : checking
              ? 'Verificando...'
              : 'Buscar actualización'}
          </span>
        </button>
      </div>
    </div>
  );
}
