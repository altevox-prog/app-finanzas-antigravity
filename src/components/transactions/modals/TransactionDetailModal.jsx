import React from 'react';
import { ArrowDownRight, ArrowUpRight, X } from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import { usePrivacy } from '../../../context/PrivacyContext';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { formatTxDateTime } from './ReceiptModal';
import { parseInvoiceTx } from '../../../utils/invoiceTxUtils';

const DetailRow = ({ label, children }) => (
  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
    <span className="text-slate-500 dark:text-slate-400 font-medium">{label}</span>
    <span className="font-bold text-slate-900 dark:text-slate-100 text-right">{children}</span>
  </div>
);

export default function TransactionDetailModal({ transaction, categories = [], onClose, onViewReceipt }) {
  const { formatMoney } = usePrivacy();
  useBackHandler(Boolean(transaction), onClose);
  if (!transaction) return null;

  const inv = parseInvoiceTx(transaction);
  const amt = Number(transaction.amount || 0);
  const type = transaction.type;
  const isTransfer = type === 'transfer' || type === 'transferencia' || Boolean(transaction.isTransfer);
  const isExpense = !isTransfer && (type === 'expense' || type === 'gasto' || type === 'egreso' || amt < 0);
  const isIncome = !isTransfer && (type === 'income' || type === 'ingreso' || (!isExpense && amt > 0));
  const categoryColor = categories.find((c) => c.id === transaction.categoryId)?.color || '#007AFF';

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white flex flex-col space-y-4 max-h-[85vh] overflow-y-auto animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Detalle del Movimiento</h4>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Información completa registrada</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer" title="Cerrar modal">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center py-4 px-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1">
          <BrandIcon name={inv.isInvoice ? inv.displayName : (transaction.note || transaction.categoryName || '')} size={30} wrapperClassName="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shadow-xs overflow-hidden mx-auto mb-2" fallback={null} />
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold mb-1 ${isExpense ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400' : isIncome ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'}`}>
            {isExpense ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            <span>{inv.isInvoice ? 'Ingreso por Facturación' : isExpense ? 'Gasto' : isIncome ? 'Ingreso' : 'Transferencia'}</span>
          </div>
          <div className={`text-3xl font-black tabular-nums tracking-tight ${isExpense ? 'text-rose-500 dark:text-rose-400' : isIncome ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
            {isExpense ? '-' : isIncome ? '+' : ''}{formatMoney(Math.abs(amt))}
          </div>
          {transaction.originalCurrency && transaction.originalCurrency !== 'COP' && (
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              ({Number(transaction.originalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {transaction.originalCurrency} @ ${Number(transaction.exchangeRate || 1).toLocaleString('es-CO')} COP)
            </p>
          )}
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {inv.isInvoice ? inv.clientName : (transaction.note || transaction.categoryName)}
          </p>
        </div>

        <div className="space-y-2 text-xs">
          {transaction.originalCurrency && transaction.originalCurrency !== 'COP' && (
            <div className="p-3 rounded-xl border space-y-1.5 bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-500/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">Divisa original</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{Number(transaction.originalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {transaction.originalCurrency}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                <span>Tasa de cambio (TRM)</span>
                <span className="font-bold tabular-nums">$ {Number(transaction.exchangeRate || 1).toLocaleString('es-CO')} COP</span>
              </div>
            </div>
          )}

          {inv.isInvoice ? (
            <>
              <DetailRow label="Tipo"><span className="text-emerald-600 dark:text-emerald-400">Ingreso por Facturación</span></DetailRow>
              {inv.consecutive && <DetailRow label="Consecutivo Factura"><span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">{inv.consecutive}</span></DetailRow>}
              <DetailRow label="Cliente completo">{inv.clientName}</DetailRow>
              <DetailRow label="Cuenta de acreditación">
                <span className="flex items-center gap-1.5 justify-end"><BrandIcon name={transaction.accountName || 'Principal'} size={18} /><span>{transaction.accountName || 'Principal'}</span></span>
              </DetailRow>
              <DetailRow label="Fecha de cobro"><span className="tabular-nums font-semibold">{formatTxDateTime(transaction)}</span></DetailRow>
            </>
          ) : (
            <>
              <DetailRow label="Categoría">
                <span className="flex items-center gap-1.5 justify-end"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColor }} />{transaction.categoryName || 'General'}</span>
              </DetailRow>
              {transaction.subcategoryName && <DetailRow label="Subcategoría">{transaction.subcategoryName}</DetailRow>}
              <DetailRow label="Cuenta / Tarjeta">
                <span className="flex items-center gap-1.5 justify-end"><BrandIcon name={transaction.accountName || 'Principal'} size={18} /><span>{transaction.accountName || 'Principal'}</span></span>
              </DetailRow>
              <DetailRow label="Fecha y Hora"><span className="tabular-nums font-semibold">{formatTxDateTime(transaction)}</span></DetailRow>
            </>
          )}

          {transaction.receiptImage && (
            <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
              <span className="text-slate-500 dark:text-slate-400 font-medium block">Comprobante / Recibo</span>
              <div onClick={() => { onClose(); onViewReceipt?.(transaction); }} className="relative rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-700 max-h-36 cursor-pointer group flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                <img src={transaction.receiptImage} alt="Recibo" className="w-full h-36 object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">Toca para ampliar</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
