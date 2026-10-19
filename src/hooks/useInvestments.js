import { useState, useEffect, useCallback, useRef } from 'react';
import { toSafeNumber } from '../utils/financeMath';
import { toast } from '../utils/toast';
import { ensureUUID } from '../services/syncEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { normalizeRemoteInvestment } from '../services/sync/syncNormalizers';

/**
 * Normaliza y sanea un registro de inversión para el estado de React
 */
export function sanitizeInvestment(inv) {
  if (!inv || typeof inv !== 'object') return inv;
  const normalized = normalizeRemoteInvestment(inv);

  let rawData = {};
  if (typeof inv.raw_data === 'string') {
    try {
      rawData = JSON.parse(inv.raw_data);
    } catch {
      rawData = {};
    }
  } else if (inv.raw_data && typeof inv.raw_data === 'object') {
    rawData = inv.raw_data;
  }

  const pickValidNumber = (...candidates) => {
    for (const c of candidates) {
      const n = Number(c);
      if (!isNaN(n) && n > 0) return n;
    }
    for (const c of candidates) {
      const n = Number(c);
      if (!isNaN(n) && c !== null && c !== undefined && c !== '') return n;
    }
    return 0;
  };

  const investedAmount = pickValidNumber(
    normalized.investedAmount,
    normalized.invested_amount,
    normalized.amount,
    rawData.investedAmount,
    rawData.invested_amount,
    rawData.amount,
    rawData.totalInvested,
    rawData.buyPrice,
    inv.investedAmount,
    inv.invested_amount,
    inv.amount,
    inv.totalInvested
  );

  const currentAmount = pickValidNumber(
    normalized.currentAmount,
    normalized.currentValue,
    normalized.current_value,
    rawData.currentAmount,
    rawData.currentValue,
    rawData.current_value,
    inv.currentAmount,
    inv.currentValue,
    inv.current_value,
    investedAmount
  );

  return {
    ...inv,
    ...rawData,
    ...normalized,
    id: inv.id || normalized.id || rawData.id || crypto.randomUUID(),
    name: inv.name || normalized.name || rawData.name || 'Inversión',
    ticker: inv.ticker || normalized.ticker || rawData.ticker || null,
    category: normalized.category || inv.category || rawData.category || 'fixed',
    assetType: normalized.assetType || inv.assetType || inv.asset_type || rawData.assetType || (inv.category === 'fixed' ? 'cdt' : 'other'),
    type: normalized.type || inv.subtype || inv.type || rawData.subtype || rawData.type || 'fixed_income',
    subtype: normalized.subtype || inv.subtype || inv.type || rawData.subtype || rawData.type || 'cdt',
    currency: (inv.currency || normalized.currency || rawData.currency || 'USD').toUpperCase(),
    quantity: toSafeNumber(inv.quantity || inv.shares || normalized.quantity || rawData.quantity),
    shares: toSafeNumber(inv.shares || inv.quantity || normalized.shares || rawData.shares),
    buyPrice: toSafeNumber(inv.buyPrice || inv.purchasePrice || normalized.buyPrice || rawData.buyPrice),
    currentPrice: toSafeNumber(inv.currentPrice || inv.unitPrice || inv.buyPrice || normalized.currentPrice || rawData.currentPrice),
    rate: Number(normalized.rate ?? inv.rate ?? rawData.rate ?? 0),
    interestRate: Number(normalized.interestRate ?? inv.interestRate ?? rawData.interestRate ?? normalized.rate ?? 0),
    institution: inv.institution || normalized.institution || rawData.institution || null,
    issueDate: inv.issueDate || inv.issue_date || normalized.issueDate || rawData.issueDate || null,
    dueDate: inv.dueDate || inv.due_date || normalized.dueDate || rawData.dueDate || null,
    startDate: inv.startDate || inv.start_date || normalized.startDate || rawData.startDate || null,
    investedAmount,
    invested_amount: investedAmount,
    amount: investedAmount,
    totalInvested: investedAmount,
    currentAmount,
    currentValue: currentAmount,
    current_value: currentAmount,
    created_at: inv.created_at || normalized.created_at || new Date().toISOString(),
    updated_at: inv.updated_at || normalized.updated_at || new Date().toISOString()
  };
}

