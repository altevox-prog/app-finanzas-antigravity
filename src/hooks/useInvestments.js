import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { saveInvestmentsToStorage } from '../services/storageService';
import { toSafeNumber } from '../utils/financeMath';
import { toast } from '../utils/toast';

function getInitialInvestments() {
  const saved = localStorage.getItem('presu_investments') ||
                localStorage.getItem(STORAGE_KEYS.INVESTMENTS) ||
                localStorage.getItem('user_investments') ||
                localStorage.getItem('app_investments');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      // Si contiene datos de prueba antiguos ('inv-1' o 'VOO Vanguard'), limpiarlo a vacío
      if (Array.isArray(parsed) && parsed.some(inv => inv.id === 'inv-1' || inv.name?.includes('VOO Vanguard'))) {
        saveInvestmentsToStorage([]);
        return [];
      }
      return Array.isArray(parsed) ? parsed.map(inv => ({
        ...inv,
        quantity: toSafeNumber(inv.quantity || inv.shares),
        buyPrice: toSafeNumber(inv.buyPrice || inv.purchasePrice),
        currentPrice: toSafeNumber(inv.currentPrice || inv.unitPrice || inv.buyPrice)
      })) : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

function sanitizeInvestment(inv) {
  return {
    ...inv,
    id: inv.id || crypto.randomUUID(),
    quantity: toSafeNumber(inv.quantity || inv.shares),
    buyPrice: toSafeNumber(inv.buyPrice || inv.purchasePrice),
    currentPrice: toSafeNumber(inv.currentPrice || inv.unitPrice || inv.buyPrice)
  };
}

export function useInvestments(isResettingRef) {
  const [investments, setInvestments] = useState(getInitialInvestments);

  // Purga de claves legadas y datos residuales de prueba al montar
  useEffect(() => {
    try {
      localStorage.removeItem('finanzas_investments_v1');
      localStorage.removeItem('investments_initialized');
      const saved = localStorage.getItem('user_investments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some(inv => inv.id === 'inv-1' || inv.name?.includes('VOO Vanguard'))) {
          saveInvestmentsToStorage([]);
          setInvestments([]);
        }
      }
    } catch {}
  }, []);

  // Persistencia reactiva en localStorage
  useEffect(() => {
    if (isResettingRef?.current) return;
    saveInvestmentsToStorage(investments);
  }, [investments, isResettingRef]);

  // Agregar nueva inversión
  const handleAddInvestment = useCallback(async (newInv) => {
    const sanitizedInv = sanitizeInvestment(newInv);
    setInvestments((prev) => {
      const next = [sanitizedInv, ...prev];
      saveInvestmentsToStorage(next);
      return next;
    });
    toast.success('Inversión guardada correctamente');
    return sanitizedInv;
  }, []);

  const handleSaveInvestment = handleAddInvestment;

  // Actualizar inversión existente
  const handleUpdateInvestment = useCallback(async (updatedInv) => {
    const sanitizedInv = sanitizeInvestment(updatedInv);
    setInvestments((prev) => {
      const next = prev.map((inv) => (inv.id === sanitizedInv.id ? sanitizedInv : inv));
      saveInvestmentsToStorage(next);
      return next;
    });
    toast.success('Inversión actualizada correctamente');
    return sanitizedInv;
  }, []);

  // Eliminar inversión
  const handleDeleteInvestment = useCallback(async (invId) => {
    setInvestments((prev) => {
      const next = prev.filter((inv) => inv.id !== invId);
      saveInvestmentsToStorage(next);
      return next;
    });
    toast.info('Elemento eliminado');
  }, []);

  // Restaurar / resetear inversiones
  const resetInvestments = useCallback(() => {
    setInvestments([]);
    saveInvestmentsToStorage([]);
  }, []);

  return {
    investments,
    setInvestments,
    handleAddInvestment,
    handleSaveInvestment,
    handleUpdateInvestment,
    handleDeleteInvestment,
    resetInvestments
  };
}
