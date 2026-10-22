import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from '../utils/toast';
import { ensureUUID } from '../services/syncEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { normalizeRemoteRecurring } from '../services/sync/syncNormalizers';
import { toSafeNumber } from '../utils/financeMath';

const sortRecurring = (list) => [...list].sort((a, b) => (new Date(b.created_at || 0) - new Date(a.created_at || 0)) || String(a.id).localeCompare(String(b.id)));

function sanitizeRecurringItem(item) {
  if (!item || typeof item !== 'object') return item;
  const norm = normalizeRemoteRecurring(item), raw = item.raw_data && typeof item.raw_data === 'object' ? item.raw_data : {};
  const cleanAmount = toSafeNumber(item.amount ?? raw.amount ?? 0), billingDay = Number(item.billingDay ?? item.billing_day ?? raw.billingDay ?? 1);
  const isActive = item.isActive !== false && item.active !== false && item.is_active !== false && raw.isActive !== false;
  const nextPaymentDate = item.nextPaymentDate || item.next_payment_date || item.nextDate || raw.nextPaymentDate || null;
  const accountId = item.accountId || item.account_id || raw.accountId || '', categoryName = item.categoryName || item.category || raw.categoryName || 'General';
  return {
    ...norm, ...raw, id: item.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: item.name || raw.name || 'Suscripción', amount: cleanAmount, originalAmount: cleanAmount,
    originalCurrency: item.originalCurrency || raw.originalCurrency || 'COP', exchangeRate: toSafeNumber(item.exchangeRate || raw.exchangeRate || 1),
    type: item.type || raw.type || 'expense', mode: item.mode || raw.mode || 'auto', frequency: item.frequency || raw.frequency || 'monthly',
    billingDay, billing_day: billingDay, accountId, account_id: accountId, accountName: item.accountName || raw.accountName || '',
    categoryId: item.categoryId || item.category_id || raw.categoryId || '', category_id: item.categoryId || item.category_id || raw.categoryId || '',
    categoryName, category: categoryName, isActive, is_active: isActive, active: isActive, nextPaymentDate, next_payment_date: nextPaymentDate,
    createdAt: item.createdAt || item.created_at || new Date().toISOString(), created_at: item.createdAt || item.created_at || new Date().toISOString(),
    updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(), updated_at: item.updatedAt || item.updated_at || new Date().toISOString()
  };
}

function mapRecurringToSupabasePayload(item, userId) {
  const cleanId = ensureUUID(item.id), nowIso = new Date().toISOString(), cleanAmount = toSafeNumber(item.amount), rawAcc = item.accountId || item.account_id;
  return {
    id: cleanId, user_id: userId, name: item.name || 'Suscripción', amount: cleanAmount, type: item.type || 'expense', category: item.category || item.categoryName || 'General', frequency: item.frequency || 'monthly', billing_day: Number(item.billingDay || item.billing_day || 1), is_active: item.isActive !== false && item.active !== false && item.is_active !== false, account_id: rawAcc ? ensureUUID(rawAcc) : null, next_payment_date: item.nextPaymentDate || item.next_payment_date || null, raw_data: { ...item, amount: cleanAmount, updated_at: nowIso }, updated_at: nowIso
  };
}

async function upsertRecurringSafe(payload) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { error } = await supabase.from('recurring_payments').upsert(payload, { onConflict: 'id' });
    if (error && (error.code === '23503' || error.status === 409 || error.message?.includes('Key is not present in table'))) {
      await supabase.from('recurring_payments').upsert({ ...payload, account_id: null }, { onConflict: 'id' });
    }
  } catch (e) { console.error('[useRecurringPayments] Upsert error:', e); }
}

