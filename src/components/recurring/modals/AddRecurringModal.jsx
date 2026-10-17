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
import { 
  normalizeEditingRecurringItem, 
  buildRecurringPayload 
} from '../../../services/recurring/recurringFormService';

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

  const [type, setType] = useState('expense'); // 'expense' | 'income'
  const [name, setName] = useState('');
  const currency = 'COP';
  const exchangeRate = '1';
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('auto'); // 'auto' | 'manual'
  const [frequency, setFrequency] = useState('monthly');
  const [nextDate, setNextDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [billingDay, setBillingDay] = useState('1'); // 1-31
  const [billingDayOfWeek, setBillingDayOfWeek] = useState(1); // 1 = Lunes
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [accountId, setAccountId] = useState('');

  // Sincronización, almacenamiento y gestión de categorías mediante custom hook
  const {
    localCategories,
    availableCategories,
    availableSubcategories,
    handleAddNewCategory,
    handleAddNewSubcategory
  } = useRecurringCategories({
    categories,
    onAddCategory,
    onAddSubcategory,
    categoryId,
    setCategoryId,
    subcategoryId,
    setSubcategoryId,
    type,
    isOpen
  });

  // Sincronización de estado al abrir el modal o cambiar el elemento en edición
  useEffect(() => {
    const initialData = normalizeEditingRecurringItem(activeEditing, {
      accounts,
      trm,
      enableDecimals
    });

    setType(initialData.type);
    setName(initialData.name);
    setAmount(initialData.amount);
    setMode(initialData.mode);
    setFrequency(initialData.frequency);
    setNextDate(initialData.nextDate);
    setBillingDay(initialData.billingDay);
    setBillingDayOfWeek(initialData.billingDayOfWeek);
    setCategoryId(initialData.categoryId);
    setSubcategoryId(initialData.subcategoryId);
    setAccountId(initialData.accountId);
  }, [activeEditing, isOpen, accounts, trm, enableDecimals]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    const itemData = buildRecurringPayload(
      {
        name,
        type,
        amount,
        currency,
        exchangeRate,
        mode,
        frequency,
        nextDate,
        billingDay,
        billingDayOfWeek,
        categoryId,
        subcategoryId,
        accountId
      },
      {
        activeEditing,
        localCategories,
        accounts,
        enableDecimals
      }
    );

    if (!itemData) {
      return;
    }

    if (typeof onSave === 'function') {
      onSave(itemData);
    }
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-lg lg:max-w-xl mx-auto my-auto bg-white dark:bg-[#121622] rounded-t-[32px] sm:rounded-3xl flex flex-col max-h-[92vh] sm:max-h-[90vh] shadow-2xl overflow-hidden animate-slide-up border border-slate-200/80 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CalendarSync className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                {editingItem ? 'Editar pago recurrente' : 'Nuevo pago recurrente'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Automatiza o programa avisos de cobro
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto scroll-touch p-5 sm:p-6 space-y-4 overscroll-contain">
            
            {/* 1, 2 y 3. Campos básicos: Tipo, Concepto y Monto en COP */}
            <RecurringBasicFields
              type={type}
              setType={setType}
              name={name}
              setName={setName}
              amount={amount}
              setAmount={setAmount}
              formatCurrencyInput={formatCurrencyInput}
              currency="COP"
              enableDecimals={enableDecimals}
            />

            {/* 4. Modo de Ejecución (Auto vs Recordatorio Manual) */}
            <RecurringModeSelector
              mode={mode}
              setMode={setMode}
            />

            {/* 5. Frecuencia y Fechas */}
            <FrequencyConfigFields
              frequency={frequency}
              setFrequency={setFrequency}
              nextDate={nextDate}
              setNextDate={setNextDate}
              billingDay={billingDay}
              setBillingDay={setBillingDay}
              billingDayOfWeek={billingDayOfWeek}
              setBillingDayOfWeek={setBillingDayOfWeek}
            />

            {/* 6 y 7. Categoría, Subcategoría y Cuenta / Tarjeta */}
            <AccountCategoryFields
              type={type}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              subcategoryId={subcategoryId}
              setSubcategoryId={setSubcategoryId}
              localCategories={localCategories}
              availableCategories={availableCategories}
              availableSubcategories={availableSubcategories}
              onAddCategory={handleAddNewCategory}
              onAddSubcategory={handleAddNewSubcategory}
              accountId={accountId}
              setAccountId={setAccountId}
              accounts={accounts}
            />

          </div>

          {/* Footer Fijo */}
          <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-[#181D2A] border-t border-slate-200/70 dark:border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              {activeEditing ? 'Guardar cambios' : 'Crear pago recurrente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
