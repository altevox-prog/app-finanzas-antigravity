import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { toast } from '../utils/toast';
import { ensureUUID } from '../services/syncEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

function getInitialRecurringPayments() {
  try {
    const savedRec = localStorage.getItem(STORAGE_KEYS.RECURRING_PAYMENTS) ||
                     localStorage.getItem('app_recurring');
    if (savedRec) {
      const parsed = JSON.parse(savedRec);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          ...item,
          billingDay: item.billingDay ?? item.billing_day ?? 1,
          isActive: item.isActive !== false && item.active !== false && item.is_active !== false,
          nextPaymentDate: item.nextPaymentDate || item.next_payment_date || item.nextDate || item.next_date || null,
          accountId: item.accountId || item.account_id || '',
          userId: item.userId || item.user_id || null
        }));
      }
    }
    const savedSubs = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS) ||
                      localStorage.getItem('subscriptions');
    if (savedSubs) {
      const parsedSubs = JSON.parse(savedSubs);
      if (Array.isArray(parsedSubs) && parsedSubs.length > 0) {
        return parsedSubs.map((s) => ({
          id: s.id || 'rec-' + Date.now() + Math.random(),
          name: s.name,
          amount: Number(s.amount) || 0,
          originalAmount: Number(s.amount) || 0,
          originalCurrency: 'COP',
          exchangeRate: 1,
          type: 'expense',
          mode: s.mode || 'auto',
          frequency: s.frequency || 'monthly',
          billingDay: s.billingDay ?? s.billing_day ?? 1,
          accountId: s.accountId || s.account_id || '',
          accountName: s.accountName || '',
          categoryId: s.categoryId || s.category_id || '',
          categoryName: s.categoryName || 'Suscripciones',
          isActive: s.isActive !== false && s.active !== false && s.is_active !== false,
          createdAt: s.createdAt || new Date().toISOString()
        }));
      }
    }
    return [];
  } catch (e) {
    console.error('Error parseando recurring_payments:', e);
    return [];
  }
}

function saveRecurringToStorage(items) {
  try {
    const serialized = JSON.stringify(items);
    localStorage.setItem(STORAGE_KEYS.RECURRING_PAYMENTS, serialized);
    localStorage.setItem('app_recurring', serialized);
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, serialized);
    localStorage.setItem('subscriptions', serialized);
  } catch (e) {
    console.error('Error guardando pagos recurrentes:', e);
  }
}

