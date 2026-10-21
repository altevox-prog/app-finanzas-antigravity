import React from 'react';
import { UserCheck, Calendar, AlertCircle } from 'lucide-react';

export default function InvoiceClientSection({
  client = {},
  meta = {},
  updateClient,
  updateMeta,
  isDateValid = true
}) {
  return (
    <div className="bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="border-b border-slate-100 dark:border-white/5 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Paso 2</span>
        <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-500" />
          Datos del Cliente y Fechas
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nombre o Razón Social del Cliente</label>
            <input
              type="text"
              value={client.name || ''}
              onChange={(e) => updateClient({ name: e.target.value })}
              placeholder="Ej. Empresa ABC S.A.S."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Persona de Contacto</label>
            <input
              type="text"
              value={client.contactPerson || ''}
              onChange={(e) => updateClient({ contactPerson: e.target.value })}
              placeholder="Nombre del contacto"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Ciudad / País</label>
            <input
              type="text"
              value={client.city || ''}
              onChange={(e) => updateClient({ city: e.target.value })}
              placeholder="Medellín, Colombia"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email del Cliente</label>
            <input
              type="email"
              value={client.email || ''}
              onChange={(e) => updateClient({ email: e.target.value })}
              placeholder="cliente@correo.com"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-50/60 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-xl p-4 space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            Vigencia y Términos de Pago
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 min-h-[2rem] flex items-end">Fecha Emisión</label>
              <input
                type="date"
                value={meta.issueDate || ''}
                onChange={(e) => updateMeta({ issueDate: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 min-h-[2rem] flex items-end">Fecha Vencimiento</label>
              <input
                type="date"
                value={meta.dueDate || ''}
                onChange={(e) => updateMeta({ dueDate: e.target.value })}
                className={`w-full px-2.5 py-1.5 text-xs rounded-lg border bg-white dark:bg-white/5 text-slate-800 dark:text-white ${
                  !isDateValid ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-white/10'
                }`}
              />
            </div>
          </div>

          {!isDateValid && (
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>La fecha de vencimiento no puede ser anterior a la de emisión.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Condiciones de Pago</label>
            <input
              type="text"
              value={meta.paymentTerms || ''}
              onChange={(e) => updateMeta({ paymentTerms: e.target.value })}
              placeholder="Ej. O.C. / 30 días / Contado"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}