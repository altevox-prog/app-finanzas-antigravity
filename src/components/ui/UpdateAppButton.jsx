import React, { useState } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { checkForAppUpdates, applyAppUpdate, APP_VERSION } from '../../utils/pwaUpdate';

export default function UpdateAppButton() {
  const [status, setStatus] = useState('idle'); // 'idle' | 'checking' | 'updating' | 'up_to_date'
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const handleCheckOrUpdate = async () => {
    if (status === 'checking' || status === 'updating') return;

    // Estado 1 (Cargando)
    setStatus('checking');
    setFeedbackMsg('Buscando versión...');

    try {
      const result = await checkForAppUpdates();

      if (result.hasUpdate) {
        // Estado 2 (Hay actualización disponible)
        setStatus('updating');
        setFeedbackMsg('Nueva versión encontrada. Actualizando...');
        await applyAppUpdate(result.remoteVersion, result.registration);
      } else {
        // Estado 3 (Sin cambios)
        setStatus('up_to_date');
        setFeedbackMsg('Ya tienes instalada la versión más reciente');
        setTimeout(() => {
          setStatus('idle');
          setFeedbackMsg('');
        }, 2000);
      }
    } catch (err) {
      console.warn('[PWA] Error en verificación de versión:', err);
      setStatus('up_to_date');
      setFeedbackMsg('Ya tienes instalada la versión más reciente');
      setTimeout(() => {
        setStatus('idle');
        setFeedbackMsg('');
      }, 2000);
    }
  };

  const isChecking = status === 'checking';
  const isUpdating = status === 'updating';
  const isUpToDate = status === 'up_to_date';
  const isLoading = isChecking || isUpdating;

  return (
    <div className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 my-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col text-left min-w-0 flex-1">
          <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
            Versión de la aplicación
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {feedbackMsg || `Monety v${APP_VERSION} (Producción)`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCheckOrUpdate}
          disabled={isLoading}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all shrink-0 active:scale-95 text-white cursor-pointer ${
            isUpToDate
              ? 'bg-emerald-600'
              : isUpdating
              ? 'bg-indigo-600 animate-pulse'
              : isChecking
              ? 'bg-slate-700 opacity-90'
              : 'bg-emerald-600 hover:bg-emerald-700'
          } ${isLoading ? 'cursor-not-allowed opacity-90' : ''}`}
        >
          {isUpToDate ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          ) : (
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          )}
          <span>
            {isUpdating
              ? 'Actualizando...'
              : isChecking
              ? 'Buscando versión...'
              : isUpToDate
              ? 'Al día'
              : 'Buscar actualización'}
          </span>
        </button>
      </div>
    </div>
  );
}
