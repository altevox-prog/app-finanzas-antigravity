import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import TransactionTypeSelector from '../TransactionTypeSelector';
import TransactionAccountCategoryFields from '../TransactionAccountCategoryFields';
import EditTransferAccountFields from './parts/EditTransferAccountFields';
import EditTransactionReceipt from './parts/EditTransactionReceipt';
import EditTransactionAmountSection from './parts/EditTransactionAmountSection';
import EditTransactionModalFooter from './parts/EditTransactionModalFooter';
import { usePrivacy } from '../../../context/PrivacyContext';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../../utils/currencyFormatter';

export default function EditTransactionModal({
  transaction, accounts = [], categories = [], onClose, onSave, onDelete,
  onAddCategory, onAddSubcategory, onUpdateSubcategory, onDeleteSubcategory, onAddAccount, trm = 4000
}) {
  const { enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals();
  const [form, setForm] = useState({
    type: 'expense', amount: '', destinationAmount: '', originalCurrency: 'COP', exchangeRate: '4000',
    categoryId: '', subcategoryId: '', accountId: '', destinationAccountId: '', date: '', note: ''
  });
  const [receiptImage, setReceiptImage] = useState(null);
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const txId = transaction?.id;

  useEffect(() => {
    if (!transaction) return;
    const isTxTransfer = transaction.type === 'transfer' || Boolean(transaction.isTransfer || transaction.is_transfer || transaction.destination_account_id || transaction.toAccountId);
    const curr = transaction.originalCurrency || 'COP';
    const origAmt = (curr !== 'COP' && transaction.originalAmount != null) ? transaction.originalAmount : transaction.amount;
    const accId = transaction.accountId || transaction.account_id || accounts[0]?.id || '';
    const destId = transaction.destination_account_id || transaction.destinationAccountId || transaction.toAccountId || (isTxTransfer ? (accounts.find((a) => a?.id !== accId)?.id || '') : '');
    const fCurr = accounts.find((a) => a?.id === accId)?.currency || curr || 'COP', tCurr = accounts.find((a) => a?.id === destId)?.currency || 'COP';

    let destAmt = transaction.destinationAmount ?? transaction.destination_amount ?? '';
    if (!destAmt && isTxTransfer && fCurr !== tCurr && origAmt) {
      const r = Number(trm) || 4000;
      if (fCurr === 'USD' && tCurr === 'COP') destAmt = Math.round(origAmt * r);
      else if (fCurr === 'COP' && tCurr === 'USD') destAmt = Number((origAmt / r).toFixed(2));
      else if (fCurr === 'EUR' && tCurr === 'COP') destAmt = Math.round(origAmt * Math.round(r * 1.08));
      else if (fCurr === 'COP' && tCurr === 'EUR') destAmt = Number((origAmt / Math.round(r * 1.08)).toFixed(2));
    }

    setForm({
      type: isTxTransfer ? 'transfer' : (transaction.type || 'expense'), originalCurrency: curr,
      amount: origAmt != null ? formatCurrencyInput(origAmt, enableDecimals) : '',
      destinationAmount: destAmt ? formatCurrencyInput(destAmt, enableDecimals) : '',
      exchangeRate: transaction.exchangeRate != null ? String(transaction.exchangeRate) : (curr === 'EUR' ? '4400' : String(trm || 4000)),
      categoryId: isTxTransfer ? 'cat-transfer' : (transaction.categoryId || ''), subcategoryId: isTxTransfer ? '' : (transaction.subcategoryId || ''),
      accountId: accId, destinationAccountId: destId, date: transaction.date || '', note: transaction.note || transaction.notes || ''
    });
    setReceiptImage(transaction.receiptImage || null);
  }, [txId, enableDecimals, trm]);

  useBackHandler(Boolean(transaction), onClose);
  if (!transaction) return null;

  const isTransfer = form.type === 'transfer';
  const fromAcc = accounts.find((a) => a.id === form.accountId), toAcc = accounts.find((a) => a.id === form.destinationAccountId);
  const fromCurr = fromAcc?.currency || (isTransfer ? 'COP' : form.originalCurrency), toCurr = toAcc?.currency || 'COP';
  const isCrossCurrency = isTransfer && fromCurr !== toCurr;
  const numAmount = parseFormattedAmount(form.amount), destAmountNum = isCrossCurrency ? parseFormattedAmount(form.destinationAmount) : numAmount;
  const isInvalidTransfer = isTransfer && (!form.accountId || !form.destinationAccountId || form.accountId === form.destinationAccountId || (isCrossCurrency && (isNaN(destAmountNum) || destAmountNum <= 0)));

  const handleTypeChange = (newType) => {
    setForm((p) => {
      let destAcc = p.destinationAccountId, catId = p.categoryId;
      if (newType === 'transfer') {
        catId = 'cat-transfer';
        if (!destAcc || destAcc === p.accountId) destAcc = accounts.find((a) => a?.id !== p.accountId)?.id || '';
      } else {
        const cats = categories.filter((c) => c.type === newType);
        if (cats.length > 0) catId = cats[0].id;
        destAcc = '';
      }
      return { ...p, type: newType, categoryId: catId, destinationAccountId: destAcc };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isInvalidTransfer || isNaN(numAmount) || numAmount <= 0) return;

    const rateNum = isCrossCurrency ? (fromCurr === 'COP' && toCurr === 'USD' ? (numAmount / destAmountNum) : (destAmountNum / numAmount)) : (form.originalCurrency === 'COP' ? 1 : (parseFloat(form.exchangeRate) || 1));
    const calculated = isCrossCurrency ? (fromCurr === 'COP' ? numAmount : (toCurr === 'COP' ? destAmountNum : Math.round(numAmount * rateNum))) : (form.originalCurrency === 'COP' ? numAmount : (numAmount * rateNum));
    const finalAmount = enableDecimals ? Number(calculated.toFixed(2)) : Math.round(calculated);
    const selectedCat = categories.find((c) => c.id === form.categoryId), selectedSub = selectedCat?.subcategories?.find((s) => s.id === form.subcategoryId);

    onSave?.({
      ...transaction, type: form.type, amount: finalAmount, originalCurrency: isTransfer ? fromCurr : form.originalCurrency,
      originalAmount: numAmount, destinationAmount: isCrossCurrency ? destAmountNum : undefined, destination_amount: isCrossCurrency ? destAmountNum : undefined,
      fromCurrency: isTransfer ? fromCurr : undefined, toCurrency: isTransfer ? toCurr : undefined, destinationCurrency: isTransfer ? toCurr : undefined,
      exchangeRate: isTransfer ? rateNum : (form.originalCurrency === 'COP' ? 1 : rateNum),
      categoryId: isTransfer ? 'cat-transfer' : form.categoryId, categoryName: isTransfer ? 'Transferencias' : (selectedCat?.name || transaction.categoryName),
      category: isTransfer ? 'Transferencias' : (selectedCat?.name || transaction.category || 'General'),
      subcategoryId: isTransfer ? 'sub-transfer-out' : (selectedSub?.id || null), subcategoryName: isTransfer ? 'Transferencia Enviada' : (selectedSub?.name || null),
      accountId: form.accountId, account_id: form.accountId, accountName: fromAcc?.name || transaction.accountName,
      fromAccountId: isTransfer ? form.accountId : null, fromAccountName: isTransfer ? (fromAcc?.name || '') : null,
      destination_account_id: isTransfer ? form.destinationAccountId : null, destinationAccountId: isTransfer ? form.destinationAccountId : null,
      toAccountId: isTransfer ? form.destinationAccountId : null, toAccountName: isTransfer ? (toAcc?.name || '') : null,
      isTransfer, is_transfer: isTransfer, date: form.date, note: form.note.trim(), receiptImage: receiptImage || null
    });
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/90 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 px-6 py-4 border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
          <div><h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Editar transacción</h3><p className="text-xs text-slate-500 dark:text-zinc-400">Modifica los detalles y recalcula balances</p></div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
            <TransactionTypeSelector type={form.type} setType={handleTypeChange} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <EditTransactionAmountSection form={form} setForm={setForm} isTransfer={isTransfer} isCrossCurrency={isCrossCurrency} fromCurr={fromCurr} toCurr={toCurr} enableDecimals={enableDecimals} trm={trm} numAmount={numAmount} destAmountNum={destAmountNum} />
              <div className="sm:col-span-2 space-y-3">
                {isTransfer ? (
                  <EditTransferAccountFields accountId={form.accountId} setAccountId={(v) => setF('accountId', v)} destinationAccountId={form.destinationAccountId} setDestinationAccountId={(v) => setF('destinationAccountId', v)} accounts={accounts} onAddAccount={onAddAccount} date={form.date} setDate={(v) => setF('date', v)} />
                ) : (
                  <TransactionAccountCategoryFields accountId={form.accountId} setAccountId={(v) => setF('accountId', v)} accounts={accounts} categoryId={form.categoryId} setCategoryId={(v) => setF('categoryId', v)} categories={categories} subcategoryId={form.subcategoryId} setSubcategoryId={(v) => setF('subcategoryId', v)} date={form.date} setDate={(v) => setF('date', v)} type={form.type} onAddCategory={onAddCategory} onAddSubcategory={onAddSubcategory} onUpdateSubcategory={onUpdateSubcategory} onDeleteSubcategory={onDeleteSubcategory} onAddAccount={onAddAccount} />
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">Nota / Descripción</label>
                <input type="text" value={form.note} onChange={(e) => setF('note', e.target.value)} placeholder="Descripción del movimiento..." className="w-full h-11 px-3.5 text-sm bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800/80 rounded-lg text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60" />
              </div>
              <EditTransactionReceipt receiptImage={receiptImage} setReceiptImage={setReceiptImage} />
            </div>
          </div>
          <EditTransactionModalFooter transactionId={transaction.id} onDelete={onDelete} onClose={onClose} isInvalidTransfer={isInvalidTransfer} isTransfer={isTransfer} />
        </form>
      </div>
    </div>
  );
}
