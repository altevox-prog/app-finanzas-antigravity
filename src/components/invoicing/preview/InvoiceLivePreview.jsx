import React from 'react';
import { Download, FileCheck2 } from 'lucide-react';
import InvoiceHeaderPreview from './InvoiceHeaderPreview';
import InvoiceBodyPreview from './InvoiceBodyPreview';
import InvoiceFooterPreview from './InvoiceFooterPreview';
import InvoiceShareActions from './InvoiceShareActions';
import { exportInvoicePDF } from '../utils/printInvoice';

export default function InvoiceLivePreview({
  invoice = {},
  subtotal = 0,
  ivaAmount = 0,
  total = 0,
  isDateValid = true
}) {
  const handleDownloadPDF = () => {
    exportInvoicePDF('invoice-printable-sheet');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900/90 border border-slate-200/60 dark:border-white/[0.08] rounded-3xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Vista previa del documento</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Diseño listo para exportación PDF</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <InvoiceShareActions invoice={invoice} />

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={!isDateValid}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>
        </div>
      </div>

      <div className="flex justify-center overflow-x-auto p-3 sm:p-5 bg-slate-100/70 dark:bg-zinc-900/50 border border-slate-200/60 dark:border-white/[0.08] rounded-3xl shadow-xs">
        <div
          id="invoice-printable-sheet"
          className="w-full max-w-[800px] bg-white text-slate-900 p-6 sm:p-10 rounded-xl shadow-xl border border-slate-200/80 space-y-3.5"
        >
          <InvoiceHeaderPreview invoice={invoice} total={total} />
          <InvoiceBodyPreview items={invoice.items || []} />
          <InvoiceFooterPreview invoice={invoice} subtotal={subtotal} ivaAmount={ivaAmount} total={total} />
        </div>
      </div>
    </div>
  );
}