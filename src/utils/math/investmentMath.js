import { safeNumber, toSafeNumber } from './mathHelpers';
import { calculateSavingsRate } from './cashFlowMath';
import { convertUSDtoCOP, convertCOPtoUSD, calculateUVTThreshold, calculateTaxProgressPercentage } from './currencyMath';

const round2 = (num) => Math.round(toSafeNumber(num) * 100) / 100;
const getRate = (curr, trm) => curr === 'USD' ? trm : curr === 'EUR' ? trm * 1.08 : 1;

export const calculateNetWorth = ({
  accounts = [], transactions = [], investments = [], debtsAndLoans = [], trm = 4050, getAccountBalanceFn = null, livePrices = {}
} = {}) => {
  const trmValue = safeNumber(trm) || 4050;

  const totalAccountsBalanceCOP = (Array.isArray(accounts) ? accounts : []).reduce((acc, account) => {
    const bal = getAccountBalanceFn ? getAccountBalanceFn(account, transactions, trmValue) : (account?.balance ?? account?.initialBalance);
    return acc + (safeNumber(bal) * getRate(account?.currency || 'COP', trmValue));
  }, 0);

  let totalInvestmentsValueCOP = 0, totalInvestmentsCostCOP = 0;
  (Array.isArray(investments) ? investments : []).forEach((inv) => {
    if (!inv) return;
    const rate = getRate(String(inv.currency || 'USD').toUpperCase(), trmValue);
    const ticker = (inv.ticker || inv.symbol || (inv.name && inv.name.length <= 6 ? inv.name : '')).toUpperCase().trim();
    const livePrice = safeNumber(livePrices[ticker]), shares = safeNumber(inv.shares);
    const rawInvested = safeNumber(inv.investedAmount ?? inv.invested_amount ?? inv.total_invested ?? inv.totalInvested ?? inv.amount);
    const rawCurrent = safeNumber(inv.currentAmount ?? inv.currentValue ?? inv.current_value);

    let buyPrice = safeNumber(inv.buyPrice || inv.buy_price || inv.purchasePrice || inv.unitPrice);
    if (!buyPrice && shares > 0 && rawInvested > 0) buyPrice = rawInvested / shares;

    let currentPrice = safeNumber(livePrice || inv.currentPrice || inv.current_price || buyPrice);
    if (!currentPrice && shares > 0 && rawCurrent > 0) currentPrice = rawCurrent / shares;
    else if (!currentPrice && buyPrice > 0) currentPrice = buyPrice;

    const costOrigin = rawInvested > 0 ? rawInvested : (shares > 0 && buyPrice > 0 ? shares * buyPrice : 0);
    const currentOrigin = livePrice > 0 && shares > 0 ? shares * livePrice : (rawCurrent > 0 ? rawCurrent : (shares > 0 && currentPrice > 0 ? shares * currentPrice : costOrigin));

    totalInvestmentsCostCOP += costOrigin * rate;
    totalInvestmentsValueCOP += (currentOrigin || costOrigin) * rate;
  });

  let totalReceivableCOP = 0, totalPayableCOP = 0, receivableCount = 0, payableCount = 0;
  (Array.isArray(debtsAndLoans) ? debtsAndLoans : []).forEach((item) => {
    if (!item) return;
    const type = String(item.type || '').toLowerCase();
    const isReceivable = ['receivable', 'lent', 'prestamo', 'me_deben'].includes(type);
    const isPayable = ['payable', 'borrowed', 'deuda', 'debo'].includes(type);
    const explicitRem = item.remainingCapital ?? item.remaining_capital ?? item.remainingAmount ?? item.remaining_amount;
    const base = safeNumber(item.principalAmount ?? item.principal_amount ?? item.totalAmount ?? item.total_amount ?? item.amount);
    const payments = Array.isArray(item.payments) ? item.payments : [];
    const totalCapitalPaid = payments.reduce((s, p) => s + safeNumber(p?.capitalAmount ?? p?.capital_amount ?? (p?.mode === 'interest' ? 0 : p?.amount)), 0);
    const remainingCapital = Math.max(0, explicitRem != null ? safeNumber(explicitRem) : base - totalCapitalPaid) * getRate(String(item.currency || 'COP').toUpperCase(), trmValue);

    if (isReceivable) { totalReceivableCOP += remainingCapital; if (remainingCapital > 0) receivableCount++; }
    else if (isPayable) { totalPayableCOP += remainingCapital; if (remainingCapital > 0) payableCount++; }
  });

  const totalAssetsCOP = round2(totalAccountsBalanceCOP + totalInvestmentsValueCOP + totalReceivableCOP);
  const totalLiabilitiesCOP = round2(totalPayableCOP);
  const netWorthCOP = round2(totalAssetsCOP - totalLiabilitiesCOP);

  return {
    totalAssetsCOP, totalLiabilitiesCOP, totalPayableCOP: totalLiabilitiesCOP,
    totalReceivableCOP: round2(totalReceivableCOP), totalAccountsBalanceCOP: round2(totalAccountsBalanceCOP),
    totalInvestmentsValueCOP: round2(totalInvestmentsValueCOP), totalInvestmentsCostCOP: round2(totalInvestmentsCostCOP),
    netWorthCOP, isNetWorthPositive: netWorthCOP >= 0, receivableCount, payableCount
  };
};

