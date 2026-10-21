import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Check } from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import AmountInput from '../../common/AmountInput';
import { formatNativeCurrency } from '../../../utils/currencyUtils';
import { normalizeAccountType } from '../../../services/syncEngine';
import { useBackHandler } from '../../../hooks/useBackHandler';

const PRESET_BRANDS = [
  { name: 'Bancolombia', label: 'Bancolombia', brandKey: 'bancolombia', type: 'bank' }, { name: 'Nequi', label: 'Nequi', brandKey: 'nequi', type: 'savings' }, { name: 'Davivienda', label: 'Davivienda', brandKey: 'davivienda', type: 'bank' }, { name: 'Nu', label: 'Nu', brandKey: 'nu', type: 'bank' }, { name: 'BBVA', label: 'BBVA', brandKey: 'bbva', type: 'bank', fallback: <div className="w-6 h-6 rounded bg-[#004481] text-white font-black text-[9px] flex items-center justify-center">BBVA</div> }, { name: 'Efectivo', label: 'Efectivo', brandKey: 'efectivo', type: 'cash' }, { name: 'Tarjeta Crédito', label: 'Tarjeta', brandKey: 'mastercard', type: 'credit' }, { name: 'Inversiones', label: 'Inversión', brandKey: 'dinero', type: 'investment' }
];
const parseDecNum = (val) => { const n = parseFloat(String(val ?? '').replace(/,/g, '.')); return isNaN(n) ? 0 : n; };
const TYPE_ICONS = { cash: 'Wallet', card: 'CreditCard', credit: 'CreditCard', savings: 'Smartphone', investment: 'TrendingUp', bank: 'Building2' };
const INPUT_CLS = "w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-medium", LABEL_CLS = "block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5";
const DEFAULT_FORM = { name: '', type: 'bank', currency: 'COP', balance: '', ticker: '', shares: '', unitPrice: '', creditLimit: '5000000', paymentDueDate: '17', closingDate: '17', color: '#007AFF', icon: 'Building2' };

