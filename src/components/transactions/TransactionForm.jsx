import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import TransactionTypeSelector from './TransactionTypeSelector';
import TransactionAccountCategoryFields from './TransactionAccountCategoryFields';
import AccountCombobox from '../accounts/components/AccountCombobox';
import CurrencySelector from './CurrencySelector';
import TransactionDetailsFields from './TransactionDetailsFields';
import TransactionFormModalLayout from './TransactionFormModalLayout';
import { SubmitBtn, SuccessAlert } from './TransactionFeedback';
import { useBackHandler } from '../../hooks/useBackHandler';
import { usePrivacy } from '../../context/PrivacyContext';
import AmountInput from '../common/AmountInput';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../utils/currencyFormatter';
import { convertToCOP, convertFromCOP, formatNativeCurrency } from '../../utils/currencyUtils';
import { buildTransactionPayload, saveTransactionRecord } from '../../services/transactions/transactionSubmitService';

const getTodayLocalDate = () => new Date().toISOString().split('T')[0];
const getRate = (curr, trm) => curr === 'USD' ? (Number(trm) || 4050) : curr === 'EUR' ? Math.round((Number(trm) || 4050) * 1.08) : 1;

export default function TransactionForm({
  accounts: propAccounts, categories: propCategories, onAddTransaction, onTransfer, onAddCategory, onAddSubcategory,
  onUpdateSubcategory, onDeleteSubcategory, onAddAccount, defaultDate, defaultType = 'expense', defaultAmount,
  transactionToEdit, initialData, movement, isModal = false, onClose = null, onSuccess = null, trm = 4050
}) {
  const accounts = Array.isArray(propAccounts) ? propAccounts.filter(Boolean) : [];
  const categories = Array.isArray(propCategories) ? propCategories.filter(Boolean) : [];
  useBackHandler(Boolean(isModal && onClose), onClose);

  const enableDecimals = (usePrivacy()?.enableDecimals) ?? getEnableDecimals();
  const editingMovement = transactionToEdit || initialData || movement, editingId = editingMovement?.id;

  const getInitialForm = (edit) => {
    const type = edit?.type || defaultType || 'expense', accId = edit?.accountId || edit?.fromAccountId || accounts[0]?.id || '';
    const initialAcc = accounts.find((a) => a?.id === accId), curr = edit?.originalCurrency || initialAcc?.currency || 'COP';
    const avail = categories.filter((c) => c && (c.type === type || !c.type)), catId = edit?.categoryId || avail[0]?.id || categories[0]?.id || '';
    const selCat = categories.find((c) => c?.id === catId), subcats = Array.isArray(selCat?.subcategories) ? selCat.subcategories : [];
    return {
      type, currency: curr, exchangeRate: edit?.exchangeRate ? String(edit.exchangeRate) : String(getRate(curr, trm)),
      amount: edit?.amount !== undefined ? formatCurrencyInput(edit.originalAmount ?? edit.amount, enableDecimals) : (defaultAmount !== undefined ? formatCurrencyInput(defaultAmount, enableDecimals) : ''),
      categoryId: catId, subcategoryId: edit?.subcategoryId || subcats[0]?.id || (typeof subcats[0] === 'string' ? subcats[0] : ''),
      accountId: accId, toAccountId: edit?.toAccountId || (accounts.find((a) => a?.id !== accId)?.id || accounts[1]?.id || ''),
      date: edit?.date || defaultDate || getTodayLocalDate(), note: edit?.note || '', receiptImage: edit?.receiptImage || null
    };
  };

  const [form, setForm] = useState(() => getInitialForm(editingMovement));
  const prevEditingIdRef = useRef(editingId);
  useEffect(() => {
    if (editingId && editingId !== prevEditingIdRef.current) {
      prevEditingIdRef.current = editingId;
      setForm(getInitialForm(editingMovement));
    }
  }, [editingId]);

  const [showSuccess, setShowSuccess] = useState(false), [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false), isCurrencyManuallySetRef = useRef(Boolean(editingMovement?.originalCurrency));

  const setF = (k, v) => setForm((p) => (p[k] === v ? p : { ...p, [k]: v }));
  const handleTypeChange = (type) => {
    const firstCat = categories.find((c) => c && (c.type === type || !c.type)), sub = Array.isArray(firstCat?.subcategories) ? firstCat.subcategories[0] : null;
    setForm((p) => ({ ...p, type, categoryId: firstCat?.id || '', subcategoryId: sub?.id || (typeof sub === 'string' ? sub : '') }));
  };
  const handleCategoryChange = (catId) => {
    const sub = Array.isArray(categories.find((c) => c?.id === catId)?.subcategories) ? categories.find((c) => c?.id === catId).subcategories[0] : null;
    setForm((p) => ({ ...p, categoryId: catId, subcategoryId: sub?.id || (typeof sub === 'string' ? sub : '') }));
  };
  const handleAccountChange = (accId) => {
    const acc = accounts.find((a) => a?.id === accId);
    setForm((p) => ({ ...p, accountId: accId, toAccountId: (p.type === 'transfer' && accId === p.toAccountId) ? (accounts.find((a) => a?.id !== accId)?.id || '') : p.toAccountId, currency: (!isCurrencyManuallySetRef.current && acc?.currency) || p.currency, exchangeRate: (!isCurrencyManuallySetRef.current && acc?.currency && acc.currency !== p.currency) ? String(getRate(acc.currency, trm)) : p.exchangeRate }));
  };

  const availableCategories = categories.filter((c) => c && (c.type === form.type || !c.type));
  const selectedCategory = categories.find((c) => c && c.id === form.categoryId) || availableCategories[0] || null;
  const availableSubcategories = (Array.isArray(selectedCategory?.subcategories) ? selectedCategory.subcategories : []).filter(Boolean);
  const fromAcc = accounts.find((a) => a?.id === form.accountId) || accounts[0] || null, toAcc = accounts.find((a) => a?.id === form.toAccountId) || accounts.find((a) => a?.id !== form.accountId) || null;
  const numAmount = parseFormattedAmount(form.amount);
  const destAmount = (fromAcc?.currency && toAcc?.currency && fromAcc.currency !== toAcc.currency && numAmount > 0) ? convertFromCOP(convertToCOP(numAmount, fromAcc.currency, trm), toAcc.currency, trm) : numAmount;

  const handlePostSubmit = (resultTx) => {
    setForm((p) => ({ ...p, amount: '', note: '', receiptImage: null, date: getTodayLocalDate() }));
    onClose ? onClose() : (setShowSuccess(true), setTimeout(() => setShowSuccess(false), 1500));
    onSuccess?.(resultTx);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (submittingRef.current || isSubmitting || isNaN(numAmount) || numAmount <= 0) return;
    submittingRef.current = true; setIsSubmitting(true);
    try {
      if (form.type === 'transfer') {
        if (!fromAcc || !toAcc || fromAcc.id === toAcc.id) return;
        const fromCur = fromAcc?.currency || form.currency || 'COP', toCur = toAcc?.currency || 'COP';
        if (typeof onTransfer === 'function') {
          await onTransfer({ fromAcc, toAcc, amount: numAmount, destAmount, fromCurrency: fromCur, toCurrency: toCur, date: form.date, note: form.note.trim() });
        } else {
          const rate = getRate(fromCur, trm), inRate = getRate(toCur, trm), copAmt = fromCur === 'COP' ? numAmount : Math.round(numAmount * rate), mkId = (p) => (crypto?.randomUUID ? crypto.randomUUID() : `tx-${p}-${Date.now()}`);
          const baseTx = { date: form.date || getTodayLocalDate(), categoryId: 'cat-transfer', categoryName: 'Transferencias', fromAccountId: fromAcc.id, toAccountId: toAcc.id, isTransfer: true, updated_at: new Date().toISOString() };
          const outTx = { ...baseTx, id: mkId('out'), type: 'expense', amount: copAmt, originalAmount: numAmount, originalCurrency: fromCur, exchangeRate: rate, subcategoryId: 'sub-transfer-out', subcategoryName: 'Transferencia Enviada', accountId: fromAcc.id, accountName: fromAcc.name, note: `Transferencia a ${toAcc.name}`, notes: `Transferencia a ${toAcc.name}` };
          const inTx = { ...baseTx, id: mkId('in'), type: 'income', amount: copAmt, originalAmount: destAmount, originalCurrency: toCur, exchangeRate: inRate, subcategoryId: 'sub-transfer-in', subcategoryName: 'Transferencia Recibida', accountId: toAcc.id, accountName: toAcc.name, note: `Transferencia desde ${fromAcc.name}`, notes: `Transferencia desde ${fromAcc.name}` };
          if (typeof onAddTransaction === 'function') { await onAddTransaction(outTx); await onAddTransaction(inTx); }
          saveTransactionRecord({ txPayload: outTx, account: fromAcc, isEditing: false }).catch(() => {});
          saveTransactionRecord({ txPayload: inTx, account: toAcc, isEditing: false }).catch(() => {});
        }
        handlePostSubmit(); return;
      }
      const { newTx, selectedAccount } = buildTransactionPayload({ numAmount, currency: form.currency, exchangeRate: form.exchangeRate, enableDecimals, type: form.type, date: form.date, note: form.note, receiptImage: form.receiptImage, categoryId: form.categoryId, subcategoryId: form.subcategoryId, accountId: form.accountId, categories, accounts, editingMovement });
      if (typeof onAddTransaction === 'function') await onAddTransaction(newTx);
      setForm((p) => ({ ...p, currency: 'COP', exchangeRate: String(trm || 4050) }));
      isCurrencyManuallySetRef.current = false;
      handlePostSubmit(newTx);
      saveTransactionRecord({ txPayload: newTx, account: selectedAccount, isEditing: Boolean(editingMovement?.id) }).catch(() => {});
    } finally { setIsSubmitting(false); submittingRef.current = false; }
  };

  const formFields = (
    <>
      <TransactionTypeSelector type={form.type} setType={handleTypeChange} />
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Monto ({form.currency === 'COP' ? '$ COP' : form.currency}) *</label>
        <AmountInput value={form.amount} onChange={(v) => setF('amount', v)} enableDecimals={enableDecimals} required onFocus={(e) => e.target.select()} prefix={<span className="opacity-40 font-black text-lg text-slate-900 dark:text-zinc-100">{form.currency === 'EUR' ? '€' : '$'}</span>} className="w-full pl-8 pr-3.5 h-12 text-2xl font-bold font-mono tracking-tight bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60" />
        <CurrencySelector currency={form.currency} exchangeRate={form.exchangeRate} setExchangeRate={(v) => setF('exchangeRate', v)} trm={trm} amount={form.amount} enableDecimals={enableDecimals} onCurrencyChange={(c, r) => { isCurrencyManuallySetRef.current = true; setForm((p) => ({ ...p, currency: c, exchangeRate: r || String(getRate(c, trm)) })); }} />
      </div>

      {form.type === 'transfer' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div><label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">Cuenta origen *</label><AccountCombobox accounts={accounts} selectedAccountId={form.accountId} onSelectAccount={handleAccountChange} onAddAccount={onAddAccount} /></div>
            <div>
              <div className="flex items-center justify-between mb-1.5"><label className="block text-xs font-medium text-slate-600 dark:text-zinc-400">Cuenta destino *</label>{accounts.length > 1 && <button type="button" onClick={() => setForm((p) => ({ ...p, accountId: p.toAccountId, toAccountId: p.accountId }))} className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"><ArrowLeftRight className="w-3 h-3" /><span>Invertir</span></button>}</div>
              <AccountCombobox accounts={accounts.filter((a) => a?.id !== form.accountId)} selectedAccountId={form.toAccountId} onSelectAccount={(id) => setF('toAccountId', id)} onAddAccount={onAddAccount} />
            </div>
          </div>
          {fromAcc?.currency && toAcc?.currency && fromAcc.currency !== toAcc.currency && numAmount > 0 && (
            <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between"><span>Monto a recibir estimado:</span><span className="font-bold font-mono">~{formatNativeCurrency(destAmount, toAcc.currency)}</span></div>
          )}
        </div>
      ) : (
        <TransactionAccountCategoryFields
          type={form.type} accountId={form.accountId} setAccountId={handleAccountChange} accounts={accounts} onAddAccount={onAddAccount}
          categoryId={form.categoryId} setCategoryId={handleCategoryChange} categories={categories} availableCategories={availableCategories}
          onAddCategory={onAddCategory} subcategoryId={form.subcategoryId} setSubcategoryId={(v) => setF('subcategoryId', v)}
          availableSubcategories={availableSubcategories} onAddSubcategory={onAddSubcategory} onUpdateSubcategory={onUpdateSubcategory} onDeleteSubcategory={onDeleteSubcategory}
        />
      )}
      <TransactionDetailsFields date={form.date} setDate={(v) => setF('date', v)} note={form.note} setNote={(v) => setF('note', v)} receiptImage={form.receiptImage} setReceiptImage={(v) => setF('receiptImage', v)} />
    </>
  );

  return isModal ? (
    <TransactionFormModalLayout isModal={isModal} isSubmitting={isSubmitting} showSuccess={showSuccess} editingMovement={editingMovement} onSubmit={handleSubmit} handleSubmit={handleSubmit} onClose={onClose} type={form.type}>{formFields}</TransactionFormModalLayout>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">{formFields}<SuccessAlert show={showSuccess} /><div className="flex justify-end pt-2"><SubmitBtn type={form.type} isSubmitting={isSubmitting} /></div></form>
  );
}
