import React from 'react';
import { FileText, Trash2, Calendar, Monitor, Building2 } from 'lucide-react';
import { formatCOP } from '../../../utils/currencyUtils';

export default function InvoiceMobileListView({ invoicesList = [], onDeleteInvoice }) {
  return (
    <div className="w-full p-4 space-y-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">Mis Facturas</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Historial de documentos emitidos</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
          {invoicesList.length} {invoicesList.length === 1 ? 'doc' : 'docs'}
        </span>
      </div>

      {invoicesList.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-[#12141C] border border-slate-200/70 dark:border-white/10 rounded-2xl space-y-2 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 mx-auto flex items-center justify-center text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No hay facturas guardadas</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Las facturas y documentos que guardes desde la versión de escritorio o tablet aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoicesList.map((inv) => (
            <div key={inv.id} className="p-4 bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  inv.template === 'servicios' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                }`}>
                  {inv.template === 'servicios' ? 'Servicios' : 'Soporte'}
                </span>
                {onDeleteInvoice && (
                  <button type="button" onClick={() => onDeleteInvoice(inv.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer" title="Eliminar registro">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" /> A nombre de
                </p>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-snug">{inv.clientName}</h4>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{inv.issueDate}</span>
                  {inv.dueDate && <span>• Vence: {inv.dueDate}</span>}
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">{formatCOP(inv.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <Monitor className="w-4 h-4" />
          <span>Edición en Pantalla Completa</span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          Para crear o editar nuevas facturas con Live Preview, accede desde una tablet o computador.
        </p>
      </div>
    </div>
  );
}
