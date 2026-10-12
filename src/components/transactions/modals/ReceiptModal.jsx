import React from 'react';
import { Camera, X } from 'lucide-react';
import { usePrivacy } from '../../../context/PrivacyContext';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { MONTH_NAMES } from '../../../data/initialData';

/**
 * Función auxiliar para formatear fecha y hora simulada o real de una transacción
 */
export const formatTxDateTime = (tx) => {
  if (!tx?.date) return '';
  const parts = tx.date.split('-');
  if (parts.length < 3) return tx.date;
  const [y, m, d] = parts;
  const monthIdx = parseInt(m, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] ? MONTH_NAMES[monthIdx].slice(0, 3) : m;
  const dayNum = parseInt(d, 10);

  let timeStr = tx.time;
  if (!timeStr) {
    const hours = ['09:15', '11:30', '13:45', '14:30', '16:20', '18:10', '20:05'];
    let hash = 0;
    const str = tx.id || tx.date || '';
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % hours.length;
    timeStr = hours[Math.abs(hash)];
  }

  return `${dayNum} ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} · ${timeStr}`;
};

/**
 * ReceiptModal
 * Lightbox flotante para visualizar el comprobante de recibo o factura adjunto
 */
export default function ReceiptModal({ transaction, onClose }) {
  const { formatMoney } = usePrivacy();

  useBackHandler(Boolean(transaction), onClose);

  if (!transaction) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900 text-slate-900 dark:text-white space-y-3.5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <h4 className="text-sm font-bold flex items-center gap-1.5 truncate">
              <Camera className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="truncate">Comprobante / Recibo</span>
            </h4>
            <p className="text-[11px] opacity-60 truncate">
              {transaction.note || transaction.categoryName} · {formatMoney(transaction.amount)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 opacity-60 hover:opacity-100 cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden max-h-[55vh] bg-slate-100 dark:bg-zinc-800 flex items-center justify-center border border-slate-200/80 dark:border-white/[0.08]">
          <img 
            src={transaction.receiptImage} 
            alt="Foto del recibo" 
            className="w-full h-auto object-contain max-h-[55vh]"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] opacity-60 pt-0.5">
          <span>Fecha: {formatTxDateTime(transaction)}</span>
          <span>Cuenta: {transaction.accountName}</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-xs font-bold transition-colors bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
