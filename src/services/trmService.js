import { useState, useEffect } from 'react';

const TRM_CACHE_KEY = 'presu_trm_data';
const FALLBACK_TRM = 4050; // Valor seguro por si no hay conexión

// Promesa en vuelo compartida para deduplicar peticiones concurrentes (ej. StrictMode de React)
let inFlightTRMPromise = null;

/**
 * Consulta interna de la Tasa Representativa del Mercado (TRM) oficial de Colombia
 * con caché de 24 horas y doble respaldo (Datos Abiertos -> ExchangeRate API -> Fallback).
 */
async function fetchOfficialTRMInternal() {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // 1. Verificar si ya tenemos la TRM de hoy guardada en caché
  try {
    const cached = JSON.parse(localStorage.getItem(TRM_CACHE_KEY) || '{}');
    if (cached && cached.date === todayStr && cached.value) {
      return cached.value;
    }
  } catch (e) {
    console.warn('Error leyendo caché TRM:', e);
  }

  // 2. Consultar API oficial de datos abiertos (Superfinanciera / Datos.gov.co)
  // Se establece un margen prudente de 5 segundos para absorber la latencia del portal estatal
  let timeoutId;
  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => {
      try {
        controller.abort();
      } catch {}
    }, 5000);

    const res = await fetch(
      'https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciahasta%20DESC',
      { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].valor) {
        const officialValue = parseFloat(data[0].valor);
        if (!isNaN(officialValue) && officialValue > 1000) {
          localStorage.setItem(
            TRM_CACHE_KEY,
            JSON.stringify({ date: todayStr, value: officialValue })
          );
          return officialValue;
        }
      }
    }
  } catch (apiErr) {
    // Manejo de fallback de forma silenciosa para el usuario
    const isTimeout = apiErr?.name === 'AbortError' || String(apiErr).includes('aborted');
    console.warn(
      'Fallo consulta datos.gov.co, usando respaldo secundario:',
      isTimeout ? 'Tiempo de respuesta superado (timeout 5s)' : (apiErr?.message || apiErr)
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // 3. Respaldo secundario si la red gubernamental tarda o falla
  let timeoutSecId;
  try {
    const controllerSec = new AbortController();
    timeoutSecId = setTimeout(() => {
      try {
        controllerSec.abort();
      } catch {}
    }, 5000);

    const resSec = await fetch('https://open.er-api.com/v6/latest/USD', { 
      signal: controllerSec.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutSecId);

    if (resSec.ok) {
      const dataSec = await resSec.json();
      if (dataSec && dataSec.rates && dataSec.rates.COP) {
        const copRate = Math.round(dataSec.rates.COP);
        if (copRate > 1000) {
          localStorage.setItem(
            TRM_CACHE_KEY,
            JSON.stringify({ date: todayStr, value: copRate })
          );
          return copRate;
        }
      }
    }
  } catch (fallbackErr) {
    console.warn('Fallo API secundaria de respaldo:', fallbackErr?.message || fallbackErr);
  } finally {
    clearTimeout(timeoutSecId);
  }

  // 4. Si hay algún valor en caché anterior (aunque sea de otro día), usarlo antes del fallback estático
  try {
    const prevCached = JSON.parse(localStorage.getItem(TRM_CACHE_KEY) || '{}');
    if (prevCached && prevCached.value) {
      return Number(prevCached.value);
    }
  } catch {}

  // 5. Si está completamente offline sin caché previo, usar fallback
  return FALLBACK_TRM;
}

/**
 * Consulta la Tasa Representativa del Mercado (TRM) oficial de Colombia
 * con deduplicación de peticiones en vuelo para evitar cancelaciones prematuras en React StrictMode.
 */
export async function getOfficialTRM() {
  if (inFlightTRMPromise) {
    return inFlightTRMPromise;
  }

  inFlightTRMPromise = (async () => {
    try {
      return await fetchOfficialTRMInternal();
    } finally {
      inFlightTRMPromise = null;
    }
  })();

  return inFlightTRMPromise;
}

/**
 * Hook de React para consumir y sincronizar automáticamente la TRM oficial
 */
export function useTRM() {
  const [trm, setTrm] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(TRM_CACHE_KEY) || '{}');
      if (cached && cached.value) return Number(cached.value);
    } catch {}
    return FALLBACK_TRM;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function sync() {
      setLoading(true);
      try {
        const val = await getOfficialTRM();
        if (isMounted && val) {
          setTrm(val);
        }
      } catch (err) {
        console.warn('Error sincronizando TRM:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    sync();

    return () => {
      isMounted = false;
    };
  }, []);

  return { trm, loading };
}
