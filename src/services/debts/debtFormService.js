/**
 * Servicio para validación, cálculos financieros y armado de payload de deudas y préstamos
 */
import { getNextPaymentDate, calculateElapsedMonths } from '../../utils/debtAlerts';
import { safeNumber } from '../../utils/financeMath';
import { parseFormattedAmount } from '../../utils/currencyFormatter';

/**
 * Normaliza el tipo de deuda a 'receivable' o 'payable'.
 */
export const normalizeDebtType = (val) => {
  if (!val) return 'receivable';
  const s = String(val).toLowerCase().trim();
  if (s === 'payable' || s === 'debo' || s === 'borrowed' || s.includes('prestaron') || s === 'debt' || s === 'deudas') {
    return 'payable';
  }
  return 'receivable';
};

/**
 * Normaliza el string de frecuencia a los 4 tipos estándar.
 */
export const parseFrequency = (rawFreq) => {
  if (!rawFreq) return 'Único';
  const f = rawFreq.toLowerCase();
  if (f.includes('quincen')) return 'Quincenal';
  if (f.includes('mensual')) return 'Mensual';
  if (f.includes('semanal')) return 'Semanal';
  return 'Único';
};

/**
 * Calcula la fecha de vencimiento o próximo corte según la frecuencia elegida.
 */
export const calculateComputedDueDate = ({
  frequency,
  biweeklyDay1 = 15,
  biweeklyDay2 = 30,
  dueDay = 15,
  dueDate = '',
  startDate,
  getNextPaymentDateFn = getNextPaymentDate
}) => {
  if (frequency === 'Único') {
    return dueDate;
  }
  const tempItem = {
    frequency,
    biweeklyDays: [biweeklyDay1, biweeklyDay2],
    dueDay,
    startDate
  };
  const nextDate = getNextPaymentDateFn ? getNextPaymentDateFn(tempItem, new Date()) : null;
  if (nextDate && !isNaN(nextDate.getTime())) {
    return nextDate.toISOString().split('T')[0];
  }
  return dueDate || new Date().toISOString().split('T')[0];
};

/**
 * Calcula intereses causados retroactivos según el monto, tasa y fecha de inicio.
 */
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

  let accruedInterest = 0;
  if (monthsElapsed > 0 && monthlyRate > 0 && principalAmount > 0) {
    accruedInterest = Math.round(principalAmount * (monthlyRate / 100) * monthsElapsed);
  }

  return {
    principalAmount,
    monthlyRate,
    monthsElapsed,
    accruedInterest,
    totalOwedWithInterest: principalAmount + accruedInterest
  };
};

/**
 * Calcula el desglose de amortización: capital pagado, intereses pagados y saldos pendientes.
 */
export const calculateDebtRemainingBalances = ({
  baseAmount,
  accruedInterest = 0,
  payments = []
}) => {
  const base = Number(baseAmount) || 0;
  const existingPayments = Array.isArray(payments) ? payments : [];

  const totalCapitalPaid = existingPayments.reduce((sum, p) => {
    if (!p) return sum;
    if (p.capitalAmount !== undefined) return sum + safeNumber(p.capitalAmount);
    if (p.mode === 'interest') return sum;
    return sum + safeNumber(p.amount);
  }, 0);

  const totalInterestPaid = existingPayments.reduce((sum, p) => {
    if (!p) return sum;
    if (p.interestAmount !== undefined) return sum + safeNumber(p.interestAmount);
    if (p.mode === 'interest') return sum + safeNumber(p.amount);
    return sum;
  }, 0);

  const remainingCapital = Math.max(0, base - totalCapitalPaid);
  const remainingInterest = Math.max(0, accruedInterest - totalInterestPaid);
  const totalRemaining = remainingCapital + remainingInterest;

  return {
    totalCapitalPaid,
    totalInterestPaid,
    remainingCapital,
    remainingInterest,
    totalRemaining
  };
};

/**
 * Construye el payload completo del registro de deuda / préstamo para su guardado.
 */
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
    totalAmount,
    interestRate,
    startDate,
    parseFormattedAmountFn,
    calculateElapsedMonthsFn
  });

  const existingPayments = editingItem ? (editingItem.payments || []) : [];
  const {
    remainingCapital,
    remainingInterest,
    totalRemaining
  } = calculateDebtRemainingBalances({
    baseAmount: base,
    accruedInterest,
    payments: existingPayments
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
    remainingAmount: remainingCapital, // Retrocompatibilidad
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

/**
 * Formatea la fecha calculada para previsualización legible en la UI.
 */
export const formatPreviewDueDate = (computedDueDate) => {
  if (!computedDueDate) return '';
  const parts = computedDueDate.split('-');
  if (parts.length !== 3) return computedDueDate;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return d.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};
