import React from 'react';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Pencil, 
  Trash2, 
  X 
} from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import { usePrivacy } from '../../../context/PrivacyContext';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { formatTxDateTime } from './ReceiptModal';

/**
 * TransactionDetailModal
 * Modal/bottom sheet de detalle completo de un movimiento registrado.
 */
export default function TransactionDetailModal({
  transaction,
  categories = [],
  onClose,
  onEdit,
  onDelete,
  onViewReceipt
}) {
  const { formatMoney } = usePrivacy();

  useBackHandler(Boolean(transaction), onClose);

  if (!transaction) return null;

  const handleEditClick = () => {
    const txToEdit = transaction;
    onClose();
    if (onEdit) onEdit(txToEdit);
  };

  const handleDeleteClick = () => {
    if (window.confirm('¿Eliminar este movimiento permanentemente?')) {
      if (onDelete) onDelete(transaction.id);
      onClose();
    }
  };

  const handleReceiptClick = () => {
    const imgTx = transaction;
    onClose();
    if (onViewReceipt) onViewReceipt(imgTx);
  };

  const categoryColor = categories.find(c => c.id === transaction.categoryId)?.color || '#007AFF';
  const amt = Number(transaction.amount || 0);
  const type = transaction.type;
  const isTransfer = type === 'transfer' || type === 'transferencia' || Boolean(transaction.isTransfer);
  const isExpense = !isTransfer && (type === 'expense' || type === 'gasto' || type === 'egreso' || amt < 0);
  const isIncome = !isTransfer && (type === 'income' || type === 'ingreso' || (!isExpense && amt > 0));

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="rounded-t-[32px] sm:rounded-2xl p-5 sm:p-6 max-w-sm sm:max-w-md w-full shadow-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900 text-slate-900 dark:text-white space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Handle */}
        <div className="w-10 h-1 bg-slate-500/30 rounded-full mx-auto sm:hidden shrink-0" />

        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/[0.08]">
          <div>
            <h4 className="text-base font-bold">Detalle del Movimiento</h4>
            <p className="text-[11px] opacity-60">Información completa registrada</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 opacity-60 hover:opacity-100 cursor-pointer text-sm font-bold"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero con Monto y Tipo */}
        <div className="text-center py-3.5 px-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/50 space-y-1">
          <BrandIcon 
            name={transaction.note || transaction.categoryName || ''} 
            size={30} 
            wrapperClassName="w-11 h-11 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-sm overflow-hidden mx-auto mb-2" 
            fallback={null} 
          />
          <div 
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold mb-1 ${
              isExpense
                ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
                : isIncome
                ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                : 'bg-slate-500/10 text-slate-600 dark:text-zinc-300'
            }`}
          >
            {isExpense ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            <span>{isExpense ? 'Gasto' : isIncome ? 'Ingreso' : 'Transferencia'}</span>
          </div>
          <div className={`text-3xl font-extrabold tabular-nums tracking-tight ${
            isExpense ? 'text-rose-500 dark:text-rose-400' : isIncome ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-600 dark:text-zinc-300'
          }`}>
            {isExpense ? '-' : isIncome ? '+' : ''}{formatMoney(Math.abs(amt))}
          </div>
          {transaction.originalCurrency && transaction.originalCurrency !== 'COP' && (
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              ({Number(transaction.originalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {transaction.originalCurrency} @ ${Number(transaction.exchangeRate || 1).toLocaleString('es-CO')} COP)
            </p>
          )}
          <p className="text-xs font-semibold opacity-70">
            {transaction.note || transaction.categoryName}
          </p>
        </div>

        {/* Lista de Atributos */}
        <div className="space-y-2 text-xs">
          {/* Sección Multidivisa si aplica */}
          {transaction.originalCurrency && transaction.originalCurrency !== 'COP' && (
            <div className="p-3 rounded-xl border space-y-1.5 bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-500/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">Divisa original</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {Number(transaction.originalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {transaction.originalCurrency}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                <span>Tasa de cambio (TRM)</span>
                <span className="font-bold tabular-nums">
                  $ {Number(transaction.exchangeRate || 1).toLocaleString('es-CO')} COP
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 pt-1 border-t border-emerald-200/40 dark:border-emerald-500/20">
                <span className="font-semibold">Equivalente en balance</span>
                <span className="font-extrabold tabular-nums">
                  $ {Number(transaction.amount || 0).toLocaleString('es-CO')} COP
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/40">
            <span className="opacity-60 font-medium">Categoría</span>
            <span className="font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColor }} />
              {transaction.categoryName || 'General'}
            </span>
          </div>

          {transaction.subcategoryName && (
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/40">
              <span className="opacity-60 font-medium">Subcategoría / Etiqueta</span>
              <span className="font-bold">{transaction.subcategoryName}</span>
            </div>
          )}

          <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/40">
            <span className="opacity-60 font-medium">Cuenta / Tarjeta</span>
            <span className="font-bold flex items-center gap-1.5">
              <BrandIcon name={transaction.accountName || 'Principal'} size={18} />
              <span>{transaction.accountName || 'Principal'}</span>
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/40">
            <span className="opacity-60 font-medium">Fecha y Hora</span>
            <span className="font-semibold tabular-nums">{formatTxDateTime(transaction)}</span>
          </div>

          {transaction.receiptImage && (
            <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/40 space-y-1.5">
              <span className="opacity-60 font-medium block">Comprobante / Recibo</span>
              <div 
                onClick={handleReceiptClick}
                className="relative rounded-lg overflow-hidden border border-slate-200/80 dark:border-white/[0.08] max-h-36 cursor-pointer group flex items-center justify-center bg-slate-100 dark:bg-zinc-800"
              >
                <img src={transaction.receiptImage} alt="Recibo" className="w-full h-36 object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                  Toca para ampliar
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Acciones al pie */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={handleEditClick}
            className="py-2.5 px-3 bg-[#007AFF] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteClick}
            className="py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-[#FF3B30] border border-red-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
