import React from 'react';
import { 
  Moon, 
  Sun, 
  Coins, 
  RefreshCw 
} from 'lucide-react';
import UpdateAppButton from '../../UpdateAppButton';

/**
 * ProfileSystemTab
 * Subcomponente independiente para la pestaña "Ajustes & Sistema"
 * del Centro de Control / Perfil.
 * Incluye:
 * - Apariencia y Tema (Selector Claro / Oscuro)
 * - Preferencias de Moneda (Toggle permitir decimales en montos)
 * - Versión del Sistema y botón de actualización PWA
 */
export default function ProfileSystemTab({
  theme = 'dark',
  onThemeChange,
  enableDecimals = false,
  toggleEnableDecimals
}) {
  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. Alternador de Modo Claro / Modo Oscuro */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Apariencia y Tema
          </h3>
        </div>

        <div 
          className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                {theme === 'dark' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">
                  Modo {theme === 'dark' ? 'Oscuro' : 'Claro'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {theme === 'dark' ? 'Interfaz nocturna optimizada de bajo brillo.' : 'Interfaz clara de alto contraste.'}
                </p>
              </div>
            </div>

            {/* Selector de Tema */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-200/60 dark:bg-white/5 border border-slate-300/40 dark:border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => onThemeChange?.('light')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Claro</span>
              </button>
              <button
                type="button"
                onClick={() => onThemeChange?.('dark')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Oscuro</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Switch Permitir decimales en montos */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <Coins className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Preferencias de Moneda
          </h3>
        </div>

        <div 
          className="p-1 sm:p-1.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90"
        >
          <div 
            onClick={toggleEnableDecimals}
            className="min-h-[48px] p-2.5 sm:p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors gap-3 select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                <Coins className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">
                  Permitir decimales en montos
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Habilita 2 decimales para precisión contable o transacciones en USD.
                </p>
              </div>
            </div>

            <div className="relative inline-flex items-center shrink-0 pointer-events-none">
              <input 
                type="checkbox" 
                checked={Boolean(enableDecimals)} 
                readOnly
                className="sr-only peer" 
              />
              <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bloque de Versión de la aplicación y Buscar actualización */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center gap-2 px-1">
          <RefreshCw className="w-4 h-4 text-emerald-500" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Versión del Sistema
          </h3>
        </div>

        <UpdateAppButton />

        <div className="px-1 text-center">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium tabular-nums">
            Monety v1.0.0 (Producción PWA)
          </span>
        </div>
      </div>
    </div>
  );
}
