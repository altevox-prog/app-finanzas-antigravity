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

// Variables de control de caché y deduplicación en memoria
let cachedUser = null;
let lastUserFetchTime = 0;
const USER_CACHE_TTL = 10000; // 10 segundos de vigencia
let inFlightUserPromise = null;

// Escuchar cambios de autenticación para invalidar la caché oportunamente
if (supabase?.auth) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      cachedUser = null;
      lastUserFetchTime = 0;
      inFlightUserPromise = null;
    } else if (session?.user) {
      cachedUser = session.user;
      lastUserFetchTime = Date.now();
    }
  });
}

/**
 * Obtiene el usuario autenticado en Supabase deduplicando llamadas de red.
 */
export async function getSupabaseUser() {
  if (!supabase) return null;

  const now = Date.now();

  // 1. Reutilizar usuario en memoria si la caché permanece vigente
  if (cachedUser && (now - lastUserFetchTime < USER_CACHE_TTL)) {
    return cachedUser;
  }

  // 2. Comprobar sesión local sin emisión de red
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      cachedUser = session.user;
      lastUserFetchTime = now;
      return cachedUser;
    }
  } catch {
    // Continuar a la consulta de red si la lectura de sesión falla
  }

  // 3. Deduplicar solicitudes concurrentes en curso
  if (inFlightUserPromise) {
    return inFlightUserPromise;
  }

  inFlightUserPromise = (async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        cachedUser = null;
        return null;
      }
      cachedUser = user;
      lastUserFetchTime = Date.now();
      return cachedUser;
    } catch {
      cachedUser = null;
      return null;
    } finally {
      inFlightUserPromise = null;
    }
  })();

  return inFlightUserPromise;
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
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Error en supabase signOut:', err);
  }
};

export const signOutSupabase = signOutUser;

export default supabase;
