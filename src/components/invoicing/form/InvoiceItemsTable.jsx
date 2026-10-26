import React from 'react';
import { Plus, Trash2, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCOP } from '../../../utils/currencyUtils';

export default function InvoiceItemsTable({
  items = [],
  addItem,
  removeItem,
  updateItem,
  subtotal = 0,
  isOpen = false,
  onToggle
}) {
  const handleQuantityChange = (id, rawVal) => {
    if (rawVal === '') return updateItem(id, { quantity: '' });
    const parsed = Number(rawVal);
    updateItem(id, { quantity: Number.isNaN(parsed) ? '' : Math.max(0, parsed) });
  };

  const handlePriceChange = (id, rawVal) => {
    if (rawVal === '') return updateItem(id, { unitPrice: '' });
    const parsed = Number(rawVal);
    updateItem(id, { unitPrice: Number.isNaN(parsed) ? '' : Math.max(0, parsed) });
  };

  return (
    <div className={`bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl rounded-3xl border border-white/60 dark:border-white/[0.08] shadow-sm transition-all ${
      isOpen ? 'p-5 sm:p-6 space-y-4' : 'p-4 sm:p-5 hover:border-white/80 dark:hover:border-white/20'
    }`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle?.(); }}
        className="w-full flex items-center justify-between text-left cursor-pointer select-none group"
      >
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Paso 3</span>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            Conceptos e ítems a facturar
          </h3>
        </div>
        <div className="flex items-center gap-2.5">
          {isOpen ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); addItem(); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar ítem</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-900/[0.08] dark:border-white/[0.08] px-2.5 py-1 rounded-full text-xs backdrop-blur-xs">
                {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 hidden sm:inline">
                {formatCOP(subtotal)}
              </span>
            </div>
          )}
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200 transition-colors" /> : <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200 transition-colors" />}
        </div>
      </div>

      {isOpen && (
        <>
          <div className="overflow-x-auto border-t border-slate-100 dark:border-white/[0.08] pt-3">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-white/[0.08] bg-slate-50/50 dark:bg-zinc-800/40 text-slate-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
              <th className="py-2.5 px-2">Descripción o concepto</th>
              <th className="py-2.5 px-2 w-20 text-center">Cant.</th>
              <th className="py-2.5 px-2 w-32 text-right">Valor unitario</th>
              <th className="py-2.5 px-2 w-32 text-right">Total</th>
              <th className="py-2.5 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.08]">
            {items.map((item, idx) => {
              const qty = Number(item.quantity) || 0;
              const price = Number(item.unitPrice) || 0;
              const lineTotal = qty * price;
              return (
                <tr key={item.id || idx} className="group hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="py-2 px-2">
                    <input
                      type="text" value={item.description || ''}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      placeholder="Descripción del servicio o producto..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-white/80 dark:border-white/[0.08] bg-white/70 dark:bg-zinc-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:bg-white/95 focus:border-emerald-500/60 shadow-xs"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <input
                      type="number" min="0" step="any"
                      value={item.quantity === 0 ? 0 : item.quantity ?? ''}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      className="w-full text-center px-2 py-1.5 rounded-lg border border-white/80 dark:border-white/[0.08] bg-white/70 dark:bg-zinc-800/50 text-slate-900 dark:text-white focus:outline-none focus:bg-white/95 focus:border-emerald-500/60 shadow-xs"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number" min="0" step="1000"
                      value={item.unitPrice === 0 ? 0 : item.unitPrice ?? ''}
                      onChange={(e) => handlePriceChange(item.id, e.target.value)}
                      className="w-full text-right px-2.5 py-1.5 rounded-lg border border-white/80 dark:border-white/[0.08] bg-white/70 dark:bg-zinc-800/50 text-slate-900 dark:text-white focus:outline-none focus:bg-white/95 focus:border-emerald-500/60 shadow-xs"
                    />
                  </td>
                  <td className="py-2 px-2 text-right font-medium text-slate-800 dark:text-zinc-200 whitespace-nowrap">
                    {formatCOP(lineTotal)}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length <= 1}
                      title="Eliminar fila"
                      className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
        <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Subtotal ítems:</span>
        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCOP(subtotal)}</span>
      </div>
        </>
      )}
    </div>
  );
}