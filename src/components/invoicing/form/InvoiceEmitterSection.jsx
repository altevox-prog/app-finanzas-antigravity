import React, { useRef } from 'react';
import { Upload, Trash2, FileText } from 'lucide-react';
import { INVOICE_TEMPLATES } from '../constants/invoiceDefaults';

export default function InvoiceEmitterSection({
  invoice, updateEmitter, handleLogoUpload, removeLogo, setTemplate
}) {
  const fileInputRef = useRef(null);
  const emitter = invoice?.emitter || {};

  const handleTemplateChange = (tplId) => {
    setTemplate?.(tplId);
  };

  return (
    <div className="bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Paso 1</span>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            Tipo de Documento y Emisor
          </h3>
        </div>
        <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
          {INVOICE_TEMPLATES.map((tpl) => {
            const active = invoice?.template === tpl.id;
            return (
              <button
                key={tpl.id} type="button" onClick={() => handleTemplateChange(tpl.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  active ? 'bg-white dark:bg-emerald-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tpl.id === 'soporte' ? 'Doc. Soporte' : 'Factura de Servicios'}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02]">
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="hidden" />
          {emitter.logo ? (
            <div className="relative group flex flex-col items-center">
              <img src={emitter.logo} alt="Logo" className="max-h-24 max-w-full object-contain rounded-lg p-1" />
              <button type="button" onClick={removeLogo} className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Quitar logo
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-center text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-slate-200/60 dark:bg-white/10 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Subir Logo (PNG/JPG)</span>
            </button>
          )}
        </div>

        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nombre / Razón Social</label>
            <input type="text" value={emitter.name || ''} onChange={(e) => updateEmitter({ name: e.target.value })} placeholder="Nombre del emisor" className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Documento</label>
            <div className="flex gap-1.5">
              <div className="px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 flex items-center justify-center select-none shrink-0 min-w-[42px]">
                {emitter.docType || 'CC'}
              </div>
              <input type="text" value={emitter.docNumber || ''} onChange={(e) => updateEmitter({ docNumber: e.target.value })} placeholder="1037588061-9" className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Teléfono</label>
            <input type="text" value={emitter.phone || ''} onChange={(e) => updateEmitter({ phone: e.target.value })} placeholder="(+57) 313..." className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email</label>
            <input type="email" value={emitter.email || ''} onChange={(e) => updateEmitter({ email: e.target.value })} placeholder="correo@ejemplo.com" className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Dirección</label>
            <input type="text" value={emitter.address || ''} onChange={(e) => updateEmitter({ address: e.target.value })} placeholder="Dirección física" className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}