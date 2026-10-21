import React, { useState } from 'react';
import { CreditCard, Globe, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { formatCOP } from '../../../utils/currencyUtils';

export default function InvoicePaymentBankSection({
  banking = {}, tax = { applyIva: true, rate: 19 }, updateBanking, updateTax, subtotal = 0, ivaAmount = 0, total = 0
}) {
  const [showNationalBank, setShowNationalBank] = useState(true);
  const colombia = banking?.colombia || {}, achWire = banking?.achWire || {};

  const handleIvaChange = (applyIva) => updateTax({ applyIva, rate: applyIva ? 19 : 0 });

  return (
    <div className="bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center border-b border-slate-100 dark:border-white/5 pb-5">
        <div className="md:col-span-5 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Paso 4</span>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Impuestos y Resumen
          </h3>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">IVA:</span>
            <div className="inline-flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
              <button
                type="button" onClick={() => handleIvaChange(false)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  !tax.applyIva ? 'bg-white dark:bg-emerald-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                0% (Exento)
              </button>
              <button
                type="button" onClick={() => handleIvaChange(true)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  tax.applyIva ? 'bg-white dark:bg-emerald-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                19% (General)
              </button>
            </div>
          </div>
        </div>

        <div className="md:col-span-7 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-xl p-4 grid grid-cols-3 gap-3 text-right">
          <div>
            <span className="block text-[11px] text-slate-400 uppercase">Subtotal</span>
            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">{formatCOP(subtotal)}</span>
          </div>
          <div>
            <span className="block text-[11px] text-slate-400 uppercase">IVA {tax.applyIva ? '(19%)' : '(0%)'}</span>
            <span className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCOP(ivaAmount)}</span>
          </div>
          <div className="border-l border-slate-200 dark:border-white/10 pl-3">
            <span className="block text-[11px] text-slate-400 uppercase font-bold">Total a Pagar</span>
            <span className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white">{formatCOP(total)}</span>
          </div>
        </div>
      </div>

      <div className="border border-slate-200/70 dark:border-white/10 rounded-xl overflow-hidden">
        <button
          type="button" onClick={() => setShowNationalBank(!showNationalBank)}
          className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 dark:bg-white/[0.02] text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <span>Datos Bancarios Colombia (Bancolombia / Nequi)</span>
          </div>
          {showNationalBank ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showNationalBank && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-200/50 dark:border-white/5">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Banco</label>
              <input type="text" value={colombia.bank || ''} onChange={(e) => updateBanking('colombia', { bank: e.target.value })} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Tipo de Cuenta</label>
              <input type="text" value={colombia.accountType || ''} onChange={(e) => updateBanking('colombia', { accountType: e.target.value })} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Número de Cuenta</label>
              <input type="text" value={colombia.accountNumber || ''} onChange={(e) => updateBanking('colombia', { accountNumber: e.target.value })} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Titular</label>
              <input type="text" value={colombia.holder || ''} onChange={(e) => updateBanking('colombia', { holder: e.target.value })} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Código SWIFT</label>
              <input type="text" value={colombia.swift || ''} onChange={(e) => updateBanking('colombia', { swift: e.target.value })} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Nequi</label>
              <input type="text" value={colombia.nequi || ''} onChange={(e) => updateBanking('colombia', { nequi: e.target.value })} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
            </div>
          </div>
        )}
      </div>

      <div className="border border-slate-200/70 dark:border-white/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-white">Cuenta Internacional (ACH & Wire)</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={Boolean(achWire.enabled)} onChange={(e) => updateBanking('achWire', { enabled: e.target.checked })} className="sr-only peer" />
            <div className="w-9 h-5 bg-slate-200 rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {achWire.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Banco Internacional</label>
              <input type="text" value={achWire.bank || ''} onChange={(e) => updateBanking('achWire', { bank: e.target.value })} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">N° Cuenta / Routing (ABA)</label>
              <input type="text" value={achWire.accountNumber || ''} onChange={(e) => updateBanking('achWire', { accountNumber: e.target.value })} placeholder="Cuenta / ABA" className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-slate-400 mb-1">Dirección del Banco</label>
              <input type="text" value={achWire.bankAddress || ''} onChange={(e) => updateBanking('achWire', { bankAddress: e.target.value })} className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}