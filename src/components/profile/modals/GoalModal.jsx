import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Target, 
  Calendar, 
  CreditCard, 
  Bell, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  Wallet
} from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import AmountInput from '../../common/AmountInput';

/**
 * GoalModal
 * Modal interactivo para crear o editar Metas de Ahorro con:
 * - Cuenta de destino (target_account_id)
 * - Plazo en meses (months)
 * - Día de notificación mensual (notification_day 1-31)
 * - Recordatorio activo (notify_enabled)
 * - Tarjeta visual con cálculo dinámico de cuota mensual
 */
export default function GoalModal({
  isOpen,
  onClose,
  onSave,
  goal = null,
  editingGoal = null,
  accounts = [],
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  disableBackHandler = false
}) {
  useBackHandler(isOpen && !disableBackHandler, onClose);

  const activeGoal = goal || editingGoal;

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [months, setMonths] = useState(6);
  const [notificationDay, setNotificationDay] = useState(15);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  // Filtrar cuentas activas y no archivadas
  const activeAccounts = useMemo(() => {
    return (accounts || []).filter(acc => acc.status !== 'inactive');
  }, [accounts]);

  // Sincronizar estado cuando se abre el modal o cambia la meta activa
  useEffect(() => {
    if (activeGoal) {
      setName(activeGoal.name || '');
      setTargetAmount(String(activeGoal.targetAmount || activeGoal.target_amount || ''));
      setCurrentAmount(activeGoal.currentAmount != null ? String(activeGoal.currentAmount) : (activeGoal.current_amount != null ? String(activeGoal.current_amount) : ''));
      setTargetAccountId(activeGoal.target_account_id || activeGoal.targetAccountId || '');
      
      const m = activeGoal.months ? Number(activeGoal.months) : 6;
      setMonths(m > 0 ? m : 6);

      const nDay = activeGoal.notification_day || activeGoal.notificationDay;
      setNotificationDay(nDay ? Number(nDay) : 15);

      setNotifyEnabled(
        activeGoal.notify_enabled !== undefined 
          ? Boolean(activeGoal.notify_enabled) 
          : (activeGoal.notifyEnabled !== undefined ? Boolean(activeGoal.notifyEnabled) : true)
      );

      const d = activeGoal.target_date || activeGoal.dueDate || activeGoal.deadline || '';
      if (d) {
        try {
          setDueDate(new Date(d).toISOString().split('T')[0]);
        } catch {
          setDueDate(String(d).split('T')[0]);
        }
      } else {
        // Calcular fecha estimada a partir de los meses
        const computed = new Date();
        computed.setMonth(computed.getMonth() + (m || 6));
        setDueDate(computed.toISOString().split('T')[0]);
      }
    } else if (isOpen) {
      setName('');
      setTargetAmount('');
      setCurrentAmount('0');
      setTargetAccountId(activeAccounts.length > 0 ? activeAccounts[0].id : '');
      setMonths(6);
      setNotificationDay(15);
      setNotifyEnabled(true);

      const computed = new Date();
      computed.setMonth(computed.getMonth() + 6);
      setDueDate(computed.toISOString().split('T')[0]);
      setError('');
    }
  }, [activeGoal, isOpen, activeAccounts]);

  // Si cambia el plazo en meses y no se fijó fecha manual, actualizar dueDate estimada
  const handleMonthsChange = (val) => {
    const num = Math.max(1, parseInt(val, 10) || 1);
    setMonths(num);
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + num);
    setDueDate(futureDate.toISOString().split('T')[0]);
  };

  // Cálculo dinámico de cuota mensual sugerida
  const { remainingAmount, monthlyInstallment, selectedAccount } = useMemo(() => {
    const target = Number(targetAmount) || 0;
    const current = Number(currentAmount) || 0;
    const m = Math.max(1, Number(months) || 1);
    const rem = Math.max(0, target - current);
    const installment = Math.round(rem / m);
    const acc = activeAccounts.find(a => String(a.id) === String(targetAccountId));

    return {
      remainingAmount: rem,
      monthlyInstallment: installment,
      selectedAccount: acc
    };
  }, [targetAmount, currentAmount, months, targetAccountId, activeAccounts]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    const target = Number(targetAmount);
    const current = Number(currentAmount) || 0;

    if (!cleanName) {
      setError('Por favor ingresa un nombre para la meta.');
      return;
    }
    if (isNaN(target) || target <= 0) {
      setError('El monto objetivo debe ser mayor a 0.');
      return;
    }

    const payload = {
      id: activeGoal ? activeGoal.id : `goal-${Date.now()}`,
      name: cleanName,
      targetAmount: target,
      target_amount: target,
      currentAmount: current,
      current_amount: current,
      target_account_id: targetAccountId || null,
      targetAccountId: targetAccountId || null,
      months: Number(months) || 1,
      notification_day: Number(notificationDay) || 15,
      notificationDay: Number(notificationDay) || 15,
      notify_enabled: Boolean(notifyEnabled),
      notifyEnabled: Boolean(notifyEnabled),
      dueDate: dueDate || null,
      target_date: dueDate || null,
      deadline: dueDate || null,
      category: 'Ahorro'
    };

    onSave(payload);
    onClose();
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200/80 dark:border-white/[0.08] my-auto"
      >
        {/* Encabezado (Header) */}
        <div className="flex-shrink-0 p-5 border-b border-slate-100 dark:border-white/[0.08] flex justify-between items-center">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="truncate">
              <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-zinc-100 leading-tight truncate">
                {activeGoal ? 'Editar meta de ahorro' : 'Nueva meta de ahorro'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                Planifica tu objetivo, cuotas y recordatorios automáticos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Formulario (Body) */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto scroll-touch p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Nombre de la Meta */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nombre de la Meta *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Fondo de emergencia, Vacaciones, Casa propia..."
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
              />
            </div>

            {/* Monto Objetivo y Ahorrado Actual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Monto Objetivo ($ COP) *
                </label>
                <AmountInput
                  required
                  placeholder="0"
                  value={targetAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(cleanVal) => { setTargetAmount(cleanVal); setError(''); }}
                  prefix={<span className="text-xs opacity-50 font-mono font-bold">$</span>}
                  className="w-full h-11 text-xs sm:text-sm pl-8 pr-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ahorrado Actual ($ COP)
                </label>
                <AmountInput
                  placeholder="0"
                  value={currentAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(cleanVal) => setCurrentAmount(cleanVal)}
                  prefix={<span className="text-xs opacity-50 font-mono font-bold">$</span>}
                  className="w-full h-11 text-xs sm:text-sm pl-8 pr-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono"
                />
              </div>
            </div>

            {/* Cuenta de Destino */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Cuenta de destino</span>
                <span className="text-[10px] text-slate-400 font-normal">Dónde se guardará el ahorro</span>
              </label>
              <div className="relative">
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 cursor-pointer"
                >
                  <option value="">-- Sin asignar / Cuenta manual --</option>
                  {activeAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} {acc.institution ? `(${acc.institution})` : ''} • Saldo: {formatMoney(acc.balance || 0)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Plazo en Meses y Día de Notificación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Plazo en meses</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="120"
                  value={months}
                  onChange={(e) => handleMonthsChange(e.target.value)}
                  className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                  <span>Día de notificación</span>
                </label>
                <select
                  value={notificationDay}
                  onChange={(e) => setNotificationDay(Number(e.target.value))}
                  disabled={!notifyEnabled}
                  className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 disabled:opacity-40 cursor-pointer"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Día {d} de cada mes
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Checkbox de activación de recordatorios - Fila táctil interactiva */}
            <div 
              onClick={() => setNotifyEnabled(!notifyEnabled)}
              className="min-h-[48px] p-3.5 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-white/[0.08] select-none"
            >
              <div className="flex items-center gap-2.5">
                <Bell className={`w-4 h-4 ${notifyEnabled ? 'text-amber-500' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 block">
                    Activar recordatorio mensual
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 block font-mono">
                    Recibe una alerta cada día {notificationDay} para abonar tu cuota
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyEnabled}
                readOnly
                className="w-4.5 h-4.5 rounded-md text-emerald-600 focus:ring-emerald-500 pointer-events-none"
              />
            </div>

            {/* Fecha Límite Opcional */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Fecha límite estimada</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono"
              />
            </div>

            {/* TARJETA VISUAL: CÁLCULO DINÁMICO DE CUOTA MENSUAL */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Cuota Mensual Sugerida
                </span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300">
                  {months} {months === 1 ? 'mes' : 'meses'}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-zinc-100">
                  {formatMoney(monthlyInstallment)}
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">/ mes</span>
              </div>

              <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono leading-relaxed">
                Fórmula: ({formatMoney(Number(targetAmount) || 0)} obj - {formatMoney(Number(currentAmount) || 0)} actual) ÷ {months} meses = {formatMoney(monthlyInstallment)} mensuales.
              </p>

              {selectedAccount && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <Wallet className="w-3.5 h-3.5 shrink-0" />
                  <span>Destino de ahorro: <strong className="text-slate-900 dark:text-zinc-100">{selectedAccount.name}</strong></span>
                </div>
              )}

              {notifyEnabled && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium font-mono">
                  <Bell className="w-3.5 h-3.5 shrink-0" />
                  <span>Alerta programada para el <strong>día {notificationDay}</strong> de cada mes.</span>
                </div>
              )}
            </div>
          </div>

          {/* Pie (Footer / Botones) */}
          <div className="flex-shrink-0 p-4 border-t border-slate-100 dark:border-white/[0.08] flex justify-end gap-3 bg-zinc-50 dark:bg-zinc-900/50">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="h-11 px-4 text-xs sm:text-sm font-semibold rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-11 px-5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-sm active:scale-95 transition-transform cursor-pointer bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center"
            >
              {activeGoal ? 'Guardar cambios' : 'Guardar meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
