// Utilidades para recordatorios y alertas de deudas/cobros con 1 día de anticipación
import { safeNumber } from './financeMath';

/**
 * Calcula la diferencia en meses transcurridos entre la fecha de desembolso y hoy
 */
export const calculateElapsedMonths = (disbursementDate) => {
  if (!disbursementDate) return 0;
  const start = new Date(disbursementDate);
  if (isNaN(start.getTime())) return 0;
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months = Math.max(0, months - 1);
  return Math.max(0, months);
};

/**
 * Calcula la próxima fecha de pago o cobro según la frecuencia configurada.
 * Soporta: Quincenal (días 15 y 30 o personalizados), Mensual (día del mes), Semanal y Único.
 */
export function getNextPaymentDate(item, baseDate = new Date()) {
  if (!item) return null;

  const freq = (item.frequency || '').toLowerCase().trim();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const todayDate = baseDate.getDate();

  // 1. Quincenal (por defecto días 15 y 30, o biweeklyDays definidos)
  if (freq.includes('quincen')) {
    const rawDays = Array.isArray(item.biweeklyDays) && item.biweeklyDays.length === 2
      ? item.biweeklyDays
      : [15, 30];
    const days = rawDays.map(d => parseInt(d, 10)).filter(d => !isNaN(d)).sort((a, b) => a - b);
    const day1 = days[0] || 15;
    const day2 = days[1] || 30;

    const lastDayCurrentMonth = new Date(year, month + 1, 0).getDate();
    const effectiveDay2 = Math.min(day2, lastDayCurrentMonth);

    if (todayDate < day1) {
      return new Date(year, month, day1);
    } else if (todayDate < effectiveDay2) {
      return new Date(year, month, effectiveDay2);
    } else {
      // Pasa a la primera quincena del próximo mes
      return new Date(year, month + 1, day1);
    }
  }

  // 2. Mensual (día específico del mes 1 a 31)
  if (freq.includes('mensual')) {
    let day = 15;
    if (item.dueDay) {
      day = parseInt(item.dueDay, 10);
    } else if (item.dueDate && item.dueDate.includes('-')) {
      day = parseInt(item.dueDate.split('-')[2], 10) || 15;
    } else if (item.collectionDate && item.collectionDate.includes('-')) {
      day = parseInt(item.collectionDate.split('-')[2], 10) || 15;
    }

    const lastDayCurrentMonth = new Date(year, month + 1, 0).getDate();
    const effectiveDayThisMonth = Math.min(day, lastDayCurrentMonth);

    if (todayDate < effectiveDayThisMonth) {
      return new Date(year, month, effectiveDayThisMonth);
    } else {
      const lastDayNextMonth = new Date(year, month + 2, 0).getDate();
      const effectiveDayNextMonth = Math.min(day, lastDayNextMonth);
      return new Date(year, month + 1, effectiveDayNextMonth);
    }
  }

  // 3. Semanal (recurrencia cada 7 días)
  if (freq.includes('semanal')) {
    if (item.startDate) {
      const start = new Date(item.startDate + 'T00:00:00');
      if (!isNaN(start.getTime())) {
        const diffMs = baseDate.getTime() - start.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return start;
        const daysToNext = 7 - (diffDays % 7);
        const next = new Date(baseDate);
        next.setDate(baseDate.getDate() + (daysToNext === 7 ? 0 : daysToNext));
        return next;
      }
    }
  }

  // 4. Pago Único o Fecha fija específica (dueDate o collectionDate)
  const dateStr = item.type === 'receivable' ? (item.collectionDate || item.dueDate) : (item.dueDate || item.collectionDate);
  if (dateStr && typeof dateStr === 'string' && dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
  }

  return null;
}

/**
 * Comprueba estrictamente si la fecha destino es mañana.
 */
export function isTomorrow(dateInput) {
  if (!dateInput) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateInput instanceof Date) {
    return dateInput.toDateString() === tomorrow.toDateString();
  }

  // Caso 1: Cadena con formato YYYY-MM-DD
  if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const target = new Date(y, m, d);
      return target.toDateString() === tomorrow.toDateString();
    }
  }

  // Caso 2: Día del mes numérico (ej: 15)
  const num = parseInt(dateInput, 10);
  if (!isNaN(num) && num >= 1 && num <= 31) {
    return num === tomorrow.getDate();
  }

  return false;
}

