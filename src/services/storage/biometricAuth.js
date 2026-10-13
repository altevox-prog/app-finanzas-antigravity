/**
 * biometricAuth.js
 * Servicios de autenticación y registro de credenciales biométricas WebAuthn.
 */

/**
 * Registra una nueva credencial biométrica en la plataforma (TouchID / FaceID / Windows Hello)
 * mediante WebAuthn si está disponible en el dispositivo.
 */
export async function registerBiometrics(userName = 'Usuario') {
  if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) {
    return null;
  }

  const alreadySaved = localStorage.getItem('security_biometric_cred_id');
  if (alreadySaved) return alreadySaved;

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Presu App', id: window.location.hostname },
        user: { id: userId, name: userName, displayName: userName },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000
      }
    });

    if (credential) {
      const rawIdArray = Array.from(new Uint8Array(credential.rawId));
      localStorage.setItem('security_biometric_cred_id', JSON.stringify(rawIdArray));
      return rawIdArray;
    }
  } catch (err) {
    console.warn('[biometricAuth] Biometría no registrada o cancelada por el usuario:', err);
    return null;
  }

  return null;
}
