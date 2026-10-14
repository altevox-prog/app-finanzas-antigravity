import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toaster({ position = 'top-right' }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToastEvent = (e) => {
      const { message, title, description, type = 'success', id = Date.now() + Math.random() } = e.detail || {};
      if (!message && !title) return;

      const newToast = { id, message, title, description, type };
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
      className={`fixed ${positionClasses} z-[999999] pointer-events-none flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full p-2 sm:p-0`}
    >
      {toasts.map((t) => {
        const isError = t.type === 'error';
        const isInfo = t.type === 'info' || t.type === 'warning';
        const isSuccess = !isError && !isInfo;

        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] rounded-xl shadow-xl px-4 py-3 min-w-[280px] max-w-md flex items-center gap-3 animate-slide-down transition-all duration-300"
          >
            {/* Ícono Semántico */}
            <div className="shrink-0">
              {isError && (
                <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
              {isInfo && (
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Info className="w-4 h-4" />
                </div>
              )}
              {isSuccess && (
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Texto de Mensaje y Descripción */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-zinc-100 leading-snug break-words">
                {t.title || t.message}
              </p>
              {t.title && t.message && t.title !== t.message && (
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-normal break-words">
                  {t.message}
                </p>
              )}
              {t.description && (
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-normal break-words">
                  {t.description}
                </p>
              )}
            </div>

            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 p-1 rounded-md transition-colors cursor-pointer shrink-0"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
