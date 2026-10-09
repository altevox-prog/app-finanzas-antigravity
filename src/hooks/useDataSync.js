import { useState, useCallback } from 'react';

/**
 * useDataSync
 * SYNC ENGINE DESCONECTADO Y APAGADO (100% Local-First).
 * Se eliminan todas las llamadas a la red, suscripciones a onAuthStateChange,
 * e interacciones con las tablas 'profiles' y 'transactions'.
 * La aplicación opera estrictamente en almacenamiento local (localStorage).
 */
export function useDataSync() {
  const [syncStatus] = useState('idle');
  const [syncUser] = useState(null);

  const pushLocalToCloud = useCallback(async () => {
    return { success: true, localOnly: true };
  }, []);

  const pullCloudToLocal = useCallback(async () => {
    return { success: true, localOnly: true };
  }, []);

  const signOutCloud = useCallback(async () => {}, []);

  return {
    syncStatus,
    syncUser,
    isCloudEnabled: false,
    isConfigured: false,
    lastSyncTime: null,
    syncError: null,
    pushLocalToCloud,
    pullCloudToLocal,
    signOutCloud
  };
}

export default useDataSync;
