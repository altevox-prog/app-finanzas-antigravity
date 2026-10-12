import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Wallet, 
  Building2, 
  Plus, 
  Pencil, 
  X,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  DollarSign,
  ArrowLeft
} from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { useBackHandler } from '../hooks/useBackHandler';
import CreditCardDetailModal from './CreditCardDetailModal';
import AddAccountModal from './accounts/modals/AddAccountModal';
import EditAccountModal from './accounts/modals/EditAccountModal';
import BrandIcon from './BrandIcon';
import { 
  getAccountNativeBalance, 
  formatNativeCurrency, 
  convertToCOP,
  safeNumber
} from '../utils/currencyUtils';
import { normalizeAccountType } from '../services/syncEngine';

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
          {accountsWithBalance.map((acc, index) => {
            const currency = acc?.currency || 'COP';
            const balance = Number(acc?.currentBalance ?? (acc?.balance ?? (acc?.initialBalance ?? 0)));
            const shares = Number(acc?.shares || 0);
            const unitPrice = Number(acc?.unitPrice || 0);
            const rate = currency === 'USD' ? Number(trm || 4000) : currency === 'EUR' ? Math.round(Number(trm || 4000) * 1.08) : 1;
            const balanceInCop = Number(acc?.copEquivalent) || (balance * rate);

            const isCreditCard = acc?.type === 'card' || acc?.type === 'credit';
            const isInvestment = acc?.type === 'investment';
            const isForeignCurrency = currency === 'USD' || currency === 'EUR';

            const typeLabel = 
              acc?.type === 'cash' ? 'Efectivo' :
              (acc?.type === 'card' || acc?.type === 'credit') ? 'Tarjeta de Crédito' :
              acc?.type === 'savings' ? 'Ahorros' :
              acc?.type === 'investment' ? 'Inversión / Acciones' : 'Cuenta Bancaria';

            // Cálculos específicos para Tarjeta de Crédito
            const cardTxs = Array.isArray(transactions) ? transactions.filter(t => t?.accountId === acc?.id) : [];
            const initialDebt = balance < 0 ? Math.abs(balance) : 0;
            const initialCredit = balance > 0 ? balance : 0;
            const totalExpenses = cardTxs.filter(t => t?.type === 'expense').reduce((s, t) => s + safeNumber(t?.amount), 0);
            const totalPayments = cardTxs.filter(t => t?.type === 'income').reduce((s, t) => s + safeNumber(t?.amount), 0);
            const saldoRestante = Math.max(0, (initialDebt + totalExpenses) - (initialCredit + totalPayments));
            const creditLimit = Number(acc?.creditLimit) || 5000000;
            const cupoDisponible = Math.max(0, creditLimit - saldoRestante);

            const handleCardClick = () => {
              if (isCreditCard) {
                if (onOpenCreditCardDetail) {
                  onOpenCreditCardDetail(acc);
                } else {
                  setLocalSelectedCard(acc);
                }
              }
            };

            return (
              <div
                key={acc?.id || `acc-${index}`}
                onClick={isCreditCard ? handleCardClick : undefined}
                className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm transition-all ${
                  isCreditCard ? 'cursor-pointer hover:border-slate-300 dark:hover:border-white/20 active:scale-[0.995]' : 'hover:border-slate-300 dark:hover:border-white/15'
                }`}
              >
                {/* Fila superior (Cabecera): Icono, Nombre, Badges a la izquierda; Controles a la derecha */}
                <div className="flex items-center justify-between gap-2">
                  {/* Izquierda: Contenedor de icono + Nombre + Badges */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 shrink-0 flex items-center justify-center">
                      <BrandIcon 
                        name={acc?.name || 'Cuenta'} 
                        size={22} 
                        type={acc?.type}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100 truncate leading-snug">
                          {acc?.name || 'Sin nombre'}
                        </h4>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-white/[0.06] shrink-0">
                          {currency}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 shrink-0">
                          {typeLabel}
                        </span>
                      </div>
                      {isInvestment && shares > 0 && (
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                          • {acc?.ticker ? `${acc.ticker} · ` : ''}{shares} {shares === 1 ? 'acción' : 'acciones'}{unitPrice > 0 ? ` @ ${formatNativeCurrency(unitPrice, currency)} c/u` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Derecha: Controles de reordenar + botón de editar */}
                  <div className="shrink-0 flex items-center gap-1">
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveAccount(index, 'up');
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                        title="Subir posición"
                        aria-label="Subir posición"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === accountsWithBalance.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveAccount(index, 'down');
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                        title="Bajar posición"
                        aria-label="Bajar posición"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditAccount(acc);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                      title="Editar cuenta"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Fila inferior (Cuerpo de saldo): Contenedor independiente con mt-3 sin colisiones */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex items-baseline justify-between gap-2 flex-wrap">
                  <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                    {isCreditCard ? 'Saldo utilizado / Deuda' : 'Saldo disponible'}
                  </span>
                  <div className="text-right">
                    {isCreditCard ? (
                      <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums block ${
                        saldoRestante > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {saldoRestante > 0 ? `-${formatMoney(saldoRestante)}` : formatMoney(0)}
                      </span>
                    ) : isForeignCurrency ? (
                      <>
                        <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums block">
                          {formatNativeCurrency(balance, currency)}
                        </span>
                        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 font-mono tracking-tight block tabular-nums">
                          ≈ $ {Math.round(balanceInCop).toLocaleString('es-CO')} COP
                        </span>
                      </>
                    ) : (
                      <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums block ${
                        balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-zinc-100'
                      }`}>
                        {formatMoney(balance)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Si es Tarjeta de Crédito: cupo disponible y deuda visible */}
                {isCreditCard && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-zinc-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span>Cupo disponible:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold font-mono tabular-nums">
                        {formatMoney(cupoDisponible)}
                      </strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span>Deuda:</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-bold font-mono tabular-nums">
                        {saldoRestante > 0 ? formatMoney(saldoRestante) : formatMoney(0)}
                      </strong>
                    </span>
                    <span className="tabular-nums shrink-0 text-zinc-500 text-[11px] sm:text-xs hidden sm:inline">
                      Corte: día {acc.closingDate || acc.paymentDueDate || 17} • Pago: día {acc.paymentDueDate || 17}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

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
