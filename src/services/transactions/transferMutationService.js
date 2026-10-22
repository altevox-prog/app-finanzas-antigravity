import { generateUUID } from '../../utils/recordMerger';
import { toSafeNumber } from '../../utils/financeMath';

export function processTransactionUpdate(updatedTx, transactions = [], accounts = []) {
  const rawId = updatedTx.id;
  const primaryId = (rawId && String(rawId).startsWith('pair-'))
    ? (updatedTx.linkedIds?.[0] || String(rawId).replace('pair-', ''))
    : rawId;

  const existingTx = transactions.find((t) => t.id === primaryId || (t.linkedIds && t.linkedIds.includes(primaryId))) || updatedTx;

  const wasTransfer = Boolean(
    existingTx.isTransfer || existingTx.is_transfer ||
    existingTx.isConsolidatedTransfer ||
    existingTx.transferId || existingTx.transfer_id ||
    ['transfer', 'transferencia'].includes(existingTx.type) ||
    ['sub-transfer-in', 'sub-transfer-out'].includes(existingTx.subcategoryId)
  );

  const isNowTransfer = Boolean(
    updatedTx.type === 'transfer' ||
    updatedTx.isTransfer || updatedTx.is_transfer ||
    (updatedTx.destinationAccountId && updatedTx.destinationAccountId !== updatedTx.accountId)
  );

  const existingTransferId = existingTx.transferId || existingTx.transfer_id || updatedTx.transferId || updatedTx.transfer_id;
  const counterpartId = updatedTx.linkedIds?.[1] || existingTx.linkedIds?.[1];

  let existingCounterpart = null;
  if (counterpartId) {
    existingCounterpart = transactions.find((t) => t.id === counterpartId);
  }
  if (!existingCounterpart && existingTransferId) {
    existingCounterpart = transactions.find((t) => t.id !== primaryId && (t.transferId === existingTransferId || t.transfer_id === existingTransferId));
  }
  if (!existingCounterpart && wasTransfer) {
    existingCounterpart = transactions.find((t) =>
      t.id !== primaryId &&
      Boolean(t.isTransfer || t.is_transfer || ['transfer', 'transferencia'].includes(t.type)) &&
      t.date === existingTx.date &&
      Math.abs(toSafeNumber(t.amount) - toSafeNumber(existingTx.amount)) < 0.01
    );
  }

  const nowIso = new Date().toISOString();

  if (isNowTransfer) {
    const fromAccId = updatedTx.accountId || updatedTx.account_id || updatedTx.fromAccountId;
    const toAccId = updatedTx.destinationAccountId || updatedTx.destination_account_id || updatedTx.toAccountId;
    const amount = toSafeNumber(updatedTx.amount);
    const date = updatedTx.date || nowIso.split('T')[0];
    const rawNote = (updatedTx.note || updatedTx.notes || '').replace(/^Transferencia\s+(a|desde)\s+[^:]*(:\s*)?/i, '').trim();
    const origCurr = updatedTx.originalCurrency || 'COP';
    const origAmt = toSafeNumber(updatedTx.originalAmount ?? amount);
    const exRate = toSafeNumber(updatedTx.exchangeRate || 1);

    const fromAcc = accounts.find((a) => a?.id === fromAccId);
    const toAcc = accounts.find((a) => a?.id === toAccId);
    const fromName = fromAcc?.name || updatedTx.accountName || updatedTx.fromAccountName || 'Origen';
    const toName = toAcc?.name || updatedTx.toAccountName || 'Destino';

    const transferId = existingTransferId || generateUUID();
    const outDesc = `Transferencia a ${toName}${rawNote ? `: ${rawNote}` : ''}`;
    const inDesc = `Transferencia desde ${fromName}${rawNote ? `: ${rawNote}` : ''}`;

    const baseMeta = {
      amount, originalAmount: origAmt, originalCurrency: origCurr, exchangeRate: exRate,
      date, categoryId: 'cat-transfer', categoryName: 'Transferencias', category: 'Transferencias',
      isTransfer: true, is_transfer: true, transferId, transfer_id: transferId,
      fromAccountId: fromAccId, fromAccountName: fromName, toAccountId: toAccId, toAccountName: toName,
      destination_account_id: toAccId, destinationAccountId: toAccId,
      receiptImage: updatedTx.receiptImage || null, updated_at: nowIso
    };

    const outTx = {
      ...existingTx, ...updatedTx, ...baseMeta,
      id: primaryId, type: 'expense', subcategoryId: 'sub-transfer-out', subcategoryName: 'Transferencia Enviada',
      accountId: fromAccId, account_id: fromAccId, accountName: fromName,
      note: outDesc, notes: outDesc, description: outDesc
    };
    delete outTx.isConsolidatedTransfer;
    delete outTx.linkedIds;

    const inId = existingCounterpart?.id || generateUUID();
    const inTx = {
      ...(existingCounterpart || {}), ...baseMeta,
      id: inId, type: 'income', subcategoryId: 'sub-transfer-in', subcategoryName: 'Transferencia Recibida',
      accountId: toAccId, account_id: toAccId, accountName: toName,
      note: inDesc, notes: inDesc, description: inDesc,
      created_at: existingCounterpart?.created_at || nowIso
    };
    delete inTx.isConsolidatedTransfer;
    delete inTx.linkedIds;

    const filtered = transactions.filter((t) => t.id !== primaryId && t.id !== inId && t.id !== rawId && (!existingCounterpart || t.id !== existingCounterpart.id));
    return {
      nextTransactions: [outTx, inTx, ...filtered],
      toUpsert: [outTx, inTx],
      toDelete: [],
      updatedTx: outTx
    };
  }

  if (wasTransfer && !isNowTransfer) {
    const cleanTx = {
      ...existingTx, ...updatedTx,
      id: primaryId, type: updatedTx.type || 'expense',
      categoryId: updatedTx.categoryId || null, categoryName: updatedTx.categoryName || 'General', category: updatedTx.category || 'General',
      subcategoryId: updatedTx.subcategoryId || null, subcategoryName: updatedTx.subcategoryName || null,
      accountId: updatedTx.accountId || updatedTx.account_id, account_id: updatedTx.accountId || updatedTx.account_id,
      fromAccountId: null, fromAccountName: null, toAccountId: null, toAccountName: null,
      destination_account_id: null, destinationAccountId: null, isTransfer: false, is_transfer: false,
      transferId: null, transfer_id: null, updated_at: nowIso
    };
    delete cleanTx.isConsolidatedTransfer;
    delete cleanTx.linkedIds;

    const idsToRemove = new Set([rawId, primaryId]);
    if (existingCounterpart) idsToRemove.add(existingCounterpart.id);
    const nextTransactions = [cleanTx, ...transactions.filter((t) => !idsToRemove.has(t.id))];

    return {
      nextTransactions,
      toUpsert: [cleanTx],
      toDelete: existingCounterpart ? [existingCounterpart.id] : [],
      updatedTx: cleanTx
    };
  }

  const cleanTx = {
    ...existingTx, ...updatedTx, id: primaryId,
    amount: toSafeNumber(updatedTx.amount), originalAmount: toSafeNumber(updatedTx.originalAmount ?? updatedTx.amount),
    exchangeRate: toSafeNumber(updatedTx.exchangeRate || 1), updated_at: nowIso
  };
  const nextTransactions = transactions.map((t) => (t.id === primaryId || t.id === rawId ? cleanTx : t));

  return {
    nextTransactions,
    toUpsert: [cleanTx],
    toDelete: [],
    updatedTx: cleanTx
  };
}
