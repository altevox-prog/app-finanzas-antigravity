/**
 * syncPayloads.js
 * Constructores de payload y sanitizadores defensivos ante errores de esquema de Supabase
 * para la sincronización de subida (pushLocalToCloud).
 */

import { ensureUUID } from '../syncEngine';

/**
 * 1. CUENTAS
 */
export function buildAccountsPayload(accounts = [], userId, nowIso = new Date().toISOString()) {
  return (accounts || []).map((a, index) => {
    const bal = Number(a.balance ?? a.currentBalance ?? a.initialBalance ?? a.initial_balance ?? 0);
    const initBal = Number(a.initial_balance ?? a.initialBalance ?? a.balance ?? a.currentBalance ?? 0);
    return {
      id: ensureUUID(a.id),
      user_id: userId,
      name: a.name || 'Cuenta',
      type: a.type || 'bank',
      balance: bal,
      initial_balance: initBal,
      currency: a.currency || 'COP',
      icon: a.icon || null,
      color: a.color || null,
      order_index: typeof a.order_index === 'number' ? a.order_index : index,
      updated_at: nowIso
    };
  });
}

export function sanitizeAccountsOnSchemaError(accountsPayload = [], errMsg = '') {
  const msg = String(errMsg || '');
  const hasInitBalIssue = msg.includes("'initial_balance'") || msg.includes('initial_balance');
  const hasUpdatedColIssue = msg.includes("'updated_at'") || msg.includes('updated_at');
  const hasIconIssue = msg.includes("'icon'") || msg.includes('icon');
  const hasColorIssue = msg.includes("'color'") || msg.includes('color');

  return accountsPayload.map(a => {
    const copy = {
      id: a.id,
      user_id: a.user_id,
      name: a.name,
      type: a.type,
      balance: a.balance,
      currency: a.currency
    };
    if (!hasInitBalIssue) copy.initial_balance = a.initial_balance;
    if (!hasIconIssue) copy.icon = a.icon;
    if (!hasColorIssue) copy.color = a.color;
    if (!hasUpdatedColIssue) copy.updated_at = a.updated_at;
    return copy;
  });
}

/**
 * 2. TRANSACCIONES
 */
export function buildTransactionsPayload(
  transactions = [],
  validAccountIds = null,
  defaultAccountId = null,
  categoryMap = null,
  nowIso = new Date().toISOString(),
  userId = null
) {
  let resolvedNowIso = nowIso;
  let resolvedUserId = userId;
  if (typeof nowIso === 'string' && !nowIso.includes('T') && !userId) {
    resolvedUserId = nowIso;
    resolvedNowIso = new Date().toISOString();
  }

  return (transactions || []).map(t => {
    const rawAccId = t.accountId ? ensureUUID(t.accountId) : (t.account_id ? ensureUUID(t.account_id) : null);
    // Validar que account_id corresponda a una cuenta que ya exista en accounts para evitar violación de Foreign Key
    const resolvedAccountId = (rawAccId && validAccountIds && validAccountIds.has(rawAccId)) 
      ? rawAccId 
      : defaultAccountId;

    const catId = t.categoryId || t.category_id || null;
    const resolvedCategory = t.category || t.categoryName || t.category_name || (catId && categoryMap ? categoryMap.get(catId) : null) || catId || 'General';

    return {
      id: ensureUUID(t.id),
      user_id: resolvedUserId || t.user_id,
      account_id: resolvedAccountId,
      amount: Number(t.amount || 0),
      type: t.type || 'expense',
      date: t.date || resolvedNowIso.split('T')[0],
      description: t.description || 'Movimiento',
      category: resolvedCategory || 'General',
      category_id: catId || resolvedCategory || null,
      notes: t.notes || '',
      is_transfer: Boolean(t.is_transfer || t.isTransfer || false),
      updated_at: resolvedNowIso
    };
  });
}

export function sanitizeTransactionsOnSchemaError(txsPayload = [], errText = '') {
  const str = String(errText || '');
  return txsPayload.map((tx) => {
    const copy = { ...tx };
    if (str.includes('updated_at')) {
      delete copy.updated_at;
    }
    if (str.includes('is_transfer') || str.includes('PGRST204')) {
      delete copy.is_transfer;
    }
    if (str.includes('category_id')) {
      delete copy.category_id;
    }
    if (str.includes('notes')) {
      delete copy.notes;
    }
    copy.category = copy.category || 'General';
    return copy;
  });
}

export function buildStrictlyRequiredTransactions(txsPayload = [], errMsg = '') {
  const msg = String(errMsg || '');
  return txsPayload.map((tx) => {
    const row = {
      id: tx.id,
      user_id: tx.user_id,
      account_id: tx.account_id,
      amount: tx.amount,
      type: tx.type,
      date: tx.date,
      description: tx.description,
      category: tx.category || 'General'
    };
    if (!msg.includes('category_id')) {
      row.category_id = tx.category_id || tx.category || null;
    }
    return row;
  });
}

