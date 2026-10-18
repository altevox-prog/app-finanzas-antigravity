import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '../utils/toast';
import { ensureUUID } from '../services/syncEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { normalizeRemoteRecurring } from '../services/sync/syncNormalizers';
import { toSafeNumber } from '../utils/financeMath';

/**
 * Normaliza y procesa un registro de pago recurrente/suscripción
 */
export function sanitizeRecurringItem(item) {
  if (!item || typeof item !== 'object') return item;
  const normalized = normalizeRemoteRecurring(item);
  const rawData = item.raw_data && typeof item.raw_data === 'object' ? item.raw_data : {};

  const cleanAmount = toSafeNumber(item.amount ?? rawData.amount ?? 0);
  const billingDay = Number(item.billingDay ?? item.billing_day ?? rawData.billingDay ?? rawData.billing_day ?? 1);
  const isActive = item.isActive !== false && item.active !== false && item.is_active !== false && rawData.isActive !== false;
  const nextPaymentDate = item.nextPaymentDate || item.next_payment_date || item.nextDate || item.next_date || rawData.nextPaymentDate || null;
  const accountId = item.accountId || item.account_id || rawData.accountId || rawData.account_id || '';
  const categoryName = item.categoryName || item.category || rawData.categoryName || rawData.category || 'General';

  return {
    ...normalized,
    ...rawData,
    id: item.id || 'rec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    name: item.name || rawData.name || 'Suscripción',
    amount: cleanAmount,
    originalAmount: cleanAmount,
    originalCurrency: item.originalCurrency || rawData.originalCurrency || 'COP',
    exchangeRate: toSafeNumber(item.exchangeRate || rawData.exchangeRate || 1),
    type: item.type || rawData.type || 'expense',
    mode: item.mode || rawData.mode || 'auto',
    frequency: item.frequency || rawData.frequency || 'monthly',
    billingDay,
    billing_day: billingDay,
    accountId,
    account_id: accountId,
    accountName: item.accountName || rawData.accountName || '',
    categoryId: item.categoryId || item.category_id || rawData.categoryId || '',
    category_id: item.categoryId || item.category_id || rawData.categoryId || '',
    categoryName,
    category: categoryName,
    isActive,
    is_active: isActive,
    active: isActive,
    nextPaymentDate,
    next_payment_date: nextPaymentDate,
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    created_at: item.createdAt || item.created_at || new Date().toISOString(),
    updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
    updated_at: item.updatedAt || item.updated_at || new Date().toISOString()
  };
}

/**
 * Mapea un objeto de pago recurrente al payload para Supabase
 */
export function mapRecurringToSupabasePayload(item, userId) {
  const cleanId = ensureUUID(item.id);
  const nowIso = new Date().toISOString();
  const cleanAmount = toSafeNumber(item.amount);
  const rawAccountId = item.accountId || item.account_id;
  const cleanAccountId = rawAccountId ? ensureUUID(rawAccountId) : null;

  return {
    id: cleanId,
    user_id: userId,
    name: item.name || 'Suscripción',
    amount: cleanAmount,
    type: item.type || 'expense',
    category: item.category || item.categoryName || 'General',
    frequency: item.frequency || 'monthly',
    billing_day: Number(item.billingDay || item.billing_day || 1),
    is_active: item.isActive !== false && item.active !== false && item.is_active !== false,
    account_id: cleanAccountId,
    next_payment_date: item.nextPaymentDate || item.next_payment_date || item.nextDate || item.next_date || null,
    raw_data: {
      ...item,
      amount: cleanAmount,
      updated_at: nowIso
    },
    updated_at: nowIso
  };
}

/**
 * useRecurringPayments
 * Hook de pagos recurrentes y suscripciones conectado a Supabase Puro y sincronizado en tiempo real (Realtime).
 */
