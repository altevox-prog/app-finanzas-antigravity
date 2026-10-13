/**
 * Servicio de preparación y persistencia para transacciones
 */
import { supabase, isSupabaseConfigured, getSupabaseUser } from '../supabaseClient';
import { toast } from '../../utils/toast';

/**
 * Prepara el payload local y normalizado de una transacción antes de guardarla.
 */
export function buildTransactionPayload({
  numAmount,
  currency = 'COP',
  exchangeRate = 1,
  enableDecimals = false,
  type = 'expense',
  date,
  note = '',
  receiptImage = null,
  categoryId = '',
  subcategoryId = '',
  accountId = '',
  categories = [],
  accounts = [],
  editingMovement = null
}) {
  const rateNum = currency === 'COP' ? 1 : (parseFloat(exchangeRate) || 1);
  const calculatedAmount = currency === 'COP' ? numAmount : (numAmount * rateNum);
  const finalAmount = enableDecimals 
    ? Number(calculatedAmount.toFixed(2)) 
    : Math.round(calculatedAmount);

  const cat = Array.isArray(categories) ? categories.find(c => c && c.id === categoryId) : null;
  const subcat = Array.isArray(cat?.subcategories) ? cat.subcategories.find(s => s && s.id === subcategoryId) : null;
  const acc = (Array.isArray(accounts) ? accounts.find(a => a && a.id === accountId) : null) || accounts?.[0];
  const selectedAccountId = accountId || acc?.id || '';
  const categoryName = cat ? cat.name : 'General';
  const transactionType = type; // 'expense' | 'income'
  const transactionDate = date ? (date.includes('T') ? date : `${date}T12:00:00.000Z`) : new Date().toISOString();

  const newTxId = editingMovement?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('tx-' + Date.now()));

  const newTx = {
    id: newTxId,
    date,
    type: transactionType,
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

  return {
    newTx,
    selectedAccount: acc,
    selectedAccountId,
    finalAmount,
    transactionDate,
    categoryName
  };
}

/**
 * Persiste la transacción en Supabase y actualiza el saldo de la cuenta.
 */
export async function saveTransactionRecord({ txPayload, account, isEditing = false }) {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, skipped: true };
  }

  try {
    const user = await getSupabaseUser();
    if (!user || !user.id) {
      return { success: false, error: 'No user authenticated' };
    }

    const selectedAccountId = txPayload.accountId;
    const finalAmount = txPayload.amount;
    const transactionType = txPayload.type;
    const categoryName = txPayload.categoryName || 'General';
    const transactionDate = txPayload.date
      ? (txPayload.date.includes('T') ? txPayload.date : `${txPayload.date}T12:00:00.000Z`)
      : new Date().toISOString();

    const insertPayload = {
      id: txPayload.id,
      user_id: user.id,
      account_id: selectedAccountId,
      amount: finalAmount,
      type: transactionType,
      category: categoryName,
      notes: (txPayload.note || '').trim() || '',
      date: transactionDate
    };

    let { data, error } = await supabase
      .from('transactions')
      .insert([insertPayload]);

    // Fallback si el esquema de Supabase usa category_id en vez de category
    if (error && error.message && error.message.includes('category')) {
      const fallbackPayload = {
        ...insertPayload,
        category_id: txPayload.categoryId || null
      };
      delete fallbackPayload.category;
      const res = await supabase.from('transactions').insert([fallbackPayload]);
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('Error al guardar transacción en Supabase:', error.message || error);
      toast.error(`Error Supabase: ${error.message || 'No se pudo guardar la transacción'}`);
    } else {
      console.log('Transacción persistida exitosamente en Supabase:', data);
    }

    // Actualizar el saldo de la cuenta exactamente una sola vez en Supabase
    if (selectedAccountId && account) {
      const currentAccBalance = Number(account.balance ?? account.initialBalance ?? 0);
      const newAccountBalance = transactionType === 'expense'
        ? (currentAccBalance - finalAmount)
        : (currentAccBalance + finalAmount);

      const { error: accError } = await supabase
        .from('accounts')
        .update({
          balance: newAccountBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAccountId)
        .eq('user_id', user.id);

      if (accError) {
        console.error('Error al actualizar cuenta en Supabase:', accError.message || accError);
      }
    }

    return { success: !error, data, error };
  } catch (cloudErr) {
    console.error('Excepción de red al interactuar con Supabase:', cloudErr);
    return { success: false, error: cloudErr };
  }
}
