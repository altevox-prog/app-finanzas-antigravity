import { useState } from 'react';
import { 
  supabase as defaultSupabase, 
  isSupabaseConfigured as defaultIsSupabaseConfigured 
} from '../../../services/supabaseClient';
import { clearSessionFinancialStorage } from '../../../services/storage/storageCleaner';

const setTutorialFlags = (userId) => {
  ['presu_tutorial_completed', 'has_completed_tutorial', 'tutorial_completed', 'hasSeenTutorial', 'tutorial_seen', 'app_onboarding_completed', 'has_completed_onboarding', 'hasCompletedOnboarding'].forEach(k => localStorage.setItem(k, 'true'));
  if (userId) {
    [`presu_tutorial_completed_${userId}`, `has_completed_tutorial_${userId}`, `tutorial_completed_${userId}`, `has_completed_onboarding_${userId}`, `hasCompletedOnboarding_${userId}`].forEach(k => localStorage.setItem(k, 'true'));
  }
};

/**
 * useProfileDataActions: Custom hook para gestión de sync, logout y reseteo de fábrica.
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
    if (typeof onManualCloudSync !== 'function') return;
    setIsCloudSyncing(true);
    try {
      const res = await onManualCloudSync();
      showToast?.(res?.success === false ? (res.error?.message || 'Error al sincronizar con la nube') : '¡Datos sincronizados con éxito en la nube!', res?.success === false);
    } catch {
      showToast?.('Error al conectar con la nube', true);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleFullLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (typeof onLogout === 'function') {
        await onLogout();
      } else {
        if (typeof signOut === 'function') await signOut();
        else if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
        clearSessionFinancialStorage();
      }
      setShowLogoutConfirm(false);
      onClose?.();
      showToast?.('Sesión cerrada exitosamente.');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      showToast?.('Error al cerrar sesión', true);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleFullReset = async () => {
    if (onFactoryReset) return onFactoryReset(true);

    try {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase.auth.getUser();
          const userId = data?.user?.id || (user?.id !== 'local-user' ? user?.id : null);
          if (userId) {
            for (const table of ['debt_payments', 'transactions', 'budgets', 'recurring_payments', 'debts', 'investments', 'savings_goals', 'categories']) {
              try { await supabase.from(table).delete().eq('user_id', userId); } catch (_) {}
            }
            try { await supabase.from('user_settings').update({ global_budget_limit: 0, updated_at: new Date().toISOString() }).eq('user_id', userId); } catch (_) {}
            try { await supabase.from('accounts').delete().eq('user_id', userId); } catch (_) {}
          }
        } catch (cloudErr) {
          console.error('Error al borrar datos en Supabase:', cloudErr);
          throw cloudErr;
        }
      }

      try {
        const isPreserved = (k = '') => k.startsWith('sb-') || k.includes('auth-token') || k.includes('supabase.auth') || /tutorial|onboarding/i.test(k);
        const preserved = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && isPreserved(k)) preserved[k] = localStorage.getItem(k);
        }
        localStorage.clear();
        Object.entries(preserved).forEach(([k, v]) => { if (v !== null) localStorage.setItem(k, v); });
        setTutorialFlags(user?.id && user.id !== 'local-user' ? user.id : null);
      } catch (e) {
        console.warn('Error clearing localStorage:', e);
      }
    } catch (error) {
      console.error('Error al restablecer la aplicación:', error);
    }
  };

  const handleConfirmFactoryReset = async () => {
    if (confirmDeleteText.trim().toUpperCase() !== 'BORRAR') return;

    try {
      setIsResetting(true);
      if (onFactoryReset) await onFactoryReset(true);
      else await handleFullReset();

      setTutorialFlags(user?.id && user.id !== 'local-user' ? user.id : null);
      showToast?.('Todos los datos han sido restablecidos');
      setShowResetConfirm(false);
      setConfirmDeleteText('');
      onClose?.();
    } catch (err) {
      console.error('Error al restablecer:', err);
      showToast?.('Error al restablecer los datos', true);
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
