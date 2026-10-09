import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, signInWithGoogle, signOutUser, signOutSupabase } from '../services/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Modelo 100% Local-First: usuario local sin dependencias remotas ni sesiones en la nube
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('presu_local_user') || localStorage.getItem('user_profile') || localStorage.getItem('user');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          id: 'local-user',
          email: parsed?.email || 'local@device',
          user_metadata: {
            full_name: parsed?.name || parsed?.full_name || 'Usuario'
          }
        };
      }
    } catch {}
    return {
      id: 'local-user',
      email: 'local@device',
      user_metadata: {
        full_name: 'Usuario'
      }
    };
  });

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
    }).catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser({
          id: 'local-user',
          email: 'local@device',
          user_metadata: {
            full_name: 'Usuario'
          }
        });
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    setUser,
    session: null,
    setSession: () => {},
    loading: false, // 100% Local-First: carga instantánea sin demoras ni peticiones de red
    isConfigured: isSupabaseConfigured,
    authError: null,
    setAuthError: () => {},
    signInWithEmail: async () => ({ data: null, error: null }),
    signUpWithEmail: async () => ({ data: null, error: null }),
    signInWithOtp: async () => ({ data: null, error: null }),
    signInWithGoogle,
    signOut: async () => {
      if (isSupabaseConfigured && supabase) {
        await signOutSupabase();
      }
      setUser({
        id: 'local-user',
        email: 'local@device',
        user_metadata: {
          full_name: 'Usuario'
        }
      });
      return { error: null };
    },
    signOutUser,
    resetPassword: async () => ({ data: null, error: null })
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
