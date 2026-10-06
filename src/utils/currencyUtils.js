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

  if (curr === 'USD') {
    const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `$ ${formatted}${showSuffix ? ' USD' : ''}`;
  }
  if (curr === 'EUR') {
    const formatted = num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `€ ${formatted}${showSuffix ? ' EUR' : ''}`;
  }
  // COP
  const formatted = Math.round(num).toLocaleString('es-CO');
  return `$ ${formatted}${showSuffix ? ' COP' : ''}`;
}

/**
 * Formato COP estándar abreviado o redondeado
 */
export function formatCOP(amount) {
  const num = Math.round(toSafeNumber(amount));
  return `$ ${num.toLocaleString('es-CO')}`;
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
    const accName = account?.name;
    const initial = safeNumber(account.initialBalance ?? account.balance ?? account.saldo ?? 0);

    const accTxs = Array.isArray(transactions) 
      ? transactions.filter(t => {
          if (!t) return false;
          const tAccId = t.accountId || t.account_id;
          const tAccName = t.account || t.accountName;
          const tToId = t.toAccountId || t.to_account_id;
          const tToName = t.toAccountName;
          const tFromId = t.fromAccountId || t.from_account_id;
          const tFromName = t.fromAccountName;

          return (
            tAccId === accId ||
            (accName && tAccName === accName) ||
            tToId === accId ||
            (accName && tToName === accName) ||
            tFromId === accId ||
            (accName && tFromName === accName)
          );
        }) 
      : [];

    let inc = 0;
    let exp = 0;

    for (const t of accTxs) {
      if (!t) continue;
      let nativeAmount = 0;
      const tAmount = safeNumber(t.amount);

      const tAccId = t.accountId || t.account_id;
      const tAccName = t.account || t.accountName;
      const isThisAccount = tAccId === accId || (accName && tAccName === accName);

      const tToId = t.toAccountId || t.to_account_id;
      const tToName = t.toAccountName;
      const isToThis = tToId === accId || (accName && tToName === accName);

      const tFromId = t.fromAccountId || t.from_account_id;
      const tFromName = t.fromAccountName;
      const isFromThis = tFromId === accId || (accName && tFromName === accName);

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

      // Si la transacción fue registrada con la misma moneda que la cuenta
      const origCur = t.originalCurrency || t.original_currency;
      const origAmt = t.originalAmount ?? t.original_amount;
      if (origCur === accCurrency && origAmt !== undefined) {
        nativeAmount = safeNumber(origAmt);
      } else if (accCurrency === 'COP') {
        nativeAmount = tAmount;
      } else if (accCurrency === 'USD') {
        const usdRate = safeNumber(t.exchangeRate || t.exchange_rate) || safeNumber(trm) || 4050;
        nativeAmount = tAmount / (usdRate || 1);
      } else if (accCurrency === 'EUR') {
        const eurRate = safeNumber(t.exchangeRate || t.exchange_rate) || Math.round((safeNumber(trm) || 4050) * 1.08);
        nativeAmount = tAmount / (eurRate || 1);
      }

      const txType = String(t.type || '').toLowerCase();

      if (isTransfer) {
        // Transferencia única sin tipo específico débito/crédito
        if (txType === 'transfer' || txType === 'transferencia') {
          if (isFromThis) exp += nativeAmount;
          if (isToThis) inc += nativeAmount;
        } 
        // Par de transacciones (gasto en origen, ingreso en destino)
        else if (txType === 'expense' || txType === 'gasto') {
          if (isThisAccount || isFromThis) exp += nativeAmount;
        } 
        else if (txType === 'income' || txType === 'ingreso') {
          if (isThisAccount || isToThis) inc += nativeAmount;
        }
      } else {
        // Transacción estándar
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
