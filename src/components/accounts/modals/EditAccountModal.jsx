import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Check, X } from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import AmountInput from '../../common/AmountInput';
import { formatNativeCurrency } from '../../../utils/currencyUtils';
import { normalizeAccountType } from '../../../services/syncEngine';
import { useBackHandler } from '../../../hooks/useBackHandler';

const PRESET_BRANDS = [
  { name: 'Bancolombia', label: 'Bancolombia', brandKey: 'bancolombia', type: 'bank' }, { name: 'Nequi', label: 'Nequi', brandKey: 'nequi', type: 'savings' }, { name: 'Davivienda', label: 'Davivienda', brandKey: 'davivienda', type: 'bank' }, { name: 'Nu', label: 'Nu', brandKey: 'nu', type: 'bank' },
  { name: 'BBVA', label: 'BBVA', brandKey: 'bbva', type: 'bank', fallback: <div className="w-6 h-6 rounded bg-[#004481] text-white font-black text-[9px] flex items-center justify-center">BBVA</div> }, { name: 'Efectivo', label: 'Efectivo', brandKey: 'efectivo', type: 'cash' }, { name: 'Tarjeta Crédito', label: 'Tarjeta', brandKey: 'mastercard', type: 'credit' }, { name: 'Inversiones', label: 'Inversión', brandKey: 'dinero', type: 'investment' }
];

const parseDecNum = (val) => { const n = parseFloat(String(val ?? '').replace(/,/g, '.')); return isNaN(n) ? 0 : n; };
const TYPE_ICONS = { cash: 'Wallet', card: 'CreditCard', credit: 'CreditCard', savings: 'Smartphone', investment: 'TrendingUp', bank: 'Building2' };
const INPUT_CLS = "w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-medium", LABEL_CLS = "block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5";

const getInitForm = (acc) => !acc ? { name: '', type: 'bank', currency: 'COP', balance: '', ticker: '', shares: '', unitPrice: '', creditLimit: '5000000', paymentDueDate: '17', closingDate: '17', color: '#007AFF', icon: 'Building2' } : {
  name: acc.name || '', type: normalizeAccountType(acc.type || 'bank'), currency: acc.currency || 'COP', balance: String(Math.abs(acc.initialBalance ?? acc.balance ?? 0)),
  ticker: acc.ticker || '', shares: acc.shares !== undefined ? String(acc.shares) : '', unitPrice: acc.unitPrice !== undefined ? String(acc.unitPrice) : '',
  creditLimit: acc.creditLimit !== undefined ? String(acc.creditLimit) : '5000000', paymentDueDate: acc.paymentDueDate !== undefined ? String(acc.paymentDueDate) : '17', closingDate: acc.closingDate !== undefined && acc.closingDate !== null ? String(acc.closingDate) : '17', color: acc.color || '#007AFF', icon: acc.icon || TYPE_ICONS[acc.type] || 'Building2'
};

