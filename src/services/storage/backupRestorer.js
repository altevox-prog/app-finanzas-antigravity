import { STORAGE_KEYS } from '../../constants/storageKeys';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getSupabaseUser } from '../supabaseClient';
import { ensureUUID } from '../syncEngine';
import {
  buildAccountsPayload,
  sanitizeAccountsOnSchemaError,
  buildTransactionsPayload,
  sanitizeTransactionsOnSchemaError,
  buildStrictlyRequiredTransactions,
  buildDebtsPayload,
  sanitizeDebtsOnSchemaError,
  buildStrictlyEssentialDebts,
  buildInvestmentsPayload,
  sanitizeInvestmentsOnSchemaError,
  buildStrictlyEssentialInvs,
  buildRecurringPayload,
  sanitizeRecurringOnSchemaError,
  buildStrictlyEssentialRec,
  buildBudgetsPayload,
  buildEssentialBudgets
} from '../sync/syncPayloads';
import { upsertWithFallback } from '../sync/syncApiService';

/**
 * backupRestorer.js
 * Servicios de análisis, validación, sanitización y restauración de copias de seguridad.
 * Enfoque Supabase Puro: Sin persistencia en localStorage para datos financieros.
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
 * Restaura un objeto de respaldo completo en memoria (setters) y en Supabase (asíncrono).
 * No escribe datos financieros en localStorage.
 */
