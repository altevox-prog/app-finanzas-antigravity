import React from 'react';
import { FileText } from 'lucide-react';
import ReceiptUploader from './ReceiptUploader';

export default function TransactionDetailsFields({
  date,
  setDate,
  note,
  setNote,
  receiptImage,
  setReceiptImage
}) {
  return (
    <>
      {/* Fecha */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">
          Fecha *
        </label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full h-11 px-3.5 text-sm bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all"
        />
      </div>

      {/* Nota Opcional */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">
          Nota o Detalle Opcional
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="ej: Almuerzo de trabajo, Mercado del mes..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full h-11 pl-9 pr-3.5 text-sm bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all"
          />
          <FileText className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Adjuntar Foto del Recibo / Factura */}
      <ReceiptUploader
        receiptImage={receiptImage}
        setReceiptImage={setReceiptImage}
      />
    </>
  );
}
