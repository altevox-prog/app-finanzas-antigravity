import React from 'react';
import { ArrowDownLeft, CheckCircle2 } from 'lucide-react';

/**
 * CDTLiquidationModal
 * Modal de confirmación y liquidación de certificados de depósito a término (CDT)
 * hacia una cuenta bancaria del usuario.
 */
export default function CDTLiquidationModal({
  liquidatingCDT,
  accounts = [],
  liquidationAccountId,
  setLiquidationAccountId,
  liquidationDate,
  setLiquidationDate,
  isSubmittingLiquidation = false,
  isSubmitting,
  isOpen,
  onClose,
  onConfirm,
}) {
  const isVisible = isOpen !== undefined ? isOpen : Boolean(liquidatingCDT);
  const submitting = Boolean(isSubmittingLiquidation || isSubmitting);

  if (!isVisible || !liquidatingCDT) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={() => !submitting && onClose && onClose()}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-modal-pop text-slate-900 dark:text-white"
      >
        {/* Cabecera del modal */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Liquidar CDT a Cuenta
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {liquidatingCDT.inv?.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Desglose financiero del CDT */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-white/[0.06] space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span>Capital invertido:</span>
            <span className="font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-200">
              ${Number(liquidatingCDT.inv?.investedAmount || liquidatingCDT.inv?.buyPrice || 0).toLocaleString('es-CO')}
            </span>
          </div>
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span>Rendimiento neto (+):</span>
            <span className="font-semibold font-mono tabular-nums">
              +${Number(liquidatingCDT.stats?.netReturn || 0).toLocaleString('es-CO')}
            </span>
          </div>
          {Number(liquidatingCDT.stats?.taxWithheld || 0) > 0 && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <span>Retención en la fuente (4%):</span>
              <span className="font-mono tabular-nums">
                -${Number(liquidatingCDT.stats.taxWithheld).toLocaleString('es-CO')}
              </span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white">Total a abonar:</span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              ${Number(liquidatingCDT.stats?.maturityTotal || 0).toLocaleString('es-CO')}
            </span>
          </div>
        </div>

        {/* Formulario: Cuenta destino y Fecha */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Cuenta de destino para abonar saldo *
            </label>
            {accounts && accounts.length > 0 ? (
              <select
                value={liquidationAccountId}
                onChange={(e) => setLiquidationAccountId && setLiquidationAccountId(e.target.value)}
                disabled={submitting}
                className="w-full text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type === 'savings' ? 'Ahorros' : acc.type === 'checking' ? 'Corriente' : acc.type || 'Cuenta'})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                No se encontraron cuentas bancarias registradas. El ingreso se registrará de forma general.
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Fecha de liquidación *
            </label>
            <input
              type="date"
              value={liquidationDate}
              onChange={(e) => setLiquidationDate && setLiquidationDate(e.target.value)}
              disabled={submitting}
              className="w-full text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Liquidando...' : 'Confirmar Liquidación'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
