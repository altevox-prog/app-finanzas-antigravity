import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Plus, 
  ArrowLeft
} from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { useBackHandler } from '../hooks/useBackHandler';
import CreditCardDetailModal from './CreditCardDetailModal';
import AddAccountModal from './accounts/modals/AddAccountModal';
import EditAccountModal from './accounts/modals/EditAccountModal';
import AccountCard from './accounts/components/AccountCard';
import { 
  getAccountNativeBalance, 
  safeNumber
} from '../utils/currencyUtils';

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

  // Selected Credit Card for Detail Modal (local fallback if not controlled globally)
  const [localSelectedCard, setLocalSelectedCard] = useState(null);

  // Modal de Nueva Cuenta
  const [showAddAccount, setShowAddAccount] = useState(false);

  // Modal de Edición de Cuenta
  const [editingAccount, setEditingAccount] = useState(null);

  // Live balance for accounts in their native currency and COP equivalent (defensivo)
  const accountsWithBalance = useMemo(() => {
    try {
      if (!Array.isArray(accounts)) return [];
      return accounts.map((account) => {
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
  }, [accounts, transactions, trm]);

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

  // Reordenar cuentas (intercambiar posición e invocar persistencia)
  const handleMoveAccount = (index, direction) => {
    const safeAccounts = Array.isArray(accounts) ? accounts : [];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= safeAccounts.length) return;
    const newAccounts = [...safeAccounts];
    const temp = newAccounts[index];
    newAccounts[index] = newAccounts[targetIndex];
    newAccounts[targetIndex] = temp;
    if (onReorderAccounts) {
      onReorderAccounts(newAccounts);
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

  const handleDeleteAccount = (accId) => {
    const accToDelete = accounts.find(a => a.id === accId);
    const accName = accToDelete ? accToDelete.name : 'esta cuenta';
    if (window.confirm(`¿Estás seguro de eliminar la cuenta "${accName}"?`)) {
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

  return (
    <div className="space-y-6">
      
      {/* CUENTAS BANCARIAS Y EFECTIVO */}
      <section className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {(onBack || fromSettings) && (
              <button
                type="button"
                onClick={handleGoBack}
                className="w-9 h-9 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer border border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#121622] shadow-sm shrink-0"
                aria-label="Volver"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] sm:text-[20px] font-bold flex items-center gap-2 truncate" style={{ color: 'var(--text-main)' }}>
                <CreditCard className="w-5 h-5 text-[#007AFF] shrink-0" />
                <span>Cuentas y Métodos de Pago</span>
              </h2>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-normal">
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

        {/* Tarjetas de Cuenta Individuales (Estilo Fintech Bento) */}
        <div className="grid grid-cols-1 gap-3">
          {accountsWithBalance.map((acc, index) => (
            <AccountCard
              key={acc?.id || `acc-${index}`}
              account={acc}
              index={index}
              isFirst={index === 0}
              isLast={index === accountsWithBalance.length - 1}
              onMoveUp={() => handleMoveAccount(index, 'up')}
              onMoveDown={() => handleMoveAccount(index, 'down')}
              onEdit={() => setEditingAccount(acc)}
              onDelete={() => handleDeleteAccount(acc?.id)}
              onSelectCard={() => {
                if (onOpenCreditCardDetail) {
                  onOpenCreditCardDetail(acc);
                } else {
                  setLocalSelectedCard(acc);
                }
              }}
              transactions={transactions}
              trm={trm}
            />
          ))}

          {accounts.length === 0 && (
            <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No tienes cuentas registradas</p>
              <p className="text-xs mt-0.5">Usa el botón + arriba para agregar tu primera cuenta</p>
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
