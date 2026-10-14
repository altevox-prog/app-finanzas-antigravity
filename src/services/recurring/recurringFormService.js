import { parseFormattedAmount, formatCurrencyInput } from '../../utils/currencyFormatter';

/**
 * normalizeRecurringDate
 * Normaliza cualquier formato de fecha o fallback a cadena YYYY-MM-DD segura.
 *
 * @param {string|Date|null} rawDate
 * @returns {string} Fecha en formato ISO YYYY-MM-DD
 */
export function normalizeRecurringDate(rawDate) {
  if (!rawDate) {
    return new Date().toISOString().split('T')[0];
  }
  try {
    return new Date(rawDate).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * normalizeEditingRecurringItem
 * Prepara y normaliza los datos iniciales para el formulario recurrente,
 * tanto en modo creación como en edición de un registro existente.
 *
 * @param {Object|null} activeEditing
 * @param {Object} options
 * @returns {Object} Estado inicial normalizado del formulario
 */
export function normalizeEditingRecurringItem(
  activeEditing,
  { accounts = [], trm = 4000, enableDecimals = false } = {}
) {
  if (activeEditing) {
    const curr = activeEditing.originalCurrency || activeEditing.currency || 'COP';
    const origAmt = (curr !== 'COP' && activeEditing.originalAmount != null)
      ? activeEditing.originalAmount
      : activeEditing.amount;

    const rawDate = activeEditing.nextDate 
      || activeEditing.next_date 
      || activeEditing.date 
      || activeEditing.billingDate;

    return {
      type: activeEditing.type || 'expense',
      name: activeEditing.name || '',
      currency: curr,
      exchangeRate: activeEditing.exchangeRate
        ? String(activeEditing.exchangeRate)
        : (curr === 'EUR' ? '4400' : String(trm || 4000)),
      amount: origAmt ? formatCurrencyInput(origAmt, enableDecimals) : '',
      mode: activeEditing.mode || 'auto',
      frequency: activeEditing.frequency || 'monthly',
      billingDay: activeEditing.billingDay ? String(activeEditing.billingDay) : '1',
      billingDayOfWeek: activeEditing.billingDayOfWeek != null ? activeEditing.billingDayOfWeek : 1,
      nextDate: normalizeRecurringDate(rawDate),
      categoryId: activeEditing.categoryId || activeEditing.category_id || activeEditing.category || '',
      subcategoryId: activeEditing.subcategoryId || activeEditing.subcategory_id || '',
      accountId: activeEditing.accountId || activeEditing.account_id || '',
      note: activeEditing.note || activeEditing.notes || ''
    };
  }

  const safeAccounts = Array.isArray(accounts) ? accounts.filter(Boolean) : [];
  const today = new Date();

  return {
    type: 'expense',
    name: '',
    currency: 'COP',
    exchangeRate: String(trm || 4000),
    amount: '',
    mode: 'auto',
    frequency: 'monthly',
    nextDate: today.toISOString().split('T')[0],
    billingDay: String(today.getDate()),
    billingDayOfWeek: 1,
    categoryId: '',
    subcategoryId: '',
    accountId: safeAccounts[0]?.id || '',
    note: ''
  };
}

/**
 * buildRecurringPayload
 * Convierte y ensambla el payload final para la persistencia del pago recurrente.
 *
 * @param {Object} formData Valores actuales de los campos del formulario
 * @param {Object} contextData Dependencias contextuales (categorías, cuentas, edición previa, etc.)
 * @returns {Object|null} Payload estructurado o null si no supera validación
 */
export function buildRecurringPayload(formData, contextData = {}) {
  const {
    name = '',
    type = 'expense',
    amount = '',
    currency = 'COP',
    exchangeRate = '1',
    mode = 'auto',
    frequency = 'monthly',
    nextDate,
    billingDay = '1',
    billingDayOfWeek = 1,
    categoryId = '',
    subcategoryId = '',
    accountId = '',
    note = ''
  } = formData || {};

  const {
    activeEditing = null,
    localCategories = [],
    accounts = [],
    enableDecimals = false
  } = contextData;

  const numAmount = parseFormattedAmount(amount);
  if (!name.trim() || isNaN(numAmount) || numAmount <= 0) {
    return null;
  }

  const rateNum = currency === 'COP' ? 1 : (parseFloat(exchangeRate) || 1);
  const calculatedAmount = currency === 'COP' ? numAmount : (numAmount * rateNum);
  const finalAmount = enableDecimals
    ? Number(calculatedAmount.toFixed(2))
    : Math.round(calculatedAmount);

  const safeCategories = Array.isArray(localCategories) ? localCategories : [];
  const safeAccounts = Array.isArray(accounts) ? accounts : [];

  const cat = safeCategories.find((c) => c?.id === categoryId);
  const subcat = Array.isArray(cat?.subcategories)
    ? cat.subcategories.find((s) => s?.id === subcategoryId)
    : null;
  const acc = safeAccounts.find((a) => a?.id === accountId);

  const nowIso = new Date().toISOString();

  return {
    id: activeEditing ? activeEditing.id : ('rec-' + Date.now()),
    name: name.trim(),
    type,
    amount: finalAmount,
    originalAmount: numAmount,
    originalCurrency: currency,
    exchangeRate: rateNum,
    mode,
    frequency,
    nextDate: nextDate,
    next_date: nextDate,
    billingDay: frequency === 'monthly' ? parseInt(billingDay, 10) || 1 : null,
    billingDays: frequency === 'biweekly' ? [15, 30] : null,
    billingDayOfWeek: frequency === 'weekly' ? billingDayOfWeek : null,
    accountId,
    account_id: accountId,
    accountName: acc ? acc.name : 'Principal',
    categoryId,
    category_id: categoryId,
    categoryName: cat ? cat.name : 'General',
    subcategoryId: subcat ? subcat.id : null,
    subcategory_id: subcat ? subcat.id : null,
    subcategoryName: subcat ? subcat.name : null,
    isActive: activeEditing ? (activeEditing.isActive !== false) : true,
    note: note.trim(),
    notes: note.trim(),
    updatedAt: nowIso,
    updated_at: nowIso,
    createdAt: activeEditing?.createdAt || nowIso
  };
}
