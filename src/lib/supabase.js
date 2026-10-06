/**
 * Fachada Supabase en modo 100% Local-First.
 * No genera conexiones a la nube ni almacena credenciales remotas.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

export { supabase, isSupabaseConfigured };

export const getSupabaseConfig = () => ({
  url: '',
  key: '',
  isConfigured: false
});

export const updateSupabaseCredentials = () => {};

export const getSupabaseConfigStatus = () => ({
  isConfigured: false,
  url: null
});

export default supabase;
