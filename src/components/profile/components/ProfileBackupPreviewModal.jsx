import React from 'react';
import { Database } from 'lucide-react';

/**
 * ProfileBackupPreviewModal
 * Modal flotante con Backdrop que se muestra cuando `backupPreview` está presente,
 * resumiendo la cantidad de movimientos, inversiones y cuentas antes de restaurar.
 */
export default function ProfileBackupPreviewModal({
  backupPreview,
  onCancel,
  onConfirm,
}) {
  if (!backupPreview) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900 shadow-2xl p-5 flex flex-col items-center text-center animate-slide-up"
      >
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
          <Database className="w-6 h-6 text-[#FF9500]" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirmar Restauración</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 mb-4">
          Se sobrescribirán tus datos actuales con la copia de seguridad. ¿Deseas continuar?
        </p>
        
        <div className="w-full space-y-2 mb-5">
          <div className="flex justify-between items-center p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-zinc-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">Movimientos</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {backupPreview.summary?.transactionsCount || 0}
            </span>
          </div>
          <div className="flex justify-between items-center p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-zinc-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">Inversiones</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {backupPreview.summary?.investmentsCount || 0}
            </span>
          </div>
          <div className="flex justify-between items-center p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-zinc-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">Cuentas</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {backupPreview.summary?.accountsCount || 0}
            </span>
          </div>
        </div>

        <div className="flex w-full gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-zinc-200 text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#FF9500] hover:bg-[#E58600] text-white text-sm font-bold transition-colors cursor-pointer"
          >
            Restaurar
          </button>
        </div>
      </div>
    </div>
  );
}
