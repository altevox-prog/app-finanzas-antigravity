import React, { useMemo } from 'react';
import { X, Receipt, Calendar, CreditCard } from 'lucide-react';
import { hexToRgba, getCategoryEmoji as defaultGetCategoryEmoji } from '../utils/reportHelpers';

export default function CategoryDetailModal({
  isOpen = true,
  category,
  onClose,
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  getCategoryEmoji: propGetCategoryEmoji,
  selectedDay,
  transactions = [],
  categoryTransactions,
  subcategoriesList
}) {
  if (!isOpen || !category) return null;

  const getCategoryEmoji = propGetCategoryEmoji || defaultGetCategoryEmoji;

  const currentCategory = category;
  const txs = categoryTransactions || transactions || [];

  const computedSubcategories = useMemo(() => {
    if (subcategoriesList) return subcategoriesList;
    const breakdown = {};
    txs.forEach(t => {
      const subName = t.subcategoryName || 'General';
      breakdown[subName] = (breakdown[subName] || 0) + Number(t.amount || 0);
    });
    return Object.entries(breakdown)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [subcategoriesList, txs]);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4 animate-fadeIn pointer-events-auto"
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onClose) onClose();
      }}
    >
      <div 
        className="w-full sm:max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-slide-up bg-white dark:bg-[#121622] border-slate-200/80 dark:border-white/10 pointer-events-auto"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Header del Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0 shadow-sm text-xl select-none">
              <span>{getCategoryEmoji(currentCategory, currentCategory.name)}</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {currentCategory.name}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedDay ? 'Detalle del día seleccionado' : 'Detalle mensual'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onClose) onClose();
            }}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Tarjeta Destacada de Gasto */}
          <div 
            className="p-4 rounded-2xl border transition-all"
            style={{
              backgroundColor: hexToRgba(currentCategory.color, 0.12),
              borderColor: hexToRgba(currentCategory.color, 0.3)
            }}
          >
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              Total gastado en este rubro
            </span>
            <div className="text-2xl sm:text-3xl font-bold mt-1 text-rose-500 dark:text-rose-400">
              -{formatMoney(currentCategory.amount)}
            </div>

            {/* Métricas clave */}
            <div 
              className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t"
              style={{ borderColor: hexToRgba(currentCategory.color, 0.2) }}
            >
              <div>
                <span className="text-[10px] block font-medium text-slate-500 dark:text-slate-400">% del total</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {currentCategory.percent}%
                </span>
              </div>
              <div>
                <span className="text-[10px] block font-medium text-slate-500 dark:text-slate-400">Movimientos</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {txs.length}
                </span>
              </div>
              <div>
                <span className="text-[10px] block font-medium text-slate-500 dark:text-slate-400">Promedio/gasto</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {txs.length > 0 
                    ? formatMoney(currentCategory.amount / txs.length) 
                    : '$0'}
                </span>
              </div>
            </div>
          </div>

          {/* Desglose por Subcategorías si hay */}
          {computedSubcategories.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Subcategorías
              </h4>
              <div className="space-y-1.5">
                {computedSubcategories.map((sub, i) => {
                  const subEmoji = getCategoryEmoji({ name: sub.name }, currentCategory.name);
                  return (
                    <div 
                      key={i}
                      className="p-2.5 rounded-2xl border flex items-center justify-between bg-slate-50/60 dark:bg-white/[0.03] border-slate-200/60 dark:border-white/5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0 shadow-sm text-base select-none">
                          <span>{subEmoji}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {sub.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          -{formatMoney(sub.amount)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 font-bold text-slate-600 dark:text-slate-300">
                          {currentCategory.amount > 0 ? Math.round((sub.amount / currentCategory.amount) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lista de Movimientos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Historial de Movimientos ({txs.length})
              </h4>
            </div>

            {txs.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.03]">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  No hay transacciones registradas en este período.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {txs.map((tx) => (
                  <div 
                    key={tx.id}
                    className="p-3 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.03] flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold truncate text-slate-900 dark:text-white">
                          {tx.note || tx.subcategoryName || currentCategory.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {tx.date}
                        </span>
                        {tx.accountName && (
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            {tx.accountName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-[13px] font-bold text-rose-500 dark:text-rose-400 tabular-nums">
                        -{formatMoney(tx.amount)}
                      </div>
                      {tx.subcategoryName && tx.note && (
                        <div className="text-[10px] mt-0.5 truncate max-w-[120px] text-slate-500 dark:text-slate-400">
                          {tx.subcategoryName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-white/10">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onClose) onClose();
            }}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
