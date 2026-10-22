import React from 'react';
import { formatCOP } from '../../../utils/currencyUtils';

function cleanPhone(phone = '') {
  if (!phone) return '';
  return phone.replace(/^\(\+57\)\s*|\+57\s*/i, '').trim();
}

function EmitterDetails({ emitter = {} }) {
  const phoneClean = cleanPhone(emitter.phone);
  return (
    <div className="space-y-0.5 text-xs text-slate-600">
      <p><span className="font-semibold text-slate-800">{emitter.docType || 'CC'}:</span> {emitter.docNumber || '---'}</p>
      <p><span className="font-semibold text-slate-800">Dirección:</span> {emitter.address || '---'}</p>
      <p><span className="font-semibold text-slate-800">Correo:</span> {emitter.email || '---'}</p>
      {phoneClean && <p><span className="font-semibold text-slate-800">Cel:</span> {phoneClean}</p>}
    </div>
  );
}

export default function InvoiceHeaderPreview({ invoice = {}, total = 0 }) {
  const { template = 'soporte', emitter = {}, client = {}, meta = {}, docTitle } = invoice;
  const isSoporte = template === 'soporte';

  if (!isSoporte) {
    return (
      <div className="space-y-4 pb-4 border-b border-slate-300 text-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{emitter.name || 'Emisor'}</h1>
            <EmitterDetails emitter={emitter} />
          </div>
          {emitter.logo && <img src={emitter.logo} alt="Logo" className="max-h-16 max-w-[140px] object-contain" />}
        </div>

        <div className="text-center py-2 bg-slate-100 rounded-lg">
          <h2 className="text-sm font-bold tracking-wider uppercase text-slate-800">{docTitle || 'FACTURA DE SERVICIOS'}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="space-y-1 min-w-0">
            <p className="font-semibold text-slate-500 uppercase text-[10px]">Facturar a:</p>
            <p className="font-bold text-slate-900 break-words">{client.name || '---'}</p>
            {client.contactPerson && <p className="text-slate-600 break-words">Attn: {client.contactPerson}</p>}
            {client.city && <p className="text-slate-600 break-words">{client.city}</p>}
            {client.email && <p className="text-slate-600 break-words">{client.email}</p>}
          </div>
          <div className="space-y-1 text-left sm:text-right min-w-0">
            <p><span className="text-slate-500">Fecha Emisión:</span> <span className="font-medium break-words">{meta.issueDate || '---'}</span></p>
            <p><span className="text-slate-500">Fecha Vencimiento:</span> <span className="font-medium break-words">{meta.dueDate || '---'}</span></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-3 border-b border-slate-300 text-slate-800">
      <div className="text-center pb-2 border-b border-slate-200">
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 leading-tight">
          {docTitle || 'SOPORTE EN ADQUISICIONES EFECTUADAS, NO OBLIGADOS A FACTURAR'}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
        <div className="sm:col-span-7 space-y-2">
          {emitter.logo && <img src={emitter.logo} alt="Logo" className="max-h-14 max-w-[130px] object-contain mb-1" />}
          <div className="space-y-0.5">
            <h1 className="text-base font-bold text-slate-900 leading-tight">{emitter.name || 'Emisor'}</h1>
            <EmitterDetails emitter={emitter} />
          </div>
        </div>

        <div className="sm:col-span-5 space-y-2 text-right">
          <div className="text-xs space-y-1 text-slate-600">
            <p><span className="text-slate-500">Emisión:</span> <span className="font-medium">{meta.issueDate || '---'}</span></p>
            <p><span className="text-slate-500">Vence:</span> <span className="font-medium">{meta.dueDate || '---'}</span></p>
          </div>
          <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-50/60 text-right">
            <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total a Pagar (COP)</span>
            <span className="text-base font-extrabold text-emerald-950">{formatCOP(total)}</span>
          </div>
        </div>
      </div>

      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-2">
        <div className="min-w-0"><span className="text-[10px] uppercase text-slate-500 block">Cliente</span><span className="font-semibold text-slate-900 block break-words">{client.name || '---'}</span></div>
        <div className="min-w-0"><span className="text-[10px] uppercase text-slate-500 block">Contacto</span><span className="text-slate-800 block break-words">{client.contactPerson || '---'}</span></div>
        <div className="min-w-0"><span className="text-[10px] uppercase text-slate-500 block">Ciudad</span><span className="text-slate-800 block break-words">{client.city || '---'}</span></div>
        <div className="min-w-0"><span className="text-[10px] uppercase text-slate-500 block">Email</span><span className="text-slate-800 block break-words">{client.email || '---'}</span></div>
      </div>
    </div>
  );
}