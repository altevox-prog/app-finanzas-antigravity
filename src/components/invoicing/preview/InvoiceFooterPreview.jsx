import React from 'react';
import { formatCOP } from '../../../utils/currencyUtils';

export default function InvoiceFooterPreview({
  invoice = {},
  subtotal = 0,
  ivaAmount = 0,
  total = 0
}) {
  const { banking = {}, tax = {} } = invoice;
  const colombia = banking.colombia || {};
  const achWire = banking.achWire || {};
  const showInternational = Boolean(achWire.enabled);

  return (
    <div className="pt-2 border-t border-slate-300 space-y-4 text-slate-800 text-xs">
      <div className="w-full bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
        <div className="flex justify-between items-center text-slate-600">
          <span className="text-left font-medium">Subtotal:</span>
          <span className="text-right font-semibold text-slate-800">{formatCOP(subtotal)}</span>
        </div>

        {tax.applyIva && (
          <div className="flex justify-between items-center text-slate-600">
            <span className="text-left font-medium">IVA ({tax.rate || 19}%):</span>
            <span className="text-right font-semibold text-emerald-700">{formatCOP(ivaAmount)}</span>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-sm font-bold text-slate-950">
          <span className="text-left tracking-wide">NETO A PAGAR:</span>
          <span className="text-right text-emerald-800 text-base">{formatCOP(total)}</span>
        </div>
      </div>

      <div className={showInternational ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 w-full' : 'w-full'}>
        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1 text-[11px] leading-tight">
          <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px] border-b border-slate-200 pb-0.5">
            Cuenta Bancaria
          </p>
          <div className="space-y-1 pt-0.5">
            <p><span className="text-slate-500">Banco:</span> <strong className="text-slate-800">{colombia.bank || 'Bancolombia'}</strong></p>
            <p><span className="text-slate-500">Titular:</span> {colombia.holder || '---'}</p>
            <p><span className="text-slate-500">Cuenta {colombia.accountType || 'Ahorros'}:</span> <strong className="text-slate-800">{colombia.accountNumber || '---'}</strong></p>
            {colombia.nequi && <p><span className="text-slate-500">Nequi:</span> <strong className="text-slate-800">{colombia.nequi}</strong></p>}
          </div>
        </div>

        {showInternational && (
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1 text-[11px] leading-tight">
            <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px] border-b border-slate-200 pb-0.5">
              Cuenta Internacional (ACH & Wire)
            </p>
            <div className="space-y-1 pt-0.5">
              <p><span className="text-slate-500">Banco:</span> <strong className="text-slate-800">{achWire.bank || 'Lead Bank'}</strong></p>
              <p><span className="text-slate-500">Titular:</span> {achWire.holder || '---'}</p>
              <p><span className="text-slate-500">N° Cuenta:</span> <strong className="text-slate-800">{achWire.accountNumber || '---'}</strong> ({achWire.accountType || 'Corriente'})</p>
              <p><span className="text-slate-500">Routing (ABA):</span> {achWire.routing || '---'}</p>
              {achWire.bankAddress && <p><span className="text-slate-500">Dirección:</span> {achWire.bankAddress}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}