export const calculateMonthlyLoanReturn = (principal, monthlyRatePercent) => (toSafeNumber(principal) * toSafeNumber(monthlyRatePercent)) / 100;

export const calculateCDTMaturityReturn = (principal, annualRatePercent, daysTerm, withholdingTaxRate = 0) => {
  const p = toSafeNumber(principal), r = toSafeNumber(annualRatePercent), d = toSafeNumber(daysTerm), w = toSafeNumber(withholdingTaxRate);
  if (p <= 0 || r <= 0 || d <= 0) return { grossReturn: 0, taxWithheld: 0, netReturn: 0, maturityTotal: p };
  const grossReturn = p * (Math.pow(1 + (r / 100), d / 365) - 1);
  const taxWithheld = grossReturn * w;
  const netReturn = Math.max(0, grossReturn - taxWithheld);
  return { grossReturn, taxWithheld, netReturn, maturityTotal: p + netReturn };
};

export const calculateCDTAccruedReturn = (principal, annualRatePercent, startDate, currentDate = new Date(), withholdingTaxRate = 0) => {
  const p = toSafeNumber(principal), r = toSafeNumber(annualRatePercent);
  if (p <= 0 || r <= 0 || !startDate) return { grossReturn: 0, netReturn: 0, currentTotal: p };
  const start = new Date(startDate + 'T00:00:00'), now = new Date(currentDate);
  now.setHours(0, 0, 0, 0);
  const daysElapsed = Math.max(0, Math.round((now.getTime() - start.getTime()) / 86400000));
  return calculateCDTMaturityReturn(p, r, daysElapsed, withholdingTaxRate);
};

export const calculateDebtStats = (principal, payments = [], options = {}) => {
  const base = toSafeNumber(principal), accruedInterest = toSafeNumber(options.accruedInterest || 0);
  const { totalCapitalPaid, totalInterestPaid, totalPaid } = (Array.isArray(payments) ? payments : []).reduce((acc, p) => {
    if (!p) return acc;
    const amt = toSafeNumber(p.amount);
    acc.totalPaid += amt;
    acc.totalCapitalPaid += p.capitalAmount !== undefined ? toSafeNumber(p.capitalAmount) : (p.mode !== 'interest' ? amt : 0);
    acc.totalInterestPaid += p.interestAmount !== undefined ? toSafeNumber(p.interestAmount) : (p.mode === 'interest' ? amt : 0);
    return acc;
  }, { totalCapitalPaid: 0, totalInterestPaid: 0, totalPaid: 0 });

  const remainingCapital = Math.max(0, base - totalCapitalPaid);
  const remainingInterest = Math.max(0, accruedInterest - totalInterestPaid);
  const outstandingBalance = accruedInterest > 0 ? remainingCapital + remainingInterest : remainingCapital;
  return { base, totalPaid, totalCapitalPaid, totalInterestPaid, remainingCapital, remainingInterest, outstandingBalance, isPaid: remainingCapital <= 1 && remainingInterest <= 1 };
};

export const calculateROI = (finalValue, initialValue) => initialValue ? ((toSafeNumber(finalValue) - toSafeNumber(initialValue)) / toSafeNumber(initialValue)) * 100 : 0;
export const calculateCAGR = (finalVal, initialVal, years) => (initialVal > 0 && years > 0) ? (Math.pow(toSafeNumber(finalVal) / toSafeNumber(initialVal), 1 / toSafeNumber(years)) - 1) * 100 : 0;
export const calculateFutureValue = (principal, annualRate, periods, contribution = 0) => {
  const p = toSafeNumber(principal), r = toSafeNumber(annualRate) / 100, n = toSafeNumber(periods), c = toSafeNumber(contribution);
  return r === 0 ? p + c * n : p * Math.pow(1 + r, n) + c * ((Math.pow(1 + r, n) - 1) / r);
};

export const runFinanceMathAudit = () => {
  try {
    const assertions = [
      toSafeNumber('$ 1.250.500,50') === 1250500.5, toSafeNumber('1,250,500.50') === 1250500.5,
      toSafeNumber('1.000') === 1000, toSafeNumber(null) === 0, toSafeNumber(undefined) === 0,
      calculateSavingsRate(1000000, 400000) === 60, calculateMonthlyLoanReturn(10000000, 2) === 200000
    ];
    const cdt = calculateCDTMaturityReturn(10000000, 12, 365, 0.04);
    assertions.push(Math.round(cdt.grossReturn) === 1200000, Math.round(cdt.netReturn) === 1152000);
    const debt = calculateDebtStats(5000000, [{ capitalAmount: 6000000 }]);
    assertions.push(debt.remainingCapital === 0, debt.isPaid === true, convertUSDtoCOP(1500, 4050) === 6075000);
    return assertions.every(Boolean);
  } catch (err) {
    return false;
  }
};

if (typeof window !== 'undefined') runFinanceMathAudit();
