/**
 * syncPayloads.js - Constructores de payload y sanitizadores defensivos ante errores de esquema de Supabase.
 */

import { ensureUUID } from '../syncEngine';

const hasErr = (t, m) => String(t || '').includes(m);
const safeNum = (v, fb = 0) => { const n = Number(v); return isNaN(n) ? fb : n; };

// 1. CUENTAS
export function buildAccountsPayload(accounts = [], userId, nowIso = new Date().toISOString()) {
  return (accounts || []).map((a, idx) => ({
    id: ensureUUID(a.id), user_id: userId, name: a.name || 'Cuenta', type: a.type || 'bank',
    balance: safeNum(a.balance ?? a.currentBalance ?? a.initialBalance ?? a.initial_balance),
    initial_balance: safeNum(a.initial_balance ?? a.initialBalance ?? a.balance ?? a.currentBalance),
    currency: a.currency || 'COP', icon: a.icon || null, color: a.color || null,
    order_index: typeof a.order_index === 'number' ? a.order_index : idx, updated_at: nowIso
  }));
}

export function sanitizeAccountsOnSchemaError(accountsPayload = [], errMsg = '') {
  const err = String(errMsg || '');
  return accountsPayload.map((a) => {
    const copy = { id: a.id, user_id: a.user_id, name: a.name, type: a.type, balance: a.balance, currency: a.currency };
    ['initial_balance', 'icon', 'color', 'updated_at'].forEach((f) => { if (!hasErr(err, f)) copy[f] = a[f]; });
    return copy;
  });
}

// 2. TRANSACCIONES
export function buildTransactionsPayload(transactions = [], validAccountIds = null, defaultAccountId = null, categoryMap = null, nowIso = new Date().toISOString(), userId = null) {
  let resolvedNow = nowIso, resolvedUser = userId;
  if (typeof nowIso === 'string' && !nowIso.includes('T') && !userId) { resolvedUser = nowIso; resolvedNow = new Date().toISOString(); }

  return (transactions || []).map((t) => {
    const rawAccId = t.accountId ? ensureUUID(t.accountId) : (t.account_id ? ensureUUID(t.account_id) : null);
    const resolvedAccId = (rawAccId && validAccountIds && validAccountIds.has(rawAccId)) ? rawAccId : defaultAccountId;
    const catId = t.categoryId || t.category_id || null;
    const resolvedCat = t.category || t.categoryName || t.category_name || (catId && categoryMap ? categoryMap.get(catId) : null) || catId || 'General';

    return {
      id: ensureUUID(t.id), user_id: resolvedUser || t.user_id, account_id: resolvedAccId, amount: safeNum(t.amount),
      type: t.type || 'expense', date: t.date || resolvedNow.split('T')[0], description: t.description || 'Movimiento',
      category: resolvedCat || 'General', category_id: catId || resolvedCat || null, notes: t.notes || '',
      is_transfer: Boolean(t.is_transfer || t.isTransfer || false), updated_at: resolvedNow
    };
  });
}

export function sanitizeTransactionsOnSchemaError(txsPayload = [], errText = '') {
  const err = String(errText || '');
  return txsPayload.map((tx) => {
    const copy = { ...tx };
    if (hasErr(err, 'updated_at')) delete copy.updated_at;
    if (hasErr(err, 'is_transfer') || hasErr(err, 'PGRST204')) delete copy.is_transfer;
    if (hasErr(err, 'category_id')) delete copy.category_id;
    if (hasErr(err, 'notes')) delete copy.notes;
    copy.category = copy.category || 'General';
    return copy;
  });
}

export function buildStrictlyRequiredTransactions(txsPayload = [], errMsg = '') {
  const err = String(errMsg || '');
  return txsPayload.map((tx) => ({
    id: tx.id, user_id: tx.user_id, account_id: tx.account_id, amount: tx.amount, type: tx.type, date: tx.date,
    description: tx.description, category: tx.category || 'General', ...(!hasErr(err, 'category_id') ? { category_id: tx.category_id || tx.category || null } : {})
  }));
}

