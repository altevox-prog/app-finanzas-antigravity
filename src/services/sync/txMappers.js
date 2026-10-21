import { ensureUUID } from '../syncEngine';
import { generateUUID } from '../../utils/recordMerger';
import { toSafeNumber } from '../../utils/financeMath';
import { normalizeRemoteTransaction } from './syncNormalizers';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function mapSupabaseRowToTransaction(row) {
  if (!row || typeof row !== 'object') return row;
  const norm = normalizeRemoteTransaction(row), raw = row.raw_data || {}, isTransfer = Boolean(row.is_transfer ?? raw.isTransfer ?? (norm.type === 'transfer'));
  const desc = row.description || row.notes || 'Movimiento', notes = row.notes || row.description || raw.note || '', now = new Date().toISOString();
  return {
    ...norm, id: row.id, date: row.date || (row.created_at ? String(row.created_at).split('T')[0] : now.split('T')[0]),
    type: norm.type || 'expense', amount: toSafeNumber(row.amount), originalAmount: toSafeNumber(row.original_amount ?? raw.originalAmount ?? row.amount),
    originalCurrency: row.original_currency || raw.originalCurrency || 'COP', exchangeRate: toSafeNumber(row.exchange_rate ?? raw.exchangeRate ?? 1),
    accountId: row.account_id || raw.accountId || null, account_id: row.account_id || raw.accountId || null, accountName: raw.accountName || '',
    categoryId: row.category_id || raw.categoryId || null, category_id: row.category_id || raw.categoryId || null, categoryName: norm.categoryName || 'General', category: norm.category || 'General',
    subcategoryId: raw.subcategoryId || null, subcategoryName: raw.subcategoryName || null, description: desc, note: notes, notes, isTransfer, is_transfer: isTransfer,
    fromAccountId: raw.fromAccountId || null, toAccountId: raw.toAccountId || null, fromAccountName: raw.fromAccountName || null, toAccountName: raw.toAccountName || null,
    transferId: raw.transferId || raw.transfer_id || row.transfer_id || null, receiptImage: raw.receiptImage || null,
    created_at: row.created_at || now, updated_at: row.updated_at || now
  };
}

export function mapTransactionToSupabasePayload(tx, userId) {
  const cleanId = (tx.id && UUID_REGEX.test(tx.id)) ? tx.id : ensureUUID(tx.id || generateUUID()), now = new Date().toISOString();
  const rawAccId = tx.accountId || tx.account_id || null, isTransfer = Boolean(tx.isTransfer || tx.is_transfer || ['transfer', 'transferencia'].includes(tx.type));
  const desc = (tx.description || tx.notes || tx.note || 'Movimiento').trim(), note = (tx.note || tx.notes || '').trim();
  const amount = toSafeNumber(tx.amount), origAmount = toSafeNumber(tx.originalAmount ?? tx.amount), origCurr = tx.originalCurrency || 'COP';
  const exRate = toSafeNumber(tx.exchangeRate || 1), catId = tx.categoryId || tx.category_id || null, catName = tx.categoryName || tx.category || 'General';

  return {
    id: cleanId, user_id: userId, type: tx.type || 'expense', amount, original_amount: origAmount, original_currency: origCurr,
    exchange_rate: exRate, account_id: rawAccId ? ensureUUID(rawAccId) : null, category_id: catId, category: catName,
    date: tx.date || now.split('T')[0], description: desc, notes: note, is_transfer: isTransfer,
    raw_data: { originalAmount: origAmount, originalCurrency: origCurr, exchangeRate: exRate, accountName: tx.accountName || '', categoryId: catId, categoryName: catName, subcategoryId: tx.subcategoryId || null, subcategoryName: tx.subcategoryName || null, fromAccountId: tx.fromAccountId || null, toAccountId: tx.toAccountId || null, fromAccountName: tx.fromAccountName || null, toAccountName: tx.toAccountName || null, isTransfer, receiptImage: tx.receiptImage || null, note, transferId: tx.transferId || tx.transfer_id || null },
    updated_at: tx.updated_at || now
  };
}
