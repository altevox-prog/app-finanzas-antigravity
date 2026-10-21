import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { useAuth } from '../../context/AuthContext';
import { markUserTutorialCompleted } from '../../utils/userProfileHelper';
import StepProfileSetup from './StepProfileSetup';
import StepTutorial from './StepTutorial';

const setStorageItems = (keys, val) => {
  if (val !== undefined) keys.forEach((k) => localStorage.setItem(k, typeof val === 'string' ? val : JSON.stringify(val)));
};

export default function OnboardingFlow({ onComplete, onRestoreBackup, tutorialOnly = false, onClose }) {
  const { user } = useAuth();
  useBackHandler(Boolean(tutorialOnly && onClose), onClose);

  const [step, setStep] = useState(tutorialOnly ? 2 : 1);
  const [name, setName] = useState(''), [pin, setPin] = useState(''), [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false), [step1Touched, setStep1Touched] = useState(false);
  const fileInputRef = useRef(null);
  const [restoring, setRestoring] = useState(false), [restoreError, setRestoreError] = useState('');
  const [enableBiometrics, setEnableBiometrics] = useState(false), [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false), [biometricMessage, setBiometricMessage] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()
        .then((avail) => setIsBiometricSupported(Boolean(avail))).catch(() => setIsBiometricSupported(false));
    }
  }, []);

  const handleToggleBiometrics = async () => {
    if (enableBiometrics) {
      setEnableBiometrics(false); setBiometricMessage('');
      try { localStorage.removeItem('security_biometric_cred_id'); localStorage.setItem('security_biometric_enabled', 'false'); } catch {}
      return;
    }
    const currentName = name.trim() || 'Usuario';
    setBiometricLoading(true); setBiometricMessage('');
    try {
      if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials) {
        const challenge = new Uint8Array(32), userId = new Uint8Array(16);
        window.crypto.getRandomValues(challenge); window.crypto.getRandomValues(userId);
        const cred = await navigator.credentials.create({
          publicKey: { challenge, rp: { name: 'Monety', id: window.location.hostname }, user: { id: userId, name: currentName, displayName: currentName }, pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }, timeout: 60000 }
        });
        if (cred) localStorage.setItem('security_biometric_cred_id', JSON.stringify(Array.from(new Uint8Array(cred.rawId))));
      }
      localStorage.setItem('security_biometric_enabled', 'true');
      setEnableBiometrics(true);
      setBiometricMessage('✓ Acceso biométrico configurado con éxito');
    } catch (err) {
      setEnableBiometrics(false);
      setBiometricMessage(err.name === 'NotAllowedError' ? 'Acceso cancelado por el usuario o no autorizado.' : 'No se pudo activar la biometría en este dispositivo.');
    } finally { setBiometricLoading(false); }
  };

  const isStep1Valid = name.trim().length >= 2 && pin.length >= 4 && pin.length <= 6 && pin === confirmPin;
  const handleStep1Submit = (e) => { e?.preventDefault?.(); setStep1Touched(true); if (isStep1Valid) setStep(2); };
  const sanitizePin = (v) => (typeof v === 'string' ? v : v?.target?.value || '').replace(/\D/g, '').slice(0, 6);
  const handleTriggerRestore = () => { setRestoreError(''); if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); } };

  const handleFinish = () => {
    try {
      ['presu_tutorial_completed', 'has_completed_tutorial', 'tutorial_completed'].forEach((k) => localStorage.setItem(k, 'true'));
      if (user?.id) {
        localStorage.setItem(`presu_tutorial_completed_${user.id}`, 'true');
        localStorage.setItem(`has_completed_tutorial_${user.id}`, 'true');
        markUserTutorialCompleted(user.id);
      } else { localStorage.setItem('app_onboarding_completed', 'true'); }
    } catch (e) { console.warn('Error al guardar finalización:', e); }
    if (tutorialOnly) return onClose?.();
    onComplete?.({ name: name.trim(), pin, biometricsEnabled: enableBiometrics });
  };

  const handleRestoreBackupFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setRestoring(true); setRestoreError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (!text || typeof text !== 'string') throw new Error('No se pudo leer el archivo.');
        const parsed = JSON.parse(text), data = parsed.data && typeof parsed.data === 'object' ? { ...parsed, ...parsed.data } : parsed;
        const map = { accounts: ['finanzas_accounts_v3', 'user_accounts', 'accounts'], transactions: ['finanzas_transactions_v3', 'transactions'], categories: ['finanzas_categories_v3', 'categories'], budgets: ['presu_budgets_v1', 'budgets'], subscriptions: ['presu_subscriptions_v1', 'subscriptions'] };
        Object.entries(map).forEach(([k, keys]) => { if (data[k]) setStorageItems(keys, data[k]); });
        setStorageItems(['finanzas_debts_v3', 'user_debts', 'debts'], data.debtsAndLoans || data.debts || data.user_debts);
        setStorageItems(['presu_savings_goals_v1', 'savingsGoals', 'savings', 'goals'], data.savingsGoals || data.savings || data.goals);
        if (data.investments || data.user_investments) { setStorageItems(['user_investments', 'investments'], data.investments || data.user_investments); localStorage.setItem('investments_initialized', 'true'); }
        const rawUser = data.userProfile || data.user || data.profile, uName = data.userName || data.user_name || (typeof rawUser === 'string' ? rawUser : rawUser?.name);
        if (rawUser !== undefined || uName) {
          const profile = { name: (typeof rawUser === 'object' && rawUser?.name) || uName || 'Usuario', photo: rawUser?.photo || null, initials: ((rawUser?.initials) || (uName || 'US')).slice(0, 2).toUpperCase() };
          setStorageItems(['presu_profile_v1', 'user', 'profile'], profile); setStorageItems(['user_profile_name', 'user_name'], profile.name);
        }
        const rawSec = data.securitySettings || data.security || data.settings?.security, pinVal = data.pin || data.user_pin || rawSec?.pin || '';
        if (rawSec !== undefined || pinVal) {
          const pinEnabled = rawSec?.pinEnabled !== undefined ? Boolean(rawSec.pinEnabled) : Boolean(pinVal), biometricsEnabled = Boolean(rawSec?.biometricsEnabled);
          setStorageItems(['presu_security_v1'], { pinEnabled, pin: String(pinVal || ''), biometricsEnabled });
          localStorage.setItem('security_pin_enabled', pinEnabled ? 'true' : 'false'); localStorage.setItem('security_pin_code', String(pinVal || ''));
          localStorage.setItem('security_biometric_enabled', biometricsEnabled ? 'true' : 'false');
          if (pinVal) setStorageItems(['user_pin', 'pin'], String(pinVal));
        }
        if (data.trm !== undefined) localStorage.setItem('presu_investment_trm', String(data.trm || 4000));
        if (data.theme || data.settings?.theme) setStorageItems(['presu_theme', 'app_theme'], data.theme || data.settings?.theme);
        if (data.dashboardWidgets || data.widgets) localStorage.setItem('presu_dashboard_widgets_v1', JSON.stringify(data.dashboardWidgets || data.widgets));
        if (data.settings && typeof data.settings === 'object') localStorage.setItem('settings', JSON.stringify(data.settings));
        ['app_onboarding_completed', 'hasCompletedOnboarding'].forEach((k) => localStorage.setItem(k, 'true'));
        localStorage.setItem('app_is_locked', 'false');
        onRestoreBackup?.({ version: '1.0', data });
        window.location.href = '/';
      } catch (err) { setRestoreError(err.message || 'Error al leer copia de seguridad.'); setRestoring(false); }
    };
    reader.onerror = () => { setRestoreError('Error al leer el archivo.'); setRestoring(false); };
    reader.readAsText(file);
  };

  const stepComponents = {
    1: !tutorialOnly && (
      <StepProfileSetup
        name={name} setName={setName} pin={pin} setPin={(v) => setPin(sanitizePin(v))}
        confirmPin={confirmPin} setConfirmPin={(v) => setConfirmPin(sanitizePin(v))}
        showPin={showPin} setShowPin={setShowPin} step1Touched={step1Touched}
        enableBiometrics={enableBiometrics} setEnableBiometrics={setEnableBiometrics}
        isBiometricSupported={isBiometricSupported} biometricLoading={biometricLoading}
        biometricMessage={biometricMessage} onToggleBiometrics={handleToggleBiometrics}
        restoring={restoring} restoreError={restoreError} onRestoreBackup={handleTriggerRestore} onNextStep={handleStep1Submit}
      />
    ),
    2: <StepTutorial tutorialOnly={tutorialOnly} onBack={() => setStep(1)} onFinish={handleFinish} />
  };

  return (
    <div className={`${tutorialOnly ? 'fixed inset-0 z-[100] bg-black/60 backdrop-blur-md' : 'min-h-screen bg-slate-50 dark:bg-[#0A0C10]'} flex flex-col items-center justify-center p-4 py-10 overflow-y-auto animate-fadeIn`}>
      <div className="w-full max-w-md bg-white dark:bg-[#12141C] border border-slate-200/70 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl relative transition-all my-auto">
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleRestoreBackupFile} className="hidden" />
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-20 dark:opacity-30 bg-emerald-500" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-20 dark:opacity-25 bg-blue-500" />
        {tutorialOnly && (
          <button type="button" onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-20 cursor-pointer" title="Cerrar tutorial">
            <X className="w-5 h-5" />
          </button>
        )}
        {stepComponents[step] || null}
      </div>
    </div>
  );
}