export function useRecurringPayments(isResettingRef, options = {}) {
  const explicitUser = typeof isResettingRef === 'object' && isResettingRef?.user ? isResettingRef.user : options?.user;
  const resetRef = typeof isResettingRef === 'object' && 'current' in isResettingRef ? isResettingRef : options?.isResettingRef;

  // Estado limpio en memoria vacía
  const [recurringPayments, setRecurringPayments] = useState([]);
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
  const fetchRecurringPayments = useCallback(async (userId = null) => {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      let uid = userId || activeUserRef.current?.id;
      if (!uid) {
        const user = await getSupabaseUser();
        uid = user?.id;
      }
      if (!uid) return [];

      const { data, error } = await supabase
        .from('recurring_payments')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useRecurringPayments] Error al consultar pagos recurrentes en Supabase:', error);
        return [];
      }

      if (Array.isArray(data)) {
        const mapped = data.map(sanitizeRecurringItem);
        setRecurringPayments(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.error('[useRecurringPayments] Fallo al consultar pagos recurrentes:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    if (resetRef?.current) return;
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;

    fetchRecurringPayments(activeUser.id);
  }, [activeUser?.id, resetRef, fetchRecurringPayments]);

  // 3. Suscripción en Tiempo Real (Realtime WebSockets)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;

    const channelName = `realtime:recurring_payments:${activeUser.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recurring_payments',
          filter: `user_id=eq.${activeUser.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = sanitizeRecurringItem(payload.new);
            setRecurringPayments((prev) => {
              if (prev.some((r) => r.id === newItem.id || ensureUUID(r.id) === ensureUUID(newItem.id))) {
                return prev.map((r) => (r.id === newItem.id || ensureUUID(r.id) === ensureUUID(newItem.id) ? { ...r, ...newItem } : r));
              }
              return [newItem, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = sanitizeRecurringItem(payload.new);
            setRecurringPayments((prev) =>
              prev.map((r) => (r.id === updatedItem.id || ensureUUID(r.id) === ensureUUID(updatedItem.id) ? { ...r, ...updatedItem } : r))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setRecurringPayments((prev) => prev.filter((r) => r.id !== deletedId && ensureUUID(r.id) !== ensureUUID(deletedId)));
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

  // Agregar nuevo pago recurrente
  const handleAddRecurring = useCallback(async (item) => {
    const sanitizedItem = sanitizeRecurringItem(item);

    // Actualización optimista en React
    setRecurringPayments((prev) => [sanitizedItem, ...prev.filter((r) => r.id !== sanitizedItem.id)]);

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const payload = mapRecurringToSupabasePayload(sanitizedItem, user.id);
          const { error } = await supabase.from('recurring_payments').upsert(payload, { onConflict: 'id' });

          if (error) {
            // Reintentos defensivos si hay restricción de clave foránea en account_id
            if (error.code === '23503' || error.status === 409 || error.message?.includes('Key is not present in table')) {
              await supabase.from('recurring_payments').upsert({ ...payload, account_id: null }, { onConflict: 'id' });
            } else if (error.code === '42P10' || error.message?.includes('ON CONFLICT')) {
              const retryRes = await supabase.from('recurring_payments').upsert(payload, { onConflict: 'id,user_id' });
              if (retryRes.error && (retryRes.error.code === '23503' || retryRes.error.message?.includes('Key is not present in table'))) {
                await supabase.from('recurring_payments').upsert({ ...payload, account_id: null }, { onConflict: 'id,user_id' });
              }
            } else {
              console.warn('[useRecurringPayments] Advertencia upsert Supabase:', error);
            }
          }
        }
      } catch (e) {
        console.error('[useRecurringPayments] Excepción al guardar en Supabase:', e);
      }
    }

    toast.success('✓ Pago recurrente guardado con éxito');
    return sanitizedItem;
  }, []);

  const handleSaveRecurring = handleAddRecurring;

  // Actualizar pago recurrente existente
  const handleUpdateRecurring = useCallback(async (updatedItem) => {
    const sanitizedItem = sanitizeRecurringItem(updatedItem);

    // Actualización optimista en React
    setRecurringPayments((prev) =>
      prev.map((item) => (item.id === sanitizedItem.id || ensureUUID(item.id) === ensureUUID(sanitizedItem.id) ? sanitizedItem : item))
    );

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const payload = mapRecurringToSupabasePayload(sanitizedItem, user.id);
          const { error } = await supabase.from('recurring_payments').upsert(payload, { onConflict: 'id' });

          if (error) {
            if (error.code === '23503' || error.status === 409 || error.message?.includes('Key is not present in table')) {
              await supabase.from('recurring_payments').upsert({ ...payload, account_id: null }, { onConflict: 'id' });
            } else if (error.code === '42P10' || error.message?.includes('ON CONFLICT')) {
              const retryRes = await supabase.from('recurring_payments').upsert(payload, { onConflict: 'id,user_id' });
              if (retryRes.error && (retryRes.error.code === '23503' || retryRes.error.message?.includes('Key is not present in table'))) {
                await supabase.from('recurring_payments').upsert({ ...payload, account_id: null }, { onConflict: 'id,user_id' });
              }
            } else {
              console.warn('[useRecurringPayments] Advertencia update Supabase:', error);
            }
          }
        }
      } catch (e) {
        console.error('[useRecurringPayments] Excepción al actualizar en Supabase:', e);
      }
    }

    toast.success('✓ Pago recurrente actualizado con éxito');
    return sanitizedItem;
  }, []);

  // Eliminar pago recurrente
  const handleDeleteRecurring = useCallback(async (id) => {
    if (!id) return;
    const canonicalId = ensureUUID(id);

    // Actualización optimista en React
    setRecurringPayments((prev) =>
      prev.filter((item) => item.id !== id && ensureUUID(item.id) !== canonicalId)
    );

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        let query = supabase.from('recurring_payments').delete().eq('id', canonicalId);
        if (user?.id) {
          query = query.eq('user_id', user.id);
        }
        await query;
      } catch (err) {
        console.error('[useRecurringPayments] Error al eliminar en Supabase:', err);
      }
    }

    toast.info('Elemento eliminado');
  }, []);

  // Pausar / Activar pago recurrente
  const handleToggleActiveRecurring = useCallback(async (id) => {
    let itemToUpdate = null;

    setRecurringPayments((prev) => {
      const item = prev.find((r) => r.id === id || ensureUUID(r.id) === ensureUUID(id));
      if (!item) return prev;
      const isActive = item.isActive !== false;
      const updatedItem = { ...item, isActive: !isActive, is_active: !isActive, active: !isActive };
      itemToUpdate = updatedItem;
      return prev.map((r) => (r.id === id || ensureUUID(r.id) === ensureUUID(id) ? updatedItem : r));
    });

    if (itemToUpdate && isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const payload = mapRecurringToSupabasePayload(itemToUpdate, user.id);
          await supabase.from('recurring_payments').upsert(payload, { onConflict: 'id' });
        }
      } catch (err) {
        console.error('[useRecurringPayments] Error al alternar estado en Supabase:', err);
      }
    }
  }, []);

  // Restaurar / resetear pagos recurrentes en memoria
  const resetRecurringPayments = useCallback(() => {
    setRecurringPayments([]);
  }, []);

  return {
    recurringPayments,
    setRecurringPayments,
    subscriptions: recurringPayments,
    setSubscriptions: setRecurringPayments,
    handleAddRecurring,
    handleSaveRecurring,
    handleUpdateRecurring,
    handleDeleteRecurring,
    handleToggleActiveRecurring,
    fetchRecurringPayments,
    resetRecurringPayments
  };
}
