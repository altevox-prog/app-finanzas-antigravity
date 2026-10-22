import React from 'react';
import { Calendar, CheckCircle2, Trash2 } from 'lucide-react';
import { formatCOP } from '../../../utils/currencyUtils';

export default function InvoiceHistoryItem({ item = {}, onMarkAsPaid, onDelete, loading = false }) {
  const isPaid = item.status === 'paid';

  const handleDelete = () => {
    const msg = isPaid
      ? `¿Eliminar la factura ${item.consecutive}? Se revertirá el cobro registrado en tus movimientos.`
      : `¿Eliminar la factura ${item.consecutive}?`;
    if (window.confirm(msg)) onDelete?.(item);
  };

  return (
    <div className="p-3.5 sm:p-4 bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-xs space-y-3 transition-all hover:border-slate-300 dark:hover:border-white/20 w-full overflow-hidden">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200">
            {item.consecutive}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isPaid
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
          }`}>
            {isPaid ? 'Pagada' : 'Pendiente'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isPaid && (
            <button
              type="button"
              disabled={loading}
              onClick={() => onMarkAsPaid(item)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Marcar como Pagada</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
            title="Eliminar registro"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight break-words">
            {item.client_name}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Cuenta {isPaid ? 'acreditada' : 'destino'}: <span className={`font-medium ${isPaid ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>{item.account_target || 'Por definir al cobrar'}</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs text-slate-400 uppercase tracking-wider block text-[10px]">Total</span>
          <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
            {formatCOP(item.total_amount)}
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 truncate">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Emisión: {item.issue_date || '---'}</span>
        </div>
        {item.due_date && <span className="shrink-0 text-[11px]">Vence: {item.due_date}</span>}
      </div>
    </div>
  );
}