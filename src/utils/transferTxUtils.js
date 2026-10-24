import { formatTxDateClean } from '../components/transactions/components/TransactionItem';

export function isTransferTx(tx) {
  if (!tx) return false;
  if (tx.isDebtPayment || tx.isDebtDisbursement || tx.debtId || tx.paymentId) {
    return false;
  }
  const type = String(tx.type || '').toLowerCase();
  return Boolean(
    tx.isTransfer || tx.is_transfer ||
    ['transfer', 'transferencia'].includes(type) ||
    tx.categoryId === 'cat-transfer' || tx.category === 'Transferencias' ||
    ['sub-transfer-in', 'sub-transfer-out'].includes(tx.subcategoryId)
  );
}

export function parseTransferEndpoints(tx) {
  let fromName = tx.fromAccountName || '', toName = tx.toAccountName || '';
  const text = tx.note || tx.notes || tx.description || '';
  const matchTo = text.match(/transferencia\s+a\s+([^:]+)/i);
  if (matchTo && !toName) toName = matchTo[1].trim();
  const matchFrom = text.match(/transferencia\s+desde\s+([^:]+)/i);
  if (matchFrom && !fromName) fromName = matchFrom[1].trim();

  const isOut = tx.subcategoryId === 'sub-transfer-out' || ['expense', 'gasto', 'egreso'].includes(String(tx.type || '').toLowerCase());
  if (isOut && !fromName) fromName = tx.accountName || tx.account || 'Origen';
  if (!isOut && !toName) toName = tx.accountName || tx.account || 'Destino';
  return { fromName: fromName || 'Origen', toName: toName || 'Destino' };
}

export function consolidateTransfers(transactions = [], accountFilter = 'all') {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];

  // Modo filtrado por cuenta específica: mostrar cada extremo con su dirección y signo
  if (accountFilter && accountFilter !== 'all') {
    return transactions.map((tx) => {
      if (!isTransferTx(tx)) return tx;
      const { fromName, toName } = parseTransferEndpoints(tx);
      const isOut = tx.subcategoryId === 'sub-transfer-out' || ['expense', 'gasto', 'egreso'].includes(String(tx.type || '').toLowerCase());
      const dateStr = tx.date ? String(tx.date).split('T')[0] : '';
      return {
        ...tx,
        isTransfer: true,
        displayName: isOut ? `Transferencia a ${toName}` : `Transferencia desde ${fromName}`,
        displaySubtitle: `Transferencia interna · ${dateStr || 'Reciente'}`,
        displayType: isOut ? 'expense' : 'income'
      };
    });
  }

  // Modo vista global: consolidar pares salida/entrada en un solo movimiento neutro
  const result = [];
  const matchedIds = new Set();

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (!tx || matchedIds.has(tx.id)) continue;

    if (!isTransferTx(tx)) {
      result.push(tx);
      continue;
    }

    const txDate = tx.date ? String(tx.date).split('T')[0] : '';
    const txAmt = Math.abs(Number(tx.amount || 0));
    const txIsOut = tx.subcategoryId === 'sub-transfer-out' || ['expense', 'gasto', 'egreso'].includes(String(tx.type || '').toLowerCase());

    // Buscar contraparte en el resto de la lista
    let counterpart = null;
    for (let j = i + 1; j < transactions.length; j++) {
      const candidate = transactions[j];
      if (!candidate || matchedIds.has(candidate.id) || !isTransferTx(candidate)) continue;

      const cDate = candidate.date ? String(candidate.date).split('T')[0] : '';
      const cAmt = Math.abs(Number(candidate.amount || 0));
      const cIsOut = candidate.subcategoryId === 'sub-transfer-out' || ['expense', 'gasto', 'egreso'].includes(String(candidate.type || '').toLowerCase());

      const sameTransferId = tx.transferId && candidate.transferId && tx.transferId === candidate.transferId;
      const matchesMeta = (sameTransferId) || (
        txDate === cDate &&
        Math.abs(txAmt - cAmt) < 0.01 &&
        txIsOut !== cIsOut
      );

      if (matchesMeta) {
        counterpart = candidate;
        break;
      }
    }

    if (counterpart) {
      matchedIds.add(tx.id);
      matchedIds.add(counterpart.id);

      const outTx = txIsOut ? tx : counterpart;
      const inTx = txIsOut ? counterpart : tx;
      const fromEndpoints = parseTransferEndpoints(outTx);
      const toEndpoints = parseTransferEndpoints(inTx);
      const fromName = outTx.accountName || outTx.account || fromEndpoints.fromName;
      const toName = inTx.accountName || inTx.account || toEndpoints.toName;
      const dateStr = outTx.date ? String(outTx.date).split('T')[0] : txDate;

      result.push({
        ...outTx,
        id: `pair-${outTx.id}`,
        isConsolidatedTransfer: true,
        isTransfer: true,
        type: 'transfer',
        displayType: 'transfer',
        linkedIds: [outTx.id, inTx.id],
        fromAccountName: fromName,
        toAccountName: toName,
        displayName: `${fromName} → ${toName}`,
        title: `${fromName} → ${toName}`,
        note: `${fromName} → ${toName}`,
        description: `${fromName} → ${toName}`,
        displaySubtitle: `Transferencia interna · ${dateStr || 'Reciente'}`,
        amount: txAmt
      });
    } else {
      // Transferencia sin contraparte detectada
      matchedIds.add(tx.id);
      const endpoints = parseTransferEndpoints(tx);
      const dateStr = tx.date ? String(tx.date).split('T')[0] : '';
      result.push({
        ...tx,
        isTransfer: true,
        displayName: txIsOut ? `Transferencia a ${endpoints.toName}` : `Transferencia desde ${endpoints.fromName}`,
        displaySubtitle: `Transferencia interna · ${dateStr || 'Reciente'}`,
        displayType: txIsOut ? 'expense' : 'income'
      });
    }
  }

  return result;
}
