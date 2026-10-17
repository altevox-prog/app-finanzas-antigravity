import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { 
  setHasCompletedOnboarding, 
  markUserTutorialCompleted 
} from '../utils/userProfileHelper';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useOnboarding({ user = null } = {}) {
  // Estado para mostrar el modal/overlay del tutorial rápido
  const [showTutorial, setShowTutorial] = useState(() => {
    try {
      const isTutorialDone = 
        localStorage.getItem('presu_tutorial_completed') === 'true' ||
        localStorage.getItem('has_completed_tutorial') === 'true' ||
        localStorage.getItem('tutorial_completed') === 'true';
      const isOnboardingDone = 
        localStorage.getItem('has_completed_onboarding') === 'true' ||
        localStorage.getItem('hasCompletedOnboarding') === 'true' ||
        localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
      return !isTutorialDone && isOnboardingDone;
    } catch {
      return false;
    }
  });

  const isKnownCompleted = () => {
    try {
      const userId = user?.id;
      if (userId) {
        const userSpecific = localStorage.getItem(`has_completed_onboarding_${userId}`);
        if (userSpecific === 'true') return true;
        if (userSpecific === 'false') return false;
      }
      return (
        localStorage.getItem('has_completed_onboarding') === 'true' ||
        localStorage.getItem('hasCompletedOnboarding') === 'true' ||
        localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true'
      );
    } catch {
      return false;
    }
  };

  // NUNCA asumir true por defecto para evitar parpadeos o montajes accidentales
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(() => {
    if (!user?.id) return false;
    return !isKnownCompleted();
  });

  // Comprobación de Entrada en Supabase (Solo nuevos usuarios sin cuentas y con onboarding_completed !== true)
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured || !supabase) {
      if (!user) {
        setIsOnboardingActive(false);
        setIsOnboardingLoading(false);
      }
      return;
    }

    let isMounted = true;

    const checkOnboardingStatus = async () => {
      // Si ya sabemos con certeza que el usuario completó el onboarding, no bloquear la pantalla
      if (isKnownCompleted()) {
        if (isMounted) {
          setIsOnboardingActive(false);
          setIsOnboardingLoading(false);
        }
      } else {
        if (isMounted) {
          setIsOnboardingLoading(true);
        }
      }

      try {
        // Consultar en paralelo tanto el perfil como si el usuario ya posee cuentas creadas
        const [profileRes, accountsRes] = await Promise.allSettled([
          supabase.from('profiles').select('onboarding_completed').eq('id', user.id).maybeSingle(),
          supabase.from('accounts').select('id').eq('user_id', user.id).limit(1)
        ]);

        if (!isMounted) return;

        const profileData = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
        const accountsData = accountsRes.status === 'fulfilled' ? accountsRes.value.data : null;

        const hasOnboardingFlag = profileData && profileData.onboarding_completed === true;
        const hasExistingAccounts = Array.isArray(accountsData) && accountsData.length > 0;

        // Si ya completó onboarding o ya tiene cuentas en Supabase: NUNCA mostrar onboarding
        if (hasOnboardingFlag || hasExistingAccounts) {
          setIsOnboardingActive(false);
          localStorage.setItem(`has_completed_onboarding_${user.id}`, 'true');
          localStorage.setItem(`hasCompletedOnboarding_${user.id}`, 'true');
          localStorage.setItem('has_completed_onboarding', 'true');
          localStorage.setItem('hasCompletedOnboarding', 'true');
          localStorage.setItem('app_onboarding_completed', 'true');
          localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
          setHasCompletedOnboarding(user.id, true);

          // Si tenía cuentas pero faltaba la bandera en profiles, actualizar de fondo
          if (!hasOnboardingFlag) {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
                .eq('id', user.id);
              if (error) throw error;
            } catch (err) {
              console.warn('[useOnboarding] No se pudo actualizar estado en Supabase:', err.message);
            }
          }
        } else {
          // Usuario estrictamente nuevo (0 cuentas y onboarding_completed es false o null)
          setIsOnboardingActive(true);
          localStorage.setItem(`has_completed_onboarding_${user.id}`, 'false');
        }
      } catch (e) {
        if (!isMounted) return;
        console.warn('[useOnboarding] Excepción comprobando onboarding en Supabase:', e);
        // En caso de fallo de red, respaldar con el caché local
        const isDone = isKnownCompleted();
        setIsOnboardingActive(!isDone);
      } finally {
        if (isMounted) {
          setIsOnboardingLoading(false);
        }
      }
    };

    checkOnboardingStatus();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Marca el onboarding como completado en localStorage y estado local
  const completeOnboarding = useCallback((userId = null) => {
    localStorage.setItem('has_completed_onboarding', 'true');
    localStorage.setItem('hasCompletedOnboarding', 'true');
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    if (userId) {
      localStorage.setItem(`has_completed_onboarding_${userId}`, 'true');
      localStorage.setItem(`hasCompletedOnboarding_${userId}`, 'true');
      setHasCompletedOnboarding(userId, true);
    } else {
      setHasCompletedOnboarding(null, true);
    }
    setIsOnboardingActive(false);
  }, []);

  // Abre el tutorial (repetible desde ajustes o perfil)
  const openTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  // Cierra el tutorial
  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  // Marca el tutorial como completado
  const completeTutorial = useCallback((userId = null) => {
    markUserTutorialCompleted(userId);
    localStorage.setItem('presu_tutorial_completed', 'true');
    localStorage.setItem('has_completed_tutorial', 'true');
    localStorage.setItem('tutorial_completed', 'true');
    setShowTutorial(false);
  }, []);

  // Reinicia banderas del tutorial
  const resetTutorial = useCallback(() => {
    localStorage.removeItem('presu_tutorial_completed');
    localStorage.removeItem('has_completed_tutorial');
    localStorage.removeItem('tutorial_completed');
    setShowTutorial(true);
  }, []);

  // Reinicia estado de onboarding
  const resetOnboarding = useCallback(() => {
    localStorage.removeItem('has_completed_onboarding');
    localStorage.removeItem('hasCompletedOnboarding');
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    setIsOnboardingActive(true);
  }, []);

  return {
    isOnboardingActive,
    setIsOnboardingActive,
    isOnboardingLoading,
    showTutorial,
    setShowTutorial,
    completeOnboarding,
    completeTutorial,
    openTutorial,
    closeTutorial,
    resetTutorial,
    resetOnboarding
  };
}

export default useOnboarding;
