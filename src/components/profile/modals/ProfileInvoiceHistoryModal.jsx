import React from 'react';
import { X, ReceiptText } from 'lucide-react';
import { useInvoicesHistory } from '../../../hooks/useInvoicesHistory';
import InvoiceHistoryList from '../../invoicing/history/InvoiceHistoryList';

export default function ProfileInvoiceHistoryModal({
  onClose,
  accounts = [],
  transactions = [],
  onAddTransaction,
  onDeleteTransaction
}) {
  const {
    invoices,
    loading,
    pendingTotal,
    markAsPaid,
    deleteInvoice
  } = useInvoicesHistory({ accounts, transactions, onAddTransaction, onDeleteTransaction });

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full sm:h-auto sm:max-h-[88vh] sm:max-w-2xl bg-white dark:bg-[#0c0e14] sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200/80 dark:border-white/10 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 shrink-0 bg-white/80 dark:bg-[#0c0e14]/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Cuentas por Cobrar / Facturas
              </h3>
              <p className="text-[11px] text-slate-400">Historial de cobros y facturas emitidas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar pb-16 sm:pb-6">
          <InvoiceHistoryList
            invoices={invoices}
            pendingTotal={pendingTotal}
            accounts={accounts}
            onMarkAsPaid={markAsPaid}
            onDelete={deleteInvoice}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
