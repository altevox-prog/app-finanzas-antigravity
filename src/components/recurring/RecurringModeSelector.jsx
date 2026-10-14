import React from 'react';
import { Zap, Bell } from 'lucide-react';

/**
 * RecurringModeSelector
 * Selector de modo de ejecución para pagos recurrentes:
 * Automático (se registra directamente al vencer) vs Manual (recordatorio por confirmar).
 *
 * @param {Object} props
 * @param {string} props.mode Modo actual seleccionado ('auto' | 'manual')
 * @param {Function} props.setMode Setter para actualizar el modo
 * @param {boolean} [props.disabled] Estado de deshabilitado
 */
export default function RecurringModeSelector({
  mode = 'auto',
  setMode,
  disabled = false
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold opacity-60 uppercase tracking-wider mb-1.5">
        Modo de Ejecución *
      </label>
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setMode?.('auto')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            mode === 'auto'
              ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 ring-1 ring-emerald-500 shadow-sm'
              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 opacity-70 hover:opacity-100'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Zap className={`w-3.5 h-3.5 ${mode === 'auto' ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-40'}`} />
              Automático
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              Auto
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
            Se anota solo en tu balance al llegar la fecha
          </p>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setMode?.('manual')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            mode === 'manual'
              ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 ring-1 ring-amber-500 shadow-sm'
              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 opacity-70 hover:opacity-100'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Bell className={`w-3.5 h-3.5 ${mode === 'manual' ? 'text-amber-500' : 'opacity-40'}`} />
              Por Confirmar
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
              Manual
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
            Te avisa para que revises y apruebes el registro
          </p>
        </button>
      </div>
    </div>
  );
}
