import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CalendarSync } from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { usePrivacy } from '../../../context/PrivacyContext';
import { formatCurrencyInput, getEnableDecimals } from '../../../utils/currencyFormatter';
import RecurringBasicFields from '../RecurringBasicFields';
import RecurringModeSelector from '../RecurringModeSelector';
import FrequencyConfigFields from '../FrequencyConfigFields';
import AccountCategoryFields from '../AccountCategoryFields';
import useRecurringCategories from '../useRecurringCategories';
import { normalizeEditingRecurringItem, buildRecurringPayload } from '../../../services/recurring/recurringFormService';

/**
 * AddRecurringModal
 * Modal para creación y edición de pagos y suscripciones recurrentes.
 */
export default function AddRecurringModal({
  isOpen,
  onClose,
  onSave,
  editingItem = null,
  editingPayment = null,
  accounts = [],
  categories = [],
  onAddCategory,
  onAddSubcategory,
  trm = 4000
}) {
  useBackHandler(Boolean(isOpen), onClose);
  const activeEditing = editingItem || editingPayment;
  const { enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals();

  const [type, setType] = useState('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('auto');
  const [frequency, setFrequency] = useState('monthly');
  const [nextDate, setNextDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [billingDay, setBillingDay] = useState('1');
  const [billingDayOfWeek, setBillingDayOfWeek] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [accountId, setAccountId] = useState('');

  const {
    localCategories, availableCategories, availableSubcategories,
    handleAddNewCategory, handleAddNewSubcategory
  } = useRecurringCategories({
    categories, onAddCategory, onAddSubcategory, categoryId, setCategoryId,
    subcategoryId, setSubcategoryId, type, isOpen
  });

  useEffect(() => {
    const init = normalizeEditingRecurringItem(activeEditing, { accounts, trm, enableDecimals });
    setType(init.type);
    setName(init.name);
    setAmount(init.amount);
    setMode(init.mode);
    setFrequency(init.frequency);
    setNextDate(init.nextDate);
    setBillingDay(init.billingDay);
    setBillingDayOfWeek(init.billingDayOfWeek);
    setCategoryId(init.categoryId);
    setSubcategoryId(init.subcategoryId);
    setAccountId(init.accountId);
  }, [activeEditing, isOpen, accounts, trm, enableDecimals]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const itemData = buildRecurringPayload(
      { name, type, amount, currency: 'COP', exchangeRate: '1', mode, frequency, nextDate, billingDay, billingDayOfWeek, categoryId, subcategoryId, accountId },
      { activeEditing, localCategories, accounts, enableDecimals }
    );
    if (!itemData) return;
    onSave?.(itemData);
    onClose?.();
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div 
        className="w-full max-w-lg lg:max-w-xl mx-auto my-auto bg-white dark:bg-zinc-950 rounded-3xl flex flex-col max-h-[92vh] sm:max-h-[90vh] shadow-2xl border border-slate-200/80 dark:border-zinc-800/90 overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200/70 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CalendarSync className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                {editingItem ? 'Editar pago recurrente' : 'Nuevo pago recurrente'}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Automatiza o programa avisos de cobro</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer" aria-label="Cerrar modal">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto scroll-touch p-5 sm:p-6 space-y-4 overscroll-contain">
            <RecurringBasicFields
              type={type} setType={setType} name={name} setName={setName} amount={amount}
              setAmount={setAmount} formatCurrencyInput={formatCurrencyInput} currency="COP" enableDecimals={enableDecimals}
            />
            <RecurringModeSelector mode={mode} setMode={setMode} />
            <FrequencyConfigFields
              frequency={frequency} setFrequency={setFrequency} nextDate={nextDate} setNextDate={setNextDate}
              billingDay={billingDay} setBillingDay={setBillingDay} billingDayOfWeek={billingDayOfWeek} setBillingDayOfWeek={setBillingDayOfWeek}
            />
            <AccountCategoryFields
              type={type} categoryId={categoryId} setCategoryId={setCategoryId} subcategoryId={subcategoryId}
              setSubcategoryId={setSubcategoryId} localCategories={localCategories} availableCategories={availableCategories}
              availableSubcategories={availableSubcategories} onAddCategory={handleAddNewCategory} onAddSubcategory={handleAddNewSubcategory}
              accountId={accountId} setAccountId={setAccountId} accounts={accounts}
            />
          </div>

          {/* Footer Fijo */}
          <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200/70 dark:border-zinc-800/80 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-700 dark:text-zinc-300 border border-transparent dark:border-zinc-800 dark:bg-zinc-900 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer">
              {activeEditing ? 'Guardar cambios' : 'Crear pago recurrente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
