import { useState } from 'react';
import { 
  supabase as defaultSupabase, 
  isSupabaseConfigured as defaultIsSupabaseConfigured 
} from '../../../services/supabaseClient';
import { clearSessionFinancialStorage } from '../../../services/storage/storageCleaner';

/**
 * useProfileDataActions
 * Custom hook para la gestión de sincronización en la nube, cierre de sesión
 * y restablecimiento de fábrica (borrado definitivo) en el modal de perfil.
 *
 * @param {Object} params
 * @param {Function} [params.onManualCloudSync] Handler de sync manual con la nube
 * @param {Function} [params.onLogout] Handler personalizado de cierre de sesión
 * @param {Function} [params.signOut] Función signOut de AuthContext
 * @param {boolean} [params.isSupabaseConfigured] Flag de configuración de Supabase
 * @param {Object} [params.supabase] Cliente de Supabase
 * @param {Function} [params.onFactoryReset] Handler de reseteo de fábrica
 * @param {Function} [params.onClose] Callback para cerrar el modal
 * @param {Function} [params.showToast] Función para notificaciones toast
 * @param {Object} [params.user] Usuario autenticado activo
 */
export function useProfileDataActions({
  onManualCloudSync,
  onLogout,
  signOut,
  isSupabaseConfigured = defaultIsSupabaseConfigured,
  supabase = defaultSupabase,
  onFactoryReset,
  onClose,
  showToast,
  user,
} = {}) {
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleCloudSync = async () => {
    if (typeof onManualCloudSync === 'function') {
      setIsCloudSyncing(true);
      try {
        const res = await onManualCloudSync();
        if (res && res.success === false) {
          if (showToast) showToast(res.error?.message || 'Error al sincronizar con la nube', true);
        } else {
          if (showToast) showToast('¡Datos sincronizados con éxito en la nube!');
        }
      } catch {
        if (showToast) showToast('Error al conectar con la nube', true);
      } finally {
        setIsCloudSyncing(false);
      }
    }
  };

  const handleFullLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (typeof onLogout === 'function') {
        await onLogout();
      } else {
        if (typeof signOut === 'function') {
          await signOut();
        } else if (isSupabaseConfigured && supabase) {
          await supabase.auth.signOut();
        }
        clearSessionFinancialStorage();
      }
      setShowLogoutConfirm(false);
      if (typeof onClose === 'function') onClose();
      if (showToast) showToast('Sesión cerrada exitosamente.');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      if (showToast) showToast('Error al cerrar sesión', true);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleFullReset = async () => {
    if (onFactoryReset) {
      await onFactoryReset(true);
      return;
    }

    try {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase.auth.getUser();
          const userId = data?.user?.id || (user?.id !== 'local-user' ? user?.id : null);
          if (userId) {
            await Promise.allSettled([
              supabase.from('transactions').delete().eq('user_id', userId),
              supabase.from('debts').delete().eq('user_id', userId),
              supabase.from('recurring_payments').delete().eq('user_id', userId),
              supabase.from('investments').delete().eq('user_id', userId),
              supabase.from('savings_goals').delete().eq('user_id', userId),
              supabase.from('budgets').delete().eq('user_id', userId),
              supabase.from('categories').delete().eq('user_id', userId),
              supabase.from('accounts').delete().eq('user_id', userId)
            ]);
            try {
              await supabase.from('accounts').delete().eq('user_id', userId);
            } catch {}
          }
        } catch (cloudErr) {
          console.warn('Error al borrar datos en Supabase:', cloudErr);
        }
      }

      // Preservar tokens de sesión de Supabase y banderas de tutorial/onboarding
      try {
        const isPreservedKey = (key) => {
          if (!key) return false;
          // Tokens y sesiones de autenticación
          if (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase.auth')) return true;
          // Banderas de tutorial y onboarding
          if (
            key === 'presu_tutorial_completed' ||
            key === 'has_completed_tutorial' ||
            key === 'tutorial_completed' ||
            key === 'hasSeenTutorial' ||
            key === 'tutorial_seen' ||
            key === 'app_onboarding_completed' ||
            key === 'has_completed_onboarding' ||
            key === 'hasCompletedOnboarding' ||
            key.startsWith('tutorial_completed_') ||
            key.startsWith('presu_tutorial_completed_') ||
            key.startsWith('has_completed_tutorial_') ||
            key.startsWith('has_completed_onboarding_') ||
            key.startsWith('hasCompletedOnboarding_')
          ) {
            return true;
          }
          return false;
        };

        const preservedData = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && isPreservedKey(key)) {
            preservedData[key] = localStorage.getItem(key);
          }
        }
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && !isPreservedKey(key)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        Object.entries(preservedData).forEach(([k, v]) => {
          if (v !== null) localStorage.setItem(k, v);
        });

        // Asegurar que las banderas de tutorial y onboarding continúen en true
        localStorage.setItem('presu_tutorial_completed', 'true');
        localStorage.setItem('has_completed_tutorial', 'true');
        localStorage.setItem('tutorial_completed', 'true');
        localStorage.setItem('hasSeenTutorial', 'true');
        localStorage.setItem('tutorial_seen', 'true');
        localStorage.setItem('app_onboarding_completed', 'true');
        localStorage.setItem('has_completed_onboarding', 'true');
        localStorage.setItem('hasCompletedOnboarding', 'true');
        const activeUserId = user?.id && user.id !== 'local-user' ? user.id : null;
        if (activeUserId) {
          localStorage.setItem(`presu_tutorial_completed_${activeUserId}`, 'true');
          localStorage.setItem(`has_completed_tutorial_${activeUserId}`, 'true');
          localStorage.setItem(`tutorial_completed_${activeUserId}`, 'true');
          localStorage.setItem(`has_completed_onboarding_${activeUserId}`, 'true');
          localStorage.setItem(`hasCompletedOnboarding_${activeUserId}`, 'true');
        }
      } catch (e) {
        console.warn('Error clearing localStorage:', e);
      }
    } catch (error) {
      console.error('Error al restablecer la aplicación:', error);
    }
  };

  const handleConfirmFactoryReset = async () => {
    if (confirmDeleteText.trim().toUpperCase() !== 'BORRAR') {
      return;
    }

    try {
      setIsResetting(true);
      if (onFactoryReset) {
        await onFactoryReset(true);
      } else {
        await handleFullReset();
      }

      // Asegurar explícitamente persistencia del tutorial completado
      localStorage.setItem('presu_tutorial_completed', 'true');
      localStorage.setItem('has_completed_tutorial', 'true');
      localStorage.setItem('tutorial_completed', 'true');
      localStorage.setItem('hasSeenTutorial', 'true');
      localStorage.setItem('tutorial_seen', 'true');
      localStorage.setItem('app_onboarding_completed', 'true');
      localStorage.setItem('has_completed_onboarding', 'true');
      localStorage.setItem('hasCompletedOnboarding', 'true');

      if (showToast) showToast('Todos los datos han sido restablecidos');
      setShowResetConfirm(false);
      setConfirmDeleteText('');
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      console.error('Error al restablecer:', err);
      if (showToast) showToast('Error al restablecer los datos', true);
    } finally {
      setIsResetting(false);
    }
  };

  return {
    isCloudSyncing,
    isLoggingOut,
    isResetting,
    showResetConfirm,
    setShowResetConfirm,
    confirmDeleteText,
    setConfirmDeleteText,
    showLogoutConfirm,
    setShowLogoutConfirm,
    handleCloudSync,
    handleFullLogout,
    handleFullReset,
    handleConfirmFactoryReset,
  };
}

export default useProfileDataActions;
