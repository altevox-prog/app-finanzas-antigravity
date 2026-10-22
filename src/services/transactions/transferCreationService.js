import { generateUUID } from '../../utils/recordMerger';
import { toSafeNumber } from '../../utils/financeMath';

export function buildTransferPair({ fromAcc, toAcc, amount, destAmount, fromCurrency, toCurrency, date, note, trm }) {
  if (!fromAcc?.id || !toAcc?.id || fromAcc.id === toAcc.id) return null;
  const transferAmount = toSafeNumber(amount);
  if (transferAmount <= 0) return null;
  const cleanDest = destAmount !== undefined ? toSafeNumber(destAmount) : transferAmount;
  const getRate = (c) => c === 'USD' ? (Number(trm) || 4050) : c === 'EUR' ? Math.round((Number(trm) || 4050) * 1.08) : 1;
  const rate = getRate(fromCurrency), inRate = getRate(toCurrency), copAmount = fromCurrency === 'COP' ? transferAmount : Math.round(transferAmount * rate);
  const nowIso = new Date().toISOString(), txDate = date || nowIso.split('T')[0], transferId = generateUUID();
  const outDesc = `Transferencia a ${toAcc.name}${note ? `: ${note}` : ''}`, inDesc = `Transferencia desde ${fromAcc.name}${note ? `: ${note}` : ''}`;
  const base = { date: txDate, categoryId: 'cat-transfer', categoryName: 'Transferencias', category: 'Transferencias', isTransfer: true, transferId, transfer_id: transferId, updated_at: nowIso, fromAccountId: fromAcc.id, toAccountId: toAcc.id, fromAccountName: fromAcc.name, toAccountName: toAcc.name };
  const outTx = { ...base, id: generateUUID(), type: 'expense', amount: copAmount, originalAmount: transferAmount, originalCurrency: fromCurrency, exchangeRate: rate, subcategoryId: 'sub-transfer-out', subcategoryName: 'Transferencia Enviada', accountId: fromAcc.id, accountName: fromAcc.name, note: outDesc, notes: outDesc, description: outDesc };
  const inTx = { ...base, id: generateUUID(), type: 'income', amount: copAmount, originalAmount: cleanDest, originalCurrency: toCurrency, exchangeRate: inRate, subcategoryId: 'sub-transfer-in', subcategoryName: 'Transferencia Recibida', accountId: toAcc.id, accountName: toAcc.name, note: inDesc, notes: inDesc, description: inDesc };
  return { outTx, inTx };
}
