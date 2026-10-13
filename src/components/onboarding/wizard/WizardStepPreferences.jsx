import React from 'react';
import { 
  User, 
  Lock, 
  ArrowRight, 
  Check, 
  Fingerprint, 
  DollarSign, 
  Upload, 
  Percent, 
  Mail 
} from 'lucide-react';
import AppLogo from '../../AppLogo';
import { signInWithGoogle } from '../../../services/supabaseClient';

export default function WizardStepPreferences({
  displayName,
  setDisplayName,
  selectedCurrency,
  setSelectedCurrency,
  onCurrencyChange,
  allowDecimals,
  setAllowDecimals,
  pin,
  setPin,
  enableBiometrics,
  setEnableBiometrics,
  isBiometricSupported,
  biometricLoading,
  biometricMessage,
  onToggleBiometrics,
  restoring,
  restoreError,
  onRestoreBackup,
  onNextStep,
  onFinishWizard,
  onOpenAuthModal
}) {
  const handleCurrencySelect = (curr) => {
    if (onCurrencyChange) {
      onCurrencyChange(curr);
    } else if (setSelectedCurrency) {
      setSelectedCurrency(curr);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Identidad Visual Oficial: AppLogo centralizado */}
      <div className="flex flex-col items-center justify-center text-center mb-2">
        <div className="mb-3 flex items-center justify-center">
          <AppLogo size="xl" showText={false} iconClassName="shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-500/20" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Bienvenido a Monety
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
          Tus finanzas personales 100% privadas y en tu dispositivo
        </p>
      </div>

      {/* Opción Prominente de Acceso con Google */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
        <div className="text-center">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            ¿Ya tienes una cuenta o deseas sincronizar en la nube?
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Conéctate para respaldar tus movimientos en Supabase
          </p>
        </div>

        {/* Botón Oficial Google */}
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="w-full py-2.5 px-4 font-medium flex items-center justify-center gap-3 rounded-xl bg-white text-gray-800 hover:bg-gray-100 dark:bg-slate-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continuar con Google</span>
        </button>

        {/* Botón Acceso con Correo y Contraseña */}
        <button
          type="button"
          onClick={onOpenAuthModal}
          className="w-full py-2.5 px-4 font-medium flex items-center justify-center gap-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition-all active:scale-[0.98] cursor-pointer text-xs font-semibold"
        >
          <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Ingresar o Registrarse con Correo</span>
        </button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
          <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-400">o continuar en modo local privado</span>
          <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Nombre de Usuario */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Tu Nombre o Apodo
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Recomendado</span>
          </div>
          <input
            type="text"
            placeholder="Ej. Alex"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Selector de Moneda Principal */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Moneda Principal
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleCurrencySelect('COP')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedCurrency === 'COP'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <span>COP ($)</span>
              {selectedCurrency === 'COP' && <Check className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => handleCurrencySelect('USD')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedCurrency === 'USD'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <span>USD ($)</span>
              {selectedCurrency === 'USD' && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* PIN de Seguridad */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                PIN de Seguridad Rápido
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Opcional (4 dígitos)</span>
          </div>
          <input
            type="password"
            maxLength={4}
            placeholder="Dejar vacío si no deseas PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs font-mono text-center tracking-widest text-slate-900 dark:text-white outline-none focus:border-blue-500"
          />
        </div>

        {/* Biometría (si soportada) */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Acceso Rápido con Biometría
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Usa Face ID, Touch ID o huella de tu dispositivo al abrir la aplicación.
            </p>
            {biometricMessage && (
              <p className={`text-[10px] font-semibold mt-1 ${
                biometricMessage.startsWith('✓') ? 'text-emerald-500' : 'text-amber-500'
              }`}>
                {biometricMessage}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleBiometrics}
            disabled={biometricLoading}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
              enableBiometrics ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/20'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow-md absolute top-1 transition-transform ${
              enableBiometrics ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Permitir 2 decimales en montos */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Permitir 2 Decimales en Montos
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Habilita centavos (ej. $ 1.250,50), ideal para USD o precisión estricta.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAllowDecimals(!allowDecimals)}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
              allowDecimals ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/20'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow-md absolute top-1 transition-transform ${
              allowDecimals ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Botones de Navegación */}
      <div className="flex items-center gap-2.5 pt-2">
        <button
          type="button"
          onClick={onFinishWizard}
          className="py-3 px-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Empezar ya</span>
        </button>

        <button
          type="button"
          onClick={onNextStep}
          className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-98"
        >
          <span>Configurar Cuentas</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Restaurar Backup */}
      <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onRestoreBackup}
          className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Restaurar desde archivo de copia de seguridad (.json)</span>
        </button>
        {restoreError && (
          <p className="text-[11px] text-rose-500 text-center font-medium mt-1">
            {restoreError}
          </p>
        )}
      </div>
    </div>
  );
}
