import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from '../utils/toast';
import { generateUUID } from '../utils/recordMerger';
import { fetchInvoicesApi, insertInvoiceApi, markInvoicePaidApi, deleteInvoiceApi } from '../components/invoicing/services/invoiceHistoryService';

const STORAGE_KEY = 'invoices_history_records';
const loadLocal = () => { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } };
const persistLocal = (list) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {} };

export function useInvoicesHistory({ accounts = [], transactions = [], onAddTransaction, onDeleteTransaction } = {}) {
  const [invoices, setInvoices] = useState(loadLocal);
  const [loading, setLoading] = useState(false);

  const fetchInvoices = useCallback(async () => {
    const data = await fetchInvoicesApi();
    if (Array.isArray(data)) { setInvoices(data); persistLocal(data); }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const saveInvoice = async (invoiceData = {}, total = 0, accountTarget = '') => {
    const clientName = invoiceData.client?.name?.trim();
    const finalAmount = Number(total) || 0;
    if (!clientName || finalAmount <= 0) {
      toast.error('Indica un cliente y agrega ítems con valor mayor a 0');
      return null;
    }

    const consecutive = `FAC-${String(invoices.length + 1).padStart(3, '0')}`;
    const localRecord = {
      id: generateUUID(),
      consecutive, client_name: clientName, total_amount: finalAmount, status: 'pending', transaction_id: null,
      issue_date: invoiceData.meta?.issueDate || new Date().toISOString().split('T')[0],
      due_date: invoiceData.meta?.dueDate || null,
      account_target: accountTarget || invoiceData.banking?.colombia?.bank || null,
      created_at: new Date().toISOString()
    };

    setInvoices((prev) => { const next = [localRecord, ...prev]; persistLocal(next); return next; });
    const cloudData = await insertInvoiceApi(localRecord);
    if (cloudData) {
      setInvoices((prev) => {
        const updated = prev.map((item) => (item.id === localRecord.id ? cloudData : item));
        persistLocal(updated);
        return updated;
      });
    }

    toast.success(`Factura ${consecutive} guardada en Cuentas por Cobrar`);
    return localRecord;
  };

  const markAsPaid = async (item, selectedAccount = null) => {
    if (!item) return;
    const inv = typeof item === 'object' ? item : invoices.find((i) => i.id === item);
    if (!inv || inv.status === 'paid') return;
    setLoading(true);
    try {
      const isObj = selectedAccount && typeof selectedAccount === 'object';
      const q = typeof selectedAccount === 'string' ? selectedAccount.trim().toLowerCase() : '';
      const matchedAcc = isObj ? selectedAccount : (q ? accounts.find((a) => a.id === selectedAccount || a.name?.toLowerCase() === q) : null) || accounts[0] || null;
      const targetAccName = isObj ? (selectedAccount.name || 'Principal') : (matchedAcc?.name || selectedAccount || inv.account_target || 'Principal');
      const targetAccId = matchedAcc?.id || (isObj ? (selectedAccount.id || '') : '');

      let createdTxId = null;
      if (typeof onAddTransaction === 'function') {
        const clientClean = (inv.client_name || '').trim();
        const displayClient = clientClean || `Factura ${inv.consecutive}`;
        const res = await onAddTransaction({
          type: 'income', amount: Number(inv.total_amount) || 0, category: 'Facturación', categoryName: 'Facturación',
          description: displayClient, note: displayClient, invoice_consecutive: inv.consecutive, invoiceConsecutive: inv.consecutive,
          client_name: clientClean, clientName: clientClean, accountId: targetAccId, accountName: targetAccName,
          date: new Date().toISOString().split('T')[0]
        });
        createdTxId = res?.id || res?.newTx?.id || null;
      }

      const updated = { ...inv, status: 'paid', account_target: targetAccName, transaction_id: createdTxId };
      setInvoices((prev) => { const next = prev.map((item) => (item.id === inv.id ? updated : item)); persistLocal(next); return next; });
      await markInvoicePaidApi(inv.id, createdTxId, targetAccName);
      toast.success(`Factura ${inv.consecutive} marcada como pagada en ${targetAccName}`);
    } catch {
      toast.error('No se pudo registrar el ingreso de la factura');
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (itemOrId) => {
    const target = typeof itemOrId === 'object' ? itemOrId : invoices.find((i) => i.id === itemOrId);
    const id = target?.id || itemOrId;
    if (!id) {
      console.error('deleteInvoice: ID de factura inválido');
      return;
    }

    let txId = target?.transaction_id;
    if (!txId && target?.status === 'paid' && Array.isArray(transactions)) {
      const found = transactions.find((t) => (t.invoice_consecutive || t.invoiceConsecutive) === target.consecutive || (target.consecutive && (t.note?.includes(target.consecutive) || t.description?.includes(target.consecutive))));
      if (found) txId = found.id;
    }

    try {
      await deleteInvoiceApi(id, txId);
      if (txId && typeof onDeleteTransaction === 'function') {
        try { await onDeleteTransaction(txId); } catch {}
      }
      setInvoices((prev) => {
        const next = prev.filter((inv) => inv.id !== id);
        persistLocal(next);
        return next;
      });
      toast.success('Factura eliminada');
    } catch (err) {
      console.error('Error al eliminar factura:', err);
      toast.error('No se pudo eliminar la factura');
    }
  };

  const pendingTotal = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === 'pending')
      .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  }, [invoices]);

  return { invoices, loading, pendingTotal, saveInvoice, markAsPaid, deleteInvoice, refetch: fetchInvoices };
}

export default useInvoicesHistory;
