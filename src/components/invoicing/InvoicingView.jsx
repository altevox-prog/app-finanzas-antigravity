import React, { useState } from 'react';
import { BookmarkCheck, Check, History, PenSquare, RotateCcw } from 'lucide-react';
import { useInvoiceForm } from './hooks/useInvoiceForm';
import { useInvoicesHistory } from '../../hooks/useInvoicesHistory';
import InvoiceEmitterSection from './form/InvoiceEmitterSection';
import InvoiceClientSection from './form/InvoiceClientSection';
import InvoiceItemsTable from './form/InvoiceItemsTable';
import InvoicePaymentBankSection from './form/InvoicePaymentBankSection';
import InvoiceLivePreview from './preview/InvoiceLivePreview';
import InvoiceHistoryList from './history/InvoiceHistoryList';

export default function InvoicingView({ accounts = [], transactions = [], onAddTransaction, onDeleteTransaction, onBack }) {
  const {
    invoice, updateEmitter, handleLogoUpload, removeLogo, setTemplate,
    updateClient, updateMeta, isDateValid, addItem, removeItem, updateItem,
    updateBanking, updateTax, subtotal, ivaAmount, total, resetInvoice, resetForm
  } = useInvoiceForm();

  const {
    invoices, loading, pendingTotal, saveInvoice, markAsPaid, deleteInvoice
  } = useInvoicesHistory({ accounts, transactions, onAddTransaction, onDeleteTransaction });

  const [activeSubTab, setActiveSubTab] = useState('editor'); // 'editor' | 'history'
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [openSteps, setOpenSteps] = useState({ 1: true, 2: false, 3: false, 4: false });
  const toggleStep = (step) => setOpenSteps((prev) => ({ ...prev, [step]: !prev[step] }));

  const handleSaveToHistory = async () => {
    const targetAccount = invoice.banking?.colombia?.bank || '';
    const saved = await saveInvoice(invoice, total, targetAccount);
    if (saved) { setSavedFeedback(true); setTimeout(() => setSavedFeedback(false), 2500); }
  };

  const handleResetForm = () => {
    const hasData = Boolean(
      invoice.emitter?.name || invoice.emitter?.docNumber ||
      invoice.client?.name || invoice.items?.some((it) => it.description || it.unitPrice)
    );
    if (hasData && !window.confirm('¿Deseas limpiar todos los campos para una nueva factura?')) return;
    resetForm();
    setOpenSteps({ 1: true, 2: false, 3: false, 4: false });
  };

  return (
    <div className="w-full flex-1 flex flex-col overflow-hidden animate-fadeIn">
      {/* Selector superior de pestañas del módulo */}
      <div className="px-4 sm:px-6 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button" onClick={() => setActiveSubTab('editor')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              activeSubTab === 'editor' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <PenSquare className="w-3.5 h-3.5" />
            <span>Editor y previsualización</span>
          </button>
          <button
            type="button" onClick={() => setActiveSubTab('history')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              activeSubTab === 'history' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Cuentas por cobrar</span>
            {invoices.filter((i) => i.status === 'pending').length > 0 && (
              <span className={`w-4 h-4 text-[10px] rounded-full font-bold flex items-center justify-center ${
                activeSubTab === 'history' ? 'bg-white text-emerald-700' : 'bg-emerald-500 text-white'
              }`}>
                {invoices.filter((i) => i.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {activeSubTab === 'editor' && (
          <button
            type="button" onClick={handleResetForm} title="Limpiar campos / Nueva factura"
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva factura</span>
          </button>
        )}
      </div>

      {/* Contenido condicional según la pestaña */}
      {activeSubTab === 'history' ? (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full custom-scrollbar pb-24">
          <InvoiceHistoryList
            invoices={invoices} pendingTotal={pendingTotal} accounts={accounts}
            onMarkAsPaid={markAsPaid} onDelete={deleteInvoice} loading={loading}
          />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 sm:p-6 max-w-[1600px] mx-auto w-full overflow-hidden">
          {/* Panel izquierdo: Formulario editable */}
          <div className="h-full overflow-y-auto pr-2 space-y-4 custom-scrollbar pb-20">
            <InvoiceEmitterSection
              invoice={invoice} updateEmitter={updateEmitter}
              handleLogoUpload={handleLogoUpload} removeLogo={removeLogo} setTemplate={setTemplate}
              isOpen={openSteps[1]} onToggle={() => toggleStep(1)}
            />
            <InvoiceClientSection
              client={invoice.client} meta={invoice.meta}
              updateClient={updateClient} updateMeta={updateMeta} isDateValid={isDateValid}
              isOpen={openSteps[2]} onToggle={() => toggleStep(2)}
            />
            <InvoiceItemsTable
              items={invoice.items} addItem={addItem}
              removeItem={removeItem} updateItem={updateItem} subtotal={subtotal}
              isOpen={openSteps[3]} onToggle={() => toggleStep(3)}
            />
            <InvoicePaymentBankSection
              banking={invoice.banking} tax={invoice.tax}
              updateBanking={updateBanking} updateTax={updateTax}
              subtotal={subtotal} ivaAmount={ivaAmount} total={total}
              isOpen={openSteps[4]} onToggle={() => toggleStep(4)}
            />

            <div className="flex justify-end pt-2 pb-6">
              <button
                type="button" onClick={handleSaveToHistory}
                className={`px-4 py-2.5 text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                  savedFeedback ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-900 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border dark:border-white/[0.08]'
                }`}
              >
                {savedFeedback ? <Check className="w-4 h-4 text-emerald-200" /> : <BookmarkCheck className="w-4 h-4" />}
                <span>{savedFeedback ? '¡Guardada en cuentas por cobrar!' : 'Guardar en historial'}</span>
              </button>
            </div>
          </div>

          {/* Panel derecho: Live Preview */}
          <div className="h-full overflow-y-auto pl-2 custom-scrollbar pb-20">
            <InvoiceLivePreview
              invoice={invoice} subtotal={subtotal} ivaAmount={ivaAmount}
              total={total} isDateValid={isDateValid} onReset={resetInvoice}
            />
          </div>
        </div>
      )}
    </div>
  );
}