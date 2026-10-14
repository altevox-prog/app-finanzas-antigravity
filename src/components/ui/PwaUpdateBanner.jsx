import React from 'react';
import { RefreshCw, X } from 'lucide-react';

/**
 * PwaUpdateBanner
 * Notificación flotante de nueva versión disponible para la PWA.
 */
export default function PwaUpdateBanner({ onUpdate, onClose }) {
  return (
    <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-4 z-50 animate-slide-up">
      <div className="bg-slate-900/95 dark:bg-zinc-900/95 border border-emerald-500/40 text-white p-3 sm:p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 ring-1 ring-emerald-500/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4 animate-spin" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-[13px] font-bold tracking-tight truncate leading-tight">
              ¡Nueva actualización lista!
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              Mejoras y nuevas funciones disponibles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onUpdate || (() => window.location.reload())}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            Actualizar ahora
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
            title="Cerrar aviso"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
