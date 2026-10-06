import { useState, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { 
  setHasCompletedOnboarding, 
  markUserTutorialCompleted 
} from '../utils/userProfileHelper';

export function useOnboarding() {
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
      // Si el onboarding inicial ya pasó pero nunca ha visto el tutorial, mostrarlo directamente
      return !isTutorialDone && isOnboardingDone;
    } catch {
      return false;
    }
  });

  // Control de estado de onboarding independiente de cuentas/transacciones
  const [isOnboardingActive, setIsOnboardingActive] = useState(() => {
    try {
      const isDone = 
        localStorage.getItem('has_completed_onboarding') === 'true' ||
        localStorage.getItem('hasCompletedOnboarding') === 'true' ||
        localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
      return !isDone;
    } catch {
      return true;
    }
  });

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
