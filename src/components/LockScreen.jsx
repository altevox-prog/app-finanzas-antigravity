import React, { useState, useEffect, useRef } from 'react';
import { Fingerprint, Delete, ShieldCheck, AlertCircle } from 'lucide-react';
import AppLogo from './AppLogo';

const KEYPAD_KEYS = [
  { num: 1, letters: '' },
  { num: 2, letters: 'ABC' },
  { num: 3, letters: 'DEF' },
  { num: 4, letters: 'GHI' },
  { num: 5, letters: 'JKL' },
  { num: 6, letters: 'MNO' },
  { num: 7, letters: 'PQRS' },
  { num: 8, letters: 'TUV' },
  { num: 9, letters: 'WXYZ' },
];

export default function LockScreen({
  userProfile,
  expectedPin,
  biometricsEnabled,
  onUnlock,
  // Props opcionales para control externo
  pin: externalPin,
  maxDigits: externalMaxDigits,
  onNumberPress: externalOnNumberPress,
  onDelete: externalOnDelete,
  onBiometric: externalOnBiometric,
  isBiometricAvailable: externalIsBiometricAvailable,
  userName: externalUserName
}) {
  const [internalPin, setInternalPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const isBiometricPendingRef = useRef(false);

  const activePin = expectedPin || '';
  const maxDigits = externalMaxDigits || (activePin.length >= 4 ? activePin.length : 4);
  const currentPin = externalPin !== undefined ? externalPin : internalPin;

  const isBiometricActive = externalIsBiometricAvailable !== undefined 
    ? externalIsBiometricAvailable 
    : Boolean(biometricsEnabled || (typeof localStorage !== 'undefined' && localStorage.getItem('security_biometric_enabled') === 'true'));

  const userName = externalUserName || userProfile?.name?.split(' ')[0] || userProfile?.name || 'Usuario';

  // Si no hay PIN activo configurado y no hay biometría, desbloquear de inmediato
  useEffect(() => {
    if (!activePin && !isBiometricActive) {
      if (onUnlock) onUnlock();
    }
  }, [activePin, isBiometricActive, onUnlock]);

  // 1. Disparo automático al montar la pantalla de bloqueo
  useEffect(() => {
    if (!isBiometricActive) return;

    let timer;
    const triggerBiometrics = async () => {
      try {
        await new Promise((resolve) => {
          timer = setTimeout(resolve, 300);
        });

        if (document.visibilityState === 'visible') {
          await handleBiometricUnlock();
        }
      } catch (err) {
        console.warn('Autodisparo biométrico esperando interacción:', err);
      }
    };

    triggerBiometrics();
    return () => clearTimeout(timer);
  }, []);

  // 2. Disparo automático al volver de segundo plano (visibilitychange)
  useEffect(() => {
    let timer;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isBiometricActive) {
        timer = setTimeout(() => {
          handleBiometricUnlock();
        }, 250);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimeout(timer);
    };
  }, [isBiometricActive]);

  // Soporte para teclado físico (computadoras / navegadores de escritorio)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(parseInt(e.key, 10));
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPin, activePin]);

  const handleDigit = (digit) => {
    if (externalOnNumberPress) {
      externalOnNumberPress(digit);
      return;
    }

    if (internalPin.length >= maxDigits) return;
    const nextPin = internalPin + digit.toString();
    setInternalPin(nextPin);
    setErrorMsg('');

    if (nextPin.length === activePin.length) {
      if (nextPin === activePin) {
        if (onUnlock) onUnlock();
      } else {
        setIsShaking(true);
        setErrorMsg('PIN incorrecto. Inténtalo de nuevo.');
        setTimeout(() => {
          setInternalPin('');
          setIsShaking(false);
        }, 600);
      }
    }
  };

  const handleBackspace = () => {
    if (externalOnDelete) {
      externalOnDelete();
      return;
    }
    setInternalPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleResetAndUnlock = () => {
    try {
      localStorage.setItem('security_pin_enabled', 'false');
      localStorage.setItem('security_pin_code', '');
      localStorage.setItem('security_biometric_enabled', 'false');
      localStorage.setItem('app_is_locked', 'false');
      localStorage.removeItem('security_biometric_cred_id');
      const saved = localStorage.getItem('presu_security_v1');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          localStorage.setItem('presu_security_v1', JSON.stringify({ ...parsed, pinEnabled: false, pin: '', biometricsEnabled: false }));
        } catch {}
      }
    } catch (e) {
      console.error(e);
    }
    if (onUnlock) onUnlock();
  };

  // Verificación biométrica nativa (Android / iOS / WebAuthn)
  const handleBiometricUnlock = async () => {
    if (externalOnBiometric) {
      externalOnBiometric();
      return;
    }

    if (isBiometricPendingRef.current) return;
    if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials) {
      try {
        isBiometricPendingRef.current = true;
        setErrorMsg('');
        const savedCredId = typeof localStorage !== 'undefined' ? localStorage.getItem('security_biometric_cred_id') : null;
        const allowList = [];

        if (savedCredId) {
          try {
            if (savedCredId.startsWith('[')) {
              const credArray = JSON.parse(savedCredId);
              allowList.push({
                id: new Uint8Array(credArray),
                type: 'public-key',
                transports: ['internal']
              });
            } else {
              const binaryString = atob(savedCredId);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              allowList.push({
                id: bytes,
                type: 'public-key',
                transports: ['internal']
              });
            }
          } catch (e) {
            console.error('Error parseando credencial biométrica:', e);
          }
        }

        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge: window.crypto.getRandomValues(new Uint8Array(32)),
            rpId: window.location.hostname,
            ...(allowList.length > 0 ? { allowCredentials: allowList } : {}),
            userVerification: 'required',
            timeout: 60000
          }
        });

        if (assertion && onUnlock) {
          onUnlock();
        }
      } catch (err) {
        console.warn('Intento biométrico:', err);
        if (err.name === 'NotAllowedError') {
          setErrorMsg('');
        } else {
          setErrorMsg('Usa tu PIN de seguridad.');
        }
      } finally {
        isBiometricPendingRef.current = false;
      }
    } else {
      setErrorMsg('Biometría no disponible en este dispositivo.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col justify-between items-center px-6 pt-8 pb-6 sm:pt-10 sm:pb-8 bg-[#F8FAFC] dark:bg-[#0B0E14] select-none overflow-hidden touch-none overscroll-none"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 24px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 18px)'
      }}
    >
      {/* 1. Cabecera Elegante */}
      <div className="w-full flex flex-col items-center max-w-xs text-center shrink-0">
        <div className="mb-3 sm:mb-4 flex items-center justify-center">
          {userProfile?.photo ? (
            <div className="w-16 h-16 rounded-3xl overflow-hidden shadow-xl shadow-emerald-500/15 border border-emerald-500/20 bg-white dark:bg-[#121620] p-1 flex items-center justify-center">
              <img 
                src={userProfile.photo} 
                alt={userName} 
                className="w-full h-full object-cover rounded-2xl" 
              />
            </div>
          ) : (
            <AppLogo size="xl" showText={false} iconClassName="shadow-xl shadow-emerald-500/15 ring-2 ring-emerald-500/20" />
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          ¡Hola, {userName}!
        </h2>
        
        {errorMsg ? (
          <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold flex items-center gap-1.5 mt-1 animate-fadeIn">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </p>
        ) : (
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Ingresa tu PIN para desbloquear
          </p>
        )}

        {/* Indicadores de PIN estilo fintech cápsula */}
        <div className={`flex items-center gap-3.5 mt-5 sm:mt-6 px-5 py-3 rounded-full bg-slate-200/50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-inner ${isShaking ? 'animate-bounce' : ''}`}>
          {Array.from({ length: maxDigits }).map((_, idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                idx < currentPin.length
                  ? isShaking 
                    ? 'bg-rose-500 scale-125 shadow-md shadow-rose-500/50 ring-4 ring-rose-500/20'
                    : 'bg-emerald-500 scale-125 shadow-md shadow-emerald-500/50 ring-4 ring-emerald-500/20'
                  : 'border-2 border-slate-300 dark:border-white/20 bg-transparent'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 2. Teclado Proporcionado (Sin efecto aplastado) */}
      <div className="w-full max-w-[320px] my-auto py-2 sm:py-3 shrink-0">
        <div className="grid grid-cols-3 gap-3">
          {KEYPAD_KEYS.map(({ num, letters }) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-16 sm:h-18 py-2.5 rounded-2xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-md hover:bg-slate-50 dark:hover:bg-[#1A2030] active:scale-95 transition-all flex flex-col items-center justify-center group cursor-pointer"
            >
              <span className="text-2xl font-bold text-slate-800 dark:text-white group-active:text-emerald-600 transition-colors">
                {num}
              </span>
              {letters ? (
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
                  {letters}
                </span>
              ) : (
                <span className="h-[15px]" />
              )}
            </button>
          ))}

          {/* Fila 4: Biometría / 0 / Borrar */}
          <button
            type="button"
            onClick={handleBiometricUnlock}
            disabled={!isBiometricActive}
            className={`h-16 sm:h-18 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 active:scale-90 transition-all hover:bg-emerald-500/10 cursor-pointer ${
              !isBiometricActive ? 'opacity-0 pointer-events-none' : ''
            }`}
            title="Usar Huella o Face ID"
            aria-label="Usar Huella o Face ID"
          >
            <Fingerprint className="w-7 h-7" />
          </button>

          <button
            type="button"
            onClick={() => handleDigit(0)}
            className="h-16 sm:h-18 py-2.5 rounded-2xl bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-md hover:bg-slate-50 dark:hover:bg-[#1A2030] active:scale-95 transition-all flex flex-col items-center justify-center group cursor-pointer"
          >
            <span className="text-2xl font-bold text-slate-800 dark:text-white group-active:text-emerald-600 transition-colors">
              0
            </span>
            <span className="h-[15px]" />
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-16 sm:h-18 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 active:scale-90 transition-all hover:bg-rose-500/10 cursor-pointer"
            title="Borrar dígito"
            aria-label="Borrar dígito"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* 3. Pie de Seguridad Sutil */}
      <div className="flex flex-col items-center space-y-1.5 shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Sesión cifrada localmente</span>
        </div>

        <button
          type="button"
          onClick={handleResetAndUnlock}
          className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors py-0.5 px-2 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-4 cursor-pointer"
        >
          Quitar bloqueo y entrar a la app
        </button>
      </div>
    </div>
  );
}