// 3. DEUDAS Y PRÉSTAMOS
export function buildDebtsPayload(debtsAndLoans = [], userId, nowIso = new Date().toISOString()) {
  return (debtsAndLoans || []).map((d) => {
    const person = d.person || d.person_name || d.name || 'Sin nombre', payments = Array.isArray(d.payments) ? d.payments : [], disbursements = Array.isArray(d.disbursements) ? d.disbursements : [];
    const totalDisbursed = disbursements.reduce((s, x) => s + safeNum(x?.amount), 0);
    const initialAmount = safeNum(d.initialAmount ?? d.initial_amount ?? (safeNum(d.amount || d.totalAmount) - totalDisbursed)) || safeNum(d.amount || d.totalAmount);
    const totalAmount = initialAmount + totalDisbursed;
    const totalCapPaid = payments.reduce((s, p) => s + (p.capitalAmount !== undefined ? safeNum(p.capitalAmount) : (p.mode === 'interest' ? 0 : safeNum(p.amount))), 0);
    const remaining = Math.max(0, totalAmount - totalCapPaid);
    const rawData = { payments, disbursements, initialAmount };

    return {
      id: ensureUUID(d.id), user_id: userId, person, person_name: person, name: person, amount: totalAmount, total_amount: totalAmount,
      remaining_amount: remaining, type: d.type || 'payable', status: d.status || (remaining <= 1 ? 'paid' : 'active'),
      due_date: d.dueDate || d.endDate || null, interest_rate: safeNum(d.interestRate),
      notes: (payments.length || disbursements.length) ? `PAYMENTS_JSON:${JSON.stringify(rawData)}` : (d.notes || ''),
      raw_data: rawData, created_at: d.createdAt || d.startDate || nowIso, updated_at: nowIso
    };
  });
}

export function sanitizeDebtsOnSchemaError(debtsPayload = [], errMsg = '', errDetails = '') {
  const c = `${errMsg || ''} ${errDetails || ''}`;
  return debtsPayload.map((d) => {
    const p = d.person || d.person_name || d.name || 'Sin nombre', item = { id: d.id, user_id: d.user_id, type: d.type, amount: d.amount, total_amount: d.total_amount };
    if (!hasErr(c, 'person')) item.person = p;
    if (!hasErr(c, 'remaining_amount')) item.remaining_amount = d.remaining_amount;
    if (!hasErr(c, "'name'")) item.name = p;
    if (!hasErr(c, "'person_name'")) item.person_name = p;
    if (!hasErr(c, 'raw_data') && d.raw_data && Object.keys(d.raw_data).length > 0) item.raw_data = d.raw_data;
    ['notes', 'status', 'interest_rate', 'updated_at'].forEach((f) => { if (!hasErr(c, f) && d[f] !== undefined) item[f] = d[f]; });
    return item;
  });
}

export function buildStrictlyEssentialDebts(debtsPayload = [], fallbackErrMsg = '', initialErrMsg = '') {
  const c = `${fallbackErrMsg || ''} ${initialErrMsg || ''}`;
  return debtsPayload.map((d) => {
    const p = d.person || d.person_name || d.name || 'Sin nombre', essential = { id: d.id, user_id: d.user_id, type: d.type };
    if (!hasErr(c, "'person'")) essential.person = p;
    if (!hasErr(c, 'remaining_amount')) essential.remaining_amount = d.remaining_amount;
    if (!hasErr(c, "'person_name'")) essential.person_name = p;
    if (!hasErr(c, "'name'")) essential.name = p;
    essential[!hasErr(c, "'total_amount'") ? 'total_amount' : 'amount'] = d.total_amount || d.amount;
    return essential;
  });
}

// 4. INVERSIONES
export function buildInvestmentsPayload(investments = [], userId, nowIso = new Date().toISOString()) {
  return (investments || []).map((inv) => {
    const val = safeNum(inv.invested_amount ?? inv.investedAmount ?? inv.amount ?? inv.totalInvested ?? inv.current_value ?? inv.currentValue ?? inv.currentAmount);
    return {
      id: ensureUUID(inv.id), user_id: userId, name: inv.name || 'Inversión', category: inv.category || 'stock',
      subtype: inv.subtype || inv.type || 'stock', institution: inv.institution || null, currency: inv.currency || 'COP',
      invested_amount: val, current_value: safeNum(inv.current_value ?? inv.currentValue ?? inv.currentAmount ?? val),
      ticker: inv.ticker || null, shares: inv.shares ? Number(inv.shares) : null, rate: inv.rate ? Number(inv.rate) : null,
      issue_date: inv.issue_date || inv.issueDate || null, due_date: inv.due_date || inv.dueDate || null, updated_at: nowIso
    };
  });
}

