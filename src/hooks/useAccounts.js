import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { normalizeAccountType, ensureUUID } from '../services/syncEngine';
import { generateUUID } from '../utils/recordMerger';
import { toSafeNumber } from '../utils/financeMath';
import { getAccountNativeBalance } from '../utils/currencyUtils';
import { triggerSaveFeedback } from '../utils/saveFeedback';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { normalizeRemoteAccount } from '../services/sync/syncNormalizers';

function mapSupabaseRowToAccount(row) {
  if (!row || typeof row !== 'object') return row;
  const raw = row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {};
  const balance = toSafeNumber(row.balance ?? row.current_balance ?? row.initial_balance ?? raw.balance ?? 0);
  const rawInit = row.initial_balance ?? raw.initial_balance;
  const init = toSafeNumber(rawInit !== undefined && rawInit !== null && Number(rawInit) !== 0 ? rawInit : balance);
  return {
    ...normalizeRemoteAccount(row), id: row.id, user_id: row.user_id, userId: row.user_id,
    name: (row.name || raw.name || 'Cuenta').trim(), type: normalizeAccountType(row.type || raw.type),
    currency: (row.currency || raw.currency || 'COP').toUpperCase(), balance, currentBalance: balance, current_balance: balance,
    initialBalance: init, initial_balance: init, color: row.color || raw.color || '#007AFF', icon: row.icon || raw.icon || 'Building2',
    order_index: Number(row.order_index ?? raw.order_index ?? 0), is_archived: Boolean(row.is_archived ?? raw.is_archived ?? false),
    created_at: row.created_at || new Date().toISOString(), updated_at: row.updated_at || new Date().toISOString()
  };
}

