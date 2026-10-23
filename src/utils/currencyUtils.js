/**
 * currencyUtils.js
 * Utilidades para manejo multidivisa (COP, USD, EUR) y cuentas al estilo Binance
 */

import { toSafeNumber, safeNumber, calculateAccountBalance as mathCalculateAccountBalance } from './financeMath';

export { safeNumber, toSafeNumber };

export const SUPPORTED_CURRENCIES = ['COP', 'USD', 'EUR'];
export const CURRENCY_SYMBOLS = { COP: '$', USD: '$', EUR: '€' };
export const CURRENCY_LABELS = { COP: 'COP ($)', USD: 'USD ($)', EUR: 'EUR (€)' };

const checkEnableDecimals = () => {
  try {
    if (typeof window === 'undefined') return false;
    const direct = localStorage.getItem('app_enable_decimals');
    if (direct !== null) return direct === 'true';
    const raw = localStorage.getItem('user_settings');
    if (raw) {
      const p = JSON.parse(raw);
      return Boolean(p?.enable_decimals ?? p?.enableDecimals ?? p?.showDecimals ?? p?.allowDecimals);
    }
  } catch {}
  return false;
};

/**
 * Convierte un monto en cualquier moneda a su equivalente en COP usando la TRM
 */
export function convertToCOP(amount, currency = 'COP', trm = 4050) {
  const num = toSafeNumber(amount);
  const numTrm = toSafeNumber(trm) || 4050;
  if (currency === 'USD') return num * numTrm;
  if (currency === 'EUR') return num * Math.round(numTrm * 1.08);
  return num;
}

/**
 * Convierte un monto en COP a la moneda destino
 */
export function convertFromCOP(amountCOP, targetCurrency = 'COP', trm = 4050) {
  const num = toSafeNumber(amountCOP);
  const numTrm = toSafeNumber(trm) || 4050;
  if (targetCurrency === 'USD') return num / (numTrm || 1);
  if (targetCurrency === 'EUR') return num / (Math.round(numTrm * 1.08) || 1);
  return num;
}

/**
 * Formatea el monto en la moneda nativa con símbolo y sufijo claro
 */
export function formatNativeCurrency(amount, currency = 'COP', showSuffix = true) {
  const num = toSafeNumber(amount);
  const curr = currency || 'COP';
  const enableDecimals = checkEnableDecimals();
  const isNeg = num < 0;
  const absNum = Math.abs(num);
  const sym = curr === 'EUR' ? '€' : '$';
  const suffix = showSuffix ? ` ${curr}` : '';
  const digits = enableDecimals ? 2 : 0;
  const val = enableDecimals ? absNum : Math.round(absNum);
  const formatted = val.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

  return `${isNeg ? '-' : ''}${sym} ${formatted}${suffix}`;
}

/**
 * Formato COP estándar abreviado o redondeado
 */
export function formatCOP(amount) {
  return formatNativeCurrency(amount, 'COP', false);
}

export const calculateAccountBalance = mathCalculateAccountBalance;

/**
 * Calcula el saldo actual de una cuenta en su divisa nativa considerando sus transacciones
 */
export function getAccountNativeBalance(account, transactions = [], trm = 4050) {
  if (!account) return 0;
  try {
    const accCurrency = account?.currency || 'COP';
    const accId = account?.id;
    const stored = safeNumber(account.balance ?? account.current_balance ?? account.currentBalance ?? account.saldo ?? account.initialBalance ?? account.initial_balance);
    const rawInitial = account.initialBalance !== undefined ? account.initialBalance : account.initial_balance;
    const initial = safeNumber(rawInitial != null && Number(rawInitial) !== 0 ? rawInitial : stored);

    const accTxs = Array.isArray(transactions)
      ? transactions.filter((t) => t && accId && (t.accountId === accId || t.account_id === accId || t.toAccountId === accId || t.to_account_id === accId || t.fromAccountId === accId || t.from_account_id === accId))
      : [];

    if (accTxs.length === 0) return stored;

    let inc = 0;
    let exp = 0;

    for (const t of accTxs) {
      if (!t) continue;
      const tAmount = safeNumber(t.amount);
      const tAccId = t.accountId || t.account_id;
      const isThis = tAccId === accId;
      const isTo = (t.toAccountId || t.to_account_id) === accId;
      const isFrom = (t.fromAccountId || t.from_account_id) === accId;
      const isTransfer = Boolean(t.isTransfer || t.is_transfer || ['transfer', 'transferencia'].includes(t.type) || ['cat-transfer'].includes(t.categoryId || t.category_id) || ['sub-transfer-in', 'sub-transfer-out'].includes(t.subcategoryId));

      const txCurr = t.currency || t.originalCurrency || t.original_currency;
      const rateUSD = safeNumber(t.exchangeRate || t.exchange_rate) || safeNumber(trm) || 4050;
      const rateEUR = safeNumber(t.exchangeRate || t.exchange_rate) || Math.round((safeNumber(trm) || 4050) * 1.08);

      let nativeAmount = tAmount;
      if (accCurrency === 'COP') {
        nativeAmount = t.amount != null ? tAmount : (txCurr === 'USD' ? safeNumber(t.originalAmount) * rateUSD : txCurr === 'EUR' ? safeNumber(t.originalAmount) * rateEUR : tAmount);
      } else if (txCurr === accCurrency) {
        nativeAmount = t.originalAmount != null ? safeNumber(t.originalAmount) : (accCurrency === 'USD' ? tAmount / (rateUSD || 1) : tAmount / (rateEUR || 1));
      } else {
        nativeAmount = accCurrency === 'USD' ? tAmount / (rateUSD || 1) : tAmount / (rateEUR || 1);
      }

      const txType = String(t.type || '').toLowerCase();

      if (isTransfer) {
        if (['transfer', 'transferencia'].includes(txType)) {
          if (isFrom && !isTo) exp += nativeAmount;
          else if (isTo && !isFrom) inc += nativeAmount;
        } else if (['expense', 'gasto'].includes(txType) || t.subcategoryId === 'sub-transfer-out') {
          if (isThis) exp += nativeAmount;
        } else if (['income', 'ingreso'].includes(txType) || t.subcategoryId === 'sub-transfer-in') {
          if (isThis) inc += nativeAmount;
        }
      } else if (isThis) {
        if (['income', 'ingreso'].includes(txType)) inc += nativeAmount;
        if (['expense', 'gasto'].includes(txType)) exp += nativeAmount;
      }
    }

    const res = Math.round((initial + inc - exp) * 100) / 100;
    return isNaN(res) || !isFinite(res) ? 0 : res;
  } catch (err) {
    console.warn('Error calculando saldo nativo de cuenta:', err);
    return safeNumber(account?.balance || account?.initialBalance || 0);
  }
}