export function sanitizeInvestmentsOnSchemaError(invsPayload = [], errMsg = '') {
  const err = String(errMsg || '');
  return invsPayload.map((inv) => {
    const item = { id: inv.id, user_id: inv.user_id, name: inv.name, category: inv.category, currency: inv.currency, current_value: inv.current_value, ticker: inv.ticker };
    item[!hasErr(err, 'invested_amount') ? 'invested_amount' : 'amount'] = inv.invested_amount;
    ['subtype', 'institution', 'shares', 'rate', 'issue_date', 'due_date', 'updated_at'].forEach((f) => { if (!hasErr(err, f)) item[f] = inv[f]; });
    return item;
  });
}

export function buildStrictlyEssentialInvs(invsPayload = []) {
  return invsPayload.map((inv) => ({ id: inv.id, user_id: inv.user_id, name: inv.name, invested_amount: inv.invested_amount, currency: inv.currency }));
}

// 5. PAGOS RECURRENTES
export function buildRecurringPayload(recurringPayments = [], userId, nowIso = new Date().toISOString(), validAccountIds = null) {
  return (recurringPayments || []).map((r) => {
    let accId = (r.accountId || r.account_id) ? ensureUUID(r.accountId || r.account_id) : null;
    if (accId && validAccountIds instanceof Set && !validAccountIds.has(accId)) accId = null;
    return {
      id: ensureUUID(r.id), user_id: userId, name: r.name || 'Suscripción', amount: safeNum(r.amount),
      category: r.category || r.categoryName || 'General', frequency: r.frequency || 'monthly',
      billing_day: safeNum(r.billingDay || r.billing_day, 1), is_active: r.isActive !== false && r.active !== false && r.is_active !== false,
      account_id: accId, next_payment_date: r.nextPaymentDate || r.next_payment_date || null, type: r.type || 'expense', updated_at: nowIso
    };
  });
}

export function sanitizeRecurringOnSchemaError(recurringPayload = [], errMsg = '') {
  const err = String(errMsg || '');
  return recurringPayload.map((r) => {
    const item = { id: r.id, user_id: r.user_id, name: r.name, amount: r.amount, category: r.category, frequency: r.frequency, is_active: r.is_active, account_id: r.account_id, next_payment_date: r.next_payment_date };
    ['billing_day', 'type', 'updated_at'].forEach((f) => { if (!hasErr(err, f)) item[f] = r[f]; });
    return item;
  });
}

export function buildStrictlyEssentialRec(recurringPayload = []) {
  return recurringPayload.map((r) => ({ id: r.id, user_id: r.user_id, name: r.name, amount: r.amount, category: r.category, frequency: r.frequency, is_active: r.is_active }));
}

// 6. PRESUPUESTOS
export function buildBudgetsPayload(currentBudgets = {}, userId, savedGlobalId = null, nowIso = new Date().toISOString()) {
  if (!currentBudgets) return [];
  const globalBudgetId = (savedGlobalId && /^[0-9a-f-]{36}$/i.test(savedGlobalId)) ? savedGlobalId : ensureUUID(`${userId}-global-budget`);
  const payloads = [{
    id: currentBudgets.id || globalBudgetId, user_id: userId, name: currentBudgets.name || 'Límite Global', category: currentBudgets.category || 'General',
    period: currentBudgets.period || 'monthly', amount: safeNum(currentBudgets.amount ?? currentBudgets.global),
    is_global: currentBudgets.is_global !== undefined ? Boolean(currentBudgets.is_global) : true, updated_at: nowIso
  }];

  if (currentBudgets.categories && typeof currentBudgets.categories === 'object') {
    Object.entries(currentBudgets.categories).forEach(([catId, amount]) => {
      const num = safeNum(amount);
      if (amount !== undefined && amount !== null && amount !== '' && num >= 0) {
        payloads.push({ id: ensureUUID(`${userId}-budget-${catId}`), user_id: userId, name: `Presupuesto ${catId}`, category: catId, category_id: catId, period: currentBudgets.period || 'monthly', amount: num, is_global: false, updated_at: nowIso });
      }
    });
  }
  return payloads;
}

export function buildEssentialBudgets(budgetsPayload = []) {
  return (budgetsPayload || []).map((b) => ({ id: b.id, user_id: b.user_id, name: b.name || 'Límite Global', category: b.category || 'General', period: b.period || 'monthly', amount: b.amount, updated_at: b.updated_at }));
}
