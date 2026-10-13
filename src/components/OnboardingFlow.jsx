import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';
import { useAuth } from '../context/AuthContext';
import { markUserTutorialCompleted } from '../utils/userProfileHelper';
import StepProfileSetup from './onboarding/StepProfileSetup';
import StepTutorial from './onboarding/StepTutorial';

export default function OnboardingFlow({ 
  onComplete, 
  onRestoreBackup,
  tutorialOnly = false, 
  onClose 
}) {
  const { user } = useAuth();
  useBackHandler(Boolean(tutorialOnly && onClose), onClose);

  // Fase del flujo: 1 = Perfil y Seguridad, 2 = Tutorial Rápido
  const [step, setStep] = useState(tutorialOnly ? 2 : 1);

  // Formulario Paso 1
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [step1Touched, setStep1Touched] = useState(false);

  // Estado para Restablecer con copia de seguridad
  const fileInputRef = useRef(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [enableBiometrics, setEnableBiometrics] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState('');

  // Verificar si el dispositivo soporta biometría / WebAuthn
  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        if (typeof window !== 'undefined' && window.PublicKeyCredential) {
          const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.();
          setIsBiometricSupported(Boolean(available));
        }
      } catch (e) {
        setIsBiometricSupported(false);
      }
    };
    checkBiometrics();
  }, []);

  // Ejecución inmediata de la solicitud biométrica al activar el toggle en el Paso 1
  const handleToggleBiometrics = async () => {
    if (enableBiometrics) {
      setEnableBiometrics(false);
      setBiometricMessage('');
      try {
        localStorage.removeItem('security_biometric_cred_id');
        localStorage.setItem('security_biometric_enabled', 'false');
      } catch {}
      return;
    }

    const currentName = name.trim() || 'Usuario';
    setBiometricLoading(true);
    setBiometricMessage('');

    try {
      if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: 'Monety', id: window.location.hostname },
            user: { id: userId, name: currentName, displayName: currentName },
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
          localStorage.setItem('security_biometric_enabled', 'true');
          setEnableBiometrics(true);
          setBiometricMessage('✓ Acceso biométrico configurado con éxito');
        } else {
          setEnableBiometrics(true);
        }
      } else {
        setEnableBiometrics(true);
      }
    } catch (err) {
      console.warn('Error al activar biometría:', err);
      setEnableBiometrics(false);
      if (err.name === 'NotAllowedError') {
        setBiometricMessage('Acceso cancelado por el usuario o no autorizado.');
      } else {
        setBiometricMessage('No se pudo activar la biometría en este dispositivo.');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  // Validación Paso 1
  const isNameValid = name.trim().length >= 2;
  const isPinLengthValid = pin.length >= 4 && pin.length <= 6;
  const isPinMatching = isPinLengthValid && pin === confirmPin;
  const isStep1Valid = isNameValid && isPinMatching;

  const handlePinChange = (e) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(cleaned);
  };

  const handleConfirmPinChange = (e) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
    setConfirmPin(cleaned);
  };

  const handleStep1Submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setStep1Touched(true);
    if (!isStep1Valid) return;
    setStep(2);
  };

  const handleNextStep = handleStep1Submit;
  const isFormValid = isStep1Valid;

  const handleFinish = async () => {
    try {
      localStorage.setItem('presu_tutorial_completed', 'true');
      localStorage.setItem('has_completed_tutorial', 'true');
      localStorage.setItem('tutorial_completed', 'true');
      if (user?.id) {
        localStorage.setItem(`presu_tutorial_completed_${user.id}`, 'true');
        localStorage.setItem(`has_completed_tutorial_${user.id}`, 'true');
        markUserTutorialCompleted(user.id);
      } else {
        localStorage.setItem('app_onboarding_completed', 'true');
      }
    } catch (e) {
      console.warn('Error al guardar finalización de tutorial:', e);
    }

    if (tutorialOnly) {
      onClose?.();
      return;
    }

    onComplete?.({
      name: name.trim(),
      pin,
      biometricsEnabled: enableBiometrics
    });
  };

  // Restauración de copia de seguridad desde archivo JSON unificada con el perfil
  const handleRestoreBackupFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    setRestoreError('');

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (!text || typeof text !== 'string') {
          throw new Error('No se pudo leer el contenido del archivo.');
        }

        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error('El archivo seleccionado no es un formato JSON válido.');
        }

        // 1. Validar que tenga estructura válida de Monety
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('El archivo seleccionado no es válido.');
        }

        // El archivo puede tener la estructura { version, data: { ... } } (exportado oficial) o directa { accounts, transactions, ... }
        const data = (parsed.data && typeof parsed.data === 'object') ? { ...parsed, ...parsed.data } : parsed;

        const hasValidData = Boolean(
          data.accounts ||
          data.transactions ||
          data.debts ||
          data.debtsAndLoans ||
          data.categories ||
          data.investments ||
          data.user ||
          data.profile ||
          data.userProfile ||
          data.savings ||
          data.goals ||
          data.savingsGoals ||
          data.budgets ||
          data.subscriptions ||
          data.settings
        );

        if (!hasValidData) {
          throw new Error('El archivo no contiene una copia de seguridad compatible con Monety (faltan datos principales de cuentas, transacciones o deudas).');
        }

        // 2. Sobrescribir exhaustivamente todas las colecciones en localStorage bajo las mismas claves exactas del perfil

        // Cuentas (se guardan todas las claves para evitar colisiones con datos precargados)
        const accounts = data.accounts || data.user_accounts;
        if (accounts !== undefined) {
          const str = JSON.stringify(accounts);
          localStorage.setItem('finanzas_accounts_v3', str);
          localStorage.setItem('user_accounts', str);
          localStorage.setItem('accounts', str);
        }

        // Transacciones
        const transactions = data.transactions;
        if (transactions !== undefined) {
          const str = JSON.stringify(transactions);
          localStorage.setItem('finanzas_transactions_v3', str);
          localStorage.setItem('transactions', str);
        }

        // Deudas y Préstamos
        const debts = data.debtsAndLoans || data.debts || data.user_debts;
        if (debts !== undefined) {
          const str = JSON.stringify(debts);
          localStorage.setItem('finanzas_debts_v3', str);
          localStorage.setItem('user_debts', str);
          localStorage.setItem('debts', str);
        }

        // Categorías
        const categories = data.categories;
        if (categories !== undefined) {
          const str = JSON.stringify(categories);
          localStorage.setItem('finanzas_categories_v3', str);
          localStorage.setItem('categories', str);
        }

        // Inversiones
        const investments = data.investments || data.user_investments;
        if (investments !== undefined) {
          const str = JSON.stringify(investments);
          localStorage.setItem('user_investments', str);
          localStorage.setItem('investments', str);
          localStorage.setItem('investments_initialized', 'true');
        }

        // Presupuestos
        const budgets = data.budgets;
        if (budgets !== undefined) {
          const str = JSON.stringify(budgets);
          localStorage.setItem('presu_budgets_v1', str);
          localStorage.setItem('budgets', str);
        }

        // Metas de Ahorro
        const savings = data.savingsGoals || data.savings || data.goals;
        if (savings !== undefined) {
          const str = JSON.stringify(savings);
          localStorage.setItem('presu_savings_goals_v1', str);
          localStorage.setItem('savingsGoals', str);
          localStorage.setItem('savings', str);
          localStorage.setItem('goals', str);
        }

        // Suscripciones
        const subscriptions = data.subscriptions;
        if (subscriptions !== undefined) {
          const str = JSON.stringify(subscriptions);
          localStorage.setItem('presu_subscriptions_v1', str);
          localStorage.setItem('subscriptions', str);
        }

        // Perfil de Usuario
        const rawUser = data.userProfile || data.user || data.profile;
        const uName = data.userName || data.user_name || (typeof rawUser === 'string' ? rawUser : rawUser?.name);
        if (rawUser !== undefined || uName) {
          const profileObj = (typeof rawUser === 'object' && rawUser !== null) ? {
            name: rawUser.name || uName || 'Usuario',
            photo: rawUser.photo || null,
            initials: rawUser.initials || (rawUser.name || uName || 'US').slice(0, 2).toUpperCase()
          } : {
            name: uName || 'Usuario',
            photo: null,
            initials: (uName || 'US').slice(0, 2).toUpperCase()
          };
          const str = JSON.stringify(profileObj);
          localStorage.setItem('presu_profile_v1', str);
          localStorage.setItem('user_profile_name', profileObj.name);
          localStorage.setItem('user_name', profileObj.name);
          localStorage.setItem('user', str);
          localStorage.setItem('profile', str);
        }
        if (data.userName) localStorage.setItem('user_name', String(data.userName));
        if (data.user_name) localStorage.setItem('user_name', String(data.user_name));

        // Seguridad y PIN (preservar credenciales si vienen en el respaldo)
        const rawSec = data.securitySettings || data.security || data.settings?.security;
        const pinVal = data.pin || data.user_pin || rawSec?.pin || '';
        if (rawSec !== undefined || pinVal) {
          const pinEnabled = rawSec?.pinEnabled !== undefined ? Boolean(rawSec.pinEnabled) : Boolean(pinVal);
          const biometricsEnabled = Boolean(rawSec?.biometricsEnabled);
          const secObj = {
            pinEnabled,
            pin: String(pinVal || ''),
            biometricsEnabled
          };
          const str = JSON.stringify(secObj);
          localStorage.setItem('presu_security_v1', str);
          localStorage.setItem('security_pin_enabled', pinEnabled ? 'true' : 'false');
          localStorage.setItem('security_pin_code', String(pinVal || ''));
          localStorage.setItem('security_biometric_enabled', biometricsEnabled ? 'true' : 'false');
          if (pinVal) {
            localStorage.setItem('user_pin', String(pinVal));
            localStorage.setItem('pin', String(pinVal));
          }
        }

        // TRM, Tema, Widgets y Ajustes Generales
        if (data.trm !== undefined) {
          localStorage.setItem('presu_investment_trm', String(data.trm || 4000));
        }
        const themeVal = data.theme || data.settings?.theme;
        if (themeVal) {
          localStorage.setItem('presu_theme', themeVal);
          localStorage.setItem('app_theme', themeVal);
        }
        const widgets = data.dashboardWidgets || data.widgets;
        if (widgets !== undefined) {
          localStorage.setItem('presu_dashboard_widgets_v1', JSON.stringify(widgets));
        }
        if (data.settings !== undefined && typeof data.settings === 'object') {
          localStorage.setItem('settings', JSON.stringify(data.settings));
        }

        // 3. Marcar el onboarding como completado y app desbloqueada
        localStorage.setItem('app_onboarding_completed', 'true');
        localStorage.setItem('hasCompletedOnboarding', 'true');
        localStorage.setItem('app_is_locked', 'false');

        // Sincronizar en memoria si existe el callback del contexto padre
        if (typeof onRestoreBackup === 'function') {
          try {
            onRestoreBackup({ version: '1.0', data });
          } catch (callErr) {
            console.warn('onRestoreBackup error:', callErr);
          }
        }

        // 4. Recarga dura para que todos los contextos y estados de React inicien limpios con la nueva data
        window.location.href = '/';
      } catch (err) {
        console.error('Error al restaurar respaldo:', err);
        const msg = err.message || 'Hubo un error al leer la copia de seguridad. Asegúrate de que sea un archivo .json válido.';
        setRestoreError(msg);
        setRestoring(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      setRestoreError('Error al leer el archivo desde el dispositivo.');
      setRestoring(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className={`${tutorialOnly ? 'fixed inset-0 z-[100] bg-black/60 backdrop-blur-md' : 'min-h-screen bg-slate-50 dark:bg-[#0A0C10]'} flex flex-col items-center justify-center p-4 py-10 overflow-y-auto animate-fadeIn`}>
      <div className="w-full max-w-md bg-white dark:bg-[#12141C] border border-slate-200/70 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl relative transition-all my-auto">
        
        {/* Input oculto para restaurar copia de seguridad */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleRestoreBackupFile}
          className="hidden"
        />
        
        {/* Halo decorativo de fondo */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-20 dark:opacity-30 bg-emerald-500" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-20 dark:opacity-25 bg-blue-500" />

        {/* Botón cerrar si es sólo tutorial */}
        {tutorialOnly && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-20 cursor-pointer"
            title="Cerrar tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* FASE 1: PERFIL Y SEGURIDAD */}
        {step === 1 && !tutorialOnly && (
          <StepProfileSetup
            name={name}
            setName={setName}
            pin={pin}
            setPin={setPin}
            confirmPin={confirmPin}
            setConfirmPin={setConfirmPin}
            showPin={showPin}
            setShowPin={setShowPin}
            step1Touched={step1Touched}
            enableBiometrics={enableBiometrics}
            setEnableBiometrics={setEnableBiometrics}
            isBiometricSupported={isBiometricSupported}
            biometricLoading={biometricLoading}
            biometricMessage={biometricMessage}
            onToggleBiometrics={handleToggleBiometrics}
            restoring={restoring}
            restoreError={restoreError}
            onRestoreBackup={() => {
              setRestoreError('');
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
              }
            }}
            onNextStep={handleNextStep}
          />
        )}

        {/* FASE 2: TUTORIAL RÁPIDO (MINI CARRUSEL) */}
        {step === 2 && (
          <StepTutorial
            tutorialOnly={tutorialOnly}
            onBack={() => setStep(1)}
            onFinish={handleFinish}
          />
        )}

      </div>
    </div>
  );
}
