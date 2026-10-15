import React from 'react';
import { X } from 'lucide-react';
import { getCategoryEmoji as defaultGetCategoryEmoji } from '../utils/reportHelpers';

export default function AllCategoriesModal({
  isOpen = true,
  onClose,
  categoryExpenses = [],
  categories,
  onSelectCategory,
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  getCategoryEmoji: propGetCategoryEmoji,
  periodLabel = '',
  totalExpense = 0
}) {
  if (!isOpen) return null;

  const getCategoryEmoji = propGetCategoryEmoji || defaultGetCategoryEmoji;
  const cats = categories || categoryExpenses || [];

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
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Historial de movimientos
              </h3>
              {periodLabel && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                  {periodLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Total del período: <span className="font-bold text-rose-500 dark:text-rose-400">-{formatMoney(totalExpense)}</span>
            </p>
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

        {/* Lista completa de categorías */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
          {cats.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Sin gastos registrados en este período.
            </div>
          ) : (
            cats.map((cat, index) => {
              const displayEmoji = getCategoryEmoji(cat, cat.name);

              return (
                <div
                  key={cat.id || cat.name || index}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (onSelectCategory) {
                      onSelectCategory(cat);
                    }
                  }}
                  className="p-3 rounded-2xl border border-slate-200/70 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.03] hover:bg-slate-100/90 dark:hover:bg-white/[0.08] transition-all flex flex-col gap-2 cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0 leading-none">{displayEmoji}</span>
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {cat.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-rose-500 dark:text-rose-400 tabular-nums">
                        -{formatMoney(cat.amount)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        {cat.percent}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-200/70 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(3, cat.exactPercent))}%`,
                        backgroundColor: cat.color
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
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
