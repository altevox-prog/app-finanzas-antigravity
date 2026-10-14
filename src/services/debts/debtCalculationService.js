/**
 * Servicio de cálculos estadísticos y agregados de deudas y préstamos
 */
import { toSafeNumber as defaultToSafeNumber, calculateDebtStats as defaultCalculateDebtStats } from '../../utils/financeMath';
import { calculateElapsedMonths } from '../../utils/debtAlerts';

/**
 * Calcula todas las métricas financieras individuales de un ítem de deuda/préstamo.
 */
export function calculateItemStats(item, options = {}) {
  if (!item) return {};

  const toSafeNum = options.toSafeNumber || defaultToSafeNumber;
  const calcDebtStats = options.calculateDebtStats || defaultCalculateDebtStats;

  const base = toSafeNum(
    item.total_amount ?? 
    item.totalAmount ?? 
    item.amount ?? 
    item.principalAmount ?? 
    item.remaining_amount ?? 
    item.remainingAmount ?? 0
  );
  const rate = toSafeNum(item.interestRate);
  const insurance = toSafeNum(item.insuranceFee);

  // Calcular meses transcurridos en tiempo real según fecha de desembolso
  const monthsElapsed = item.startDate 
    ? calculateElapsedMonths(item.startDate) 
    : (toSafeNum(item.monthsElapsed) || 0);

  // Liquidación automática de intereses retroactivos según meses transcurridos
  const accruedInterest = (monthsElapsed > 0 && rate > 0)
    ? Math.round(base * (rate / 100) * monthsElapsed)
    : (item.accruedInterest !== undefined ? toSafeNum(item.accruedInterest) : Math.round(base * (rate / 100)));

  const interestAmount = accruedInterest > 0 ? accruedInterest : Math.round(base * (rate / 100));
  const totalToPay = base + interestAmount + insurance;

  const payments = Array.isArray(item.payments) ? item.payments : [];
  const stats = calcDebtStats(base, payments, { accruedInterest });

  const totalCapitalPaid = stats.totalCapitalPaid;
  const totalInterestPaid = stats.totalInterestPaid;
  const totalPaid = stats.totalPaid;
  const remainingCapital = stats.remainingCapital;
  const remainingInterest = stats.remainingInterest;
  const totalRemaining = remainingCapital + remainingInterest;
  const outstandingBalance = stats.outstandingBalance;
  const isPaid = stats.isPaid;

  const totalInstallments = Math.max(1, toSafeNum(item.installments) || 1);
  const suggestedInstallment = totalToPay / totalInstallments;
  const progressPercent = (base + accruedInterest) > 0 
    ? Math.min(100, Math.max(0, Math.round((totalPaid / (base + accruedInterest)) * 100))) 
    : (base > 0 ? Math.min(100, Math.max(0, Math.round((totalCapitalPaid / base) * 100))) : 100);

  return {
    base,
    principalAmount: base,
    totalPrincipal: base,
    paidPrincipal: totalCapitalPaid,
    paidInterest: totalInterestPaid,
    totalAccruedInterest: accruedInterest,
    rate,
    accruedInterest,
    monthsElapsed,
    remainingCapital,
    remainingInterest,
    totalRemaining,
    interestAmount,
    insurance,
    totalToPay,
    totalPaid,
    totalCapitalPaid,
    totalInterestPaid,
    outstandingBalance,
    outstandingCapital: remainingCapital,
    isPaid,
    suggestedInstallment,
    progressPercent
  };
}

/**
 * Agrega los totales estadísticos para una lista de deudas filtradas.
 */
export function calculateTabTotals(items = [], calculateStatsFn = calculateItemStats) {
  const safeItems = Array.isArray(items) ? items : [];

  return safeItems.reduce((acc, item) => {
    const stats = calculateStatsFn(item);
    acc.totalPrincipal += (stats.totalPrincipal || 0);
    acc.paidPrincipal += (stats.paidPrincipal || 0);
    acc.paidInterest += (stats.paidInterest || 0);
    acc.totalAccruedInterest += (stats.totalAccruedInterest || 0);
    acc.totalToPay += (stats.totalToPay || 0);
    acc.totalPaid += (stats.totalPaid || 0);
    acc.totalCapitalPaid += (stats.totalCapitalPaid || 0);
    acc.totalInterestPaid += (stats.totalInterestPaid || 0);
    acc.outstandingBalance += (stats.outstandingBalance || 0);
    acc.remainingCapital += (stats.remainingCapital || 0);
    acc.remainingInterest += (stats.remainingInterest || 0);
    if (stats.isPaid) acc.paidCount++;
    else acc.pendingCount++;
    return acc;
  }, { 
    totalPrincipal: 0,
    paidPrincipal: 0,
    paidInterest: 0,
    totalAccruedInterest: 0,
    totalToPay: 0, 
    totalPaid: 0, 
    totalCapitalPaid: 0, 
    totalInterestPaid: 0, 
    outstandingBalance: 0, 
    remainingCapital: 0, 
    remainingInterest: 0, 
    paidCount: 0, 
    pendingCount: 0 
  });
}
