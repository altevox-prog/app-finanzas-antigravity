/**
 * Utilidad de Fusión y Conciliación de Datos (Local-First Reconciliation)
 * Evita la duplicación de cuentas y transacciones, garantiza coincidencia de UUIDs
 * y preserva los valores correctos de balances entre el almacenamiento local y Supabase.
 */

export function ensureUUID(id) {
  if (!id) return '';
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

export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return ensureUUID(`id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
}

/**
 * Reconcilia cuentas locales y remotas evitando duplicaciones estrictamente.
 * Agrupa por firma canónica (nombre + divisa), preserva saldos reales e impide
 * que cuentas eliminadas resuciten desde la nube.
 */
export function reconcileAccounts(localAccounts = [], remoteAccounts = [], options = {}) {
  const safeLocal = Array.isArray(localAccounts) ? localAccounts.filter(Boolean) : [];
  const safeRemote = Array.isArray(remoteAccounts) ? remoteAccounts.filter(Boolean) : [];

  // Leer lápidas (tombstones) de cuentas eliminadas
  const deletedIds = new Set();
  const deletedSignatures = new Set();
  try {
    if (typeof localStorage !== 'undefined') {
      const storedIds = JSON.parse(localStorage.getItem('presu_deleted_account_ids') || '[]');
      if (Array.isArray(storedIds)) storedIds.forEach(id => deletedIds.add(String(id)));
      const storedSigs = JSON.parse(localStorage.getItem('presu_deleted_account_signatures') || '[]');
      if (Array.isArray(storedSigs)) storedSigs.forEach(s => deletedSignatures.add(String(s).toLowerCase()));
    }
  } catch (e) {}

  const getSig = (acc) => {
    const name = (acc?.name || '').trim().toLowerCase();
    const curr = (acc?.currency || 'COP').toUpperCase();
    return `${name}___${curr}`;
  };

  const isTombstone = (acc) => {
    if (!acc) return true;
    const id = String(acc.id || '');
    const sig = getSig(acc);
    return deletedIds.has(id) || (id && deletedIds.has(ensureUUID(id))) || deletedSignatures.has(sig);
  };

  const isValidUUID = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

  const activeLocal = safeLocal.filter(a => !isTombstone(a));
  const activeRemote = safeRemote.filter(a => !isTombstone(a));

  const sigMap = new Map();
  const idMap = new Map(); // id_duplicado -> id_canonico
  const duplicateIds = [];

  const mergeTwo = (existing, incoming, isIncomingLocal) => {
    const primary = isIncomingLocal ? incoming : existing;
    const secondary = isIncomingLocal ? existing : incoming;

    let canonicalId = existing.id;
    if (isValidUUID(incoming.id) && !isValidUUID(existing.id)) {
      canonicalId = incoming.id;
    } else if (isValidUUID(existing.id)) {
      canonicalId = existing.id;
    } else {
      canonicalId = incoming.id || existing.id || generateUUID();
    }

    if (incoming.id && incoming.id !== canonicalId) {
      idMap.set(String(incoming.id), canonicalId);
      duplicateIds.push(String(incoming.id));
    }
    if (existing.id && existing.id !== canonicalId) {
      idMap.set(String(existing.id), canonicalId);
      duplicateIds.push(String(existing.id));
    }

    const pInit = Number(primary.initialBalance ?? primary.initial_balance ?? primary.balance ?? 0);
    const sInit = Number(secondary.initialBalance ?? secondary.initial_balance ?? secondary.balance ?? 0);
    const initialBalance = pInit !== 0 ? pInit : sInit;

    const pBal = Number(primary.balance ?? primary.currentBalance ?? primary.initial_balance ?? 0);
    const sBal = Number(secondary.balance ?? secondary.currentBalance ?? secondary.initial_balance ?? 0);
    const balance = pBal !== 0 ? pBal : (sBal !== 0 ? sBal : initialBalance);

    return {
      ...secondary,
      ...primary,
      id: canonicalId,
      name: (primary.name || secondary.name || 'Cuenta').trim(),
      type: primary.type || secondary.type || 'bank',
      currency: (primary.currency || secondary.currency || 'COP').toUpperCase(),
      initialBalance,
      balance,
      currentBalance: balance,
      color: primary.color || secondary.color || '#007AFF',
      icon: primary.icon || secondary.icon || 'Building2',
      updated_at: primary.updated_at || secondary.updated_at || new Date().toISOString()
    };
  };

  // 1. Procesar cuentas remotas agrupando por firma
  for (const r of activeRemote) {
    if (!r) continue;
    const sig = getSig(r);
    if (sigMap.has(sig)) {
      const merged = mergeTwo(sigMap.get(sig), r, false);
      sigMap.set(sig, merged);
    } else {
      const initBal = Number(r.initial_balance ?? r.initialBalance ?? r.balance ?? 0);
      const bal = Number(r.balance ?? r.initial_balance ?? r.initialBalance ?? 0);
      const norm = {
        ...r,
        id: isValidUUID(r.id) ? r.id : (r.id || generateUUID()),
        name: (r.name || 'Cuenta').trim(),
        currency: (r.currency || 'COP').toUpperCase(),
        initialBalance: initBal,
        balance: bal,
        currentBalance: bal
      };
      sigMap.set(sig, norm);
    }
  }

  // 2. Procesar cuentas locales (tienen prioridad para ediciones recientes)
  for (const l of activeLocal) {
    if (!l) continue;
    const sig = getSig(l);
    if (sigMap.has(sig)) {
      const merged = mergeTwo(sigMap.get(sig), l, true);
      sigMap.set(sig, merged);
    } else {
      const initBal = Number(l.initialBalance ?? l.balance ?? 0);
      const bal = Number(l.balance ?? l.initialBalance ?? 0);
      const norm = {
        ...l,
        id: isValidUUID(l.id) ? l.id : (l.id || generateUUID()),
        name: (l.name || 'Cuenta').trim(),
        currency: (l.currency || 'COP').toUpperCase(),
        initialBalance: initBal,
        balance: bal,
        currentBalance: bal
      };
      sigMap.set(sig, norm);
    }
  }

  const result = Array.from(sigMap.values());

  if (typeof options?.onDuplicatesFound === 'function' && duplicateIds.length > 0) {
    options.onDuplicatesFound(duplicateIds, idMap);
  }

  return result;
}

/**
 * Reconcilia transacciones locales y remotas evitando duplicaciones
 */
export function reconcileTransactions(localTxs = [], remoteTxs = []) {
  const safeLocal = Array.isArray(localTxs) ? localTxs.filter(Boolean) : [];
  const safeRemote = Array.isArray(remoteTxs) ? remoteTxs.filter(Boolean) : [];

  if (safeRemote.length === 0) return safeLocal;
  if (safeLocal.length === 0) return safeRemote;

  const result = [];
  const matchedRemoteIndices = new Set();

  for (const local of safeLocal) {
    const localId = String(local.id || '');
    const localUUID = ensureUUID(localId);

    const remoteIndex = safeRemote.findIndex((r, idx) => {
      if (matchedRemoteIndices.has(idx)) return false;
      const remoteId = String(r.id || '');
      if (remoteId === localId || remoteId === localUUID) return true;
      // Coincidencia por firma si los IDs difieren
      if (
        r.date === local.date &&
        Math.abs(Number(r.amount || 0) - Number(local.amount || 0)) < 0.01 &&
        r.type === local.type &&
        ((r.accountId && r.accountId === local.accountId) || (r.description && r.description === local.description))
      ) {
        return true;
      }
      return false;
    });

    if (remoteIndex !== -1) {
      matchedRemoteIndices.add(remoteIndex);
      const remote = safeRemote[remoteIndex];
      const canonicalId = (remote.id && remote.id.length >= 30) ? remote.id : local.id;
      result.push({
        ...remote,
        ...local,
        id: canonicalId,
        amount: Number(local.amount ?? remote.amount ?? 0),
        originalAmount: Number(local.originalAmount ?? remote.original_amount ?? local.amount ?? 0),
        exchangeRate: Number(local.exchangeRate ?? remote.exchange_rate ?? 1)
      });
    } else {
      result.push(local);
    }
  }

  safeRemote.forEach((r, idx) => {
    if (!matchedRemoteIndices.has(idx)) {
      result.push({
        ...r,
        amount: Number(r.amount || 0),
        originalAmount: Number(r.original_amount ?? r.originalAmount ?? r.amount ?? 0),
        exchangeRate: Number(r.exchange_rate ?? r.exchangeRate ?? 1)
      });
    }
  });

  return result;
}

export function mergeRecords(localList = [], remoteList = [], key = 'id') {
  const safeLocal = Array.isArray(localList) ? localList.filter(Boolean) : [];
  const safeRemote = Array.isArray(remoteList) ? remoteList.filter(Boolean) : [];

  if (safeRemote.length === 0) return safeLocal;
  if (safeLocal.length === 0) return safeRemote;

  const map = new Map();

  safeRemote.forEach((item) => {
    if (item && item[key]) {
      map.set(String(item[key]), item);
    }
  });

  safeLocal.forEach((item) => {
    if (item && item[key]) {
      const id = String(item[key]);
      const existing = map.get(id);
      if (!existing) {
        map.set(id, item);
      } else {
        const localTime = new Date(item.updated_at || item.updatedAt || item.date || 0).getTime();
        const remoteTime = new Date(existing.updated_at || existing.updatedAt || existing.date || 0).getTime();

        if (localTime >= remoteTime) {
          map.set(id, { ...existing, ...item });
        } else {
          map.set(id, { ...item, ...existing });
        }
      }
    }
  });

  return Array.from(map.values());
}
