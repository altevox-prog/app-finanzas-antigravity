/**
 * invoiceTxUtils.js
 * Utilidades puras para formateo y detección de transacciones de facturación.
 */

const INVOICE_REGEX = /^(?:Cobro\s+)?Factura\s+([A-Za-z0-9#\-_]+)(?:\s*[-–:]\s*(.+))?$/i;
const COBRO_REGEX = /^Cobro\s*[-–:]\s*(.+)$/i;

export function parseInvoiceTx(tx) {
  if (!tx || typeof tx !== 'object') {
    return { isInvoice: false, consecutive: null, clientName: null, displayName: '' };
  }

  const rawNote = (tx.note || tx.description || tx.notes || '').trim();
  const cat = String(tx.categoryName || tx.category || '').toLowerCase();
  const hasBillingCat = cat === 'facturación' || cat === 'facturacion' || cat === 'cobro';

  let consecutive = tx.invoice_consecutive || tx.invoiceConsecutive || null;
  let clientName = (tx.client_name || tx.clientName || '').trim() || null;

  const match = rawNote.match(INVOICE_REGEX);
  if (match) {
    if (!consecutive) consecutive = match[1];
    if (!clientName && match[2]) clientName = match[2].trim();
  }

  const cobroMatch = !match ? rawNote.match(COBRO_REGEX) : null;
  if (cobroMatch && !clientName) {
    clientName = cobroMatch[1].trim();
  }

  const isInvoice = Boolean(consecutive || hasBillingCat || match || cobroMatch);

  if (isInvoice && !clientName) {
    const isPrefix = /^(?:cobro\s+)?factura/i.test(rawNote);
    clientName = (!isPrefix && rawNote) ? rawNote : (consecutive || tx.categoryName || 'Factura');
  }

  const displayName = isInvoice
    ? (clientName || (consecutive ? `Factura ${consecutive}` : rawNote || 'Facturación'))
    : (rawNote || tx.categoryName || tx.category || 'Movimiento');

  return {
    isInvoice,
    consecutive,
    clientName: clientName || displayName,
    displayName
  };
}
