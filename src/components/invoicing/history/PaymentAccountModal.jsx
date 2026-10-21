import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, Building2 } from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import { formatCOP } from '../../../utils/currencyUtils';

const DEFAULT_ACCOUNTS = [
  { id: 'bancolombia', name: 'Bancolombia' },
  { id: 'nequi', name: 'Nequi' },
  { id: 'daviplata', name: 'Daviplata' },
  { id: 'paypal', name: 'PayPal' },
  { id: 'efectivo', name: 'Efectivo' }
];

export default function PaymentAccountModal({
  invoice,
  accounts = [],
  onClose,
  onConfirm,
  loading = false
}) {
  const accountOptions = useMemo(() => {
    if (Array.isArray(accounts) && accounts.length > 0) {
      return accounts.map((a) => ({ id: a.id || a.name, name: a.name, currency: a.currency || 'COP' }));
    }
    return DEFAULT_ACCOUNTS;
  }, [accounts]);

  const [selectedId, setSelectedId] = useState(() => {
    const target = invoice?.account_target?.toLowerCase();
    const match = accountOptions.find(
      (a) => (target && a.name.toLowerCase() === target) || a.name.toLowerCase().includes('bancolombia')
    );
    return match?.id || accountOptions[0]?.id || '';
  });

  if (!invoice) return null;

  const currentAccount = accountOptions.find((a) => a.id === selectedId) || accountOptions[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    onConfirm?.(currentAccount);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm sm:max-w-md bg-white dark:bg-[#12151E] rounded-3xl p-5 shadow-2xl border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white flex flex-col space-y-4 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold">Acreditar Cobro</h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Registrar ingreso en cuenta financiera</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {invoice.consecutive}
            </span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatCOP(invoice.total_amount)}
            </span>
          </div>
          <div className="text-xs">
            <span className="text-slate-400 block text-[11px]">Cliente</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">{invoice.client_name}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Cuenta de Acreditación</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 pointer-events-none z-10">
                <BrandIcon name={currentAccount?.name || 'Cuenta'} size={18} />
              </div>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-[#181B26] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
              >
                {accountOptions.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-white dark:bg-[#181B26] text-slate-900 dark:text-white">
                    {acc.name} {acc.currency ? `(${acc.currency})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              El ingreso se registrará de inmediato en el balance de esta cuenta.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{loading ? 'Procesando...' : 'Confirmar Pago'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
