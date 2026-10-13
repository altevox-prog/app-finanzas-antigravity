import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusCircle, 
  FileText, 
  CheckCircle,
  X
} from 'lucide-react';
import TransactionTypeSelector from './transactions/TransactionTypeSelector';
import TransactionAccountCategoryFields from './transactions/TransactionAccountCategoryFields';
import ReceiptUploader from './transactions/ReceiptUploader';
import CurrencyExchangeFields from './transactions/CurrencyExchangeFields';
import { useBackHandler } from '../hooks/useBackHandler';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../utils/currencyFormatter';
import { supabase, isSupabaseConfigured, getSupabaseUser } from '../services/supabaseClient';
import { toast } from '../utils/toast';

export default function TransactionForm({ 
  accounts: propAccounts, 
  categories: propCategories, 
  onAddTransaction,
  onAddCategory,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  onAddAccount,
  defaultDate,
  defaultType = 'expense',
  defaultAmount,
  transactionToEdit,
  initialData,
  movement,
  isModal = false,
  onClose = null,
  trm = 4000
}) {
  // Blindaje defensivo — nunca llamar .map/.filter/.find sobre undefined ni elementos nulos
  const accounts = Array.isArray(propAccounts) ? propAccounts.filter(Boolean) : [];
  const categories = Array.isArray(propCategories) ? propCategories.filter(Boolean) : [];

  useBackHandler(Boolean(isModal && onClose), onClose);

  const { enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals();

  const editingMovement = transactionToEdit || initialData || movement;

  const [type, setType] = useState(editingMovement?.type || defaultType || 'expense'); // 'income' | 'expense'

  useEffect(() => {
    if (defaultType && !editingMovement) {
      setType(defaultType);
    }
  }, [defaultType, editingMovement]);

  const [currency, setCurrency] = useState(editingMovement?.originalCurrency || 'COP'); // 'COP' | 'USD' | 'EUR'
  const [exchangeRate, setExchangeRate] = useState(editingMovement?.exchangeRate ? String(editingMovement.exchangeRate) : String(trm || 4050));
  const [amount, setAmount] = useState(() => {
    if (editingMovement?.amount !== undefined) {
      return formatCurrencyInput(editingMovement.originalAmount ?? editingMovement.amount, enableDecimals);
    }
    if (defaultAmount) {
      return formatCurrencyInput(defaultAmount, enableDecimals);
    }
    return '';
  });
  const [categoryId, setCategoryId] = useState(editingMovement?.categoryId || categories[0]?.id || '');
  const [subcategoryId, setSubcategoryId] = useState(editingMovement?.subcategoryId || '');
  const [accountId, setAccountId] = useState(editingMovement?.accountId || accounts[0]?.id || '');
  const [date, setDate] = useState(editingMovement?.date || defaultDate || new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState(editingMovement?.note || '');
  const [receiptImage, setReceiptImage] = useState(editingMovement?.receiptImage || null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Sincronizar campos cuando se provee un movimiento a editar
  useEffect(() => {
    if (editingMovement) {
      if (editingMovement.type) setType(editingMovement.type);
      if (editingMovement.amount !== undefined) {
        setAmount(formatCurrencyInput(editingMovement.originalAmount ?? editingMovement.amount, enableDecimals));
      }
      if (editingMovement.originalCurrency) setCurrency(editingMovement.originalCurrency);
      if (editingMovement.exchangeRate) setExchangeRate(String(editingMovement.exchangeRate));
      if (editingMovement.date) setDate(editingMovement.date);
      if (editingMovement.categoryId) setCategoryId(editingMovement.categoryId);
      if (editingMovement.subcategoryId) setSubcategoryId(editingMovement.subcategoryId);
      if (editingMovement.accountId) setAccountId(editingMovement.accountId);
      if (editingMovement.note) setNote(editingMovement.note);
      if (editingMovement.receiptImage) setReceiptImage(editingMovement.receiptImage);
    }
  }, [editingMovement, enableDecimals]);

  // Sincronizar automáticamente la divisa cuando cambia la cuenta seleccionada
  useEffect(() => {
    if (accountId && accounts?.length > 0) {
      const acc = accounts.find(a => a?.id === accountId);
      if (acc && acc.currency) {
        setCurrency(acc.currency);
      }
    }
  }, [accountId, accounts]);

  // Sincronizar automáticamente la tasa cuando cambia la TRM o la moneda (solo lectura / automático)
  useEffect(() => {
    if (currency === 'USD') {
      setExchangeRate(String(trm || 4050));
    } else if (currency === 'EUR') {
      const eurRate = Math.round((Number(trm) || 4050) * 1.08);
      setExchangeRate(String(eurRate));
    } else {
      setExchangeRate('1');
    }
  }, [currency, trm]);

  // Filter categories by selected type (tolerante a categorías sin tipo explícito)
  const availableCategories = categories.filter(c => c && (c.type === type || !c.type));

  // Current selected category object and its subcategories
  const selectedCategory = categories.find(c => c && c.id === categoryId) || availableCategories[0] || null;
  const availableSubcategories = (Array.isArray(selectedCategory?.subcategories) ? selectedCategory.subcategories : []).filter(Boolean);

  // Update default category when type changes
  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.some(c => c && c.id === categoryId)) {
      setCategoryId(availableCategories[0]?.id || '');
    }
  }, [type, availableCategories, categoryId]);

  // Update default subcategory when category changes
  useEffect(() => {
    if (availableSubcategories.length > 0) {
      if (!availableSubcategories.some(s => s && s.id === subcategoryId)) {
        setSubcategoryId(availableSubcategories[0]?.id || '');
      }
    } else {
      setSubcategoryId('');
    }
  }, [categoryId, availableSubcategories, subcategoryId]);

  // Update default account if not selected
  useEffect(() => {
    if (accounts.length > 0 && !accounts.some(a => a && a.id === accountId)) {
      setAccountId(accounts[0]?.id || '');
    }
  }, [accounts, accountId]);

  const handleSubmit = async (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (submittingRef.current || isSubmitting) return;

    const numAmount = parseFormattedAmount(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    submittingRef.current = true;
    setIsSubmitting(true);

    const rateNum = currency === 'COP' ? 1 : (parseFloat(exchangeRate) || 1);
    const calculatedAmount = currency === 'COP' ? numAmount : (numAmount * rateNum);
    const finalAmount = enableDecimals 
      ? Number(calculatedAmount.toFixed(2)) 
      : Math.round(calculatedAmount);

    const cat = categories.find(c => c && c.id === categoryId);
    const subcat = Array.isArray(cat?.subcategories) ? cat.subcategories.find(s => s && s.id === subcategoryId) : null;
    const acc = accounts.find(a => a && a.id === accountId) || accounts[0];
    const selectedAccountId = accountId || acc?.id || '';
    const categoryName = cat ? cat.name : 'General';
    const transactionType = type; // 'expense' | 'income'
    const transactionDate = date ? (date.includes('T') ? date : `${date}T12:00:00.000Z`) : new Date().toISOString();

    const newTxId = editingMovement?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('tx-' + Date.now()));

    const newTx = {
      id: newTxId,
      date,
      type: transactionType,
      amount: finalAmount,
      originalCurrency: currency,
      originalAmount: numAmount,
      exchangeRate: currency === 'COP' ? 1 : rateNum,
      categoryId: categoryId || cat?.id || '',
      categoryName,
      subcategoryId: subcat ? subcat.id : null,
      subcategoryName: subcat ? subcat.name : null,
      accountId: selectedAccountId,
      accountName: acc ? acc.name : 'Principal',
      note: note.trim(),
      receiptImage: receiptImage || null
    };

    // 1. Conexión de red directa con Supabase (Petición HTTP en Network tab)
    if (isSupabaseConfigured && supabase) {
      try {
        const user = await getSupabaseUser();
        if (user && user.id) {
          const insertPayload = {
            id: newTxId,
            user_id: user.id,
            account_id: selectedAccountId,
            amount: finalAmount,
            type: transactionType, // 'expense' | 'income'
            category: categoryName,
            notes: note.trim() || '',
            date: transactionDate
          };

          let { data, error } = await supabase
            .from('transactions')
            .insert([insertPayload]);

          // Si el esquema de Supabase usa la columna 'category_id' en lugar de 'category'
          if (error && error.message && error.message.includes('category')) {
            const fallbackPayload = {
              ...insertPayload,
              category_id: categoryId || null
            };
            delete fallbackPayload.category;
            const res = await supabase.from('transactions').insert([fallbackPayload]);
            data = res.data;
            error = res.error;
          }

          if (error) {
            console.error('Error al guardar transacción en Supabase:', error.message || error);
            toast.error(`Error Supabase: ${error.message || 'No se pudo guardar la transacción'}`);
          } else {
            console.log('Transacción persistida exitosamente en Supabase:', data);
          }

          // Actualizar el saldo de la cuenta exactamente una sola vez en Supabase
          if (selectedAccountId && acc) {
            const currentAccBalance = Number(acc.balance ?? acc.initialBalance ?? 0);
            const newAccountBalance = transactionType === 'expense'
              ? (currentAccBalance - finalAmount)
              : (currentAccBalance + finalAmount);

            const { error: accError } = await supabase
              .from('accounts')
              .update({
                balance: newAccountBalance,
                updated_at: new Date().toISOString()
              })
              .eq('id', selectedAccountId)
              .eq('user_id', user.id);

            if (accError) {
              console.error('Error al actualizar cuenta en Supabase:', accError.message || accError);
            }
          }
        }
      } catch (cloudErr) {
        console.error('Excepción de red al interactuar con Supabase:', cloudErr);
      }
    }

    // 2. Modificación del estado local reactivo
    if (typeof onAddTransaction === 'function') {
      onAddTransaction(newTx);
    }

    setAmount('');
    setCurrency('COP');
    setExchangeRate(String(trm || 4000));
    setNote('');
    setReceiptImage(null);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setIsSubmitting(false);
      submittingRef.current = false;
      if (onClose) onClose();
    }, 700);
  };

  const renderFormFields = () => (
    <>
      {/* Selector Segmentado Animado Tipo iOS/macOS para Gasto / Ingreso */}
      <TransactionTypeSelector type={type} setType={setType} />

      {/* Monto Prominente estilo iOS y Selector de Moneda */}
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
            className="w-full pl-8 pr-3.5 h-12 text-2xl font-bold font-mono tracking-tight bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all tabular-nums"
          />
        </div>

        {/* Selector horizontal compacto con chips: COP, USD, EUR */}
        <div className="flex items-center gap-1.5 mt-2.5">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm font-bold scale-[1.02]'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-700'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Lógica de Conversión y Tasa de Cambio (TRM) Oficial Automática */}
        <CurrencyExchangeFields
          currency={currency}
          exchangeRate={exchangeRate}
          setExchangeRate={setExchangeRate}
          amount={amount}
          enableDecimals={enableDecimals}
          trm={trm}
        />
      </div>

      {/* Categoría, Subcategoría y Cuenta */}
      <TransactionAccountCategoryFields
        type={type}
        accountId={accountId}
        setAccountId={setAccountId}
        accounts={accounts}
        onAddAccount={onAddAccount}
        categoryId={categoryId}
        setCategoryId={setCategoryId}
        categories={categories}
        availableCategories={availableCategories}
        onAddCategory={onAddCategory}
        subcategoryId={subcategoryId}
        setSubcategoryId={setSubcategoryId}
        availableSubcategories={availableSubcategories}
        onAddSubcategory={onAddSubcategory}
        onUpdateSubcategory={onUpdateSubcategory}
        onDeleteSubcategory={onDeleteSubcategory}
      />

      {/* Fecha */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">
          Fecha *
        </label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full h-11 px-3.5 text-sm bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all"
        />
      </div>

      {/* Nota Opcional */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">
          Nota o Detalle Opcional
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="ej: Almuerzo de trabajo, Mercado del mes..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full h-11 pl-9 pr-3.5 text-sm bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all"
          />
          <FileText className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Adjuntar Foto del Recibo / Factura */}
      <ReceiptUploader
        receiptImage={receiptImage}
        setReceiptImage={setReceiptImage}
      />
    </>
  );

  if (isModal) {
    return (
      <div 
        className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-slide-up pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera FIJA */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Nuevo Movimiento</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Ingresa tus finanzas al instante</p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Formulario envolviendo cuerpo y footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Cuerpo con SCROLL interno automático */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
            {renderFormFields()}

            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 rounded-xl shadow-sm"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>¡Movimiento guardado exitosamente!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pie de página FIJO SIEMPRE VISIBLE */}
          <div className="shrink-0 px-6 py-4 bg-slate-50/50 dark:bg-zinc-900/90 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-end gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-4 rounded-lg font-medium text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 sm:flex-initial px-6 h-11 rounded-lg font-medium text-sm transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 text-white cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
              } ${isSubmitting ? 'opacity-70 pointer-events-none' : ''}`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : `Registrar ${type === 'expense' ? 'Gasto' : 'Ingreso'}`}</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="ios-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <span>Registro Rápido</span>
          </h2>
          <p className="text-[11px] opacity-60">Ingresa transacciones detalladas</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {renderFormFields()}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full h-11 rounded-lg font-medium text-sm transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 text-white cursor-pointer ${
              type === 'expense'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
            } ${isSubmitting ? 'opacity-70 pointer-events-none' : ''}`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isSubmitting ? 'Guardando...' : `Registrar ${type === 'expense' ? 'Gasto' : 'Ingreso'}`}</span>
          </button>
        </div>
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-center justify-center gap-2 text-xs font-bold text-[#34C759] bg-emerald-500/15 border border-[#34C759]/30 px-3 py-2.5 rounded-xl shadow-sm"
            >
              <CheckCircle className="w-4 h-4 text-[#34C759]" />
              <span>¡Movimiento guardado exitosamente!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
