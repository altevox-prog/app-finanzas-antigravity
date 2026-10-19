/**
 * Utilidades para manejo multidivisa (COP, USD, EUR) y cuentas de inversión al estilo Binance
 */

import { toSafeNumber, safeNumber, calculateAccountBalance as mathCalculateAccountBalance } from './financeMath';

export { safeNumber, toSafeNumber };

export const SUPPORTED_CURRENCIES = ['COP', 'USD', 'EUR'];

export const CURRENCY_SYMBOLS = {
  COP: '$',
  USD: '$',
  EUR: '€'
};

export const CURRENCY_LABELS = {
  COP: 'COP ($)',
  USD: 'USD ($)',
  EUR: 'EUR (€)'
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
 * Ej: $ 2,500.00 USD  /  € 1,800.00 EUR  /  $ 10.125.000 COP
 */
export function formatNativeCurrency(amount, currency = 'COP', showSuffix = true) {
  const num = toSafeNumber(amount);
  const curr = currency || 'COP';

  let enableDecimals = false;
  try {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('app_enable_decimals') !== null) {
        enableDecimals = localStorage.getItem('app_enable_decimals') === 'true';
      } else {
        const userSettingsRaw = localStorage.getItem('user_settings');
        if (userSettingsRaw) {
          const parsed = JSON.parse(userSettingsRaw);
          enableDecimals = Boolean(parsed?.enable_decimals ?? parsed?.enableDecimals ?? parsed?.showDecimals ?? parsed?.allowDecimals);
        }
      }
    }
  } catch {}

  const isNeg = num < 0;
  const absNum = Math.abs(num);
  const sym = curr === 'EUR' ? '€' : '$';
  const suffix = showSuffix ? ` ${curr}` : '';

  if (!enableDecimals) {
    const rounded = Math.round(absNum);
    const formatted = rounded.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return `${isNeg ? '-' : ''}${sym} ${formatted}${suffix}`;
  }

  const formatted = absNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${isNeg ? '-' : ''}${sym} ${formatted}${suffix}`;
}

/**
 * Formato COP estándar abreviado o redondeado
 */
export function formatCOP(amount) {
  const num = toSafeNumber(amount);
  let enableDecimals = false;
  try {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('app_enable_decimals') !== null) {
        enableDecimals = localStorage.getItem('app_enable_decimals') === 'true';
      } else {
        const userSettingsRaw = localStorage.getItem('user_settings');
        if (userSettingsRaw) {
          const parsed = JSON.parse(userSettingsRaw);
          enableDecimals = Boolean(parsed?.enable_decimals ?? parsed?.enableDecimals ?? parsed?.showDecimals ?? parsed?.allowDecimals);
        }
      }
    }
  } catch {}

  const isNeg = num < 0;
  const absNum = Math.abs(num);

  if (!enableDecimals) {
    const rounded = Math.round(absNum);
    const formatted = rounded.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return `${isNeg ? '-' : ''}$ ${formatted}`;
  }

  const formatted = absNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${isNeg ? '-' : ''}$ ${formatted}`;
}

/**
 * Calcula el saldo de una cuenta sumando su balance inicial + transacciones
 */
export const calculateAccountBalance = mathCalculateAccountBalance;

/**
 * Calcula el saldo actual de una cuenta en su divisa nativa considerando sus transacciones
 */
