import React from 'react';
import AppLogo from '../ui/AppLogo';

/**
 * SplashScreen - Pantalla de carga inicial con el isotipo oficial de Monety
 */
export default function SplashScreen({ message = 'Cargando tus finanzas...' }) {
  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 text-center select-none"
      style={{ backgroundColor: 'var(--bg-app, #080E0C)', color: 'var(--text-main, #F0FDF6)' }}
    >
      <div className="relative flex flex-col items-center animate-fadeIn">
        {/* Halo resplandeciente esmeralda */}
        <div className="absolute -inset-6 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />
        
        {/* App Logo */}
        <div className="relative mb-5 transform transition-transform hover:scale-105">
          <AppLogo size="xl" showText={false} iconClassName="shadow-2xl shadow-emerald-500/25 ring-1 ring-emerald-500/20" />
        </div>

        {/* Nombre de Marca */}
        <div className="flex items-center gap-2 mb-1.5">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Monety
          </h1>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        <p className="text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-8">
          Finanzas Personales
        </p>

        {/* Barra de progreso pulsante */}
        <div className="w-40 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-[#29D691] rounded-full animate-pulse w-3/4" />
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {message}
        </p>
      </div>
    </div>
  );
}

export { SplashScreen };