export default function EditAccountModal({ account, onClose, onSave, onDelete, trm = 4050 }) {
  const [form, setForm] = useState(() => getInitForm(account));
  const [selectedBrand, setSelectedBrand] = useState(null), [showIconPicker, setShowIconPicker] = useState(false), [isSubmitting, setIsSubmitting] = useState(false);
  const iconPickerRef = useRef(null), accountId = account?.id;
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (account) { setSelectedBrand(null); setShowIconPicker(false); setForm(getInitForm(account)); }
  }, [accountId]);

  useEffect(() => {
    if (!showIconPicker) return;
    const clickOut = (e) => { if (iconPickerRef.current && !iconPickerRef.current.contains(e.target)) setShowIconPicker(false); };
    ['mousedown', 'touchstart'].forEach((ev) => document.addEventListener(ev, clickOut));
    return () => ['mousedown', 'touchstart'].forEach((ev) => document.removeEventListener(ev, clickOut));
  }, [showIconPicker]);

  const handleSelectPreset = (item) => {
    setSelectedBrand(item.brandKey || item.name);
    setForm((p) => ({ ...p, name: item.name, ...(item.type ? { type: item.type, icon: TYPE_ICONS[item.type] || 'Building2' } : {}) }));
    setShowIconPicker(false);
  };

  const handleInvestmentChange = (field, val) => setForm((p) => {
    const next = { ...p, [field]: val }, sh = parseFloat(field === 'shares' ? val : p.shares) || 0, up = parseFloat(field === 'unitPrice' ? val : p.unitPrice) || 0;
    if (sh > 0 && up > 0) next.balance = String((sh * up).toFixed(2));
    return next;
  });

  useBackHandler(Boolean(account), onClose);
  if (!account) return null;

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
      const updated = {
        ...account, name: form.name.trim(), type: normType, currency: form.currency || 'COP',
        balance: numBal, initial_balance: numBal, current_balance: numBal, initialBalance: numBal, currentBalance: numBal,
        color: form.color, icon: form.icon || TYPE_ICONS[form.type] || 'Building2',
        ...(normType === 'credit' || form.type === 'card' ? { creditLimit: parseFloat(form.creditLimit) || 5000000, paymentDueDate: parseInt(form.paymentDueDate, 10) || 17, closingDate: form.closingDate ? parseInt(form.closingDate, 10) : undefined } : {}),
        ...(isInv ? { ticker: form.ticker.trim().toUpperCase(), shares: shNum, unitPrice: upNum } : {})
      };
      if (onSave) { const res = onSave(updated); if (res?.catch) res.catch((err) => console.warn('[Sync] Edit account:', err)); }
      onClose?.();
    } finally { setIsSubmitting(false); }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn" onClick={onClose}>
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-white/[0.08] flex flex-col max-h-[90vh] overflow-hidden animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">Editar cuenta</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer" title="Cerrar"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain pr-4 sm:pr-6">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Divisa principal</span>
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.06]">
                {['COP', 'USD', 'EUR'].map((code) => <button key={code} type="button" onClick={() => setF('currency', code)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${form.currency === code ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{code}</button>)}
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
                        {PRESET_BRANDS.map((b) => (
                          <button key={b.name} type="button" onClick={() => handleSelectPreset(b)} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer" title={b.name}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-zinc-800/80"><BrandIcon name={b.brandKey || b.name} size={22} fallback={b.fallback || null} /></div><span className="text-[10px] font-medium text-slate-600 dark:text-zinc-300 truncate w-full">{b.label}</span>
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
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value, icon: TYPE_ICONS[e.target.value] || 'Building2' }))} className={`${INPUT_CLS} cursor-pointer`}>
                  <option value="bank">Banco / débito</option><option value="cash">Efectivo</option><option value="credit">Tarjeta de crédito</option><option value="savings">Ahorros / billetera digital</option><option value="investment">Inversión / acciones</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>{(form.type === 'card' || form.type === 'credit') ? 'Deuda actual / Saldo utilizado' : `Saldo inicial (${form.currency}) *`}</label>
                <AmountInput value={form.balance} onChange={(v) => setF('balance', v)} allowDecimals placeholder="0" required onFocus={(e) => e.target.select()} className={`${INPUT_CLS} font-mono font-bold`} />
              </div>
            </div>

            {form.type === 'investment' && (
              <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold"><TrendingUp className="w-4 h-4" /><span>Detalles de Acciones / Títulos (Opcional)</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { label: 'Ticker / Activo', val: form.ticker, fn: (e) => setF('ticker', e.target.value.toUpperCase()), ph: 'ej: CSPX, VOO', type: 'text' },
                    { label: 'Nº Acciones', val: form.shares, fn: (e) => handleInvestmentChange('shares', e.target.value), ph: '15.5', type: 'number' },
                    { label: `Precio Unitario (${form.currency})`, val: form.unitPrice, fn: (e) => handleInvestmentChange('unitPrice', e.target.value), ph: '450.00', type: 'number' }
                  ].map((f, i) => (
                    <div key={i}><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{f.label}</label><input type={f.type} step="any" min="0" placeholder={f.ph} value={f.val} onChange={f.fn} className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 uppercase" /></div>
                  ))}
                </div>
                {parseFloat(form.shares) > 0 && parseFloat(form.unitPrice) > 0 && (
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-white/80 dark:bg-black/40 px-3 py-1.5 rounded-lg border border-emerald-500/20 flex items-center justify-between"><span>Valor Posición:</span><strong className="font-bold tabular-nums">{formatNativeCurrency(parseFloat(form.shares) * parseFloat(form.unitPrice), form.currency)}</strong></div>
                )}
              </div>
            )}

            {(form.type === 'card' || form.type === 'credit') && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/40 animate-fadeIn">
                {[
                  { label: `Cupo Total (${form.currency}) *`, key: 'creditLimit', ph: '5000000', req: true, im: 'decimal' },
                  { label: 'Día Límite de Pago *', key: 'paymentDueDate', ph: '17', req: true, im: 'numeric' },
                  { label: 'Día de Corte', key: 'closingDate', ph: '25', req: false, im: 'numeric' }
                ].map((f) => (
                  <div key={f.key}><label className={LABEL_CLS}>{f.label}</label><input type="number" inputMode={f.im} step="any" min="1" max={f.im === 'numeric' ? 31 : undefined} required={f.req} placeholder={f.ph} value={form[f.key]} onChange={(e) => setF(f.key, e.target.value)} className={`${INPUT_CLS} bg-white dark:bg-zinc-900 font-mono tabular-nums`} /></div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 px-6 py-4 bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-3 rounded-b-3xl">
            <button type="button" onClick={onClose} className="px-4 py-2.5 h-11 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className={`px-6 py-2.5 h-11 text-xs font-bold bg-[#007AFF] hover:bg-blue-600 text-white rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}><Check className="w-3.5 h-3.5" /><span>{isSubmitting ? 'Guardando...' : 'Guardar cuenta'}</span></button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
