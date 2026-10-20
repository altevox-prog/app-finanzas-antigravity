const getInitials = (name) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || name.slice(0, 2).toUpperCase() || 'US';

export function extractUserProfile(user) {
  if (!user) return null;
  const rawFullName = user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Usuario');
  const cleanName = String(rawFullName).trim();
  const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  return {
    name: formattedName,
    photo: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    initials: getInitials(formattedName)
  };
}

export async function syncAndPersistUserProfile(user, supabaseClient) {
  if (!user) return null;
  const extracted = extractUserProfile(user);
  if (!extracted) return null;
  try {
    const raw = localStorage.getItem('presu_profile_v1');
    const existing = raw ? JSON.parse(raw) : null;
    const isDefault = !existing?.name || existing.name === 'Alex González' || existing.name === 'Usuario';
    const hasGoogleName = Boolean(user.user_metadata?.full_name || user.user_metadata?.name);
    const finalName = hasGoogleName ? extracted.name : (isDefault ? extracted.name : (existing?.name || extracted.name));
    const mergedProfile = {
      name: finalName,
      photo: extracted.photo || existing?.photo || null,
      initials: getInitials(finalName)
    };
    ['presu_profile_v1', 'profile'].forEach((k) => localStorage.setItem(k, JSON.stringify(mergedProfile)));
    ['user_profile_name', 'user_name'].forEach((k) => localStorage.setItem(k, mergedProfile.name));
    return mergedProfile;
  } catch (err) {
    console.warn('[UserProfileHelper] Error al guardar perfil:', err);
    return extracted;
  }
}

export function getHasCompletedOnboarding(userId) {
  try {
    if (userId) {
      for (const k of [`has_completed_onboarding_${userId}`, `hasCompletedOnboarding_${userId}`, `tutorial_completed_${userId}`]) {
        const val = localStorage.getItem(k);
        if (val === 'true') return true;
        if (val === 'false') return false;
      }
      const raw = localStorage.getItem('presu_profile_v1');
      if (raw) {
        const p = JSON.parse(raw);
        if (p.user_id === userId || p.id === userId) {
          const status = p.has_completed_onboarding ?? p.onboarding_completed ?? p.hasCompletedOnboarding;
          if (typeof status === 'boolean') return status;
        }
      }
      return false;
    }
    const globalKeys = ['has_completed_onboarding', 'hasCompletedOnboarding', 'app_onboarding_completed'];
    if (globalKeys.some((k) => localStorage.getItem(k) === 'true')) return true;
    const raw = localStorage.getItem('presu_profile_v1');
    if (raw) {
      const p = JSON.parse(raw);
      return Boolean(p.hasCompletedOnboarding || p.has_completed_onboarding || p.onboarding_completed);
    }
    return false;
  } catch {
    return false;
  }
}

export function setHasCompletedOnboarding(userId, completed = true) {
  try {
    const valStr = completed ? 'true' : 'false';
    const keys = ['has_completed_onboarding', 'hasCompletedOnboarding', 'app_onboarding_completed'];
    if (userId) keys.push(`has_completed_onboarding_${userId}`, `hasCompletedOnboarding_${userId}`, `tutorial_completed_${userId}`);
    keys.forEach((k) => localStorage.setItem(k, valStr));

    const raw = localStorage.getItem('presu_profile_v1');
    const profile = raw ? JSON.parse(raw) : {};
    profile.hasCompletedOnboarding = completed;
    profile.has_completed_onboarding = completed;
    profile.onboarding_completed = completed;
    if (userId) profile.user_id = userId;
    localStorage.setItem('presu_profile_v1', JSON.stringify(profile));
  } catch (err) {
    console.warn('[UserProfileHelper] Error guardando hasCompletedOnboarding:', err);
  }
}

export async function syncOnboardingToSupabase(user, supabaseClient, completed = true) {
  return true;
}

export async function checkCloudOnboardingStatus(userId) {
  return getHasCompletedOnboarding(userId);
}

export function hasUserCompletedTutorial(userId) {
  try {
    if (userId) {
      for (const k of [`presu_tutorial_completed_${userId}`, `has_completed_tutorial_${userId}`, `tutorial_completed_${userId}`]) {
        const v = localStorage.getItem(k);
        if (v === 'true') return true;
        if (v === 'false') return false;
      }
    }
    return ['presu_tutorial_completed', 'has_completed_tutorial', 'tutorial_completed'].some((k) => localStorage.getItem(k) === 'true');
  } catch {
    return false;
  }
}

export function markUserTutorialCompleted(userId) {
  try {
    const keys = ['presu_tutorial_completed', 'has_completed_tutorial', 'tutorial_completed'];
    if (userId) keys.push(`presu_tutorial_completed_${userId}`, `has_completed_tutorial_${userId}`, `tutorial_completed_${userId}`);
    keys.forEach((k) => localStorage.setItem(k, 'true'));
  } catch (err) {
    console.warn('[UserProfileHelper] Error guardando tutorial_completed:', err);
  }
}
