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

export default function TransactionForm({
  accounts: propAccounts, 
  categories: propCategories, 
  onAddTransaction, 
  onTransfer,
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
  onSuccess = null, 
  trm = 4050
}) {
  const accounts = Array.isArray(propAccounts) ? propAccounts.filter(Boolean) : [];
  const categories = Array.isArray(propCategories) ? propCategories.filter(Boolean) : [];
  useBackHandler(Boolean(isModal && onClose), onClose);

  const { enableDecimals: privacyDecimals } = usePrivacy();
  const enableDecimals = privacyDecimals ?? getEnableDecimals();
  const editingMovement = transactionToEdit || initialData || movement;
  const [currentEditing, setCurrentEditing] = useState(editingMovement);

  useEffect(() => {
    setCurrentEditing(transactionToEdit || initialData || movement || null);
  }, [transactionToEdit, initialData, movement]);

  const [type, setType] = useState(currentEditing?.type || defaultType || 'expense');
  const [currency, setCurrency] = useState(currentEditing?.originalCurrency || 'COP');
  const [exchangeRate, setExchangeRate] = useState(currentEditing?.exchangeRate ? String(currentEditing.exchangeRate) : String(trm || 4050));
  const [amount, setAmount] = useState(() => {
    const init = currentEditing?.amount !== undefined ? (currentEditing.originalAmount ?? currentEditing.amount) : defaultAmount;
    return init !== undefined ? formatCurrencyInput(init, enableDecimals) : '';
  });
  const [categoryId, setCategoryId] = useState(currentEditing?.categoryId || categories[0]?.id || '');
  const [subcategoryId, setSubcategoryId] = useState(currentEditing?.subcategoryId || '');
  const [accountId, setAccountId] = useState(currentEditing?.accountId || currentEditing?.fromAccountId || accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(() => {
    if (currentEditing?.toAccountId) return currentEditing.toAccountId;
    const initialFrom = currentEditing?.accountId || accounts[0]?.id;
    const other = accounts.find(a => a?.id !== initialFrom);
    return other ? other.id : (accounts[1]?.id || accounts[0]?.id || '');
  });
  const getTodayLocalDate = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [date, setDate] = useState(() => {
    if (currentEditing?.date) return currentEditing.date;
    if (defaultDate) return defaultDate;
    return getTodayLocalDate();
  });
  const [note, setNote] = useState(currentEditing?.note || '');
  const [receiptImage, setReceiptImage] = useState(currentEditing?.receiptImage || null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const isCurrencyManuallySetRef = useRef(Boolean(currentEditing?.originalCurrency));
  const prevAccountIdRef = useRef(accountId);

  const handleCurrencyChange = (newCurrency, newRate) => {
    isCurrencyManuallySetRef.current = true;
    setCurrency(newCurrency);
    if (newRate) {
      setExchangeRate(newRate);
    } else {
      if (newCurrency === 'USD') setExchangeRate(String(trm || 4050));
      else if (newCurrency === 'EUR') setExchangeRate(String(Math.round((Number(trm) || 4050) * 1.08)));
      else setExchangeRate('1');
    }
  };

  useEffect(() => {
    if (defaultType && !currentEditing) setType(defaultType);
  }, [defaultType, currentEditing]);

  useEffect(() => {
    if (!currentEditing) return;
    if (currentEditing.type) setType(currentEditing.type);
    if (currentEditing.amount !== undefined) setAmount(formatCurrencyInput(currentEditing.originalAmount ?? currentEditing.amount, enableDecimals));
    if (currentEditing.originalCurrency) setCurrency(currentEditing.originalCurrency);
    if (currentEditing.exchangeRate) setExchangeRate(String(currentEditing.exchangeRate));
    if (currentEditing.date) setDate(currentEditing.date);
    if (currentEditing.categoryId) setCategoryId(currentEditing.categoryId);
    if (currentEditing.subcategoryId) setSubcategoryId(currentEditing.subcategoryId);
    if (currentEditing.accountId) setAccountId(currentEditing.accountId);
    if (currentEditing.fromAccountId) setAccountId(currentEditing.fromAccountId);
    if (currentEditing.toAccountId) setToAccountId(currentEditing.toAccountId);
    if (currentEditing.note) setNote(currentEditing.note);
    if (currentEditing.receiptImage) setReceiptImage(currentEditing.receiptImage);
  }, [currentEditing, enableDecimals]);

  useEffect(() => {
    if (prevAccountIdRef.current !== accountId) {
      prevAccountIdRef.current = accountId;
      if (!isCurrencyManuallySetRef.current) {
        const acc = accounts.find(a => a?.id === accountId);
        if (acc?.currency) setCurrency(acc.currency);
      }
    }
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
    if (type !== 'transfer' && availableCategories.length > 0 && !availableCategories.some(c => c?.id === categoryId)) {
      setCategoryId(availableCategories[0]?.id || '');
    }
  }, [type, availableCategories, categoryId]);

  useEffect(() => {
    if (type !== 'transfer') {
      setSubcategoryId(availableSubcategories.some(s => s?.id === subcategoryId) ? subcategoryId : (availableSubcategories[0]?.id || ''));
    }
  }, [type, categoryId, availableSubcategories, subcategoryId]);

  useEffect(() => {
    if (accounts.length > 0 && !accounts.some(a => a?.id === accountId)) {
      setAccountId(accounts[0]?.id || '');
    }
    if (accounts.length > 1 && (!toAccountId || toAccountId === accountId)) {
      const other = accounts.find(a => a?.id !== accountId);
      if (other) setToAccountId(other.id);
    }
  }, [accounts, accountId, toAccountId]);

  // Cuentas origen y destino para transferencias
  const fromAcc = accounts.find(a => a?.id === accountId) || accounts[0] || null;
  const toAcc = accounts.find(a => a?.id === toAccountId) || accounts.find(a => a?.id !== accountId) || null;

  const numAmount = parseFormattedAmount(amount);

  // Cálculo de monto destino en transferencias multidivisa
  let destAmount = numAmount;
  if (fromAcc?.currency && toAcc?.currency && fromAcc.currency !== toAcc.currency && numAmount > 0) {
    const copEquivalent = convertToCOP(numAmount, fromAcc.currency, trm);
    destAmount = convertFromCOP(copEquivalent, toAcc.currency, trm);
  }

  // Intercambio rápido de cuentas origen y destino
  const handleSwapAccounts = () => {
    if (!toAccountId) return;
    const temp = accountId;
    setAccountId(toAccountId);
    setToAccountId(temp);
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();
    if (submittingRef.current || isSubmitting) return;

    if (isNaN(numAmount) || numAmount <= 0) return;

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      // 1. Caso Transferencia entre cuentas
      if (type === 'transfer') {
        if (!fromAcc || !toAcc || fromAcc.id === toAcc.id) {
          setIsSubmitting(false);
          submittingRef.current = false;
          return;
        }

        const fromCurrency = fromAcc?.currency || currency || 'COP';
        const toCurrency = toAcc?.currency || 'COP';

        const transferPayload = {
          fromAcc,
          toAcc,
          amount: numAmount,
          destAmount,
          fromCurrency,
          toCurrency,
          date,
          note: note.trim()
        };

        if (typeof onTransfer === 'function') {
          await onTransfer(transferPayload);
        } else {
          // Generación atómica local-first de transacciones de salida y entrada
          const rate = fromCurrency === 'USD' ? (Number(trm) || 4050) : fromCurrency === 'EUR' ? Math.round((Number(trm) || 4050) * 1.08) : 1;
          const copAmount = fromCurrency === 'COP' ? numAmount : Math.round(numAmount * rate);
          const inRate = toCurrency === 'USD' ? (Number(trm) || 4050) : toCurrency === 'EUR' ? Math.round((Number(trm) || 4050) * 1.08) : 1;

          const outId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'tx-out-' + Date.now();
          const inId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'tx-in-' + (Date.now() + 1);

          const outTx = {
            id: outId,
            date: date || getTodayLocalDate(),
            type: 'expense',
            amount: copAmount,
            originalAmount: numAmount,
            originalCurrency: fromCurrency,
            exchangeRate: rate,
            categoryId: 'cat-transfer',
            categoryName: 'Transferencias',
            subcategoryId: 'sub-transfer-out',
            subcategoryName: 'Transferencia Enviada',
            accountId: fromAcc.id,
            accountName: fromAcc.name,
            fromAccountId: fromAcc.id,
            toAccountId: toAcc.id,
            note: note ? `Transferencia a ${toAcc.name}: ${note}` : `Transferencia a ${toAcc.name}`,
            notes: note ? `Transferencia a ${toAcc.name}: ${note}` : `Transferencia a ${toAcc.name}`,
            isTransfer: true,
            updated_at: new Date().toISOString()
          };

          const inTx = {
            id: inId,
            date: date || getTodayLocalDate(),
            type: 'income',
            amount: copAmount,
            originalAmount: destAmount,
            originalCurrency: toCurrency,
            exchangeRate: inRate,
            categoryId: 'cat-transfer',
            categoryName: 'Transferencias',
            subcategoryId: 'sub-transfer-in',
            subcategoryName: 'Transferencia Recibida',
            accountId: toAcc.id,
            accountName: toAcc.name,
            fromAccountId: fromAcc.id,
            toAccountId: toAcc.id,
            note: note ? `Transferencia desde ${fromAcc.name}: ${note}` : `Transferencia desde ${fromAcc.name}`,
            notes: note ? `Transferencia desde ${fromAcc.name}: ${note}` : `Transferencia desde ${fromAcc.name}`,
            isTransfer: true,
            updated_at: new Date().toISOString()
          };

          if (typeof onAddTransaction === 'function') {
            await onAddTransaction(outTx);
            await onAddTransaction(inTx);
          }
          if (typeof onSuccess === 'function') {
            onSuccess(outTx);
          }

          saveTransactionRecord({ txPayload: outTx, account: fromAcc, isEditing: false }).catch(() => {});
          saveTransactionRecord({ txPayload: inTx, account: toAcc, isEditing: false }).catch(() => {});
        }

        setCurrentEditing(null);
        setAmount('');
        setNote('');
        setReceiptImage(null);
        setDate(getTodayLocalDate());

        if (typeof onClose === 'function') {
          onClose();
        } else {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 1500);
        }
        return;
      }

      // 2. Caso Gasto o Ingreso Ordinario
      const isEditingTx = Boolean(currentEditing?.id);
      const { newTx, selectedAccount } = buildTransactionPayload({
        numAmount, currency, exchangeRate, enableDecimals, type, date, note, receiptImage,
        categoryId, subcategoryId, accountId, categories, accounts, editingMovement: currentEditing
      });

      if (typeof onAddTransaction === 'function') {
        await onAddTransaction(newTx);
      }
      if (typeof onSuccess === 'function') {
        onSuccess(newTx);
      }

      setCurrentEditing(null);
      setAmount('');
      setCurrency('COP');
      isCurrencyManuallySetRef.current = false;
      setExchangeRate(String(trm || 4050));
      setNote('');
      setReceiptImage(null);
      setDate(getTodayLocalDate());

      if (typeof onClose === 'function') {
        onClose();
      } else {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1500);
      }

      saveTransactionRecord({ txPayload: newTx, account: selectedAccount, isEditing: isEditingTx })
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
        <AmountInput
          value={amount}
          onChange={(cleanVal) => setAmount(cleanVal)}
          enableDecimals={enableDecimals}
          required
          onFocus={(e) => e.target.select()}
          prefix={
            <span className="opacity-40 font-black text-lg text-slate-900 dark:text-zinc-100">
              {currency === 'EUR' ? '€' : '$'}
            </span>
          }
          className="w-full pl-8 pr-3.5 h-12 text-2xl font-bold font-mono tracking-tight bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all"
        />
        <CurrencySelector
          currency={currency} exchangeRate={exchangeRate} setExchangeRate={setExchangeRate}
          trm={trm} amount={amount} enableDecimals={enableDecimals}
          onCurrencyChange={handleCurrencyChange}
        />
      </div>

      {type === 'transfer' ? (
        /* Selectores emparejados de Cuenta Origen y Cuenta Destino para Transferencia */
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center relative">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5 select-none">
                Cuenta de origen (sale dinero) *
              </label>
              <AccountCombobox
                accounts={accounts}
                selectedAccountId={accountId}
                onSelectAccount={(newFromId) => {
                  setAccountId(newFromId);
                  if (newFromId === toAccountId) {
                    const nextOther = accounts.find(a => a?.id !== newFromId);
                    if (nextOther) setToAccountId(nextOther.id);
                  }
                }}
                onAddAccount={onAddAccount}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 select-none">
                  Cuenta de destino (entra dinero) *
                </label>
                {accounts.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwapAccounts}
                    className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    title="Intercambiar origen y destino"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>Invertir</span>
                  </button>
                )}
              </div>
              <AccountCombobox
                accounts={accounts.filter(a => a?.id !== accountId)}
                selectedAccountId={toAccountId}
                onSelectAccount={setToAccountId}
                onAddAccount={onAddAccount}
              />
            </div>
          </div>

          {fromAcc?.currency && toAcc?.currency && fromAcc.currency !== toAcc.currency && numAmount > 0 && (
            <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
              <span>Monto a recibir estimado:</span>
              <span className="font-bold font-mono">
                ~{formatNativeCurrency(destAmount, toAcc.currency)}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Categoría y Cuenta única para Gasto o Ingreso */
        <TransactionAccountCategoryFields
          type={type} accountId={accountId} setAccountId={setAccountId} accounts={accounts} onAddAccount={onAddAccount}
          categoryId={categoryId} setCategoryId={setCategoryId} categories={categories} availableCategories={availableCategories}
          onAddCategory={onAddCategory} subcategoryId={subcategoryId} setSubcategoryId={setSubcategoryId}
          availableSubcategories={availableSubcategories} onAddSubcategory={onAddSubcategory}
          onUpdateSubcategory={onUpdateSubcategory} onDeleteSubcategory={onDeleteSubcategory}
        />
      )}

      <TransactionDetailsFields
        date={date} setDate={setDate} note={note} setNote={setNote}
        receiptImage={receiptImage} setReceiptImage={setReceiptImage}
      />
    </>
  );

  if (isModal) {
    return (
      <TransactionFormModalLayout
        isModal={isModal} isSubmitting={isSubmitting} showSuccess={showSuccess}
        editingMovement={editingMovement} onSubmit={handleSubmit} handleSubmit={handleSubmit} onClose={onClose}
        type={type}
      >
        {formFields}
      </TransactionFormModalLayout>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formFields}
      <SuccessAlert show={showSuccess} />
      <div className="flex justify-end pt-2">
        <SubmitBtn type={type} isSubmitting={isSubmitting} />
      </div>
    </form>
  );
}
