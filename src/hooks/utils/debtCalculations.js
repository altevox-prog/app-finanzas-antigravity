import { calculateElapsedMonths } from '../../utils/debtAlerts';
import { toSafeNumber } from '../../utils/financeMath';
import { ensureUUID } from '../../services/syncEngine';
import { normalizeRemoteDebt } from '../../services/sync/syncNormalizers';

export const mapSupabaseRowToDebt = (row) => (!row || typeof row !== 'object' ? row : normalizeRemoteDebt(row));

export function mapDebtToSupabasePayload(item, userId) {
  const cleanId = ensureUUID(item.id), nowIso = new Date().toISOString();
  const base = toSafeNumber(item.totalAmount || item.amount || item.principalAmount || item.initialAmount);
  const rem = toSafeNumber(item.remainingAmount ?? item.remaining_amount ?? base);
  const raw = {
    payments: Array.isArray(item.payments) ? item.payments : [],
    disbursements: Array.isArray(item.disbursements) ? item.disbursements : [],
    initialAmount: toSafeNumber(item.initialAmount ?? item.initial_amount ?? base),
    totalAmount: base,
    dueDate: item.dueDate || item.due_date || item.computedDueDate || null,
    interestRate: toSafeNumber(item.interestRate || item.interest_rate || 0),
    startDate: item.startDate || item.start_date || null,
    notes: item.notes || item.note || '',
    updated_at: nowIso
  };
  const person = item.personName || item.name || 'Deuda';
  return {
    id: cleanId, user_id: userId, name: person, person, person_name: person,
    type: item.type || 'payable', amount: base, total_amount: base, remaining_amount: rem,
    status: item.status || (rem <= 0.01 ? 'paid' : 'active'),
    due_date: raw.dueDate, notes: `PAYMENTS_JSON:${JSON.stringify(raw)}`, raw_data: raw, updated_at: nowIso
  };
}

export function recalculateDebtBalance(debtItem, payments = null, disbursements = null) {
  const allP = payments ?? debtItem.payments ?? [], allD = disbursements ?? debtItem.disbursements ?? [];
  const totalDisb = allD.reduce((s, d) => s + toSafeNumber(d.amount), 0);
  const initial = toSafeNumber(debtItem.initialAmount ?? debtItem.initial_amount ?? (toSafeNumber(debtItem.principalAmount || debtItem.totalAmount || debtItem.amount) - totalDisb));
  const base = initial + totalDisb, rate = toSafeNumber(debtItem.interestRate);
  const months = debtItem.startDate ? calculateElapsedMonths(debtItem.startDate) : toSafeNumber(debtItem.monthsElapsed);
  const accruedInt = (months > 0 && rate > 0) ? Math.round(base * (rate / 100) * months) : toSafeNumber(debtItem.accruedInterest);
  const totalCapPaid = allP.reduce((s, p) => s + (p.capitalAmount !== undefined ? toSafeNumber(p.capitalAmount) : (p.mode === 'interest' ? 0 : toSafeNumber(p.amount))), 0);
  const totalIntPaid = allP.reduce((s, p) => s + (p.interestAmount !== undefined ? toSafeNumber(p.interestAmount) : (p.mode === 'interest' ? toSafeNumber(p.amount) : 0)), 0);
  const remCap = Math.max(0, base - totalCapPaid), remInt = Math.max(0, accruedInt - totalIntPaid), totRem = remCap + remInt;
  const isPaid = totRem <= 1 || remCap <= 0.01;
  return {
    ...debtItem, initialAmount: initial, initial_amount: initial, principalAmount: base, totalAmount: base, amount: base, total_amount: base,
    accruedInterest: accruedInt, monthsElapsed: months, remainingCapital: remCap, remainingInterest: remInt, totalRemaining: totRem,
    remainingAmount: remCap, remaining_amount: remCap, current_balance: remCap, isPaid, is_paid: isPaid,
    status: isPaid ? 'paid' : (debtItem.status === 'paid' ? 'active' : (debtItem.status || 'active')),
    payments: allP, disbursements: allD, updated_at: new Date().toISOString()
  };
}

