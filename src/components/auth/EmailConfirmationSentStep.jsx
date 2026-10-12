import React from 'react';
import { 
  X, 
  MailCheck, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Send, 
  ArrowRight 
} from 'lucide-react';

/**
 * EmailConfirmationSentStep
 * Pantalla que notifica al usuario que se ha enviado un enlace de confirmación tras el registro.
 */
export default function EmailConfirmationSentStep({
  email,
  onBackToLogin,
  onClose,
  onResendConfirmation,
  isLoading = false,
  feedback = null
}) {
  return (
    <div className="pt-2 space-y-4 text-center">
      {onClose && (
        <div className="flex justify-end -mb-2">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
        <MailCheck className="w-8 h-8" />
      </div>

      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
        ¡Cuenta creada con éxito!
      </h3>

      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed px-2">
        Hemos enviado un enlace de confirmación a tu correo:
        <br />
        <span className="font-bold text-slate-900 dark:text-white">{email}</span>
      </p>

      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs text-left flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Por razones de seguridad bancaria, debes abrir el enlace en tu correo para activar tu cuenta antes de acceder al panel.
        </span>
      </div>

      {feedback && (
        <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
          feedback.type === 'error'
            ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        }`}>
          {feedback.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="space-y-2 pt-2">
        {onResendConfirmation && (
          <button
            type="button"
            onClick={onResendConfirmation}
            disabled={isLoading}
            className="w-full py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Reenviar correo de confirmación</span>
          </button>
        )}

        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-600/20"
        >
          <span>Ya lo confirmé, Iniciar Sesión</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
