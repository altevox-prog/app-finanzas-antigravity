import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';

/**
 * useAppSecurity
 * Hook consolidado para la gestión de seguridad de la app:
 * PIN, biometría, bloqueo por inactividad y segundo plano.
 */
export function useAppSecurity(isResettingRef = null, { inactivityTimeoutMinutes = 15 } = {}) {
  const [securitySettings, setSecuritySettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SECURITY) || localStorage.getItem('presu_security_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        const pinCode = parsed?.pin ? String(parsed.pin).trim() : '';
        const hasPin = pinCode.length >= 4;
        return { pinEnabled: Boolean(parsed?.pinEnabled) && hasPin, pin: hasPin ? pinCode : '', biometricsEnabled: Boolean(parsed?.biometricsEnabled) };
      }
      const rawPin = localStorage.getItem(STORAGE_KEYS.SECURITY_PIN_CODE) || localStorage.getItem('security_pin_code') || '';
      const pinCode = rawPin.trim(), hasPin = pinCode.length >= 4;
      const pinEnabled = (localStorage.getItem(STORAGE_KEYS.SECURITY_PIN_ENABLED) === 'true' || localStorage.getItem('security_pin_enabled') === 'true') && hasPin;
      const biometricsEnabled = localStorage.getItem(STORAGE_KEYS.SECURITY_BIOMETRIC_ENABLED) === 'true';
      return { pinEnabled, pin: hasPin ? pinCode : '', biometricsEnabled };
    } catch (e) {
      console.error('Error cargando seguridad:', e);
      return { pinEnabled: false, pin: '', biometricsEnabled: false };
    }
  });

  const [isLocked, setIsLocked] = useState(() => {
    try {
      const isTutorialDone = ['presu_tutorial_completed', 'has_completed_tutorial', 'tutorial_completed'].some(k => localStorage.getItem(k) === 'true');
      if (!isTutorialDone) return false;
      const isCompleted = ['has_completed_onboarding', 'hasCompletedOnboarding', STORAGE_KEYS.ONBOARDING_COMPLETED].some(k => localStorage.getItem(k) === 'true');
      if (!isCompleted) return false;

      let pin = localStorage.getItem(STORAGE_KEYS.SECURITY_PIN_CODE) || localStorage.getItem('security_pin_code') || '';
      let pinEnabled = localStorage.getItem(STORAGE_KEYS.SECURITY_PIN_ENABLED) === 'true' || localStorage.getItem('security_pin_enabled') === 'true';
      const secSaved = localStorage.getItem(STORAGE_KEYS.SECURITY) || localStorage.getItem('presu_security_v1');
      if (secSaved) {
        try {
          const parsed = JSON.parse(secSaved);
          if (parsed.pin) pin = parsed.pin;
          if (parsed.pinEnabled !== undefined) pinEnabled = Boolean(parsed.pinEnabled);
        } catch {}
      }
      if (!pinEnabled || !pin || String(pin).trim().length < 4) {
        localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false');
        return false;
      }
      return localStorage.getItem(STORAGE_KEYS.APP_IS_LOCKED) === 'true';
    } catch {
      return false;
    }
  });

  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    if (isResettingRef?.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_ENABLED, securitySettings.pinEnabled ? 'true' : 'false');
      localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_CODE, securitySettings.pin || '');
      localStorage.setItem(STORAGE_KEYS.SECURITY_BIOMETRIC_ENABLED, securitySettings.biometricsEnabled ? 'true' : 'false');
      localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(securitySettings));
      if (!securitySettings.pinEnabled) {
        setIsLocked(false);
        localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false');
        setFailedAttempts(0);
      }
    } catch (e) { console.warn('Error guardando configuración:', e); }
  }, [securitySettings, isResettingRef]);

  useEffect(() => {
    if (isResettingRef?.current) return;
    try { localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, isLocked ? 'true' : 'false'); } catch (e) { console.warn('Error guardando bloqueo:', e); }
  }, [isLocked, isResettingRef]);

  const handleUnlock = useCallback(() => {
    setIsLocked(false);
    setFailedAttempts(0);
    try { localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false'); } catch {}
  }, []);

  const lockApp = useCallback(() => {
    if (!securitySettings.pinEnabled || !securitySettings.pin || securitySettings.pin.trim().length < 4) return;
    setIsLocked(true);
    try { localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'true'); } catch {}
  }, [securitySettings]);

  const handleVerifyPin = useCallback((inputPin) => {
    const cleanInput = String(inputPin || '').trim(), cleanExpected = String(securitySettings?.pin || '').trim();
    if (cleanInput === cleanExpected) {
      handleUnlock();
      return true;
    }
    setFailedAttempts((prev) => prev + 1);
    return false;
  }, [securitySettings, handleUnlock]);

  const handleUpdatePin = useCallback((newPin) => {
    const cleanPin = String(newPin || '').trim();
    setSecuritySettings((prev) => ({ ...prev, pin: cleanPin, pinEnabled: cleanPin.length >= 4 }));
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      let pin = localStorage.getItem(STORAGE_KEYS.SECURITY_PIN_CODE) || localStorage.getItem('security_pin_code') || '';
      let pinEnabled = localStorage.getItem(STORAGE_KEYS.SECURITY_PIN_ENABLED) === 'true' || localStorage.getItem('security_pin_enabled') === 'true';
      const secSaved = localStorage.getItem(STORAGE_KEYS.SECURITY) || localStorage.getItem('presu_security_v1');
      if (secSaved) {
        try {
          const parsed = JSON.parse(secSaved);
          if (parsed.pin) pin = parsed.pin;
          if (parsed.pinEnabled !== undefined) pinEnabled = Boolean(parsed.pinEnabled);
        } catch {}
      }
      const isSecurityEnabled = pinEnabled && Boolean(pin) && String(pin).trim().length >= 4;
      const isTutorialDone = ['presu_tutorial_completed', 'has_completed_tutorial', 'tutorial_completed'].some(k => localStorage.getItem(k) === 'true');
      if (document.visibilityState === 'hidden' && isSecurityEnabled && isTutorialDone) {
        setIsLocked(true);
        localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'true');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!securitySettings.pinEnabled || isLocked || !inactivityTimeoutMinutes) return;
    let timeoutId;
    const timeoutMs = inactivityTimeoutMinutes * 60 * 1000;
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (securitySettings.pinEnabled && String(securitySettings.pin).trim().length >= 4) {
          setIsLocked(true);
          localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'true');
        }
      }, timeoutMs);
    };
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [securitySettings, isLocked, inactivityTimeoutMinutes]);

  return {
    securitySettings, setSecuritySettings,
    isLocked, setIsLocked,
    handleUnlock, unlockApp: handleUnlock,
    lockApp, handleVerifyPin, validatePin: handleVerifyPin,
    handleUpdatePin, failedAttempts, setFailedAttempts
  };
}

export default useAppSecurity;
