export function ensureUUID(id) {
  if (!id) return '';
  const str = String(id);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)) return str;
  let h1 = 0, h2 = 0;
  for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = ((h1 << 5) - h1 + ch) | 0; h2 = ((h2 << 7) - h2 + ch) | 0; }
  return `${Math.abs(h1).toString(16).padStart(8, '0').slice(-8)}-${Math.abs(h2).toString(16).padStart(4, '0').slice(-4)}-4000-8000-${Math.abs(h1 ^ h2).toString(16).padStart(12, '0').slice(-12)}`;
}

export const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ensureUUID(`id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

export function reconcileAccounts(localAccounts = [], remoteAccounts = [], options = {}) {
  const safeLocal = Array.isArray(localAccounts) ? localAccounts.filter(Boolean) : [];
  const safeRemote = Array.isArray(remoteAccounts) ? remoteAccounts.filter(Boolean) : [];

  const deletedIds = new Set(), deletedSignatures = new Set();
  try {
    if (typeof localStorage !== 'undefined') {
      const storedIds = JSON.parse(localStorage.getItem('presu_deleted_account_ids') || '[]');
      if (Array.isArray(storedIds)) storedIds.forEach((id) => deletedIds.add(String(id)));
      const storedSigs = JSON.parse(localStorage.getItem('presu_deleted_account_signatures') || '[]');
      if (Array.isArray(storedSigs)) storedSigs.forEach((s) => deletedSignatures.add(String(s).toLowerCase()));
    }
  } catch {}

  const getSig = (acc) => `${(acc?.name || '').trim().toLowerCase()}___${(acc?.currency || 'COP').toUpperCase()}`;
  const isTombstone = (acc) => !acc || deletedIds.has(String(acc.id || '')) || (acc.id && deletedIds.has(ensureUUID(acc.id))) || deletedSignatures.has(getSig(acc));
  const isValidUUID = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

  const sigMap = new Map(), idMap = new Map(), duplicateIds = [];

  const mergeTwo = (existing, incoming, isIncomingLocal) => {
    const primary = isIncomingLocal ? incoming : existing, secondary = isIncomingLocal ? existing : incoming;
    const canonicalId = isValidUUID(incoming.id) && !isValidUUID(existing.id) ? incoming.id : (isValidUUID(existing.id) ? existing.id : (incoming.id || existing.id || generateUUID()));

    [incoming.id, existing.id].forEach((id) => {
      if (id && id !== canonicalId) { idMap.set(String(id), canonicalId); duplicateIds.push(String(id)); }
    });

    const pInit = Number(primary.initialBalance ?? primary.initial_balance ?? primary.balance ?? 0), sInit = Number(secondary.initialBalance ?? secondary.initial_balance ?? secondary.balance ?? 0);
    const initialBalance = pInit !== 0 ? pInit : sInit;
    const pBal = Number(primary.balance ?? primary.currentBalance ?? primary.initial_balance ?? 0), sBal = Number(secondary.balance ?? secondary.currentBalance ?? secondary.initial_balance ?? 0);
    const balance = pBal !== 0 ? pBal : (sBal !== 0 ? sBal : initialBalance);

    return {
      ...secondary, ...primary, id: canonicalId, name: (primary.name || secondary.name || 'Cuenta').trim(),
      type: primary.type || secondary.type || 'bank', currency: (primary.currency || secondary.currency || 'COP').toUpperCase(),
      initialBalance, balance, currentBalance: balance, color: primary.color || secondary.color || '#007AFF',
      icon: primary.icon || secondary.icon || 'Building2', updated_at: primary.updated_at || secondary.updated_at || new Date().toISOString()
    };
  };

  const processList = (list, isLocal) => {
    for (const acc of list) {
      if (!acc || isTombstone(acc)) continue;
      const sig = getSig(acc);
      if (sigMap.has(sig)) {
        sigMap.set(sig, mergeTwo(sigMap.get(sig), acc, isLocal));
      } else {
        const bal = Number(acc.balance ?? acc.initial_balance ?? acc.initialBalance ?? 0);
        sigMap.set(sig, {
          ...acc, id: isValidUUID(acc.id) ? acc.id : (acc.id || generateUUID()),
          name: (acc.name || 'Cuenta').trim(), currency: (acc.currency || 'COP').toUpperCase(),
          initialBalance: Number(acc.initial_balance ?? acc.initialBalance ?? acc.balance ?? 0),
          balance: bal, currentBalance: bal
        });
      }
    }
  };

  processList(safeRemote, false);
  processList(safeLocal, true);

  if (typeof options?.onDuplicatesFound === 'function' && duplicateIds.length > 0) {
    options.onDuplicatesFound(duplicateIds, idMap);
  }

  return Array.from(sigMap.values());
}

export function reconcileTransactions(localTxs = [], remoteTxs = []) {
  const safeLocal = Array.isArray(localTxs) ? localTxs.filter(Boolean) : [], safeRemote = Array.isArray(remoteTxs) ? remoteTxs.filter(Boolean) : [];
  if (!safeRemote.length) return safeLocal;
  if (!safeLocal.length) return safeRemote;

  const result = [], matchedRemoteIndices = new Set();
  for (const local of safeLocal) {
    const localId = String(local.id || ''), localUUID = ensureUUID(localId);
    const remoteIndex = safeRemote.findIndex((r, idx) => {
      if (matchedRemoteIndices.has(idx)) return false;
      const remoteId = String(r.id || '');
      if (remoteId === localId || remoteId === localUUID) return true;
      return r.date === local.date && Math.abs(Number(r.amount || 0) - Number(local.amount || 0)) < 0.01 && r.type === local.type && ((r.accountId && r.accountId === local.accountId) || (r.description && r.description === local.description));
    });

    if (remoteIndex !== -1) {
      matchedRemoteIndices.add(remoteIndex);
      const remote = safeRemote[remoteIndex];
      result.push({ ...remote, ...local, id: (remote.id && remote.id.length >= 30) ? remote.id : local.id, amount: Number(local.amount ?? remote.amount ?? 0), originalAmount: Number(local.originalAmount ?? remote.original_amount ?? local.amount ?? 0), exchangeRate: Number(local.exchangeRate ?? remote.exchange_rate ?? 1) });
    } else {
      result.push(local);
    }
  }

  safeRemote.forEach((r, idx) => {
    if (!matchedRemoteIndices.has(idx)) result.push({ ...r, amount: Number(r.amount || 0), originalAmount: Number(r.original_amount ?? r.originalAmount ?? r.amount ?? 0), exchangeRate: Number(r.exchange_rate ?? r.exchangeRate ?? 1) });
  });
  return result;
}

export function mergeRecords(localList = [], remoteList = [], key = 'id') {
  const safeLocal = Array.isArray(localList) ? localList.filter(Boolean) : [], safeRemote = Array.isArray(remoteList) ? remoteList.filter(Boolean) : [];
  if (!safeRemote.length) return safeLocal;
  if (!safeLocal.length) return safeRemote;

  const map = new Map();
  safeRemote.forEach((item) => { if (item?.[key]) map.set(String(item[key]), item); });
  safeLocal.forEach((item) => {
    if (item?.[key]) {
      const id = String(item[key]), existing = map.get(id);
      if (!existing) map.set(id, item);
      else {
        const localTime = new Date(item.updated_at || item.updatedAt || item.date || 0).getTime();
        const remoteTime = new Date(existing.updated_at || existing.updatedAt || existing.date || 0).getTime();
        map.set(id, localTime >= remoteTime ? { ...existing, ...item } : { ...item, ...existing });
      }
    }
  });
  return Array.from(map.values());
}
