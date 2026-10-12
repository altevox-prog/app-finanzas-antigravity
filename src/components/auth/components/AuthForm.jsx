import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound 
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { getURL } from '../../../utils/urlHelper';
import { syncAndPersistUserProfile, setHasCompletedOnboarding } from '../../../utils/userProfileHelper';

/**
 * AuthForm
 * Formulario principal de Login, Registro y Recuperación de contraseña.
 */
export default function AuthForm({
  mode = 'login',
  setMode,
  onSuccess,
  onNeeds2fa,
  onConfirmationSent,
  onSwitchToEmailOtp,
  isConfigured = true,
  children
}) {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'error' | 'success', message: '' }

  const handleTabChange = (newMode) => {
    setFeedback(null);
    setMode(newMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) {
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            setFeedback({ 
              type: 'error', 
              message: 'Tu correo aún no ha sido verificado. Por favor revisa el enlace de activación en tu bandeja.' 
            });
          } else {
            setFeedback({ type: 'error', message: error.message || 'Credenciales inválidas' });
          }
          return;
        }

        // Verificar nivel de aseguramiento de MFA (2FA TOTP)
        try {
          const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (!aalError && aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
            if (onNeeds2fa) {
              onNeeds2fa(data?.user);
            }
            return;
          }
        } catch (mfaErr) {
          console.warn('Error verificando AAL de 2FA:', mfaErr);
        }

        setFeedback({ type: 'success', message: '¡Sesión iniciada con éxito!' });
        if (data?.user?.id) {
          await syncAndPersistUserProfile(data.user, supabase);
        }
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 600);

      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: getURL(),
            data: {
              full_name: displayName.trim() || undefined,
              has_completed_onboarding: false
            }
          }
        });

        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('ya se encuentra registrado') || error.code === 'user_already_exists') {
            setFeedback({ 
              type: 'error', 
              message: 'Este correo ya se encuentra registrado. Por favor inicia sesión o recupera tu contraseña.' 
            });
            return;
          }
          setFeedback({ type: 'error', message: error.message || 'Error al crear cuenta' });
          return;
        }

        // Supabase retorna identities vacío cuando el correo ya existe
        if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
          setFeedback({ 
            type: 'error', 
            message: 'Este correo ya se encuentra registrado. Por favor inicia sesión o recupera tu contraseña.' 
          });
          return;
        }

        if (data?.user?.id) {
          setHasCompletedOnboarding(data.user.id, false);
        }

        // Si Supabase requiere confirmación de correo
        if (data?.user && (!data?.session || !data?.user?.email_confirmed_at)) {
          if (onConfirmationSent) {
            onConfirmationSent(email.trim());
          }
          return;
        }

        // Si ya está confirmado (ej. auto-confirm)
        setFeedback({ 
          type: 'success', 
          message: '¡Cuenta creada con éxito!' 
        });
        if (data?.user?.id) {
          await syncAndPersistUserProfile(data.user, supabase);
        }
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1000);

      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          setFeedback({ type: 'error', message: error.message || 'Error al enviar enlace' });
        } else {
          setFeedback({ 
            type: 'success', 
            message: 'Enlace de recuperación enviado a tu correo.' 
          });
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Ocurrió un error inesperado' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selector de Pestañas: Iniciar Sesión vs Registrarse */}
      {mode !== 'forgot' && (
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
          <button
            type="button"
            onClick={() => handleTabChange('login')}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-[#1a2030] text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('register')}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-[#1a2030] text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Registrarse
          </button>
        </div>
      )}

      {/* Mensajes de Feedback */}
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

      {/* Contenido adicional (Google OAuth, Configuración Supabase) */}
      {children}

      {/* Formulario de Correo y Contraseña */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'register' && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Nombre o Apodo
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="Tu nombre"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Correo Electrónico
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="email"
              required
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {mode !== 'forgot' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Contraseña
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => handleTabChange('forgot')}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-98 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Procesando...</span>
            </>
          ) : (
            <>
              <span>{mode === 'register' ? 'Registrarse' : mode === 'forgot' ? 'Enviar Enlace' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Acceso Alternativo con Código de 6 Dígitos al Correo */}
        {mode === 'login' && isConfigured && onSwitchToEmailOtp && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => onSwitchToEmailOtp(email)}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer inline-flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>¿Prefieres recibir un código de 6 dígitos a tu correo?</span>
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => handleTabChange('login')}
            className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white pt-2 cursor-pointer"
          >
            Volver al inicio de sesión
          </button>
        )}
      </form>
    </div>
  );
}
