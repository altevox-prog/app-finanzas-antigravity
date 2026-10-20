/**
 * transactionSubmitService.js
 * Preparación y persistencia para transacciones locales y remotas.
 */

import { supabase, isSupabaseConfigured, getSupabaseUser } from '../supabaseClient';
import { toast } from '../../utils/toast';

export function buildTransactionPayload({
  numAmount, currency = 'COP', exchangeRate = 1, enableDecimals = false,
  type = 'expense', date, note = '', receiptImage = null, categoryId = '',
  subcategoryId = '', accountId = '', categories = [], accounts = [], editingMovement = null
}) {
  const rateNum = currency === 'COP' ? 1 : (parseFloat(exchangeRate) || 1);
  const calculatedAmount = currency === 'COP' ? numAmount : (numAmount * rateNum);
  const finalAmount = enableDecimals ? Number(calculatedAmount.toFixed(2)) : Math.round(calculatedAmount);

  const cat = Array.isArray(categories) ? categories.find(c => c && c.id === categoryId) : null;
  const subcat = Array.isArray(cat?.subcategories) ? cat.subcategories.find(s => s && s.id === subcategoryId) : null;
  const acc = (Array.isArray(accounts) ? accounts.find(a => a && a.id === accountId) : null) || accounts?.[0];
  const selectedAccountId = accountId || acc?.id || '';
  const categoryName = cat ? cat.name : 'General';
  const transactionDate = date ? (date.includes('T') ? date : `${date}T12:00:00.000Z`) : new Date().toISOString();

  const newTxId = editingMovement?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)));

  const newTx = {
    id: newTxId,
    date,
    type,
    amount: finalAmount,
    originalCurrency: currency,
    originalAmount: numAmount,
    exchangeRate: currency === 'COP' ? 1 : rateNum,
    categoryId: categoryId || cat?.id || '',
    categoryName,
    subcategoryId: subcat ? subcat.id : null,
    subcategoryName: subcat ? subcat.name : null,
    accountId: selectedAccountId,
    accountName: acc ? acc.name : 'Principal',
    note: (note || '').trim(),
    receiptImage: receiptImage || null
  };

  return { newTx, selectedAccount: acc, selectedAccountId, finalAmount, transactionDate, categoryName };
}

export async function saveTransactionRecord({ txPayload, account, isEditing = false }) {
  if (!isSupabaseConfigured || !supabase) return { success: false, skipped: true };

  try {
    const user = await getSupabaseUser();
    if (!user?.id) return { success: false, error: 'No user authenticated' };

    const selectedAccountId = txPayload.accountId;
    const finalAmount = txPayload.amount;
    const transactionType = txPayload.type;
    const categoryName = txPayload.categoryName || 'General';
    const transactionDate = txPayload.date
      ? (txPayload.date.includes('T') ? txPayload.date : `${txPayload.date}T12:00:00.000Z`)
      : new Date().toISOString();

    const baseRecord = {
      account_id: selectedAccountId,
      amount: finalAmount,
      type: transactionType,
      category: categoryName,
      notes: (txPayload.note || '').trim(),
      date: transactionDate,
      updated_at: new Date().toISOString()
    };

    let data = null;
    let error = null;

    if (isEditing && txPayload?.id) {
      const res = await supabase.from('transactions').update(baseRecord).eq('id', txPayload.id).eq('user_id', user.id);
      data = res.data;
      error = res.error;

      if (error?.message?.includes('category')) {
        const fallback = { ...baseRecord, category_id: txPayload.categoryId || null };
        delete fallback.category;
        const resFallback = await supabase.from('transactions').update(fallback).eq('id', txPayload.id).eq('user_id', user.id);
        data = resFallback.data;
        error = resFallback.error;
      }
    } else {
      const freshId = (txPayload?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(txPayload.id))
        ? txPayload.id
        : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);

      const insertRecord = { ...baseRecord, user_id: user.id, ...(freshId ? { id: freshId } : {}) };
      const res = await supabase.from('transactions').upsert([insertRecord], { onConflict: 'id' });
      data = res.data;
      error = res.error;

      if (error?.message?.includes('category')) {
        const fallback = { ...insertRecord, category_id: txPayload.categoryId || null };
        delete fallback.category;
        const resFallback = await supabase.from('transactions').upsert([fallback], { onConflict: 'id' });
        data = resFallback.data;
        error = resFallback.error;
      }
    }

    if (error) {
      console.error('Error al guardar transacción en Supabase:', error.message || error);
      toast.error(`Error Supabase: ${error.message || 'No se pudo guardar la transacción'}`);
    }

    if (selectedAccountId && account) {
      const currentBalance = Number(account.balance ?? account.initialBalance ?? 0);
      const newBalance = transactionType === 'expense' ? (currentBalance - finalAmount) : (currentBalance + finalAmount);
      await supabase.from('accounts').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('id', selectedAccountId).eq('user_id', user.id).catch(() => {});
    }

    return { success: !error, data, error };
  } catch (cloudErr) {
    console.error('Excepción al interactuar con Supabase:', cloudErr);
    return { success: false, error: cloudErr };
  }
}
