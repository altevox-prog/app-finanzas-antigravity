import { generateUUID } from '../../utils/recordMerger';

/**
 * getTodayLocalString
 * Retorna la fecha local actual en formato YYYY-MM-DD evitando desfases por UTC.
 */
export function getTodayLocalString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * normalizeDateToYYYYMMDD
 * Normaliza cualquier formato de fecha (ISO con tiempo, timestamp, cadena con barras o guiones)
 * a formato estricto YYYY-MM-DD para comparaciones lexicográficas seguras.
 *
 * @param {string|number|Date} rawDate
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function normalizeDateToYYYYMMDD(rawDate) {
  if (!rawDate) return '';
  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (trimmed.includes('T')) return trimmed.split('T')[0];
    if (trimmed.includes(' ')) return trimmed.split(' ')[0];
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return trimmed;
  }
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
}

/**
 * advanceNextDate
 * Avanza una fecha YYYY-MM-DD según la frecuencia especificada preservando el día de corte.
 *
 * @param {string} currentDateStr Fecha actual en formato YYYY-MM-DD
 * @param {string} frequency 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'yearly'
 * @param {number|string} targetBillingDay Día del mes preferido (1-31)
 * @returns {string} Nueva fecha en formato YYYY-MM-DD
 */
export function advanceNextDate(currentDateStr, frequency = 'monthly', targetBillingDay = null) {
  if (!currentDateStr) {
    return getTodayLocalString();
  }

  const parts = currentDateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const date = new Date(y, m, d);

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'bimonthly':
      date.setMonth(date.getMonth() + 2);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'semiannual':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'monthly':
    default: {
      const origDay = targetBillingDay ? parseInt(targetBillingDay, 10) : d;
      date.setDate(1); // Evitar salto indeseado por meses con menos de 31 días
      date.setMonth(date.getMonth() + 1);
      const daysInNewMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      date.setDate(Math.min(origDay, daysInNewMonth));
      break;
    }
  }

  const newY = date.getFullYear();
  const newM = String(date.getMonth() + 1).padStart(2, '0');
  const newD = String(date.getDate()).padStart(2, '0');
  return `${newY}-${newM}-${newD}`;
}

// Bloqueo en memoria para prevenir ejecuciones concurrentes simultáneas
let isProcessingDue = false;
const processedKeySet = new Set();

/**
 * processDueRecurringPayments
 * Evalúa los ítems donde `active !== false` y `nextPaymentDate <= fechaActual`:
 *  - Genera la transacción automática en `transactions`.
 *  - Avanza la `nextPaymentDate` del recurrente según su frecuencia para evitar duplicados.
 *  - Persiste los cambios tanto en el estado local como en la sincronización remota habitual.
 *
 * @param {Object} options
 * @param {Array} options.recurringPayments Lista de pagos recurrentes
 * @param {Function} options.onAddTransaction Callback para insertar la transacción
 * @param {Function} options.onUpdateRecurring Callback para actualizar el recurrente
 * @returns {Promise<{ processedCount: number, generatedTransactions: Array }>}
 */
export async function processDueRecurringPayments({
  recurringPayments = [],
  onAddTransaction,
  onUpdateRecurring
}) {
  if (isProcessingDue || !onAddTransaction || !onUpdateRecurring) {
    return { processedCount: 0, generatedTransactions: [] };
  }

  if (!Array.isArray(recurringPayments) || recurringPayments.length === 0) {
    return { processedCount: 0, generatedTransactions: [] };
  }

  const todayStr = getTodayLocalString();
  const dueItems = recurringPayments.filter((item) => {
    if (!item) return false;
    const isActive = item.isActive !== false && item.active !== false;
    if (!isActive) return false;
    // Solo automáticos si el modo está configurado; si no hay modo, por defecto es auto
    if (item.mode === 'manual') return false;

    const rawNextDate = item.nextPaymentDate || item.nextDate || item.next_date;
    const nextDate = normalizeDateToYYYYMMDD(rawNextDate);
    if (!nextDate) return false;

    return nextDate <= todayStr;
  });

  if (dueItems.length === 0) {
    return { processedCount: 0, generatedTransactions: [] };
  }

  isProcessingDue = true;
  const generatedTransactions = [];

  try {
    for (const item of dueItems) {
      const nextDate = item.nextPaymentDate || item.nextDate || item.next_date;
      const dedupeKey = `${item.id}_${nextDate}`;

      if (processedKeySet.has(dedupeKey)) {
        continue;
      }
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

  return {
    processedCount: generatedTransactions.length,
    generatedTransactions
  };
}
