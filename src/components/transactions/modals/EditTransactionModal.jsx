import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import TransactionTypeSelector from '../TransactionTypeSelector';
import TransactionAccountCategoryFields from '../TransactionAccountCategoryFields';
import EditTransferAccountFields from './parts/EditTransferAccountFields';
import EditTransactionReceipt from './parts/EditTransactionReceipt';
import { usePrivacy } from '../../../context/PrivacyContext';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { formatCurrencyInput, parseFormattedAmount, getEnableDecimals } from '../../../utils/currencyFormatter';

export default function EditTransactionModal({
  transaction, accounts = [], categories = [], onClose, onSave, onDelete,
  onAddCategory, onAddSubcategory, onUpdateSubcategory, onDeleteSubcategory, onAddAccount, trm = 4000
}) {
  const { enableDecimals: privacyEnableDecimals } = usePrivacy();
  const enableDecimals = privacyEnableDecimals ?? getEnableDecimals();
  const [form, setForm] = useState({ type: 'expense', amount: '', originalCurrency: 'COP', exchangeRate: '4000', categoryId: '', subcategoryId: '', accountId: '', destinationAccountId: '', date: '', note: '' });
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

    setForm({
      type: isTxTransfer ? 'transfer' : (transaction.type || 'expense'), originalCurrency: curr,
      amount: origAmt != null ? formatCurrencyInput(origAmt, enableDecimals) : '',
      exchangeRate: transaction.exchangeRate != null ? String(transaction.exchangeRate) : (curr === 'EUR' ? '4400' : String(trm || 4000)),
      categoryId: isTxTransfer ? 'cat-transfer' : (transaction.categoryId || ''), subcategoryId: isTxTransfer ? '' : (transaction.subcategoryId || ''),
      accountId: accId, destinationAccountId: destId, date: transaction.date || '', note: transaction.note || transaction.notes || ''
    });
    setReceiptImage(transaction.receiptImage || null);
  }, [txId, enableDecimals, trm]);

  useBackHandler(Boolean(transaction), onClose);
  if (!transaction) return null;

  const isTransfer = form.type === 'transfer';
  const isInvalidTransfer = isTransfer && (!form.accountId || !form.destinationAccountId || form.accountId === form.destinationAccountId);

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
    if (isInvalidTransfer) return;
    const numAmount = parseFormattedAmount(form.amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const rateNum = form.originalCurrency === 'COP' ? 1 : (parseFloat(form.exchangeRate) || 1);
    const calculated = form.originalCurrency === 'COP' ? numAmount : (numAmount * rateNum);
    const finalAmount = enableDecimals ? Number(calculated.toFixed(2)) : Math.round(calculated);
    const selectedCat = categories.find((c) => c.id === form.categoryId);
    const selectedSub = selectedCat?.subcategories?.find((s) => s.id === form.subcategoryId);
    const selectedAcc = accounts.find((a) => a.id === form.accountId);
    const destAcc = accounts.find((a) => a.id === form.destinationAccountId);

    onSave?.({
      ...transaction, type: form.type, amount: finalAmount, originalCurrency: form.originalCurrency,
      originalAmount: numAmount, exchangeRate: form.originalCurrency === 'COP' ? 1 : rateNum,
      categoryId: isTransfer ? 'cat-transfer' : form.categoryId, categoryName: isTransfer ? 'Transferencias' : (selectedCat?.name || transaction.categoryName),
      category: isTransfer ? 'Transferencias' : (selectedCat?.name || transaction.category || 'General'),
      subcategoryId: isTransfer ? 'sub-transfer-out' : (selectedSub?.id || null),
      subcategoryName: isTransfer ? 'Transferencia Enviada' : (selectedSub?.name || null),
      accountId: form.accountId, account_id: form.accountId, accountName: selectedAcc?.name || transaction.accountName,
      fromAccountId: isTransfer ? form.accountId : null, fromAccountName: isTransfer ? (selectedAcc?.name || '') : null,
      destination_account_id: isTransfer ? form.destinationAccountId : null, destinationAccountId: isTransfer ? form.destinationAccountId : null,
      toAccountId: isTransfer ? form.destinationAccountId : null, toAccountName: isTransfer ? (destAcc?.name || '') : null,
      isTransfer, is_transfer: isTransfer, date: form.date, note: form.note.trim(), receiptImage: receiptImage || null
    });
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 px-6 py-4 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
          <div><h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Editar transacción</h3><p className="text-xs text-slate-500 dark:text-zinc-400">Modifica los detalles y recalcula balances</p></div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
            <TransactionTypeSelector type={form.type} setType={handleTypeChange} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Monto ({form.originalCurrency === 'COP' ? '$ COP' : form.originalCurrency}) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 font-black text-lg text-slate-900 dark:text-zinc-100">{form.originalCurrency === 'EUR' ? '€' : '$'}</span>
                  <input type="text" inputMode="decimal" placeholder="0" required value={form.amount} onFocus={(e) => e.target.select()} onChange={(e) => setF('amount', formatCurrencyInput(e.target.value, enableDecimals))} className="w-full pl-8 pr-3.5 h-12 text-2xl font-bold font-mono tracking-tight bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 tabular-nums" />
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {[{ code: 'COP', label: 'COP' }, { code: 'USD', label: 'USD $' }, { code: 'EUR', label: 'EUR €' }].map((c) => (
                    <button key={c.code} type="button" onClick={() => setForm((p) => ({ ...p, originalCurrency: c.code, exchangeRate: c.code === 'USD' ? String(trm || 4000) : c.code === 'EUR' ? '4400' : '1' }))} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${form.originalCurrency === c.code ? 'bg-emerald-500 text-white shadow-sm font-bold scale-[1.02]' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}>{c.label}</button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2 space-y-3">
                {isTransfer ? (
                  <EditTransferAccountFields accountId={form.accountId} setAccountId={(v) => setF('accountId', v)} destinationAccountId={form.destinationAccountId} setDestinationAccountId={(v) => setF('destinationAccountId', v)} accounts={accounts} onAddAccount={onAddAccount} date={form.date} setDate={(v) => setF('date', v)} />
                ) : (
                  <TransactionAccountCategoryFields accountId={form.accountId} setAccountId={(v) => setF('accountId', v)} accounts={accounts} categoryId={form.categoryId} setCategoryId={(v) => setF('categoryId', v)} categories={categories} subcategoryId={form.subcategoryId} setSubcategoryId={(v) => setF('subcategoryId', v)} date={form.date} setDate={(v) => setF('date', v)} type={form.type} onAddCategory={onAddCategory} onAddSubcategory={onAddSubcategory} onUpdateSubcategory={onUpdateSubcategory} onDeleteSubcategory={onDeleteSubcategory} onAddAccount={onAddAccount} />
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">Nota / Descripción</label>
                <input type="text" value={form.note} onChange={(e) => setF('note', e.target.value)} placeholder="Descripción del movimiento..." className="w-full h-11 px-3.5 text-sm bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60" />
              </div>
              <EditTransactionReceipt receiptImage={receiptImage} setReceiptImage={setReceiptImage} />
            </div>
          </div>
          <div className="shrink-0 px-6 py-4 bg-slate-50/50 dark:bg-zinc-900/90 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-3">
            <button type="button" onClick={() => { if (window.confirm('¿Eliminar este movimiento?')) { onDelete?.(transaction.id); onClose?.(); } }} className="h-11 px-3.5 text-sm font-medium text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center gap-1.5 cursor-pointer"><Trash2 className="w-4 h-4" /><span>Eliminar</span></button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="h-11 px-4 rounded-lg font-medium text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-200/60 cursor-pointer">Cancelar</button>
              <button type="submit" disabled={isInvalidTransfer} className={`h-11 px-5 rounded-lg font-medium text-sm shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 text-white cursor-pointer transition-colors ${isInvalidTransfer ? 'opacity-50 cursor-not-allowed bg-zinc-600' : isTransfer ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>Guardar cambios</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