export function calculateDebtOutstanding(item) {
  const base = safeNumber(item.totalAmount);
  const rate = safeNumber(item.interestRate);
  const insurance = safeNumber(item.insuranceFee);
  const interestAmount = base * (rate / 100);
  const totalToPay = base + interestAmount + insurance;
  const payments = Array.isArray(item.payments) ? item.payments : [];
  const totalPaid = payments.reduce((sum, p) => sum + safeNumber(p.amount), 0);
  const totalCapitalPaid = payments.reduce((sum, p) => {
    if (p.capitalAmount !== undefined) return sum + safeNumber(p.capitalAmount);
    if (p.mode === 'interest') return sum;
    return sum + safeNumber(p.amount);
  }, 0);
  const outstandingBalance = item.remainingAmount !== undefined
    ? Math.max(0, safeNumber(item.remainingAmount))
    : Math.max(0, base - totalCapitalPaid);
  return {
    base,
    totalToPay,
    totalPaid,
    totalCapitalPaid,
    outstandingBalance,
    isPaid: outstandingBalance <= 1
  };
}

export function getTomorrowDebtAlerts(debtsAndLoans = [], accounts = []) {
  const alerts = [];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Revisión de Préstamos y Deudas con cálculo según frecuencia
  (debtsAndLoans || []).forEach(item => {
    const stats = calculateDebtOutstanding(item);
    if (stats.isPaid) return;

    // Obtener próxima fecha calculada
    const targetDate = getNextPaymentDate(item, new Date());
    let isItemTomorrow = false;

    if (targetDate && targetDate instanceof Date && !isNaN(targetDate.getTime())) {
      isItemTomorrow = targetDate.toDateString() === tomorrow.toDateString();
    } else {
      const fixed = item.type === 'receivable' ? (item.collectionDate || item.dueDate) : (item.dueDate || item.collectionDate);
      isItemTomorrow = isTomorrow(fixed);
    }

    if (isItemTomorrow) {
      const displayName = item.personName || item.name || (item.type === 'receivable' ? 'Deudor' : 'Entidad');

      if (item.type === 'payable') {
        // Debo
        alerts.push({
          id: `tomorrow-pago-${item.id}`,
          debtId: item.id,
          rawItem: item,
          type: 'payable',
          name: displayName,
          title: `⚠️ Mañana vence el pago de tu préstamo: ${displayName}`,
          message: `Mañana vence el pago o cuota de tu préstamo con ${displayName}.`,
          amount: stats.outstandingBalance,
          date: targetDate ? targetDate.toISOString().split('T')[0] : (item.dueDate || 'Mañana'),
          frequency: item.frequency
        });
      } else {
        // Me deben
        alerts.push({
          id: `tomorrow-cobro-${item.id}`,
          debtId: item.id,
          rawItem: item,
          type: 'receivable',
          name: displayName,
          title: `💵 Mañana corresponde cobrar la cuota a: ${displayName}`,
          message: `Mañana corresponde cobrar la cuota o saldo a ${displayName}.`,
          amount: stats.outstandingBalance,
          date: targetDate ? targetDate.toISOString().split('T')[0] : (item.collectionDate || item.dueDate || 'Mañana'),
          frequency: item.frequency
        });
      }
    }
  });

  // 2. Revisión de Tarjetas de Crédito con fecha límite mañana
  (accounts || []).filter(acc => acc.type === 'card' || acc.type === 'credit').forEach(acc => {
    if (acc.paymentDueDate && isTomorrow(acc.paymentDueDate)) {
      alerts.push({
        id: `tomorrow-card-${acc.id}`,
        accountId: acc.id,
        rawAccount: acc,
        type: 'payable',
        name: acc.name,
        title: `⚠️ Mañana vence el pago de tu tarjeta: ${acc.name}`,
        message: `Mañana es la fecha límite de pago para tu tarjeta ${acc.name}.`,
        amount: acc.balance < 0 ? Math.abs(acc.balance) : 0,
        date: `Día ${acc.paymentDueDate}`
      });
    }
  });

  return alerts;
}
