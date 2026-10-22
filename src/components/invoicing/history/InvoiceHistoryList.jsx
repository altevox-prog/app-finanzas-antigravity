import React, { useState, useMemo } from 'react';
import { Clock, FileText, Search, CheckCircle2 } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'paid'

  const pendingCount = invoices.filter((i) => i.status === 'pending').length;
  const paidCount = invoices.filter((i) => i.status === 'paid').length;

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      const q = searchTerm.trim().toLowerCase();
      const matchSearch = !q ||
        (inv.client_name || '').toLowerCase().includes(q) ||
        (inv.consecutive || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [invoices, statusFilter, searchTerm]);

  const handleConfirmPayment = async (account) => {
    if (!selectedForPayment) return;
    const inv = selectedForPayment;
    setSelectedForPayment(null);
    await onMarkAsPaid?.(inv, account);
  };

  return (
    <div className="space-y-4 w-full">
      {/* Tarjeta Resumen: Total por Cobrar */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 block truncate">
              Cuentas por Cobrar
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white truncate">
              {formatCOP(pendingTotal)}
            </h3>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Pendientes</span>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">
            {pendingCount} / {invoices.length}
          </span>
        </div>
      </div>

      {/* Barra de Filtro y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar por cliente o consecutivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-medium pl-8 pr-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 dark:bg-white/5 dark:text-white focus:outline-none focus:border-amber-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl self-start sm:self-auto shrink-0 text-xs">
          {[
            { id: 'all', label: `Todas (${invoices.length})` },
            { id: 'pending', label: `Pendientes (${pendingCount})` },
            { id: 'paid', label: `Pagadas (${paidCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white dark:bg-amber-500 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Listado de ítems */}
      {filteredInvoices.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-[#12141C] border border-slate-200/70 dark:border-white/10 rounded-2xl space-y-2 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 mx-auto flex items-center justify-center text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {searchTerm || statusFilter !== 'all' ? 'No se encontraron facturas con ese filtro' : 'No hay facturas en el historial'}
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {searchTerm || statusFilter !== 'all' ? 'Prueba cambiando el término de búsqueda o filtro.' : 'Completa los datos en el editor y pulsa "Guardar en Historial" para registrarlas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((inv) => (
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
