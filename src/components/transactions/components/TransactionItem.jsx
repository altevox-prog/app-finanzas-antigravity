import React from 'react';
import { Pencil, Camera } from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import CategoryIcon from '../../categories/components/CategoryIcon';
import { usePrivacy } from '../../../context/PrivacyContext';
import { MONTH_NAMES } from '../../../data/initialData';

/**
 * Función auxiliar para formatear la fecha relativa o amigable ('Hoy', 'Ayer', 'D Mes')
 */
export const formatTxDateClean = (tx) => {
  if (!tx?.date) return '';
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  
  if (tx.date === todayStr) {
    return 'Hoy';
  }
  if (tx.date === yesterdayStr) {
    return 'Ayer';
  }
  
  const parts = tx.date.split('-');
  if (parts.length < 3) return tx.date;
  const [y, m, d] = parts;
  const monthIdx = parseInt(m, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] ? MONTH_NAMES[monthIdx].slice(0, 3) : m;
  const dayNum = parseInt(d, 10);
  return `${dayNum} ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
};

/**
 * TransactionItem
 * Renderizado de fila individual de un movimiento en la lista.
 */
export default function TransactionItem({
  transaction: tx,
  category,
  account,
  onSelect,
  onEdit,
  onViewReceipt
}) {
  const { formatMoney } = usePrivacy();
  const isExpense = tx.type === 'expense';

  return (
    <div 
      onClick={() => onSelect && onSelect(tx)}
      className="min-h-[52px] p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer flex flex-col justify-center gap-1 select-none active:bg-slate-100/60 dark:active:bg-white/[0.05]"
    >
      {/* Línea 1 (Superior): Concepto/Descripción a la izq y Monto a la der */}
      <div className="flex items-center justify-between gap-2">
        {/* Izquierda: Icono de categoría + Concepto/Descripción */}
        <div className="flex items-center gap-2 min-w-0 max-w-[60%]">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg shrink-0 overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-white/[0.06] shadow-sm">
            <BrandIcon
              name={tx.note || tx.categoryName || ''}
              size={14}
              fallback={
                <CategoryIcon
                  category={category || tx.categoryName}
                  status={isExpense ? 'negative' : 'positive'}
                  size={14}
                  withBadge={false}
                />
              }
            />
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">
            {tx.note || tx.categoryName}
          </span>
        </div>

        {/* Derecha: Monto monetario */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm sm:text-base font-bold font-mono tracking-tight tabular-nums whitespace-nowrap ${
            isExpense ? 'text-slate-900 dark:text-zinc-100' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {isExpense ? '-' : '+'}{formatMoney(tx.amount)}
          </span>

          {/* Botón de acción / editar (en desktop / tablet) */}
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(tx);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg active:scale-95 transition-colors cursor-pointer hidden md:flex"
              title="Editar movimiento"
              aria-label="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Línea 2 (Inferior): Badge compacto de cuenta a la izq y Fecha/hora a la der */}
      <div className="flex items-center justify-between gap-2">
        {/* Izquierda: Badge de cuenta + subcategoría / recibo */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[60%]">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 truncate inline-flex items-center gap-1.5">
            <BrandIcon 
              name={tx.accountName} 
              type={account?.type} 
              size={11} 
              className="shrink-0"
              fallback={<span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: account?.color || '#10B981' }} />}
            />
            <span className="truncate">{tx.accountName}</span>
          </span>

          {tx.subcategoryName && (
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono truncate hidden xs:inline">
              • {tx.subcategoryName}
            </span>
          )}

          {tx.receiptImage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onViewReceipt) onViewReceipt(tx);
              }}
              className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md hover:bg-emerald-500/20 transition-colors shrink-0 cursor-pointer"
              title="Ver recibo adjunto"
            >
              <Camera className="w-3 h-3" />
              <span className="hidden sm:inline">Recibo</span>
            </button>
          )}
        </div>

        {/* Derecha: Moneda original + Fecha/hora */}
        <div className="flex items-center gap-2 shrink-0">
          {tx.originalCurrency && tx.originalCurrency !== 'COP' && (
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono tabular-nums hidden sm:inline">
              ({Number(tx.originalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {tx.originalCurrency})
            </span>
          )}
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono shrink-0">
            {formatTxDateClean(tx)}
          </span>
        </div>
      </div>
    </div>
  );
}
