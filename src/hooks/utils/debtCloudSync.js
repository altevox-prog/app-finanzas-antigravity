import { ensureUUID } from '../../services/syncEngine';
import { mapDebtToSupabasePayload } from './debtCalculations';

export async function syncPaymentToCloud({ supabase, user, newTxs, updatedDebt, paymentId, itemId, totAmt, mode, opDate, note, nowIso }) {
  if (!supabase || !user?.id) return;
  try {
    newTxs.forEach((tx) => {
      supabase.from('transactions').upsert({
        id: ensureUUID(tx.id), user_id: user.id, account_id: tx.accountId ? ensureUUID(tx.accountId) : null,
        amount: tx.amount, type: tx.type, date: tx.date, description: tx.note, category: tx.categoryName,
        notes: tx.note, is_transfer: Boolean(tx.isTransfer), updated_at: nowIso
      }, { onConflict: 'id' }).then(null, () => {});
    });
    supabase.from('debts').upsert(mapDebtToSupabasePayload(updatedDebt, user.id), { onConflict: 'id' }).then(null, () => {});
    supabase.from('debt_payments').upsert({
      id: paymentId, debt_id: ensureUUID(itemId), user_id: user.id, amount: totAmt,
      payment_type: mode === 'interest' ? 'INTEREST' : 'CAPITAL', payment_date: opDate,
      notes: note || 'Abono registrado', created_at: nowIso
    }, { onConflict: 'id' }).then(null, () => {});
  } catch (_) {}
}

export async function syncDisbursementToCloud({ supabase, user, tx, disb, fromAccountId, disbAmount, opDate, debtName, nowIso, updatedDebt }) {
  if (!supabase || !user?.id) return;
  try {
    supabase.from('transactions').upsert({
      id: ensureUUID(tx.id), user_id: user.id, account_id: fromAccountId ? ensureUUID(fromAccountId) : null,
      amount: disbAmount, type: 'expense', date: opDate, description: tx.note, category: 'Finanzas',
      category_id: 'cat-finanzas', notes: `LEND_MORE: Desembolso adicional a ${debtName}`, is_transfer: false, updated_at: nowIso
    }, { onConflict: 'id' }).then(null, () => {});
    supabase.from('debt_payments').insert({
      id: ensureUUID(disb.id), debt_id: ensureUUID(disb.debtId), user_id: user.id, amount: disbAmount,
      type: 'INCREMENT', payment_type: 'INCREMENT', movement_type: 'LEND_MORE', payment_date: opDate,
      notes: disb.notes || 'Desembolso adicional / Prestar más', created_at: nowIso
    }).then(null, () => {});
    await supabase.from('debts').upsert(mapDebtToSupabasePayload(updatedDebt, user.id), { onConflict: 'id' });
  } catch (_) {}
}

export async function syncDeletePaymentToCloud({ supabase, user, updatedDebt, paymentId, transactionIds = [] }) {
  if (!supabase || !user?.id) return;
  try {
    const cleanPaymentId = ensureUUID(paymentId);
    supabase.from('debts').upsert(mapDebtToSupabasePayload(updatedDebt, user.id), { onConflict: 'id' }).then(null, () => {});
    supabase.from('debt_payments').delete().eq('id', cleanPaymentId).then(null, () => {});
    supabase.from('transactions').delete().eq('payment_id', cleanPaymentId).then(null, () => {});
    if (Array.isArray(transactionIds) && transactionIds.length > 0) {
      transactionIds.forEach((tId) => {
        if (tId) supabase.from('transactions').delete().eq('id', ensureUUID(tId)).then(null, () => {});
      });
    }
  } catch (_) {}
}

export async function syncDeleteDebtToCloud({ supabase, user, canonicalId }) {
  if (!supabase) return;
  try {
    const uid = user?.id || '';
    await supabase.from('debt_payments').delete().eq('debt_id', canonicalId).eq('user_id', uid).then(null, () => {});
    await supabase.from('debts').delete().eq('id', canonicalId).eq('user_id', uid);
  } catch (_) {}
}
