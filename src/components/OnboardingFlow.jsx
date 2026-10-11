import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  CreditCard, 
  Zap, 
  Bell, 
  Fingerprint, 
  X,
  Coins,
  FileJson,
  Upload,
  AlertCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';
import { useAuth } from '../context/AuthContext';
import { markUserTutorialCompleted } from '../utils/userProfileHelper';
import AppLogo from './AppLogo';

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

  // Carrusel Paso 2
  const [activeSlide, setActiveSlide] = useState(0);
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

  // Diapositivas del tutorial
  const slides = [
    {
      id: 'accounts',
      title: 'Centraliza tus Cuentas',
      description: 'Registra tu efectivo, cuentas de ahorros y tarjetas de crédito con fechas de corte y cupos en tiempo real.',
      icon: CreditCard,
      iconGradient: 'from-blue-600 to-indigo-500 shadow-blue-500/25',
      tags: ['Bancos y Billeteras', 'Tarjetas de Crédito', 'Saldos en Vivo']
    },
    {
      id: 'transactions',
      title: 'Registros en Segundos',
      description: 'Usa el botón central para registrar compras, ingresos o transferencias al instante con categorías claras.',
      icon: Zap,
      iconGradient: 'from-emerald-500 to-teal-400 shadow-emerald-500/25',
      tags: ['Botón Central +', 'Auto-categorías', 'Control Diario']
    },
    {
      id: 'subscriptions',
      title: 'Fechas de Corte y Presupuestos',
      description: 'Recibe avisos antes de que venzan tus tarjetas o suscripciones recurrentes para no pagar intereses.',
      icon: Bell,
      iconGradient: 'from-amber-500 to-rose-500 shadow-amber-500/25',
      tags: ['Alertas Preventivas', 'Suscripciones Fijas', 'Límites Mensuales']
    }
  ];

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
          <form onSubmit={handleStep1Submit} className="space-y-6">
            {/* Cabecera */}
            <div className="flex flex-col items-center text-center">
              {/* Contenedor del Logo con AppLogo */}
              <div className="mb-4 flex items-center justify-center">
                <AppLogo size="xl" showText={false} iconClassName="shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500/20" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                <span>PASO 1 DE 2</span>
                <span className="opacity-50">·</span>
                <span>Bienvenida</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Bienvenido a Monety, tu asistente financiero personal
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Configuremos tu acceso personal
              </p>
            </div>

              {/* Campos de Entrada */}
              <div className="space-y-4">
                {/* Campo Nombre */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ¿Cómo te llamas? *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Tu nombre"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white text-sm font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Campo PIN */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      PIN de seguridad (4 a 6 dígitos) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPin ? 'Ocultar' : 'Ver'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      placeholder="••••"
                      value={pin}
                      onChange={handlePinChange}
                      className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white text-sm font-bold tracking-widest placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Confirmar PIN */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirma tu PIN *
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      placeholder="••••"
                      value={confirmPin}
                      onChange={handleConfirmPinChange}
                      className={`w-full pl-10 pr-3.5 py-3 rounded-2xl border bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white text-sm font-bold tracking-widest placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                        confirmPin.length >= 4
                          ? isPinMatching
                            ? 'border-emerald-500 focus:ring-emerald-500'
                            : 'border-rose-500 focus:ring-rose-500'
                          : 'border-slate-200 dark:border-white/10 focus:ring-emerald-500'
                      }`}
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Indicador de coincidencia de PIN */}
                  <div className="mt-1.5 px-1 min-h-[18px]">
                    {pin.length > 0 && pin.length < 4 && (
                      <span className="text-[11px] font-medium text-amber-500 dark:text-amber-400">
                        El PIN debe tener al menos 4 números
                      </span>
                    )}
                    {pin.length >= 4 && confirmPin.length > 0 && !isPinMatching && (
                      <span className="text-[11px] font-medium text-rose-500 dark:text-rose-400">
                        Los PINs no coinciden
                      </span>
                    )}
                    {isPinMatching && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> PIN confirmado correctamente
                      </span>
                    )}
                  </div>
                </div>

                {/* Habilitar acceso con Face ID / Huella Dactilar inmediatamente debajo del PIN */}
                {isBiometricSupported && (
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          enableBiometrics
                            ? 'bg-purple-500 text-white shadow-sm'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        }`}>
                          <Fingerprint className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            Habilitar acceso con Face ID / Huella Dactilar
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            Accede rápidamente sin tener que digitar tu PIN
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleBiometrics}
                        disabled={biometricLoading}
                        className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 disabled:opacity-50 ${
                          enableBiometrics ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        title="Activar o desactivar biometría"
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                            enableBiometrics ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {biometricLoading && (
                      <p className="text-[11px] text-blue-500 font-medium mt-2 flex items-center gap-1.5 animate-pulse">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        Verificando sensor biométrico... Confirma en tu dispositivo.
                      </p>
                    )}

                    {biometricMessage && !biometricLoading && (
                      <p className={`text-[11px] font-medium mt-2 ${
                        enableBiometrics ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
                      }`}>
                        {biometricMessage}
                      </p>
                    )}
                  </div>
                )}

                {/* Moneda Principal Preseleccionada */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Moneda predeterminada
                  </label>
                  <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Coins className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        $ Peso colombiano (COP)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      Activa
                    </span>
                  </div>
                </div>
            </div>

            {/* Acción Principal (al final de los campos) */}
            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!isFormValid}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-2xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continuar al tutorial</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Separador O TAMBIÉN */}
              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-slate-200 dark:border-white/10 w-full"></div>
                <span className="bg-white dark:bg-[#12141C] px-3 text-[11px] font-bold text-slate-400 tracking-wider uppercase absolute">
                  O TAMBIÉN
                </span>
              </div>

              {/* Botón de Restaurar Copia */}
              <button
                type="button"
                onClick={() => {
                  setRestoreError('');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                    fileInputRef.current.click();
                  }
                }}
                disabled={restoring}
                className="w-full py-3 px-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {restoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Restaurando datos...</span>
                  </>
                ) : (
                  <>
                    <FileJson className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>¿Ya tienes una copia de seguridad? <strong className="underline text-emerald-600 dark:text-emerald-400">Restaurar datos</strong></span>
                  </>
                )}
              </button>

              {/* Mensaje de alerta si el archivo no es válido o está corrupto */}
              {restoreError && (
                <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span className="flex-1">{restoreError}</span>
                </div>
              )}
            </div>
          </form>
        )}

        {/* FASE 2: TUTORIAL RÁPIDO (MINI CARRUSEL) */}
        {step === 2 && (
          <div className="flex-1 flex flex-col justify-between relative z-10 space-y-6">
            {/* Cabecera del Tutorial con Volver (si no es tutorialOnly) */}
            <div className="flex items-center justify-between">
              {!tutorialOnly ? (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
              ) : (
                <div />
              )}

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#007AFF] text-[11px] font-bold uppercase tracking-wider">
                <span>Tutorial</span>
                <span className="opacity-50">·</span>
                <span>{activeSlide + 1} de {slides.length}</span>
              </div>

              <div className="w-10" />
            </div>

            {/* Contenido de la Diapositiva Activa */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-4">
              {(() => {
                const current = slides[activeSlide];
                const IconComponent = current.icon;

                return (
                  <div key={current.id} className="animate-fadeIn space-y-4 max-w-sm">
                    {/* Icono animado */}
                    <div className={`w-20 h-20 rounded-3xl bg-gradient-to-tr ${current.iconGradient} flex items-center justify-center text-white shadow-xl mx-auto transition-transform hover:scale-105 duration-300`}>
                      <IconComponent className="w-10 h-10" />
                    </div>

                    {/* Título y Descripción */}
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {current.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        {current.description}
                      </p>
                    </div>

                    {/* Píldoras / Tags de características */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                      {current.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Navegación y Acciones del Tutorial en flujo natural */}
            <div className="mt-8 space-y-4">
              {/* Indicadores de Puntos (Dots) */}
              <div className="flex items-center justify-center gap-2 mb-2">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      activeSlide === idx
                        ? 'w-7 bg-emerald-500'
                        : 'w-2 bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/40'
                    }`}
                    title={`Ir a diapositiva ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Botón Principal */}
              {activeSlide < slides.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveSlide(prev => Math.min(slides.length - 1, prev + 1))}
                  className="w-full py-3.5 px-4 bg-[#007AFF] hover:bg-blue-600 active:scale-95 text-white font-semibold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Siguiente</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 active:scale-95 text-white font-semibold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    Finalizar tutorial
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
