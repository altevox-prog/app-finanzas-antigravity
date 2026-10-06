import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';

export function useUserProfile({ user = null, isResettingRef = null } = {}) {
  // Estado de Perfil de Usuario (nombre, foto, iniciales)
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name && parsed.name !== 'Alex González') {
          return parsed;
        }
      }
      const name = localStorage.getItem('user_profile_name');
      if (name && name !== 'Alex González') {
        return { name, photo: null, initials: name.slice(0, 2).toUpperCase() };
      }
      return { name: 'Usuario', photo: null, initials: 'US' };
    } catch {
      return { name: 'Usuario', photo: null, initials: 'US' };
    }
  });

  // Sincronizar dinámicamente metadatos del perfil de Google o sesión al detectar usuario
  useEffect(() => {
    if (!user) return;
    const rawFallback = user.email ? user.email.split('@')[0] : 'Usuario';
    const cleanFallback = rawFallback.charAt(0).toUpperCase() + rawFallback.slice(1);
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || cleanFallback;
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

    if (fullName) {
      setUserProfile((prev) => {
        const isDefault = !prev?.name || prev.name === 'Alex González' || prev.name === 'Usuario';
        const hasGoogleName = Boolean(user.user_metadata?.full_name || user.user_metadata?.name);
        const finalName = hasGoogleName ? fullName : (isDefault ? fullName : (prev.name || fullName));
        const finalPhoto = avatarUrl || prev?.photo || null;
        const initials = finalName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0].toUpperCase())
          .join('') || 'US';

        const updated = {
          name: finalName,
          photo: finalPhoto,
          initials
        };

        try {
          localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
          localStorage.setItem('user_profile_name', finalName);
          localStorage.setItem('user_name', finalName);
          localStorage.setItem('profile', JSON.stringify(updated));
        } catch (e) {
          console.warn('Error guardando perfil en localStorage:', e);
        }

        return updated;
      });
    }
  }, [user?.id]);

  // Persistir cambios en localStorage
  useEffect(() => {
    if (isResettingRef?.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(userProfile));
    } catch (e) {}
  }, [userProfile, isResettingRef]);

  // Actualización explícita del perfil
  const handleUpdateProfile = useCallback(async (newProfile) => {
    const cleanName = (newProfile?.name || 'Usuario').trim();
    const initials = cleanName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'US';

    const updated = {
      ...newProfile,
      name: cleanName,
      initials: newProfile?.initials || initials
    };

    setUserProfile(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
      if (updated?.name) {
        localStorage.setItem('user_profile_name', updated.name);
        localStorage.setItem('user_name', updated.name);
      }
      localStorage.setItem('profile', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error guardando perfil localmente:', e);
    }
    return updated;
  }, []);

  const updateName = useCallback((name) => {
    return handleUpdateProfile({ ...userProfile, name });
  }, [userProfile, handleUpdateProfile]);

  const updatePhoto = useCallback((photoUrl) => {
    return handleUpdateProfile({ ...userProfile, photo: photoUrl });
  }, [userProfile, handleUpdateProfile]);

  const resetProfile = useCallback(() => {
    const def = { name: 'Usuario', photo: null, initials: 'US' };
    setUserProfile(def);
    try {
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      localStorage.removeItem('user_profile_name');
      localStorage.removeItem('user_name');
      localStorage.removeItem('profile');
    } catch (e) {}
  }, []);

  return {
    userProfile,
    setUserProfile,
    handleUpdateProfile,
    updateProfile: handleUpdateProfile,
    updateName,
    updatePhoto,
    resetProfile
  };
}

export default useUserProfile;
