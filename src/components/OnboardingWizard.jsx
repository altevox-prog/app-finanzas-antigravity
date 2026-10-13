import React, { useState, useEffect, useRef } from 'react';
import { formatCurrencyInput, parseFormattedAmount, setEnableDecimals } from '../utils/currencyFormatter';
import { setHasCompletedOnboarding } from '../utils/userProfileHelper';
import AuthModal from './AuthModal';
import WizardStepPreferences from './onboarding/wizard/WizardStepPreferences';
import WizardStepAccounts from './onboarding/wizard/WizardStepAccounts';

export default function OnboardingWizard({ onComplete, onRestoreBackup }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  // Paso actual del Wizard (1: Preferencias y Seguridad, 2: Cuentas Iniciales)
  const [step, setStep] = useState(1);

  // Nombre de usuario
  const [displayName, setDisplayName] = useState(() => {
    try {
      return localStorage.getItem('user_profile_name') || localStorage.getItem('user_name') || '';
    } catch {
      return '';
    }
  });

  // Preferencias y Seguridad
  const [enableBiometrics, setEnableBiometrics] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState('');
  const [pin, setPin] = useState('');
  const [allowDecimals, setAllowDecimals] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('COP');

  // Cuentas Iniciales (Por defecto empezar de cero estrictamente en blanco [])
  const [startFromScratch, setStartFromScratch] = useState(true);
  const [cashAmount, setCashAmount] = useState('0');
  const [bankAmount, setBankAmount] = useState('0');

  // Input file oculto para restauración de backup JSON
  const fileInputRef = useRef(null);
  const [restoreError, setRestoreError] = useState('');

  // Detectar soporte para biometría en el dispositivo
  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        if (typeof window !== 'undefined' && window.PublicKeyCredential) {
          const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.();
          setIsBiometricSupported(Boolean(available));
        }
      } catch {
        setIsBiometricSupported(false);
      }
    };
    checkBiometrics();
  }, []);

  // Ajustar montos por defecto cuando cambia la moneda
  const handleCurrencyChange = (curr) => {
    setSelectedCurrency(curr);
    if (!startFromScratch) {
      if (curr === 'USD') {
        setCashAmount(formatCurrencyInput(50, allowDecimals));
        setBankAmount(formatCurrencyInput(500, allowDecimals));
      } else {
        setCashAmount(formatCurrencyInput(200000, allowDecimals));
        setBankAmount(formatCurrencyInput(1500000, allowDecimals));
      }
    }
  };

  // Activar / desactivar biometría en el dispositivo
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

    const effectiveName = displayName.trim() || 'Usuario';
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
            rp: { name: 'Monety Finanzas' },
            user: {
              id: userId,
              name: effectiveName,
              displayName: effectiveName
            },
            pubKeyCredParams: [
              { type: 'public-key', alg: -7 },
              { type: 'public-key', alg: -257 }
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required'
            },
            timeout: 60000
          }
        });

        if (credential) {
          setEnableBiometrics(true);
          setBiometricMessage('✓ Biometría configurada correctamente');
          try {
            localStorage.setItem('security_biometric_cred_id', credential.id);
            localStorage.setItem('security_biometric_enabled', 'true');
          } catch {}
        }
      } else {
        setBiometricMessage('Biometría no disponible en este dispositivo');
      }
    } catch (err) {
      console.warn('Error configurando biometría:', err);
      setBiometricMessage('No se pudo verificar la biometría');
    } finally {
      setBiometricLoading(false);
    }
  };

  // Presets de saldo
  const handleStartFromScratch = () => {
    setStartFromScratch(true);
    setCashAmount('0');
    setBankAmount('0');
  };

  const handleSetDefaultBalances = () => {
    setStartFromScratch(false);
    if (selectedCurrency === 'USD') {
      setCashAmount(formatCurrencyInput(50, allowDecimals));
      setBankAmount(formatCurrencyInput(500, allowDecimals));
    } else {
      setCashAmount(formatCurrencyInput(200000, allowDecimals));
      setBankAmount(formatCurrencyInput(1500000, allowDecimals));
    }
  };

  // Finalizar Onboarding y Guardar Todo en localStorage
  const handleFinishWizard = () => {
    const rawFullName = displayName.trim() || 'Usuario';
    const cleanName = String(rawFullName).trim();
    const finalName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    // 1. Cuentas iniciales normalizadas
    let initialAccounts = [];
    if (!startFromScratch) {
      const parsedCash = Math.max(0, parseFormattedAmount(cashAmount));
      const parsedBank = Math.max(0, parseFormattedAmount(bankAmount));
      const genUUID = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (`${Date.now()}-${Math.random().toString(36).slice(2)}`));
      if (parsedCash > 0) {
        initialAccounts.push({
          id: genUUID(),
          name: 'Efectivo',
          type: 'cash',
          currency: selectedCurrency,
          initialBalance: parsedCash,
          balance: parsedCash,
          currentBalance: parsedCash,
          color: '#34C759',
          icon: 'Wallet'
        });
      }
      if (parsedBank > 0) {
        initialAccounts.push({
          id: genUUID(),
          name: 'Cuenta Bancaria',
          type: 'bank',
          currency: selectedCurrency,
          initialBalance: parsedBank,
          balance: parsedBank,
          currentBalance: parsedBank,
          color: '#007AFF',
          icon: 'Building2'
        });
      }
    }

    // 2. Perfil de usuario
    const initials = finalName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || finalName.slice(0, 2).toUpperCase();

    const userProfile = {
      name: finalName,
      photo: null,
      initials
    };

    // 3. Ajustes de seguridad: estricto sin PIN por defecto
    const cleanPin = (pin || '').replace(/\D/g, '').slice(0, 6);
    const hasPin = cleanPin.length >= 4;
    const securitySettings = {
      pinEnabled: hasPin,
      pin: hasPin ? cleanPin : '',
      biometricsEnabled: Boolean(enableBiometrics)
    };

    // 4. Guardar preferencias numéricas, de moneda y tutorial
    setEnableDecimals(allowDecimals);
    try {
      localStorage.setItem('app_default_currency', selectedCurrency);
      localStorage.setItem('app_enable_decimals', String(allowDecimals));
      localStorage.setItem('presu_profile_v1', JSON.stringify(userProfile));
      localStorage.setItem('user_profile_name', finalName);
      localStorage.setItem('user_name', finalName);
      localStorage.setItem('profile', JSON.stringify(userProfile));
      localStorage.setItem('security_pin_enabled', hasPin ? 'true' : 'false');
      localStorage.setItem('security_pin_code', hasPin ? cleanPin : '');
      localStorage.setItem('security_biometric_enabled', enableBiometrics ? 'true' : 'false');
      localStorage.setItem('presu_security_v1', JSON.stringify(securitySettings));
      localStorage.setItem('presu_app_locked', 'false');
      localStorage.setItem('presu_tutorial_completed', 'true');
      localStorage.setItem('has_completed_tutorial', 'true');
      localStorage.setItem('tutorial_completed', 'true');
    } catch {}

    // 5. Marcar explícitamente como completado en storage
    localStorage.setItem('has_completed_onboarding', 'true');
    localStorage.setItem('hasCompletedOnboarding', 'true');
    localStorage.setItem('app_onboarding_completed', 'true');
    setHasCompletedOnboarding(null, true);

    // 6. Notificar a App.jsx para cargar Dashboard
    onComplete({
      name: finalName,
      pin: securitySettings.pin,
      biometricsEnabled: securitySettings.biometricsEnabled,
      accounts: initialAccounts,
      userProfile,
      securitySettings,
      enableDecimals: allowDecimals,
      defaultCurrency: selectedCurrency,
      showTutorialAfter: false
    });
  };

  // Restaurar Backup desde archivo JSON
  const handleRestoreFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result;
        const parsed = JSON.parse(text);
        if (onRestoreBackup) {
          onRestoreBackup(parsed);
        }
      } catch (err) {
        setRestoreError('El archivo no contiene un JSON válido de respaldo.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 dark:bg-zinc-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Fondo con brillo difuminado */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md lg:max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-white/[0.08] my-auto">
        
        {/* Barra de progreso de 2 pasos */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Paso {step} de 2
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {step === 1 ? 'Preferencias y Seguridad' : 'Cuentas Iniciales'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${
              step >= 1 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'
            }`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${
              step >= 2 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'
            }`} />
          </div>
        </div>

        {/* ============================================================== */}
        {/* PASO 1: PREFERENCIAS Y SEGURIDAD                               */}
        {/* ============================================================== */}
        {step === 1 && (
          <WizardStepPreferences
            displayName={displayName}
            setDisplayName={setDisplayName}
            selectedCurrency={selectedCurrency}
            setSelectedCurrency={setSelectedCurrency}
            onCurrencyChange={handleCurrencyChange}
            allowDecimals={allowDecimals}
            setAllowDecimals={setAllowDecimals}
            pin={pin}
            setPin={setPin}
            enableBiometrics={enableBiometrics}
            setEnableBiometrics={setEnableBiometrics}
            isBiometricSupported={isBiometricSupported}
            biometricLoading={biometricLoading}
            biometricMessage={biometricMessage}
            onToggleBiometrics={handleToggleBiometrics}
            restoring={false}
            restoreError={restoreError}
            onRestoreBackup={() => fileInputRef.current?.click()}
            onNextStep={() => setStep(2)}
            onFinishWizard={handleFinishWizard}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />
        )}

        {/* Input oculto para restauración de copia de seguridad */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleRestoreFile}
        />

        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
          />
        )}

        {/* ============================================================== */}
        {/* PASO 2: CONFIGURAR CUENTAS INICIALES                           */}
        {/* ============================================================== */}
        {step === 2 && (
          <WizardStepAccounts
            selectedCurrency={selectedCurrency}
            allowDecimals={allowDecimals}
            startFromScratch={startFromScratch}
            setStartFromScratch={setStartFromScratch}
            cashAmount={cashAmount}
            setCashAmount={setCashAmount}
            bankAmount={bankAmount}
            setBankAmount={setBankAmount}
            onSetDefaultBalances={handleSetDefaultBalances}
            onStartFromScratch={handleStartFromScratch}
            onPrevStep={() => setStep(1)}
            onFinishWizard={handleFinishWizard}
          />
        )}

      </div>
    </div>
  );
}
