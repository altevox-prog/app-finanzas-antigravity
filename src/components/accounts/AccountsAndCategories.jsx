import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CreditCard, 
  Plus, 
  ArrowLeft
} from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import CreditCardDetailModal from './modals/CreditCardDetailModal';
import AddAccountModal from './modals/AddAccountModal';
import EditAccountModal from './modals/EditAccountModal';
import AccountCard from './components/AccountCard';
import SwipeableRow from '../common/SwipeableRow';
import { 
  getAccountNativeBalance, 
  safeNumber
} from '../../utils/currencyUtils';

export default function AccountsAndCategories({ 
  accounts = [], 
  transactions = [],
  onAddAccount, 
  onUpdateAccount,
  onDeleteAccount,
  onReorderAccounts,
  onAddTransaction,
  onOpenCreditCardDetail,
  onBack,
  fromSettings = false,
  previousView,
  trm = 4050
}) {
  const { formatMoney } = usePrivacy();

  // Sincronización del orden local de cuentas
  const [localAccounts, setLocalAccounts] = useState(accounts);
  const localAccountsRef = useRef(accounts);

  useEffect(() => {
    setLocalAccounts(accounts);
    localAccountsRef.current = accounts;
  }, [accounts]);

  // Estados y referencias para Long-Press & Drag-and-Drop
  const [isReordering, setIsReordering] = useState(false);
  const isReorderingRef = useRef(false);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const isDraggingRef = useRef(false);
  const justDraggedRef = useRef(false);
  const longPressTimerRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const draggedIndexRef = useRef(null);
  const lastSwapTimeRef = useRef(0);

  // Selected Credit Card for Detail Modal (local fallback if not controlled globally)
  const [localSelectedCard, setLocalSelectedCard] = useState(null);

  // Modal de Nueva Cuenta
  const [showAddAccount, setShowAddAccount] = useState(false);

  // Modal de Edición de Cuenta
  const [editingAccount, setEditingAccount] = useState(null);

  // Escuchar evento de TopAppBar para abrir modal de agregar cuenta
  useEffect(() => {
    const handleOpenAdd = () => setShowAddAccount(true);
    window.addEventListener('monety:open-add-account', handleOpenAdd);
    return () => window.removeEventListener('monety:open-add-account', handleOpenAdd);
  }, []);

  // Live balance for accounts in their native currency and COP equivalent (defensivo)
  const accountsWithBalance = useMemo(() => {
    try {
      if (!Array.isArray(localAccounts)) return [];
      return localAccounts.map((account) => {
        try {
          const currency = account?.currency || 'COP';
          const currentBalance = getAccountNativeBalance(account, transactions, trm);
          const balance = currentBalance;
          const shares = Number(account?.shares || 0);
          const unitPrice = Number(account?.unitPrice || 0);

          const rate = currency === 'USD' ? Number(trm || 4000) : currency === 'EUR' ? Math.round(Number(trm || 4000) * 1.08) : 1;
          const balanceInCop = currentBalance * rate;
          const copEquivalent = balanceInCop;
          const accTxs = Array.isArray(transactions) ? transactions.filter(t => t?.accountId === account?.id || t?.account === account?.name) : [];

          return {
            ...account,
            currency,
            balance,
            shares,
            unitPrice,
            currentBalance,
            copEquivalent,
            balanceInCop,
            txCount: accTxs.length
          };
        } catch (e) {
          console.warn('Error mapeando cuenta:', account, e);
          const rawBal = Number(account?.balance || account?.initialBalance || 0);
          return {
            ...account,
            currency: account?.currency || 'COP',
            balance: rawBal,
            shares: 0,
            unitPrice: 0,
            currentBalance: rawBal,
            copEquivalent: rawBal,
            balanceInCop: rawBal,
            txCount: 0
          };
        }
      });
    } catch (err) {
      console.error('Error calculando balances de cuentas:', err);
      return [];
    }
  }, [localAccounts, transactions, trm]);

  const totalAvailableWealth = accountsWithBalance
    .filter(acc => acc?.type !== 'card' && acc?.type !== 'credit')
    .reduce((sum, acc) => sum + (safeNumber(acc?.copEquivalent) > 0 ? safeNumber(acc.copEquivalent) : 0), 0);

  // Soporte de gesto de volver atrás en modales internos
  useBackHandler(Boolean(localSelectedCard), () => setLocalSelectedCard(null));

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else if (fromSettings || previousView === 'settings') {
      if (typeof window !== 'undefined' && window.history.length > 2) {
        window.history.back();
      }
    } else if (typeof window !== 'undefined' && window.history.length > 2) {
      window.history.back();
    }
  };

  // Open edit modal for an account
  const handleOpenEditAccount = (acc) => {
    setEditingAccount(acc);
  };

  // Save edited account
  const handleSaveEditAccount = (updated) => {
    if (onUpdateAccount) {
      onUpdateAccount(updated);
    }
    setEditingAccount(null);
  };

  // Eliminar cuenta con confirmación enriquecida si tiene saldo o movimientos vinculados
  const handleDeleteAccount = (accId) => {
    const accToDelete = localAccounts.find(a => a.id === accId) || accounts.find(a => a.id === accId);
    const accName = accToDelete ? accToDelete.name : 'esta cuenta';
    
    // Verificar si tiene saldo o movimientos vinculados
    const accTxs = Array.isArray(transactions) 
      ? transactions.filter(t => t?.accountId === accId || t?.account === accToDelete?.name)
      : [];
    const rawBalance = Number(accToDelete?.balance ?? (accToDelete?.currentBalance ?? 0));
    const hasBalance = !isNaN(rawBalance) && rawBalance !== 0;

    let confirmMessage = `¿Estás seguro de eliminar la cuenta "${accName}"?`;
    if (hasBalance || accTxs.length > 0) {
      const details = [];
      if (hasBalance) details.push(`saldo actual (${formatMoney(rawBalance)})`);
      if (accTxs.length > 0) details.push(`${accTxs.length} movimiento(s) vinculados`);
      confirmMessage = `⚠️ Atención: La cuenta "${accName}" tiene ${details.join(' y ')}.\n\n¿Estás seguro de que deseas eliminarla de todas formas?`;
    }

    if (window.confirm(confirmMessage)) {
      if (onDeleteAccount) {
        onDeleteAccount(accId);
      }
    }
  };

  const handleCreateAccount = (newAcc) => {
    if (onAddAccount) {
      onAddAccount(newAcc);
    }
    setShowAddAccount(false);
  };

  // Clic en la tarjeta (abre detalle si es tarjeta de crédito, o edición si es cuenta regular)
  const handleCardClick = (acc) => {
    if (justDraggedRef.current || isReorderingRef.current || isDraggingRef.current || draggingIndex !== null) return;
    if (acc.type === 'card' || acc.type === 'credit') {
      if (onOpenCreditCardDetail) {
        onOpenCreditCardDetail(acc);
      } else {
        setLocalSelectedCard(acc);
      }
    } else {
      handleOpenEditAccount(acc);
    }
  };

  /* ============================================================== */
  /* GESTIÓN DE REORDENAMIENTO TÁCTIL (Móvil Long-Press ~400ms)    */
  /* ============================================================== */
  const handleTouchStart = (e, index) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    draggedIndexRef.current = index;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      try {
        navigator.vibrate?.(40);
      } catch (_) {}
      isReorderingRef.current = true;
      setIsReordering(true);
      isDraggingRef.current = true;
      setDraggingIndex(index);
    }, 400);
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // Si aún no está en modo reordenar y el dedo se desplazó > 8px, cancelar timer inmediatamente
    // Esto asegura que un swipe lateral rápido active el swipe de editar/eliminar sin demoras
    if (!isReorderingRef.current) {
      if (dx > 8 || dy > 8) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
      return;
    }

    // Modo reordenar activo: prevenir scroll nativo del viewport
    if (e.cancelable) {
      e.preventDefault();
    }

    const currentIdx = draggedIndexRef.current;
    if (currentIdx === null || currentIdx === undefined) return;

    // Throttling para fluidez
    const now = Date.now();
    if (now - lastSwapTimeRef.current < 60) return;

    // Identificar la tarjeta destino calculando las coordenadas de las tarjetas
    const allCards = document.querySelectorAll('[data-account-index]');
    let targetIdx = null;

    for (const card of allCards) {
      const rect = card.getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        const idx = parseInt(card.getAttribute('data-account-index'), 10);
        if (!isNaN(idx) && idx !== currentIdx) {
          const midY = rect.top + rect.height / 2;
          const isValidMove = currentIdx < idx 
            ? touch.clientY > midY 
            : touch.clientY < midY;
          if (isValidMove) {
            targetIdx = idx;
            break;
          }
        }
      }
    }

    if (targetIdx !== null && targetIdx !== currentIdx) {
      lastSwapTimeRef.current = now;
      setLocalAccounts((prev) => {
        const updated = [...prev];
        const [movedItem] = updated.splice(currentIdx, 1);
        updated.splice(targetIdx, 0, movedItem);
        localAccountsRef.current = updated;
        return updated;
      });
      draggedIndexRef.current = targetIdx;
      setDraggingIndex(targetIdx);
      try {
        navigator.vibrate?.(20);
      } catch (_) {}
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isReorderingRef.current) {
      isReorderingRef.current = false;
      setIsReordering(false);
      isDraggingRef.current = false;
      setDraggingIndex(null);
      draggedIndexRef.current = null;
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 300);

      // Persistir nuevo orden
      if (onReorderAccounts) {
        onReorderAccounts(localAccountsRef.current);
      }
    }
  };

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isReorderingRef.current) {
      isReorderingRef.current = false;
      setIsReordering(false);
      isDraggingRef.current = false;
      setDraggingIndex(null);
      draggedIndexRef.current = null;
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 300);

      if (onReorderAccounts) {
        onReorderAccounts(localAccountsRef.current);
      }
    }
  };

  /* ============================================================== */
  /* GESTIÓN DE REORDENAMIENTO EN ESCRITORIO (HTML5 Drag & Drop)    */
  /* ============================================================== */
  const handleDragStart = (e, index) => {
    draggedIndexRef.current = index;
    setDraggingIndex(index);
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    try {
      navigator.vibrate?.(40);
    } catch (_) {}
  };

  const handleDragOver = (e, targetIdx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const currentIdx = draggedIndexRef.current;
    if (currentIdx === null || currentIdx === undefined || currentIdx === targetIdx) return;

    setLocalAccounts((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(currentIdx, 1);
      updated.splice(targetIdx, 0, movedItem);
      localAccountsRef.current = updated;
      return updated;
    });
    draggedIndexRef.current = targetIdx;
    setDraggingIndex(targetIdx);
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    setDraggingIndex(null);
    draggedIndexRef.current = null;
    justDraggedRef.current = true;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 300);

    if (onReorderAccounts) {
      onReorderAccounts(localAccountsRef.current);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* CUENTAS BANCARIAS Y EFECTIVO */}
      <section className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-sm">
        {fromSettings && (
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={handleGoBack}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 active:scale-95 transition-colors cursor-pointer border border-slate-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm shrink-0"
                aria-label="Volver"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg md:text-xl font-bold flex items-center gap-2 leading-tight min-w-0" style={{ color: 'var(--text-main)' }}>
                  <CreditCard className="w-5 h-5 text-[#007AFF] shrink-0" />
                  <span className="leading-tight">Cuentas y Métodos de Pago</span>
                </h2>
                <p className="text-[11px] sm:text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-normal">
                  Saldos sincronizados automáticamente
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddAccount(!showAddAccount)}
              className="w-9 h-9 bg-[#007AFF] hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
              title={showAddAccount ? 'Cerrar' : 'Nueva Cuenta'}
            >
              <Plus className={`w-4 h-4 transition-transform duration-200 ${showAddAccount ? 'rotate-45' : ''}`} />
            </button>
          </div>
        )}

        {/* Modal / Sheet Formulario Nueva Cuenta */}
        <AddAccountModal
          isOpen={showAddAccount}
          onClose={() => setShowAddAccount(false)}
          onCreateAccount={handleCreateAccount}
          trm={trm}
        />

        {/* Tarjeta de Saldo Total (Estilo Fintech Bento) */}
        <div className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 mb-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-normal block">
              Patrimonio en Cuentas
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 mt-0.5 tabular-nums">
              {formatMoney(totalAvailableWealth)}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-white/[0.06] tracking-normal block tabular-nums">
              {accounts.length} {accounts.length === 1 ? 'cuenta' : 'cuentas'}
            </span>
          </div>
        </div>

        {/* Tarjetas de Cuenta Individuales con Swipe to Action y Long-Press Drag & Drop */}
        <div className="grid grid-cols-1 gap-3">
          {accountsWithBalance.map((acc, index) => {
            const isDragging = draggingIndex === index;
            return (
              <div
                key={acc?.id || `acc-${index}`}
                data-account-index={index}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
                className={`transition-all duration-200 select-none ${
                  isDragging
                    ? 'scale-[1.02] shadow-2xl ring-2 ring-emerald-500/40 z-30 opacity-95 touch-none'
                    : 'opacity-100 z-0'
                }`}
              >
                <SwipeableRow
                  onEdit={() => handleOpenEditAccount(acc)}
                  onDelete={() => handleDeleteAccount(acc?.id)}
                  disabled={isReordering || draggingIndex !== null}
                  className="rounded-2xl"
                >
                  <AccountCard
                    account={acc}
                    index={index}
                    onEdit={() => handleCardClick(acc)}
                    onDelete={() => handleDeleteAccount(acc?.id)}
                    onSelectCard={() => handleCardClick(acc)}
                    transactions={transactions}
                    trm={trm}
                  />
                </SwipeableRow>
              </div>
            );
          })}

          {accounts.length === 0 && (
            <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No tienes cuentas registradas</p>
              <p className="text-xs mt-0.5">{fromSettings ? 'Usa el botón + arriba para agregar tu primera cuenta' : 'Gestiona y agrega tus cuentas desde la sección de Configuración'}</p>
            </div>
          )}
        </div>
      </section>

      {/* Modal de Detalle de Tarjeta de Crédito (fallback local) */}
      {localSelectedCard && (
        <CreditCardDetailModal
          isOpen={!!localSelectedCard}
          onClose={() => setLocalSelectedCard(null)}
          card={accounts.find(a => a.id === localSelectedCard.id) || localSelectedCard}
          transactions={transactions}
          accounts={accounts}
          onAddTransaction={onAddTransaction}
          onOpenEdit={(card) => handleOpenEditAccount(card)}
        />
      )}

      {/* MODAL / SHEET iOS PARA EDITAR CUENTA O MÉTODO DE PAGO */}
      <EditAccountModal
        account={editingAccount}
        onClose={() => setEditingAccount(null)}
        onSave={handleSaveEditAccount}
        onDelete={onDeleteAccount}
        trm={trm}
      />

    </div>
  );
}
