/**
 * debtFormService.js
 * Validación, cálculos financieros y armado de payload de deudas y préstamos.
 */

import { getNextPaymentDate, calculateElapsedMonths } from '../../utils/debtAlerts';
import { safeNumber } from '../../utils/financeMath';
import { parseFormattedAmount } from '../../utils/currencyFormatter';

export const normalizeDebtType = (val) => {
  if (!val) return 'receivable';
  const s = String(val).toLowerCase().trim();
  return ['payable', 'debo', 'borrowed', 'debt', 'deudas'].includes(s) || s.includes('prestaron') ? 'payable' : 'receivable';
};

export const parseFrequency = (rawFreq) => {
  if (!rawFreq) return 'Único';
  const f = rawFreq.toLowerCase();
  if (f.includes('quincen')) return 'Quincenal';
  if (f.includes('mensual')) return 'Mensual';
  if (f.includes('semanal')) return 'Semanal';
  return 'Único';
};

export const calculateComputedDueDate = ({
  frequency,
  biweeklyDay1 = 15,
  biweeklyDay2 = 30,
  dueDay = 15,
  dueDate = '',
  startDate,
  getNextPaymentDateFn = getNextPaymentDate
}) => {
  if (frequency === 'Único') return dueDate;
  const tempItem = { frequency, biweeklyDays: [biweeklyDay1, biweeklyDay2], dueDay, startDate };
  const nextDate = getNextPaymentDateFn?.(tempItem, new Date());
  return (nextDate && !isNaN(nextDate.getTime())) ? nextDate.toISOString().split('T')[0] : (dueDate || new Date().toISOString().split('T')[0]);
};

export const calculateAccruedInterest = ({
  totalAmount,
  interestRate,
  startDate,
  currentDate = new Date(),
  parseFormattedAmountFn = parseFormattedAmount,
  calculateElapsedMonthsFn = calculateElapsedMonths
}) => {
  const principalAmount = parseFormattedAmountFn ? parseFormattedAmountFn(totalAmount) : Number(totalAmount) || 0;
  const monthlyRate = parseFloat(interestRate) || 0;
  const monthsElapsed = calculateElapsedMonthsFn ? calculateElapsedMonthsFn(startDate, currentDate) : 0;
  const accruedInterest = (monthsElapsed > 0 && monthlyRate > 0 && principalAmount > 0)
    ? Math.round(principalAmount * (monthlyRate / 100) * monthsElapsed)
    : 0;

  return { principalAmount, monthlyRate, monthsElapsed, accruedInterest, totalOwedWithInterest: principalAmount + accruedInterest };
};

export const calculateDebtRemainingBalances = ({ baseAmount, accruedInterest = 0, payments = [] }) => {
  const base = Number(baseAmount) || 0;
  const pmts = Array.isArray(payments) ? payments : [];

  let totalCapitalPaid = 0;
  let totalInterestPaid = 0;

  pmts.forEach(p => {
    if (!p) return;
    const amt = safeNumber(p.amount);
    if (p.capitalAmount !== undefined) totalCapitalPaid += safeNumber(p.capitalAmount);
    else if (p.mode !== 'interest') totalCapitalPaid += amt;

    if (p.interestAmount !== undefined) totalInterestPaid += safeNumber(p.interestAmount);
    else if (p.mode === 'interest') totalInterestPaid += amt;
  });

  const remainingCapital = Math.max(0, base - totalCapitalPaid);
  const remainingInterest = Math.max(0, accruedInterest - totalInterestPaid);

  return { totalCapitalPaid, totalInterestPaid, remainingCapital, remainingInterest, totalRemaining: remainingCapital + remainingInterest };
};

export const buildDebtPayload = ({
  editingItem = null,
  type = 'receivable',
  name = '',
  totalAmount,
  interestRate = '',
  insuranceFee = '',
  installments = '1',
  startDate,
  dueDate,
  computedDueDate,
  frequency = 'Único',
  biweeklyDay1 = 15,
  biweeklyDay2 = 30,
  dueDay = 15,
  notes = '',
  parseFormattedAmountFn = parseFormattedAmount,
  calculateElapsedMonthsFn = calculateElapsedMonths
}) => {
  const base = parseFormattedAmountFn ? parseFormattedAmountFn(totalAmount) : Number(totalAmount) || 0;
  const finalTargetDate = frequency === 'Único' ? dueDate : (computedDueDate || dueDate);

  const { monthsElapsed, accruedInterest } = calculateAccruedInterest({
    totalAmount, interestRate, startDate, parseFormattedAmountFn, calculateElapsedMonthsFn
  });

  const existingPayments = editingItem?.payments || [];
  const { remainingCapital, remainingInterest, totalRemaining } = calculateDebtRemainingBalances({
    baseAmount: base, accruedInterest, payments: existingPayments
  });

  const cleanName = (name || '').trim();

  return {
    id: editingItem ? editingItem.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'debt-' + Date.now()),
    type: normalizeDebtType(type),
    name: cleanName,
    personName: cleanName,
    totalAmount: base,
    principalAmount: base,
    accruedInterest,
    monthsElapsed,
    remainingCapital,
    remainingInterest,
    totalRemaining,
    remainingAmount: remainingCapital,
    interestRate: parseFloat(interestRate) || 0,
    insuranceFee: parseFloat(insuranceFee) || 0,
    installments: parseInt(installments, 10) || 1,
    startDate: startDate || new Date().toISOString().split('T')[0],
    dueDate: finalTargetDate,
    collectionDate: finalTargetDate,
    frequency,
    biweeklyDays: frequency === 'Quincenal' ? [parseInt(biweeklyDay1, 10), parseInt(biweeklyDay2, 10)] : null,
    dueDay: frequency === 'Mensual' ? parseInt(dueDay, 10) : null,
    notes: (notes || '').trim(),
    payments: existingPayments
  };
};

export const formatPreviewDueDate = (computedDueDate) => {
  if (!computedDueDate) return '';
  const parts = computedDueDate.split('-');
  if (parts.length !== 3) return computedDueDate;
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).toLocaleDateString('es-CO', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
};