export function ensureFinanzasCategory(categories, setCategories) {
  const existingFin = categories.find((c) => c.name?.toLowerCase().trim() === 'finanzas');
  const finanzasCatId = existingFin?.id || 'cat-finanzas';
  if (!existingFin && setCategories) {
    setCategories((prev) => prev.some((c) => c.name?.toLowerCase().trim() === 'finanzas') ? prev : [...prev, {
      id: 'cat-finanzas', name: 'Finanzas', type: 'expense', color: '#007AFF', icon: '💳',
      subcategories: [{ id: 'sub-amortizacion-deuda', name: 'Amortización de deuda' }, { id: 'sub-intereses-deuda', name: 'Intereses de deuda' }, { id: 'sub-cobro-prestamo', name: 'Cobro de préstamo' }]
    }]);
  }
  return finanzasCatId;
}

export function buildDebtPaymentTransactions({ debtItem, payment, targetAccId, targetAccName, opDate, paymentId, finanzasCatId }) {
  const capAmt = payment.capitalAmount !== undefined ? Number(payment.capitalAmount) : (payment.mode === 'interest' ? 0 : Number(payment.amount) || 0);
  const intAmt = payment.interestAmount !== undefined ? Number(payment.interestAmount) : (payment.mode === 'interest' ? Number(payment.amount) || 0 : 0);
  const isReceivable = debtItem?.type === 'receivable', debtName = debtItem?.personName || debtItem?.name || (isReceivable ? 'Préstamo' : 'Deuda');
  const createdTxIds = [], newTxs = [];

  const makeTx = (amt, subId, subName, isCap) => {
    const txId = crypto.randomUUID();
    createdTxIds.push(txId);
    return {
      id: txId, date: opDate, type: isReceivable ? 'income' : 'expense', amount: amt, originalCurrency: 'COP', originalAmount: amt, exchangeRate: 1,
      categoryId: isReceivable && !isCap ? 'cat-8' : finanzasCatId, categoryName: isReceivable && !isCap ? 'Ingresos' : 'Finanzas',
      subcategoryId: subId, subcategoryName: subName, accountId: targetAccId, accountName: targetAccName,
      note: payment.note ? `${payment.note} (${isCap ? 'Capital' : 'Intereses'} ${debtName})` : `${isCap ? 'Amortización de deuda' : 'Intereses de deuda'} - ${debtName}`,
      debtId: debtItem?.id, paymentId, isDebtPayment: true, ...(isCap ? { isTransfer: true, is_transfer: true, isDebtCapital: true } : {})
    };
  };

  if (intAmt > 0) newTxs.push(makeTx(intAmt, isReceivable ? 'sub-intereses-cobrados' : 'sub-intereses-deuda', isReceivable ? 'Intereses cobrados' : 'Intereses de deuda', false));
  if (capAmt > 0) newTxs.push(makeTx(capAmt, isReceivable ? 'sub-cobro-prestamo' : 'sub-amortizacion-deuda', isReceivable ? 'Cobro de préstamo / Capital' : 'Amortización de deuda', true));

  return { newTxs, createdTxIds, capAmt, intAmt, totAmt: Number(payment.amount) || (capAmt + intAmt), isReceivable };
}

export function buildDebtDisbursementTransaction({ debtItem, fromAcc, amount, date, notes }) {
  const txUUID = crypto.randomUUID(), disbUUID = crypto.randomUUID(), fromAccName = fromAcc?.name || 'Cuenta Principal', debtName = debtItem.personName || debtItem.name || 'Préstamo';
  const nowIso = new Date().toISOString(), opDate = date || nowIso.split('T')[0];
  const tx = {
    id: txUUID, date: opDate, type: 'expense', amount, originalCurrency: fromAcc?.currency || 'COP',
    originalAmount: amount, exchangeRate: 1, categoryId: 'cat-finanzas', categoryName: 'Finanzas',
    subcategoryId: 'sub-desembolso-prestamo', subcategoryName: 'Desembolso de préstamo', accountId: fromAcc?.id, accountName: fromAccName,
    note: notes ? `${notes} (Desembolso adicional a ${debtName})` : `Desembolso adicional - Préstamo a ${debtName}`, debtId: debtItem.id, isDebtDisbursement: true
  };
  const disb = { id: disbUUID, debtId: debtItem.id, amount, date: opDate, fromAccountId: fromAcc?.id, fromAccountName: fromAccName, notes: notes || '', transactionId: txUUID, type: 'INCREMENT' };
  return { tx, disb, opDate, nowIso, debtName };
}
