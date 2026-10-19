import { safeNumber, toSafeNumber } from './mathHelpers';

/**
 * Saldo de Cuentas y Métodos de Pago
 * Saldo Actual = Saldo Inicial + Sum(Ingresos) - Sum(Gastos) + Sum(Transferencias Entrantes) - Sum(Transferencias Salientes)
 */
export const calculateAccountBalance = (account, transactions = []) => {
  if (!account) return 0;

  const storedBalance = toSafeNumber(
    account.balance ?? account.current_balance ?? account.currentBalance ?? account.saldo ?? 0
  );

  const rawInitial = account.initialBalance !== undefined 
    ? account.initialBalance 
    : (account.initial_balance !== undefined ? account.initial_balance : undefined);

  const baseBalance = rawInitial !== undefined ? toSafeNumber(rawInitial) : storedBalance;

  const txs = Array.isArray(transactions) ? transactions : [];
  if (txs.length === 0) {
    return storedBalance !== 0 ? storedBalance : baseBalance;
  }

  const accId = account.id;

  const movements = txs.reduce((acc, t) => {
    if (!t) return acc;

    const tAccId = t.accountId || t.account_id;
    const isThisAccount = tAccId === accId;

    const tToId = t.toAccountId || t.to_account_id;
    const isToThisAccount = tToId === accId;

    const tFromId = t.fromAccountId || t.from_account_id;
    const isFromThisAccount = tFromId === accId;

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
        t.isCapitalReturn ||
        t.subcategoryId === 'sub-retorno-capital' ||
        t.subcategory_id === 'sub-retorno-capital' ||
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
        t.isDebtCapital ||
        t.subcategoryId === 'sub-amortizacion-deuda' ||
        t.subcategory_id === 'sub-amortizacion-deuda' ||
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
