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
    <div className="w-full p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
          <RefreshCw className="w-4.5 h-4.5" />
        </div>
        <div className="flex flex-col text-left min-w-0">
          <span className="font-semibold text-sm text-slate-900 dark:text-zinc-100 whitespace-nowrap">
            Monety
          </span>
          <span className="text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap mt-0.5">
            {feedbackMsg || `v${APP_VERSION}`}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCheckOrUpdate}
        disabled={isLoading}
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap shadow-sm transition-all shrink-0 active:scale-95 text-white cursor-pointer ${
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
            ? 'Buscando...'
            : isUpToDate
            ? 'Al día'
            : 'Actualizar'}
        </span>
      </button>
    </div>
  );
}