export default function AddAccountModal({ isOpen, onClose, onCreateAccount }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const iconPickerRef = useRef(null);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v })), resetForm = () => { setForm(DEFAULT_FORM); setSelectedBrand(null); setShowIconPicker(false); };
  const handleClose = () => { resetForm(); onClose?.(); };
  useBackHandler(isOpen, handleClose);

  useEffect(() => {
    if (!showIconPicker) return;
    const clickOut = (e) => { if (iconPickerRef.current && !iconPickerRef.current.contains(e.target)) setShowIconPicker(false); };
    ['mousedown', 'touchstart'].forEach((ev) => document.addEventListener(ev, clickOut));
    return () => ['mousedown', 'touchstart'].forEach((ev) => document.removeEventListener(ev, clickOut));
  }, [showIconPicker]);

  const handleSelectPreset = (it) => {
    setSelectedBrand(it.brandKey || it.name);
    setForm((p) => ({ ...p, name: it.name, ...(it.type ? { type: it.type, icon: TYPE_ICONS[it.type] || 'Building2' } : {}) }));
    setShowIconPicker(false);
  };

  const handleInvestmentChange = (field, val) => setForm((p) => {
    const next = { ...p, [field]: val }, sh = parseFloat(field === 'shares' ? val : p.shares) || 0, up = parseFloat(field === 'unitPrice' ? val : p.unitPrice) || 0;
    if (sh > 0 && up > 0) next.balance = String((sh * up).toFixed(2));
    return next;
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (isSubmitting || !form.name.trim()) return;
    setIsSubmitting(true);
    try {
      const isInv = form.type === 'investment', isCredit = normalizeAccountType(form.type) === 'credit' || form.type === 'card';
      const shNum = isInv && form.shares ? parseDecNum(form.shares) : undefined, upNum = isInv && form.unitPrice ? parseDecNum(form.unitPrice) : undefined;
      let initBal = parseDecNum(form.balance);
      if (isInv && shNum && upNum && (!form.balance || parseDecNum(form.balance) === 0)) initBal = shNum * upNum;
      if (isCredit && initBal > 0) initBal = -Math.abs(initBal);
      const normType = normalizeAccountType(form.type), numBal = Number(initBal) || 0;
      onCreateAccount?.({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('acc-' + Date.now()),
        name: form.name.trim(), type: normType, currency: form.currency || 'COP', balance: numBal, initial_balance: numBal,
        current_balance: numBal, initialBalance: numBal, currentBalance: numBal, color: form.color, icon: form.icon || TYPE_ICONS[form.type] || 'Building2',
        ...(normType === 'credit' || form.type === 'card' ? { creditLimit: parseFloat(form.creditLimit) || 5000000, paymentDueDate: parseInt(form.paymentDueDate, 10) || 17, closingDate: form.closingDate ? parseInt(form.closingDate, 10) : undefined } : {}),
        ...(isInv ? { ticker: form.ticker.trim().toUpperCase(), shares: shNum, unitPrice: upNum } : {})
      })?.catch?.((err) => console.warn('[Sync] Add account:', err));
      resetForm(); onClose?.();
    } finally { setIsSubmitting(false); }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-white/[0.08] flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">Nueva cuenta</h3>
          <button type="button" onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Divisa principal</span>
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.06]">
                {['COP', 'USD', 'EUR'].map((c) => (<button key={c} type="button" onClick={() => setF('currency', c)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${form.currency === c ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{c}</button>))}
              </div>
            </div>

            <div className="relative">
              <label className={LABEL_CLS}>Nombre de la cuenta *</label>
              <div className="flex items-center gap-2.5 w-full">
                <div className="relative">
                  <button type="button" onClick={() => setShowIconPicker((p) => !p)} title="Seleccionar entidad" className="w-11 h-11 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 hover:bg-slate-100 flex items-center justify-center shrink-0 cursor-pointer shadow-sm">
                    <BrandIcon name={selectedBrand || form.name || 'Cuenta'} type={form.type} size={26} />
                  </button>
                  {showIconPicker && (
                    <div ref={iconPickerRef} className="absolute left-0 top-full mt-2 z-50 w-64 p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl animate-fadeIn">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Entidades y Logos</div>
                      <div className="grid grid-cols-4 gap-2">
                        {PRESET_BRANDS.map((it) => (
                          <button key={it.name} type="button" onClick={() => handleSelectPreset(it)} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer" title={it.name}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-zinc-800/80"><BrandIcon name={it.brandKey || it.name} size={22} fallback={it.fallback || null} /></div>
                            <span className="text-[10px] font-medium text-slate-600 dark:text-zinc-300 truncate w-full">{it.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <input type="text" required placeholder="ej: Bancolombia, Nequi, Davivienda..." value={form.name} onChange={(e) => { setF('name', e.target.value); if (selectedBrand) setSelectedBrand(null); }} className={`${INPUT_CLS} flex-1 min-w-0`} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Tipo de método / cuenta *</label>
                <select value={form.type} onChange={(e) => { const val = e.target.value; setForm((p) => ({ ...p, type: val, icon: TYPE_ICONS[val] || 'Building2' })); }} className={`${INPUT_CLS} cursor-pointer`}>
                  <option value="bank">Banco / débito</option><option value="cash">Efectivo</option><option value="credit">Tarjeta de crédito</option><option value="savings">Ahorros / billetera digital</option><option value="investment">Inversión / acciones</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>{(form.type === 'card' || form.type === 'credit') ? 'Deuda actual / Saldo utilizado (opcional)' : `Saldo inicial (${form.currency}) *`}</label>
                <AmountInput value={form.balance} onChange={(v) => setF('balance', v)} allowDecimals placeholder="0" onFocus={(e) => e.target.select()} className={`${INPUT_CLS} font-mono font-bold`} />
              </div>
            </div>

            {form.type === 'investment' && (
              <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold"><TrendingUp className="w-4 h-4" /><span>Detalles de Acciones / Títulos (Opcional)</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Ticker / Activo</label><input type="text" placeholder="ej: CSPX, VOO" value={form.ticker} onChange={(e) => setF('ticker', e.target.value.toUpperCase())} className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 uppercase" /></div>
                  <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nº Acciones</label><input type="number" step="any" min="0" placeholder="15.5" value={form.shares} onChange={(e) => handleInvestmentChange('shares', e.target.value)} className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50" /></div>
                  <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Precio Unitario ({form.currency})</label><input type="number" step="any" min="0" placeholder="450.00" value={form.unitPrice} onChange={(e) => handleInvestmentChange('unitPrice', e.target.value)} className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50" /></div>
                </div>
                {parseFloat(form.shares) > 0 && parseFloat(form.unitPrice) > 0 && (
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-white/80 dark:bg-black/40 px-3 py-1.5 rounded-lg border border-emerald-500/20 flex items-center justify-between">
                    <span>Valor Posición:</span><strong className="font-bold tabular-nums">{formatNativeCurrency(parseFloat(form.shares) * parseFloat(form.unitPrice), form.currency)}</strong>
                  </div>
                )}
              </div>
            )}
            {(form.type === 'card' || form.type === 'credit') && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/40 animate-fadeIn">
                {[
                  { label: `Cupo Total (${form.currency}) *`, name: 'creditLimit', req: true, ph: '5000000', step: 'any' },
                  { label: 'Día Límite de Pago *', name: 'paymentDueDate', req: true, ph: '17', max: 31 },
                  { label: 'Día de Corte', name: 'closingDate', ph: '25', max: 31 }
                ].map((c) => (<div key={c.name}><label className={LABEL_CLS}>{c.label}</label><input type="number" step={c.step} min="1" max={c.max} required={c.req} placeholder={c.ph} value={form[c.name]} onChange={(e) => setF(c.name, e.target.value)} className={`${INPUT_CLS} bg-white dark:bg-zinc-900 font-mono tabular-nums`} /></div>))}
              </div>
            )}
          </div>

          <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-3">
            <button type="button" onClick={handleClose} className="px-4 py-2.5 h-11 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className={`flex-1 sm:flex-initial px-6 py-2.5 h-11 text-xs font-bold bg-[#007AFF] hover:bg-blue-600 text-white rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}><Check className="w-3.5 h-3.5" /><span>{isSubmitting ? 'Guardando...' : 'Guardar cuenta'}</span></button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
