import React, { useState } from 'react';
import { Clock, FileText } from 'lucide-react';
import { formatCOP } from '../../../utils/currencyUtils';
import InvoiceHistoryItem from './InvoiceHistoryItem';
import PaymentAccountModal from './PaymentAccountModal';

export default function InvoiceHistoryList({
  invoices = [],
  pendingTotal = 0,
  accounts = [],
  onMarkAsPaid,
  onDelete,
  loading = false
}) {
  const [selectedForPayment, setSelectedForPayment] = useState(null);

  const handleConfirmPayment = async (account) => {
    if (!selectedForPayment) return;
    const inv = selectedForPayment;
    setSelectedForPayment(null);
    await onMarkAsPaid?.(inv, account);
  };

  return (
    <div className="space-y-4">
      {/* Tarjeta Resumen: Total por Cobrar */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Cuentas por Cobrar
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              {formatCOP(pendingTotal)}
            </h3>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Facturas Pendientes</span>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
            {invoices.filter((i) => i.status === 'pending').length} de {invoices.length}
          </span>
        </div>
      </div>

      {/* Listado de ítems */}
      {invoices.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-[#12141C] border border-slate-200/70 dark:border-white/10 rounded-2xl space-y-2 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 mx-auto flex items-center justify-center text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No hay facturas en el historial</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Completa los datos en el editor y pulsa "Guardar en Historial" para registrarlas como cuentas por cobrar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <InvoiceHistoryItem
              key={inv.id}
              item={inv}
              onMarkAsPaid={setSelectedForPayment}
              onDelete={onDelete}
              loading={loading}
            />
          ))}
        </div>
      )}

      {selectedForPayment && (
        <PaymentAccountModal
          invoice={selectedForPayment}
          accounts={accounts}
          loading={loading}
          onClose={() => setSelectedForPayment(null)}
          onConfirm={handleConfirmPayment}
        />
      )}
    </div>
  );
}
