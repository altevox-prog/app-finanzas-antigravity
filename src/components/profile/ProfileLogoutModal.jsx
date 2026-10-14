import React from 'react';
import { LogOut } from 'lucide-react';

/**
 * ProfileLogoutModal
 * Modal de confirmación para cerrar sesión en la cuenta activa de Google / Supabase.
 */
export default function ProfileLogoutModal({
  isOpen,
  onClose,
  onConfirm,
  isLoggingOut = false,
}) {
  if (isOpen === false) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-3xl border border-slate-200/80 dark:border-white/[0.08] shadow-2xl p-5 flex flex-col items-center text-center animate-slide-up bg-white dark:bg-zinc-900"
      >
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3 text-rose-500">
          <LogOut className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">¿Cerrar Sesión?</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-4 leading-relaxed">
          Se desconectará la cuenta de Google activa manteniendo tus datos locales protegidos en este dispositivo.
        </p>
        <div className="flex w-full gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoggingOut}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}
