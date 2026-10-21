import React from 'react';
import { Monitor } from 'lucide-react';
import { useInvoiceForm } from './hooks/useInvoiceForm';
import InvoiceEmitterSection from './form/InvoiceEmitterSection';
import InvoiceClientSection from './form/InvoiceClientSection';
import InvoiceItemsTable from './form/InvoiceItemsTable';
import InvoicePaymentBankSection from './form/InvoicePaymentBankSection';
import InvoiceLivePreview from './preview/InvoiceLivePreview';

export default function InvoicingView() {
  const {
    invoice, updateEmitter, handleLogoUpload, removeLogo, setTemplate,
    updateClient, updateMeta, isDateValid,
    addItem, removeItem, updateItem,
    updateBanking, updateTax,
    subtotal, ivaAmount, total, resetInvoice
  } = useInvoiceForm();

  return (
    <div className="w-full flex-1 flex flex-col overflow-hidden animate-fadeIn">
      {/* Escudo para smartphones */}
      <div className="block md:hidden p-6 max-w-sm mx-auto my-auto text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner">
          <Monitor className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Módulo de Facturación</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            El generador de facturas y documentos soporte con Live Preview en tiempo real está optimizado para pantallas de tablets y computadores.
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-300">
          Por favor, abre esta sección desde tu tablet o PC para editar e imprimir tus documentos.
        </div>
      </div>

      {/* Vista para Tablet y PC */}
      <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-2 gap-6 p-4 sm:p-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-4.5rem)] overflow-hidden">
        {/* Panel izquierdo: Formulario editable */}
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
