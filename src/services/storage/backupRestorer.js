import { STORAGE_KEYS } from '../../constants/storageKeys';

/**
 * backupRestorer.js
 * Servicios de análisis, validación, sanitización y restauración de copias de seguridad.
 */

/**
 * Sanitiza las configuraciones de seguridad de un backup, validando el PIN y biometría.
 */
export function sanitizeSecuritySettings(rawSecurity = {}) {
  const rawPin = rawSecurity?.pin || '';
  const hasPin = Boolean(rawPin && String(rawPin).trim().length >= 4);
  return {
    pinEnabled: hasPin && Boolean(rawSecurity?.pinEnabled),
    pin: hasPin ? String(rawPin).trim() : '',
    biometricsEnabled: Boolean(rawSecurity?.biometricsEnabled)
  };
}

/**
 * Configura y persiste el perfil de usuario y las opciones de seguridad al completar el onboarding.
 */
export function setupOnboardingProfileAndSecurity({
  user,
  name,
  customProfile,
  pin,
  biometricsEnabled,
  setUserProfile,
  setSecuritySettings
}) {
  const rawName = user?.user_metadata?.full_name || user?.user_metadata?.name || name || customProfile?.name || 'Usuario';
  const finalName = rawName.trim();
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || customProfile?.photo || null;
  const initials = finalName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || finalName.slice(0, 2).toUpperCase();
  const newProfile = { name: finalName, photo: avatarUrl, initials };

  setUserProfile?.(newProfile);
  ['user_profile_name', 'user_name'].forEach(k => localStorage.setItem(k, finalName));
  [STORAGE_KEYS.PROFILE, 'user', 'profile'].forEach(k => localStorage.setItem(k, JSON.stringify(newProfile)));

  const cleanSec = sanitizeSecuritySettings({ pin, pinEnabled: Boolean(pin), biometricsEnabled });
  setSecuritySettings?.(cleanSec);
  localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_ENABLED, cleanSec.pinEnabled ? 'true' : 'false');
  localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_CODE, cleanSec.pin);
  localStorage.setItem('security_pin_enabled', cleanSec.pinEnabled ? 'true' : 'false');
  localStorage.setItem('security_pin_code', cleanSec.pin);
  localStorage.setItem(STORAGE_KEYS.SECURITY_BIOMETRIC_ENABLED, cleanSec.biometricsEnabled ? 'true' : 'false');
  [STORAGE_KEYS.SECURITY, 'presu_security_v1'].forEach(k => localStorage.setItem(k, JSON.stringify(cleanSec)));

  return { finalName, cleanSec };
}

/**
 * Restaura y persiste un objeto de respaldo completo en memoria (setters) y en localStorage.
 */
