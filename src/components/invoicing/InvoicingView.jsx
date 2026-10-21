import React, { useState } from 'react';
import { BookmarkCheck, Check } from 'lucide-react';
import { useInvoiceForm } from './hooks/useInvoiceForm';
import { useInvoiceHistory } from './hooks/useInvoiceHistory';
import InvoiceEmitterSection from './form/InvoiceEmitterSection';
import InvoiceClientSection from './form/InvoiceClientSection';
import InvoiceItemsTable from './form/InvoiceItemsTable';
import InvoicePaymentBankSection from './form/InvoicePaymentBankSection';
import InvoiceLivePreview from './preview/InvoiceLivePreview';
import InvoiceMobileListView from './mobile/InvoiceMobileListView';

export default function InvoicingView() {
  const {
    invoice, updateEmitter, handleLogoUpload, removeLogo, setTemplate,
    updateClient, updateMeta, isDateValid,
    addItem, removeItem, updateItem,
    updateBanking, updateTax,
    subtotal, ivaAmount, total, resetInvoice
  } = useInvoiceForm();

  const { invoicesList, saveInvoice, deleteInvoice } = useInvoiceHistory();
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSaveToHistory = () => {
    saveInvoice(invoice, total);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  return (
    <div className="w-full flex-1 flex flex-col overflow-hidden animate-fadeIn">
      {/* Vista Móvil */}
      <div className="block md:hidden h-full overflow-y-auto custom-scrollbar">
        <InvoiceMobileListView invoicesList={invoicesList} onDeleteInvoice={deleteInvoice} />
      </div>

      {/* Vista Tablet y PC */}
      <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-2 gap-6 p-4 sm:p-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-4.5rem)] overflow-hidden">
        {/* Panel izquierdo: Formulario editable y Guardar en Historial */}
        <div className="h-full overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-16">
          <InvoiceEmitterSection
            invoice={invoice} updateEmitter={updateEmitter}
            handleLogoUpload={handleLogoUpload} removeLogo={removeLogo} setTemplate={setTemplate}
          />
          <InvoiceClientSection
            client={invoice.client} meta={invoice.meta}
            updateClient={updateClient} updateMeta={updateMeta} isDateValid={isDateValid}
          />
          <InvoiceItemsTable
            items={invoice.items} addItem={addItem}
            removeItem={removeItem} updateItem={updateItem} subtotal={subtotal}
          />
          <InvoicePaymentBankSection
            banking={invoice.banking} tax={invoice.tax}
            updateBanking={updateBanking} updateTax={updateTax}
            subtotal={subtotal} ivaAmount={ivaAmount} total={total}
          />

          <div className="flex justify-end pt-2 pb-6">
            <button
              type="button"
              onClick={handleSaveToHistory}
              className={`px-4 py-2.5 text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                savedFeedback
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-900 text-white dark:bg-white/10 dark:hover:bg-white/20'
              }`}
            >
              {savedFeedback ? <Check className="w-4 h-4 text-emerald-200" /> : <BookmarkCheck className="w-4 h-4" />}
              <span>{savedFeedback ? '¡Guardada en el Historial!' : 'Guardar en Historial'}</span>
            </button>
          </div>
        </div>

        {/* Panel derecho: Live Preview */}
        <div className="h-full overflow-y-auto pl-2 custom-scrollbar pb-16">
          <InvoiceLivePreview
            invoice={invoice} subtotal={subtotal} ivaAmount={ivaAmount}
            total={total} isDateValid={isDateValid} onReset={resetInvoice}
          />
        </div>
      </div>
    </div>
  );
}
