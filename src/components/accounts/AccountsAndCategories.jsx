import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CreditCard, Plus, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import CreditCardDetailModal from './modals/CreditCardDetailModal';
import AddAccountModal from './modals/AddAccountModal';
import EditAccountModal from './modals/EditAccountModal';
import AccountDeleteModal from './modals/AccountDeleteModal';
import AccountCard from './components/AccountCard';
import useAccountReorder from './hooks/useAccountReorder';
import { getAccountNativeBalance, safeNumber } from '../../utils/currencyUtils';

export default function AccountsAndCategories({ 
  accounts = [], transactions = [], onAddAccount, onUpdateAccount, onDeleteAccount,
  onReorderAccounts, onAddTransaction, onOpenCreditCardDetail, onBack, fromSettings = false, trm = 4050, mode, isReadOnly
}) {
  const { formatMoney, isPrivacyMode } = usePrivacy();
  const readOnly = isReadOnly !== undefined ? Boolean(isReadOnly) : (mode !== undefined ? mode === 'view' : !fromSettings);

  const [localAccounts, setLocalAccounts] = useState(accounts), localAccountsRef = useRef(accounts);
  useEffect(() => { setLocalAccounts(accounts); localAccountsRef.current = accounts; }, [accounts]);

  const [localSelectedCard, setLocalSelectedCard] = useState(null), [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null), [accountPendingDelete, setAccountPendingDelete] = useState(null);

  const {
    isReordering, draggingIndex, draggedIndexRef,
    swapAccounts, handlePressStart, handlePressMove, handlePressEnd, handleConfirmReorder
  } = useAccountReorder({ localAccounts, setLocalAccounts, localAccountsRef, onReorderAccounts, readOnly });

  useEffect(() => {
    if (readOnly) return;
    const handleOpenAdd = () => setShowAddAccount(true);
    window.addEventListener('monety:open-add-account', handleOpenAdd);
    return () => window.removeEventListener('monety:open-add-account', handleOpenAdd);
  }, [readOnly]);

  const accountsWithBalance = useMemo(() => (Array.isArray(localAccounts) ? localAccounts : []).map((acc) => {
    const cur = acc?.currency || 'COP', bal = getAccountNativeBalance(acc, transactions, trm);
    const rate = cur === 'USD' ? Number(trm || 4000) : cur === 'EUR' ? Math.round(Number(trm || 4000) * 1.08) : 1;
    const copEquivalent = bal * rate;
    const txCount = Array.isArray(transactions) ? transactions.filter((t) => t?.accountId === acc?.id || t?.account === acc?.name).length : 0;
    return { ...acc, currency: cur, balance: bal, shares: Number(acc?.shares || 0), unitPrice: Number(acc?.unitPrice || 0), currentBalance: bal, copEquivalent, balanceInCop: copEquivalent, txCount };
  }), [localAccounts, transactions, trm]);

  const totalAvailableWealth = accountsWithBalance
    .filter((acc) => !['card', 'credit'].includes(acc?.type))
    .reduce((sum, acc) => sum + (safeNumber(acc?.copEquivalent) > 0 ? safeNumber(acc.copEquivalent) : 0), 0);

  useBackHandler(Boolean(localSelectedCard), () => setLocalSelectedCard(null));

  return (
    <div className="space-y-3 pt-1">
      <div className={`flex items-center justify-between gap-3 ${fromSettings ? 'mt-2 mb-2 px-1' : 'pb-3 border-b border-slate-200/80 dark:border-white/[0.08]'}`}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Flecha atrás removida para escritorio por redundancia con el sidebar */}
          <div className="min-w-0 flex-1">
            {!fromSettings && <h2 className="text-base sm:text-lg font-bold truncate leading-tight text-slate-900 dark:text-white flex items-center gap-2"><CreditCard className="w-5 h-5 text-[#007AFF] shrink-0" /><span>Cuentas y Métodos de Pago</span></h2>}
            <p className="text-xs sm:text-sm text-slate-800 dark:text-zinc-200 font-medium truncate mt-1 flex items-center gap-1.5">
              <span className="opacity-75">Total disponible:</span>
              <span className="font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">{isPrivacyMode ? '••••••' : formatMoney(totalAvailableWealth)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!readOnly && !fromSettings && (
            <button type="button" onClick={() => setShowAddAccount(true)} className="w-9 h-9 bg-[#007AFF] hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer" title="Nueva Cuenta"><Plus className="w-4.5 h-4.5 stroke-[2.5]" /></button>
          )}
        </div>
      </div>

      {isReordering && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2 bg-slate-900/90 dark:bg-slate-800/95 text-white rounded-full shadow-2xl border border-slate-700/60 backdrop-blur-md animate-fadeIn">
          <span className="text-xs font-semibold text-slate-200 pl-1 hidden sm:inline">Organizando cuentas</span>
          <button type="button" onClick={handleConfirmReorder} className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-full shadow transition-all cursor-pointer">
            <Check className="w-3.5 h-3.5 stroke-[3]" /><span>Listo</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 auto-rows-fr items-stretch">
        {accountsWithBalance.map((acc, index) => {
          const jiggleClass = isReordering ? (draggingIndex === index ? '!animate-none' : (index % 2 === 1 ? 'animate-jiggle-alt' : 'animate-jiggle')) : '';
          return (
            <div
              key={acc?.id || `acc-${index}`} data-account-index={index} draggable={isReordering}
              onDragStart={(e) => { draggedIndexRef.current = index; e.dataTransfer.setData('text/plain', String(index)); }}
              onDragOver={(e) => { e.preventDefault(); if (draggedIndexRef.current !== null && draggedIndexRef.current !== index) swapAccounts(draggedIndexRef.current, index); }}
              onDragEnd={handlePressEnd} onTouchStart={(e) => handlePressStart(e, index)} onTouchMove={handlePressMove} onTouchEnd={handlePressEnd}
              onMouseDown={(e) => handlePressStart(e, index)} onMouseMove={handlePressMove} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
              className={`relative w-full h-full flex flex-col transition-all rounded-2xl ${jiggleClass} ${isReordering ? 'ring-2 ring-emerald-500/40 cursor-grab active:cursor-grabbing select-none' : ''} ${draggingIndex === index ? 'opacity-40 scale-[0.98]' : ''}`}
            >
              {isReordering && (
                <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm p-1 rounded-xl shadow-md border border-slate-200 dark:border-white/10 animate-fadeIn">
                  <button type="button" disabled={index === 0} onClick={(e) => { e.stopPropagation(); swapAccounts(index, index - 1); onReorderAccounts?.(localAccountsRef.current); }} className={`w-7 h-7 rounded-lg flex items-center justify-center ${index === 0 ? 'text-slate-300 dark:text-zinc-600' : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 cursor-pointer'}`}><ChevronUp className="w-4 h-4 stroke-[2.5]" /></button>
                  <button type="button" disabled={index === accountsWithBalance.length - 1} onClick={(e) => { e.stopPropagation(); swapAccounts(index, index + 1); onReorderAccounts?.(localAccountsRef.current); }} className={`w-7 h-7 rounded-lg flex items-center justify-center ${index === accountsWithBalance.length - 1 ? 'text-slate-300 dark:text-zinc-600' : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 cursor-pointer'}`}><ChevronDown className="w-4 h-4 stroke-[2.5]" /></button>
                </div>
              )}
              <AccountCard account={acc} index={index} showBalance={!isPrivacyMode} transactions={transactions} trm={trm} isReadOnly={readOnly || isReordering} onEdit={!readOnly && !isReordering ? setEditingAccount : undefined} onDelete={!readOnly && !isReordering ? ((a) => setAccountPendingDelete(typeof a === 'object' && a !== null ? a : localAccounts.find((x) => x.id === a))) : undefined} onSelectCard={!readOnly && !isReordering ? (card) => (onOpenCreditCardDetail ? onOpenCreditCardDetail(card) : setLocalSelectedCard(card)) : undefined} />
            </div>
          );
        })}
        {accounts.length === 0 && (
          <div className="col-span-full text-center py-10 px-4 rounded-2xl border border-dashed border-slate-200/80 dark:border-white/10 text-slate-400 bg-slate-50/50 dark:bg-white/[0.02]">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No tienes cuentas registradas</p>
          </div>
        )}
      </div>

      {!readOnly && showAddAccount && <AddAccountModal isOpen={showAddAccount} onClose={() => setShowAddAccount(false)} onCreateAccount={(newAcc) => { onAddAccount?.(newAcc); setShowAddAccount(false); }} trm={trm} />}
      {!readOnly && localSelectedCard && <CreditCardDetailModal isOpen={Boolean(localSelectedCard)} onClose={() => setLocalSelectedCard(null)} card={accounts.find((a) => a.id === localSelectedCard.id) || localSelectedCard} transactions={transactions} accounts={accounts} onAddTransaction={onAddTransaction} onOpenEdit={setEditingAccount} />}
      {!readOnly && editingAccount && <EditAccountModal account={editingAccount} onClose={() => setEditingAccount(null)} onSave={(upd) => { onUpdateAccount?.(upd); setEditingAccount(null); }} onDelete={onDeleteAccount} trm={trm} />}
      {accountPendingDelete && <AccountDeleteModal account={accountPendingDelete} onClose={() => setAccountPendingDelete(null)} onConfirm={() => { onDeleteAccount?.(accountPendingDelete.id); setAccountPendingDelete(null); }} />}
    </div>
  );
}
