import React from 'react';
import { ArrowLeft, ShieldCheck, X, Smartphone, AlertCircle, CheckCircle2, RefreshCw, ArrowRight, KeyRound, Mail, Send } from 'lucide-react';
import OtpSixDigitInput from './components/OtpSixDigitInput';

/**
 * TwoFactorVerifyStep: Verificación 2FA (TOTP) y acceso passwordless OTP por email.
 */
export default function TwoFactorVerifyStep({
  mode = '2fa',
  onBackToLogin,
  onClose,
  feedback = null,
  isLoading = false,
  twoFactorCode = '',
  setTwoFactorCode,
  onVerify2fa,
  email = '',
  setEmail,
  isOtpSent = false,
  setIsOtpSent,
  emailOtpCode = '',
  setEmailOtpCode,
  onRequestEmailOtp,
  onVerifyEmailOtp
}) {
  const is2fa = mode === '2fa';
  const handleBack = () => {
    if (!is2fa && setIsOtpSent) setIsOtpSent(false);
    onBackToLogin?.();
  };

  const btnSubmitClass = "w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-98";

  return (
    <div className="pt-2 space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={handleBack} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer" title="Volver">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
          {is2fa ? <><ShieldCheck className="w-4 h-4 text-emerald-500" /><span>Verificación en Dos Pasos</span></> : <><KeyRound className="w-4 h-4 text-emerald-500" /><span>Acceso con Código OTP</span></>}
        </h3>
        {onClose ? (
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer" title="Cerrar modal">
            <X className="w-4 h-4" />
          </button>
        ) : <div className="w-8" />}
      </div>

      <div className="text-center space-y-1">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-2">
          {is2fa ? <Smartphone className="w-7 h-7" /> : <Mail className="w-7 h-7" />}
        </div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white">
          {is2fa ? 'Código de Google Authenticator' : isOtpSent ? 'Ingresa el Código de 6 Dígitos' : 'Iniciar con Código al Correo'}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 px-2 leading-relaxed">
          {is2fa ? 'Ingresa el código dinámico de 6 dígitos mostrado en tu aplicación autenticadora.' : isOtpSent ? `Revisa tu correo ${email} e ingresa el código numérico recibido:` : 'Recibe un código de acceso único directamente en tu correo sin necesidad de contraseña.'}
        </p>
      </div>

      {feedback && (
        <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${feedback.type === 'error' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
          {feedback.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {is2fa ? (
        <div className="space-y-4">
          <div className="py-2">
            <OtpSixDigitInput
              value={twoFactorCode}
              onChange={(val) => {
                setTwoFactorCode?.(val);
                if (val.length === 6 && onVerify2fa) onVerify2fa(val);
              }}
              disabled={isLoading} hasError={feedback?.type === 'error'}
            />
          </div>
          <button type="button" disabled={isLoading || twoFactorCode.length !== 6} onClick={() => onVerify2fa?.(twoFactorCode)} className={btnSubmitClass}>
            {isLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Verificando 2FA...</span></> : <><span>Confirmar e Ingresar</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      ) : !isOtpSent ? (
        <form onSubmit={onRequestEmailOtp} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email" required placeholder="ejemplo@correo.com" value={email}
                onChange={(e) => setEmail?.(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
          <button type="submit" disabled={isLoading || !email} className={btnSubmitClass}>
            {isLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Enviando código...</span></> : <><span>Enviar Código de 6 Dígitos</span><Send className="w-3.5 h-3.5" /></>}
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <OtpSixDigitInput
            value={emailOtpCode}
            onChange={(val) => {
              setEmailOtpCode?.(val);
              if (val.length === 6 && onVerifyEmailOtp) onVerifyEmailOtp(val);
            }}
            disabled={isLoading} hasError={feedback?.type === 'error'}
          />
          <button type="button" disabled={isLoading || emailOtpCode.length !== 6} onClick={() => onVerifyEmailOtp?.(emailOtpCode)} className={btnSubmitClass}>
            {isLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Validando código...</span></> : <><span>Verificar e Ingresar</span><ArrowRight className="w-4 h-4" /></>}
          </button>
          <div className="flex items-center justify-between text-xs font-semibold pt-1">
            <button type="button" onClick={onRequestEmailOtp} disabled={isLoading} className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
              ¿No te llegó? Reenviar código
            </button>
            <button type="button" onClick={() => setIsOtpSent?.(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
              Cambiar correo
            </button>
          </div>
        </div>
      )}

      <button type="button" onClick={handleBack} className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer pt-1">
        {is2fa ? 'Cancelar y volver al inicio' : 'Volver a iniciar sesión con contraseña'}
      </button>
    </div>
  );
}