export function getAccountNativeBalance(account, transactions = [], trm = 4050) {
  if (!account) return 0;
  try {
    const accCurrency = account?.currency || 'COP';
    const accId = account?.id;

    // 1. Determinar el saldo almacenado directo de la cuenta
    const storedBalance = safeNumber(
      account.balance ?? account.current_balance ?? account.currentBalance ?? account.saldo ?? account.initialBalance ?? account.initial_balance ?? 0
    );

    const rawInitial = account.initialBalance !== undefined 
      ? account.initialBalance 
      : (account.initial_balance !== undefined ? account.initial_balance : undefined);

    const initial = safeNumber(rawInitial !== undefined ? rawInitial : storedBalance);

    // 2. Cruce estrictamente por ID único (sin comparaciones por nombre de texto)
    const accTxs = Array.isArray(transactions)
      ? transactions.filter((t) => {
          if (!t || !accId) return false;
          const tAccId = t.accountId || t.account_id;
          const tToId = t.toAccountId || t.to_account_id;
          const tFromId = t.fromAccountId || t.from_account_id;
          return tAccId === accId || tToId === accId || tFromId === accId;
        })
      : [];

    // 3. Si la cuenta no tiene transacciones asociadas, respetar incondicionalmente el saldo almacenado
    if (accTxs.length === 0) {
      return storedBalance;
    }

    let inc = 0;
    let exp = 0;

    for (const t of accTxs) {
      if (!t) continue;
      let nativeAmount = 0;
      const tAmount = safeNumber(t.amount);

      const tAccId = t.accountId || t.account_id;
      const isThisAccount = tAccId === accId;

      const tToId = t.toAccountId || t.to_account_id;
      const isToThis = tToId === accId;

      const tFromId = t.fromAccountId || t.from_account_id;
      const isFromThis = tFromId === accId;

      const isTransfer = Boolean(
        t.isTransfer || 
        t.is_transfer || 
        t.type === 'transfer' || 
        t.type === 'transferencia' || 
        t.categoryId === 'cat-transfer' ||
        t.category_id === 'cat-transfer' ||
        t.subcategoryId === 'sub-transfer-in' ||
        t.subcategoryId === 'sub-transfer-out'
      );

      // Lectura robusta de la divisa de la transacción y conversión contextual
      const txCurrency = t.currency || t.originalCurrency || t.original_currency;

      if (txCurrency === accCurrency) {
        // Si la transacción ya está en la misma moneda que la cuenta (ej. USD en cuenta USD),
        // no se aplica ninguna conversión.
        nativeAmount = tAmount;
      } else if (accCurrency === 'COP') {
        // Si la cuenta es COP y la transacción vino en moneda extranjera
        if (txCurrency === 'USD') {
          const usdRate = safeNumber(t.exchangeRate || t.exchange_rate) || safeNumber(trm) || 4050;
          nativeAmount = tAmount * usdRate;
        } else if (txCurrency === 'EUR') {
          const eurRate = safeNumber(t.exchangeRate || t.exchange_rate) || Math.round((safeNumber(trm) || 4050) * 1.08);
          nativeAmount = tAmount * eurRate;
        } else {
          nativeAmount = tAmount;
        }
      } else if (accCurrency === 'USD') {
        // Solo si la transacción es explícitamente en COP se divide por la TRM
        if (txCurrency === 'COP') {
          const usdRate = safeNumber(t.exchangeRate || t.exchange_rate) || safeNumber(trm) || 4050;
          nativeAmount = tAmount / (usdRate || 1);
        } else {
          nativeAmount = tAmount;
        }
      } else if (accCurrency === 'EUR') {
        if (txCurrency === 'COP') {
          const eurRate = safeNumber(t.exchangeRate || t.exchange_rate) || Math.round((safeNumber(trm) || 4050) * 1.08);
          nativeAmount = tAmount / (eurRate || 1);
        } else {
          nativeAmount = tAmount;
        }
      } else {
        nativeAmount = tAmount;
      }

      const txType = String(t.type || '').toLowerCase();

      if (isTransfer) {
        // Caso A: Registro único de transferencia (un solo registro que vincula origen y destino)
        if (txType === 'transfer' || txType === 'transferencia') {
          if (isFromThis && !isToThis) {
            exp += nativeAmount;
          } else if (isToThis && !isFromThis) {
            inc += nativeAmount;
          }
        } 
        // Caso B: Par atómico de transferencias (outTx con expense, inTx con income)
        // Cada registro debe afectar ÚNICA y EXCLUSIVAMENTE a su cuenta asignada (isThisAccount)
        else if (txType === 'expense' || txType === 'gasto' || t.subcategoryId === 'sub-transfer-out') {
          if (isThisAccount) {
            exp += nativeAmount;
          }
        } else if (txType === 'income' || txType === 'ingreso' || t.subcategoryId === 'sub-transfer-in') {
          if (isThisAccount) {
            inc += nativeAmount;
          }
        }
      } else {
        // Transacción estándar (ingreso o gasto regular)
        if (isThisAccount) {
          if (txType === 'income' || txType === 'ingreso') inc += nativeAmount;
          if (txType === 'expense' || txType === 'gasto') exp += nativeAmount;
        }
      }
    }

    // Redondeo defensivo de máximo 2 decimales para eliminar errores de punto flotante
    const rawRes = initial + inc - exp;
    const res = Math.round(rawRes * 100) / 100;
    return isNaN(res) || !isFinite(res) ? 0 : res;
  } catch (err) {
    console.warn('Error calculando saldo nativo de cuenta:', err);
    return safeNumber(account?.balance || account?.initialBalance || 0);
  }
}
