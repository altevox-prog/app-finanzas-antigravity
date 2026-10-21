import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { getURL } from '../../../utils/urlHelper';
import { syncAndPersistUserProfile, setHasCompletedOnboarding } from '../../../utils/userProfileHelper';

const inputClass = "w-full h-11 pl-10 pr-3.5 bg-slate-50/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all";

export default function AuthForm({ mode = 'login', setMode, onSuccess, onNeeds2fa, onConfirmationSent, isConfigured = true, children }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleTabChange = (newMode) => { setFeedback(null); setMode(newMode); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          const msg = error.message?.toLowerCase().includes('email not confirmed')
            ? 'Tu correo aún no ha sido verificado. Por favor revisa el enlace de activación en tu bandeja.'
            : (error.message || 'Credenciales inválidas');
          return setFeedback({ type: 'error', message: msg });
        }
        try {
          const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2' && onNeeds2fa) return onNeeds2fa(data?.user);
        } catch {}
        setFeedback({ type: 'success', message: '¡Sesión iniciada con éxito!' });
        if (data?.user?.id) await syncAndPersistUserProfile(data.user, supabase);
        setTimeout(() => onSuccess?.(), 600);
      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: getURL(), data: { full_name: displayName.trim() || undefined, has_completed_onboarding: false } }
        });
        if (error || (data?.user && (!data.user.identities || data.user.identities.length === 0))) {
          const msg = (error?.message || '').toLowerCase();
          const isExists = msg.includes('already registered') || msg.includes('already exists') || msg.includes('ya se encuentra registrado') || error?.code === 'user_already_exists';
          return setFeedback({ type: 'error', message: isExists ? 'Este correo ya se encuentra registrado. Por favor inicia sesión o recupera tu contraseña.' : (error?.message || 'Error al crear cuenta') });
        }
        if (data?.user?.id) setHasCompletedOnboarding(data.user.id, false);
        if (data?.user && (!data?.session || !data?.user?.email_confirmed_at)) return onConfirmationSent?.(email.trim());
        setFeedback({ type: 'success', message: '¡Cuenta creada con éxito!' });
        if (data?.user?.id) await syncAndPersistUserProfile(data.user, supabase);
        setTimeout(() => onSuccess?.(), 1000);
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        setFeedback(error ? { type: 'error', message: error.message || 'Error al enviar enlace' } : { type: 'success', message: 'Enlace de recuperación enviado a tu correo.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Ocurrió un error inesperado' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {mode !== 'forgot' && (
        <div className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl flex border border-slate-200/50 dark:border-white/5">
          {['login', 'register'].map(m => (
            <button key={m} type="button" onClick={() => handleTabChange(m)}
              className={`transition-all duration-200 text-xs font-semibold py-2 rounded-lg flex-1 text-center cursor-pointer ${mode === m ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>
      )}

      {feedback && (
        <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${feedback.type === 'error' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
          {feedback.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {children}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {mode === 'register' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nombre o Apodo</label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input type="text" required placeholder="Tu nombre" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Correo electrónico</label>
          <div className="relative flex items-center">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input type="email" required placeholder="ejemplo@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
        </div>

        {mode !== 'forgot' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Contraseña</label>
              {mode === 'login' && (
                <button type="button" onClick={() => handleTabChange('forgot')} className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors cursor-pointer">
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input type={showPassword ? 'text' : 'password'} required minLength={6} placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer" title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <button type="submit" disabled={isLoading} className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 mt-4">
          {isLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Procesando...</span></> : <>{mode === 'register' ? 'Registrarse' : mode === 'forgot' ? 'Enviar enlace' : 'Iniciar sesión'}<ArrowRight className="w-4 h-4" /></>}
        </button>

        {mode === 'forgot' && (
          <button type="button" onClick={() => handleTabChange('login')} className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white pt-2 cursor-pointer">
            Volver al inicio de sesión
          </button>
        )}
      </form>
    </div>
  );
}