export function useRecurringPayments(isResettingRef) {
  const [recurringPayments, setRecurringPayments] = useState(getInitialRecurringPayments);

  // Persistencia reactiva en localStorage
  useEffect(() => {
    if (isResettingRef?.current) return;
    saveRecurringToStorage(recurringPayments);
  }, [recurringPayments, isResettingRef]);

  // Agregar nuevo pago recurrente
  const handleAddRecurring = useCallback(async (item) => {
    const newItem = {
      ...item,
      id: item.id || 'rec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
    };
    setRecurringPayments((prev) => {
      const updated = [newItem, ...prev.filter((r) => r.id !== newItem.id)];
      saveRecurringToStorage(updated);
      return updated;
    });

    // Persistencia directa concurrente en Supabase
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id) {
          const payload = {
            id: ensureUUID(newItem.id),
            user_id: user.id,
            name: newItem.name || 'Suscripción',
            amount: Number(newItem.amount || 0),
            type: newItem.type || 'expense',
            category: newItem.category || newItem.categoryName || 'General',
            frequency: newItem.frequency || 'monthly',
            billing_day: Number(newItem.billingDay || 1),
            is_active: newItem.isActive !== false && newItem.active !== false,
            account_id: newItem.accountId ? ensureUUID(newItem.accountId) : null,
            next_payment_date: newItem.nextPaymentDate || newItem.nextDate || newItem.next_date || null,
            raw_data: newItem,
            updated_at: new Date().toISOString()
          };
          supabase.from('recurring_payments').upsert(payload, { onConflict: 'id' })
            .then(async ({ error }) => {
              if (error && (error.code === '42P10' || error.message?.includes('ON CONFLICT'))) {
                const retryRes = await supabase.from('recurring_payments').upsert(payload, { onConflict: 'id,user_id' });
                if (retryRes.error && (retryRes.error.code === '23503' || retryRes.error.status === 409 || retryRes.error.message?.includes('Key is not present in table'))) {
                  return supabase.from('recurring_payments').upsert({ ...payload, account_id: null }, { onConflict: 'id,user_id' });
                }
                return retryRes;
              }
              if (error && (error.code === '23503' || error.status === 409 || error.message?.includes('Key is not present in table'))) {
                return supabase.from('recurring_payments').upsert({ ...payload, account_id: null }, { onConflict: 'id' });
              }
            })
            .catch((e) => {
              console.warn('[useRecurringPayments] Advertencia upsert Supabase:', e);
            });
        }
      }).catch(() => {});
    }

    toast.success('✓ Pago recurrente guardado con éxito');
    return newItem;
  }, []);

  const handleSaveRecurring = handleAddRecurring;

  // Actualizar pago recurrente existente
  const handleUpdateRecurring = useCallback(async (updatedItem) => {
    setRecurringPayments((prev) => {
      const updated = prev.map((item) => (item.id === updatedItem.id ? updatedItem : item));
      saveRecurringToStorage(updated);
      return updated;
    });

    // Persistencia directa concurrente en Supabase
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id) {
          const payload = {
            id: ensureUUID(updatedItem.id),
            user_id: user.id,
            name: updatedItem.name || 'Suscripción',
            amount: Number(updatedItem.amount || 0),
            type: updatedItem.type || 'expense',
            category: updatedItem.category || updatedItem.categoryName || 'General',
            frequency: updatedItem.frequency || 'monthly',
            billing_day: Number(updatedItem.billingDay || 1),
            is_active: updatedItem.isActive !== false && updatedItem.active !== false,
            account_id: updatedItem.accountId ? ensureUUID(updatedItem.accountId) : null,
            next_payment_date: updatedItem.nextPaymentDate || updatedItem.nextDate || updatedItem.next_date || null,
            raw_data: updatedItem,
            updated_at: new Date().toISOString()
          };
          supabase.from('recurring_payments').upsert(payload, { onConflict: 'id' })
            .then(async ({ error }) => {
              if (error && (error.code === '42P10' || error.message?.includes('ON CONFLICT'))) {
                const retryRes = await supabase.from('recurring_payments').upsert(payload, { onConflict: 'id,user_id' });
                if (retryRes.error && (retryRes.error.code === '23503' || retryRes.error.status === 409 || retryRes.error.message?.includes('Key is not present in table'))) {
                  return supabase.from('recurring_payments').upsert({ ...payload, account_id: null }, { onConflict: 'id,user_id' });
                }
                return retryRes;
              }
              if (error && (error.code === '23503' || error.status === 409 || error.message?.includes('Key is not present in table'))) {
                return supabase.from('recurring_payments').upsert({ ...payload, account_id: null }, { onConflict: 'id' });
              }
            })
            .catch((e) => {
              console.warn('[useRecurringPayments] Advertencia update Supabase:', e);
            });
        }
      }).catch(() => {});
    }

    toast.success('✓ Pago recurrente actualizado con éxito');
    return updatedItem;
  }, []);

  // Eliminar pago recurrente
  const handleDeleteRecurring = useCallback(async (id) => {
    setRecurringPayments((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveRecurringToStorage(updated);
      return updated;
    });

    if (isSupabaseConfigured && supabase) {
      const canonicalId = ensureUUID(id);
      supabase.from('recurring_payments').delete().eq('id', id).catch(() => {});
      if (canonicalId !== id) {
        supabase.from('recurring_payments').delete().eq('id', canonicalId).catch(() => {});
      }
    }

    toast.info('Elemento eliminado');
  }, []);

  // Pausar / Activar pago recurrente
  const handleToggleActiveRecurring = useCallback(async (id) => {
    setRecurringPayments((prev) => {
      const item = prev.find((r) => r.id === id);
      if (!item) return prev;
      const isActive = item.isActive !== false;
      const updatedItem = { ...item, isActive: !isActive };
      const updated = prev.map((r) => (r.id === id ? updatedItem : r));
      saveRecurringToStorage(updated);
      return updated;
    });
  }, []);

  // Restaurar / resetear pagos recurrentes
  const resetRecurringPayments = useCallback(() => {
    setRecurringPayments([]);
    saveRecurringToStorage([]);
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
    resetRecurringPayments
  };
}
