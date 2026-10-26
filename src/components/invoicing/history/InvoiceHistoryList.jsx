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
      <div className="p-4 sm:p-5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/60 dark:border-white/[0.08] rounded-3xl shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block truncate">
              Cuentas por Cobrar
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white truncate">
              {formatCOP(pendingTotal)}
            </h3>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block">Pendientes</span>
          <span className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono">
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
            className="w-full text-xs font-medium pl-8 pr-3 py-2 rounded-xl border border-white/80 dark:border-white/[0.08] bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md text-slate-900 dark:text-white placeholder:text-slate-500 focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 shadow-xs"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1 bg-slate-900/[0.04] dark:bg-white/[0.05] border border-slate-900/[0.08] dark:border-white/[0.08] backdrop-blur-md p-1 rounded-2xl self-start sm:self-auto shrink-0 text-xs">
          {[
            { id: 'all', label: `Todas (${invoices.length})` },
            { id: 'pending', label: `Pendientes (${pendingCount})` },
            { id: 'paid', label: `Pagadas (${paidCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1 font-semibold rounded-xl transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white/70 dark:bg-white/15 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-700 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Listado de ítems */}
      {filteredInvoices.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/60 dark:border-white/[0.08] rounded-3xl space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-900/[0.05] dark:bg-white/5 mx-auto flex items-center justify-center text-slate-500 dark:text-zinc-400">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">
            {searchTerm || statusFilter !== 'all' ? 'No se encontraron facturas con ese filtro' : 'No hay facturas en el historial'}
          </p>
          <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium max-w-sm mx-auto leading-relaxed">
            {searchTerm || statusFilter !== 'all' ? 'Prueba cambiando el término de búsqueda o filtro.' : 'Completa los datos en el editor y pulsa "Guardar en historial" para registrarlas.'}
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
