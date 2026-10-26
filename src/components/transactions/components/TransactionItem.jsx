import React from 'react';
import { Camera, Pencil, Trash2, ArrowRightLeft } from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import CategoryIcon from '../../categories/components/CategoryIcon';
import SwipeableRow from '../../common/SwipeableRow';
import { usePrivacy } from '../../../context/PrivacyContext';
import { MONTH_NAMES } from '../../../data/initialData';
import { parseInvoiceTx } from '../../../utils/invoiceTxUtils';

export const formatTxDateClean = (tx) => {
  if (!tx?.date) return '';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  const yesterdayStr = `${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`;
  if (tx.date === todayStr) return 'Hoy';
  if (tx.date === yesterdayStr) return 'Ayer';
  const parts = tx.date.split('-');
  if (parts.length < 3) return tx.date;
  const monthName = MONTH_NAMES[parseInt(parts[1], 10) - 1]?.slice(0, 3) || parts[1];
  return `${parseInt(parts[2], 10)} ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
};

export default function TransactionItem({
  transaction: tx, category, account, onSelect, onEdit, onDelete, onViewReceipt
}) {
  const { formatMoney } = usePrivacy();
  const type = String(tx?.type || '').toLowerCase();
  const amt = Number(tx?.amount) || 0;
  const isDebtRelated = Boolean(tx?.isDebtPayment || tx?.isDebtDisbursement || tx?.debtId || tx?.paymentId);
  const isPlaceholderTransfer = tx?.displayName === 'Transferencia a Destino' || tx?.displayName === 'Transferencia desde Origen';
  const isTransfer = !isDebtRelated && (type === 'transfer' || type === 'transferencia' || Boolean(tx?.isTransfer));
  const isNeutral = tx?.isConsolidatedTransfer || (isTransfer && (!tx?.displayType || tx?.displayType === 'transfer'));
  const isExpense = !isNeutral && (tx?.displayType === 'expense' || (!isTransfer && (type === 'expense' || type === 'gasto' || type === 'egreso' || amt < 0)));
  const isIncome = !isNeutral && (tx?.displayType === 'income' || (!isTransfer && (type === 'income' || type === 'ingreso' || (!isExpense && amt > 0))));

  const inv = parseInvoiceTx(tx);
  const invoiceTitle = inv.consecutive ? (/^factura\b/i.test(inv.consecutive) ? inv.consecutive : `Factura ${inv.consecutive}`) : 'Factura';
  const hasCustomCapitalNote = Boolean(tx?.isCapitalReturn && (tx?.note || tx?.description));
  const rawDisplayName = hasCustomCapitalNote
    ? (tx.note || tx.description)
    : (isPlaceholderTransfer && (tx?.note || tx?.description))
      ? (tx.note || tx.description)
      : (!isDebtRelated ? tx?.displayName : null);
  const displayName = inv.isInvoice ? invoiceTitle : (rawDisplayName || tx?.displayName || tx?.note || tx?.categoryName || 'Movimiento');

  const handleDelete = () => {
    const txLabel = displayName || 'este movimiento';
    const msg = tx.isConsolidatedTransfer
      ? `¿Eliminar permanentemente la transferencia "${txLabel}"? Se revertirá en ambas cuentas.`
      : `¿Eliminar permanentemente "${txLabel}"?`;
    if (window.confirm(msg)) onDelete?.(tx.linkedIds || tx.id || tx);
  };

  return (
    <SwipeableRow
      onEdit={onEdit ? () => onEdit(tx) : undefined} onDelete={onDelete ? handleDelete : undefined}
      className="w-full" contentClassName="bg-transparent touch-pan-y"
    >
      <div 
        onClick={() => onSelect?.(tx)}
        className="p-3 sm:p-3.5 hover:bg-white/30 dark:hover:bg-white/[0.05] transition-colors cursor-pointer flex items-center justify-between gap-3 select-none active:bg-white/40 dark:active:bg-white/[0.08] touch-pan-y"
      >
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center bg-transparent border-0 shadow-none">
            {isTransfer ? (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
            ) : (
              <BrandIcon
                name={displayName || ''} size={32}
                fallback={<CategoryIcon category={inv.isInvoice ? 'Facturación' : (category || tx.categoryName)} status={isExpense ? 'negative' : isIncome ? 'positive' : 'neutral'} size={24} withBadge={false} />}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{displayName}</span>
              {tx.receiptImage && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onViewReceipt?.(tx); }} className="inline-flex items-center text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors shrink-0 cursor-pointer" title="Ver recibo adjunto">
                  <Camera className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="text-xs text-slate-600 dark:text-zinc-400 font-medium truncate flex items-center gap-1.5 mt-0.5">
              {inv.isInvoice ? (
                <>
                  <span className="truncate">{tx.accountName || 'Principal'}</span>
                  {inv.clientName && <span className="truncate">· {inv.clientName}</span>}
                </>
              ) : isTransfer ? (
                <span className="truncate">{tx.displaySubtitle || `Transferencia interna · ${formatTxDateClean(tx)}`}</span>
              ) : isDebtRelated && tx?.displaySubtitle && !tx.displaySubtitle.includes('Transferencia') ? (
                <span className="truncate">{tx.displaySubtitle}</span>
              ) : (
                <>
                  {tx.categoryName && tx.note && <span>{tx.categoryName} · </span>}
                  <span className="truncate">{tx.accountName || 'Principal'}</span>
                  {tx.subcategoryName && <span className="truncate">· {tx.subcategoryName}</span>}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0 pl-2">
          <span
            className={`text-sm sm:text-base font-black font-mono tracking-tight tabular-nums whitespace-nowrap ${isIncome ? 'text-emerald-500 dark:text-emerald-400' : isExpense ? '' : 'text-slate-700 dark:text-slate-200'}`}
            style={isExpense ? { color: '#dc2626' } : undefined}
          >
            {isExpense ? '-' : isIncome ? '+' : ''}{formatMoney(Math.abs(amt))}
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            {tx.originalCurrency && tx.originalCurrency !== 'COP' && (
              <span className="text-[10px] text-slate-600 dark:text-zinc-400 font-medium font-mono tabular-nums hidden sm:inline">
                ({Number(tx.originalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {tx.originalCurrency})
              </span>
            )}
            <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-semibold font-mono">{formatTxDateClean(tx)}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-end w-14 shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(tx); }}
              className="p-1 rounded-md text-slate-500 hover:text-emerald-500 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              title="Editar"
              aria-label="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              className="p-1 rounded-md text-slate-500 hover:text-rose-500 dark:text-zinc-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="Eliminar"
              aria-label="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </SwipeableRow>
  );
}
