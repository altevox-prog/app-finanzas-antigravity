import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CreditCard, Plus, ArrowLeft, Trash2, ArrowUpDown, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import CreditCardDetailModal from './modals/CreditCardDetailModal';
import AddAccountModal from './modals/AddAccountModal';
import EditAccountModal from './modals/EditAccountModal';
import AccountCard from './components/AccountCard';
import { getAccountNativeBalance, safeNumber } from '../../utils/currencyUtils';

export default function AccountsAndCategories({ 
  accounts = [], transactions = [], onAddAccount, onUpdateAccount, onDeleteAccount,
  onReorderAccounts, onAddTransaction, onOpenCreditCardDetail, onBack, fromSettings = false, trm = 4050, mode, isReadOnly
}) {
  const { formatMoney, isPrivacyMode } = usePrivacy();
  const readOnly = isReadOnly !== undefined ? Boolean(isReadOnly) : (mode !== undefined ? mode === 'view' : !fromSettings);

  const [localAccounts, setLocalAccounts] = useState(accounts), localAccountsRef = useRef(accounts);
  useEffect(() => { setLocalAccounts(accounts); localAccountsRef.current = accounts; }, [accounts]);

  const [isReordering, setIsReordering] = useState(false), [draggingIndex, setDraggingIndex] = useState(null);
  const [localSelectedCard, setLocalSelectedCard] = useState(null), [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null), [accountPendingDelete, setAccountPendingDelete] = useState(null);
  const longPressTimerRef = useRef(null), draggedIndexRef = useRef(null), touchStartPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (readOnly) return;
    const handleOpenAdd = () => setShowAddAccount(true);
    window.addEventListener('monety:open-add-account', handleOpenAdd);
    return () => window.removeEventListener('monety:open-add-account', handleOpenAdd);
  }, [readOnly]);

  const accountsWithBalance = useMemo(() => {
    return (Array.isArray(localAccounts) ? localAccounts : []).map((acc) => {
      const cur = acc?.currency || 'COP', bal = getAccountNativeBalance(acc, transactions, trm);
      const rate = cur === 'USD' ? Number(trm || 4000) : cur === 'EUR' ? Math.round(Number(trm || 4000) * 1.08) : 1;
      const copEquivalent = bal * rate;
      const txCount = Array.isArray(transactions) ? transactions.filter((t) => t?.accountId === acc?.id || t?.account === acc?.name).length : 0;
      return { ...acc, currency: cur, balance: bal, shares: Number(acc?.shares || 0), unitPrice: Number(acc?.unitPrice || 0), currentBalance: bal, copEquivalent, balanceInCop: copEquivalent, txCount };
    });
  }, [localAccounts, transactions, trm]);

  const totalAvailableWealth = accountsWithBalance
    .filter((acc) => !['card', 'credit'].includes(acc?.type))
    .reduce((sum, acc) => sum + (safeNumber(acc?.copEquivalent) > 0 ? safeNumber(acc.copEquivalent) : 0), 0);

  useBackHandler(Boolean(localSelectedCard), () => setLocalSelectedCard(null));
  const handleGoBack = () => (onBack ? onBack() : (typeof window !== 'undefined' && window.history.length > 2 && window.history.back()));

  const swapAccounts = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= localAccounts.length || fromIdx === toIdx) return;
    setLocalAccounts((prev) => {
      const updated = [...prev], [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      localAccountsRef.current = updated;
      return updated;
    });
    draggedIndexRef.current = toIdx; setDraggingIndex(toIdx);
  };
  const finishDrag = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    setDraggingIndex(null); draggedIndexRef.current = null;
    if (onReorderAccounts) onReorderAccounts(localAccountsRef.current);
  };
  const handleTouchStart = (e, idx) => {
    touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    draggedIndexRef.current = idx;
    longPressTimerRef.current = setTimeout(() => { setIsReordering(true); setDraggingIndex(idx); }, 400);
  };
  const handleTouchMove = (e) => {
    const t = e.touches[0];
    if (!isReordering) { if (Math.hypot(t.clientX - touchStartPosRef.current.x, t.clientY - touchStartPosRef.current.y) > 10) clearTimeout(longPressTimerRef.current); return; }
    if (e.cancelable) e.preventDefault();
    const targetIdx = Number(document.elementFromPoint(t.clientX, t.clientY)?.closest('[data-account-index]')?.dataset?.accountIndex);
    if (!isNaN(targetIdx) && targetIdx !== draggedIndexRef.current) swapAccounts(draggedIndexRef.current, targetIdx);
  };
  const handleToggleReorder = () => {
    const next = !isReordering; setIsReordering(next);
    if (!next && onReorderAccounts) onReorderAccounts(localAccountsRef.current);
  };

  return (
    <div className="space-y-3 pt-1">
      <div className={`flex items-center justify-between gap-3 ${fromSettings ? 'mt-2 mb-2 px-1' : 'pb-3 border-b border-slate-200/80 dark:border-white/[0.08]'}`}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {!fromSettings && onBack && (
            <button type="button" onClick={handleGoBack} className="p-2 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 opacity-75 hover:opacity-100 active:scale-90 transition-all cursor-pointer shrink-0" title="Volver"><ArrowLeft className="w-4 h-4" /></button>
          )}
          <div className="min-w-0 flex-1">
            {!fromSettings && <h2 className="text-base sm:text-lg font-bold truncate leading-tight text-slate-900 dark:text-white flex items-center gap-2"><CreditCard className="w-5 h-5 text-[#007AFF] shrink-0" /><span>Cuentas y Métodos de Pago</span></h2>}
            <p className="text-[11px] sm:text-[12px] text-slate-500 dark:text-slate-400 font-normal truncate mt-0.5">Total disponible: {isPrivacyMode ? '••••••' : formatMoney(totalAvailableWealth)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!readOnly && accounts.length > 1 && (
            <button type="button" onClick={handleToggleReorder} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 ${isReordering ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/30' : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/60 dark:border-white/[0.06]'}`}>
              {isReordering ? <><Check className="w-3.5 h-3.5 stroke-[2.5]" /><span>Listo</span></> : <><ArrowUpDown className="w-3.5 h-3.5" /><span className="hidden sm:inline">Reordenar</span></>}
            </button>
          )}
          {!readOnly && !fromSettings && (
            <button type="button" onClick={() => setShowAddAccount(true)} className="w-9 h-9 bg-[#007AFF] hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer" title="Nueva Cuenta"><Plus className="w-4.5 h-4.5 stroke-[2.5]" /></button>
          )}
        </div>
      </div>

      {isReordering && (
        <div className="mb-3 p-2.5 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0"><ArrowUpDown className="w-4 h-4 shrink-0" /><span className="truncate">Usa las flechas o arrastra las tarjetas para reorganizarlas.</span></div>
          <button type="button" onClick={handleToggleReorder} className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white font-bold text-[11px] shadow-sm hover:bg-emerald-600 cursor-pointer">Listo</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 auto-rows-fr items-stretch">
        {accountsWithBalance.map((acc, index) => (
          <div
            key={acc?.id || `acc-${index}`} data-account-index={index} draggable={isReordering}
            onDragStart={(e) => { draggedIndexRef.current = index; setDraggingIndex(index); e.dataTransfer.setData('text/plain', String(index)); }}
            onDragOver={(e) => { e.preventDefault(); if (draggedIndexRef.current !== null && draggedIndexRef.current !== index) swapAccounts(draggedIndexRef.current, index); }}
            onDragEnd={finishDrag} onTouchStart={(e) => !readOnly && handleTouchStart(e, index)} onTouchMove={handleTouchMove} onTouchEnd={() => { setIsReordering(false); finishDrag(); }}
            className={`relative w-full h-full flex flex-col transition-all rounded-2xl ${isReordering ? 'ring-2 ring-emerald-500/40' : ''} ${draggingIndex === index ? 'opacity-40 scale-[0.98]' : ''}`}
          >
            {isReordering && (
              <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm p-1 rounded-xl shadow-md border border-slate-200 dark:border-white/10 animate-fadeIn">
                <button type="button" disabled={index === 0} onClick={(e) => { e.stopPropagation(); swapAccounts(index, index - 1); onReorderAccounts?.(localAccountsRef.current); }} className={`w-7 h-7 rounded-lg flex items-center justify-center ${index === 0 ? 'text-slate-300 dark:text-zinc-600' : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 cursor-pointer'}`}><ChevronUp className="w-4 h-4 stroke-[2.5]" /></button>
                <button type="button" disabled={index === accountsWithBalance.length - 1} onClick={(e) => { e.stopPropagation(); swapAccounts(index, index + 1); onReorderAccounts?.(localAccountsRef.current); }} className={`w-7 h-7 rounded-lg flex items-center justify-center ${index === accountsWithBalance.length - 1 ? 'text-slate-300 dark:text-zinc-600' : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 cursor-pointer'}`}><ChevronDown className="w-4 h-4 stroke-[2.5]" /></button>
              </div>
            )}
            <AccountCard account={acc} index={index} showBalance={!isPrivacyMode} transactions={transactions} trm={trm} isReadOnly={readOnly || isReordering} onEdit={!readOnly && !isReordering ? setEditingAccount : undefined} onDelete={!readOnly && !isReordering ? ((a) => setAccountPendingDelete(typeof a === 'object' && a !== null ? a : localAccounts.find((x) => x.id === a))) : undefined} onSelectCard={!readOnly && !isReordering ? (card) => (onOpenCreditCardDetail ? onOpenCreditCardDetail(card) : setLocalSelectedCard(card)) : undefined} />
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-full text-center py-10 px-4 rounded-2xl border border-dashed border-slate-200/80 dark:border-white/10 text-slate-400 bg-slate-50/50 dark:bg-white/[0.02]">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No tienes cuentas registradas</p>
          </div>
        )}
      </div>

      {!readOnly && showAddAccount && <AddAccountModal isOpen={showAddAccount} onClose={() => setShowAddAccount(false)} onCreateAccount={(newAcc) => { onAddAccount?.(newAcc); setShowAddAccount(false); }} trm={trm} />}
      {!readOnly && localSelectedCard && <CreditCardDetailModal isOpen={Boolean(localSelectedCard)} onClose={() => setLocalSelectedCard(null)} card={accounts.find((a) => a.id === localSelectedCard.id) || localSelectedCard} transactions={transactions} accounts={accounts} onAddTransaction={onAddTransaction} onOpenEdit={setEditingAccount} />}
      {!readOnly && editingAccount && <EditAccountModal account={editingAccount} onClose={() => setEditingAccount(null)} onSave={(upd) => { onUpdateAccount?.(upd); setEditingAccount(null); }} onDelete={onDeleteAccount} trm={trm} />}

      {accountPendingDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn" onClick={() => setAccountPendingDelete(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-5 border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0"><Trash2 className="w-5 h-5" /></div>
              <div><h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">¿Eliminar cuenta?</h3><p className="text-xs text-slate-500 dark:text-slate-400">Esta acción no se puede deshacer</p></div>
            </div>
            <p className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-white/[0.06] text-xs text-slate-700 dark:text-zinc-200 font-medium">Vas a eliminar la cuenta <strong className="text-slate-900 dark:text-white font-bold">{accountPendingDelete.name}</strong>.</p>
            <div className="flex items-center gap-2 pt-1">
              <button type="button" onClick={() => setAccountPendingDelete(null)} className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 cursor-pointer text-center">Cancelar</button>
              <button type="button" onClick={() => { onDeleteAccount?.(accountPendingDelete.id); setAccountPendingDelete(null); }} className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer text-center shadow-sm">Eliminar cuenta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
