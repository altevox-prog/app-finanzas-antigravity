import { useState, useEffect } from 'react';

const STORAGE_KEY = 'invoices_history_records';

const getInitialHistory = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export function useInvoiceHistory() {
  const [invoicesList, setInvoicesList] = useState(getInitialHistory);

  const serializedList = JSON.stringify(invoicesList);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializedList);
    } catch {}
  }, [serializedList]);

  const saveInvoice = (invoiceData = {}, total = 0) => {
    const newRecord = {
      id: Date.now().toString(),
      issueDate: invoiceData.meta?.issueDate || new Date().toISOString().split('T')[0],
      dueDate: invoiceData.meta?.dueDate || '',
      clientName: invoiceData.client?.name || 'Cliente sin nombre',
      template: invoiceData.template || 'soporte',
      total: Number(total) || 0,
      fullData: invoiceData
    };

    setInvoicesList((prev) => [newRecord, ...prev]);
    return newRecord;
  };

  const deleteInvoice = (id) => {
    setInvoicesList((prev) => prev.filter((inv) => inv.id !== id));
  };

  return { invoicesList, saveInvoice, deleteInvoice };
}

export default useInvoiceHistory;