export function useAccounts({
  isResettingRef, transactions = [], transactionsRef, trm = 4050, setTransactions, setTransactionsRef, user: explicitUser = null
} = {}) {
  const [accounts, setAccounts] = useState([]);
  const [activeUser, setActiveUser] = useState(explicitUser), activeUserRef = useRef(explicitUser);
  activeUserRef.current = activeUser;

  useEffect(() => {
    if (explicitUser) { setActiveUser(explicitUser); return; }
    if (!isSupabaseConfigured || !supabase) return;
    let mounted = true;
    getSupabaseUser().then((u) => { if (mounted && u?.id) setActiveUser(u); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => { if (mounted) setActiveUser(s?.user || null); });
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, [explicitUser]);

  const getActiveTransactions = useCallback(() => transactionsRef?.current || transactions, [transactions, transactionsRef]);
  const getActiveSetTransactions = useCallback(() => setTransactionsRef?.current || setTransactions, [setTransactions, setTransactionsRef]);
  const fetchAccounts = useCallback(async (userId = null) => {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const uid = userId || activeUserRef.current?.id || (await getSupabaseUser())?.id;
      if (!uid) return [];
      const { data, error } = await supabase.from('accounts').select('*').eq('user_id', uid).order('order_index', { ascending: true, nullsFirst: false });
      if (error) return [];
      const mapped = (data || []).filter((r) => !r.user_id || r.user_id === uid).map(mapSupabaseRowToAccount).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      setAccounts(mapped); return mapped;
    } catch { return []; }
  }, []);

  useEffect(() => {
    if (isResettingRef?.current || !isSupabaseConfigured || !supabase || !activeUser?.id) return;
    fetchAccounts(activeUser.id);
  }, [activeUser?.id, isResettingRef, fetchAccounts]);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;
    const channel = supabase.channel(`realtime:accounts:${activeUser.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter: `user_id=eq.${activeUser.id}` }, (p) => {
      if (p.new?.user_id && p.new.user_id !== activeUser.id) return;
      if (p.eventType === 'INSERT' || p.eventType === 'UPDATE') {
        const acc = mapSupabaseRowToAccount(p.new);
        setAccounts((prev) => (prev.some((a) => a.id === acc.id) ? prev.map((a) => (a.id === acc.id ? { ...a, ...acc } : a)) : [...prev, acc]).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));
      } else if (p.eventType === 'DELETE' && p.old?.id) {
        setAccounts((prev) => prev.filter((a) => a.id !== p.old.id));
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeUser?.id]);

  const syncAccountCloud = async (acc) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const u = activeUserRef.current || (await getSupabaseUser());
      if (u?.id) {
        await supabase.from('accounts').upsert({
          id: ensureUUID(acc.id), user_id: u.id, name: acc.name, type: acc.type, currency: acc.currency,
          balance: acc.balance, initial_balance: acc.initial_balance, icon: acc.icon, color: acc.color,
          order_index: acc.order_index, updated_at: acc.updated_at
        }, { onConflict: 'id' });
      }
    } catch (e) { console.error('[useAccounts] Upsert error:', e); }
  };

  const saveAccountMutation = useCallback(async (accountData, isUpdate = false) => {
    const existing = isUpdate ? (accounts.find((a) => a.id === accountData.id) || {}) : {}, id = (accountData.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(accountData.id)) ? accountData.id : (existing.id || generateUUID());
    const init = toSafeNumber(accountData.initialBalance ?? accountData.initial_balance ?? accountData.balance ?? existing.initialBalance ?? 0), balance = isUpdate ? getAccountNativeBalance({ ...existing, ...accountData, initialBalance: init }, getActiveTransactions(), trm) : init;
    const acc = {
      ...existing, ...accountData, id, name: (accountData.name || existing.name || 'Cuenta').trim(),
      type: normalizeAccountType(accountData.type || existing.type), currency: (accountData.currency || existing.currency || 'COP').toUpperCase(),
      initialBalance: init, initial_balance: init, balance, currentBalance: balance, current_balance: balance,
      color: accountData.color || existing.color || '#007AFF', icon: accountData.icon || existing.icon || 'Building2',
      order_index: typeof accountData.order_index === 'number' ? accountData.order_index : (existing.order_index ?? accounts.length), updated_at: new Date().toISOString()
    };
    setAccounts((prev) => (isUpdate ? prev.map((a) => (a.id === acc.id ? acc : a)) : [...prev.filter((a) => a.id !== id), acc]).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));
    if (isUpdate) getActiveSetTransactions()?.((prev) => prev.map((t) => (t.accountId === acc.id ? { ...t, accountName: acc.name } : t)));
    await syncAccountCloud(acc); triggerSaveFeedback(); return acc;
  }, [accounts, getActiveTransactions, trm, getActiveSetTransactions]);

  const handleDeleteAccount = useCallback(async (accountId) => {
    if (!accountId) return;
    const cid = ensureUUID(accountId);
    setAccounts((prev) => prev.filter((a) => a.id !== accountId && ensureUUID(a.id) !== accountId));
    getActiveSetTransactions()?.((prev) => prev.filter((t) => t.accountId !== accountId && t.accountId !== cid));
    if (isSupabaseConfigured && supabase) {
      try {
        const u = activeUserRef.current || (await getSupabaseUser());
        await Promise.all([supabase.from('accounts').delete().eq('id', cid).match(u?.id ? { user_id: u.id } : {}), supabase.from('transactions').delete().eq('account_id', cid).match(u?.id ? { user_id: u.id } : {})]);
      } catch (err) { console.error('[useAccounts] Delete error:', err); }
    }
    triggerSaveFeedback();
  }, [getActiveSetTransactions]);

  const handleReorderAccounts = useCallback((newAccounts) => {
    if (!Array.isArray(newAccounts)) return;
    const indexed = newAccounts.map((a, i) => ({ ...a, order_index: i }));
    setAccounts(indexed);
    if (isSupabaseConfigured && supabase) {
      getSupabaseUser().then((u) => { indexed.forEach((a) => supabase.from('accounts').update({ order_index: a.order_index }).eq('id', a.id).match(u?.id ? { user_id: u.id } : {})); }).catch((e) => console.error(e));
    }
  }, []);

  const handleArchiveAccount = useCallback(async (accountId, isArchived = true) => {
    const nowIso = new Date().toISOString();
    setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, is_archived: isArchived, updated_at: nowIso } : a)));
    if (isSupabaseConfigured && supabase) {
      const u = activeUserRef.current || (await getSupabaseUser());
      await supabase.from('accounts').update({ is_archived: isArchived, updated_at: nowIso }).eq('id', ensureUUID(accountId)).match(u?.id ? { user_id: u.id } : {});
    }
    triggerSaveFeedback();
  }, []);
  const handleAdjustAccountBalance = useCallback(async (accountId, newBalance) => {
    const bal = toSafeNumber(newBalance), nowIso = new Date().toISOString();
    setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, balance: bal, currentBalance: bal, initialBalance: bal, initial_balance: bal, updated_at: nowIso } : a)));
    if (isSupabaseConfigured && supabase) {
      const u = activeUserRef.current || (await getSupabaseUser());
      await supabase.from('accounts').update({ balance: bal, initial_balance: bal, updated_at: nowIso }).eq('id', ensureUUID(accountId)).match(u?.id ? { user_id: u.id } : {});
    }
    triggerSaveFeedback();
  }, []);

  const totalBalance = useMemo(() => accounts.reduce((acc, a) => {
    const c = a.currency || 'COP'; acc[c] = (acc[c] || 0) + (Number(a.balance) || 0); return acc;
  }, {}), [accounts]);
  const handleAdd = useCallback((acc) => saveAccountMutation(acc, false), [saveAccountMutation]);
  const handleUpdate = useCallback((acc) => saveAccountMutation(acc, true), [saveAccountMutation]);

  return {
    accounts, setAccounts, handleAddAccount: handleAdd, handleSaveAccount: handleAdd, createAccount: handleAdd,
    addAccount: handleAdd, handleUpdateAccount: handleUpdate, updateAccount: handleUpdate, handleDeleteAccount,
    deleteAccount: handleDeleteAccount, handleReorderAccounts, updateAccountsOrder: handleReorderAccounts,
    fetchAccounts, handleArchiveAccount, handleAdjustAccountBalance, resetAccounts: useCallback(() => setAccounts([]), []),
    totalBalance, loading: false, error: null
  };
}

export default useAccounts;
