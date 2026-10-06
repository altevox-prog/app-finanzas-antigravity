/**
 * Helper de utilidades para extracción, sincronización y persistencia
 * del perfil de usuario y estado de tutorial por usuario.
 */

export function extractUserProfile(user) {
  if (!user) return null;

  // 1. Extraer nombre real desde user_metadata entregado por Google OAuth / Supabase
  const rawFullName = 
    user.user_metadata?.full_name || 
    user.user_metadata?.name || 
    (user.email ? user.email.split('@')[0] : 'Usuario');

  const cleanName = String(rawFullName).trim();
  const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

  // 2. Extraer avatar desde user_metadata (Google usa avatar_url o picture)
  const avatarUrl = 
    user.user_metadata?.avatar_url || 
    user.user_metadata?.picture || 
    null;

  // 3. Iniciales dinámicas a partir del nombre
  const initials = formattedName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || formattedName.slice(0, 2).toUpperCase() || 'US';

  return {
    name: formattedName,
    photo: avatarUrl,
    initials
  };
}

/**
 * Persiste el perfil en localStorage y en la tabla 'profiles' de Supabase (si existe)
 */
export async function syncAndPersistUserProfile(user, supabaseClient) {
  if (!user) return null;
  const extracted = extractUserProfile(user);
  if (!extracted) return null;

  try {
    const raw = localStorage.getItem('presu_profile_v1');
    const existing = raw ? JSON.parse(raw) : null;
    const isDefault = !existing?.name || existing.name === 'Alex González' || existing.name === 'Usuario';

    // Priorizar datos de Google si existen en user_metadata, de lo contrario mantener nombre custom no-default
    const hasGoogleName = Boolean(user.user_metadata?.full_name || user.user_metadata?.name);
    const finalName = hasGoogleName ? extracted.name : (isDefault ? extracted.name : (existing?.name || extracted.name));
    const finalPhoto = extracted.photo || existing?.photo || null;
    const finalInitials = finalName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'US';

    const mergedProfile = {
      name: finalName,
      photo: finalPhoto,
      initials: finalInitials
    };

    localStorage.setItem('presu_profile_v1', JSON.stringify(mergedProfile));
    localStorage.setItem('user_profile_name', mergedProfile.name);
    localStorage.setItem('user_name', mergedProfile.name);
    localStorage.setItem('profile', JSON.stringify(mergedProfile));

    return mergedProfile;
  } catch (err) {
    console.warn('[UserProfileHelper] Error al guardar perfil:', err);
    return extracted;
  }
}

/**
 * Verifica si el usuario ha completado el onboarding / bienvenida
 */
export function getHasCompletedOnboarding(userId) {
  try {
    if (userId) {
      // 1. Verificación estricta y aislada por ID de usuario en localStorage
      const userKeySnake = localStorage.getItem(`has_completed_onboarding_${userId}`);
      if (userKeySnake === 'true') return true;
      if (userKeySnake === 'false') return false;

      const userKey = localStorage.getItem(`hasCompletedOnboarding_${userId}`);
      if (userKey === 'true') return true;
      if (userKey === 'false') return false;

      const tutKey = localStorage.getItem(`tutorial_completed_${userId}`);
      if (tutKey === 'true') return true;
      if (tutKey === 'false') return false;

      // 2. Verificar en perfil local únicamente si coincide con el usuario autenticado
      const raw = localStorage.getItem('presu_profile_v1');
      if (raw) {
        try {
          const profile = JSON.parse(raw);
          if (profile.user_id === userId || profile.id === userId) {
            if (profile.has_completed_onboarding === true || profile.onboarding_completed === true || profile.hasCompletedOnboarding === true) {
              return true;
            }
            if (profile.has_completed_onboarding === false || profile.onboarding_completed === false || profile.hasCompletedOnboarding === false) {
              return false;
            }
          }
        } catch {}
      }

      // Si el usuario autenticado no tiene explícitamente completado el onboarding en sus claves propias,
      // NUNCA asumir true desde claves globales de sesiones anteriores
      return false;
    }

    // Modo invitado / offline (sin sesión iniciada)
    if (localStorage.getItem('has_completed_onboarding') === 'true') return true;
    if (localStorage.getItem('hasCompletedOnboarding') === 'true') return true;
    if (localStorage.getItem('app_onboarding_completed') === 'true') return true;
    const raw = localStorage.getItem('presu_profile_v1');
    if (raw) {
      try {
        const profile = JSON.parse(raw);
        if (profile.hasCompletedOnboarding === true || profile.has_completed_onboarding === true || profile.onboarding_completed === true) {
          return true;
        }
      } catch {}
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Marca el onboarding como completado de forma explícita e independiente
 */
export function setHasCompletedOnboarding(userId, completed = true) {
  try {
    const valStr = completed ? 'true' : 'false';
    if (userId) {
      localStorage.setItem(`has_completed_onboarding_${userId}`, valStr);
      localStorage.setItem(`hasCompletedOnboarding_${userId}`, valStr);
      localStorage.setItem(`tutorial_completed_${userId}`, valStr);
    }
    localStorage.setItem('has_completed_onboarding', valStr);
    localStorage.setItem('hasCompletedOnboarding', valStr);
    localStorage.setItem('app_onboarding_completed', valStr);

    const raw = localStorage.getItem('presu_profile_v1');
    const profile = raw ? JSON.parse(raw) : {};
    profile.hasCompletedOnboarding = completed;
    profile.has_completed_onboarding = completed;
    profile.onboarding_completed = completed;
    if (userId) {
      profile.user_id = userId;
    }
    localStorage.setItem('presu_profile_v1', JSON.stringify(profile));
  } catch (err) {
    console.warn('[UserProfileHelper] Error guardando hasCompletedOnboarding:', err);
  }
}

/**
 * Sincroniza la bandera has_completed_onboarding en modo Local-First
 */
export async function syncOnboardingToSupabase(user, supabaseClient, completed = true) {
  // Modo 100% Local-First
  return true;
}

/**
 * Consulta el estado de onboarding (modo Local-First)
 */
export async function checkCloudOnboardingStatus(userId) {
  return getHasCompletedOnboarding(userId);
}

export function hasUserCompletedTutorial(userId) {
  try {
    if (userId) {
      const tutKey = 
        localStorage.getItem(`presu_tutorial_completed_${userId}`) || 
        localStorage.getItem(`has_completed_tutorial_${userId}`) || 
        localStorage.getItem(`tutorial_completed_${userId}`);
      if (tutKey === 'true') return true;
      if (tutKey === 'false') return false;
    }
    return (
      localStorage.getItem('presu_tutorial_completed') === 'true' ||
      localStorage.getItem('has_completed_tutorial') === 'true' ||
      localStorage.getItem('tutorial_completed') === 'true'
    );
  } catch {
    return false;
  }
}

export function markUserTutorialCompleted(userId) {
  try {
    if (userId) {
      localStorage.setItem(`presu_tutorial_completed_${userId}`, 'true');
      localStorage.setItem(`has_completed_tutorial_${userId}`, 'true');
      localStorage.setItem(`tutorial_completed_${userId}`, 'true');
    }
    localStorage.setItem('presu_tutorial_completed', 'true');
    localStorage.setItem('has_completed_tutorial', 'true');
    localStorage.setItem('tutorial_completed', 'true');
  } catch (err) {
    console.warn('[UserProfileHelper] Error guardando tutorial_completed:', err);
  }
}

