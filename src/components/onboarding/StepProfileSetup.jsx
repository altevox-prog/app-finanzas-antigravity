import React from 'react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  Fingerprint, 
  Coins, 
  ArrowRight, 
  Loader2, 
  FileJson, 
  AlertCircle 
} from 'lucide-react';
import AppLogo from '../ui/AppLogo';

export default function StepProfileSetup({
  name,
  setName,
  pin,
  setPin,
  confirmPin,
  setConfirmPin,
  showPin,
  setShowPin,
  step1Touched,
  enableBiometrics,
  setEnableBiometrics,
  isBiometricSupported,
  biometricLoading,
  biometricMessage,
  onToggleBiometrics,
  restoring,
  restoreError,
  onRestoreBackup,
  onNextStep
}) {
  // Validación de campos
  const isNameValid = name.trim().length >= 2;
  const isPinLengthValid = pin.length >= 4 && pin.length <= 6;
  const isPinMatching = isPinLengthValid && pin === confirmPin;
  const isFormValid = isNameValid && isPinMatching;

  const handlePinChange = (e) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(cleaned);
  };

  const handleConfirmPinChange = (e) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
    setConfirmPin(cleaned);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onNextStep) onNextStep(e);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col items-center text-center">
        {/* Contenedor del Logo con AppLogo */}
        <div className="mb-4 flex items-center justify-center">
          <AppLogo size="xl" showText={false} iconClassName="shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500/20" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2">
          <span>PASO 1 DE 2</span>
          <span className="opacity-50">·</span>
          <span>Bienvenida</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          Bienvenido a Monety, tu asistente financiero personal
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configuremos tu acceso personal
        </p>
      </div>

      {/* Campos de Entrada */}
      <div className="space-y-4">
        {/* Campo Nombre */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            ¿Cómo te llamas? *
          </label>
          <div className="relative">
            <input
              type="text"
              required
              autoFocus
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white text-sm font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Campo PIN */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              PIN de seguridad (4 a 6 dígitos) *
            </label>
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPin ? 'Ocultar' : 'Ver'}</span>
            </button>
          </div>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              placeholder="••••"
              value={pin}
              onChange={handlePinChange}
              className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white text-sm font-bold tracking-widest placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Confirmar PIN */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Confirma tu PIN *
          </label>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              placeholder="••••"
              value={confirmPin}
              onChange={handleConfirmPinChange}
              className={`w-full pl-10 pr-3.5 py-3 rounded-2xl border bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white text-sm font-bold tracking-widest placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                confirmPin.length >= 4
                  ? isPinMatching
                    ? 'border-emerald-500 focus:ring-emerald-500'
                    : 'border-rose-500 focus:ring-rose-500'
                  : 'border-slate-200 dark:border-white/10 focus:ring-emerald-500'
              }`}
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Indicador de coincidencia de PIN */}
          <div className="mt-1.5 px-1 min-h-[18px]">
            {pin.length > 0 && pin.length < 4 && (
              <span className="text-[11px] font-medium text-amber-500 dark:text-amber-400">
                El PIN debe tener al menos 4 números
              </span>
            )}
            {pin.length >= 4 && confirmPin.length > 0 && !isPinMatching && (
              <span className="text-[11px] font-medium text-rose-500 dark:text-rose-400">
                Los PINs no coinciden
              </span>
            )}
            {isPinMatching && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> PIN confirmado correctamente
              </span>
            )}
          </div>
        </div>

        {/* Habilitar acceso con Face ID / Huella Dactilar inmediatamente debajo del PIN */}
        {isBiometricSupported && (
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  enableBiometrics
                    ? 'bg-purple-500 text-white shadow-sm'
                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                }`}>
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    Habilitar acceso con Face ID / Huella Dactilar
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Accede rápidamente sin tener que digitar tu PIN
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleBiometrics}
                disabled={biometricLoading}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 disabled:opacity-50 ${
                  enableBiometrics ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                title="Activar o desactivar biometría"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    enableBiometrics ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {biometricLoading && (
              <p className="text-[11px] text-blue-500 font-medium mt-2 flex items-center gap-1.5 animate-pulse">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                Verificando sensor biométrico... Confirma en tu dispositivo.
              </p>
            )}

            {biometricMessage && !biometricLoading && (
              <p className={`text-[11px] font-medium mt-2 ${
                enableBiometrics ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
              }`}>
                {biometricMessage}
              </p>
            )}
          </div>
        )}

        {/* Moneda Principal Preseleccionada */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Moneda predeterminada
          </label>
          <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                $ Peso colombiano (COP)
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Activa
            </span>
          </div>
        </div>
      </div>

      {/* Acción Principal (al final de los campos) */}
      <div className="mt-8 space-y-4">
        <button
          type="button"
          onClick={onNextStep}
          disabled={!isFormValid}
          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-2xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Continuar al tutorial</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Separador O TAMBIÉN */}
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-200 dark:border-white/10 w-full"></div>
          <span className="bg-white dark:bg-[#12141C] px-3 text-[11px] font-bold text-slate-400 tracking-wider uppercase absolute">
            O TAMBIÉN
          </span>
        </div>

        {/* Botón de Restaurar Copia */}
        <button
          type="button"
          onClick={onRestoreBackup}
          disabled={restoring}
          className="w-full py-3 px-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          {restoring ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Restaurando datos...</span>
            </>
          ) : (
            <>
              <FileJson className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>¿Ya tienes una copia de seguridad? <strong className="underline text-emerald-600 dark:text-emerald-400">Restaurar datos</strong></span>
            </>
          )}
        </button>

        {/* Mensaje de alerta si el archivo no es válido o está corrupto */}
        {restoreError && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span className="flex-1">{restoreError}</span>
          </div>
        )}
      </div>
    </form>
  );
}
