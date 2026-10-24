import React, { useState } from 'react';
import { CreditCard, Globe, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import { formatCOP } from '../../../utils/currencyUtils';

export default function InvoicePaymentBankSection({
  banking = {}, tax = { applyIva: true, rate: 19 }, updateBanking, updateTax,
  subtotal = 0, ivaAmount = 0, total = 0, isOpen = false, onToggle
}) {
  const [showNationalBank, setShowNationalBank] = useState(true);
  const colombia = banking?.colombia || {}, achWire = banking?.achWire || {};
  const handleIvaChange = (applyIva) => updateTax({ applyIva, rate: applyIva ? 19 : 0 });

  return (
    <div className={`bg-white dark:bg-zinc-900/90 rounded-3xl border border-slate-200/60 dark:border-white/[0.08] shadow-sm transition-all ${
      isOpen ? 'p-5 sm:p-6 space-y-5' : 'p-4 sm:p-5 hover:border-slate-300 dark:hover:border-white/20'
    }`}>
      <div
        role="button" tabIndex={0} onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle?.(); }}
        className="w-full flex items-center justify-between text-left cursor-pointer select-none group"
      >
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Paso 4</span>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Impuestos y resumen
          </h3>
        </div>
        <div className="flex items-center gap-2.5">
          {!isOpen && (
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800/70 border border-transparent dark:border-white/[0.08] px-2.5 py-1 rounded-lg">
              Total: {formatCOP(total)}
            </span>
          )}
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200 transition-colors" /> : <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200 transition-colors" />}
        </div>
      </div>

      {isOpen && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center border-t border-slate-100 dark:border-white/[0.08] pt-4">
            <div className="md:col-span-5 space-y-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">Configuración de IVA:</span>
              <div className="flex items-center gap-2">
                <div className="inline-flex bg-slate-100 dark:bg-zinc-800/70 p-1 rounded-xl border border-transparent dark:border-white/[0.08]">
                  <button
                    type="button" onClick={() => handleIvaChange(false)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${!tax.applyIva ? 'bg-white dark:bg-emerald-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    0% (Exento)
                  </button>
                  <button
                    type="button" onClick={() => handleIvaChange(true)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${tax.applyIva ? 'bg-white dark:bg-emerald-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    19% (General)
                  </button>
                </div>
              </div>
            </div>

            <div className="md:col-span-7 bg-slate-50/80 dark:bg-zinc-800/30 border border-slate-200/60 dark:border-white/[0.08] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-left sm:text-right">
              <div className="flex items-center justify-between sm:block"><span className="block text-[11px] text-slate-400 dark:text-zinc-400 uppercase">Subtotal</span><span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-200">{formatCOP(subtotal)}</span></div>
              <div className="flex items-center justify-between sm:block"><span className="block text-[11px] text-slate-400 dark:text-zinc-400 uppercase">IVA {tax.applyIva ? '(19%)' : '(0%)'}</span><span className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCOP(ivaAmount)}</span></div>
              <div className="flex items-center justify-between sm:block border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-white/[0.08] pt-2 sm:pt-0 sm:pl-3"><span className="block text-[11px] text-slate-400 dark:text-zinc-400 uppercase font-bold">Total a pagar</span><span className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white">{formatCOP(total)}</span></div>
            </div>
          </div>

          <div className="border border-slate-200/70 dark:border-white/[0.08] rounded-2xl overflow-hidden bg-white/40 dark:bg-zinc-800/20">
            <button
              type="button" onClick={() => setShowNationalBank(!showNationalBank)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 dark:bg-zinc-800/50 text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <span>Datos bancarios Colombia (Bancolombia / Nequi)</span>
              </div>
              {showNationalBank ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showNationalBank && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-200/50 dark:border-white/[0.08]">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] text-slate-500 dark:text-zinc-400">Banco</label>
                    {colombia.bank && <BrandIcon name={colombia.bank} size={14} className="w-3.5 h-3.5 object-contain" />}
                  </div>
                  <input type="text" value={colombia.bank || ''} onChange={(e) => updateBanking('colombia', { bank: e.target.value })} placeholder="Nombre del banco" className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-zinc-400 mb-1">Tipo de cuenta</label>
                  <input type="text" value={colombia.accountType || ''} onChange={(e) => updateBanking('colombia', { accountType: e.target.value })} placeholder="Ej. Ahorros, Corriente" className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-zinc-400 mb-1">Número de cuenta</label>
                  <input type="text" value={colombia.accountNumber || ''} onChange={(e) => updateBanking('colombia', { accountNumber: e.target.value })} placeholder="Número de cuenta" className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-zinc-400 mb-1">Titular</label>
                  <input type="text" value={colombia.holder || ''} onChange={(e) => updateBanking('colombia', { holder: e.target.value })} placeholder="Nombre del titular" className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-zinc-400 mb-1">Código SWIFT</label>
                  <input type="text" value={colombia.swift || ''} onChange={(e) => updateBanking('colombia', { swift: e.target.value })} placeholder="Código SWIFT / BIC" className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-zinc-400 mb-1">Nequi</label>
                  <input type="text" value={colombia.nequi || ''} onChange={(e) => updateBanking('colombia', { nequi: e.target.value })} placeholder="Número de celular" className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" />
                </div>
              </div>
            )}
          </div>

          <div className="border border-slate-200/70 dark:border-white/[0.08] rounded-2xl p-4 space-y-3 bg-white/40 dark:bg-zinc-800/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-white">Cuenta internacional (ACH & Wire)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={Boolean(achWire.enabled)} onChange={(e) => updateBanking('achWire', { enabled: e.target.checked })} className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer dark:bg-zinc-700/80 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {achWire.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-zinc-400 mb-1">Banco internacional</label>
                  <input type="text" value={achWire.bank || ''} onChange={(e) => updateBanking('achWire', { bank: e.target.value })} placeholder="Nombre del banco" className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-zinc-400 mb-1">N° cuenta / routing (ABA)</label>
                  <input type="text" value={achWire.accountNumber || ''} onChange={(e) => updateBanking('achWire', { accountNumber: e.target.value })} placeholder="Cuenta / ABA" className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-500 dark:text-zinc-400 mb-1">Dirección del banco</label>
                  <input type="text" value={achWire.bankAddress || ''} onChange={(e) => updateBanking('achWire', { bankAddress: e.target.value })} placeholder="Dirección del banco" className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800/50 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60" />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}