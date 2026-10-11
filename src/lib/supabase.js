import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

export { supabase, isSupabaseConfigured };

export const getSupabaseConfig = () => ({
  url: import.meta.env?.VITE_SUPABASE_URL || '',
  key: import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
  isConfigured: isSupabaseConfigured
});

export const updateSupabaseCredentials = () => {};

export const getSupabaseConfigStatus = () => ({
  isConfigured: isSupabaseConfigured,
  url: import.meta.env?.VITE_SUPABASE_URL || null
});

export default supabase;