/**
 * Mapea un objeto de inversión local al payload para Supabase
 */
export function mapInvestmentToSupabasePayload(inv, userId) {
  const cleanId = ensureUUID(inv.id);
  const nowIso = new Date().toISOString();
  const invested = toSafeNumber(inv.investedAmount ?? inv.invested_amount ?? inv.amount);
  const current = toSafeNumber(inv.currentAmount ?? inv.currentValue ?? inv.current_value ?? invested);

  const rawDataPayload = {
    quantity: toSafeNumber(inv.quantity || inv.shares),
    shares: toSafeNumber(inv.shares || inv.quantity),
    buyPrice: toSafeNumber(inv.buyPrice || inv.purchasePrice),
    currentPrice: toSafeNumber(inv.currentPrice || inv.unitPrice || inv.buyPrice),
    rate: toSafeNumber(inv.rate),
    institution: inv.institution || null,
    issueDate: inv.issueDate || inv.issue_date || null,
    dueDate: inv.dueDate || inv.due_date || null,
    subtype: inv.subtype || inv.type || 'stock',
    assetType: inv.assetType || inv.asset_type || inv.category || 'other',
    currency: (inv.currency || 'USD').toUpperCase(),
    investedAmount: invested,
    currentAmount: current,
    updated_at: nowIso
  };

  return {
    id: cleanId,
    user_id: userId,
    name: inv.name || 'Inversión',
    ticker: inv.ticker || null,
    category: inv.category || inv.assetType || 'stock',
    raw_data: rawDataPayload,
    updated_at: nowIso
  };
}

/**
 * useInvestments
 * Hook de gestión de inversiones y portafolio conectado a Supabase Puro y sincronizado en tiempo real (Realtime).
 */
