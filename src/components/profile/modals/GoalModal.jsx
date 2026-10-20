import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Target, Bell, Sparkles, Clock, Wallet } from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import AmountInput from '../../common/AmountInput';

const INPUT_CLS = "w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60";
const LABEL_CLS = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5";
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export default function GoalModal({
  isOpen, onClose, onSave, goal = null, editingGoal = null,
  accounts = [], formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`, disableBackHandler = false
}) {
  useBackHandler(isOpen && !disableBackHandler, onClose);
  const activeGoal = goal || editingGoal;
  const activeAccounts = useMemo(() => (accounts || []).filter((acc) => acc.status !== 'inactive'), [accounts]);

  const [form, setForm] = useState({ name: '', targetAmount: '', currentAmount: '0', targetAccountId: '', frequency: 'monthly', installments: 6, notificationDay: 15, notifyEnabled: true });
  const [error, setError] = useState('');
  const setF = (key, val) => { setForm((prev) => ({ ...prev, [key]: val })); if (error) setError(''); };

  useEffect(() => {
    if (activeGoal) {
      setForm({
        name: activeGoal.name || '', targetAmount: String(activeGoal.target_amount ?? activeGoal.targetAmount ?? ''),
        currentAmount: String(activeGoal.current_amount ?? activeGoal.currentAmount ?? '0'),
        targetAccountId: String(activeGoal.target_account_id || activeGoal.targetAccountId || ''),
        frequency: activeGoal.frequency || 'monthly', installments: activeGoal.installments || activeGoal.months || 6,
        notificationDay: Number(activeGoal.notification_day || activeGoal.notificationDay || 15),
        notifyEnabled: activeGoal.notify_enabled ?? activeGoal.notifyEnabled ?? true
      });
    } else {
      setForm({ name: '', targetAmount: '', currentAmount: '0', targetAccountId: activeAccounts[0]?.id ? String(activeAccounts[0].id) : '', frequency: 'monthly', installments: 6, notificationDay: 15, notifyEnabled: true });
    }
    setError('');
  }, [isOpen, activeGoal]);

  const { calculatedDeadline, quotaAmount, formattedDeadline, remainingAmount, selectedAccount } = useMemo(() => {
    const count = Math.max(1, Number(form.installments) || 1), target = Number(form.targetAmount) || 0, current = Number(form.currentAmount) || 0;
    const remaining = Math.max(0, target - current), targetDate = new Date();
    if (form.frequency === 'biweekly') targetDate.setDate(targetDate.getDate() + (count * 15));
    else targetDate.setMonth(targetDate.getMonth() + count);

    return {
      calculatedDeadline: targetDate.toISOString().split('T')[0], quotaAmount: Math.round(remaining / count),
      formattedDeadline: `${targetDate.getDate()} de ${MONTH_NAMES[targetDate.getMonth()]} de ${targetDate.getFullYear()}`,
      remainingAmount: remaining, selectedAccount: activeAccounts.find((a) => String(a.id) === String(form.targetAccountId))
    };
  }, [form.installments, form.frequency, form.targetAmount, form.currentAmount, form.targetAccountId, activeAccounts]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = form.name.trim(), target = Number(form.targetAmount);
    if (!cleanName) return setError('Por favor ingresa un nombre para la meta.');
    if (isNaN(target) || target <= 0) return setError('El monto objetivo debe ser mayor a 0.');

    const genId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const installmentsCount = Math.max(1, Number(form.installments) || 1);
    const calculatedMonths = form.frequency === 'biweekly' ? Math.max(1, Math.ceil(installmentsCount / 2)) : installmentsCount;

    onSave({
      id: activeGoal?.id ? String(activeGoal.id) : genId, name: cleanName, target_amount: target, targetAmount: target,
      current_amount: Number(form.currentAmount) || 0, currentAmount: Number(form.currentAmount) || 0,
      deadline: calculatedDeadline || null, target_date: calculatedDeadline || null, dueDate: calculatedDeadline || null,
      target_account_id: form.targetAccountId || null, targetAccountId: form.targetAccountId || null,
      months: calculatedMonths, installments: installmentsCount, frequency: form.frequency,
      notification_day: form.frequency === 'biweekly' ? 15 : (Number(form.notificationDay) || 15),
      notificationDay: form.frequency === 'biweekly' ? 15 : (Number(form.notificationDay) || 15),
      notify_enabled: Boolean(form.notifyEnabled), notifyEnabled: Boolean(form.notifyEnabled),
      icon: activeGoal?.icon || 'Target', color: activeGoal?.color || '#10B981', category: 'Ahorro'
    });
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200/80 dark:border-white/[0.08] my-auto">
        <div className="shrink-0 p-5 border-b border-slate-100 dark:border-white/[0.08] flex justify-between items-center">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0"><Target className="w-5 h-5 text-emerald-500" /></div>
            <div className="truncate">
              <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-zinc-100 leading-tight truncate">{activeGoal ? 'Editar meta de ahorro' : 'Nueva meta de ahorro'}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">Planifica tu objetivo, cuotas y recordatorios automáticos</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto scroll-touch p-5 space-y-4">
            {error && <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">{error}</div>}
            <div><label className={LABEL_CLS}>Nombre de la Meta *</label><input type="text" required placeholder="Ej. Fondo de emergencia, Vacaciones, Casa propia..." value={form.name} onChange={(e) => setF('name', e.target.value)} className={INPUT_CLS} /></div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={LABEL_CLS}>Monto Objetivo ($ COP) *</label><AmountInput required placeholder="0" value={form.targetAmount} onFocus={(e) => e.target.select()} onChange={(val) => setF('targetAmount', val)} prefix={<span className="text-xs opacity-50 font-mono font-bold">$</span>} className={`${INPUT_CLS} pl-8 pr-3.5 font-mono font-bold`} /></div>
              <div><label className={LABEL_CLS}>Ahorrado Actual ($ COP)</label><AmountInput placeholder="0" value={form.currentAmount} onFocus={(e) => e.target.select()} onChange={(val) => setF('currentAmount', val)} prefix={<span className="text-xs opacity-50 font-mono font-bold">$</span>} className={`${INPUT_CLS} pl-8 pr-3.5 font-mono`} /></div>
            </div>

            <div>
              <label className={`${LABEL_CLS} flex items-center justify-between`}><span>Cuenta de destino</span><span className="text-[10px] text-slate-400 font-normal">Dónde se guardará el ahorro</span></label>
              <select value={form.targetAccountId} onChange={(e) => setF('targetAccountId', e.target.value)} className={`${INPUT_CLS} cursor-pointer`}>
                <option value="">-- Sin asignar / Cuenta manual --</option>
                {activeAccounts.map((acc) => (<option key={acc.id} value={String(acc.id)}>{acc.name} {acc.institution ? `(${acc.institution})` : ''} • Saldo: {formatMoney(acc.balance || 0)}</option>))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5"><label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-emerald-500" /><span>Frecuencia del Ahorro</span></label><span className="text-[11px] text-slate-400">¿Cada cuánto abonarás?</span></div>
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-white/[0.06]">
                {['monthly', 'biweekly'].map((f) => (<button key={f} type="button" onClick={() => setF('frequency', f)} className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${form.frequency === f ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800'}`}>{f === 'monthly' ? 'Mensual' : 'Quincenal'}</button>))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 h-4 flex items-center">{form.frequency === 'biweekly' ? 'Plazo en quincenas *' : 'Plazo en meses *'}</label>
                <div className="relative">
                  <input type="number" min="1" max="240" value={form.installments} onChange={(e) => setF('installments', e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))} className="w-full h-12 text-sm font-semibold pl-3.5 pr-20 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60" placeholder="Ej: 6" />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 dark:text-zinc-400 pointer-events-none">{form.frequency === 'biweekly' ? 'quincenas' : 'meses'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 h-4 flex items-center justify-between"><span>Recordatorio</span><span className="text-[10px] font-normal text-slate-400">{form.notifyEnabled ? (form.frequency === 'biweekly' ? 'Cada quincena' : 'Cada mes') : 'Inactivo'}</span></label>
                <div className={`h-12 px-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${form.notifyEnabled ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60'}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${form.notifyEnabled ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-zinc-700 text-slate-400'}`}><Bell className="w-3.5 h-3.5 stroke-[2]" /></div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-zinc-200 truncate min-w-0">{form.notifyEnabled ? (form.frequency === 'biweekly' ? 'Avisos días 15 y 30' : `Aviso día ${form.notificationDay || 15}`) : 'Alertas pausadas'}</span>
                  </div>
                  <button type="button" role="switch" aria-checked={form.notifyEnabled} onClick={() => setF('notifyEnabled', !form.notifyEnabled)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out ${form.notifyEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'}`}><span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${form.notifyEnabled ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /><span>Cuota Sugerida ({form.frequency === 'biweekly' ? 'Quincenal' : 'Mensual'})</span></span><span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{form.installments || 1} {form.frequency === 'biweekly' ? (Number(form.installments) === 1 ? 'quincena' : 'quincenas') : (Number(form.installments) === 1 ? 'mes' : 'meses')}</span></div>
              <div className="flex items-baseline gap-2"><span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-zinc-100">{formatMoney(quotaAmount)}</span><span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">/ {form.frequency === 'biweekly' ? 'quincena' : 'mes'}</span></div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-zinc-400 font-mono">{remainingAmount > 0 ? <span>Faltan <strong>{formatMoney(remainingAmount)}</strong></span> : <span className="text-emerald-600 dark:text-emerald-400 font-semibold">¡Meta cubierta!</span>}<span>• Meta estimada: <strong>{formattedDeadline}</strong></span></div>
              {selectedAccount && (<div className="pt-2 border-t border-emerald-500/15 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium"><Wallet className="w-3.5 h-3.5 shrink-0" /><span>Destino: <strong className="text-slate-900 dark:text-zinc-100">{selectedAccount.name}</strong></span></div>)}
            </div>
          </div>

          <div className="shrink-0 p-4 border-t border-slate-100 dark:border-white/[0.08] flex justify-end gap-3 bg-zinc-50 dark:bg-zinc-900/50">
            <button type="button" onClick={onClose} className="h-11 px-4 text-xs sm:text-sm font-semibold rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" className="h-11 px-5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-sm active:scale-95 transition-transform cursor-pointer bg-emerald-600 hover:bg-emerald-700">{activeGoal ? 'Guardar cambios' : 'Guardar meta'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
