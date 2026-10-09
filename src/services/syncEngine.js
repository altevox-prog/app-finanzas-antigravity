/**
 * Sync Engine 100% Local-First para Monety
 * No se realizan conexiones de red hacia Supabase.
 * Todas las operaciones de datos son estrictamente locales.
 */

import { reconcileAccounts, reconcileTransactions } from '../utils/recordMerger';

const SYNC_STATUS_EVENT = 'presu_sync_status_change';

/**
 * Emite evento de estado de sincronización hacia la UI (Header / Sidebar)
 * status: 'idle' | 'syncing' | 'offline' | 'error' | 'synced'
 */
export function emitSyncStatus(status = 'synced', detail = 'Modo local') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(SYNC_STATUS_EVENT, {
        detail: { status, detail, timestamp: Date.now() }
      })
    );
  }
}

/**
 * Convierte cualquier identificador local a un formato UUID válido y determinista
 */
export function ensureUUID(id) {
  if (!id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return '00000000-0000-4000-8000-000000000000';
  }
  const str = String(id);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;

  let hash1 = 0, hash2 = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1 + ch) | 0;
    hash2 = ((hash2 << 7) - hash2 + ch) | 0;
  }
  const p1 = Math.abs(hash1).toString(16).padStart(8, '0').slice(-8);
  const p2 = Math.abs(hash2).toString(16).padStart(4, '0').slice(-4);
  const p3 = Math.abs(hash1 ^ hash2).toString(16).padStart(12, '0').slice(-12);
  return `${p1}-${p2}-4000-8000-${p3}`;
}

/**
 * Normaliza el tipo de cuenta a slugs estándar en minúsculas
 */
export const normalizeAccountType = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('banc') || t.includes('débito') || t.includes('debito')) return 'bank';
  if (t.includes('efect') || t.includes('cash')) return 'cash';
  if (t.includes('billetera') || t.includes('wallet')) return 'wallet';
  if (t.includes('ahorro') || t.includes('saving')) return 'savings';
  if (t.includes('crédito') || t.includes('credito') || t.includes('credit') || t.includes('card')) return 'credit';
  if (t.includes('invers') || t.includes('invest')) return 'investment';
  return 'other';
};

// Funciones de sincronización y compatibilidad con manejo seguro de perfil
export const syncMutation = () => {};
export const queueOfflineMutation = () => {};
export const flushOfflineQueue = async () => {};
export const purgeCorruptOfflineQueue = () => {};
export const pushLocalDataToSupabase = async () => ({ success: true });

/**
 * Procesa la respuesta de la nube e hidrata los datos del usuario de forma segura.
 * Garantiza que cloudProfile esté debidamente declarado y desestructurado (data?.profile || null).
 */
export const fetchCloudData = async (userId, profileRes = null) => {
  const cloudProfile = profileRes?.data || profileRes?.profile || null;
  return { success: true, profile: cloudProfile };
};

export const fetchAndHydrateUserData = async (userId, profileRes = null) => {
  try {
    const cloudProfile = profileRes?.data || profileRes?.profile || null;
    return { success: true, profile: cloudProfile };
  } catch (err) {
    const cloudProfile = null;
    return { success: false, profile: cloudProfile, error: err };
  }
};

export const wn = fetchAndHydrateUserData;

export const processCloudProfile = (profileRes) => {
  const cloudProfile = profileRes?.data || profileRes?.profile || null;
  return cloudProfile;
};

export const migrateLocalDataToCloud = async () => ({ success: true });
export const subscribeToRealtimeChanges = () => () => {};
export const formatRecordForSupabase = (table, record) => ({ ...record });
export const extractRecordFromSupabase = (record) => record;

