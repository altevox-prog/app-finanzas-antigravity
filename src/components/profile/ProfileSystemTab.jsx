import React from 'react';
import { 
  Moon, 
  Sun, 
  Coins, 
  AlertTriangle 
} from 'lucide-react';
import UpdateAppButton from '../ui/UpdateAppButton';

/**
 * ProfileSystemTab
 * Subcomponente independiente para la pestaña "Ajustes & Sistema"
 * del Centro de Control / Perfil.
 * Incluye:
 * - Apariencia y Tema (Selector Claro / Oscuro)
 * - Preferencias de Moneda (Toggle permitir decimales en montos)
 * - Versión del Sistema y botón de actualización PWA
 * - Zona de peligro (Restablecimiento y borrado de datos)
 */
export default function ProfileSystemTab({
  theme = 'dark',
  onThemeChange,
  enableDecimals = false,
  toggleEnableDecimals,
  onResetData
}) {
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 1. Tarjeta de Tema / Apariencia */}
      <div className="p-3 sm:p-3.5 rounded-2xl border border-white/70 dark:border-white/[0.08] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            {theme === 'dark' ? <Moon className="w-4.5 h-4.5 text-indigo-400" /> : <Sun className="w-4.5 h-4.5 text-amber-500" />}
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">
            Tema
          </p>
        </div>

        {/* Selector de Tema Glass Unificado */}
        <div className="inline-flex p-1 rounded-xl bg-white/40 dark:bg-white/[0.04] backdrop-blur-md border border-white/60 dark:border-white/[0.08] shrink-0 max-w-full overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => onThemeChange?.('light')}
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-bold shadow-xs backdrop-blur-sm'
                : 'text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white font-semibold hover:bg-white/40 dark:hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <Sun className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-zinc-400'}`} />
            <span>Claro</span>
          </button>
          <button
            type="button"
            onClick={() => onThemeChange?.('dark')}
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-bold shadow-xs backdrop-blur-sm'
                : 'text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white font-semibold hover:bg-white/40 dark:hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <Moon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-zinc-400'}`} />
            <span>Oscuro</span>
          </button>
        </div>
      </div>

      {/* 2. Switch Permitir decimales en montos */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 px-1">
          <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Preferencias de moneda
          </h3>
        </div>

        <div 
          className="p-1 sm:p-1.5 rounded-2xl border border-white/70 dark:border-white/[0.08] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md shadow-xs"
        >
          <div 
            onClick={toggleEnableDecimals}
            className="min-h-[48px] p-2.5 sm:p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/60 dark:hover:bg-white/[0.06] transition-colors gap-3 select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                <Coins className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">
                  Permitir decimales en montos
                </p>
                <p className="text-[11px] text-slate-700 dark:text-zinc-300 font-medium">
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

      {/* 3. Tarjeta de Versión del sistema y Actualización */}
      <UpdateAppButton />

      {/* 4. Zona de peligro: restablecer datos */}
      <div className="pt-2">
        <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-500/15 backdrop-blur-md space-y-2.5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-rose-700 dark:text-rose-300">Zona de peligro: restablecer datos</h4>
              <p className="text-[11px] text-rose-950/80 dark:text-rose-200/90 font-medium mt-0.5 leading-relaxed">
                Elimina de forma permanente todas las transacciones, cuentas e inversiones en la nube y en este dispositivo, manteniendo tu sesión activa.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onResetData}
            className="w-full py-2.5 px-3 rounded-xl border border-rose-500/40 bg-rose-500/20 hover:bg-rose-500/30 text-rose-800 dark:text-rose-200 font-bold text-xs transition-all cursor-pointer active:scale-98 shadow-xs"
          >
            Restablecer y borrar todos los datos
          </button>
        </div>
      </div>
    </div>
  );
}
