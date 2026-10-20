/**
 * backupRestorer.js
 * Servicios de análisis, validación, sanitización y restauración de copias de seguridad.
 * Enfoque Supabase Puro: Sin persistencia en localStorage para datos financieros.
 */

import { STORAGE_KEYS } from '../../constants/storageKeys';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getSupabaseUser } from '../supabaseClient';
import { ensureUUID } from '../syncEngine';
import {
  buildAccountsPayload, sanitizeAccountsOnSchemaError,
  buildTransactionsPayload, sanitizeTransactionsOnSchemaError, buildStrictlyRequiredTransactions,
  buildDebtsPayload, sanitizeDebtsOnSchemaError, buildStrictlyEssentialDebts,
  buildInvestmentsPayload, sanitizeInvestmentsOnSchemaError, buildStrictlyEssentialInvs,
  buildRecurringPayload, sanitizeRecurringOnSchemaError, buildStrictlyEssentialRec,
  buildBudgetsPayload, buildEssentialBudgets
} from '../sync/syncPayloads';
import { upsertWithFallback } from '../sync/syncApiService';

export function sanitizeSecuritySettings(rawSecurity = {}) {
  const rawPin = rawSecurity?.pin || '';
  const hasPin = Boolean(rawPin && String(rawPin).trim().length >= 4);
  return {
    pinEnabled: hasPin && Boolean(rawSecurity?.pinEnabled),
    pin: hasPin ? String(rawPin).trim() : '',
    biometricsEnabled: Boolean(rawSecurity?.biometricsEnabled)
  };
}

export function setupOnboardingProfileAndSecurity({
  user, name, customProfile, pin, biometricsEnabled, setUserProfile, setSecuritySettings
}) {
  const rawName = user?.user_metadata?.full_name || user?.user_metadata?.name || name || customProfile?.name || 'Usuario';
  const finalName = rawName.trim();
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || customProfile?.photo || null;
  const initials = finalName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || finalName.slice(0, 2).toUpperCase();
  const newProfile = { name: finalName, photo: avatarUrl, initials };

  setUserProfile?.(newProfile);

  const cleanSec = sanitizeSecuritySettings({ pin, pinEnabled: Boolean(pin), biometricsEnabled });
  setSecuritySettings?.(cleanSec);

  const pinFlag = cleanSec.pinEnabled ? 'true' : 'false';
  [STORAGE_KEYS.SECURITY_PIN_ENABLED, 'security_pin_enabled'].forEach(k => localStorage.setItem(k, pinFlag));
  [STORAGE_KEYS.SECURITY_PIN_CODE, 'security_pin_code'].forEach(k => localStorage.setItem(k, cleanSec.pin));
  localStorage.setItem(STORAGE_KEYS.SECURITY_BIOMETRIC_ENABLED, cleanSec.biometricsEnabled ? 'true' : 'false');
  [STORAGE_KEYS.SECURITY, 'presu_security_v1'].forEach(k => localStorage.setItem(k, JSON.stringify(cleanSec)));

  return { finalName, cleanSec };
}

