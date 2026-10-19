import { safeNumber, toSafeNumber } from './mathHelpers';
import { calculateSavingsRate } from './cashFlowMath';
import {
  convertUSDtoCOP,
  convertCOPtoUSD,
  calculateUVTThreshold,
  calculateTaxProgressPercentage
} from './currencyMath';

/**
 * Ecuación Patrimonial Estricta (Patrimonio Total)
 * Activos Totales: Suma de saldos de todas las cuentas (accounts) + total valor actual de inversiones (investments) + préstamos que te deben / por cobrar (debts tipo lent).
 * Pasivos Totales: Suma de todas las deudas que debes / por pagar (debts tipo borrowed).
 * Patrimonio Neto: Activos Totales - Pasivos Totales.
 */
export const calculateNetWorth = ({
  accounts = [],
  transactions = [],
  investments = [],
  debtsAndLoans = [],
  trm = 4050,
  getAccountBalanceFn = null
} = {}) => {
  const trmValue = safeNumber(trm) || 4050;

  // 1. Activos Totales - Cuentas: Suma de saldos de todas las cuentas convertidas a COP
  const totalAccountsBalanceCOP = (Array.isArray(accounts) ? accounts : []).reduce((acc, account) => {
    const bal = getAccountBalanceFn 
      ? getAccountBalanceFn(account, transactions, trmValue) 
      : safeNumber(account?.balance ?? account?.initialBalance);
    const currency = account?.currency || 'COP';
    const rate = currency === 'USD' ? trmValue : currency === 'EUR' ? trmValue * 1.08 : 1;
    return acc + (safeNumber(bal) * safeNumber(rate));
  }, 0);

  // 2. Activos Totales - Inversiones: Total valor actual de inversiones en COP
  let totalInvestmentsValueCOP = 0;
  let totalInvestmentsCostCOP = 0;
  (Array.isArray(investments) ? investments : []).forEach((inv) => {
    const currency = inv?.currency || 'USD';
    const rate = currency === 'USD' ? trmValue : 1;
    const shares = safeNumber(inv?.shares);
    const buyPrice = safeNumber(inv?.buyPrice || inv?.unitPrice);
    const currentPrice = safeNumber(inv?.currentPrice || buyPrice);

    let costOrigin = safeNumber(inv?.total_invested || inv?.buy_price || inv?.investedAmount);
    if (costOrigin === 0 && shares > 0 && buyPrice > 0) {
      costOrigin = shares * buyPrice;
    }

    let currentOrigin = safeNumber(inv?.current_value || inv?.currentAmount);
    if (currentOrigin === 0 && shares > 0 && currentPrice > 0) {
      currentOrigin = shares * currentPrice;
    }
    if (currentOrigin === 0) {
      currentOrigin = costOrigin;
    }

    totalInvestmentsCostCOP += costOrigin * rate;
    totalInvestmentsValueCOP += currentOrigin * rate;
  });

  // 3. Préstamos y Deudas
  // - Activos: préstamos que te deben / por cobrar (tipo lent / receivable)
  // - Pasivos: deudas que debes / por pagar (tipo borrowed / payable)
  let totalReceivableCOP = 0;
  let totalPayableCOP = 0;
  let receivableCount = 0;
  let payableCount = 0;

  (Array.isArray(debtsAndLoans) ? debtsAndLoans : []).forEach((item) => {
    if (!item) return;
    const type = String(item.type || '').toLowerCase();
    const isReceivable = type === 'receivable' || type === 'lent' || type === 'prestamo' || type === 'me_deben';
    const isPayable = type === 'payable' || type === 'borrowed' || type === 'deuda' || type === 'debo';

    // Soporte dual camelCase y snake_case para saldo pendiente
    const explicitRemaining = 
      item.remainingCapital ?? 
      item.remaining_capital ?? 
      item.remainingAmount ?? 
      item.remaining_amount;

    const base = safeNumber(
      item.principalAmount ?? 
      item.principal_amount ?? 
      item.totalAmount ?? 
      item.total_amount ?? 
      item.amount
    );

    const payments = Array.isArray(item.payments) ? item.payments : [];
    const totalCapitalPaid = payments.reduce((s, p) => {
      const cap = p?.capitalAmount ?? p?.capital_amount;
      return s + safeNumber(cap !== undefined ? cap : (p?.mode === 'interest' ? 0 : p?.amount));
    }, 0);

    const remainingCapitalRaw = Math.max(0,
      explicitRemaining !== undefined && explicitRemaining !== null
        ? safeNumber(explicitRemaining)
        : base - totalCapitalPaid
    );

    // Conversión de divisa si la deuda está pactada en moneda extranjera
    const currency = String(item.currency || 'COP').toUpperCase();
    const rate = currency === 'USD' ? trmValue : currency === 'EUR' ? trmValue * 1.08 : 1;
    const remainingCapital = remainingCapitalRaw * rate;

    if (isReceivable) {
      totalReceivableCOP += remainingCapital;
      if (remainingCapital > 0) receivableCount++;
    } else if (isPayable) {
      totalPayableCOP += remainingCapital;
      if (remainingCapital > 0) payableCount++;
    }
  });

  // Activos Totales: Cuentas + Inversiones (valor actual) + Préstamos por cobrar
  const totalAssetsCOP = Math.round((totalAccountsBalanceCOP + totalInvestmentsValueCOP + totalReceivableCOP) * 100) / 100;
  // Pasivos Totales: Deudas por pagar
  const totalLiabilitiesCOP = Math.round(totalPayableCOP * 100) / 100;
  // Patrimonio Neto: Activos Totales - Pasivos Totales
  const netWorthCOP = Math.round((totalAssetsCOP - totalLiabilitiesCOP) * 100) / 100;

  return {
    totalAssetsCOP,
    totalLiabilitiesCOP,
    totalPayableCOP: totalLiabilitiesCOP,
    totalReceivableCOP: Math.round(totalReceivableCOP * 100) / 100,
    totalAccountsBalanceCOP: Math.round(totalAccountsBalanceCOP * 100) / 100,
    totalInvestmentsValueCOP: Math.round(totalInvestmentsValueCOP * 100) / 100,
    totalInvestmentsCostCOP: Math.round(totalInvestmentsCostCOP * 100) / 100,
    netWorthCOP,
    isNetWorthPositive: netWorthCOP >= 0,
    receivableCount,
    payableCount
  };
};

