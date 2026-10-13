import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  HandCoins, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Percent, 
  ShieldCheck, 
  X, 
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';
import DebtScheduleFields from '../debts/DebtScheduleFields';
import { useBackHandler } from '../../hooks/useBackHandler';
import { getNextPaymentDate, calculateElapsedMonths } from '../../utils/debtAlerts';
import { usePrivacy } from '../../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../utils/currencyFormatter';
import { safeNumber } from '../../utils/financeMath';

const normalizeDebtType = (val) => {
  if (!val) return 'receivable';
  const s = String(val).toLowerCase().trim();
  if (s === 'payable' || s === 'debo' || s === 'borrowed' || s.includes('prestaron') || s === 'debt' || s === 'deudas') {
    return 'payable';
  }
  return 'receivable';
};

export default function DebtFormModal({
  isOpen,
  onClose,
  onSave,
  initialType = 'receivable',
  defaultType,
  editingItem = null
}) {
  useBackHandler(isOpen, onClose);

  const { enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals();

  const resolvedInitialType = normalizeDebtType(defaultType || initialType);

  const [type, setType] = useState(resolvedInitialType);
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [frequency, setFrequency] = useState('Único'); // 'Único' | 'Semanal' | 'Quincenal' | 'Mensual'
  const [biweeklyDay1, setBiweeklyDay1] = useState(15);
  const [biweeklyDay2, setBiweeklyDay2] = useState(30);
  const [dueDay, setDueDay] = useState(15);
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [interestRate, setInterestRate] = useState('');
  const [insuranceFee, setInsuranceFee] = useState('');
  const [installments, setInstallments] = useState('1');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Normalizar frecuencia existente
  const parseFrequency = (rawFreq) => {
    if (!rawFreq) return 'Único';
    const f = rawFreq.toLowerCase();
    if (f.includes('quincen')) return 'Quincenal';
    if (f.includes('mensual')) return 'Mensual';
    if (f.includes('semanal')) return 'Semanal';
    return 'Único';
  };

  useEffect(() => {
    if (editingItem) {
      setType(normalizeDebtType(editingItem.type || resolvedInitialType));
      setName(editingItem.personName || editingItem.name || '');
      setTotalAmount(editingItem.totalAmount != null ? formatCurrencyInput(editingItem.totalAmount, enableDecimals) : '');
      const parsedFreq = parseFrequency(editingItem.frequency);
      setFrequency(parsedFreq);

      if (Array.isArray(editingItem.biweeklyDays) && editingItem.biweeklyDays.length === 2) {
        setBiweeklyDay1(editingItem.biweeklyDays[0] || 15);
        setBiweeklyDay2(editingItem.biweeklyDays[1] || 30);
      } else {
        setBiweeklyDay1(15);
        setBiweeklyDay2(30);
      }

      setDueDay(editingItem.dueDay ? parseInt(editingItem.dueDay, 10) : 15);
      setDueDate(editingItem.dueDate || editingItem.collectionDate || '');
      setStartDate(editingItem.startDate || new Date().toISOString().split('T')[0]);
      setInterestRate(editingItem.interestRate != null ? String(editingItem.interestRate) : '');
      setInsuranceFee(editingItem.insuranceFee != null ? String(editingItem.insuranceFee) : '');
      setInstallments(editingItem.installments != null ? String(editingItem.installments) : '1');
      setNotes(editingItem.notes || '');
    } else if (isOpen) {
      setType(resolvedInitialType);
      setName('');
      setTotalAmount('');
      setFrequency('Único');
      setBiweeklyDay1(15);
      setBiweeklyDay2(30);
      setDueDay(15);
      // Por defecto fecha en 30 días para pago único
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 30);
      setDueDate(defaultDue.toISOString().split('T')[0]);
      setStartDate(new Date().toISOString().split('T')[0]);
      setInterestRate('');
      setInsuranceFee('');
      setInstallments('1');
      setNotes('');
    }
    setError('');
  }, [editingItem, resolvedInitialType, isOpen, enableDecimals]);

  // Cálculo en vivo de la fecha límite o próximo corte según la frecuencia elegida
  const computedDueDate = useMemo(() => {
    if (frequency === 'Único') {
      return dueDate;
    }
    const tempItem = {
      frequency,
      biweeklyDays: [biweeklyDay1, biweeklyDay2],
      dueDay,
      startDate
    };
    const nextDate = getNextPaymentDate(tempItem, new Date());
    if (nextDate && !isNaN(nextDate.getTime())) {
      return nextDate.toISOString().split('T')[0];
    }
    return dueDate || new Date().toISOString().split('T')[0];
  }, [frequency, biweeklyDay1, biweeklyDay2, dueDay, startDate, dueDate]);

  // Formato legible para mostrar en la interfaz
  const formattedPreviewDate = useMemo(() => {
    if (!computedDueDate) return '';
    const parts = computedDueDate.split('-');
    if (parts.length !== 3) return computedDueDate;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, [computedDueDate]);

  // Cálculos en vivo de intereses retroactivos según Fecha de Desembolso
  const principalAmount = parseFormattedAmount(totalAmount);
  const monthlyRate = parseFloat(interestRate) || 0;

  const monthsElapsed = useMemo(() => {
    return calculateElapsedMonths(startDate);
  }, [startDate]);

  const accruedInterest = useMemo(() => {
    if (monthsElapsed > 0 && monthlyRate > 0 && principalAmount > 0) {
      return Math.round(principalAmount * (monthlyRate / 100) * monthsElapsed);
    }
    return 0;
  }, [monthsElapsed, monthlyRate, principalAmount]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const base = parseFormattedAmount(totalAmount);
    if (!name.trim()) {
      setError('Por favor ingresa el nombre de la persona o entidad.');
      return;
    }
    if (isNaN(base) || base <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0.');
      return;
    }
    if (frequency === 'Único' && !dueDate) {
      setError('Por favor selecciona la fecha límite o de vencimiento.');
      return;
    }

    const finalTargetDate = frequency === 'Único' ? dueDate : computedDueDate;

    // Calcular abonos previos si se está editando
    const existingPayments = editingItem ? (editingItem.payments || []) : [];
    const totalCapitalPaid = existingPayments.reduce((sum, p) => {
      if (p.capitalAmount !== undefined) return sum + safeNumber(p.capitalAmount);
      if (p.mode === 'interest') return sum;
      return sum + safeNumber(p.amount);
    }, 0);
    const totalInterestPaid = existingPayments.reduce((sum, p) => {
      if (p.interestAmount !== undefined) return sum + safeNumber(p.interestAmount);
      if (p.mode === 'interest') return sum + safeNumber(p.amount);
      return sum;
    }, 0);

    const remainingCapital = Math.max(0, base - totalCapitalPaid);
    const remainingInterest = Math.max(0, accruedInterest - totalInterestPaid);
    const totalRemaining = remainingCapital + remainingInterest;

    const savedItem = {
      id: editingItem ? editingItem.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'debt-' + Date.now()),
      type,
      name: name.trim(),
      personName: name.trim(),
      totalAmount: base,
      principalAmount: base,
      accruedInterest,
      monthsElapsed,
      remainingCapital,
      remainingInterest,
      totalRemaining,
      remainingAmount: remainingCapital, // Retrocompatibilidad
      interestRate: parseFloat(interestRate) || 0,
      insuranceFee: parseFloat(insuranceFee) || 0,
      installments: parseInt(installments, 10) || 1,
      startDate: startDate || new Date().toISOString().split('T')[0],
      dueDate: finalTargetDate,
      collectionDate: finalTargetDate,
      frequency,
      biweeklyDays: frequency === 'Quincenal' ? [parseInt(biweeklyDay1, 10), parseInt(biweeklyDay2, 10)] : null,
      dueDay: frequency === 'Mensual' ? parseInt(dueDay, 10) : null,
      notes: notes.trim(),
      payments: existingPayments
    };

    onSave(savedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-[#12141C] rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden animate-slide-up">
        {/* Cabecera FIJA */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm ${
              type === 'receivable' ? 'bg-[#34C759]' : 'bg-[#FF3B30]'
            }`}>
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                {editingItem 
                  ? (type === 'receivable' ? 'Editar dinero que presté' : 'Editar dinero que me prestaron')
                  : (type === 'receivable' ? 'Registrar dinero que presté' : 'Registrar dinero que me prestaron')
                }
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {type === 'receivable' ? 'Dinero prestado por cobrar a terceros (Me deben)' : 'Pasivo o compromiso por pagar (Debo)'}
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Cuerpo con SCROLL interno */}
          <div className="flex-1 overflow-y-auto scroll-touch p-6 space-y-4 overscroll-contain">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Selector de Tipo: Me Deben vs Debo */}
            <div className="relative flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-white/10 select-none">
              {[
                { id: 'receivable', label: 'Me Deben (Por Cobrar)', icon: ArrowUpRight, activeClass: 'text-emerald-600 dark:text-emerald-400 font-bold', bgClass: 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/30' },
                { id: 'payable', label: 'Debo (Por Pagar)', icon: ArrowDownLeft, activeClass: 'text-rose-600 dark:text-rose-400 font-bold', bgClass: 'bg-rose-500/15 dark:bg-rose-500/20 border-rose-500/30' }
              ].map((tab) => {
                const isActive = type === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setType(tab.id)}
                    className={`relative z-10 flex-1 py-2 text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer rounded-xl ${
                      isActive ? tab.activeClass : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeLoanTypeTab"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        className={`absolute inset-0 rounded-xl border shadow-sm ${tab.bgClass}`}
                      />
                    )}
                    <span className="relative z-10 flex items-center justify-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Campos del Formulario */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  Nombre de la Persona o Entidad *
                </label>
                <input
                  type="text"
                  required
                  placeholder={type === 'receivable' ? 'ej: Carlos Mendoza, Andrés...' : 'ej: Banco Santander, Tarjeta Visa...'}
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                    Monto Base Total ($ COP) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs opacity-50 font-bold">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="0"
                      value={totalAmount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => { setTotalAmount(formatCurrencyInput(e.target.value, enableDecimals)); setError(''); }}
                      className="w-full h-11 text-xs sm:text-sm pl-8 pr-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-bold font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                    Número de Cuotas
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    placeholder="1"
                    value={installments}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setInstallments(e.target.value)}
                    className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono tabular-nums"
                  />
                </div>
              </div>

              {/* Frecuencia de Pago y Lógica Condicional de Fecha */}
              <DebtScheduleFields
                frequency={frequency}
                setFrequency={setFrequency}
                dueDay={dueDay}
                setDueDay={setDueDay}
                biweeklyDay1={biweeklyDay1}
                setBiweeklyDay1={setBiweeklyDay1}
                biweeklyDay2={biweeklyDay2}
                setBiweeklyDay2={setBiweeklyDay2}
                dueDate={dueDate}
                setDueDate={setDueDate}
                startDate={startDate}
                formattedPreviewDate={formattedPreviewDate}
                setError={setError}
              />

              {/* Fecha de Inicio y Tasa de Interés */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                    Fecha de Inicio / Desembolso
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                    Tasa de Interés Total (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={interestRate}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="w-full h-11 text-xs sm:text-sm pl-3.5 pr-8 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono tabular-nums"
                    />
                    <Percent className="w-3.5 h-3.5 opacity-40 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Tarjeta informativa en vivo si han transcurrido meses con intereses acumulados */}
              {monthsElapsed > 0 && monthlyRate > 0 && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col gap-1.5 text-xs text-amber-600 dark:text-amber-400 animate-fadeIn">
                  <div className="flex items-center gap-2 font-bold">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Liquidación de Intereses Acumulados ({monthsElapsed} {monthsElapsed === 1 ? 'mes transcurrido' : 'meses transcurridos'})</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Intereses causados a hoy:</span>
                    <span className="font-bold text-amber-500">${accruedInterest.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Saldo total adeudado a hoy:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ${(principalAmount + accruedInterest).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold opacity-70 mb-1">
                    Cargos de Seguro / Trámite ($)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      value={insuranceFee}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setInsuranceFee(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                    />
                    <ShieldCheck className="w-3.5 h-3.5 opacity-40 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold opacity-70 mb-1">
                    Notas o Comentarios (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Detalles sobre el préstamo o cuotas..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>
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
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm active:scale-95 transition-transform cursor-pointer ${
                type === 'receivable' ? 'bg-[#34C759] hover:bg-emerald-600' : 'bg-[#FF3B30] hover:bg-red-600'
              }`}
            >
              {editingItem 
                ? 'Guardar Cambios' 
                : (type === 'receivable' ? 'Registrar dinero que presté' : 'Registrar dinero que me prestaron')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