/**
 * 3. DEUDAS Y PRÉSTAMOS
 */
export function buildDebtsPayload(debtsAndLoans = [], userId, nowIso = new Date().toISOString()) {
  return (debtsAndLoans || []).map(d => {
    const resolvedPerson = d.person || d.person_name || d.name || 'Sin nombre';
    const paymentsList = Array.isArray(d.payments) ? d.payments : [];
    const disbursementsList = Array.isArray(d.disbursements) ? d.disbursements : [];
    const totalDisbursed = disbursementsList.reduce((sum, disb) => sum + Number(disb?.amount || 0), 0);
    const initialAmount = Number(d.initialAmount ?? d.initial_amount ?? (Number(d.amount || d.totalAmount || 0) - totalDisbursed)) || Number(d.amount || d.totalAmount || 0);
    const totalAmount = initialAmount + totalDisbursed;
    const totalCapPaid = paymentsList.reduce((sum, p) => sum + (p.capitalAmount !== undefined ? Number(p.capitalAmount) : (p.mode === 'interest' ? 0 : Number(p.amount) || 0)), 0);
    const resolvedRemaining = Math.max(0, totalAmount - totalCapPaid);

    const rawDataPayload = {
      payments: paymentsList,
      disbursements: disbursementsList,
      initialAmount
    };

    return {
      id: ensureUUID(d.id),
      user_id: userId,
      person: resolvedPerson,
      person_name: resolvedPerson,
      name: resolvedPerson,
      amount: totalAmount,
      total_amount: totalAmount,
      remaining_amount: resolvedRemaining,
      type: d.type || 'payable',
      status: d.status || (resolvedRemaining <= 1 ? 'paid' : 'active'),
      due_date: d.dueDate || d.endDate || null,
      interest_rate: Number(d.interestRate || 0),
      notes: (paymentsList.length > 0 || disbursementsList.length > 0)
        ? `PAYMENTS_JSON:${JSON.stringify(rawDataPayload)}`
        : (d.notes || ''),
      raw_data: rawDataPayload,
      created_at: d.createdAt || d.startDate || nowIso,
      updated_at: nowIso
    };
  });
}

export function sanitizeDebtsOnSchemaError(debtsPayload = [], errMsg = '', errDetails = '') {
  const msg = String(errMsg || '');
  const details = String(errDetails || '');
  const hasNameColIssue = msg.includes("'name'") || msg.includes('column "name"');
  const hasPersonNameColIssue = msg.includes("'person_name'") || msg.includes('column "person_name"');
  const hasPersonColIssue = msg.includes("'person'") || msg.includes('column "person"');
  const hasRemainingColIssue = msg.includes("'remaining_amount'") || msg.includes('remaining_amount');
  const hasCurrentBalanceColIssue = msg.includes("'current_balance'") || msg.includes('column "current_balance"');
  const hasInterestIssue = msg.includes("'interest_rate'") || msg.includes('interest_rate');
  const hasUpdatedColIssue = msg.includes("'updated_at'") || msg.includes('updated_at');
  const hasStatusColIssue = msg.includes("'status'") || msg.includes('status');
  const hasNotesColIssue = msg.includes("'notes'") || msg.includes('notes') || details.includes('notes');
  const hasRawDataColIssue = msg.includes("'raw_data'") || msg.includes('raw_data') || details.includes('raw_data');

  return debtsPayload.map(d => {
    const resolvedPerson = d.person || d.person_name || d.name || 'Sin nombre';
    const item = {
      id: d.id,
      user_id: d.user_id,
      type: d.type,
      amount: d.amount,
      total_amount: d.total_amount
    };

    // Columnas prioritarias requeridas por Supabase (person y remaining_amount)
    if (!hasPersonColIssue) {
      item.person = resolvedPerson;
    }
    if (!hasRemainingColIssue) {
      item.remaining_amount = d.remaining_amount;
    }

    // Gestionar name vs person_name
    if (!hasNameColIssue) {
      item.name = resolvedPerson;
    }
    if (!hasPersonNameColIssue) {
      item.person_name = resolvedPerson;
    }

    // Persistencia segura de abonos y desembolsos (solo si no falló por estas columnas)
    if (!hasRawDataColIssue && d.raw_data && Object.keys(d.raw_data).length > 0) {
      item.raw_data = d.raw_data;
    }
    if (!hasNotesColIssue && d.notes) {
      item.notes = d.notes;
    }

    // Columnas opcionales
    if (!hasStatusColIssue) {
      item.status = d.status;
    }
    if (!hasInterestIssue) {
      item.interest_rate = d.interest_rate;
    }
    if (!hasUpdatedColIssue) {
      item.updated_at = d.updated_at;
    }

    return item;
  });
}

