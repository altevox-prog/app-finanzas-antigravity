import React from 'react';
import { LogOut } from 'lucide-react';

/**
 * ProfileFooter
 * Barra de acciones inferior (pie de página) del modal de perfil.
 * Muestra el nombre de usuario y nota informativa de almacenamiento local,
 * junto con el botón de acción rápida para cerrar sesión.
 */
export default function ProfileFooter({
  currentView = 'main',
  userProfile,
  onLogoutClick,
}) {
  if (currentView !== 'main') return null;

  return (
    <div 
      className="p-3.5 sm:p-4 border-t border-slate-200/80 dark:border-white/[0.08] shrink-0 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-black/40 backdrop-blur-md"
    >
      <div className="min-w-0 flex-1 hidden sm:block">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
          {userProfile?.name || 'Usuario'}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
          Tus datos se guardan únicamente en este dispositivo
        </p>
      </div>

      <button
        type="button"
        onClick={onLogoutClick}
        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm ml-auto"
        title="Cerrar sesión"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        <span>Cerrar sesión</span>
      </button>
    </div>
  );
}
