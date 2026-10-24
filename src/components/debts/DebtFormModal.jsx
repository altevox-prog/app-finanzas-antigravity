import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HandCoins, X } from 'lucide-react';
import DebtTypeTabs from './DebtTypeTabs';
import DebtFormInputs from './DebtFormInputs';
import { useBackHandler } from '../../hooks/useBackHandler';
import { usePrivacy } from '../../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../utils/currencyFormatter';
import {
  normalizeDebtType, parseFrequency, calculateComputedDueDate,
  calculateAccruedInterest, buildDebtPayload, formatPreviewDueDate
} from '../../services/debts/debtFormService';

const getInitialForm = (item, dec) => {
  if (!item) {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return {
      type: 'receivable', name: '', totalAmount: '', frequency: 'Único',
      biweeklyDay1: 15, biweeklyDay2: 30, dueDay: 15, dueDate: d.toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0], interestRate: '', insuranceFee: '', installments: '1'
    };
  }
  const raw = item.raw_data || {};
  const itemFreq = parseFrequency(item.frequency || raw.frequency);
  const itemInst = item.installments != null ? String(item.installments) : (raw.installments != null ? String(raw.installments) : '1');
  const numInst = parseInt(itemInst, 10);
  const biweekly = item.biweeklyDays || item.biweekly_days || raw.biweeklyDays || raw.biweekly_days;
  const dueDayVal = item.dueDay ?? item.due_day ?? raw.dueDay ?? raw.due_day;
  return {
    type: normalizeDebtType(item.type || 'receivable'), name: item.personName || item.name || '',
    totalAmount: item.totalAmount != null ? formatCurrencyInput(item.totalAmount, dec) : '',
    frequency: !isNaN(numInst) && numInst > 1 && itemFreq === 'Único' ? 'Mensual' : itemFreq,
    biweeklyDay1: Array.isArray(biweekly) ? (biweekly[0] || 15) : 15,
    biweeklyDay2: Array.isArray(biweekly) ? (biweekly[1] || 30) : 30,
    dueDay: dueDayVal ? parseInt(dueDayVal, 10) : 15,
    dueDate: item.dueDate || item.due_date || item.collectionDate || raw.dueDate || raw.due_date || '',
    startDate: item.startDate || item.start_date || raw.startDate || raw.start_date || new Date().toISOString().split('T')[0],
    interestRate: item.interestRate != null ? String(item.interestRate) : (raw.interestRate != null ? String(raw.interestRate) : ''),
    insuranceFee: item.insuranceFee != null ? String(item.insuranceFee) : (raw.insuranceFee != null ? String(raw.insuranceFee) : ''),
    installments: itemInst
  };
};

export default function DebtFormModal({ isOpen, onClose, onSave, editingItem = null }) {
  useBackHandler(isOpen, onClose);
  const { enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals();
  const editingItemId = editingItem?.id;

  const [form, setForm] = useState(() => getInitialForm(editingItem, enableDecimals));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setForm(getInitialForm(editingItem, enableDecimals));
      setError('');
    }
  }, [isOpen, editingItemId, enableDecimals]);

  const setField = (k) => (v) => setForm(prev => {
    const val = typeof v === 'function' ? v(prev[k]) : v;
    const next = { ...prev, [k]: val };
    if (k === 'installments') {
      const n = parseInt(val, 10);
      if (!isNaN(n) && n > 1 && next.frequency === 'Único') next.frequency = 'Mensual';
    }
    return next;
  });

  const computedDueDate = useMemo(() => calculateComputedDueDate(form), [
    form.frequency, form.biweeklyDay1, form.biweeklyDay2, form.dueDay, form.dueDate, form.startDate
  ]);
  const formattedPreviewDate = useMemo(() => formatPreviewDueDate(computedDueDate), [computedDueDate]);
  const { principalAmount, monthlyRate, monthsElapsed, accruedInterest } = useMemo(() => (
    calculateAccruedInterest({ totalAmount: form.totalAmount, interestRate: form.interestRate, startDate: form.startDate })
  ), [form.totalAmount, form.interestRate, form.startDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (submittingRef.current || isSubmitting) return;

    const base = parseFormattedAmount(form.totalAmount);
    if (!form.name.trim()) return setError('Por favor ingresa el nombre de la persona o entidad.');
    if (isNaN(base) || base <= 0) return setError('Por favor ingresa un monto válido mayor a 0.');
    if (form.frequency === 'Único' && !form.dueDate) return setError('Por favor selecciona la fecha límite o de vencimiento.');

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const savedItem = buildDebtPayload({ ...form, editingItem, computedDueDate, notes: editingItem?.notes || '' });
      if (onSave) onSave(savedItem)?.catch?.(err => console.warn('[Offline/Sync] Advertencia al persistir deuda:', err));
      onClose();
    } catch (err) {
      console.error('Error al guardar la deuda o préstamo:', err);
      setError('Error al procesar el guardado. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const isReceivable = form.type === 'receivable';
  const actionLabel = isReceivable ? 'dinero que presté' : 'dinero que me prestaron';

  const modalContent = (
    <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl border border-slate-100 dark:border-zinc-800 flex flex-col max-h-[85vh] overflow-hidden animate-slideUp" onClick={e => e.stopPropagation()}>
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm ${isReceivable ? 'bg-[#34C759]' : 'bg-[#FF3B30]'}`}><HandCoins className="w-5 h-5" /></div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">{editingItem ? `Editar ${actionLabel}` : `Registrar ${actionLabel}`}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{isReceivable ? 'Dinero prestado por cobrar a terceros (Préstamo)' : 'Pasivo o compromiso por pagar (Deuda)'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer" title="Cerrar"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
            {error && <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">{error}</div>}
            <DebtTypeTabs type={form.type} setType={setField('type')} />
            <DebtFormInputs
              type={form.type} name={form.name} setName={setField('name')} totalAmount={form.totalAmount} setTotalAmount={setField('totalAmount')}
              enableDecimals={enableDecimals} installments={form.installments} setInstallments={setField('installments')} frequency={form.frequency} setFrequency={setField('frequency')}
              dueDay={form.dueDay} setDueDay={setField('dueDay')} biweeklyDay1={form.biweeklyDay1} setBiweeklyDay1={setField('biweeklyDay1')}
              biweeklyDay2={form.biweeklyDay2} setBiweeklyDay2={setField('biweeklyDay2')} dueDate={form.dueDate} setDueDate={setField('dueDate')}
              startDate={form.startDate} setStartDate={setField('startDate')} interestRate={form.interestRate} setInterestRate={setField('interestRate')}
              insuranceFee={form.insuranceFee} setInsuranceFee={setField('insuranceFee')} monthsElapsed={monthsElapsed} monthlyRate={monthlyRate}
              accruedInterest={accruedInterest} principalAmount={principalAmount} formattedPreviewDate={formattedPreviewDate} setError={setError}
            />
          </div>
          <div className="shrink-0 p-4 bg-white dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-3 rounded-b-3xl">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm active:scale-95 transition-transform cursor-pointer ${isReceivable ? 'bg-[#34C759] hover:bg-emerald-600' : 'bg-[#FF3B30] hover:bg-red-600'} ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
              {isSubmitting ? 'Guardando...' : editingItem ? 'Guardar cambios' : `Registrar ${actionLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}