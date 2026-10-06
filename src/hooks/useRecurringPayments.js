import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { toast } from '../utils/toast';

function getInitialRecurringPayments() {
  try {
    const savedRec = localStorage.getItem(STORAGE_KEYS.RECURRING_PAYMENTS) ||
                     localStorage.getItem('app_recurring');
    if (savedRec) {
      const parsed = JSON.parse(savedRec);
      if (Array.isArray(parsed)) return parsed;
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
          billingDay: s.billingDay || 1,
          accountId: s.accountId || '',
          accountName: s.accountName || '',
          categoryId: s.categoryId || '',
          categoryName: s.categoryName || 'Suscripciones',
          isActive: s.active !== undefined ? s.active : true,
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
