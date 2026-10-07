import React, { useState, useEffect, useMemo } from 'react';
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
import { useBackHandler } from '../../hooks/useBackHandler';

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
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`
}) {
  useBackHandler(isOpen, onClose);

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

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-[#12141C] rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden animate-slide-up border border-slate-200/80 dark:border-white/10">
        {/* Cabecera FIJA */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0 bg-emerald-500 shadow-xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                {activeGoal ? 'Editar Meta de Ahorro' : 'Nueva Meta de Ahorro'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Planifica tu objetivo, cuotas y recordatorios automáticos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario con Scroll Interno */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Nombre de la Meta */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nombre de la Meta *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Fondo de emergencia, Vacaciones, Casa propia..."
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Monto Objetivo y Ahorrado Actual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monto Objetivo ($ COP) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-50 font-bold">$</span>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    value={targetAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => { setTargetAmount(e.target.value); setError(''); }}
                    className="w-full text-xs pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ahorrado Actual ($ COP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-50 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={currentAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full text-xs pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Cuenta de Destino */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Cuenta de destino</span>
                <span className="text-[10px] text-slate-400 font-normal">Dónde se guardará el ahorro</span>
              </label>
              <div className="relative">
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
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
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-500" />
                  <span>Plazo en meses</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={months}
                  onChange={(e) => handleMonthsChange(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Bell className="w-3 h-3 text-amber-500" />
                  <span>Día de notificación</span>
                </label>
                <select
                  value={notificationDay}
                  onChange={(e) => setNotificationDay(Number(e.target.value))}
                  disabled={!notifyEnabled}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40 cursor-pointer"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Día {d} de cada mes
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Checkbox de activación de recordatorios */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Bell className={`w-4 h-4 ${notifyEnabled ? 'text-amber-500' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                    Activar recordatorio mensual
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    Recibe una alerta cada día {notificationDay} para abonar tu cuota
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyEnabled}
                onChange={(e) => setNotifyEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer"
              />
            </div>

            {/* Fecha Límite Opcional */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Fecha límite estimada</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* TARJETA VISUAL: CÁLCULO DINÁMICO DE CUOTA MENSUAL */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Cuota Mensual Sugerida
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  {months} {months === 1 ? 'mes' : 'meses'}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {formatMoney(monthlyInstallment)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">/ mes</span>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Fórmula: ({formatMoney(Number(targetAmount) || 0)} obj - {formatMoney(Number(currentAmount) || 0)} actual) ÷ {months} meses = {formatMoney(monthlyInstallment)} mensuales.
              </p>

              {selectedAccount && (
                <div className="pt-1 border-t border-emerald-500/20 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                  <Wallet className="w-3.5 h-3.5 shrink-0" />
                  <span>Destino de ahorro: <strong>{selectedAccount.name}</strong></span>
                </div>
              )}

              {notifyEnabled && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                  <Bell className="w-3 h-3 shrink-0" />
                  <span>Alerta programada para el <strong>día {notificationDay}</strong> de cada mes.</span>
                </div>
              )}
            </div>
          </div>

          {/* Pie de página FIJO */}
          <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-[#181B26] border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs active:scale-95 transition-transform cursor-pointer bg-emerald-500 hover:bg-emerald-600"
            >
              {activeGoal ? 'Guardar Cambios' : 'Crear Meta de Ahorro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
