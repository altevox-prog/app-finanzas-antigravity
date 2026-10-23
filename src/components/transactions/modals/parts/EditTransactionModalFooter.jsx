import React from 'react';
import { Trash2 } from 'lucide-react';

export default function EditTransactionModalFooter({
  transactionId, onDelete, onClose, isInvalidTransfer, isTransfer
}) {
  const handleDelete = () => {
    if (window.confirm('¿Eliminar este movimiento?')) {
      onDelete?.(transactionId);
      onClose?.();
    }
  };

  return (
    <div className="shrink-0 px-6 py-4 bg-slate-50/50 dark:bg-zinc-900/90 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={handleDelete}
        className="h-11 px-3.5 text-sm font-medium text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center gap-1.5 cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
        <span>Eliminar</span>
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-11 px-4 rounded-lg font-medium text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-200/60 cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isInvalidTransfer}
          className={`h-11 px-5 rounded-lg font-medium text-sm shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 text-white cursor-pointer transition-colors ${
            isInvalidTransfer
              ? 'opacity-50 cursor-not-allowed bg-zinc-600'
              : isTransfer
                ? 'bg-blue-600 hover:bg-blue-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