export async function restoreBackupData(backupData, setters = {}) {
  if (!backupData?.data) return false;
  const d = backupData.data;

  const {
    setTransactions, setAccounts, setCategories, setDebtsAndLoans, setInvestments,
    setBudgets, setSavingsGoals, setRecurringPayments, setUserProfile, setSecuritySettings,
    setTrm, setTheme, completeOnboarding, setSelectedDay, userId: explicitUserId
  } = setters;

  // 1. Estados en memoria
  if (d.accounts) setAccounts?.(d.accounts);
  if (d.transactions) setTransactions?.(d.transactions);
  if (d.categories) setCategories?.(d.categories);
  const debtsPayload = d.debtsAndLoans || d.debts;
  if (debtsPayload) setDebtsAndLoans?.(debtsPayload);
  if (d.investments) setInvestments?.(d.investments);
  if (d.budgets) setBudgets?.(d.budgets);
  const savingsPayload = d.savingsGoals || d.savings || d.goals;
  if (savingsPayload) setSavingsGoals?.(savingsPayload);
  const recurringPayload = d.recurring_payments || d.subscriptions;
  if (recurringPayload) setRecurringPayments?.(recurringPayload);
  const profilePayload = d.userProfile || d.user || d.profile;
  if (profilePayload) setUserProfile?.(profilePayload);

  // 2. Opciones del dispositivo en localStorage
  const secPayload = d.securitySettings || d.security;
  if (secPayload) {
    const cleanSec = sanitizeSecuritySettings(secPayload);
    setSecuritySettings?.(cleanSec);
    const secStr = JSON.stringify(cleanSec);
    [STORAGE_KEYS.SECURITY, 'presu_security_v1'].forEach(k => localStorage.setItem(k, secStr));
    const pinFlag = cleanSec.pinEnabled ? 'true' : 'false';
    [STORAGE_KEYS.SECURITY_PIN_ENABLED, 'security_pin_enabled'].forEach(k => localStorage.setItem(k, pinFlag));
    [STORAGE_KEYS.SECURITY_PIN_CODE, 'security_pin_code'].forEach(k => localStorage.setItem(k, cleanSec.pin));
    localStorage.setItem(STORAGE_KEYS.SECURITY_BIOMETRIC_ENABLED, cleanSec.biometricsEnabled ? 'true' : 'false');
    if (cleanSec.pin) localStorage.setItem('user_pin', cleanSec.pin);
    else localStorage.removeItem('user_pin');
  }

  if (d.trm) {
    const trmNum = Number(d.trm) || 4000;
    setTrm?.(trmNum);
    localStorage.setItem(STORAGE_KEYS.TRM, trmNum.toString());
  }

  if (d.theme) {
    setTheme?.(d.theme);
    [STORAGE_KEYS.THEME, 'app_theme'].forEach(k => localStorage.setItem(k, d.theme));
  }

  completeOnboarding?.(explicitUserId);
  localStorage.setItem(STORAGE_KEYS.APP_IS_LOCKED, 'false');
  setSelectedDay?.(null);

  // 3. Persistencia en Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const activeUser = explicitUserId ? { id: explicitUserId } : (await getSupabaseUser());
      const uid = activeUser?.id;

      if (uid) {
        const nowIso = new Date().toISOString();

        if (Array.isArray(d.accounts) && d.accounts.length > 0) {
          await upsertWithFallback('accounts', buildAccountsPayload(d.accounts, uid, nowIso), {
            onConflict: 'id', fallbackConflict: 'id,user_id', sanitize: sanitizeAccountsOnSchemaError
          });
        }

        if (Array.isArray(d.categories) && d.categories.length > 0) {
          await upsertWithFallback('categories', d.categories.map(c => ({
            id: String(c.id), user_id: uid, name: c.name || 'Categoría', type: c.type || 'expense', icon: c.icon || 'Tag', color: c.color || '#64748b'
          })), { onConflict: 'id', fallbackConflict: 'id,user_id' });
        }

        if (Array.isArray(d.transactions) && d.transactions.length > 0) {
          const validAccountIds = Array.isArray(d.accounts) && d.accounts.length > 0 ? new Set(d.accounts.map(a => ensureUUID(a.id))) : null;
          await upsertWithFallback('transactions', buildTransactionsPayload(d.transactions, uid, nowIso, validAccountIds), {
            onConflict: 'id', fallbackConflict: 'id,user_id', sanitize: sanitizeTransactionsOnSchemaError, strictFallback: buildStrictlyRequiredTransactions
          });
        }

        if (Array.isArray(debtsPayload) && debtsPayload.length > 0) {
          await upsertWithFallback('debts', buildDebtsPayload(debtsPayload, uid, nowIso), {
            onConflict: 'id', fallbackConflict: 'id,user_id', sanitize: sanitizeDebtsOnSchemaError, strictFallback: buildStrictlyEssentialDebts
          });

          const debtPaymentsList = [];
          debtsPayload.forEach(debt => {
            if (Array.isArray(debt.payments)) {
              debt.payments.forEach(p => {
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

        if (Array.isArray(d.investments) && d.investments.length > 0) {
          await upsertWithFallback('investments', buildInvestmentsPayload(d.investments, uid, nowIso), {
            onConflict: 'id', fallbackConflict: 'id,user_id', sanitize: sanitizeInvestmentsOnSchemaError, strictFallback: buildStrictlyEssentialInvs
          });
        }

        if (d.budgets && typeof d.budgets === 'object') {
          await upsertWithFallback('budgets', buildBudgetsPayload(d.budgets, uid, null, nowIso), {
            onConflict: 'id', fallbackConflict: 'id,user_id', strictFallback: buildEssentialBudgets
          });
        }

        if (Array.isArray(recurringPayload) && recurringPayload.length > 0) {
          const validAccountIds = Array.isArray(d.accounts) && d.accounts.length > 0 ? new Set(d.accounts.map(a => ensureUUID(a.id))) : null;
          await upsertWithFallback('recurring_payments', buildRecurringPayload(recurringPayload, uid, nowIso, validAccountIds), {
            onConflict: 'id', fallbackConflict: 'id,user_id', sanitize: sanitizeRecurringOnSchemaError, strictFallback: buildStrictlyEssentialRec
          });
        }

        if (profilePayload) {
          const pName = profilePayload.name || 'Usuario';
          await supabase.from('profiles').upsert({
            id: uid, name: pName, display_name: pName, photo_url: profilePayload.photo || null, updated_at: nowIso
          }, { onConflict: 'id' }).catch(() => {});
        }
      }
    } catch (cloudErr) {
      console.warn('[backupRestorer] Advertencia al persistir backup en Supabase:', cloudErr);
    }
  }

  return true;
}