export function buildStrictlyEssentialDebts(debtsPayload = [], fallbackErrMsg = '', initialErrMsg = '') {
  const combinedErr = `${fallbackErrMsg || ''} ${initialErrMsg || ''}`;
  const fallbackHasNameColIssue = combinedErr.includes("'name'") || combinedErr.includes('column "name"');
  const fallbackHasPersonNameColIssue = combinedErr.includes("'person_name'") || combinedErr.includes('column "person_name"');
  const fallbackHasPersonColIssue = combinedErr.includes("'person'") || combinedErr.includes('column "person"');
  const fallbackHasRemainingColIssue = combinedErr.includes("'remaining_amount'") || combinedErr.includes('remaining_amount');
  const fallbackHasTotalAmountIssue = combinedErr.includes("'total_amount'");
  const fallbackHasAmountIssue = combinedErr.includes("'amount'");

  return debtsPayload.map(d => {
    const resolvedPerson = d.person || d.person_name || d.name || 'Sin nombre';
    const essential = {
      id: d.id,
      user_id: d.user_id,
      type: d.type
    };

    // Prioridad absoluta: person, remaining_amount, total_amount/amount
    if (!fallbackHasPersonColIssue) {
      essential.person = resolvedPerson;
    }
    if (!fallbackHasRemainingColIssue) {
      essential.remaining_amount = d.remaining_amount;
    }
    if (!fallbackHasPersonNameColIssue) {
      essential.person_name = resolvedPerson;
    }
    if (!fallbackHasNameColIssue) {
      essential.name = resolvedPerson;
    }

    if (!fallbackHasTotalAmountIssue) {
      essential.total_amount = d.total_amount;
    }
    if (!fallbackHasAmountIssue && fallbackHasTotalAmountIssue) {
      essential.amount = d.amount;
    }

    return essential;
  });
}

/**
 * 4. INVERSIONES
 */
export function buildInvestmentsPayload(investments = [], userId, nowIso = new Date().toISOString()) {
  return (investments || []).map(inv => {
    const invVal = Number(inv.invested_amount ?? inv.investedAmount ?? inv.amount ?? inv.totalInvested ?? inv.current_value ?? inv.currentValue ?? inv.currentAmount ?? 0);
    const currVal = Number(inv.current_value ?? inv.currentValue ?? inv.currentAmount ?? invVal);
    return {
      id: ensureUUID(inv.id),
      user_id: userId,
      name: inv.name || 'Inversión',
      category: inv.category || 'stock',
      subtype: inv.subtype || inv.type || 'stock',
      institution: inv.institution || null,
      currency: inv.currency || 'COP',
      invested_amount: invVal,
      current_value: currVal,
      ticker: inv.ticker || null,
      shares: inv.shares ? Number(inv.shares) : null,
      rate: inv.rate ? Number(inv.rate) : null,
      issue_date: inv.issue_date || inv.issueDate || null,
      due_date: inv.due_date || inv.dueDate || null,
      updated_at: nowIso
    };
  });
}

export function sanitizeInvestmentsOnSchemaError(invsPayload = [], errMsg = '') {
  const msg = String(errMsg || '');
  const hasSubtypeIssue = msg.includes("'subtype'") || msg.includes('subtype');
  const hasSharesIssue = msg.includes("'shares'") || msg.includes('shares');
  const hasRateIssue = msg.includes("'rate'") || msg.includes('rate');
  const hasDueDateIssue = msg.includes("'due_date'") || msg.includes('due_date');
  const hasIssueDateIssue = msg.includes("'issue_date'") || msg.includes('issue_date');
  const hasInstitutionIssue = msg.includes("'institution'") || msg.includes('institution');
  const hasInvestedAmtIssue = msg.includes("'invested_amount'") || msg.includes('invested_amount');
  const hasUpdatedIssue = msg.includes("'updated_at'") || msg.includes('updated_at');

  return invsPayload.map(inv => {
    const item = {
      id: inv.id,
      user_id: inv.user_id,
      name: inv.name,
      category: inv.category,
      currency: inv.currency,
      current_value: inv.current_value,
      ticker: inv.ticker
    };
    if (!hasInvestedAmtIssue) item.invested_amount = inv.invested_amount;
    else item.amount = inv.invested_amount;

    if (!hasSubtypeIssue) item.subtype = inv.subtype;
    if (!hasInstitutionIssue) item.institution = inv.institution;
    if (!hasSharesIssue) item.shares = inv.shares;
    if (!hasRateIssue) item.rate = inv.rate;
    if (!hasIssueDateIssue) item.issue_date = inv.issue_date;
    if (!hasDueDateIssue) item.due_date = inv.due_date;
    if (!hasUpdatedIssue) item.updated_at = inv.updated_at;
    return item;
  });
}

