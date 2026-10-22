import React, { useRef } from 'react';
import { Upload, Trash2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { INVOICE_TEMPLATES } from '../constants/invoiceDefaults';

export default function InvoiceEmitterSection({
  invoice, updateEmitter, handleLogoUpload, removeLogo, setTemplate,
  isOpen = true, onToggle
}) {
  const fileInputRef = useRef(null);
  const emitter = invoice?.emitter || {};

  const handleTemplateChange = (tplId) => {
    setTemplate?.(tplId);
  };

  return (
    <div className={`bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm transition-all ${
      isOpen ? 'p-5 sm:p-6 space-y-5' : 'p-4 sm:p-5 hover:border-slate-300 dark:hover:border-white/20'
    }`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle?.(); }}
        className="w-full flex items-center justify-between text-left cursor-pointer select-none group"
      >
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Paso 1</span>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            Tipo de Documento y Emisor
          </h3>
        </div>
        <div className="flex items-center gap-2.5">
          {!isOpen && (
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">
              {invoice?.template === 'soporte' ? 'Doc. Soporte' : 'Factura de Servicios'}
            </span>
          )}
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" /> : <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />}
        </div>
      </div>

      {isOpen && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-slate-100 dark:border-white/5 pt-4">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tipo de Documento:</span>
            <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl self-start sm:self-auto">
              {INVOICE_TEMPLATES.map((tpl) => {
                const active = invoice?.template === tpl.id;
                return (
                  <button
                    key={tpl.id} type="button" onClick={() => handleTemplateChange(tpl.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      active ? 'bg-white dark:bg-emerald-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tpl.id === 'soporte' ? 'Doc. Soporte' : 'Factura de Servicios'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-4 items-start">
            <div className="w-full xl:w-44 xl:shrink-0 flex flex-col items-center justify-center p-3 sm:p-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02]">
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="hidden" />
              {emitter.logo ? (
                <div className="relative group flex flex-col items-center">
                  <img src={emitter.logo} alt="Logo" className="max-h-20 max-w-full object-contain rounded-lg p-1" />
                  <button type="button" onClick={removeLogo} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /> Quitar logo
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-center text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer py-1">
                  <div className="w-9 h-9 rounded-xl bg-slate-200/60 dark:bg-white/10 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium">Subir Logo (PNG/JPG)</span>
                </button>
              )}
            </div>

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 min-w-0">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nombre / Razón Social</label>
                <input type="text" value={emitter.name || ''} onChange={(e) => updateEmitter({ name: e.target.value })} placeholder="Nombre del emisor" className="w-full min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div className="col-span-1 min-w-0">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Documento</label>
                <div className="flex gap-1.5 min-w-0">
                  <div className="px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 flex items-center justify-center select-none shrink-0 min-w-[42px]">
                    {emitter.docType || 'CC'}
                  </div>
                  <input type="text" value={emitter.docNumber || ''} onChange={(e) => updateEmitter({ docNumber: e.target.value })} placeholder="1037588061-9" className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
                </div>
              </div>
              <div className="col-span-1 min-w-0">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Teléfono</label>
                <input type="text" value={emitter.phone || ''} onChange={(e) => updateEmitter({ phone: e.target.value })} placeholder="(+57) 313..." className="w-full min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
              </div>
              <div className="sm:col-span-2 min-w-0">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email</label>
                <input type="email" value={emitter.email || ''} onChange={(e) => updateEmitter({ email: e.target.value })} placeholder="correo@ejemplo.com" className="w-full min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
              </div>
              <div className="sm:col-span-2 min-w-0">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Dirección</label>
                <input type="text" value={emitter.address || ''} onChange={(e) => updateEmitter({ address: e.target.value })} placeholder="Dirección física" className="w-full min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
