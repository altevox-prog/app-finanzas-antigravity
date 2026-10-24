import React from 'react';
import { Inbox, ArrowRightLeft } from 'lucide-react';
import CategoryIcon from '../../categories/components/CategoryIcon';
import { parseInvoiceTx } from '../../../utils/invoiceTxUtils';
import { consolidateTransfers } from '../../../utils/transferTxUtils';

export default function RecentMovementsList({
  transactions = [],
  limit = 4,
  onSelectTransaction = null,
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  isReordering = false
}) {
  const safeList = Array.isArray(transactions) ? transactions : [];
  const consolidatedList = consolidateTransfers(safeList, 'all');
  const count = consolidatedList.length;
  const recentTransactions = consolidatedList.slice(0, limit);

  if (count === 0) {
    return (
      <div className="py-6 flex flex-col items-center justify-center text-center">
        <div className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 flex items-center justify-center mb-1.5">
          <Inbox className="w-4 h-4 opacity-70" />
        </div>
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">Sin movimientos</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">No hay movimientos registrados este período.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 w-full">
      {recentTransactions.map((tx, idx) => {
        const type = String(tx?.type || '').toLowerCase();
        const amt = Number(tx?.amount) || 0;
        const isDebtRelated = Boolean(tx?.isDebtPayment || tx?.isDebtDisbursement || tx?.debtId || tx?.paymentId);
        const isPlaceholderTransfer = tx?.displayName === 'Transferencia a Destino' || tx?.displayName === 'Transferencia desde Origen';
        const isTransfer = !isDebtRelated && (type === 'transfer' || type === 'transferencia' || Boolean(tx?.isTransfer));
        const isExpense = !isTransfer && (type === 'expense' || type === 'gasto' || type === 'egreso' || amt < 0);
        const isIncome = !isTransfer && (type === 'income' || type === 'ingreso' || (!isExpense && amt > 0));
        const inv = parseInvoiceTx(tx);
        const dateLabel = tx?.date ? String(tx.date).split('T')[0] : '';
        const accountLabel = tx?.accountName || tx?.account || '';

        const invoiceTitle = inv.consecutive
          ? (/^factura\b/i.test(inv.consecutive) ? inv.consecutive : `Factura ${inv.consecutive}`)
          : 'Factura';
        const rawDisplayName = (!isDebtRelated || !isPlaceholderTransfer) ? tx?.displayName : null;
        const title = inv.isInvoice ? invoiceTitle : (rawDisplayName || tx?.note || tx?.categoryName || tx?.category || 'Movimiento');
        const defaultSubtitle = `${accountLabel ? `${accountLabel} • ` : ''}${dateLabel || 'Reciente'}`;
        const transferSubtitle = tx?.displaySubtitle || `Transferencia interna · ${dateLabel || 'Reciente'}`;
        const subtitle = inv.isInvoice
          ? (dateLabel || 'Reciente')
          : (isTransfer ? transferSubtitle : (isDebtRelated && tx?.displaySubtitle && !tx.displaySubtitle.includes('Transferencia') ? tx.displaySubtitle : defaultSubtitle));

        return (
          <div
            key={tx?.id || idx}
            onClick={(e) => {
              if (isReordering) return;
              if (onSelectTransaction) {
                e.stopPropagation();
                onSelectTransaction(tx);
              }
            }}
            className="flex items-center justify-between gap-2.5 py-1.5 px-2 border-b border-slate-100/80 dark:border-white/[0.04] last:border-b-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors rounded-xl group/item min-h-[44px]"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-white/10 shadow-2xs">
                {isTransfer ? (
                  <div className="w-full h-full flex items-center justify-center text-blue-500 dark:text-blue-400">
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <CategoryIcon
                    category={inv.isInvoice ? 'Facturación' : (tx?.categoryName || tx?.category || tx?.category_id)}
                    icon={tx?.category?.icon || tx?.icon}
                    status={isExpense ? 'negative' : isIncome ? 'positive' : 'neutral'}
                    size={15}
                    withBadge={false}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover/item:text-emerald-500 transition-colors">
                  {title}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className={`text-xs font-bold font-mono tracking-tight tabular-nums whitespace-nowrap ${
                isExpense ? 'text-rose-500 dark:text-rose-400' : isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'
              }`}>
                {isExpense ? '-' : isIncome ? '+' : ''}
                {formatMoney(Math.abs(amt))}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
