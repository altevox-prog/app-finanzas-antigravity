import React, { useState, useEffect, useRef } from 'react';
import TransactionTypeSelector from './TransactionTypeSelector';
import TransactionAccountCategoryFields from './TransactionAccountCategoryFields';
import CurrencySelector from './CurrencySelector';
import TransactionDetailsFields from './TransactionDetailsFields';
import TransactionFormModalLayout from './TransactionFormModalLayout';
import { SubmitBtn, SuccessAlert } from './TransactionFeedback';
import { useBackHandler } from '../../hooks/useBackHandler';
import { usePrivacy } from '../../context/PrivacyContext';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../utils/currencyFormatter';
import { buildTransactionPayload, saveTransactionRecord } from '../../services/transactions/transactionSubmitService';

export default function TransactionForm({
  accounts: propAccounts, categories: propCategories, onAddTransaction, onAddCategory,
  onAddSubcategory, onUpdateSubcategory, onDeleteSubcategory, onAddAccount,
  defaultDate, defaultType = 'expense', defaultAmount, transactionToEdit,
  initialData, movement, isModal = false, onClose = null, onSuccess = null, trm = 4000
}) {
  const accounts = Array.isArray(propAccounts) ? propAccounts.filter(Boolean) : [];
  const categories = Array.isArray(propCategories) ? propCategories.filter(Boolean) : [];
  useBackHandler(Boolean(isModal && onClose), onClose);

  const { enableDecimals: privacyDecimals } = usePrivacy();
  const enableDecimals = privacyDecimals ?? getEnableDecimals();
  const editingMovement = transactionToEdit || initialData || movement;

  const [type, setType] = useState(editingMovement?.type || defaultType || 'expense');
  const [currency, setCurrency] = useState(editingMovement?.originalCurrency || 'COP');
  const [exchangeRate, setExchangeRate] = useState(editingMovement?.exchangeRate ? String(editingMovement.exchangeRate) : String(trm || 4050));
  const [amount, setAmount] = useState(() => {
    const init = editingMovement?.amount !== undefined ? (editingMovement.originalAmount ?? editingMovement.amount) : defaultAmount;
    return init !== undefined ? formatCurrencyInput(init, enableDecimals) : '';
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

  useEffect(() => {
    if (defaultType && !editingMovement) setType(defaultType);
  }, [defaultType, editingMovement]);

  useEffect(() => {
    if (!editingMovement) return;
    if (editingMovement.type) setType(editingMovement.type);
    if (editingMovement.amount !== undefined) setAmount(formatCurrencyInput(editingMovement.originalAmount ?? editingMovement.amount, enableDecimals));
    if (editingMovement.originalCurrency) setCurrency(editingMovement.originalCurrency);
    if (editingMovement.exchangeRate) setExchangeRate(String(editingMovement.exchangeRate));
    if (editingMovement.date) setDate(editingMovement.date);
    if (editingMovement.categoryId) setCategoryId(editingMovement.categoryId);
    if (editingMovement.subcategoryId) setSubcategoryId(editingMovement.subcategoryId);
    if (editingMovement.accountId) setAccountId(editingMovement.accountId);
    if (editingMovement.note) setNote(editingMovement.note);
    if (editingMovement.receiptImage) setReceiptImage(editingMovement.receiptImage);
  }, [editingMovement, enableDecimals]);

  useEffect(() => {
    const acc = accounts.find(a => a?.id === accountId);
    if (acc?.currency) setCurrency(acc.currency);
  }, [accountId, accounts]);

  useEffect(() => {
    if (currency === 'USD') setExchangeRate(String(trm || 4050));
    else if (currency === 'EUR') setExchangeRate(String(Math.round((Number(trm) || 4050) * 1.08)));
    else setExchangeRate('1');
  }, [currency, trm]);

  const availableCategories = categories.filter(c => c && (c.type === type || !c.type));
  const selectedCategory = categories.find(c => c && c.id === categoryId) || availableCategories[0] || null;
  const availableSubcategories = (Array.isArray(selectedCategory?.subcategories) ? selectedCategory.subcategories : []).filter(Boolean);

  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.some(c => c?.id === categoryId)) {
      setCategoryId(availableCategories[0]?.id || '');
    }
  }, [type, availableCategories, categoryId]);

  useEffect(() => {
    setSubcategoryId(availableSubcategories.some(s => s?.id === subcategoryId) ? subcategoryId : (availableSubcategories[0]?.id || ''));
  }, [categoryId, availableSubcategories, subcategoryId]);

  useEffect(() => {
    if (accounts.length > 0 && !accounts.some(a => a?.id === accountId)) setAccountId(accounts[0]?.id || '');
  }, [accounts, accountId]);

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();
    if (submittingRef.current || isSubmitting) return;

    const numAmount = parseFormattedAmount(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const { newTx, selectedAccount } = buildTransactionPayload({
        numAmount, currency, exchangeRate, enableDecimals, type, date, note, receiptImage,
        categoryId, subcategoryId, accountId, categories, accounts, editingMovement
      });

      // 1. Guardado inmediato en estado local y LocalStorage (Local-First)
      if (typeof onAddTransaction === 'function') onAddTransaction(newTx);
      if (typeof onSuccess === 'function') onSuccess(newTx);

      // 2. Limpieza de campos y cierre inmediato del modal
      setAmount('');
      setCurrency('COP');
      setExchangeRate(String(trm || 4000));
      setNote('');
      setReceiptImage(null);

      if (typeof onClose === 'function') {
        onClose();
      } else {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1500);
      }

      // 3. Sincronización remota en segundo plano (no bloqueante)
      saveTransactionRecord({ txPayload: newTx, account: selectedAccount, isEditing: Boolean(editingMovement) })
        .catch(err => {
          console.warn('[Offline/Sync] No se pudo sincronizar de inmediato con Supabase. Queda guardado localmente:', err);
        });
    } catch (err) {
      console.error('Error al procesar la transacción:', err);
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const formFields = (
    <>
      <TransactionTypeSelector type={type} setType={setType} />
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
          Monto ({currency === 'COP' ? '$ COP' : currency}) *
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 font-black text-lg text-slate-900 dark:text-zinc-100">
            {currency === 'EUR' ? '€' : '$'}
          </span>
          <input
            type="text" inputMode="decimal" required placeholder="0" value={amount}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setAmount(formatCurrencyInput(e.target.value, enableDecimals))}
            className="w-full pl-8 pr-3.5 h-12 text-2xl font-bold font-mono tracking-tight bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all tabular-nums"
          />
        </div>
        <CurrencySelector
          currency={currency} exchangeRate={exchangeRate} setExchangeRate={setExchangeRate}
          trm={trm} amount={amount} enableDecimals={enableDecimals}
          onCurrencyChange={(c, r) => { setCurrency(c); if (r) setExchangeRate(r); }}
        />
      </div>
      <TransactionAccountCategoryFields
        type={type} accountId={accountId} setAccountId={setAccountId} accounts={accounts} onAddAccount={onAddAccount}
        categoryId={categoryId} setCategoryId={setCategoryId} categories={categories} availableCategories={availableCategories}
        onAddCategory={onAddCategory} subcategoryId={subcategoryId} setSubcategoryId={setSubcategoryId}
        availableSubcategories={availableSubcategories} onAddSubcategory={onAddSubcategory}
        onUpdateSubcategory={onUpdateSubcategory} onDeleteSubcategory={onDeleteSubcategory}
      />
      <TransactionDetailsFields
        date={date} setDate={setDate} note={note} setNote={setNote}
        receiptImage={receiptImage} setReceiptImage={setReceiptImage}
      />
    </>
  );

  if (isModal) {
    return (
      <TransactionFormModalLayout
        onClose={onClose} onSubmit={handleSubmit} isSubmitting={isSubmitting}
        showSuccess={showSuccess} type={type}
      >
        {formFields}
      </TransactionFormModalLayout>
    );
  }

  return (
    <div className="ios-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-1.5"><span>Registro Rápido</span></h2>
          <p className="text-[11px] opacity-60">Ingresa transacciones detalladas</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {formFields}
        <div className="pt-2"><SubmitBtn type={type} isSubmitting={isSubmitting} fullWidth /></div>
        <SuccessAlert show={showSuccess} />
      </form>
    </div>
  );
}
