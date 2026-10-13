import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  CalendarSync, 
  ArrowDownRight, 
  ArrowUpRight, 
  CheckCircle2, 
  Calendar, 
  Bell, 
  Zap, 
  Layers,
  Sparkles
} from 'lucide-react';
import SegmentedControl from '../common/SegmentedControl';
import { useBackHandler } from '../../hooks/useBackHandler';
import { usePrivacy } from '../../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../utils/currencyFormatter';
import FrequencyConfigFields from '../recurring/FrequencyConfigFields';
import AccountCategoryFields from '../recurring/AccountCategoryFields';
import useRecurringCategories from '../recurring/useRecurringCategories';

const POPULAR_SUGGESTIONS = [
  'Internet / Fibra',
  'Netflix',
  'Spotify',
  'Arriendo / Renta',
  'Energía y Agua',
  'Gimnasio',
  'Telefonía Móvil',
  'Seguro',
  'iCloud / Drive'
];

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
  const [currency, setCurrency] = useState('COP'); // 'COP' | 'USD' | 'EUR'
  const [exchangeRate, setExchangeRate] = useState(String(trm || 4000));
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('auto'); // 'auto' | 'manual'
  const [frequency, setFrequency] = useState('monthly'); // 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'yearly'
  const [nextDate, setNextDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [billingDay, setBillingDay] = useState('1'); // 1-31
  const [billingDayOfWeek, setBillingDayOfWeek] = useState(1); // 1 = Lunes
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [note, setNote] = useState('');

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

  // Sync state when editing or opening
  useEffect(() => {
    if (activeEditing) {
      setType(activeEditing.type || 'expense');
      setName(activeEditing.name || '');
      const curr = activeEditing.originalCurrency || activeEditing.currency || 'COP';
      setCurrency(curr);
      const origAmt = (curr !== 'COP' && activeEditing.originalAmount != null)
        ? activeEditing.originalAmount 
        : activeEditing.amount;
      setAmount(origAmt ? formatCurrencyInput(origAmt, enableDecimals) : '');
      setExchangeRate(activeEditing.exchangeRate ? String(activeEditing.exchangeRate) : (curr === 'EUR' ? '4400' : String(trm || 4000)));
      setMode(activeEditing.mode || 'auto');
      setFrequency(activeEditing.frequency || 'monthly');
      setBillingDay(activeEditing.billingDay ? String(activeEditing.billingDay) : '1');
      setBillingDayOfWeek(activeEditing.billingDayOfWeek != null ? activeEditing.billingDayOfWeek : 1);
      
      const rawDate = activeEditing.nextDate || activeEditing.next_date || activeEditing.date || activeEditing.billingDate;
      if (rawDate) {
        try {
          setNextDate(new Date(rawDate).toISOString().split('T')[0]);
        } catch {
          setNextDate(new Date().toISOString().split('T')[0]);
        }
      } else {
        setNextDate(new Date().toISOString().split('T')[0]);
      }

      setCategoryId(activeEditing.categoryId || activeEditing.category_id || activeEditing.category || '');
      setSubcategoryId(activeEditing.subcategoryId || activeEditing.subcategory_id || '');
      setAccountId(activeEditing.accountId || activeEditing.account_id || '');
      setNote(activeEditing.note || activeEditing.notes || '');
    } else {
      setType('expense');
      setName('');
      setCurrency('COP');
      setExchangeRate(String(trm || 4000));
      setAmount('');
      setMode('auto');
      setFrequency('monthly');
      setNextDate(new Date().toISOString().split('T')[0]);
      setBillingDay(String(new Date().getDate()));
      setBillingDayOfWeek(1);
      setNote('');
      // Default to first available account when creating a new recurring payment
      const safeAccounts = Array.isArray(accounts) ? accounts.filter(Boolean) : [];
      setAccountId(safeAccounts[0]?.id || '');
    }
  }, [activeEditing, isOpen, accounts, trm, enableDecimals]);


  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFormattedAmount(amount);
    if (!name.trim() || isNaN(numAmount) || numAmount <= 0) return;

    const rateNum = currency === 'COP' ? 1 : (parseFloat(exchangeRate) || 1);
    const calculatedAmount = currency === 'COP' ? numAmount : (numAmount * rateNum);
    const finalAmount = enableDecimals 
      ? Number(calculatedAmount.toFixed(2)) 
      : Math.round(calculatedAmount);

    const cat = localCategories.find(c => c.id === categoryId);
    const subcat = cat?.subcategories?.find(s => s.id === subcategoryId);
    const acc = accounts.find(a => a.id === accountId);

    const itemData = {
      id: activeEditing ? activeEditing.id : ('rec-' + Date.now()),
      name: name.trim(),
      type,
      amount: finalAmount,
      originalAmount: numAmount,
      originalCurrency: currency,
      exchangeRate: rateNum,
      mode,
      frequency,
      nextDate: nextDate,
      next_date: nextDate,
      billingDay: frequency === 'monthly' ? parseInt(billingDay, 10) || 1 : null,
      billingDays: frequency === 'biweekly' ? [15, 30] : null,
      billingDayOfWeek: frequency === 'weekly' ? billingDayOfWeek : null,
      accountId,
      account_id: accountId,
      accountName: acc ? acc.name : 'Principal',
      categoryId,
      category_id: categoryId,
      categoryName: cat ? cat.name : 'General',
      subcategoryId: subcat ? subcat.id : null,
      subcategory_id: subcat ? subcat.id : null,
      subcategoryName: subcat ? subcat.name : null,
      isActive: activeEditing ? (activeEditing.isActive !== false) : true,
      note: note.trim(),
      notes: note.trim(),
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdAt: activeEditing?.createdAt || new Date().toISOString()
    };

    onSave(itemData);
    onClose();
  };

  if (!isOpen) return null;

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
                {editingItem ? 'Editar Pago Recurrente' : 'Nuevo Pago Recurrente'}
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
            
            {/* 1. Tipo: Gasto vs Ingreso */}
            <div>
              <SegmentedControl
                options={[
                  { id: 'expense', label: 'Gasto Fijo', icon: ArrowDownRight },
                  { id: 'income', label: 'Ingreso Periódico', icon: ArrowUpRight }
                ]}
                value={type}
                onChange={setType}
                size="md"
              />
            </div>

            {/* 2. Nombre / Concepto */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Nombre o Concepto *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Arriendo, Internet Fibra, Netflix, Salario"
                className="w-full h-11 px-3.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-emerald-500/60 bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100"
              />

              {/* Sugerencias Rápidas */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-2 no-scrollbar">
                {POPULAR_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setName(sug)}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-semibold shrink-0 bg-slate-100 hover:bg-slate-200/70 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200/60 dark:border-white/5 cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Monto y Multidivisa */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Monto ({currency === 'COP' ? '$ COP' : currency}) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 font-black text-lg text-slate-900 dark:text-zinc-100">
                  {currency === 'EUR' ? '€' : '$'}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0"
                  value={amount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setAmount(formatCurrencyInput(e.target.value, enableDecimals))}
                  className="w-full pl-8 pr-3.5 h-12 rounded-xl text-xl font-bold font-mono tracking-tight border border-slate-200 dark:border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-emerald-500/60 bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 tabular-nums"
                />
              </div>

              {/* Selector horizontal de moneda */}
              <div className="flex items-center gap-1.5 mt-2">
                {[
                  { code: 'COP', label: 'COP' },
                  { code: 'USD', label: 'USD $' },
                  { code: 'EUR', label: 'EUR €' }
                ].map((c) => {
                  const isSelected = currency === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCurrency(c.code);
                        if (c.code === 'USD') {
                          setExchangeRate(String(trm || 4000));
                        } else if (c.code === 'EUR') {
                          setExchangeRate('4400');
                        } else {
                          setExchangeRate('1');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-sm font-bold scale-[1.02]'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/10'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>

              {/* Campo dinámico de TRM si USD / EUR */}
              {currency !== 'COP' && (
                <div className="mt-2.5 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-500/20 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Tasa oficial de cambio</span>
                    </label>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      1 {currency} = ${Number(exchangeRate || trm || 4050).toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={`TRM: $${Number(exchangeRate || trm || 4050).toLocaleString('es-CO')} COP (Sincronizada automáticamente)`}
                      className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-200/80 dark:border-emerald-500/30 bg-emerald-100/50 dark:bg-white/5 text-emerald-900 dark:text-emerald-200 focus:outline-none cursor-default select-none tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 pt-1 border-t border-emerald-200/40 dark:border-emerald-500/20">
                    <span>Equivalente en balance:</span>
                    <span className="font-bold tabular-nums text-emerald-800 dark:text-emerald-200 text-xs">
                      $ {((parseFormattedAmount(amount) || 0) * (parseFloat(exchangeRate) || 0)).toLocaleString('es-CO', { minimumFractionDigits: enableDecimals ? 2 : 0, maximumFractionDigits: 2 })} COP
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Modo de Ejecución (Auto vs Recordatorio Manual) */}
            <div>
              <label className="block text-[11px] font-bold opacity-60 uppercase tracking-wider mb-1.5">
                Modo de Ejecución *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode('auto')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    mode === 'auto'
                      ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 ring-1 ring-emerald-500 shadow-sm'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Zap className={`w-3.5 h-3.5 ${mode === 'auto' ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-40'}`} />
                      Automático
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      Auto
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    Se anota solo en tu balance al llegar la fecha
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('manual')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    mode === 'manual'
                      ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 ring-1 ring-amber-500 shadow-sm'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Bell className={`w-3.5 h-3.5 ${mode === 'manual' ? 'text-amber-500' : 'opacity-40'}`} />
                      Por Confirmar
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      Manual
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    Te avisa para que revises y apruebes el registro
                  </p>
                </button>
              </div>
            </div>

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
              availableSubcategories={availableSubcategories}
              onAddCategory={handleAddNewCategory}
              onAddSubcategory={handleAddNewSubcategory}
              accountId={accountId}
              setAccountId={setAccountId}
              accounts={accounts}
            />

            {/* 8. Nota Opcional */}
            <div>
              <label className="block text-[11px] font-semibold opacity-60 mb-1">
                Nota / Observación (Opcional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Detalle o referencia del pago..."
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs border border-slate-200/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white"
              />
            </div>

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
              {activeEditing ? 'Guardar Cambios' : 'Crear Pago Recurrente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
