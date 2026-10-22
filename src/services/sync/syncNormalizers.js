/**
 * syncNormalizers.js - Funciones puras de normalización y parsing defensivo para datos de Supabase.
 */

const safeNum = (v, fb = 0) => { const n = Number(v); return isNaN(n) ? fb : n; };
const pickNum = (...cands) => {
  for (const c of cands) { const n = Number(c); if (!isNaN(n) && n > 0) return n; }
  for (const c of cands) { const n = Number(c); if (!isNaN(n) && c != null && c !== '') return n; }
  return 0;
};
const safeJson = (val, fb = {}) => { if (!val) return fb; if (typeof val === 'object') return val; try { return JSON.parse(val); } catch { return fb; } };
const extractArray = (d, raw, meta, key) => [d, raw, meta].find((src) => Array.isArray(src?.[key]))?.[key] || [];

export function normalizeRemoteProfile(cloud, prev = {}) {
  if (!cloud) return prev;
  const name = cloud.display_name || cloud.name || prev?.name || 'Usuario';
  return { ...prev, name, photo: cloud.photo_url || cloud.photo || prev?.photo || null, initials: name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'US' };
}

export function normalizeRemoteAccount(a) {
  if (!a || typeof a !== 'object') return a;
  const bal = safeNum(a.balance ?? a.current_balance ?? a.initial_balance ?? a.initialBalance);
  const initBal = safeNum(a.initial_balance ?? a.initialBalance ?? a.balance ?? a.current_balance);
  return { ...a, order_index: a.order_index != null ? Number(a.order_index) : 0, initial_balance: initBal, initialBalance: initBal, balance: bal, current_balance: bal, currentBalance: bal };
}

export function normalizeRemoteTransaction(t) {
  if (!t || typeof t !== 'object') return t;
  const raw = safeJson(t.raw_data);
  const resolvedDate = String(t.date || t.created_at || t.datetime || new Date().toISOString()).split('T')[0];
  const note = t.note ?? t.notes ?? t.description ?? raw.note ?? raw.description ?? '', cat = t.category ?? t.category_name ?? t.categoryName ?? raw.category ?? raw.categoryName ?? 'General';
  const rawType = String(t.type || raw.type || 'expense').toLowerCase();
  const type = ['gasto', 'expense'].includes(rawType) ? 'expense' : (['ingreso', 'income'].includes(rawType) ? 'income' : rawType);
  const accId = t.account_id || t.accountId || raw.account_id || raw.accountId || null, catId = t.category_id || t.categoryId || raw.category_id || raw.categoryId || null;
  const isTransfer = Boolean(t.is_transfer || t.isTransfer || raw.is_transfer || false);
  return {
    ...t, date: resolvedDate, note, notes: note, description: t.description || note || 'Movimiento',
    type, categoryName: cat, category_name: cat, category: cat, accountId: accId, account_id: accId,
    categoryId: catId, category_id: catId, subcategoryId: t.subcategory_id || t.subcategoryId || raw.subcategory_id || raw.subcategoryId || null,
    amount: safeNum(t.amount), is_transfer: isTransfer, isTransfer
  };
}

export function normalizeRemoteDebt(d) {
  if (!d || typeof d !== 'object') return d;
  const raw = safeJson(d.raw_data), meta = safeJson(d.metadata), person = d.person || d.person_name || d.name || 'Sin nombre';
  const parsedTotal = pickNum(d.total_amount, d.totalAmount, d.amount, d.principalAmount, d.remaining_amount);
  const parsedRemaining = (d.remaining_amount != null && Number(d.remaining_amount) > 0) ? Number(d.remaining_amount) : (d.remainingAmount != null && Number(d.remainingAmount) > 0 ? Number(d.remainingAmount) : parsedTotal);
  let payments = extractArray(d, raw, meta, 'payments'), disbursements = extractArray(d, raw, meta, 'disbursements'), initialAmount = null, pj = null;
  if (typeof d.notes === 'string' && d.notes.startsWith('PAYMENTS_JSON:')) {
    try {
      const p = JSON.parse(d.notes.replace('PAYMENTS_JSON:', ''));
      if (Array.isArray(p) && !payments.length) payments = p;
      else if (p && typeof p === 'object') {
        pj = p;
        if (Array.isArray(p.payments) && !payments.length) payments = p.payments;
        if (Array.isArray(p.disbursements) && !disbursements.length) disbursements = p.disbursements;
        if (p.initialAmount) initialAmount = Number(p.initialAmount);
      }
    } catch {}
  }
  const totalDisbursed = disbursements.reduce((s, disb) => s + safeNum(disb?.amount), 0);
  const totalCapPaid = payments.reduce((s, p) => s + (p.capitalAmount !== undefined ? safeNum(p.capitalAmount) : (p.mode === 'interest' ? 0 : safeNum(p.amount))), 0);
  initialAmount = initialAmount || safeNum(d.initialAmount ?? d.initial_amount);
  const totalAmount = initialAmount > 0 ? initialAmount + totalDisbursed : (totalDisbursed > 0 ? (parsedTotal > totalDisbursed ? parsedTotal - totalDisbursed : parsedTotal) + totalDisbursed : parsedTotal);
  initialAmount = initialAmount || (totalDisbursed > 0 ? (parsedTotal > totalDisbursed ? parsedTotal - totalDisbursed : parsedTotal) : parsedTotal);
  const calcRem = Math.max(0, totalAmount - totalCapPaid);
  const finalRemaining = (payments.length > 0 || totalDisbursed > 0) ? calcRem : (parsedRemaining || calcRem);

  const installments = Number(d.installments ?? d.total_installments ?? raw.installments ?? raw.total_installments ?? pj?.installments ?? meta.installments) || 1;
  const frequency = d.frequency || raw.frequency || pj?.frequency || meta.frequency || 'Único';
  const dueDay = d.due_day ?? d.dueDay ?? raw.dueDay ?? raw.due_day ?? pj?.dueDay ?? pj?.due_day ?? 15;
  const biweeklyDays = d.biweekly_days ?? d.biweeklyDays ?? raw.biweeklyDays ?? raw.biweekly_days ?? pj?.biweeklyDays ?? pj?.biweekly_days ?? [15, 30];
  const dueDate = d.due_date || d.dueDate || raw.dueDate || raw.due_date || pj?.dueDate || pj?.due_date || '';
  const startDate = d.start_date || d.startDate || raw.startDate || raw.start_date || pj?.startDate || pj?.start_date || '';

  return {
    ...raw, ...d, person, personName: person, name: person, initialAmount, initial_amount: initialAmount,
    total_amount: totalAmount, totalAmount, principalAmount: totalAmount, amount: totalAmount,
    remaining_amount: finalRemaining, remainingAmount: finalRemaining, remainingCapital: finalRemaining, current_balance: finalRemaining,
    installments, total_installments: installments, frequency,
    dueDay: Number(dueDay) || 15, due_day: Number(dueDay) || 15,
    biweeklyDays: Array.isArray(biweeklyDays) ? biweeklyDays : [15, 30], biweekly_days: Array.isArray(biweeklyDays) ? biweeklyDays : [15, 30],
    dueDate, due_date: dueDate, collectionDate: dueDate,
    startDate, start_date: startDate,
    interestRate: safeNum(d.interest_rate ?? d.interestRate ?? raw.interestRate ?? raw.interest_rate ?? pj?.interestRate),
    insuranceFee: safeNum(d.insurance_fee ?? d.insuranceFee ?? raw.insuranceFee ?? raw.insurance_fee ?? pj?.insuranceFee),
    payments, disbursements
  };
}

