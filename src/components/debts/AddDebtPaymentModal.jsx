import React, { useState, useEffect, useRef } from 'react';
import { X, Coins, Percent, Layers, Calendar, Wallet, AlertCircle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { usePrivacy } from '../../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../utils/currencyFormatter';
import DebtPaymentAmountFields from './parts/DebtPaymentAmountFields';

const PAYMENT_MODES = [
  { id: 'capital', label: 'Solo Capital', icon: Coins, activeClass: 'bg-emerald-600 text-white shadow-emerald-600/30' },
  { id: 'interest', label: 'Solo Intereses', icon: Percent, activeClass: 'bg-amber-600 text-white shadow-amber-600/30' },
  { id: 'mixed', label: 'Mixto', icon: Layers, activeClass: 'bg-indigo-600 text-white shadow-indigo-600/30' }
];

export default function AddDebtPaymentModal({
  isOpen, onClose, debt, stats, accounts = [], onSavePayment, formatMoney = (v) => `$${Number(v || 0).toLocaleString('es-CO')}`
}) {
  const isOpenState = Boolean(isOpen);
  const debtId = debt?.id || '';
  useBackHandler(isOpenState, onClose);

  const { enableDecimals: privDec } = usePrivacy();
  const enableDecimals = privDec ?? getEnableDecimals();
  const [form, setForm] = useState({ paymentMode: 'capital', capitalAmount: '', interestAmount: '', accountId: '', paymentDate: new Date().toISOString().split('T')[0] });
  const [error, setError] = useState('');
  const setField = (k, v) => { setForm((p) => ({ ...p, [k]: v })); if (error) setError(''); };

  const isReceivable = debt?.type === 'receivable';
  const debtorName = debt?.personName || debt?.name || 'Registro';
  const outstandingCapital = stats?.remainingCapital ?? (stats?.outstandingCapital ?? (stats?.outstandingBalance ?? (Number(debt?.totalAmount) || 0)));
  const outstandingInterest = stats?.remainingInterest ?? (stats?.accruedInterest ?? 0);
  const hasInterest = (Number(debt?.interestRate) > 0) || (outstandingInterest > 0) || (Number(debt?.totalInterest) > 0);

  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;

  useEffect(() => {
    if (!isOpenState || !debtId) return;
    const accList = accountsRef.current || [];
    const preferred = accList.find((a) => a.type === 'bank' || a.type === 'cash') || accList[0];
    setForm({
      paymentMode: 'capital',
      capitalAmount: '',
      interestAmount: '', accountId: preferred?.id || '', paymentDate: new Date().toISOString().split('T')[0]
    });
    setError('');
  }, [isOpenState, debtId]);

  if (!isOpenState || !debt) return null;

  const capVal = form.paymentMode === 'interest' ? 0 : parseFormattedAmount(form.capitalAmount);
  const intVal = form.paymentMode === 'capital' ? 0 : parseFormattedAmount(form.interestAmount);
  const totalDisbursed = capVal + intVal;

  const handleModeChange = (mode) => {
    setError('');
    const sug = stats?.suggestedInstallment || Math.round(outstandingCapital / 2);
    const estInt = outstandingInterest > 0 ? outstandingInterest : (stats?.interestAmount || (stats?.base ? stats.base * ((debt?.interestRate || 0) / 100) : 0));
    setForm((p) => {
      let cap = p.capitalAmount, intAmt = p.interestAmount;
      if (mode === 'interest') {
        cap = '';
        if (!intAmt || parseFormattedAmount(intAmt) <= 0) intAmt = estInt > 0 ? formatCurrencyInput(estInt, enableDecimals) : '';
      } else if (mode === 'capital') {
        intAmt = '';
        if (!cap || parseFormattedAmount(cap) <= 0) cap = outstandingCapital > 0 ? formatCurrencyInput(outstandingCapital, enableDecimals) : '';
      } else if (mode === 'mixed') {
        if (!cap || parseFormattedAmount(cap) <= 0) cap = formatCurrencyInput(sug > 0 ? sug : Math.round(outstandingCapital / 2), enableDecimals);
        if (!intAmt || parseFormattedAmount(intAmt) <= 0) intAmt = estInt > 0 ? formatCurrencyInput(estInt, enableDecimals) : '';
      }
      return { ...p, paymentMode: mode, capitalAmount: cap, interestAmount: intAmt };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.paymentMode === 'capital' && capVal <= 0) return setError('Ingresa el monto a capital.');
    if (form.paymentMode === 'interest' && intVal <= 0) return setError('Ingresa el monto de intereses.');
    if (form.paymentMode === 'mixed' && (capVal <= 0 || intVal <= 0)) return setError('En modo mixto debes ingresar abono a capital e intereses.');
    if (totalDisbursed <= 0) return setError('Debes ingresar un monto válido mayor a 0.');

    const selectedAcc = accounts.find((a) => a.id === form.accountId);
    onSavePayment(debt.id, {
      id: `pay-${Date.now()}`, date: form.paymentDate, mode: form.paymentMode,
      capitalAmount: form.paymentMode === 'interest' ? 0 : capVal,
      interestAmount: form.paymentMode === 'capital' ? 0 : intVal,
      amount: totalDisbursed, accountId: selectedAcc?.id || form.accountId || '',
      accountName: selectedAcc?.name || 'General', note: ''
    });
    onClose();
  };

  const inputCls = (ring = 'focus:ring-emerald-500') => `w-full text-base font-black px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 ${ring}`;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl border border-slate-100 dark:border-zinc-800 flex flex-col max-h-[85vh] overflow-hidden animate-slideUp text-slate-900 dark:text-white" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isReceivable ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>{isReceivable ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}</div>
            <div className="truncate">
              <h3 className="font-bold text-base leading-tight truncate text-slate-900 dark:text-white">Registrar abono</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{debtorName} • Cap: <strong className="text-slate-700 dark:text-slate-300">{formatMoney(outstandingCapital)}</strong>{outstandingInterest > 0 && <> • Int: <strong className="text-amber-500">{formatMoney(outstandingInterest)}</strong></>}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0" title="Cerrar"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain">
            {hasInterest && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Destino del Abono *</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
                  {PAYMENT_MODES.map((m) => (<button key={m.id} type="button" onClick={() => handleModeChange(m.id)} className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-1 cursor-pointer ${form.paymentMode === m.id ? `${m.activeClass} font-bold shadow-sm` : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}><m.icon className="w-3.5 h-3.5" /><span>{m.label}</span></button>))}
                </div>
              </div>
            )}
            <DebtPaymentAmountFields paymentMode={form.paymentMode} capitalAmount={form.capitalAmount} setCapitalAmount={(v) => setField('capitalAmount', v)} interestAmount={form.interestAmount} setInterestAmount={(v) => setField('interestAmount', v)} outstandingCapital={outstandingCapital} formatMoney={formatMoney} enableDecimals={enableDecimals} inputCls={inputCls} />
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400"><span className="font-medium">{isReceivable ? 'Total a ingresar:' : 'Total a descontar:'}</span><span className="font-black text-sm text-slate-900 dark:text-white tabular-nums">{formatMoney(totalDisbursed)}</span></div>
              {form.paymentMode === 'mixed' && (<div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-zinc-700/60 text-[11px]"><span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">Cap: {formatMoney(capVal)}</span><span className="text-amber-600 dark:text-amber-400 font-bold tabular-nums">Int: {formatMoney(intVal)}</span></div>)}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /><span>{isReceivable ? '¿A qué cuenta entra el dinero?' : '¿De qué cuenta sale el dinero?'} *</span></label>
              <select value={form.accountId} onChange={(e) => setField('accountId', e.target.value)} required className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-500" style={{ color: 'var(--text-main)' }}>
                {accounts.length === 0 ? <option value="">Cuenta Principal</option> : accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name} ({(acc.type === 'card' || acc.type === 'credit') ? 'Tarjeta' : acc.type === 'cash' ? 'Efectivo' : 'Banco'})</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /><span>Fecha del abono *</span></label>
              <input type="date" required value={form.paymentDate} onChange={(e) => setField('paymentDate', e.target.value)} className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-500" style={{ color: 'var(--text-main)' }} />
            </div>
            {error && <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0 rounded-b-3xl">
            <button type="submit" disabled={totalDisbursed <= 0} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center text-xs sm:text-sm">
              {isReceivable ? 'Confirmar abono' : 'Confirmar pago'} ({formatMoney(totalDisbursed)})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
