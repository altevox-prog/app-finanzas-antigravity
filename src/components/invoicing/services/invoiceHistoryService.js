import { supabase, isSupabaseConfigured, getSupabaseUser } from '../../../services/supabaseClient';

export async function fetchInvoicesApi() {
  if (!isSupabaseConfigured || !supabase) return null;
  const user = await getSupabaseUser();
  if (!user?.id) return null;
  const { data, error } = await supabase
    .from('invoices_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return error ? null : (data || []);
}

export async function insertInvoiceApi(record) {
  if (!isSupabaseConfigured || !supabase) return null;
  const user = await getSupabaseUser();
  if (!user?.id) return null;
  const { data, error } = await supabase
    .from('invoices_history')
    .insert([{ ...record, user_id: user.id }])
    .select()
    .single();
  return error ? null : data;
}

export async function markInvoicePaidApi(id, transactionId, accountTarget = null) {
  if (!isSupabaseConfigured || !supabase || !id) return;
  const user = await getSupabaseUser();
  if (!user?.id) return;
  const payload = { status: 'paid', transaction_id: transactionId };
  if (accountTarget) payload.account_target = accountTarget;
  await supabase
    .from('invoices_history')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id);
}

export async function deleteInvoiceApi(id, transactionId = null) {
  if (!id) {
    console.error('deleteInvoiceApi: ID de factura no especificado');
    throw new Error('ID de factura no especificado');
  }

  if (!isSupabaseConfigured || !supabase) return { success: true, localOnly: true };

  const user = await getSupabaseUser();
  if (!user?.id) {
    console.error('deleteInvoiceApi: No hay usuario autenticado en Supabase');
    throw new Error('No hay usuario autenticado');
  }

  // Desvincular Foreign Key si existe transaction_id previo al borrado
  if (transactionId) {
    try {
      await supabase.from('invoices_history').update({ transaction_id: null }).eq('id', id).eq('user_id', user.id);
      await supabase.from('transactions').delete().eq('id', transactionId).eq('user_id', user.id);
    } catch (e) {
      console.warn('Aviso al desvincular transacción:', e);
    }
  }

  const { error, count } = await supabase
    .from('invoices_history')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error al eliminar factura en Supabase:', error.message);
    throw error;
  }

  return { success: true, count };
}
