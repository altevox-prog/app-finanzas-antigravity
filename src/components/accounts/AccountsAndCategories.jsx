import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CreditCard, 
  Plus, 
  ArrowLeft,
  Trash2
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
  trm = 4050,
  mode,
  isReadOnly
}) {
  const { formatMoney, isPrivacyMode } = usePrivacy();

  const readOnly = isReadOnly !== undefined 
    ? Boolean(isReadOnly) 
    : (mode !== undefined ? mode === 'view' : !fromSettings);

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

  // Estado para Diálogo de Confirmación de Seguridad de Eliminación de Cuenta
  const [accountPendingDelete, setAccountPendingDelete] = useState(null);

  // Escuchar evento de TopAppBar para abrir modal de agregar cuenta (solo en modo gestión)
  useEffect(() => {
    if (readOnly) return;
    const handleOpenAdd = () => setShowAddAccount(true);
    window.addEventListener('monety:open-add-account', handleOpenAdd);
    return () => window.removeEventListener('monety:open-add-account', handleOpenAdd);
  }, [readOnly]);

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

  // Solicitar eliminación de cuenta abriendo diálogo de confirmación de seguridad
  const handleRequestDelete = (acc) => {
    const accObj = typeof acc === 'object' && acc !== null 
      ? acc 
      : (localAccounts.find(a => a.id === acc) || accounts.find(a => a.id === acc));
    if (accObj) {
      setAccountPendingDelete(accObj);
    }
  };

  // Confirmar eliminación definitiva de cuenta
  const handleConfirmDelete = () => {
    if (!accountPendingDelete) return;
    const accId = accountPendingDelete.id;
    if (onDeleteAccount) {
      onDeleteAccount(accId);
    }
    setAccountPendingDelete(null);
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
      <div>
        {/* Cabecera: Informativa para Sidebar / Administrativa para Configuración */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 min-w-0">
            {fromSettings && (
              <button
                type="button"
                onClick={handleGoBack}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-colors cursor-pointer border border-slate-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm shrink-0"
                aria-label="Volver a Configuración"
                title="Volver a Configuración"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                Cuentas y Métodos de Pago
              </h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Total disponible: {isPrivacyMode ? '••••••' : formatMoney(totalAvailableWealth)}
              </p>
            </div>
          </div>

          {/* Botón + Nueva cuenta: EXCLUSIVO para Modo Administrativo (!readOnly) */}
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowAddAccount(true)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
              title="Nueva cuenta"
              aria-label="Nueva cuenta"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tarjetas de Cuenta Individuales en Grilla de 2 Columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch mt-6">
          {accountsWithBalance.map((acc, index) => (
            <div
              key={acc?.id || `acc-${index}`}
              className="w-full h-full flex"
            >
              <AccountCard
                account={acc}
                index={index}
                showBalance={!isPrivacyMode}
                transactions={transactions}
                trm={trm}
                isReadOnly={readOnly}
                onEdit={!readOnly ? handleOpenEditAccount : undefined}
                onDelete={!readOnly ? handleRequestDelete : undefined}
                onSelectCard={!readOnly ? (card) => {
                  if (onOpenCreditCardDetail) {
                    onOpenCreditCardDetail(card);
                  } else {
                    setLocalSelectedCard(card);
                  }
                } : undefined}
              />
            </div>
          ))}

          {accounts.length === 0 && (
            <div className="col-span-full text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No tienes cuentas registradas</p>
              <p className="text-xs mt-0.5">
                {readOnly
                  ? 'Gestiona y agrega tus cuentas desde la sección de Configuración'
                  : 'Crea tu primera cuenta haciendo clic en "Nueva cuenta" arriba'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Creación de Nueva Cuenta (Exclusivo modo administrativo) */}
      {!readOnly && showAddAccount && (
        <AddAccountModal
          isOpen={showAddAccount}
          onClose={() => setShowAddAccount(false)}
          onCreateAccount={handleCreateAccount}
          trm={trm}
        />
      )}

      {/* Modal de Detalle de Tarjeta de Crédito (fallback local) */}
      {!readOnly && localSelectedCard && (
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
      {!readOnly && editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSave={handleSaveEditAccount}
          onDelete={onDeleteAccount}
          trm={trm}
        />
      )}

      {/* DIÁLOGO MODAL DE CONFIRMACIÓN DE SEGURIDAD PARA ELIMINACIÓN DE CUENTA */}
      {accountPendingDelete && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setAccountPendingDelete(null)}
        >
          <div 
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-5 border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-4 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  ¿Eliminar cuenta?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-white/[0.06] text-xs space-y-2">
              <p className="text-slate-700 dark:text-zinc-200 font-medium">
                Vas a eliminar la cuenta <strong className="text-slate-900 dark:text-white font-bold">{accountPendingDelete.name}</strong>.
              </p>
              {(() => {
                const accTxs = Array.isArray(transactions) 
                  ? transactions.filter(t => t?.accountId === accountPendingDelete.id || t?.account === accountPendingDelete.name)
                  : [];
                const rawBal = Number(accountPendingDelete.balance ?? accountPendingDelete.currentBalance ?? 0);
                if (accTxs.length > 0 || (!isNaN(rawBal) && rawBal !== 0)) {
                  return (
                    <p className="text-amber-600 dark:text-amber-400 font-medium text-[11px] pt-1.5 border-t border-slate-200/50 dark:border-white/[0.06] leading-relaxed">
                      ⚠️ Atención: Esta cuenta tiene {accTxs.length > 0 ? `${accTxs.length} movimiento(s) vinculados` : ''} {accTxs.length > 0 && !isNaN(rawBal) && rawBal !== 0 ? 'y ' : ''}{!isNaN(rawBal) && rawBal !== 0 ? `saldo de ${formatMoney(rawBal)}` : ''}. Sus transacciones quedarán desvinculadas.
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAccountPendingDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer text-center shadow-sm"
              >
                Eliminar cuenta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
