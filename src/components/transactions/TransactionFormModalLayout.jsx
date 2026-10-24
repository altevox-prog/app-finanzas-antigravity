import React from 'react';
import { X } from 'lucide-react';
import { SubmitBtn, SuccessAlert } from './TransactionFeedback';

export default function TransactionFormModalLayout({
  onClose,
  onSubmit,
  handleSubmit,
  isSubmitting,
  showSuccess,
  type,
  children
}) {
  const handleFormSubmit = (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    const handler = onSubmit || handleSubmit;
    if (typeof handler === 'function') {
      handler(e);
    }
  };

  return (
    <div
      className="bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/90 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-slide-up pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="shrink-0 px-6 py-4 border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Nuevo movimiento</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Ingresa tus finanzas al instante</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
          {children}
          <SuccessAlert show={showSuccess} />
        </div>
        <div className="shrink-0 px-6 py-4 bg-slate-50/50 dark:bg-zinc-950 border-t border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-end gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-lg font-medium text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}
          <SubmitBtn type={type} isSubmitting={isSubmitting} />
        </div>
      </form>
    </div>
  );
}
