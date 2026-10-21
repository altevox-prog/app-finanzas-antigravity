import React from 'react';
import { Printer, RotateCcw, FileCheck2 } from 'lucide-react';
import InvoiceHeaderPreview from './InvoiceHeaderPreview';
import InvoiceBodyPreview from './InvoiceBodyPreview';
import InvoiceFooterPreview from './InvoiceFooterPreview';
import InvoiceShareActions from './InvoiceShareActions';

export default function InvoiceLivePreview({
  invoice = {},
  subtotal = 0,
  ivaAmount = 0,
  total = 0,
  isDateValid = true,
  onReset
}) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Vista Previa del Documento</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Diseño listo para impresión o exportación PDF</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <InvoiceShareActions invoice={invoice} total={total} />

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            disabled={!isDateValid}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Guardar PDF</span>
          </button>
        </div>
      </div>

      <div className="flex justify-center overflow-x-auto p-2 sm:p-4 bg-slate-100/70 dark:bg-black/30 rounded-2xl print:p-0 print:bg-transparent">
        <div
          id="invoice-printable-sheet"
          className="w-full max-w-[800px] bg-white text-slate-900 p-6 sm:p-10 rounded-xl shadow-xl border border-slate-200/80 print:shadow-none print:border-none print:p-0 print:max-w-none space-y-5"
        >
          <InvoiceHeaderPreview invoice={invoice} total={total} />
          <InvoiceBodyPreview items={invoice.items || []} />
          <InvoiceFooterPreview invoice={invoice} subtotal={subtotal} ivaAmount={ivaAmount} total={total} />
        </div>
      </div>

      <style>{`
        @media print {
          body {
            visibility: hidden;
            background: white !important;
          }
          #invoice-printable-sheet, #invoice-printable-sheet * {
            visibility: visible !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          #invoice-printable-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 1.5rem !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
