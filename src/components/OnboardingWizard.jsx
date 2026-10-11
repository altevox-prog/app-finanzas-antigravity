import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  User, 
  Lock, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  ShieldCheck, 
  Fingerprint, 
  DollarSign, 
  Wallet, 
  Building2, 
  Upload, 
  Coins,
  Percent,
  Mail
} from 'lucide-react';
import { formatCurrencyInput, parseFormattedAmount, setEnableDecimals } from '../utils/currencyFormatter';
import AppLogo from './AppLogo';
import { setHasCompletedOnboarding } from '../utils/userProfileHelper';
import { signInWithGoogle } from '../services/supabaseClient';
import AuthModal from './AuthModal';

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
    <div className="min-h-[100dvh] w-full bg-slate-900/40 dark:bg-zinc-950 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Fondo con brillo difuminado */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-white/[0.08] my-auto">
        
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
          <div className="space-y-5 animate-fadeIn">
            {/* Identidad Visual Oficial: AppLogo centralizado */}
            <div className="flex flex-col items-center justify-center text-center mb-2">
              <div className="mb-3 flex items-center justify-center">
                <AppLogo size="xl" showText={false} iconClassName="shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-500/20" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Bienvenido a Monety
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                Tus finanzas personales 100% privadas y en tu dispositivo
              </p>
            </div>

            {/* Opción Prominente de Acceso con Google */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
              <div className="text-center">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  ¿Ya tienes una cuenta o deseas sincronizar en la nube?
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Conéctate para respaldar tus movimientos en Supabase
                </p>
              </div>

              {/* Botón Oficial Google */}
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="w-full py-2.5 px-4 font-medium flex items-center justify-center gap-3 rounded-xl bg-white text-gray-800 hover:bg-gray-100 dark:bg-slate-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continuar con Google</span>
              </button>

              {/* Botón Acceso con Correo y Contraseña */}
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="w-full py-2.5 px-4 font-medium flex items-center justify-center gap-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition-all active:scale-[0.98] cursor-pointer text-xs font-semibold"
              >
                <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Ingresar o Registrarse con Correo</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-400">o continuar en modo local privado</span>
                <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
              </div>
            </div>

            {showAuthModal && (
              <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
              />
            )}

            <div className="space-y-3.5">
              {/* Nombre de Usuario */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Tu Nombre o Apodo
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Recomendado</span>
                </div>
                <input
                  type="text"
                  placeholder="Ej. Alex"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Selector de Moneda Principal */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Moneda Principal
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('COP')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      selectedCurrency === 'COP'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>COP ($)</span>
                    {selectedCurrency === 'COP' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('USD')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      selectedCurrency === 'USD'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>USD ($)</span>
                    {selectedCurrency === 'USD' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* PIN de Seguridad */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      PIN de Seguridad Rápido
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Opcional (4 dígitos)</span>
                </div>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="Dejar vacío si no deseas PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs font-mono text-center tracking-widest text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              {/* Biometría (si soportada) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Acceso Rápido con Biometría
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Usa Face ID, Touch ID o huella de tu dispositivo al abrir la aplicación.
                  </p>
                  {biometricMessage && (
                    <p className={`text-[10px] font-semibold mt-1 ${
                      biometricMessage.startsWith('✓') ? 'text-emerald-500' : 'text-amber-500'
                    }`}>
                      {biometricMessage}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleToggleBiometrics}
                  disabled={biometricLoading}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    enableBiometrics ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/20'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md absolute top-1 transition-transform ${
                    enableBiometrics ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Permitir 2 decimales en montos */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Permitir 2 Decimales en Montos
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Habilita centavos (ej. $ 1.250,50), ideal para USD o precisión estricta.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAllowDecimals(!allowDecimals)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    allowDecimals ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/20'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md absolute top-1 transition-transform ${
                    allowDecimals ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Botones de Navegación */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleFinishWizard}
                className="py-3 px-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Empezar ya</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-98"
              >
                <span>Configurar Cuentas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Restaurar Backup */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1.5 cursor-pointer py-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Restaurar desde archivo de copia de seguridad (.json)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleRestoreFile}
              />
              {restoreError && (
                <p className="text-[11px] text-rose-500 text-center font-medium mt-1">
                  {restoreError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PASO 2: CONFIGURAR CUENTAS INICIALES                           */}
        {/* ============================================================== */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-sm">
                <Coins className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Tus Cuentas Iniciales
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                ¿Con cuánto saldo disponible comienzas hoy?
              </p>
            </div>

            {/* Atajos de montos rápidos */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleSetDefaultBalances}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  !startFromScratch
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                    : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300'
                }`}
              >
                Montos sugeridos
              </button>
              <button
                type="button"
                onClick={handleStartFromScratch}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  startFromScratch
                    ? 'bg-emerald-500 text-white font-extrabold shadow-sm'
                    : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300'
                }`}
              >
                Empezar de cero
              </button>
            </div>

            {startFromScratch ? (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2 animate-fadeIn">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Módulo de cuentas en blanco
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Comenzarás sin cuentas registradas. Podrás crear tus cuentas personalizadas cuando desees desde el módulo de cuentas.
                </p>
              </div>
            ) : (
              <>
                {/* Tarjeta de Cuenta 1: Efectivo */}
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Efectivo
                        </span>
                        <p className="text-[10px] text-slate-400">Billetera o dinero físico</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedCurrency}
                    </span>
                  </div>

                  <div className="relative pt-1">
                    <span className="absolute left-3.5 top-3.5 text-xs font-bold text-slate-400">
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={cashAmount}
                      onChange={(e) => {
                        setStartFromScratch(false);
                        setCashAmount(formatCurrencyInput(e.target.value, allowDecimals));
                      }}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Tarjeta de Cuenta 2: Cuenta Bancaria */}
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Cuenta Bancaria
                        </span>
                        <p className="text-[10px] text-slate-400">Ahorros, nómina o corriente</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      {selectedCurrency}
                    </span>
                  </div>

                  <div className="relative pt-1">
                    <span className="absolute left-3.5 top-3.5 text-xs font-bold text-slate-400">
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={bankAmount}
                      onChange={(e) => {
                        setStartFromScratch(false);
                        setBankAmount(formatCurrencyInput(e.target.value, allowDecimals));
                      }}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Botones de Finalización */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>

              <button
                type="button"
                onClick={handleFinishWizard}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-98"
              >
                <span>¡Comenzar a Gestionar mis Finanzas!</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
