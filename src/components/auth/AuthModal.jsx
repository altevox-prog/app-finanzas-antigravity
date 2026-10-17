import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Cloud, 
  X, 
  CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import AppLogo from '../ui/AppLogo';
import { supabase } from '../../lib/supabase';
import { getURL } from '../../utils/urlHelper';
import EmailConfirmationSentStep from './EmailConfirmationSentStep';
import TwoFactorVerifyStep from './TwoFactorVerifyStep';
import AuthForm from './components/AuthForm';
import CustomSupabaseConfig from './components/CustomSupabaseConfig';

export default function AuthModal({ isOpen, onClose, isRequired = false }) {
  useBackHandler(isOpen && !isRequired, onClose);

  const { 
    user, 
    isConfigured, 
    signInWithGoogle, 
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

  if (!isOpen) return null;


  // Reenviar correo de confirmación de registro
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
        setFeedback({ type: 'success', message: '¡Correo de confirmación reenviado! Revisa tu bandeja de entrada o spam.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al reenviar correo' });
    } finally {
      setIsLoading(false);
    }
  };

  // Validación de 2FA TOTP con Google Authenticator
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
        throw new Error('No se encontró ningún factor 2FA vinculado a tu cuenta');
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
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Código de Google Authenticator incorrecto o expirado' });
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar OTP de 6 dígitos al correo
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

  // Verificar código OTP de 6 dígitos recibido por correo
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
      setTimeout(() => {
        onClose();
      }, 600);
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

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={isRequired ? undefined : onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200/80 dark:border-white/10 animate-slide-up relative overflow-hidden"
      >
        {/* Halo decorativo de fondo */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* 1. USUARIO YA AUTENTICADO */}
        {user ? (
          <>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Cuenta en la Nube
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Sincronización multidispositivo en tiempo real
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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
                Tus transacciones, cuentas y metas se respaldan silenciosamente en Supabase y se actualizan al instante en tus demás dispositivos.
              </p>

              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  onClose();
                }}
                className="w-full py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs transition-colors cursor-pointer"
              >
                Cerrar sesión en este dispositivo
              </button>
            </div>
          </>
        ) : mode === 'email_confirmation_sent' ? (
          /* 2. PANTALLA: CONFIRMACIÓN DE EMAIL REQUERIDA (REGISTRO) */
          <EmailConfirmationSentStep
            email={email}
            onBackToLogin={() => { setMode('login'); setFeedback(null); }}
            onClose={onClose}
            onResendConfirmation={handleResendConfirmation}
            isLoading={isLoading}
            feedback={feedback}
          />
        ) : (mode === '2fa' || mode === 'email_otp') ? (
          /* 3 y 4. PANTALLAS: VERIFICACIÓN 2FA TOTP Y PASSWORDLESS EMAIL OTP */
          <TwoFactorVerifyStep
            mode={mode}
            onBackToLogin={() => { setMode('login'); setFeedback(null); setIsOtpSent(false); }}
            onClose={onClose}
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
          /* 5. FORMULARIO PRINCIPAL: LOGIN / REGISTRO / RECUPERACIÓN */
          <div className="pt-2 space-y-4">
            {/* Botón de cerrar superior */}
            {!isRequired && (
              <div className="flex justify-end -mb-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Identidad Visual Oficial: Logo limpio y centralizado */}
            <div className="flex flex-col items-center justify-center text-center mb-6">
              <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden shadow-md shadow-emerald-500/10 mb-3">
                <img
                  src="/android-chrome-192x192.png"
                  alt="Monety"
                  className="w-full h-full object-cover block"
                  onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Monety
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-normal mt-1">
                Gestión Financiera & Patrimonio Inteligente
              </p>
            </div>

            {/* Formulario Principal Modularizado */}
            <AuthForm
              mode={mode}
              setMode={setMode}
              onSuccess={onClose}
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

              {/* Botón de Google OAuth */}
              {isConfigured && mode !== 'forgot' && (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm transition-all cursor-pointer active:scale-[0.99]"
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
                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <span className="relative bg-white dark:bg-slate-900 px-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                    o con correo
                  </span>
                </div>
              )}
            </AuthForm>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
