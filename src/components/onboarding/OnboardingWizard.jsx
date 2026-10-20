import React, { useState, useEffect, useRef } from 'react';
import { parseFormattedAmount, setEnableDecimals } from '../../utils/currencyFormatter';
import { setHasCompletedOnboarding } from '../../utils/userProfileHelper';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import AuthModal from '../auth/AuthModal';
import WizardStepPreferences from './wizard/WizardStepPreferences';
import WizardStepAccounts from './wizard/WizardStepAccounts';

export default function OnboardingWizard({ onComplete, onRestoreBackup }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(() => {
    try { return localStorage.getItem('user_profile_name') || localStorage.getItem('user_name') || ''; } catch { return ''; }
  });
  const [enableBiometrics, setEnableBiometrics] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState('');
  const [pin, setPin] = useState('');
  const [allowDecimals, setAllowDecimals] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('COP');
  const fileInputRef = useRef(null);
  const [restoreError, setRestoreError] = useState('');

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
    const name = displayName.trim() || 'Usuario';
    setBiometricLoading(true); setBiometricMessage('');
    try {
      if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials) {
        const challenge = new Uint8Array(32), userId = new Uint8Array(16);
        window.crypto.getRandomValues(challenge); window.crypto.getRandomValues(userId);
        const cred = await navigator.credentials.create({
          publicKey: {
            challenge, rp: { name: 'Monety Finanzas' }, user: { id: userId, name, displayName: name },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }, timeout: 60000
          }
        });
        if (cred) {
          setEnableBiometrics(true); setBiometricMessage('✓ Biometría configurada correctamente');
          localStorage.setItem('security_biometric_cred_id', cred.id);
          localStorage.setItem('security_biometric_enabled', 'true');
        }
      } else { setBiometricMessage('Biometría no disponible en este dispositivo'); }
    } catch {
      setBiometricMessage('No se pudo verificar la biometría');
    } finally { setBiometricLoading(false); }
  };

  const handleFinishWizard = async (firstAccountData = null) => {
    const raw = String(displayName.trim() || 'Usuario').trim();
    const finalName = raw.charAt(0).toUpperCase() + raw.slice(1);
    const initialAccounts = [];

    if (firstAccountData?.accountName?.trim()) {
      const bal = Math.max(0, parseFormattedAmount(firstAccountData.accountBalance || '0'));
      const genUUID = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const type = firstAccountData.accountType || 'bank';
      initialAccounts.push({
        id: genUUID(), name: firstAccountData.accountName.trim(), type, currency: selectedCurrency,
        initialBalance: bal, initial_balance: bal, balance: bal, currentBalance: bal, current_balance: bal,
        color: type === 'cash' ? '#10B981' : type === 'wallet' ? '#8B5CF6' : '#007AFF',
        icon: type === 'cash' ? 'Wallet' : type === 'wallet' ? 'Smartphone' : 'Building2',
        order_index: 0, updated_at: new Date().toISOString()
      });
    }

    const initials = finalName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || finalName.slice(0, 2).toUpperCase();
    const userProfile = { name: finalName, photo: null, initials };
    const cleanPin = (pin || '').replace(/\D/g, '').slice(0, 6);
    const hasPin = cleanPin.length >= 4;
    const securitySettings = { pinEnabled: hasPin, pin: hasPin ? cleanPin : '', biometricsEnabled: Boolean(enableBiometrics) };

    setEnableDecimals(allowDecimals);
    try {
      const stor = {
        app_default_currency: selectedCurrency, app_enable_decimals: String(allowDecimals),
        presu_profile_v1: JSON.stringify(userProfile), user_profile_name: finalName, user_name: finalName, profile: JSON.stringify(userProfile),
        security_pin_enabled: hasPin ? 'true' : 'false', security_pin_code: hasPin ? cleanPin : '',
        security_biometric_enabled: enableBiometrics ? 'true' : 'false', presu_security_v1: JSON.stringify(securitySettings),
        presu_app_locked: 'false', presu_tutorial_completed: 'true', has_completed_tutorial: 'true', tutorial_completed: 'true',
        has_completed_onboarding: 'true', hasCompletedOnboarding: 'true', app_onboarding_completed: 'true', [STORAGE_KEYS.ONBOARDING_COMPLETED]: 'true'
      };
      Object.entries(stor).forEach(([k, v]) => localStorage.setItem(k, v));
    } catch {}
    setHasCompletedOnboarding(null, true);

    try {
      if (isSupabaseConfigured && supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          localStorage.setItem(`has_completed_onboarding_${user.id}`, 'true');
          localStorage.setItem(`hasCompletedOnboarding_${user.id}`, 'true');
          setHasCompletedOnboarding(user.id, true);
          if (initialAccounts.length > 0) {
            await supabase.from('accounts').upsert(initialAccounts.map((acc) => ({
              id: acc.id, user_id: user.id, name: acc.name, type: acc.type, currency: acc.currency,
              balance: acc.balance, initial_balance: acc.initial_balance, icon: acc.icon, color: acc.color, order_index: 0, updated_at: acc.updated_at
            })), { onConflict: 'id' });
          }
          await supabase.from('profiles').upsert({ id: user.id, onboarding_completed: true, display_name: finalName, currency: selectedCurrency, updated_at: new Date().toISOString() }, { onConflict: 'id' }).catch(() => {});
        }
      }
    } catch (err) { console.warn('Supabase sync error:', err); }

    onComplete({
      name: finalName, pin: securitySettings.pin, biometricsEnabled: securitySettings.biometricsEnabled,
      accounts: initialAccounts, userProfile, securitySettings, enableDecimals: allowDecimals,
      defaultCurrency: selectedCurrency, showTutorialAfter: false
    });
  };

  const handleRestoreFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try { onRestoreBackup?.(JSON.parse(evt.target?.result)); } catch { setRestoreError('El archivo no contiene un JSON válido de respaldo.'); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 dark:bg-zinc-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md lg:max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-white/[0.08] my-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Paso {step} de 2</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{step === 1 ? 'Preferencias Iniciales' : 'Cuentas Iniciales'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'}`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'}`} />
          </div>
        </div>

        {step === 1 ? (
          <WizardStepPreferences
            displayName={displayName} setDisplayName={setDisplayName} selectedCurrency={selectedCurrency} setSelectedCurrency={setSelectedCurrency}
            onCurrencyChange={setSelectedCurrency} allowDecimals={allowDecimals} setAllowDecimals={setAllowDecimals} pin={pin} setPin={setPin}
            enableBiometrics={enableBiometrics} setEnableBiometrics={setEnableBiometrics} isBiometricSupported={isBiometricSupported}
            biometricLoading={biometricLoading} biometricMessage={biometricMessage} onToggleBiometrics={handleToggleBiometrics}
            restoring={false} restoreError={restoreError} onRestoreBackup={() => fileInputRef.current?.click()}
            onNextStep={() => setStep(2)} onFinishWizard={handleFinishWizard} onOpenAuthModal={() => setShowAuthModal(true)}
          />
        ) : (
          <WizardStepAccounts selectedCurrency={selectedCurrency} allowDecimals={allowDecimals} onPrevStep={() => setStep(1)} onFinishWizard={handleFinishWizard} />
        )}

        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleRestoreFile} />
        {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />}
      </div>
    </div>
  );
}