export function restoreBackupData(backupData, setters = {}) {
  if (!backupData || !backupData.data) return false;
  const d = backupData.data;

  const {
    setTransactions,
    setAccounts,
    setCategories,
    setDebtsAndLoans,
    setInvestments,
    setBudgets,
    setSavingsGoals,
    setRecurringPayments,
    setUserProfile,
    setSecuritySettings,
    setTrm,
    setTheme,
    completeOnboarding,
    setSelectedDay,
    userId
  } = setters;

  // 1. Cuentas
  if (d.accounts) {
    if (setAccounts) setAccounts(d.accounts);
    const str = JSON.stringify(d.accounts);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, str);
    localStorage.setItem('user_accounts', str);
    localStorage.setItem('accounts', str);
    localStorage.setItem('app_accounts', str);
  }

  // 2. Transacciones
  if (d.transactions) {
    if (setTransactions) setTransactions(d.transactions);
    const str = JSON.stringify(d.transactions);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, str);
    localStorage.setItem('transactions', str);
    localStorage.setItem('app_transactions', str);
  }

  // 3. Categorías
  if (d.categories) {
    if (setCategories) setCategories(d.categories);
    const str = JSON.stringify(d.categories);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, str);
    localStorage.setItem('categories', str);
    localStorage.setItem('app_categories', str);
  }

  // 4. Deudas y préstamos
  const debtsPayload = d.debtsAndLoans || d.debts;
  if (debtsPayload) {
    if (setDebtsAndLoans) setDebtsAndLoans(debtsPayload);
    const str = JSON.stringify(debtsPayload);
    localStorage.setItem(STORAGE_KEYS.DEBTS, str);
    localStorage.setItem('user_debts', str);
    localStorage.setItem('debts', str);
    localStorage.setItem('app_loans', str);
  }

  // 5. Inversiones
  if (d.investments) {
    if (setInvestments) setInvestments(d.investments);
    const str = JSON.stringify(d.investments);
    localStorage.setItem('investments_initialized', 'true');
    localStorage.setItem('user_investments', str);
    localStorage.setItem('app_investments', str);
  }

  // 6. Presupuestos
  if (d.budgets) {
    if (setBudgets) setBudgets(d.budgets);
    const str = JSON.stringify(d.budgets);
    localStorage.setItem(STORAGE_KEYS.BUDGETS, str);
    localStorage.setItem('budgets', str);
  }

  // 7. Metas de ahorro
  const savingsPayload = d.savingsGoals || d.savings || d.goals;
  if (savingsPayload) {
    if (setSavingsGoals) setSavingsGoals(savingsPayload);
    const str = JSON.stringify(savingsPayload);
    localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, str);
    localStorage.setItem('savings', str);
    localStorage.setItem('goals', str);
  }

  // 8. Pagos recurrentes y suscripciones
  const recurringPayload = d.recurring_payments || d.subscriptions;
  if (recurringPayload) {
    if (setRecurringPayments) setRecurringPayments(recurringPayload);
    const str = JSON.stringify(recurringPayload);
    localStorage.setItem('recurring_payments', str);
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, str);
    localStorage.setItem('subscriptions', str);
    localStorage.setItem('app_recurring', str);
  }

  // 9. Perfil de usuario
  const profilePayload = d.userProfile || d.user || d.profile;
  if (profilePayload) {
    if (setUserProfile) setUserProfile(profilePayload);
    const str = JSON.stringify(profilePayload);
    localStorage.setItem(STORAGE_KEYS.PROFILE, str);
    localStorage.setItem('user', str);
    localStorage.setItem('profile', str);
    if (profilePayload.name) {
      localStorage.setItem('user_profile_name', profilePayload.name);
      localStorage.setItem('user_name', profilePayload.name);
    }
  }

  // 10. Seguridad y PIN
  const secPayload = d.securitySettings || d.security;
  if (secPayload) {
    const cleanSec = sanitizeSecuritySettings(secPayload);
    if (setSecuritySettings) setSecuritySettings(cleanSec);
    const secStr = JSON.stringify(cleanSec);
    localStorage.setItem(STORAGE_KEYS.SECURITY, secStr);
    localStorage.setItem('presu_security_v1', secStr);
    localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_ENABLED, cleanSec.pinEnabled ? 'true' : 'false');
    localStorage.setItem(STORAGE_KEYS.SECURITY_PIN_CODE, cleanSec.pin);
    localStorage.setItem('security_pin_enabled', cleanSec.pinEnabled ? 'true' : 'false');
    localStorage.setItem('security_pin_code', cleanSec.pin);
    localStorage.setItem(STORAGE_KEYS.SECURITY_BIOMETRIC_ENABLED, cleanSec.biometricsEnabled ? 'true' : 'false');
    if (cleanSec.pin) {
      localStorage.setItem('user_pin', cleanSec.pin);
    } else {
      localStorage.removeItem('user_pin');
    }
  }

  // 11. TRM y Tema
  if (d.trm) {
    const trmNum = Number(d.trm) || 4000;
    if (setTrm) setTrm(trmNum);
    localStorage.setItem(STORAGE_KEYS.TRM, trmNum.toString());
  }

  if (d.theme) {
    if (setTheme) setTheme(d.theme);
    localStorage.setItem(STORAGE_KEYS.THEME, d.theme);
    localStorage.setItem('app_theme', d.theme);
  }

  // 12. Finalizar onboarding y desbloquear
  if (completeOnboarding) completeOnboarding(userId);
  localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false');

  if (setSelectedDay) setSelectedDay(null);

  return true;
}
