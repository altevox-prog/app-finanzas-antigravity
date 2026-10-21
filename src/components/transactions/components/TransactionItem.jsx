import React from 'react';
import { Camera, Pencil, Trash2 } from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import CategoryIcon from '../../categories/components/CategoryIcon';
import SwipeableRow from '../../common/SwipeableRow';
import { usePrivacy } from '../../../context/PrivacyContext';
import { MONTH_NAMES } from '../../../data/initialData';

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
  const isTransfer = type === 'transfer' || type === 'transferencia' || Boolean(tx?.isTransfer);
  const isExpense = !isTransfer && (type === 'expense' || type === 'gasto' || type === 'egreso' || amt < 0);
  const isIncome = !isTransfer && (type === 'income' || type === 'ingreso' || (!isExpense && amt > 0));

  const handleDelete = () => {
    const txLabel = tx.note || tx.categoryName || 'este movimiento';
    if (window.confirm(`¿Eliminar permanentemente "${txLabel}"?`)) onDelete?.(tx.id || tx);
  };

  return (
    <SwipeableRow
      onEdit={onEdit ? () => onEdit(tx) : undefined} onDelete={onDelete ? handleDelete : undefined}
      className="w-full" contentClassName="bg-white dark:bg-zinc-900 touch-pan-y"
    >
      <div 
        onClick={() => onSelect?.(tx)}
        className="p-2.5 sm:p-3 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer flex items-center justify-between gap-3 select-none active:bg-slate-100/60 dark:active:bg-white/[0.05] touch-pan-y"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0 overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-zinc-800 border border-slate-200/60 dark:border-white/10 shadow-xs">
            <BrandIcon
              name={tx.note || tx.categoryName || ''} size={18}
              fallback={<CategoryIcon category={category || tx.categoryName} status={isExpense ? 'negative' : isIncome ? 'positive' : 'neutral'} size={16} withBadge={false} />}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{tx.note || tx.categoryName}</span>
              {tx.receiptImage && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onViewReceipt?.(tx); }} className="inline-flex items-center text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors shrink-0 cursor-pointer" title="Ver recibo adjunto">
                  <Camera className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="text-xs text-slate-400 dark:text-zinc-500 font-medium truncate flex items-center gap-1.5 mt-0.5">
              {tx.categoryName && tx.note && <span>{tx.categoryName} · </span>}
              <span className="truncate">{tx.accountName || 'Principal'}</span>
              {tx.subcategoryName && <span className="truncate">· {tx.subcategoryName}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0 pl-2">
          <span className={`text-sm font-black font-mono tracking-tight tabular-nums whitespace-nowrap ${isExpense ? 'text-rose-500 dark:text-rose-400' : isIncome ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-600 dark:text-zinc-300'}`}>
            {isExpense ? '-' : isIncome ? '+' : ''}{formatMoney(Math.abs(amt))}
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            {tx.originalCurrency && tx.originalCurrency !== 'COP' && (
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono tabular-nums hidden sm:inline">
                ({Number(tx.originalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {tx.originalCurrency})
              </span>
            )}
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">{formatTxDateClean(tx)}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-end w-14 shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {onEdit && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(tx); }} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-emerald-600 flex items-center justify-center transition-colors cursor-pointer" title="Editar" aria-label="Editar">
              <Pencil className="w-3 h-3" />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer" title="Eliminar" aria-label="Eliminar">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </SwipeableRow>
  );
}
