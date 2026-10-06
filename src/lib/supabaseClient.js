/**
 * Cliente Supabase en modo 100% Local-First.
 * Stub inofensivo que no realiza ninguna conexión de red.
 */

export const isSupabaseConfigured = false;

const dummyChain = {
  data: [],
  error: null,
  select: () => dummyChain,
  insert: async () => ({ data: [], error: null }),
  upsert: async () => ({ data: [], error: null }),
  update: async () => ({ data: [], error: null }),
  delete: () => dummyChain,
  eq: () => dummyChain,
  neq: () => dummyChain,
  in: () => dummyChain,
  order: () => dummyChain,
  match: () => dummyChain,
  limit: () => dummyChain,
  range: () => dummyChain,
  single: async () => ({ data: null, error: null }),
  maybeSingle: async () => ({ data: null, error: null }),
  then: (resolve) => resolve({ data: [], error: null })
};

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: { id: 'local-user', email: 'local@device' } }, error: null }),
    signInWithPassword: async () => ({ data: { user: null }, error: null }),
    signUp: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
    signInWithOAuth: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    updateUser: async () => ({ data: { user: null }, error: null }),
    mfa: {
      listFactors: async () => ({ data: { totp: [] }, error: null }),
      enroll: async () => ({ data: null, error: null }),
      challenge: async () => ({ data: null, error: null }),
      verify: async () => ({ data: null, error: null }),
      unenroll: async () => ({ data: null, error: null })
    }
  },
  from: () => dummyChain,
  channel: () => ({
    on: function() { return this; },
    subscribe: () => ({ unsubscribe: () => {} })
  }),
  removeChannel: () => {}
};

export default supabase;