export function useInvestments(isResettingRef, options = {}) {
  const explicitUser = typeof isResettingRef === 'object' && isResettingRef?.user ? isResettingRef.user : options?.user;
  const resetRef = typeof isResettingRef === 'object' && 'current' in isResettingRef ? isResettingRef : options?.isResettingRef;

  // Estado limpio en memoria
  const [investments, setInvestments] = useState([]);
  const [activeUser, setActiveUser] = useState(explicitUser || null);
  const activeUserRef = useRef(explicitUser || null);
  activeUserRef.current = activeUser;

  // 1. Detección y suscripción a la sesión del usuario de Supabase Auth
  useEffect(() => {
    if (explicitUser) {
      setActiveUser(explicitUser);
      return;
    }

    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;
    getSupabaseUser().then((u) => {
      if (isMounted && u?.id) {
        setActiveUser(u);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setActiveUser(session?.user || null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [explicitUser]);

  // 2. Consulta y carga inicial reactiva desde Supabase
  const fetchInvestments = useCallback(async (userId = null) => {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      let uid = userId || activeUserRef.current?.id;
      if (!uid) {
        const user = await getSupabaseUser();
        uid = user?.id;
      }
      if (!uid) return [];

      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useInvestments] Error al consultar inversiones en Supabase:', error);
        return [];
      }

      if (Array.isArray(data)) {
        const mapped = data.map(sanitizeInvestment);
        setInvestments(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.error('[useInvestments] Fallo al consultar inversiones:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    if (resetRef?.current) return;
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;

    fetchInvestments(activeUser.id);
  }, [activeUser?.id, resetRef, fetchInvestments]);

  // 3. Suscripción en Tiempo Real (Realtime WebSockets)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;

    const channelName = `realtime:investments:${activeUser.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investments',
          filter: `user_id=eq.${activeUser.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newInv = sanitizeInvestment(payload.new);
            setInvestments((prev) => {
              const matchIdx = prev.findIndex((inv) => inv.id === newInv.id || ensureUUID(inv.id) === ensureUUID(newInv.id));
              if (matchIdx !== -1) {
                const existing = prev[matchIdx];
                const merged = {
                  ...existing,
                  ...newInv,
                  investedAmount: newInv.investedAmount > 0 ? newInv.investedAmount : existing.investedAmount,
                  currentAmount: newInv.currentAmount > 0 ? newInv.currentAmount : (newInv.investedAmount > 0 ? newInv.investedAmount : existing.currentAmount)
                };
                const next = [...prev];
                next[matchIdx] = merged;
                return next;
              }
              return [newInv, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedInv = sanitizeInvestment(payload.new);
            setInvestments((prev) =>
              prev.map((inv) => {
                if (inv.id === updatedInv.id || ensureUUID(inv.id) === ensureUUID(updatedInv.id)) {
                  return {
                    ...inv,
                    ...updatedInv,
                    investedAmount: updatedInv.investedAmount > 0 ? updatedInv.investedAmount : inv.investedAmount,
                    currentAmount: updatedInv.currentAmount > 0 ? updatedInv.currentAmount : (updatedInv.investedAmount > 0 ? updatedInv.investedAmount : inv.currentAmount)
                  };
                }
                return inv;
              })
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setInvestments((prev) => prev.filter((inv) => inv.id !== deletedId && ensureUUID(inv.id) !== ensureUUID(deletedId)));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUser?.id]);

  // 4. Operaciones CRUD directas a Supabase

  // Agregar nueva inversión
  const handleAddInvestment = useCallback(async (newInv) => {
    const sanitizedInv = sanitizeInvestment(newInv);

    // Actualización optimista en React
    setInvestments((prev) => [sanitizedInv, ...prev]);

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const payload = mapInvestmentToSupabasePayload(sanitizedInv, user.id);
          const { error } = await supabase.from('investments').upsert(payload, { onConflict: 'id' });
          if (error) {
            console.warn('[useInvestments] Advertencia upsert Supabase:', error);
            toast.error('Error al guardar en la nube');
          }
        }
      } catch (e) {
        console.error('[useInvestments] Excepción al guardar inversión en Supabase:', e);
      }
    }

    toast.success('Inversión guardada correctamente');
    return sanitizedInv;
  }, []);

  const handleSaveInvestment = handleAddInvestment;

  // Actualizar inversión existente
  const handleUpdateInvestment = useCallback(async (updatedInv) => {
    const sanitizedInv = sanitizeInvestment(updatedInv);

    // Actualización optimista en React
    setInvestments((prev) => prev.map((inv) => (inv.id === sanitizedInv.id ? sanitizedInv : inv)));

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const payload = mapInvestmentToSupabasePayload(sanitizedInv, user.id);
          const { error } = await supabase.from('investments').upsert(payload, { onConflict: 'id' });
          if (error) {
            console.warn('[useInvestments] Advertencia upsert Supabase:', error);
            toast.error('Error al actualizar en la nube');
          }
        }
      } catch (e) {
        console.error('[useInvestments] Excepción al actualizar inversión en Supabase:', e);
      }
    }

    toast.success('Inversión actualizada correctamente');
    return sanitizedInv;
  }, []);

  // Eliminar inversión
  const handleDeleteInvestment = useCallback(async (invId) => {
    if (!invId) return;
    const canonicalId = ensureUUID(invId);

    // Actualización optimista en React
    setInvestments((prev) => prev.filter((inv) => inv.id !== invId && ensureUUID(inv.id) !== canonicalId));

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        let query = supabase.from('investments').delete().eq('id', canonicalId);
        if (user?.id) {
          query = query.eq('user_id', user.id);
        }
        const { error } = await query;
        if (error) {
          console.error('[useInvestments] Error al eliminar inversión en Supabase:', error);
        }
      } catch (err) {
        console.error('[useInvestments] Excepción al eliminar inversión en Supabase:', err);
      }
    }

    toast.info('Elemento eliminado');
  }, []);

  // Restaurar / resetear inversiones en memoria
  const resetInvestments = useCallback(() => {
    setInvestments([]);
  }, []);

  return {
    investments,
    setInvestments,
    handleAddInvestment,
    handleSaveInvestment,
    handleUpdateInvestment,
    handleDeleteInvestment,
    fetchInvestments,
    resetInvestments
  };
}
