import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toSafeNumber } from '../utils/financeMath';
import { toast } from '../utils/toast';
import { ensureUUID } from '../services/syncEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { normalizeRemoteInvestment } from '../services/sync/syncNormalizers';

function sanitizeInvestment(inv) {
  if (!inv || typeof inv !== 'object') return inv;
  const raw = typeof inv.raw_data === 'string' ? (() => { try { return JSON.parse(inv.raw_data); } catch { return {}; } })() : (inv.raw_data || {});
  const norm = normalizeRemoteInvestment({ ...raw, ...inv });
  const investedAmount = norm.investedAmount || norm.amount || 0;
  const currentAmount = norm.currentAmount || norm.currentValue || investedAmount;

  return {
    ...inv, ...raw, ...norm, id: inv.id || norm.id || raw.id || crypto.randomUUID(),
    name: inv.name || norm.name || raw.name || 'Inversión', ticker: inv.ticker || norm.ticker || raw.ticker || null,
    category: norm.category || 'fixed', assetType: norm.assetType || (norm.category === 'fixed' ? 'cdt' : 'other'),
    type: norm.type || 'fixed_income', subtype: norm.subtype || 'cdt',
    currency: (inv.currency || norm.currency || raw.currency || 'USD').toUpperCase(),
    quantity: toSafeNumber(inv.quantity || inv.shares || norm.quantity || raw.quantity),
    shares: toSafeNumber(inv.shares || inv.quantity || norm.shares || raw.shares),
    buyPrice: toSafeNumber(inv.buyPrice || inv.purchasePrice || norm.buyPrice || raw.buyPrice),
    currentPrice: toSafeNumber(inv.currentPrice || inv.unitPrice || inv.buyPrice || norm.currentPrice || raw.currentPrice),
    rate: Number(norm.rate ?? inv.rate ?? raw.rate ?? 0),
    interestRate: Number(norm.interestRate ?? inv.interestRate ?? raw.interestRate ?? norm.rate ?? 0),
    institution: inv.institution || norm.institution || raw.institution || null,
    issueDate: inv.issueDate || inv.issue_date || norm.issueDate || raw.issueDate || null,
    dueDate: inv.dueDate || inv.due_date || norm.dueDate || raw.dueDate || null,
    startDate: inv.startDate || inv.start_date || norm.startDate || raw.startDate || null,
    investedAmount, invested_amount: investedAmount, amount: investedAmount, totalInvested: investedAmount,
    currentAmount, currentValue: currentAmount, current_value: currentAmount,
    created_at: inv.created_at || norm.created_at || new Date().toISOString(),
    updated_at: inv.updated_at || norm.updated_at || new Date().toISOString()
  };
}

function mapInvestmentToSupabasePayload(inv, userId) {
  const cleanId = ensureUUID(inv.id), nowIso = new Date().toISOString();
  const invested = toSafeNumber(inv.investedAmount ?? inv.invested_amount ?? inv.amount);
  const current = toSafeNumber(inv.currentAmount ?? inv.currentValue ?? inv.current_value ?? invested);

  return {
    id: cleanId, user_id: userId, name: inv.name || 'Inversión', ticker: inv.ticker || null,
    category: inv.category || inv.assetType || 'stock',
    raw_data: {
      quantity: toSafeNumber(inv.quantity || inv.shares), shares: toSafeNumber(inv.shares || inv.quantity),
      buyPrice: toSafeNumber(inv.buyPrice || inv.purchasePrice), currentPrice: toSafeNumber(inv.currentPrice || inv.unitPrice || inv.buyPrice),
      rate: toSafeNumber(inv.rate), institution: inv.institution || null, issueDate: inv.issueDate || inv.issue_date || null,
      dueDate: inv.dueDate || inv.due_date || null, subtype: inv.subtype || inv.type || 'stock',
      assetType: inv.assetType || inv.asset_type || inv.category || 'other', currency: (inv.currency || 'USD').toUpperCase(),
      investedAmount: invested, currentAmount: current, updated_at: nowIso
    },
    updated_at: nowIso
  };
}

