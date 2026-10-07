import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';

/**
 * useAppSecurity
 * Hook consolidado para la seguridad de la aplicación:
 * - Configuración de seguridad (PIN, biometría, estado de activación).
 * - Estado de bloqueo de pantalla (isLocked, lockApp, handleUnlock).
 * - Verificación y actualización de PIN (handleVerifyPin, handleUpdatePin).
 * - Conteo y control de intentos fallidos (failedAttempts).
 * - Bloqueo automático por segundo plano (visibilitychange/pagehide) e inactividad.
 */
export function useAppSecurity(isResettingRef = null, { inactivityTimeoutMinutes = 15 } = {}) {
  // 1. Estado de Configuración de Seguridad (PIN y Biometría)
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

  // 2. Estado de Bloqueo de la App (isLocked)
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

  // 3. Control de Intentos Fallidos
  const [failedAttempts, setFailedAttempts] = useState(0);

  // 4. Persistir configuración de seguridad
  useEffect(() => {
    if (isResettingRef?.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_ENABLED, securitySettings.pinEnabled ? 'true' : 'false');
      localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_CODE, securitySettings.pin || '');
      localStorage.setItem(STORAGE_KEYS.SECURITY_BIOMETRIC_ENABLED, securitySettings.biometricsEnabled ? 'true' : 'false');
      localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(securitySettings));

      // Si se desactiva el PIN, desbloquear de inmediato
      if (!securitySettings.pinEnabled) {
        setIsLocked(false);
        localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false');
        setFailedAttempts(0);
      }
    } catch (e) {
      console.warn('Error guardando configuración de seguridad:', e);
    }
  }, [securitySettings, isResettingRef]);

  // 5. Persistir estado de bloqueo
  useEffect(() => {
    if (isResettingRef?.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, isLocked ? 'true' : 'false');
    } catch (e) {
      console.warn('Error guardando estado de bloqueo:', e);
    }
  }, [isLocked, isResettingRef]);

  // 6. Funciones de Desbloqueo y Bloqueo
  const handleUnlock = useCallback(() => {
    setIsLocked(false);
    setFailedAttempts(0);
    try {
      localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false');
    } catch {}
  }, []);

  const lockApp = useCallback(() => {
    if (!securitySettings.pinEnabled || !securitySettings.pin || securitySettings.pin.trim().length < 4) {
      return;
    }
    setIsLocked(true);
    try {
      localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'true');
    } catch {}
  }, [securitySettings]);

  // 7. Verificación de PIN
  const handleVerifyPin = useCallback((inputPin) => {
    const cleanInput = String(inputPin || '').trim();
    const cleanExpected = String(securitySettings?.pin || '').trim();
    if (cleanInput === cleanExpected) {
      handleUnlock();
      return true;
    } else {
      setFailedAttempts((prev) => prev + 1);
      return false;
    }
  }, [securitySettings, handleUnlock]);

  // 8. Actualización de PIN
  const handleUpdatePin = useCallback((newPin) => {
    const cleanPin = String(newPin || '').trim();
    const hasPin = cleanPin.length >= 4;
    setSecuritySettings((prev) => ({
      ...prev,
      pin: cleanPin,
      pinEnabled: hasPin
    }));
  }, []);

  // 9. Bloqueo al pasar a segundo plano (visibilitychange / pagehide)
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
      const isTutorialDone = 
        localStorage.getItem('presu_tutorial_completed') === 'true' ||
        localStorage.getItem('has_completed_tutorial') === 'true' ||
        localStorage.getItem('tutorial_completed') === 'true';

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

  // 10. Temporizador de Bloqueo por Inactividad
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

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [securitySettings, isLocked, inactivityTimeoutMinutes]);

  return {
    securitySettings,
    setSecuritySettings,
    isLocked,
    setIsLocked,
    handleUnlock,
    unlockApp: handleUnlock,
    lockApp,
    handleVerifyPin,
    validatePin: handleVerifyPin,
    handleUpdatePin,
    failedAttempts,
    setFailedAttempts
  };
}

export default useAppSecurity;
