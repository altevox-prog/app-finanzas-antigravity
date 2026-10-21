import React from 'react';
import { formatCOP } from '../../../utils/currencyUtils';

export default function InvoiceFooterPreview({
  invoice = {},
  subtotal = 0,
  ivaAmount = 0,
  total = 0
}) {
  const { banking = {}, tax = {}, template = 'soporte' } = invoice;
  const colombia = banking.colombia || {};
  const achWire = banking.achWire || {};
  const showAchWire = Boolean(achWire.enabled || template === 'servicios');

  return (
    <div className="pt-2 border-t border-slate-300 space-y-4 text-slate-800 text-xs">
      <div className="flex justify-end">
        <div className="w-full sm:w-64 space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center text-slate-600">
            <span>Subtotal:</span>
            <span className="font-semibold text-slate-800">{formatCOP(subtotal)}</span>
          </div>

          {tax.applyIva && (
            <div className="flex justify-between items-center text-slate-600">
              <span>IVA ({tax.rate || 19}%):</span>
              <span className="font-semibold text-emerald-700">{formatCOP(ivaAmount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-1.5 border-t border-slate-300 text-sm font-bold text-slate-950">
            <span>NETO A PAGAR:</span>
            <span className="text-emerald-800">{formatCOP(total)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-tight">
        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1">
          <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px] border-b border-slate-200 pb-0.5">
            Cuenta Bancaria Colombia
          </p>
          <p><span className="text-slate-500">Banco:</span> <strong className="text-slate-800">{colombia.bank || 'Bancolombia'}</strong></p>
          <p><span className="text-slate-500">Titular:</span> {colombia.holder || '---'}</p>
          <p><span className="text-slate-500">Cuenta {colombia.accountType || 'Ahorros'}:</span> <strong className="text-slate-800">{colombia.accountNumber || '---'}</strong></p>
          <div className="flex gap-4 pt-0.5">
            {colombia.swift && <p><span className="text-slate-500">SWIFT:</span> {colombia.swift}</p>}
            {colombia.nequi && <p><span className="text-slate-500">Nequi:</span> {colombia.nequi}</p>}
          </div>
        </div>

        {showAchWire && (
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1">
            <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px] border-b border-slate-200 pb-0.5">
              Cuenta Internacional (ACH & Wire)
            </p>
            <p><span className="text-slate-500">Banco:</span> <strong className="text-slate-800">{achWire.bank || 'Lead Bank'}</strong></p>
            <p><span className="text-slate-500">Titular:</span> {achWire.holder || '---'}</p>
            <p><span className="text-slate-500">N° Cuenta:</span> <strong className="text-slate-800">{achWire.accountNumber || '---'}</strong> ({achWire.accountType || 'Checking'})</p>
            <p><span className="text-slate-500">Routing (ABA):</span> {achWire.routing || '---'}</p>
            {achWire.bankAddress && <p className="text-[10px] text-slate-500">{achWire.bankAddress}</p>}
          </div>
        )}

        {banking.paypal && (
          <div className="md:col-span-2 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50/50 flex items-center justify-between">
            <span className="text-slate-600 font-medium">Pago Internacional vía PayPal:</span>
            <strong className="text-blue-700 font-semibold">{banking.paypal}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
