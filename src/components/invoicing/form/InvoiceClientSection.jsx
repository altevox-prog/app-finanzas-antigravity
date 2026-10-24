import React from 'react';
import { UserCheck, Calendar, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function InvoiceClientSection({
  client = {},
  meta = {},
  updateClient,
  updateMeta,
  isDateValid = true,
  isOpen = false,
  onToggle
}) {
  return (
    <div className={`bg-white dark:bg-zinc-900/90 rounded-3xl border border-slate-200/60 dark:border-white/[0.08] shadow-sm transition-all ${
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
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Paso 2</span>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            Datos del cliente y fechas
          </h3>
        </div>
        <div className="flex items-center gap-2.5">
          {!isOpen && client?.name && (
            <span className="text-xs text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/70 border border-transparent dark:border-white/[0.08] px-2.5 py-1 rounded-lg truncate max-w-[160px] sm:max-w-[240px]">
              {client.name}
            </span>
          )}
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200 transition-colors" /> : <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200 transition-colors" />}
        </div>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 border-t border-slate-100 dark:border-white/[0.08] pt-4">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">Nombre o razón social del cliente</label>
            <input
              type="text"
              value={client.name || ''}
              onChange={(e) => updateClient({ name: e.target.value })}
              placeholder="Ej. Empresa ABC S.A.S."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">Persona de contacto</label>
            <input
              type="text"
              value={client.contactPerson || ''}
              onChange={(e) => updateClient({ contactPerson: e.target.value })}
              placeholder="Nombre del contacto"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">Ciudad o país</label>
            <input
              type="text"
              value={client.city || ''}
              onChange={(e) => updateClient({ city: e.target.value })}
              placeholder="Medellín, Colombia"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">Email del cliente</label>
            <input
              type="email"
              value={client.email || ''}
              onChange={(e) => updateClient({ email: e.target.value })}
              placeholder="cliente@correo.com"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-50/60 dark:bg-zinc-800/30 border border-slate-200/60 dark:border-white/[0.08] rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-200">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            Vigencia y términos de pago
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="flex flex-col justify-end min-w-0">
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5 whitespace-nowrap">Emisión</label>
              <input
                type="date"
                value={meta.issueDate || ''}
                onChange={(e) => updateMeta({ issueDate: e.target.value })}
                className="w-full min-w-0 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60 cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col justify-end min-w-0">
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5 whitespace-nowrap">Vencimiento</label>
              <input
                type="date"
                value={meta.dueDate || ''}
                onChange={(e) => updateMeta({ dueDate: e.target.value })}
                className={`w-full min-w-0 px-3 py-2 text-xs rounded-xl border bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 cursor-pointer [color-scheme:light] dark:[color-scheme:dark] ${
                  !isDateValid ? 'border-rose-500 dark:border-rose-500/80 focus:ring-rose-500' : 'border-slate-200 dark:border-white/[0.08] focus:ring-emerald-500/60'
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
            <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">Condiciones de pago</label>
            <input
              type="text"
              value={meta.paymentTerms || ''}
              onChange={(e) => updateMeta({ paymentTerms: e.target.value })}
              placeholder="Ej. O.C. / 30 días / Contado"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
          </div>
        </div>
      </div>
      )}
    </div>
  );
}