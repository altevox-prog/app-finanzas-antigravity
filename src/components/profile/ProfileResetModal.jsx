import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ProfileResetModal
 * Modal de doble confirmación para borrado definitivo de datos (Zona de Peligro).
 * Requiere que el usuario escriba la palabra "BORRAR" para habilitar el botón de acción.
 */
export default function ProfileResetModal({
  isOpen,
  onClose,
  confirmDeleteText = '',
  setConfirmDeleteText,
  isResetting = false,
  onConfirm,
}) {
  if (isOpen === false) return null;

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const isConfirmed = confirmDeleteText.trim().toUpperCase() === 'BORRAR';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-2xl border border-rose-500/40 shadow-2xl p-5 sm:p-6 flex flex-col items-center text-center animate-slide-up bg-white dark:bg-zinc-900"
      >
        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mb-3.5 text-rose-500 ring-4 ring-rose-500/10">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          ¿Estás completamente seguro?
        </h3>

        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 mb-2 leading-relaxed">
          Esta acción eliminará de forma permanente todas tus cuentas, transacciones, deudas y configuraciones en la nube y en este dispositivo. No podrás recuperar esta información.
        </p>

        <div className="w-full my-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-left">
          <label htmlFor="confirm-delete-input" className="block text-[11px] font-semibold text-rose-600 dark:text-rose-400 mb-1.5 text-center">
            Escribe <span className="font-extrabold uppercase tracking-widest text-rose-700 dark:text-rose-300">BORRAR</span> para confirmar:
          </label>
          <input
            id="confirm-delete-input"
            type="text"
            value={confirmDeleteText}
            onChange={(e) => setConfirmDeleteText && setConfirmDeleteText(e.target.value)}
            placeholder="Escribe BORRAR"
            autoComplete="off"
            spellCheck="false"
            disabled={isResetting}
            className="w-full px-3 py-2 text-center text-xs font-bold tracking-widest rounded-xl bg-white dark:bg-black/60 border border-rose-500/30 text-rose-600 dark:text-rose-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          />
        </div>

        <p className="text-[11px] text-rose-500 font-semibold mb-4">
          ⚠️ Esta acción no se puede deshacer.
        </p>

        <div className="flex w-full gap-2">
          <button
            type="button"
            disabled={isResetting}
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!isConfirmed || isResetting}
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isConfirmed || isResetting
                ? 'bg-rose-500/20 text-rose-300/60 dark:text-rose-400/40 cursor-not-allowed border border-rose-500/10 opacity-70'
                : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95 shadow-md shadow-rose-600/30'
            }`}
          >
            {isResetting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Eliminando...</span>
              </>
            ) : (
              'Sí, eliminar todo definitivamente'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
