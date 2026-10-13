import React from 'react';
import { 
  Coins, 
  Check, 
  Wallet, 
  Building2, 
  ArrowLeft, 
  Sparkles 
} from 'lucide-react';
import { formatCurrencyInput } from '../../../utils/currencyFormatter';

export default function WizardStepAccounts({
  selectedCurrency = 'COP',
  allowDecimals = false,
  startFromScratch = true,
  setStartFromScratch,
  cashAmount = '0',
  setCashAmount,
  bankAmount = '0',
  setBankAmount,
  onSetDefaultBalances,
  onStartFromScratch,
  onPrevStep,
  onFinishWizard
}) {
  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="text-center space-y-1.5">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-sm">
          <Coins className="w-7 h-7" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Tus Cuentas Iniciales
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          ¿Con cuánto saldo disponible comienzas hoy?
        </p>
      </div>

      {/* Atajos de montos rápidos */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onSetDefaultBalances}
          className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
            !startFromScratch
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
              : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300'
          }`}
        >
          Montos sugeridos
        </button>
        <button
          type="button"
          onClick={onStartFromScratch}
          className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
            startFromScratch
              ? 'bg-emerald-500 text-white font-extrabold shadow-sm'
              : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300'
          }`}
        >
          Empezar de cero
        </button>
      </div>

      {startFromScratch ? (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2 animate-fadeIn">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Check className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Módulo de cuentas en blanco
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            Comenzarás sin cuentas registradas. Podrás crear tus cuentas personalizadas cuando desees desde el módulo de cuentas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {/* Tarjeta de Cuenta 1: Efectivo */}
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Efectivo
                  </span>
                  <p className="text-[10px] text-slate-400">Billetera o dinero físico</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                {selectedCurrency}
              </span>
            </div>

            <div className="relative pt-1">
              <span className="absolute left-3.5 top-3.5 text-xs font-bold text-slate-400">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={cashAmount}
                onChange={(e) => {
                  if (setStartFromScratch) setStartFromScratch(false);
                  setCashAmount(formatCurrencyInput(e.target.value, allowDecimals));
                }}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Tarjeta de Cuenta 2: Cuenta Bancaria */}
          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Cuenta Bancaria
                  </span>
                  <p className="text-[10px] text-slate-400">Ahorros, nómina o corriente</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                {selectedCurrency}
              </span>
            </div>

            <div className="relative pt-1">
              <span className="absolute left-3.5 top-3.5 text-xs font-bold text-slate-400">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={bankAmount}
                onChange={(e) => {
                  if (setStartFromScratch) setStartFromScratch(false);
                  setBankAmount(formatCurrencyInput(e.target.value, allowDecimals));
                }}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* Botones de Finalización */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onPrevStep}
          className="py-3 px-4 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Atrás</span>
        </button>

        <button
          type="button"
          onClick={onFinishWizard}
          className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-98"
        >
          <span>¡Comenzar a Gestionar mis Finanzas!</span>
          <Sparkles className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
