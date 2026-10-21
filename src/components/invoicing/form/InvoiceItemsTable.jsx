import React from 'react';
import { Plus, Trash2, Layers } from 'lucide-react';
import { formatCOP } from '../../../utils/currencyUtils';

export default function InvoiceItemsTable({
  items = [],
  addItem,
  removeItem,
  updateItem,
  subtotal = 0
}) {
  const handleQuantityChange = (id, rawVal) => {
    if (rawVal === '') {
      updateItem(id, { quantity: '' });
      return;
    }
    const parsed = Number(rawVal);
    updateItem(id, { quantity: Number.isNaN(parsed) ? '' : Math.max(0, parsed) });
  };

  const handlePriceChange = (id, rawVal) => {
    if (rawVal === '') {
      updateItem(id, { unitPrice: '' });
      return;
    }
    const parsed = Number(rawVal);
    updateItem(id, { unitPrice: Number.isNaN(parsed) ? '' : Math.max(0, parsed) });
  };

  return (
    <div className="bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Paso 3</span>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            Conceptos e Ítems a Facturar
          </h3>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar Ítem</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-white/10 text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-2.5 px-2">Descripción / Concepto</th>
              <th className="py-2.5 px-2 w-20 text-center">Cant.</th>
              <th className="py-2.5 px-2 w-32 text-right">Valor Unitario</th>
              <th className="py-2.5 px-2 w-32 text-right">Total</th>
              <th className="py-2.5 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {items.map((item, idx) => {
              const qty = Number(item.quantity) || 0;
              const price = Number(item.unitPrice) || 0;
              const lineTotal = qty * price;
              return (
                <tr key={item.id || idx} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      placeholder="Descripción del servicio o producto..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.quantity === 0 ? 0 : item.quantity ?? ''}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      className="w-full text-center px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={item.unitPrice === 0 ? 0 : item.unitPrice ?? ''}
                      onChange={(e) => handlePriceChange(item.id, e.target.value)}
                      className="w-full text-right px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                      className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
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

      <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Subtotal Ítems:</span>
        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCOP(subtotal)}</span>
      </div>
    </div>
  );
}