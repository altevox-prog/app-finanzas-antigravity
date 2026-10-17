import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HandCoins, X } from 'lucide-react';
import DebtTypeTabs from './DebtTypeTabs';
import DebtFormInputs from './DebtFormInputs';
import { useBackHandler } from '../../hooks/useBackHandler';
import { usePrivacy } from '../../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../utils/currencyFormatter';
import {
  normalizeDebtType,
  parseFrequency,
  calculateComputedDueDate,
  calculateAccruedInterest,
  buildDebtPayload,
  formatPreviewDueDate
} from '../../services/debts/debtFormService';

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
  
  // Pestaña predeterminada en Préstamos ('receivable' / 'loan') en lugar de Deuda
  const resolvedInitialType = editingItem 
    ? normalizeDebtType(editingItem.type)
    : 'receivable';

  const [type, setType] = useState(resolvedInitialType);
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [frequency, setFrequency] = useState('Único');
  const [biweeklyDay1, setBiweeklyDay1] = useState(15);
  const [biweeklyDay2, setBiweeklyDay2] = useState(30);
  const [dueDay, setDueDay] = useState(15);
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [interestRate, setInterestRate] = useState('');
  const [insuranceFee, setInsuranceFee] = useState('');
  const [installments, setInstallments] = useState('1');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Lógica condicional entre número de cuotas y frecuencia de pago
  useEffect(() => {
    const numInst = parseInt(installments, 10);
    if (!isNaN(numInst) && numInst > 1) {
      if (frequency === 'Único') {
        setFrequency('Mensual');
      }
    }
  }, [installments, frequency]);

  useEffect(() => {
    if (editingItem) {
      setType(normalizeDebtType(editingItem.type || 'receivable'));
      setName(editingItem.personName || editingItem.name || '');
      setTotalAmount(editingItem.totalAmount != null ? formatCurrencyInput(editingItem.totalAmount, enableDecimals) : '');
      const itemFreq = parseFrequency(editingItem.frequency);
      const itemInst = editingItem.installments != null ? String(editingItem.installments) : '1';
      const numInst = parseInt(itemInst, 10);
      setInstallments(itemInst);
      setFrequency(!isNaN(numInst) && numInst > 1 && itemFreq === 'Único' ? 'Mensual' : itemFreq);
      setBiweeklyDay1(Array.isArray(editingItem.biweeklyDays) ? (editingItem.biweeklyDays[0] || 15) : 15);
      setBiweeklyDay2(Array.isArray(editingItem.biweeklyDays) ? (editingItem.biweeklyDays[1] || 30) : 30);
      setDueDay(editingItem.dueDay ? parseInt(editingItem.dueDay, 10) : 15);
      setDueDate(editingItem.dueDate || editingItem.collectionDate || '');
      setStartDate(editingItem.startDate || new Date().toISOString().split('T')[0]);
      setInterestRate(editingItem.interestRate != null ? String(editingItem.interestRate) : '');
      setInsuranceFee(editingItem.insuranceFee != null ? String(editingItem.insuranceFee) : '');
    } else if (isOpen) {
      setType('receivable');
      setName('');
      setTotalAmount('');
      setFrequency('Único');
      setBiweeklyDay1(15);
      setBiweeklyDay2(30);
      setDueDay(15);
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 30);
      setDueDate(defaultDue.toISOString().split('T')[0]);
      setStartDate(new Date().toISOString().split('T')[0]);
      setInterestRate('');
      setInsuranceFee('');
      setInstallments('1');
    }
    setError('');
  }, [editingItem, resolvedInitialType, isOpen, enableDecimals]);

  const computedDueDate = useMemo(() => {
    return calculateComputedDueDate({ frequency, biweeklyDay1, biweeklyDay2, dueDay, dueDate, startDate });
  }, [frequency, biweeklyDay1, biweeklyDay2, dueDay, startDate, dueDate]);

  const formattedPreviewDate = useMemo(() => formatPreviewDueDate(computedDueDate), [computedDueDate]);

  const { principalAmount, monthlyRate, monthsElapsed, accruedInterest } = useMemo(() => {
    return calculateAccruedInterest({ totalAmount, interestRate, startDate });
  }, [totalAmount, interestRate, startDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();
    if (submittingRef.current || isSubmitting) return;

    const base = parseFormattedAmount(totalAmount);
    if (!name.trim()) return setError('Por favor ingresa el nombre de la persona o entidad.');
    if (isNaN(base) || base <= 0) return setError('Por favor ingresa un monto válido mayor a 0.');
    if (frequency === 'Único' && !dueDate) return setError('Por favor selecciona la fecha límite o de vencimiento.');

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const savedItem = buildDebtPayload({
        editingItem, type, name, totalAmount, interestRate, insuranceFee, installments,
        startDate, dueDate, computedDueDate, frequency, biweeklyDay1, biweeklyDay2, dueDay,
        notes: editingItem?.notes || ''
      });

      if (onSave) {
        const res = onSave(savedItem);
        if (res && typeof res.catch === 'function') {
          res.catch((err) => {
            console.warn('[Offline/Sync] Advertencia al persistir deuda o préstamo:', err);
          });
        }
      }
      onClose();
    } catch (err) {
      console.error('Error al guardar la deuda o préstamo:', err);
      setError('Error al procesar el guardado. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera FIJA */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm ${type === 'receivable' ? 'bg-[#34C759]' : 'bg-[#FF3B30]'}`}>
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                {editingItem ? (type === 'receivable' ? 'Editar dinero que presté' : 'Editar dinero que me prestaron') : (type === 'receivable' ? 'Registrar dinero que presté' : 'Registrar dinero que me prestaron')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {type === 'receivable' ? 'Dinero prestado por cobrar a terceros (Préstamo)' : 'Pasivo o compromiso por pagar (Deuda)'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer" title="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">{error}</div>
            )}
            <DebtTypeTabs type={type} setType={setType} />
            <DebtFormInputs
              type={type} name={name} setName={setName} totalAmount={totalAmount} setTotalAmount={setTotalAmount}
              enableDecimals={enableDecimals} installments={installments} setInstallments={setInstallments}
              frequency={frequency} setFrequency={setFrequency} dueDay={dueDay} setDueDay={setDueDay}
              biweeklyDay1={biweeklyDay1} setBiweeklyDay1={setBiweeklyDay1} biweeklyDay2={biweeklyDay2} setBiweeklyDay2={setBiweeklyDay2}
              dueDate={dueDate} setDueDate={setDueDate} startDate={startDate} setStartDate={setStartDate}
              interestRate={interestRate} setInterestRate={setInterestRate} insuranceFee={insuranceFee} setInsuranceFee={setInsuranceFee}
              monthsElapsed={monthsElapsed} monthlyRate={monthlyRate}
              accruedInterest={accruedInterest} principalAmount={principalAmount} formattedPreviewDate={formattedPreviewDate}
              setError={setError}
            />
          </div>

          {/* Pie de Acciones Fijo/Seguro */}
          <div className="shrink-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 rounded-b-3xl">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm active:scale-95 transition-transform cursor-pointer ${
                type === 'receivable' ? 'bg-[#34C759] hover:bg-emerald-600' : 'bg-[#FF3B30] hover:bg-red-600'
              } ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isSubmitting ? 'Guardando...' : (editingItem ? 'Guardar cambios' : (type === 'receivable' ? 'Registrar dinero que presté' : 'Registrar dinero que me prestaron'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