/**
 * Rendimiento Mensual de Préstamo a Tercero
 * Rendimiento Mensual = Monto Prestado * (Tasa Mensual % / 100)
 */
export const calculateMonthlyLoanReturn = (principal, monthlyRatePercent) => {
  const p = toSafeNumber(principal);
  const r = toSafeNumber(monthlyRatePercent);
  return (p * r) / 100;
};

/**
 * CDT Bancario (Tasa Efectiva Anual % E.A.)
 * Rendimiento al Vencimiento = Monto Invertido * [(1 + Tasa E.A. % / 100)^(Días / 365) - 1]
 * Soporta descuento de retención en la fuente sobre rendimientos (ej. 4% en Colombia).
 */
export const calculateCDTMaturityReturn = (
  principal,
  annualRatePercent,
  daysTerm,
  withholdingTaxRate = 0
) => {
  const p = toSafeNumber(principal);
  const r = toSafeNumber(annualRatePercent);
  const d = toSafeNumber(daysTerm);
  const w = toSafeNumber(withholdingTaxRate);

  if (p <= 0 || r <= 0 || d <= 0) {
    return { grossReturn: 0, taxWithheld: 0, netReturn: 0, maturityTotal: p };
  }

  const factor = Math.pow(1 + (r / 100), d / 365) - 1;
  const grossReturn = p * factor;
  const taxWithheld = grossReturn * w;
  const netReturn = Math.max(0, grossReturn - taxWithheld);

  return {
    grossReturn,
    taxWithheld,
    netReturn,
    maturityTotal: p + netReturn
  };
};

/**
 * Rendimiento Estimado de CDT a la fecha actual (según días transcurridos)
 */