export function useRecurringPayments(isResettingRef, options = {}) {
  const explicitUser = typeof isResettingRef === 'object' && isResettingRef?.user ? isResettingRef.user : options?.user;
  const resetRef = typeof isResettingRef === 'object' && 'current' in isResettingRef ? isResettingRef : options?.isResettingRef;
  const [recurringPayments, setRecurringPayments] = useState([]);
  const [activeUser, setActiveUser] = useState(explicitUser || null);
  const activeUserRef = useRef(explicitUser || null);
  activeUserRef.current = activeUser;

  useEffect(() => {
    if (explicitUser) { setActiveUser(explicitUser); return; }
    if (!isSupabaseConfigured || !supabase) return;
    let isMounted = true;
    getSupabaseUser().then((u) => { if (isMounted && u?.id) setActiveUser(u); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => { if (isMounted) setActiveUser(session?.user || null); });
    return () => { isMounted = false; subscription?.unsubscribe(); };
  }, [explicitUser]);

  const fetchRecurringPayments = useCallback(async (userId = null) => {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const uid = userId || activeUserRef.current?.id || (await getSupabaseUser())?.id;
      if (!uid) return [];
      const { data, error } = await supabase.from('recurring_payments').select('*').eq('user_id', uid).order('created_at', { ascending: false });
      if (error || !Array.isArray(data)) return [];
      const mapped = sortRecurring(data.map(sanitizeRecurringItem));
      setRecurringPayments(mapped);
      return mapped;
    } catch { return []; }
  }, []);

  useEffect(() => {
    if (resetRef?.current || !isSupabaseConfigured || !supabase || !activeUser?.id) return;
    fetchRecurringPayments(activeUser.id);
  }, [activeUser?.id, resetRef, fetchRecurringPayments]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;
    const channel = supabase.channel(`realtime:rec:${activeUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_payments', filter: `user_id=eq.${activeUser.id}` }, (payload) => {
        if (payload.eventType === 'DELETE' && payload.old?.id) {
          setRecurringPayments((p) => p.filter((r) => r.id !== payload.old.id && ensureUUID(r.id) !== ensureUUID(payload.old.id)));
        } else {
          const item = sanitizeRecurringItem(payload.new);
          setRecurringPayments((p) => sortRecurring([item, ...p.filter((r) => r.id !== item.id && ensureUUID(r.id) !== ensureUUID(item.id))]));
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeUser?.id]);

  const dispatchMutation = useCallback(async (action, itemOrId) => {
    const user = activeUserRef.current || (await getSupabaseUser());
    if (action === 'delete') {
      const cid = ensureUUID(itemOrId);
      setRecurringPayments((prev) => prev.filter((r) => r.id !== itemOrId && ensureUUID(r.id) !== cid));
      if (isSupabaseConfigured && supabase) {
        let q = supabase.from('recurring_payments').delete().eq('id', cid);
        if (user?.id) q = q.eq('user_id', user.id);
        await q;
      }
      toast.info('Elemento eliminado');
      return null;
    }
    if (action === 'toggle') {
      let updatedItem = null;
      setRecurringPayments((prev) => sortRecurring(prev.map((r) => {
        if (r.id === itemOrId || ensureUUID(r.id) === ensureUUID(itemOrId)) {
          const nextActive = r.isActive === false;
          updatedItem = { ...r, isActive: nextActive, is_active: nextActive, active: nextActive };
          return updatedItem;
        }
        return r;
      })));
      if (updatedItem && user?.id) await upsertRecurringSafe(mapRecurringToSupabasePayload(updatedItem, user.id));
      return updatedItem;
    }
    const sanitized = sanitizeRecurringItem(itemOrId);
    setRecurringPayments((prev) => sortRecurring([sanitized, ...prev.filter((r) => r.id !== sanitized.id && ensureUUID(r.id) !== ensureUUID(sanitized.id))]));
    if (user?.id) await upsertRecurringSafe(mapRecurringToSupabasePayload(sanitized, user.id));
    toast.success(action === 'add' ? '✓ Pago recurrente guardado con éxito' : '✓ Pago recurrente actualizado con éxito');
    return sanitized;
  }, []);

  const projectedMonthlyTotal = useMemo(() => recurringPayments.reduce((acc, r) => {
    if (r.isActive === false || r.active === false || r.is_active === false) return acc;
    const mult = { yearly: 1 / 12, anual: 1 / 12, weekly: 4.33, semanal: 4.33, biweekly: 2.16, quincenal: 2.16 }[String(r.frequency).toLowerCase()] || 1;
    return acc + (toSafeNumber(r.amount) * mult);
  }, 0), [recurringPayments]);

  return {
    recurringPayments, setRecurringPayments, subscriptions: recurringPayments, setSubscriptions: setRecurringPayments,
    handleAddRecurring: (i) => dispatchMutation('add', i), handleSaveRecurring: (i) => dispatchMutation('add', i), addRecurringPayment: (i) => dispatchMutation('add', i),
    handleUpdateRecurring: (i) => dispatchMutation('update', i), updateRecurringPayment: (i) => dispatchMutation('update', i),
    handleDeleteRecurring: (id) => dispatchMutation('delete', id), deleteRecurringPayment: (id) => dispatchMutation('delete', id),
    handleToggleActiveRecurring: (id) => dispatchMutation('toggle', id), toggleStatus: (id) => dispatchMutation('toggle', id),
    projectedMonthlyTotal, fetchRecurringPayments, resetRecurringPayments: useCallback(() => setRecurringPayments([]), [])
  };
}

export default useRecurringPayments;
