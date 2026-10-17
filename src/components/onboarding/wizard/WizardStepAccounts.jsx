import React, { useState } from 'react';
import { 
  Building2, 
  Smartphone, 
  Wallet, 
  ArrowLeft, 
  Sparkles,
  Coins
} from 'lucide-react';
import { formatCurrencyInput } from '../../../utils/currencyFormatter';

const ACCOUNT_TYPES = [
  { id: 'bank', label: 'Banco', icon: Building2 },
  { id: 'wallet', label: 'Billetera Digital', icon: Smartphone },
  { id: 'cash', label: 'Efectivo', icon: Wallet }
];

export default function WizardStepAccounts({
  selectedCurrency = 'COP',
  allowDecimals = false,
  onPrevStep,
  onFinishWizard
}) {
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('bank');
  const [accountBalance, setAccountBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onFinishWizard({
        accountName: accountName.trim(),
        accountType,
        accountBalance: accountBalance || '0'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onFinishWizard({
        accountName: '',
        accountType: 'bank',
        accountBalance: '0'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Encabezado */}
      <div className="text-center space-y-1.5">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
          <Coins className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Tu Primera Cuenta
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          Registra tu cuenta principal para empezar a organizar tus ingresos y gastos
        </p>
      </div>

      {/* Formulario Directo de Cuenta */}
      <div className="space-y-4">
        {/* Nombre de la Cuenta */}
        <div className="space-y-1.5">
          <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Nombre de la cuenta</span>
            <span className="text-[10px] text-slate-400 font-normal">Recomendado</span>
          </label>
          <input
            type="text"
            placeholder="Ej. Bancolombia, Efectivo o Nequi"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 px-3.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Tipo de Cuenta: Selector Compacto */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Tipo de cuenta
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ACCOUNT_TYPES.map((t) => {
              const Icon = t.icon;
              const isSelected = accountType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAccountType(t.id)}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-500/30 font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate text-[11px] sm:text-xs">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Saldo Inicial */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Saldo inicial disponible
            </label>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {selectedCurrency}
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              $
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="$ 0"
              value={accountBalance}
              onChange={(e) => setAccountBalance(formatCurrencyInput(e.target.value, allowDecimals))}
              className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400 font-mono"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Puedes empezar en $ 0 y ajustar o agregar más cuentas después.
          </p>
        </div>
      </div>

      {/* Botones de Finalización */}
      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>¡Comenzar a Gestionar mis Finanzas!</span>
          <Sparkles className="w-4 h-4 text-amber-300" />
        </button>

        <div className="flex items-center justify-between pt-0.5">
          <button
            type="button"
            onClick={onPrevStep}
            disabled={isSubmitting}
            className="py-1.5 px-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Atrás</span>
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="py-1.5 px-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            Configurar cuentas más tarde
          </button>
        </div>
      </div>
    </div>
  );
}
