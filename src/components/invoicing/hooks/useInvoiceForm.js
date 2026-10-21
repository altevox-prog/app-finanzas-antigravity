import { useState, useEffect, useMemo } from 'react';
import { INITIAL_INVOICE_STATE } from '../constants/invoiceDefaults';

const STORAGE_KEY = 'invoice_draft_data';

const getInitialState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_INVOICE_STATE;
  } catch {
    return INITIAL_INVOICE_STATE;
  }
};

export function useInvoiceForm() {
  const [invoice, setInvoice] = useState(getInitialState);

  const invoiceSerialized = JSON.stringify(invoice);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, invoiceSerialized);
    } catch {}
  }, [invoiceSerialized]);

  const setTemplate = (template) => {
    const defaultTitle = template === 'servicios' ? 'FACTURA DE SERVICIOS' : 'SOPORTE EN ADQUISICIONES EFECTUADAS, NO OBLIGADOS A FACTURAR';
    setInvoice((prev) => ({ ...prev, template, docTitle: defaultTitle }));
  };

  const updateEmitter = (patch) => setInvoice((prev) => ({ ...prev, emitter: { ...prev.emitter, ...patch } }));
  const updateClient = (patch) => setInvoice((prev) => ({ ...prev, client: { ...prev.client, ...patch } }));
  const updateMeta = (patch) => setInvoice((prev) => ({ ...prev, meta: { ...prev.meta, ...patch } }));
  const updateTax = (patch) => setInvoice((prev) => ({ ...prev, tax: { ...prev.tax, ...patch } }));

  const updateBanking = (section, patch) => {
    setInvoice((prev) => {
      if (typeof section === 'object') return { ...prev, banking: { ...prev.banking, ...section } };
      return {
        ...prev,
        banking: {
          ...prev.banking,
          [section]: typeof prev.banking[section] === 'object' ? { ...prev.banking[section], ...patch } : patch
        }
      };
    });
  };

  const addItem = () => {
    const newItem = { id: String(Date.now()), description: '', quantity: 1, unitPrice: 0 };
    setInvoice((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (id) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((item) => item.id !== id) : [{ id: '1', description: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const updateItem = (id, patch) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    }));
  };

  const handleLogoUpload = (e) => {
    const file = e?.target?.files?.[0] || e;
    if (!file || !(file instanceof Blob)) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') updateEmitter({ logo: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => updateEmitter({ logo: '' });

  const rawItemsSubtotal = invoice.items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const applyIva = Boolean(invoice.tax?.applyIva);
  const taxRate = Number(invoice.tax?.rate) || 0;

  const { subtotal, ivaAmount, total } = useMemo(() => {
    const sub = Math.max(0, rawItemsSubtotal);
    const iva = applyIva ? (sub * taxRate) / 100 : 0;
    return { subtotal: sub, ivaAmount: iva, total: sub + iva };
  }, [rawItemsSubtotal, applyIva, taxRate]);

  const issueDateStr = String(invoice.meta?.issueDate || '');
  const dueDateStr = String(invoice.meta?.dueDate || '');

  const isDateValid = useMemo(() => {
    if (!issueDateStr || !dueDateStr) return true;
    return new Date(dueDateStr) >= new Date(issueDateStr);
  }, [issueDateStr, dueDateStr]);

  const resetInvoice = () => {
    setInvoice(INITIAL_INVOICE_STATE);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return {
    invoice, setInvoice, setTemplate,
    updateEmitter, updateClient, updateMeta, updateBanking, updateTax,
    addItem, removeItem, updateItem, handleLogoUpload, removeLogo,
    subtotal, ivaAmount, total, isDateValid, resetInvoice
  };
}

export default useInvoiceForm;