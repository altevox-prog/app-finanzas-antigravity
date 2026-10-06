import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toaster({ position = 'top-right' }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToastEvent = (e) => {
      const { message, type = 'success', id = Date.now() + Math.random() } = e.detail || {};
      if (!message) return;

      const newToast = { id, message, type };
      setToasts((prev) => [...prev.slice(-3), newToast]); // Mantener hasta 4 toasts visibles

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };

    window.addEventListener('app-toast', handleToastEvent);
    return () => window.removeEventListener('app-toast', handleToastEvent);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  const positionClasses = 
    position === 'top-right' 
      ? 'top-4 right-4 sm:top-5 sm:right-5 items-end' 
      : position === 'top-left'
      ? 'top-4 left-4 sm:top-5 sm:left-5 items-start'
      : 'top-4 left-1/2 -translate-x-1/2 items-center';

  return (
    <div 
      aria-live="polite"
      className={`fixed ${positionClasses} z-[999999] pointer-events-none flex flex-col gap-2.5 max-w-sm w-full p-2 sm:p-0`}
    >
      {toasts.map((t) => {
        const isError = t.type === 'error';
        const isInfo = t.type === 'info';
        const isSuccess = !isError && !isInfo;

        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto w-full px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 animate-slide-down transition-all duration-300 ${
              isError
                ? 'bg-rose-950/95 border-rose-500/40 text-rose-200 shadow-rose-950/50'
                : isInfo
                ? 'bg-slate-900/95 dark:bg-[#121622]/95 border-blue-500/40 text-blue-200 shadow-black/40'
                : 'bg-slate-900/95 dark:bg-[#121622]/95 border-emerald-500/40 text-emerald-200 shadow-black/40'
            }`}
          >
            {/* Ícono de Estado */}
            <div className="shrink-0">
              {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {isInfo && <Info className="w-4 h-4 text-blue-400" />}
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>

            {/* Texto de Mensaje */}
            <span className="flex-1 text-xs font-semibold tracking-tight leading-snug break-words">
              {t.message}
            </span>

            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