export async function restoreBackupData(backupData, setters = {}) {
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
    userId: explicitUserId
  } = setters;

  // 1. Actualización inmediata de los estados de React en memoria
  if (d.accounts && setAccounts) setAccounts(d.accounts);
  if (d.transactions && setTransactions) setTransactions(d.transactions);
  if (d.categories && setCategories) setCategories(d.categories);

  const debtsPayload = d.debtsAndLoans || d.debts;
  if (debtsPayload && setDebtsAndLoans) setDebtsAndLoans(debtsPayload);

  if (d.investments && setInvestments) setInvestments(d.investments);
  if (d.budgets && setBudgets) setBudgets(d.budgets);

  const savingsPayload = d.savingsGoals || d.savings || d.goals;
  if (savingsPayload && setSavingsGoals) setSavingsGoals(savingsPayload);

  const recurringPayload = d.recurring_payments || d.subscriptions;
  if (recurringPayload && setRecurringPayments) setRecurringPayments(recurringPayload);

  const profilePayload = d.userProfile || d.user || d.profile;
  if (profilePayload && setUserProfile) setUserProfile(profilePayload);

  // 2. Preservar exclusivamente configuraciones locales del dispositivo en localStorage
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

  if (completeOnboarding) completeOnboarding(explicitUserId);
  localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false');
  if (setSelectedDay) setSelectedDay(null);

  // 3. Restauración y persistencia directa en Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const activeUser = explicitUserId ? { id: explicitUserId } : (await getSupabaseUser());
      const uid = activeUser?.id;

      if (uid) {
        const nowIso = new Date().toISOString();

        // 3.1. Cuentas
        if (Array.isArray(d.accounts) && d.accounts.length > 0) {
          const accsPayload = buildAccountsPayload(d.accounts, uid, nowIso);
          await upsertWithFallback('accounts', accsPayload, {
            onConflict: 'id',
            fallbackConflict: 'id,user_id',
            sanitize: sanitizeAccountsOnSchemaError
          });
        }

        // 3.2. Categorías
        if (Array.isArray(d.categories) && d.categories.length > 0) {
          const catsPayload = d.categories.map((c) => ({
            id: String(c.id),
            user_id: uid,
            name: c.name || 'Categoría',
            type: c.type || 'expense',
            icon: c.icon || 'Tag',
            color: c.color || '#64748b'
          }));
          await upsertWithFallback('categories', catsPayload, {
            onConflict: 'id',
            fallbackConflict: 'id,user_id'
          });
        }

        // 3.3. Transacciones
        if (Array.isArray(d.transactions) && d.transactions.length > 0) {
          const validAccountIds = Array.isArray(d.accounts) && d.accounts.length > 0
            ? new Set(d.accounts.map(a => ensureUUID(a.id)))
            : null;

          const txsPayload = buildTransactionsPayload(d.transactions, uid, nowIso, validAccountIds);
          await upsertWithFallback('transactions', txsPayload, {
            onConflict: 'id',
            fallbackConflict: 'id,user_id',
            sanitize: sanitizeTransactionsOnSchemaError,
            strictFallback: buildStrictlyRequiredTransactions
          });
        }

        // 3.4. Deudas y Préstamos
        if (Array.isArray(debtsPayload) && debtsPayload.length > 0) {
          const debtsSupabasePayload = buildDebtsPayload(debtsPayload, uid, nowIso);
          await upsertWithFallback('debts', debtsSupabasePayload, {
            onConflict: 'id',
            fallbackConflict: 'id,user_id',
            sanitize: sanitizeDebtsOnSchemaError,
            strictFallback: buildStrictlyEssentialDebts
          });

          // Restaurar pagos de deudas en debt_payments si existen
          const debtPaymentsList = [];
          debtsPayload.forEach((debt) => {
            if (Array.isArray(debt.payments)) {
              debt.payments.forEach((p) => {
                debtPaymentsList.push({
                  id: ensureUUID(p.id || crypto.randomUUID()),
                  debt_id: ensureUUID(debt.id),
                  user_id: uid,
                  amount: Number(p.amount || 0),
                  type: 'PAYMENT',
                  payment_type: p.mode === 'interest' ? 'INTEREST' : 'CAPITAL',
                  date: p.date || nowIso.split('T')[0],
                  notes: p.note || 'Abono restaurado',
                  created_at: p.date ? `${p.date}T12:00:00.000Z` : nowIso
                });
              });
            }
          });

          if (debtPaymentsList.length > 0) {
            await supabase.from('debt_payments').upsert(debtPaymentsList, { onConflict: 'id' }).catch(() => {});
          }
        }

        // 3.5. Inversiones
        if (Array.isArray(d.investments) && d.investments.length > 0) {
          const invsPayload = buildInvestmentsPayload(d.investments, uid, nowIso);
          await upsertWithFallback('investments', invsPayload, {
            onConflict: 'id',
            fallbackConflict: 'id,user_id',
            sanitize: sanitizeInvestmentsOnSchemaError,
            strictFallback: buildStrictlyEssentialInvs
          });
        }

        // 3.6. Presupuestos
        if (d.budgets && typeof d.budgets === 'object') {
          const budgetsSupabasePayload = buildBudgetsPayload(d.budgets, uid, null, nowIso);
          await upsertWithFallback('budgets', budgetsSupabasePayload, {
            onConflict: 'id',
            fallbackConflict: 'id,user_id',
            strictFallback: buildEssentialBudgets
          });
        }

        // 3.7. Pagos recurrentes y suscripciones
        if (Array.isArray(recurringPayload) && recurringPayload.length > 0) {
          const validAccountIds = Array.isArray(d.accounts) && d.accounts.length > 0
            ? new Set(d.accounts.map(a => ensureUUID(a.id)))
            : null;

          const recPayload = buildRecurringPayload(recurringPayload, uid, nowIso, validAccountIds);
          await upsertWithFallback('recurring_payments', recPayload, {
            onConflict: 'id',
            fallbackConflict: 'id,user_id',
            sanitize: sanitizeRecurringOnSchemaError,
            strictFallback: buildStrictlyEssentialRec
          });
        }

        // 3.8. Perfil en Supabase
        if (profilePayload) {
          const pName = profilePayload.name || 'Usuario';
          const pPhoto = profilePayload.photo || null;
          await supabase.from('profiles').upsert({
            id: uid,
            name: pName,
            display_name: pName,
            photo_url: pPhoto,
            updated_at: nowIso
          }, { onConflict: 'id' }).catch(() => {});
        }
      }
    } catch (cloudErr) {
      console.warn('[backupRestorer] Advertencia al persistir backup en Supabase:', cloudErr);
    }
  }

  return true;
}
