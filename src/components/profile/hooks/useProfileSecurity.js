import { useState } from 'react';

/**
 * useProfileSecurity
 * Custom hook para gestionar el PIN de acceso y la autenticación biométrica (WebAuthn).
 *
 * @param {Object} params
 * @param {Object} params.securitySettings Configuración actual de seguridad
 * @param {Function} params.onUpdateSecurity Callback para actualizar las credenciales de seguridad
 * @param {Function} params.setCurrentView Callback para cambiar la vista interna del modal
 * @param {Function} params.showToast Función para notificaciones toast
 */
export function useProfileSecurity({
  securitySettings = {},
  onUpdateSecurity,
  setCurrentView,
  showToast,
} = {}) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Toggle PIN
  const handleTogglePin = () => {
    if (securitySettings?.pinEnabled) {
      if (typeof onUpdateSecurity === 'function') {
        onUpdateSecurity({
          ...securitySettings,
          pinEnabled: false,
          pin: '',
          biometricsEnabled: false,
        });
      }
      try {
        localStorage.setItem('security_pin_enabled', 'false');
        localStorage.setItem('security_pin_code', '');
        localStorage.setItem('presu_app_locked', 'false');
      } catch {}
      if (typeof showToast === 'function') {
        showToast('Bloqueo por PIN desactivado.');
      }
    } else {
      setNewPin('');
      setConfirmPin('');
      setPinError('');
      if (typeof setCurrentView === 'function') {
        setCurrentView('pin_setup');
      }
    }
  };

  const handleSavePin = (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (newPin.length < 4 || newPin.length > 6) {
      setPinError('El PIN debe tener entre 4 y 6 dígitos numéricos.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('Los PINs ingresados no coinciden.');
      return;
    }

    if (typeof onUpdateSecurity === 'function') {
      onUpdateSecurity({
        ...securitySettings,
        pin: newPin,
        pinEnabled: true,
      });
    }
    if (typeof setCurrentView === 'function') {
      setCurrentView('main');
    }
    if (typeof showToast === 'function') {
      showToast('PIN de seguridad configurado y protección activada.');
    }
  };

  // Toggle Biometrics with WebAuthn Registration
  const handleToggleBiometrics = async () => {
    if (securitySettings?.biometricsEnabled) {
      if (typeof onUpdateSecurity === 'function') {
        onUpdateSecurity({
          ...securitySettings,
          biometricsEnabled: false,
        });
      }
      try {
        localStorage.setItem('security_biometric_enabled', 'false');
        localStorage.removeItem('security_biometric_cred_id');
      } catch {}
      if (typeof showToast === 'function') {
        showToast('Autenticación biométrica desactivada.');
      }
      return;
    }

    // Requiere tener activo el PIN antes de habilitar la biometría
    if (!securitySettings?.pinEnabled || !securitySettings?.pin || securitySettings.pin.length < 4) {
      if (typeof showToast === 'function') {
        showToast('Debes configurar y activar primero un PIN de seguridad antes de habilitar la huella.', true);
      }
      return;
    }

    // 1. Verifica si window.PublicKeyCredential existe
    if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) {
      if (typeof showToast === 'function') {
        showToast('Tu dispositivo o navegador no soporta autenticación biométrica en esta app', true);
      }
      return;
    }

    try {
      // Verifica si PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable() retorna true
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.();
      if (!isAvailable) {
        if (typeof showToast === 'function') {
          showToast('Tu dispositivo o navegador no soporta autenticación biométrica en esta app', true);
        }
        return;
      }

      // Registro biométrico estándar para autenticadores de plataforma (Android / WebAuthn)
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: 'Monety',
            id: window.location.hostname,
          },
          user: {
            id: userId,
            name: 'usuario@monety.local',
            displayName: 'Usuario Monety',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      });

      if (credential) {
        const rawIdArray = Array.from(new Uint8Array(credential.rawId));
        localStorage.setItem('security_biometric_enabled', 'true');
        localStorage.setItem('security_biometric_cred_id', JSON.stringify(rawIdArray));
        if (typeof onUpdateSecurity === 'function') {
          onUpdateSecurity({
            ...securitySettings,
            biometricsEnabled: true,
          });
        }
        if (typeof showToast === 'function') {
          showToast('¡Huella dactilar activada correctamente!');
        }
      }
    } catch (err) {
      console.warn('Error en registro biométrico:', err);
      // Envuelto en try/catch para que si el usuario cancela o hay error, el switch permanezca apagado sin romper la app
      if (typeof showToast === 'function') {
        if (err.name === 'NotAllowedError') {
          showToast('Registro biométrico cancelado o no autorizado. Se mantiene solo el PIN.', true);
        } else {
          showToast('No se pudo registrar la huella en este dispositivo. Mantén solo el PIN.', true);
        }
      }
    }
  };

  return {
    newPin,
    setNewPin,
    confirmPin,
    setConfirmPin,
    pinError,
    setPinError,
    handleTogglePin,
    handleSavePin,
    handleToggleBiometrics,
  };
}

export default useProfileSecurity;
