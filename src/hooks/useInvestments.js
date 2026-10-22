import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toSafeNumber } from '../utils/financeMath';
import { toast } from '../utils/toast';
import { ensureUUID } from '../services/syncEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { consolidateInvestmentsList } from '../components/investments/utils/investmentConsolidation';
import { sanitizeInvestment, mapInvestmentToSupabasePayload, applyNewLot, applyDeleteLot } from '../components/investments/utils/investmentNormalizer';

const sortInvestments = (list) => [...list].sort((a, b) => (a.symbol || a.ticker || a.name || '').localeCompare(b.symbol || b.ticker || b.name || '') || String(a.id).localeCompare(String(b.id)));

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { if (isMounted) setActiveUser(s?.user || null); });
    return () => { isMounted = false; subscription?.unsubscribe(); };
  }, [explicitUser]);

  const fetchInvestments = useCallback(async (userId = null) => {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const uid = userId || activeUserRef.current?.id || (await getSupabaseUser())?.id;
      if (!uid) return [];
      const { data, error } = await supabase.from('investments').select('*').eq('user_id', uid).order('created_at', { ascending: false });
      if (error || !Array.isArray(data)) return [];
      const consolidated = sortInvestments(consolidateInvestmentsList(data.map(sanitizeInvestment)));
      setInvestments(consolidated);
      return consolidated;
    } catch { return []; }
  }, []);

  useEffect(() => {
    if (resetRef?.current || !isSupabaseConfigured || !supabase || !activeUser?.id) return;
    fetchInvestments(activeUser.id);
  }, [activeUser?.id, resetRef, fetchInvestments]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;
    const channel = supabase.channel(`realtime:inv:${activeUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investments', filter: `user_id=eq.${activeUser.id}` }, (p) => {
        if (p.eventType === 'DELETE' && p.old?.id) {
          setInvestments((prev) => prev.filter((i) => i.id !== p.old.id && ensureUUID(i.id) !== ensureUUID(p.old.id)));
        } else {
          const upd = sanitizeInvestment(p.new);
          setInvestments((prev) => sortInvestments(consolidateInvestmentsList([upd, ...prev.filter((i) => i.id !== upd.id && ensureUUID(i.id) !== ensureUUID(upd.id))])));
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeUser?.id]);

  const syncSupabase = useCallback(async (asset) => {
    const user = activeUserRef.current || (await getSupabaseUser());
    if (isSupabaseConfigured && supabase && user?.id) {
      await supabase.from('investments').upsert(mapInvestmentToSupabasePayload(asset, user.id), { onConflict: 'id' });
    }
  }, []);

  const handleAddInvestment = useCallback(async (rawInv) => {
    const sanitized = sanitizeInvestment(rawInv);
    const ticker = sanitized.ticker ? sanitized.ticker.toUpperCase().trim() : null;
    let target = sanitized;
    setInvestments((prev) => {
      const idx = ticker ? prev.findIndex((i) => i.ticker && i.ticker.toUpperCase().trim() === ticker) : -1;
      if (idx !== -1) {
        const lot = sanitized.lots?.[0] || { shares_count: sanitized.shares, purchase_price_per_share: sanitized.buyPrice, date: sanitized.startDate };
        target = applyNewLot(prev[idx], lot);
        const next = [...prev]; next[idx] = target; return sortInvestments(next);
      }
      return sortInvestments([sanitized, ...prev]);
    });
    await syncSupabase(target);
    toast.success('Inversión guardada correctamente');
    return target;
  }, [syncSupabase]);

  const handleUpdateInvestment = useCallback(async (inv) => {
    const sanitized = sanitizeInvestment(inv);
    setInvestments((prev) => sortInvestments(prev.map((i) => (i.id === sanitized.id || ensureUUID(i.id) === ensureUUID(sanitized.id) ? sanitized : i))));
    await syncSupabase(sanitized);
    toast.success('Inversión actualizada correctamente');
    return sanitized;
  }, [syncSupabase]);

  const handleDeleteInvestment = useCallback(async (invOrId) => {
    const cid = ensureUUID(typeof invOrId === 'object' ? invOrId.id : invOrId);
    setInvestments((prev) => prev.filter((i) => i.id !== invOrId && ensureUUID(i.id) !== cid));
    if (isSupabaseConfigured && supabase) {
      const user = activeUserRef.current || (await getSupabaseUser());
      let q = supabase.from('investments').delete().eq('id', cid);
      if (user?.id) q = q.eq('user_id', user.id);
      await q;
    }
    toast.info('Elemento eliminado');
    return null;
  }, []);

  const mutateLot = useCallback(async (assetId, mutatorFn, msg) => {
    let updated = null;
    setInvestments((prev) => sortInvestments(prev.map((item) => {
      if (item.id === assetId || ensureUUID(item.id) === ensureUUID(assetId)) {
        updated = mutatorFn(item); return updated;
      }
      return item;
    })));
    if (updated) { await syncSupabase(updated); toast.success(msg); }
  }, [syncSupabase]);

  const handleAddLot = useCallback((assetId, lot) => mutateLot(assetId, (a) => applyNewLot(a, lot), 'Lote agregado correctamente'), [mutateLot]);
  const handleDeleteLot = useCallback((assetId, lotId) => mutateLot(assetId, (a) => applyDeleteLot(a, lotId), 'Lote eliminado'), [mutateLot]);

  const portfolioStats = useMemo(() => investments.reduce((acc, inv) => {
    const invAmt = toSafeNumber(inv.investedAmount ?? inv.amount);
    const curAmt = toSafeNumber(inv.currentAmount ?? inv.currentValue ?? invAmt);
    acc.totalInvested += invAmt; acc.totalPortfolioValue += curAmt; acc.totalReturn += (curAmt - invAmt);
    return acc;
  }, { totalPortfolioValue: 0, totalInvested: 0, totalReturn: 0 }), [investments]);

  return {
    investments, setInvestments,
    handleAddInvestment, handleSaveInvestment: handleAddInvestment, addInvestment: handleAddInvestment,
    handleUpdateInvestment, updateInvestment: handleUpdateInvestment,
    handleDeleteInvestment, deleteInvestment: handleDeleteInvestment,
    handleAddLot, handleDeleteLot,
    fetchInvestments, resetInvestments: useCallback(() => setInvestments([]), []),
    ...portfolioStats
  };
}

export default useInvestments;
