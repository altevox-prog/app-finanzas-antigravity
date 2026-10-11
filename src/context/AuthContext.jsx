import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, signInWithGoogle, signOutUser, signOutSupabase } from '../services/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Resolver sesión persistida inicial al cargar o hacer F5
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.warn('[AuthContext] Error obteniendo sesión:', error);
      }
      setSession(initialSession || null);
      setUser(initialSession?.user || null);
      setLoading(false);
    }).catch((err) => {
      if (isMounted) {
        console.warn('[AuthContext] Fallo al verificar sesión:', err);
        setLoading(false);
      }
    });

    // 2. Suscripción a cambios de autenticación en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession || null);
      setUser(currentSession?.user || null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email, password) => {
    if (!supabase) return { data: null, error: new Error('Supabase no configurado') };
    setAuthError(null);
    const res = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (res.error) setAuthError(res.error.message);
    return res;
  };

  const signUpWithEmail = async (email, password, metadata = {}) => {
    if (!supabase) return { data: null, error: new Error('Supabase no configurado') };
    setAuthError(null);
    const res = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: metadata }
    });
    if (res.error) setAuthError(res.error.message);
    return res;
  };

  const signInWithOtp = async (email) => {
    if (!supabase) return { data: null, error: new Error('Supabase no configurado') };
    setAuthError(null);
    const res = await supabase.auth.signInWithOtp({ email: email.trim() });
    if (res.error) setAuthError(res.error.message);
    return res;
  };

  const resetPassword = async (email) => {
    if (!supabase) return { data: null, error: new Error('Supabase no configurado') };
    setAuthError(null);
    const res = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined
    });
    if (res.error) setAuthError(res.error.message);
    return res;
  };

  const signOut = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await signOutSupabase();
      }
    } catch (err) {
      console.warn('Error en supabase signOut:', err);
    } finally {
      try {
        if (typeof window !== 'undefined') {
          Object.keys(localStorage).forEach((key) => {
            if (
              key.startsWith('sb-') ||
              key.includes('supabase.auth.token') ||
              key.includes('supabase-auth')
            ) {
              localStorage.removeItem(key);
            }
          });
          sessionStorage.clear();
        }
      } catch (storageErr) {
        console.warn('Error limpiando auth tokens en storage:', storageErr);
      }
      setUser(null);
      setSession(null);
    }
    return { error: null };
  };

  const value = {
    user,
    setUser,
    session,
    setSession,
    loading,
    isConfigured: isSupabaseConfigured,
    authError,
    setAuthError,
    signInWithEmail,
    signUpWithEmail,
    signInWithOtp,
    signInWithGoogle,
    signOut,
    signOutUser,
    resetPassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}

export { signInWithGoogle, signOutUser };
