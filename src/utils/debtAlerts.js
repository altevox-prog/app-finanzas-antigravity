/**
 * debtAlerts.js
 * Recordatorios y alertas de deudas/cobros con 1 día de anticipación.
 */

import { safeNumber } from './financeMath';

export const calculateElapsedMonths = (disbursementDate) => {
  if (!disbursementDate) return 0;
  const start = new Date(disbursementDate);
  if (isNaN(start.getTime())) return 0;
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months = Math.max(0, months - 1);
  return Math.max(0, months);
};

export function getNextPaymentDate(item, baseDate = new Date()) {
  if (!item) return null;
  const freq = (item.frequency || '').toLowerCase().trim();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const todayDate = baseDate.getDate();

  // 1. Quincenal
  if (freq.includes('quincen')) {
    const rawDays = Array.isArray(item.biweeklyDays) && item.biweeklyDays.length === 2 ? item.biweeklyDays : [15, 30];
    const days = rawDays.map(d => parseInt(d, 10)).filter(d => !isNaN(d)).sort((a, b) => a - b);
    const day1 = days[0] || 15;
    const day2 = Math.min(days[1] || 30, new Date(year, month + 1, 0).getDate());

    if (todayDate < day1) return new Date(year, month, day1);
    if (todayDate < day2) return new Date(year, month, day2);
    return new Date(year, month + 1, day1);
  }

  // 2. Mensual
  if (freq.includes('mensual')) {
    const day = parseInt(item.dueDay || (item.dueDate?.split('-')[2]) || (item.collectionDate?.split('-')[2]) || 15, 10);
    const dayThis = Math.min(day, new Date(year, month + 1, 0).getDate());
    if (todayDate < dayThis) return new Date(year, month, dayThis);
    return new Date(year, month + 1, Math.min(day, new Date(year, month + 2, 0).getDate()));
  }

  // 3. Semanal
  if (freq.includes('semanal') && item.startDate) {
    const start = new Date(item.startDate + 'T00:00:00');
    if (!isNaN(start.getTime())) {
      const diffDays = Math.floor((baseDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return start;
      const daysToNext = 7 - (diffDays % 7);
      const next = new Date(baseDate);
      next.setDate(baseDate.getDate() + (daysToNext === 7 ? 0 : daysToNext));
      return next;
    }
  }

  // 4. Pago Único / Fecha fija
  const dateStr = item.type === 'receivable' ? (item.collectionDate || item.dueDate) : (item.dueDate || item.collectionDate);
  if (dateStr && typeof dateStr === 'string' && dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }

  return null;
}

export function isTomorrow(dateInput) {
  if (!dateInput) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateInput instanceof Date) return dateInput.toDateString() === tomorrow.toDateString();

  if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).toDateString() === tomorrow.toDateString();
    }
  }

  const num = parseInt(dateInput, 10);
  return !isNaN(num) && num >= 1 && num <= 31 && num === tomorrow.getDate();
}

export function calculateDebtOutstanding(item) {
  const base = safeNumber(item.totalAmount);
  const totalToPay = base + (base * (safeNumber(item.interestRate) / 100)) + safeNumber(item.insuranceFee);
  const payments = Array.isArray(item.payments) ? item.payments : [];
  const totalPaid = payments.reduce((sum, p) => sum + safeNumber(p.amount), 0);
  const totalCapitalPaid = payments.reduce((sum, p) => {
    if (p.capitalAmount !== undefined) return sum + safeNumber(p.capitalAmount);
    return sum + (p.mode === 'interest' ? 0 : safeNumber(p.amount));
  }, 0);
  const outstandingBalance = item.remainingAmount !== undefined ? Math.max(0, safeNumber(item.remainingAmount)) : Math.max(0, base - totalCapitalPaid);

  return { base, totalToPay, totalPaid, totalCapitalPaid, outstandingBalance, isPaid: outstandingBalance <= 1 };
}

export function getTomorrowDebtAlerts(debtsAndLoans = [], accounts = []) {
  const alerts = [];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  (debtsAndLoans || []).forEach(item => {
    const stats = calculateDebtOutstanding(item);
    if (stats.isPaid) return;

    const targetDate = getNextPaymentDate(item, new Date());
    const isItemTomorrow = (targetDate instanceof Date && !isNaN(targetDate.getTime()))
      ? targetDate.toDateString() === tomorrow.toDateString()
      : isTomorrow(item.type === 'receivable' ? (item.collectionDate || item.dueDate) : (item.dueDate || item.collectionDate));

    if (isItemTomorrow) {
      const name = item.personName || item.name || (item.type === 'receivable' ? 'Deudor' : 'Entidad');
      const isPayable = item.type === 'payable';

      alerts.push({
        id: `tomorrow-${isPayable ? 'pago' : 'cobro'}-${item.id}`,
        debtId: item.id,
        rawItem: item,
        type: item.type,
        name,
        title: isPayable ? `⚠️ Mañana vence el pago de tu préstamo: ${name}` : `💵 Mañana corresponde cobrar la cuota a: ${name}`,
        message: isPayable ? `Mañana vence el pago o cuota de tu préstamo con ${name}.` : `Mañana corresponde cobrar la cuota o saldo a ${name}.`,
        amount: stats.outstandingBalance,
        date: targetDate ? targetDate.toISOString().split('T')[0] : (item.dueDate || item.collectionDate || 'Mañana'),
        frequency: item.frequency
      });
    }
  });

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
