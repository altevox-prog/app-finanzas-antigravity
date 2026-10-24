import React from 'react';
import { Trash2 } from 'lucide-react';

export default function AccountDeleteModal({ account, onClose, onConfirm }) {
  if (!account) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-5 border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">¿Eliminar cuenta?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <p className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-white/[0.06] text-xs text-slate-700 dark:text-zinc-200 font-medium">
          Vas a eliminar la cuenta <strong className="text-slate-900 dark:text-white font-bold">{account.name}</strong>.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 cursor-pointer text-center">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer text-center shadow-sm">
            Eliminar cuenta
          </button>
        </div>
      </div>
    </div>
  );
}
