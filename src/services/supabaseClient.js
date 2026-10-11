import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env?.VITE_SUPABASE_URL;
const rawKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';
const supabaseAnonKey = typeof rawKey === 'string' ? rawKey.trim() : '';

/**
 * Flag reactivo e inmutable que verifica si las credenciales de Supabase
 * están debidamente definidas en el entorno Vite.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'undefined' &&
  supabaseAnonKey !== 'undefined' &&
  supabaseUrl.startsWith('http')
);

/**
 * Cliente singleton de Supabase.
 * Es null si no hay variables de entorno configuradas, garantizando una ejecución
 * 100% segura y libre de excepciones en modo Local-First.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      }
    })
  : null;

/**
 * Obtiene el usuario actual autenticado en Supabase de forma segura.
 */
export async function getSupabaseUser() {
  if (!supabase) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Obtiene la sesión actual de Supabase de forma segura.
 */
export async function getSupabaseSession() {
  if (!supabase) return null;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Inicia sesión con Google OAuth vía Supabase Auth.
 */
export const signInWithGoogle = async () => {
  if (!supabase) {
    console.error('Supabase no está configurado');
    return;
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      queryParams: {
        prompt: 'select_account',
        access_type: 'offline'
      }
    },
  });
  if (error) console.error('Error al iniciar con Google:', error.message);
};

export const signOutUser = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

export const signOutSupabase = signOutUser;

export default supabase;
