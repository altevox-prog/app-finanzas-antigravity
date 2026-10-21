import React from 'react';
import { formatCOP } from '../../../utils/currencyUtils';

export default function InvoiceBodyPreview({ items = [] }) {
  const minRows = 4;
  const emptyRowsCount = Math.max(0, minRows - items.length);

  return (
    <div className="pt-1 pb-2">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white font-semibold">
            <th className="py-2 px-3 rounded-l-md">Concepto / Descripción</th>
            <th className="py-2 px-3 text-center w-16">Cant.</th>
            <th className="py-2 px-3 text-right w-28">Valor Unitario</th>
            <th className="py-2 px-3 text-right w-28 rounded-r-md">Valor Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-slate-800">
          {items.map((it, idx) => {
            const qty = Number(it.quantity) || 0;
            const unit = Number(it.unitPrice) || 0;
            const lineTotal = qty * unit;
            return (
              <tr key={it.id || idx} className="hover:bg-slate-50/50">
                <td className="py-2.5 px-3 font-medium text-slate-900 leading-snug">
                  {it.description || <span className="text-slate-400 italic">Sin descripción</span>}
                </td>
                <td className="py-2.5 px-3 text-center text-slate-700">{qty}</td>
                <td className="py-2.5 px-3 text-right text-slate-700">{formatCOP(unit)}</td>
                <td className="py-2.5 px-3 text-right font-semibold text-slate-900">{formatCOP(lineTotal)}</td>
              </tr>
            );
          })}

          {Array.from({ length: emptyRowsCount }).map((_, i) => (
            <tr key={`empty-${i}`} className="opacity-40">
              <td className="py-2 px-3 text-slate-300">&nbsp;</td>
              <td className="py-2 px-3 text-center text-slate-300">-</td>
              <td className="py-2 px-3 text-right text-slate-300">-</td>
              <td className="py-2 px-3 text-right text-slate-300">-</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}