export const calculateCDTAccruedReturn = (
  principal,
  annualRatePercent,
  startDate,
  currentDate = new Date(),
  withholdingTaxRate = 0
) => {
  const p = toSafeNumber(principal);
  const r = toSafeNumber(annualRatePercent);
  if (p <= 0 || r <= 0 || !startDate) return { grossReturn: 0, netReturn: 0, currentTotal: p };

  const start = new Date(startDate + 'T00:00:00');
  const now = new Date(currentDate);
  now.setHours(0, 0, 0, 0);

  const daysElapsed = Math.max(0, Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  return calculateCDTMaturityReturn(p, r, daysElapsed, withholdingTaxRate);
};

/**
 * Préstamos y Deudas
 * Saldo Pendiente = Monto Base - Sum(Abonos)
 * Previene saldos negativos accidentales mediante Math.max(0, ...).
 */
export const calculateDebtStats = (principal, payments = [], options = {}) => {
  const base = toSafeNumber(principal);
  const accruedInterest = toSafeNumber(options.accruedInterest || 0);

  const pmts = Array.isArray(payments) ? payments : [];

  const totalCapitalPaid = pmts.reduce((sum, p) => {
    if (!p) return sum;
    if (p.capitalAmount !== undefined) return sum + toSafeNumber(p.capitalAmount);
    if (p.mode === 'interest') return sum;
    return sum + toSafeNumber(p.amount);
  }, 0);

  const totalInterestPaid = pmts.reduce((sum, p) => {
    if (!p) return sum;
    if (p.interestAmount !== undefined) return sum + toSafeNumber(p.interestAmount);
    if (p.mode === 'interest') return sum + toSafeNumber(p.amount);
    return sum;
  }, 0);

  const totalPaid = pmts.reduce((sum, p) => sum + toSafeNumber(p?.amount), 0);

  const remainingCapital = Math.max(0, base - totalCapitalPaid);
  const remainingInterest = Math.max(0, accruedInterest - totalInterestPaid);
  const outstandingBalance = (accruedInterest > 0) ? (remainingCapital + remainingInterest) : remainingCapital;

  return {
    base,
    totalPaid,
    totalCapitalPaid,
    totalInterestPaid,
    remainingCapital,
    remainingInterest,
    outstandingBalance,
    isPaid: remainingCapital <= 1 && remainingInterest <= 1
  };
};

/**
 * Suite de Auto-Verificación Matemática y Financiera
 * Ejecuta pruebas con aserciones exactas en modo desarrollo.
 */
export const runFinanceMathAudit = () => {
  try {
    const assertions = [];

    // Test 1: toSafeNumber con formatos latino, americano y string sucio
    assertions.push(toSafeNumber('$ 1.250.500,50') === 1250500.5);
    assertions.push(toSafeNumber('1,250,500.50') === 1250500.5);
    assertions.push(toSafeNumber('1.000') === 1000);
    assertions.push(toSafeNumber(null) === 0);
    assertions.push(toSafeNumber(undefined) === 0);
    assertions.push(toSafeNumber(NaN) === 0);

    // Test 2: Tasa de ahorro
    assertions.push(calculateSavingsRate(1000000, 400000) === 60);
    assertions.push(calculateSavingsRate(0, 400000) === 0);
    assertions.push(calculateSavingsRate(500000, 1000000) === 0);

    // Test 3: Rendimiento Préstamo a Tercero
    assertions.push(calculateMonthlyLoanReturn(10000000, 2) === 200000);

    // Test 4: CDT Bancario
    const cdt = calculateCDTMaturityReturn(10000000, 12, 365, 0.04);
    assertions.push(Math.round(cdt.grossReturn) === 1200000);
    assertions.push(Math.round(cdt.taxWithheld) === 48000);
    assertions.push(Math.round(cdt.netReturn) === 1152000);

    // Test 5: Deuda sin saldo negativo al sobrepagar
    const debt = calculateDebtStats(5000000, [{ capitalAmount: 6000000 }]);
    assertions.push(debt.remainingCapital === 0);
    assertions.push(debt.isPaid === true);

    // Test 6: Conversión TRM (multiplicación exacta, nunca división de USD a COP)
    assertions.push(convertUSDtoCOP(1500, 4050) === 6075000);
    assertions.push(convertCOPtoUSD(6075000, 4050) === 1500);

    // Test 7: Topes DIAN y acotado de barra CSS
    assertions.push(calculateUVTThreshold(1400, 52500) === 73500000);
    assertions.push(calculateTaxProgressPercentage(150000000, 73500000) === 100);
    assertions.push(calculateTaxProgressPercentage(-500, 73500000) === 0);

    const allPassed = assertions.every(Boolean);

    if (allPassed) {
      // Log silenciado para mantener la consola limpia
      return true;
    } else {
      console.warn('[Finance Math] Fallaron una o más aserciones matemáticas:', assertions);
      return false;
    }
  } catch (err) {
    console.error('[Finance Math] Error durante la auto-verificación matemática:', err);
    return false;
  }
};

// Ejecución automática en modo desarrollo o navegador
if (typeof window !== 'undefined') {
  runFinanceMathAudit();
}