export function normalizeRemoteInvestment(inv) {
  if (!inv || typeof inv !== 'object') return inv;
  const raw = safeJson(inv.raw_data);
  const invAmount = pickNum(inv.investedAmount, inv.invested_amount, raw.investedAmount, raw.invested_amount, inv.amount, raw.amount, inv.totalInvested, raw.totalInvested, inv.buyPrice, raw.buyPrice);
  const currVal = pickNum(inv.currentAmount, inv.currentValue, inv.current_value, raw.currentAmount, raw.currentValue, raw.current_value, invAmount);
  const rateVal = safeNum(inv.rate ?? raw.rate ?? inv.interestRate ?? raw.interestRate);
  return {
    ...raw, ...inv, amount: invAmount, investedAmount: invAmount, invested_amount: invAmount, totalInvested: invAmount,
    currentAmount: currVal, currentValue: currVal, current_value: currVal, category: inv.category || raw.category || 'fixed',
    assetType: inv.assetType || inv.asset_type || raw.assetType || (inv.category === 'fixed' ? 'cdt' : 'other'),
    type: inv.subtype || inv.type || raw.subtype || raw.type || 'fixed_income', subtype: inv.subtype || inv.type || raw.subtype || raw.type || 'cdt',
    institution: inv.institution || raw.institution || null, interestRate: rateVal, rate: rateVal,
    dueDate: inv.dueDate || inv.due_date || raw.dueDate || raw.due_date || null, startDate: inv.startDate || inv.start_date || raw.startDate || raw.start_date || null
  };
}

export function normalizeRemoteRecurring(r) {
  if (!r || typeof r !== 'object') return r;
  const raw = safeJson(r.raw_data);
  const billingDay = safeNum(r.billing_day ?? r.billingDay ?? raw.billing_day ?? raw.billingDay, 1);
  const isActive = Boolean([r.is_active, r.isActive, raw.is_active, raw.isActive].find((v) => v !== undefined) ?? true);
  const nextDate = r.next_payment_date || r.nextPaymentDate || r.next_date || r.nextDate || raw.next_payment_date || raw.nextPaymentDate || raw.next_date || raw.nextDate || null;
  const accountId = r.account_id || r.accountId || raw.account_id || raw.accountId || null, userId = r.user_id || r.userId || raw.user_id || raw.userId || null;
  const category = r.category || r.category_name || r.categoryName || raw.category || raw.categoryName || 'General';
  const updatedAt = r.updated_at || r.updatedAt || raw.updated_at || raw.updatedAt || new Date().toISOString();
  return {
    ...raw, ...r, id: r.id || raw.id, userId, user_id: userId, name: r.name || raw.name || 'Suscripción', amount: safeNum(r.amount ?? raw.amount),
    category, categoryName: category, type: r.type || raw.type || 'expense', frequency: r.frequency || raw.frequency || 'monthly',
    billingDay, billing_day: billingDay, isActive, is_active: isActive, active: isActive,
    accountId, account_id: accountId, nextPaymentDate: nextDate, next_payment_date: nextDate, nextDate, next_date: nextDate, updatedAt, updated_at: updatedAt
  };
}

export { resolveRemoteBudgets } from './budgetNormalizer';
export { normalizeRemoteGoal } from './goalNormalizer';

export function normalizeRemoteCategory(c, currentCategories = []) {
  if (!c || typeof c !== 'object') return c;
  const raw = safeJson(c.raw_data);
  let subs = c.subcategories || raw.subcategories;
  if (!Array.isArray(subs) || !subs.length) {
    const ex = (currentCategories || []).find((cat) => String(cat.id) === String(c.id) || cat.name?.trim().toLowerCase() === c.name?.trim().toLowerCase());
    if (Array.isArray(ex?.subcategories) && ex.subcategories.length) subs = ex.subcategories;
  }
  return { ...c, subcategories: Array.isArray(subs) ? subs : [] };
}
