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
  let payments = extractArray(d, raw, meta, 'payments'), disbursements = extractArray(d, raw, meta, 'disbursements'), initialAmount = null;
  if (typeof d.notes === 'string' && d.notes.startsWith('PAYMENTS_JSON:')) {
    try {
      const p = JSON.parse(d.notes.replace('PAYMENTS_JSON:', ''));
      if (Array.isArray(p) && !payments.length) payments = p;
      else if (p && typeof p === 'object') {
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
  return {
    ...d, person, personName: person, name: person, initialAmount, initial_amount: initialAmount,
    total_amount: totalAmount, totalAmount, principalAmount: totalAmount, amount: totalAmount,
    remaining_amount: finalRemaining, remainingAmount: finalRemaining, remainingCapital: finalRemaining, current_balance: finalRemaining,
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

export function resolveRemoteBudgets(res, userSettings = null) {
  const list = Array.isArray(res) ? res : (res?.status === 'fulfilled' && !res.value?.error && Array.isArray(res.value?.data)) ? res.value.data : (Array.isArray(res?.data) ? res.data : []);
  let loadedGlobal = null, categoriesMap = {};
  if (list.length > 0) {
    const isGlobal = (b) => Boolean(b.is_global === true || b.is_global === 'true' || b.isGlobal === true || b.isGlobal === 'true' || ['Límite Global', 'Presupuesto Global'].includes(b.name) || (!b.category_id && (!b.category || b.category === 'General')));
    const globalRow = list.find(isGlobal);
    if (globalRow) {
      loadedGlobal = safeNum(globalRow.amount);
      try { if (globalRow.id && typeof localStorage !== 'undefined') localStorage.setItem('global_budget_id', String(globalRow.id)); } catch {}
    }
    list.forEach((b) => {
      if (!isGlobal(b)) {
        const k = (b.category && b.category !== 'General') ? b.category : b.category_id;
        if (k && k !== 'General') categoriesMap[k] = safeNum(b.amount);
      }
    });
  }
  if (userSettings) {
    if (loadedGlobal === null) loadedGlobal = safeNum(userSettings.global_budget_limit ?? userSettings.global_budget ?? userSettings.budgets?.global);
    if (userSettings.budgets?.categories) categoriesMap = { ...userSettings.budgets.categories, ...categoriesMap };
  }
  if (typeof localStorage !== 'undefined' && loadedGlobal === null) {
    try {
      const d = localStorage.getItem('global_budget_limit'), ls = localStorage.getItem('user_settings'), lb = localStorage.getItem('presu_budgets_v1') || localStorage.getItem('budgets');
      if (d != null) loadedGlobal = safeNum(d);
      else if (ls) loadedGlobal = safeNum(JSON.parse(ls).global_budget_limit ?? JSON.parse(ls).global_budget);
      else if (lb) { const pb = JSON.parse(lb); loadedGlobal = safeNum(pb.global); categoriesMap = { ...(pb.categories || {}), ...categoriesMap }; }
    } catch {}
  }
  return { global: loadedGlobal ?? 0, categories: categoriesMap };
}

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

export function normalizeRemoteGoal(g) {
  if (!g || typeof g !== 'object') return null;
  const rawDate = g.deadline || g.target_date || g.dueDate || '';
  let safeDate = '';
  if (rawDate) { try { safeDate = new Date(rawDate).toISOString().split('T')[0]; } catch { safeDate = String(rawDate).split('T')[0]; } }
  const target = safeNum(g.target_amount ?? g.targetAmount), current = safeNum(g.current_amount ?? g.currentAmount);
  const targetAccId = g.target_account_id || g.targetAccountId || null, notifDay = safeNum(g.notification_day ?? g.notificationDay, 15);
  const notifyEnabled = Boolean(g.notify_enabled !== undefined ? g.notify_enabled : (g.notifyEnabled !== undefined ? g.notifyEnabled : true));

  return {
    ...g, id: String(g.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `goal-${Date.now()}`)),
    user_id: g.user_id, name: (g.name || 'Nueva Meta').trim(), target_amount: target, targetAmount: target, current_amount: current, currentAmount: current,
    deadline: safeDate, target_date: safeDate, dueDate: safeDate, icon: g.icon || 'Target', color: g.color || '#10B981',
    target_account_id: targetAccId, targetAccountId: targetAccId, months: safeNum(g.months, 6), notification_day: notifDay, notificationDay: notifDay,
    notify_enabled: notifyEnabled, notifyEnabled, created_at: g.created_at || new Date().toISOString(), updated_at: g.updated_at || new Date().toISOString()
  };
}
