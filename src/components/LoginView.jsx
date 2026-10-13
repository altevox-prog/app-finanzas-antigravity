import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  RefreshCw,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { syncAndPersistUserProfile } from '../utils/userProfileHelper';
import { supabase, updateSupabaseCredentials } from '../lib/supabase';
import { getURL } from '../utils/urlHelper';
import AppLogo from './AppLogo';
import EmailConfirmationSentStep from './auth/EmailConfirmationSentStep';
import TwoFactorVerifyStep from './auth/TwoFactorVerifyStep';

export default function LoginView({ onSuccess }) {
  const { 
    user, 
    isConfigured, 
    signInWithGoogle, 
    resetPassword,
    signOut 
  } = useAuth();

  // Modes: 'login' | 'register' | 'forgot' | 'email_confirmation_sent' | '2fa' | 'email_otp'
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'error' | 'success', message: '' }

  // Credentials config helper
  const [showCredsForm, setShowCredsForm] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');

  // 2FA state
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pending2faUser, setPending2faUser] = useState(null);

  // Email OTP state
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);

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

        // Verificar nivel de 2FA
        try {
          const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (!aalError && aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
            setPending2faUser(data?.user);
            setTwoFactorCode('');
            setMode('2fa');
            return;
          }
        } catch (mfaErr) {
          console.warn('Error verificando AAL de 2FA:', mfaErr);
        }

        setFeedback({ type: 'success', message: '¡Sesión iniciada con éxito!' });
        if (data?.user?.id) {
          await syncAndPersistUserProfile(data.user, supabase);
        }
        if (typeof onSuccess === 'function') {
          onSuccess(data?.user);
        }
      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: getURL(),
            data: {
              full_name: displayName.trim() || undefined
            }
          }
        });
        if (error) {
          setFeedback({ type: 'error', message: error.message || 'Error al crear cuenta' });
          return;
        }

        // Supabase retorna identities vacío cuando el correo ya existe
        if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
          setFeedback({ 
            type: 'error', 
            message: 'Este correo electrónico ya está registrado. Inicia sesión en su lugar.' 
          });
          return;
        }

        // Si Supabase requiere confirmación de correo
        if (data?.user && (!data?.session || !data?.user?.email_confirmed_at)) {
          setMode('email_confirmation_sent');
          setFeedback(null);
          return;
        }

        setFeedback({ 
          type: 'success', 
          message: '¡Cuenta creada con éxito!' 
        });
        if (data?.user?.id) {
          await syncAndPersistUserProfile(data.user, supabase);
        }
        if (typeof onSuccess === 'function') {
          onSuccess(data?.user);
        }
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

  const handleResendConfirmation = async () => {
    if (!email) return;
    setIsLoading(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: getURL()
        }
      });
      if (error) {
        setFeedback({ type: 'error', message: error.message || 'Error al reenviar correo de confirmación' });
      } else {
        setFeedback({ type: 'success', message: '¡Correo reenviado! Revisa tu bandeja de entrada o spam.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al reenviar correo' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2fa = async (codeToVerify) => {
    const code = codeToVerify || twoFactorCode;
    if (code.length !== 6) return;

    setIsLoading(true);
    setFeedback(null);

    try {
      const factorsRes = await supabase.auth.mfa.listFactors();
      if (factorsRes.error) throw factorsRes.error;

      const totpFactor = (factorsRes.data?.totp || factorsRes.data?.all || []).find(f => f.status === 'verified') || factorsRes.data?.totp?.[0];
      if (!totpFactor) {
        throw new Error('No se encontró ningún factor 2FA vinculado');
      }

      const challengeRes = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challengeRes.error) throw challengeRes.error;

      const verifyRes = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeRes.data.id,
        code: code.trim()
      });

      if (verifyRes.error) throw verifyRes.error;

      setFeedback({ type: 'success', message: '¡Autenticación de 2 Factores aprobada!' });
      const activeUser = verifyRes.data?.user || pending2faUser || user;
      if (typeof onSuccess === 'function') {
        onSuccess(activeUser);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Código de Google Authenticator incorrecto o expirado' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestEmailOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setFeedback({ type: 'error', message: 'Ingresa tu correo electrónico primero.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: getURL()
        }
      });

      if (error) {
        setFeedback({ type: 'error', message: error.message || 'Error al enviar código al correo' });
      } else {
        setIsOtpSent(true);
        setEmailOtpCode('');
        setFeedback({ type: 'success', message: `Hemos enviado un código de 6 dígitos a ${email}` });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al solicitar código OTP' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (codeToVerify) => {
    const code = codeToVerify || emailOtpCode;
    if (code.length !== 6) return;

    setIsLoading(true);
    setFeedback(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email'
      });

      if (error) {
        setFeedback({ type: 'error', message: error.message || 'Código OTP inválido o expirado' });
        return;
      }

      setFeedback({ type: 'success', message: '¡Código verificado con éxito!' });
      if (typeof onSuccess === 'function') {
        onSuccess(data?.user);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al validar código OTP' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setFeedback(null);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getURL(),
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline'
          }
        },
      });
      if (error) {
        console.error('Error al iniciar sesión con Google:', error.message);
        setFeedback({ type: 'error', message: error.message || 'Error con Google' });
      } else {
        setFeedback({ type: 'success', message: 'Conectando con Google...' });
      }
    } catch (err) {
      console.error('Error al conectar con Google:', err);
      setFeedback({ type: 'error', message: err.message || 'Error al conectar con Google' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-[#18181b] rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-white/[0.08] relative overflow-hidden">
      {/* Halo decorativo de fondo */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Si el usuario ya está autenticado */}
      {user ? (
        <div className="py-6 space-y-4 text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto text-xl font-bold">
            {user.email?.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <div>
            <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
              {user.user_metadata?.full_name || user.email}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mt-2.5 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sincronización activa</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-4">
            Tus transacciones, cuentas y metas se respaldan silenciosamente en Supabase y se actualizan al instante en todos tus dispositivos.
          </p>

          <button
            type="button"
            onClick={async () => {
              await signOut();
            }}
            className="w-full py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar Sesión en este dispositivo
          </button>
        </div>
      ) : mode === 'email_confirmation_sent' ? (
        /* PANTALLA: CONFIRMACIÓN DE CORREO PENDIENTE */
        <EmailConfirmationSentStep
          email={email}
          onBackToLogin={() => { setMode('login'); setFeedback(null); }}
          onResendConfirmation={handleResendConfirmation}
          isLoading={isLoading}
          feedback={feedback}
        />
      ) : (mode === '2fa' || mode === 'email_otp') ? (
        /* PANTALLAS: VERIFICACIÓN 2FA TOTP Y PASSWORDLESS EMAIL OTP */
        <TwoFactorVerifyStep
          mode={mode}
          onBackToLogin={() => { setMode('login'); setFeedback(null); setIsOtpSent(false); }}
          feedback={feedback}
          isLoading={isLoading}
          twoFactorCode={twoFactorCode}
          setTwoFactorCode={setTwoFactorCode}
          onVerify2fa={handleVerify2fa}
          email={email}
          setEmail={setEmail}
          isOtpSent={isOtpSent}
          setIsOtpSent={setIsOtpSent}
          emailOtpCode={emailOtpCode}
          setEmailOtpCode={setEmailOtpCode}
          onRequestEmailOtp={handleRequestEmailOtp}
          onVerifyEmailOtp={handleVerifyEmailOtp}
        />
      ) : (
        /* FORMULARIO ESTÁNDAR LOGIN / REGISTRO */
        <div className="space-y-4">
          {/* Identidad Visual Oficial: AppLogo centralizado */}
          <div className="flex flex-col items-center justify-center text-center mb-6">
            <div className="mb-3 flex items-center justify-center">
              <AppLogo size="xl" showText={false} iconClassName="shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-500/20" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Monety
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Gestión Financiera & Patrimonio Inteligente
            </p>
          </div>

          {/* Selector de Pestañas: Iniciar Sesión vs Registrarse */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
              <button
                type="button"
                onClick={() => { setMode('login'); setFeedback(null); }}
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
                onClick={() => { setMode('register'); setFeedback(null); }}
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

          {/* Botón de Google OAuth */}
          {isConfigured && mode !== 'forgot' && (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98 shadow-sm"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
          )}

          {isConfigured && mode !== 'forgot' && (
            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-200 dark:border-white/10 w-full" />
              <span className="bg-white dark:bg-[#121622] px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider relative">
                o con correo
              </span>
            </div>
          )}

          {/* Formulario de Correo y Contraseña */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Nombre o Apodo <span className="text-[10px] text-slate-400">(opcional)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
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
                      onClick={() => { setMode('forgot'); setFeedback(null); }}
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
            {mode === 'login' && isConfigured && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('email_otp'); setFeedback(null); setIsOtpSent(false); }}
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
                onClick={() => { setMode('login'); setFeedback(null); }}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white pt-2 cursor-pointer"
              >
                Volver al inicio de sesión
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