export function buildStrictlyEssentialInvs(invsPayload = []) {
  return invsPayload.map(inv => ({
    id: inv.id,
    user_id: inv.user_id,
    name: inv.name,
    invested_amount: inv.invested_amount,
    currency: inv.currency
  }));
}

/**
 * 5. PAGOS RECURRENTES
 */
export function buildRecurringPayload(
  recurringPayments = [],
  userId,
  nowIso = new Date().toISOString(),
  validAccountIds = null
) {
  return (recurringPayments || []).map(r => {
    let resolvedAccountId = (r.accountId || r.account_id) ? ensureUUID(r.accountId || r.account_id) : null;
    // Si se proporciona un conjunto de cuentas válidas, verificar integridad referencial
    if (resolvedAccountId && validAccountIds instanceof Set && !validAccountIds.has(resolvedAccountId)) {
      resolvedAccountId = null;
    }

    return {
      id: ensureUUID(r.id),
      user_id: userId,
      name: r.name || 'Suscripción',
      amount: Number(r.amount || 0),
      category: r.category || r.categoryName || 'General',
      frequency: r.frequency || 'monthly',
      billing_day: Number(r.billingDay || r.billing_day || 1),
      is_active: r.isActive !== false && r.active !== false && r.is_active !== false,
      account_id: resolvedAccountId,
      next_payment_date: r.nextPaymentDate || r.next_payment_date || null,
      type: r.type || 'expense',
      updated_at: nowIso
    };
  });
}


export function sanitizeRecurringOnSchemaError(recurringPayload = [], errMsg = '') {
  const msg = String(errMsg || '');
  const hasTypeColIssue = msg.includes("'type'") || msg.includes('type');
  const hasUpdatedColIssue = msg.includes("'updated_at'") || msg.includes('updated_at');
  const hasBillingDayColIssue = msg.includes("'billing_day'") || msg.includes('billing_day');

  return recurringPayload.map(r => {
    const baseObj = {
      id: r.id,
      user_id: r.user_id,
      name: r.name,
      amount: r.amount,
      category: r.category,
      frequency: r.frequency,
      is_active: r.is_active,
      account_id: r.account_id,
      next_payment_date: r.next_payment_date
    };
    if (!hasBillingDayColIssue) {
      baseObj.billing_day = r.billing_day;
    }
    if (!hasTypeColIssue) {
      baseObj.type = r.type;
    }
    if (!hasUpdatedColIssue) {
      baseObj.updated_at = r.updated_at;
    }
    return baseObj;
  });
}

export function buildStrictlyEssentialRec(recurringPayload = []) {
  return recurringPayload.map(r => ({
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    amount: r.amount,
    category: r.category,
    frequency: r.frequency,
    is_active: r.is_active
  }));
}

/**
 * 6. PRESUPUESTOS
 */
export function buildBudgetsPayload(
  currentBudgets = {},
  userId,
  savedGlobalId = null,
  nowIso = new Date().toISOString()
) {
  if (!currentBudgets) return [];
  const globalLimit = Number(currentBudgets.global || 0);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const globalBudgetId = (savedGlobalId && uuidRegex.test(savedGlobalId))
    ? savedGlobalId
    : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ensureUUID(`${userId}-global-budget`));

  const globalBudgetRecord = {
    id: currentBudgets.id || globalBudgetId,
    user_id: userId,
    name: currentBudgets.name || 'Límite Global',
    category: currentBudgets.category || 'General',
    period: currentBudgets.period || 'monthly',
    amount: Number(currentBudgets.amount ?? globalLimit) || 0,
    is_global: currentBudgets.is_global !== undefined ? Boolean(currentBudgets.is_global) : true,
    updated_at: nowIso
  };

  const budgetsPayload = [globalBudgetRecord];

  if (currentBudgets.categories && typeof currentBudgets.categories === 'object') {
    Object.entries(currentBudgets.categories).forEach(([catId, amount]) => {
      const numAmt = Number(amount || 0);
      if (numAmt > 0) {
        budgetsPayload.push({
          id: ensureUUID(`${userId}-budget-${catId}`),
          user_id: userId,
          name: `Presupuesto ${catId}`,
          category: catId || 'General',
          category_id: catId,
          period: currentBudgets.period || 'monthly',
          amount: numAmt,
          is_global: false,
          updated_at: nowIso
        });
      }
    });
  }

  return budgetsPayload;
}

export function buildEssentialBudgets(budgetsPayload = []) {
  return (budgetsPayload || []).map(b => ({
    id: b.id,
    user_id: b.user_id,
    name: b.name || 'Límite Global',
    category: b.category || 'General',
    period: b.period || 'monthly',
    amount: b.amount,
    updated_at: b.updated_at
  }));
}