export function useInvestments(isResettingRef, options = {}) {
  const explicitUser = typeof isResettingRef === 'object' && isResettingRef?.user ? isResettingRef.user : options?.user;
  const resetRef = typeof isResettingRef === 'object' && 'current' in isResettingRef ? isResettingRef : options?.isResettingRef;
  const [investments, setInvestments] = useState([]);
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

  const fetchInvestments = useCallback(async (userId = null) => {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const uid = userId || activeUserRef.current?.id || (await getSupabaseUser())?.id;
      if (!uid) return [];
      const { data, error } = await supabase.from('investments').select('*').eq('user_id', uid).order('created_at', { ascending: false });
      if (error || !Array.isArray(data)) return [];
      const mapped = data.map(sanitizeInvestment);
      setInvestments(mapped);
      return mapped;
    } catch { return []; }
  }, []);

  useEffect(() => {
    if (resetRef?.current || !isSupabaseConfigured || !supabase || !activeUser?.id) return;
    fetchInvestments(activeUser.id);
  }, [activeUser?.id, resetRef, fetchInvestments]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;
    const channel = supabase.channel(`realtime:inv:${activeUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investments', filter: `user_id=eq.${activeUser.id}` }, (payload) => {
        if (payload.eventType === 'DELETE' && payload.old?.id) {
          setInvestments((p) => p.filter((inv) => inv.id !== payload.old.id && ensureUUID(inv.id) !== ensureUUID(payload.old.id)));
        } else {
          const updated = sanitizeInvestment(payload.new);
          setInvestments((prev) => {
            const idx = prev.findIndex((i) => i.id === updated.id || ensureUUID(i.id) === ensureUUID(updated.id));
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = { ...prev[idx], ...updated, investedAmount: updated.investedAmount || prev[idx].investedAmount, currentAmount: updated.currentAmount || prev[idx].currentAmount };
              return next;
            }
            return [updated, ...prev];
          });
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeUser?.id]);

  const mutateInvestment = useCallback(async (action, invOrId) => {
    const user = activeUserRef.current || (await getSupabaseUser());
    if (action === 'delete') {
      const cid = ensureUUID(invOrId);
      setInvestments((prev) => prev.filter((inv) => inv.id !== invOrId && ensureUUID(inv.id) !== cid));
      if (isSupabaseConfigured && supabase) {
        let q = supabase.from('investments').delete().eq('id', cid);
        if (user?.id) q = q.eq('user_id', user.id);
        await q;
      }
      toast.info('Elemento eliminado');
      return null;
    }
    const sanitized = sanitizeInvestment(invOrId);
    setInvestments((prev) => action === 'add'
      ? [sanitized, ...prev.filter((i) => i.id !== sanitized.id && ensureUUID(i.id) !== ensureUUID(sanitized.id))]
      : prev.map((i) => (i.id === sanitized.id || ensureUUID(i.id) === ensureUUID(sanitized.id) ? sanitized : i))
    );
    if (isSupabaseConfigured && supabase && user?.id) {
      const { error } = await supabase.from('investments').upsert(mapInvestmentToSupabasePayload(sanitized, user.id), { onConflict: 'id' });
      if (error) toast.error('Error al sincronizar inversión');
    }
    toast.success(action === 'add' ? 'Inversión guardada correctamente' : 'Inversión actualizada correctamente');
    return sanitized;
  }, []);

  const handleAddInvestment = useCallback((inv) => mutateInvestment('add', inv), [mutateInvestment]);
  const handleUpdateInvestment = useCallback((inv) => mutateInvestment('update', inv), [mutateInvestment]);
  const handleDeleteInvestment = useCallback((id) => mutateInvestment('delete', id), [mutateInvestment]);

  const portfolioStats = useMemo(() => investments.reduce((acc, inv) => {
    const invested = toSafeNumber(inv.investedAmount ?? inv.amount);
    const current = toSafeNumber(inv.currentAmount ?? inv.currentValue ?? invested);
    acc.totalInvested += invested;
    acc.totalPortfolioValue += current;
    acc.totalReturn += (current - invested);
    return acc;
  }, { totalPortfolioValue: 0, totalInvested: 0, totalReturn: 0 }), [investments]);

  return {
    investments, setInvestments,
    handleAddInvestment, handleSaveInvestment: handleAddInvestment, addInvestment: handleAddInvestment,
    handleUpdateInvestment, updateInvestment: handleUpdateInvestment,
    handleDeleteInvestment, deleteInvestment: handleDeleteInvestment,
    fetchInvestments, resetInvestments: useCallback(() => setInvestments([]), []),
    ...portfolioStats
  };
}

export default useInvestments;
