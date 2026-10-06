import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getOfficialTRM } from '../services/trmService';

export function useTRM(isResettingRef = null) {
  // Inicialización de la TRM desde caché o valor por defecto
  const [trm, setTrm] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('presu_trm_data') || '{}');
      if (cached && cached.value) return Number(cached.value);
      const saved = localStorage.getItem('custom_trm') || localStorage.getItem(STORAGE_KEYS.TRM);
      const num = saved ? Number(saved) : 4050;
      return num > 0 ? num : 4050;
    } catch {
      return 4050;
    }
  });

  // Función para sincronizar la TRM oficial del día
  const syncTRM = useCallback(async () => {
    try {
      const val = await getOfficialTRM();
      if (val && val > 1000) {
        setTrm(val);
        localStorage.setItem(STORAGE_KEYS.TRM, String(val));
        return val;
      }
    } catch (err) {
      console.warn('Error sincronizando TRM oficial:', err);
    }
    return null;
  }, []);

  // Sincronización automática de la TRM oficial al montar
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const val = await getOfficialTRM();
        if (isMounted && val && val > 1000) {
          setTrm(val);
          localStorage.setItem(STORAGE_KEYS.TRM, String(val));
        }
      } catch (err) {
        console.warn('Error sincronizando TRM oficial:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Persistir cambios en localStorage
  useEffect(() => {
    if (isResettingRef?.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.TRM, trm.toString());
    } catch (e) {}
  }, [trm, isResettingRef]);

  // Actualización explícita persistente
  const updateTRM = useCallback((newTRM) => {
    const num = Number(newTRM);
    if (num > 0) {
      setTrm(num);
      try {
        localStorage.setItem(STORAGE_KEYS.TRM, String(num));
      } catch (e) {}
    }
  }, []);

  return {
    trm,
    setTrm,
    updateTRM,
    refreshTRM: syncTRM
  };
}

export default useTRM;
