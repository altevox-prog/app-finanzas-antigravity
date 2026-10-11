/**
 * Motor Matemático y Financiero Centralizado de Presu App
 * Garantiza precisión contable, prevención de bugs de tipado/string,
 * redondeo seguro y validaciones contra NaN / divisiones por cero.
 */

/**
 * 1. Casting Estricto y Prevención de Bugs Numéricos
 * Parsea de forma segura cualquier número, string formateado, símbolo de divisa o valor nulo.
 * Soporta formato latino (1.250.500,50) y anglosajón (1,250,500.50).
 */
export const safeNumber = (val) => {
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? 0 : val;
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '') return 0;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const n = Number(trimmed);
      if (!isNaN(n) && isFinite(n)) return n;
    }
  }
  return toSafeNumber(val);
};

export const toSafeNumber = (val) => {
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? 0 : val;
  if (val === null || val === undefined || val === '') return 0;

  let str = String(val).trim();
  if (!/[0-9]/.test(str)) return 0;

  const isNegative = str.startsWith('-') || str.includes('-$') || str.includes('$-');

  str = str.replace(/[^0-9.,-]/g, '');
  if (!str || str === '-') return 0;

  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      // Formato COP / Latino: 1.250.500,50 -> 1250500.50
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato US / Internacional: 1,250,500.50 -> 1250500.50
      str = str.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const commaParts = str.split(',');
    if (commaParts.length === 2) {
      str = commaParts[0].replace(/\./g, '') + '.' + commaParts[1];
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (lastDot !== -1) {
    const dotParts = str.split('.');
    if (dotParts.length > 2) {
      str = str.replace(/\./g, '');
    } else if (dotParts.length === 2 && dotParts[1].length === 3 && dotParts[0].length <= 3) {
      // Formato de miles: ej. 1.000 o 50.000
      str = str.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(str);
  if (isNaN(parsed) || !isFinite(parsed)) return 0;
  return isNegative ? -Math.abs(parsed) : Math.abs(parsed);
};

/**
 * Redondeo Financiero para COP (entero estándar, o 2 decimales si está habilitado)
 */
export const roundCOP = (val, allowDecimals = false) => {
  const num = toSafeNumber(val);
  if (allowDecimals) {
    return Number(Math.round(Number(num + 'e2')) + 'e-2');
  }
  return Math.round(num);
};

/**
 * Redondeo Financiero para USD y tasas de interés (2 o 4 decimales inmune a float quirks)
 */
export const roundUSD = (val, decimals = 2) => {
  const num = toSafeNumber(val);
  return Number(Math.round(Number(num + `e${decimals}`)) + `e-${decimals}`);
};

/**
 * Redondeo de porcentajes
 */
export const roundPercentage = (val, decimals = 1) => {
  const num = toSafeNumber(val);
  return Number(Math.round(Number(num + `e${decimals}`)) + `e-${decimals}`);
};

/**
 * 2A. Saldo de Cuentas y Métodos de Pago
 * Saldo Actual = Saldo Inicial + Sum(Ingresos) - Sum(Gastos) + Sum(Transferencias Entrantes) - Sum(Transferencias Salientes)
 */
export const calculateAccountBalance = (account, transactions = []) => {
  if (!account) return 0;

  let baseBalance = 0;
  if (account.initialBalance !== undefined) {
    baseBalance = toSafeNumber(account.initialBalance);
  } else if (account.initial_balance !== undefined) {
    baseBalance = toSafeNumber(account.initial_balance);
  } else if (account.balance !== undefined) {
    baseBalance = toSafeNumber(account.balance);
  } else {
    baseBalance = toSafeNumber(account.saldo ?? 0);
  }

  const txs = Array.isArray(transactions) ? transactions : [];
  const accId = account.id;
  const accName = account.name;

  const movements = txs.reduce((acc, t) => {
    if (!t) return acc;
    const tAccId = t.accountId || t.account_id;
    const tAccName = t.account || t.accountName;
    const isThisAccount = (tAccId && tAccId === accId) || (accName && tAccName === accName);

    const tToId = t.toAccountId || t.to_account_id;
    const tToName = t.toAccountName;
    const isToThisAccount = (tToId && tToId === accId) || (accName && tToName === accName);

    const tFromId = t.fromAccountId || t.from_account_id;
    const tFromName = t.fromAccountName;
    const isFromThisAccount = (tFromId && tFromId === accId) || (accName && tFromName === accName);

    const amt = toSafeNumber(t.amount);
    const txType = String(t.type || '').toLowerCase();
    const isTransfer = Boolean(
      t.isTransfer || 
      t.is_transfer || 
      txType === 'transfer' || 
      txType === 'transferencia' || 
      t.categoryId === 'cat-transfer' ||
      t.category_id === 'cat-transfer'
    );

    if (isTransfer) {
      if (txType === 'transfer' || txType === 'transferencia') {
        if (isFromThisAccount) return acc - amt;
        if (isToThisAccount) return acc + amt;
      } else if (txType === 'expense' || txType === 'gasto') {
        if (isThisAccount || isFromThisAccount) return acc - amt;
      } else if (txType === 'income' || txType === 'ingreso') {
        if (isThisAccount || isToThisAccount) return acc + amt;
      }
      return acc;
    }

    // Caso estándar vinculada a la cuenta
    if (isThisAccount) {
      if (txType === 'income' || txType === 'ingreso') return acc + amt;
      if (txType === 'expense' || txType === 'gasto') return acc - amt;
    }

    return acc;
  }, 0);

  return baseBalance + movements;
};

/**
 * 2B. Dashboard Principal (Widgets de Métricas)
 */

/**
 * Suma estricta de ingresos del mes
 */
export const calculateMonthlyIncome = (transactions = [], year, month, { excludeTransfers = true } = {}) => {
  return (Array.isArray(transactions) ? transactions : [])
    .filter(t => {
      if (!t) return false;
      const type = String(t.type || '').toLowerCase();
      if (type !== 'income' && type !== 'ingreso') return false;
      if (excludeTransfers && (
        t.isTransfer || 
        t.is_transfer || 
        t.categoryId === 'cat-transfer' || 
        t.category_id === 'cat-transfer' || 
        type === 'transfer' || 
        type === 'transferencia'
      )) return false;
      if (year !== undefined && month !== undefined && t.date) {
        const d = new Date(t.date + 'T00:00:00');
        return d.getFullYear() === year && d.getMonth() === month;
      }
      return true;
    })
    .reduce((sum, t) => sum + toSafeNumber(t.amount), 0);
};

/**
 * Suma estricta de gastos del mes
 */
export const calculateMonthlyExpenses = (transactions = [], year, month, { excludeTransfers = true } = {}) => {
  return (Array.isArray(transactions) ? transactions : [])
    .filter(t => {
      if (!t) return false;
      const type = String(t.type || '').toLowerCase();
      if (type !== 'expense' && type !== 'gasto') return false;
      if (excludeTransfers && (
        t.isTransfer || 
        t.is_transfer || 
        t.categoryId === 'cat-transfer' || 
        t.category_id === 'cat-transfer' || 
        type === 'transfer' || 
        type === 'transferencia'
      )) return false;
      if (year !== undefined && month !== undefined && t.date) {
        const d = new Date(t.date + 'T00:00:00');
        return d.getFullYear() === year && d.getMonth() === month;
      }
      return true;
    })
    .reduce((sum, t) => sum + toSafeNumber(t.amount), 0);
};

/**
 * Flujo Neto del Mes = Ingresos del Mes - Gastos del Mes
 */
export const calculateNetFlow = (monthlyIncome, monthlyExpenses) => {
  const inc = toSafeNumber(monthlyIncome);
  const exp = toSafeNumber(monthlyExpenses);
  return inc - exp;
};

/**
 * Tasa de Ahorro / Superávit (%)
 * Fórmula estricta: ((Ingresos del mes - Gastos del mes) / Ingresos del mes) * 100
 * Si Ingresos del mes <= 0, la tasa de ahorro debe ser obligatoriamente 0% (nunca NaN, null ni Infinity).
 */
export const calculateSavingsRate = (monthlyIncome, monthlyExpenses) => {
  const inc = safeNumber(monthlyIncome);
  const exp = safeNumber(monthlyExpenses);
  if (inc <= 0) return 0;
  const net = inc - exp;
  if (net <= 0) return 0;
  const rawRate = ((inc - exp) / inc) * 100;
  if (isNaN(rawRate) || !isFinite(rawRate)) return 0;
  return Math.min(100, Math.max(0, Math.round(rawRate)));
};

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

    const base = safeNumber(item.principalAmount || item.totalAmount || item.amount);
    const payments = Array.isArray(item.payments) ? item.payments : [];
    const totalCapitalPaid = payments.reduce((s, p) => {
      return s + safeNumber(p?.capitalAmount !== undefined ? p.capitalAmount : (p?.mode === 'interest' ? 0 : p?.amount));
    }, 0);

    const remainingCapital = Math.max(0,
      item.remainingCapital !== undefined
        ? safeNumber(item.remainingCapital)
        : (item.remainingAmount !== undefined
            ? safeNumber(item.remainingAmount)
            : base - totalCapitalPaid)
    );

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
 * 2C. Inversiones y Renta Fija
 */

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
 * 2D. Préstamos y Deudas
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
 * 2E. Conversión Multidivisa (TRM)
 * USD a COP: Valor COP = Valor USD * TRM (¡Multiplicación estricta, nunca división!)
 * COP a USD: Valor USD = Valor COP / TRM
 */
export const convertUSDtoCOP = (amountUSD, trm = 4050) => {
  const usd = toSafeNumber(amountUSD);
  const rate = toSafeNumber(trm) || 4050;
  return usd * rate;
};

export const convertEURtoCOP = (amountEUR, trm = 4050) => {
  const eur = toSafeNumber(amountEUR);
  const rate = toSafeNumber(trm) || 4050;
  const eurRate = Math.round(rate * 1.08);
  return eur * eurRate;
};

export const convertCOPtoUSD = (amountCOP, trm = 4050) => {
  const cop = toSafeNumber(amountCOP);
  const rate = toSafeNumber(trm) || 4050;
  return cop / (rate || 1);
};

export const convertCOPtoEUR = (amountCOP, trm = 4050) => {
  const cop = toSafeNumber(amountCOP);
  const rate = toSafeNumber(trm) || 4050;
  const eurRate = Math.round(rate * 1.08);
  return cop / (eurRate || 1);
};

/**
 * 2F. Módulo DIAN y Topes de Renta
 * Multiplicación oficial: Tope = UVT * Valor UVT
 * Progreso en CSS: Math.min(100, Math.max(0, porcentaje))
 */
export const calculateUVTThreshold = (thresholdUVT, uvtValue) => {
  return toSafeNumber(thresholdUVT) * toSafeNumber(uvtValue);
};

export const calculateTaxProgressPercentage = (currentAmount, thresholdAmount) => {
  const curr = toSafeNumber(currentAmount);
  const thresh = toSafeNumber(thresholdAmount);
  if (thresh <= 0) return 0;
  const raw = (curr / thresh) * 100;
  return Math.min(100, Math.max(0, Number(raw.toFixed(1))));
};

/**
 * 3. Suite de Auto-Verificación Matemática y Financiera
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
      if (typeof console !== 'undefined' && console.log) {
        console.log(
          '%c[Finance Math] Todas las fórmulas matemáticas verificadas con éxito',
          'color: #10b981; font-weight: bold; font-size: 12px; background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 6px;'
        );
      }
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
