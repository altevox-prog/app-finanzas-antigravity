import React, { useState } from 'react';
import { 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getURL } from '../../utils/urlHelper';
import AppLogo from '../AppLogo';
import EmailConfirmationSentStep from './EmailConfirmationSentStep';
import TwoFactorVerifyStep from './TwoFactorVerifyStep';
import CustomSupabaseConfig from './components/CustomSupabaseConfig';
import AuthForm from './components/AuthForm';

export default function LoginView({ onSuccess }) {
  const { 
    user, 
    isConfigured, 
    signOut 
  } = useAuth();

  // Modes: 'login' | 'register' | 'forgot' | 'email_confirmation_sent' | '2fa' | 'email_otp'
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'error' | 'success', message: '' }

  // 2FA state
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pending2faUser, setPending2faUser] = useState(null);

  // Email OTP state
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);

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

          <AuthForm
            mode={mode}
            setMode={setMode}
            onSuccess={onSuccess}
            onNeeds2fa={(pendingUser) => {
              setPending2faUser(pendingUser);
              setTwoFactorCode('');
              setMode('2fa');
            }}
            onConfirmationSent={(registeredEmail) => {
              setEmail(registeredEmail);
              setMode('email_confirmation_sent');
            }}
            onSwitchToEmailOtp={(currEmail) => {
              if (currEmail) setEmail(currEmail);
              setIsOtpSent(false);
              setMode('email_otp');
            }}
            isConfigured={isConfigured}
          >
            {/* Aviso opcional de configuración si Supabase aún no tiene URL */}
            <CustomSupabaseConfig isConfigured={isConfigured} />

            {/* Feedback de errores externos (como OAuth de Google) */}
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
          </AuthForm>
        </div>
      )}
    </div>
  );
}
