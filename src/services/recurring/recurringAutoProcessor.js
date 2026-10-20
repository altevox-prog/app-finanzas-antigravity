/**
 * recurringAutoProcessor.js
 * Detección, procesamiento y avance de pagos recurrentes vencidos.
 */

import { generateUUID } from '../../utils/recordMerger';

export function getTodayLocalString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeDateToYYYYMMDD(rawDate) {
  if (!rawDate) return '';
  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (trimmed.includes('T')) return trimmed.split('T')[0];
    if (trimmed.includes(' ')) return trimmed.split(' ')[0];
    if (trimmed.includes('/')) {
      const p = trimmed.split('/');
      if (p.length === 3 && p[2].length === 4) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    }
    return trimmed;
  }
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

export function advanceNextDate(currentDateStr, frequency = 'monthly', targetBillingDay = null) {
  if (!currentDateStr) return getTodayLocalString();

  const [y, m, d] = currentDateStr.split('-').map(n => parseInt(n, 10));
  const date = new Date(y, m - 1, d);

  if (frequency === 'weekly') date.setDate(date.getDate() + 7);
  else if (frequency === 'biweekly') date.setDate(date.getDate() + 14);
  else if (frequency === 'bimonthly') date.setMonth(date.getMonth() + 2);
  else if (frequency === 'quarterly') date.setMonth(date.getMonth() + 3);
  else if (frequency === 'semiannual') date.setMonth(date.getMonth() + 6);
  else if (frequency === 'yearly') date.setFullYear(date.getFullYear() + 1);
  else {
    // monthly default
    const origDay = targetBillingDay ? parseInt(targetBillingDay, 10) : d;
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    const maxDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(origDay, maxDays));
  }

  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  const nd = String(date.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

let isProcessingDue = false;
const processedKeySet = new Set();

export async function processDueRecurringPayments({
  recurringPayments = [],
  onAddTransaction,
  onUpdateRecurring
}) {
  if (isProcessingDue || !onAddTransaction || !onUpdateRecurring || !Array.isArray(recurringPayments) || recurringPayments.length === 0) {
    return { processedCount: 0, generatedTransactions: [] };
  }

  const todayStr = getTodayLocalString();
  const dueItems = recurringPayments.filter((item) => {
    if (!item || item.isActive === false || item.active === false || item.mode === 'manual') return false;
    const rawNextDate = item.nextPaymentDate || item.nextDate || item.next_date;
    const nextDate = normalizeDateToYYYYMMDD(rawNextDate);
    return nextDate && nextDate <= todayStr;
  });

  if (dueItems.length === 0) return { processedCount: 0, generatedTransactions: [] };

  isProcessingDue = true;
  const generatedTransactions = [];

  try {
    for (const item of dueItems) {
      const nextDate = item.nextPaymentDate || item.nextDate || item.next_date;
      const dedupeKey = `${item.id}_${nextDate}`;
      if (processedKeySet.has(dedupeKey)) continue;
      processedKeySet.add(dedupeKey);

      const type = item.type === 'income' ? 'income' : 'expense';
      const description = item.name || item.description || item.note || 'Movimiento recurrente';
      const amount = Number(item.amount) || 0;

      const newTx = {
        id: generateUUID(),
        description,
        note: description,
        amount,
        originalAmount: Number(item.originalAmount || item.amount) || amount,
        currency: item.currency || item.originalCurrency || 'COP',
        originalCurrency: item.originalCurrency || item.currency || 'COP',
        exchangeRate: Number(item.exchangeRate) || 1,
        type,
        category: item.categoryName || item.category || 'Recurrentes',
        categoryName: item.categoryName || item.category || 'Recurrentes',
        categoryId: item.categoryId || item.category_id || '',
        subcategoryId: item.subcategoryId || item.subcategory_id || null,
        subcategoryName: item.subcategoryName || null,
        accountId: item.accountId || item.account_id || '',
        accountName: item.accountName || 'Principal',
        date: nextDate,
        createdAt: new Date().toISOString(),
        isRecurring: true,
        recurringId: item.id
      };

      const newNextDate = advanceNextDate(nextDate, item.frequency, item.billingDay);
      const updatedItem = {
        ...item,
        nextDate: newNextDate,
        next_date: newNextDate,
        nextPaymentDate: newNextDate,
        lastProcessedDate: nextDate,
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await onAddTransaction(newTx);
      await onUpdateRecurring(updatedItem);
      generatedTransactions.push(newTx);
    }
  } catch (err) {
    console.error('[recurringAutoProcessor] Error procesando pagos recurrentes vencidos:', err);
  } finally {
    isProcessingDue = false;
  }

  return { processedCount: generatedTransactions.length, generatedTransactions };
}
