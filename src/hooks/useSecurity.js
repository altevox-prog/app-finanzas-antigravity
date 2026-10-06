import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';

export function useSecurity(isResettingRef = null) {
  // Security settings (PIN and Biometrics)
  const [securitySettings, setSecuritySettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SECURITY) || localStorage.getItem('presu_security_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        const pinCode = parsed?.pin ? String(parsed.pin).trim() : '';
        const hasPin = pinCode.length >= 4;
        return {
          pinEnabled: Boolean(parsed?.pinEnabled) && hasPin,
          pin: hasPin ? pinCode : '',
          biometricsEnabled: Boolean(parsed?.biometricsEnabled)
        };
      }
      const rawPin = localStorage.getItem(STORAGE_KEYS.SECURITY_PIN_CODE) || localStorage.getItem('security_pin_code') || '';
      const pinCode = rawPin.trim();
      const hasPin = pinCode.length >= 4;
      const pinEnabled = (localStorage.getItem(STORAGE_KEYS.SECURITY_PIN_ENABLED) === 'true' || localStorage.getItem('security_pin_enabled') === 'true') && hasPin;
      const biometricsEnabled = localStorage.getItem(STORAGE_KEYS.SECURITY_BIOMETRIC_ENABLED) === 'true';
      return { pinEnabled, pin: hasPin ? pinCode : '', biometricsEnabled };
    } catch (e) {
      console.error('Error cargando configuración de seguridad:', e);
      return { pinEnabled: false, pin: '', biometricsEnabled: false };
    }
  });

  // App Lock state - Sólo se bloquea si el tutorial y el onboarding ya fueron completados Y hay un PIN activo no vacío
  const [isLocked, setIsLocked] = useState(() => {
    try {
      // Condición de primera vez: si el tutorial no está activo en localStorage, NUNCA bloquear
      const isTutorialDone = 
        localStorage.getItem('presu_tutorial_completed') === 'true' ||
        localStorage.getItem('has_completed_tutorial') === 'true' ||
        localStorage.getItem('tutorial_completed') === 'true';
      if (!isTutorialDone) return false;

      const isCompleted = 
        localStorage.getItem('has_completed_onboarding') === 'true' ||
        localStorage.getItem('hasCompletedOnboarding') === 'true' ||
        localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
      if (!isCompleted) return false;

      // Obtener configuración de seguridad almacenada
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

      // Si no hay PIN o el PIN está vacío o es menor a 4 dígitos, NUNCA bloquear
      if (!pinEnabled || !pin || String(pin).trim().length < 4) {
        localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false');
        return false;
      }

      const locked = localStorage.getItem(STORAGE_KEYS.APP_IS_LOCKED) === 'true';
      return locked;
    } catch {
      return false;
    }
  });

  // Persistir configuración de seguridad
  useEffect(() => {
    if (isResettingRef?.current) return;
    localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_ENABLED, securitySettings.pinEnabled ? 'true' : 'false');
    localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_CODE, securitySettings.pin || '');
    localStorage.setItem(STORAGE_KEYS.SECURITY_BIOMETRIC_ENABLED, securitySettings.biometricsEnabled ? 'true' : 'false');
    localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(securitySettings));

    // Si se desactiva el PIN, desbloquear de inmediato
    if (!securitySettings.pinEnabled) {
      setIsLocked(false);
      localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false');
    }
  }, [securitySettings]);

  // Persistir estado de bloqueo
  useEffect(() => {
    if (isResettingRef?.current) return;
    localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, isLocked ? 'true' : 'false');
  }, [isLocked]);

  const handleUnlock = () => {
    setIsLocked(false);
    localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false');
  };

  const lockApp = () => {
    setIsLocked(true);
    localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'true');
  };

  // Auto-bloqueo inmediato al salir de la app o pasar a segundo plano
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

      // La seguridad por PIN solo es válida si pinEnabled es true Y el PIN existe y tiene al menos 4 dígitos
      const isSecurityEnabled = pinEnabled && Boolean(pin) && String(pin).trim().length >= 4;

      const isTutorialDone = 
        localStorage.getItem('presu_tutorial_completed') === 'true' ||
        localStorage.getItem('has_completed_tutorial') === 'true' ||
        localStorage.getItem('tutorial_completed') === 'true';

      // Si la seguridad está activa con PIN no vacío, el tutorial ya fue completado y la app pasa a segundo plano:
      if (document.visibilityState === 'hidden' && isSecurityEnabled && isTutorialDone) {
        setIsLocked(true); // Bloquea la app
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

  const validatePin = (inputPin) => {
    return String(inputPin).trim() === String(securitySettings?.pin || '').trim();
  };

  return {
    securitySettings,
    setSecuritySettings,
    isLocked,
    setIsLocked,
    handleUnlock,
    unlockApp: handleUnlock,
    lockApp,
    validatePin
  };
}

export default useSecurity;
