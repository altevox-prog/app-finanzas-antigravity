import React from 'react';
import { 
  User, 
  DollarSign, 
  Percent, 
  ArrowRight, 
  Check 
} from 'lucide-react';

export default function WizardStepPreferences({
  displayName,
  setDisplayName,
  selectedCurrency,
  setSelectedCurrency,
  onCurrencyChange,
  allowDecimals,
  setAllowDecimals,
  onNextStep,
  onFinishWizard
}) {
  const handleCurrencySelect = (curr) => {
    if (onCurrencyChange) {
      onCurrencyChange(curr);
    } else if (setSelectedCurrency) {
      setSelectedCurrency(curr);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Identidad Visual Oficial: Logo limpio con esquinas redondeadas y sombra sutil idéntica al login */}
      <div className="flex flex-col items-center justify-center text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden shadow-md shadow-emerald-500/10 mb-3">
          <img
            src="/android-chrome-192x192.png"
            alt="Monety"
            className="w-full h-full object-cover block"
            onError={(e) => { e.currentTarget.src = '/logo.png'; }}
          />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Bienvenido a Monety
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
          Personaliza tus preferencias básicas para comenzar
        </p>
      </div>

      {/* Formulario Esencial (3 campos) */}
      <div className="space-y-4">
        {/* Tu Nombre o Apodo */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <User className="w-4 h-4 text-emerald-500" />
            <span>Tu Nombre o Apodo</span>
          </label>
          <input
            type="text"
            placeholder="Ej. Alex"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 px-3.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Selector de Moneda Principal */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span>Moneda Principal</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleCurrencySelect('COP')}
              className={`h-11 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedCurrency === 'COP'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-500/30'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>COP ($)</span>
              {selectedCurrency === 'COP' && <Check className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => handleCurrencySelect('USD')}
              className={`h-11 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedCurrency === 'USD'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-500/30'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>USD ($)</span>
              {selectedCurrency === 'USD' && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Permitir Decimales en Montos */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Permitir Decimales en Montos
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Habilita centavos (ej. $ 1.250,50), ideal para USD o precisión estricta.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAllowDecimals(!allowDecimals)}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
              allowDecimals ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow-md absolute top-1 transition-transform ${
                allowDecimals ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={onNextStep}
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Configurar Cuentas</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onFinishWizard}
          className="w-full py-2 text-center text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
        >
          Omitir por ahora e ir al inicio
        </button>
      </div>
    </div>
  );
}
