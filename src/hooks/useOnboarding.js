import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { setHasCompletedOnboarding, markUserTutorialCompleted } from '../utils/userProfileHelper';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const TUTORIAL_KEYS = ['presu_tutorial_completed', 'has_completed_tutorial', 'tutorial_completed'];
const ONBOARDING_KEYS = ['has_completed_onboarding', 'hasCompletedOnboarding', STORAGE_KEYS.ONBOARDING_COMPLETED];

const checkAnyKey = (keys) => {
  try { return keys.some(k => localStorage.getItem(k) === 'true'); } catch { return false; }
};
const setAllKeys = (keys, val) => {
  try { keys.forEach(k => localStorage.setItem(k, val)); } catch {}
};
const removeAllKeys = (keys) => {
  try { keys.forEach(k => localStorage.removeItem(k)); } catch {}
};

export function useOnboarding({ user = null } = {}) {
  const [showTutorial, setShowTutorial] = useState(false);

  const isTutorialCompletedForUser = useCallback((uid) => {
    if (!uid) return checkAnyKey(TUTORIAL_KEYS);
    try {
      return (
        localStorage.getItem(`app_tutorial_completed_${uid}`) === 'true' ||
        checkAnyKey(TUTORIAL_KEYS)
      );
    } catch {
      return false;
    }
  }, []);

  const isKnownCompleted = () => {
    try {
      if (user?.id) {
        const u = localStorage.getItem(`has_completed_onboarding_${user.id}`);
        if (u === 'true') return true;
        if (u === 'false') return false;
      }
      return checkAnyKey(ONBOARDING_KEYS);
    } catch { return false; }
  };

  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(() => Boolean(user?.id && !isKnownCompleted()));

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured || !supabase) {
      if (!user) {
        setIsOnboardingActive(false);
        setIsOnboardingLoading(false);
        setShowTutorial(false);
      }
      return;
    }

    let isMounted = true;
    const checkOnboardingStatus = async () => {
      if (isKnownCompleted()) {
        if (isMounted) { setIsOnboardingActive(false); setIsOnboardingLoading(false); }
      } else {
        if (isMounted) setIsOnboardingLoading(true);
      }

      try {
        const [profileRes, accountsRes] = await Promise.allSettled([
          supabase.from('profiles').select('onboarding_completed').eq('id', user.id).maybeSingle(),
          supabase.from('accounts').select('id').eq('user_id', user.id).limit(1)
        ]);

        if (!isMounted) return;
        const profileData = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
        const accountsData = accountsRes.status === 'fulfilled' ? accountsRes.value.data : null;
        const hasFlag = profileData && profileData.onboarding_completed === true;
        const hasAccounts = Array.isArray(accountsData) && accountsData.length > 0;

        if (hasFlag || hasAccounts) {
          setIsOnboardingActive(false);
          setAllKeys([...ONBOARDING_KEYS, `has_completed_onboarding_${user.id}`, `hasCompletedOnboarding_${user.id}`, 'app_onboarding_completed'], 'true');
          setAllKeys([...TUTORIAL_KEYS, `app_tutorial_completed_${user.id}`], 'true');
          setShowTutorial(false);
          setHasCompletedOnboarding(user.id, true);

          if (!hasFlag) {
            try {
              await supabase.from('profiles').update({ onboarding_completed: true, updated_at: new Date().toISOString() }).eq('id', user.id);
            } catch {}
          }
        } else {
          if (!isTutorialCompletedForUser(user.id)) {
            setIsOnboardingActive(true);
            try { localStorage.setItem(`has_completed_onboarding_${user.id}`, 'false'); } catch {}
          } else {
            setIsOnboardingActive(false);
            setShowTutorial(false);
          }
        }
      } catch {
        if (!isMounted) return;
        setIsOnboardingActive(!isKnownCompleted());
      } finally {
        if (isMounted) setIsOnboardingLoading(false);
      }
    };

    checkOnboardingStatus();
    return () => { isMounted = false; };
  }, [user?.id, isTutorialCompletedForUser]);

  const completeOnboarding = useCallback((userId = null) => {
    setAllKeys(ONBOARDING_KEYS, 'true');
    if (userId) {
      setAllKeys([`has_completed_onboarding_${userId}`, `hasCompletedOnboarding_${userId}`], 'true');
      setHasCompletedOnboarding(userId, true);
    } else {
      setHasCompletedOnboarding(null, true);
    }
    setIsOnboardingActive(false);
  }, []);

  const openTutorial = useCallback(() => setShowTutorial(true), []);

  const closeTutorial = useCallback(() => {
    const targetId = user?.id;
    if (targetId) {
      try { localStorage.setItem(`app_tutorial_completed_${targetId}`, 'true'); } catch {}
    }
    setAllKeys(TUTORIAL_KEYS, 'true');
    setShowTutorial(false);
  }, [user?.id]);

  const completeTutorial = useCallback((userId = null) => {
    const targetId = userId || user?.id;
    if (targetId) {
      try { localStorage.setItem(`app_tutorial_completed_${targetId}`, 'true'); } catch {}
    }
    markUserTutorialCompleted(targetId);
    setAllKeys(TUTORIAL_KEYS, 'true');
    setShowTutorial(false);
  }, [user?.id]);

  const resetTutorial = useCallback(() => {
    if (user?.id) {
      try { localStorage.removeItem(`app_tutorial_completed_${user.id}`); } catch {}
    }
    removeAllKeys(TUTORIAL_KEYS);
    setShowTutorial(true);
  }, [user?.id]);

  const resetOnboarding = useCallback(() => {
    removeAllKeys(ONBOARDING_KEYS);
    setIsOnboardingActive(true);
  }, []);

  return {
    isOnboardingActive, setIsOnboardingActive, isOnboardingLoading,
    showTutorial, setShowTutorial, completeOnboarding, completeTutorial,
    openTutorial, closeTutorial, resetTutorial, resetOnboarding
  };
}

export default useOnboarding;
