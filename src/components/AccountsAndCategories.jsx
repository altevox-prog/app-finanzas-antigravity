import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Wallet, 
  Building2, 
  Plus, 
  Trash2, 
  Pencil, 
  Check, 
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

  // Edit Account Form State
  const [editingAccount, setEditingAccount] = useState(null);
  const [editAccName, setEditAccName] = useState('');
  const [editAccType, setEditAccType] = useState('bank');
  const [editAccCurrency, setEditAccCurrency] = useState('COP');
  const [editAccBalance, setEditAccBalance] = useState('');
  const [editAccTicker, setEditAccTicker] = useState('');
  const [editAccShares, setEditAccShares] = useState('');
  const [editAccUnitPrice, setEditAccUnitPrice] = useState('');
  const [editAccCreditLimit, setEditAccCreditLimit] = useState('5000000');
  const [editAccPaymentDueDate, setEditAccPaymentDueDate] = useState('17');
  const [editAccClosingDate, setEditAccClosingDate] = useState('25');
  const [editAccColor, setEditAccColor] = useState('#007AFF');
  const [editAccIcon, setEditAccIcon] = useState('Building2');

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
  useBackHandler(Boolean(editingAccount), () => setEditingAccount(null));
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
    setEditAccName(acc.name);
    setEditAccType(normalizeAccountType(acc.type || 'bank'));
    setEditAccCurrency(acc.currency || 'COP');
    const rawVal = acc.initialBalance !== undefined && acc.initialBalance !== null
      ? acc.initialBalance
      : (acc.balance !== undefined && acc.balance !== null ? acc.balance : 0);
    const isEditCredit = normalizeAccountType(acc.type || 'bank') === 'credit';
    // Mostrar valor positivo en el input; al guardar se convertirá a negativo
    setEditAccBalance(String(Math.abs(rawVal)));
    setEditAccTicker(acc.ticker || '');
    setEditAccShares(acc.shares !== undefined ? String(acc.shares) : '');
    setEditAccUnitPrice(acc.unitPrice !== undefined ? String(acc.unitPrice) : '');
    setEditAccCreditLimit(acc.creditLimit !== undefined ? String(acc.creditLimit) : '5000000');
    setEditAccPaymentDueDate(acc.paymentDueDate !== undefined ? String(acc.paymentDueDate) : '17');
    setEditAccClosingDate(acc.closingDate !== undefined ? String(acc.closingDate) : '25');
    setEditAccColor(acc.color || '#007AFF');
    setEditAccIcon(acc.icon || (acc.type === 'cash' ? 'Wallet' : (acc.type === 'card' || acc.type === 'credit') ? 'CreditCard' : acc.type === 'savings' ? 'Smartphone' : acc.type === 'investment' ? 'TrendingUp' : 'Building2'));
  };

  // Save edited account
  const handleSaveEditAccount = (e) => {
    e.preventDefault();
    if (!editingAccount || !editAccName.trim()) return;

    const isInvestment = editAccType === 'investment';
    const isCreditEdit = normalizeAccountType(editAccType) === 'credit';
    const sharesNum = isInvestment && editAccShares ? parseFloat(editAccShares) : undefined;
    const unitPriceNum = isInvestment && editAccUnitPrice ? parseFloat(editAccUnitPrice) : undefined;
    let initBal = parseFloat(editAccBalance) || 0;
    if (isInvestment && sharesNum && unitPriceNum && (!editAccBalance || parseFloat(editAccBalance) === 0)) {
      initBal = sharesNum * unitPriceNum;
    }
    // Las tarjetas de crédito almacenan el saldo como deuda (negativo)
    if (isCreditEdit && initBal > 0) {
      initBal = -Math.abs(initBal);
    }

    const normalizedType = normalizeAccountType(editAccType);
    const numericBalance = parseFloat(initBal) || 0;
    const updated = {
      ...editingAccount,
      name: editAccName.trim(),
      type: normalizedType,
      currency: editAccCurrency || 'COP',
      balance: numericBalance,
      initial_balance: numericBalance,
      current_balance: numericBalance,
      initialBalance: numericBalance,
      currentBalance: numericBalance,
      color: editAccColor,
      icon: editAccIcon,
      ...(normalizedType === 'credit' || editAccType === 'card' ? {
        creditLimit: parseFloat(editAccCreditLimit) || 5000000,
        paymentDueDate: parseInt(editAccPaymentDueDate, 10) || 17,
        closingDate: editAccClosingDate ? parseInt(editAccClosingDate, 10) : undefined
      } : {}),
      ...(isInvestment ? {
        ticker: editAccTicker.trim().toUpperCase(),
        shares: sharesNum,
        unitPrice: unitPriceNum
      } : {})
    };

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
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-[#12141C] rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] shadow-2xl overflow-hidden animate-slide-up">
            {/* Cabecera FIJA */}
            <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BrandIcon name={editAccName} size={32} type={editAccType} />
                <div>
                  <h3 className="font-semibold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                    Editar cuenta / método de pago
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Personaliza el nombre, tipo y saldo de tu cuenta
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditAccount} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Cuerpo con SCROLL interno automático */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 overscroll-contain">
                {/* Tarjeta de VISTA PREVIA EN VIVO (Estilo Tarjeta Fintech Binance) */}
                <div className="rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 p-4 transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                        <BrandIcon name={editAccName} size={40} type={editAccType} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] tracking-wider font-semibold text-slate-400 uppercase">
                            Vista previa
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {editAccCurrency}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white truncate leading-tight">
                          {editAccName.trim() || 'Nombre de la cuenta'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {editAccType === 'cash' ? 'Efectivo' : (editAccType === 'card' || editAccType === 'credit') ? 'Tarjeta de crédito' : editAccType === 'savings' ? 'Ahorros / billetera digital' : editAccType === 'investment' ? 'Inversión / acciones' : 'Banco / débito'}
                        </p>
                        {editAccType === 'investment' && parseFloat(editAccShares) > 0 && (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                            {editAccTicker ? `${editAccTicker} · ` : ''}{editAccShares} {parseFloat(editAccShares) === 1 ? 'acción' : 'acciones'} @ {formatNativeCurrency(parseFloat(editAccUnitPrice) || 0, editAccCurrency)} c/u
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] tracking-wider font-semibold text-slate-400 uppercase block mb-0.5">
                        {(editAccType === 'card' || editAccType === 'credit') ? 'Deuda / Saldo utilizado' : 'Saldo base'}
                      </span>
                      <span className={`text-lg sm:text-xl font-bold tabular-nums block ${
                        (editAccType === 'card' || editAccType === 'credit') && (parseFloat(editAccBalance) || 0) > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-900 dark:text-white'
                      }`}>
                        {(editAccType === 'card' || editAccType === 'credit') && (parseFloat(editAccBalance) || 0) > 0
                          ? `-${formatNativeCurrency(parseFloat(editAccBalance) || 0, editAccCurrency)}`
                          : formatNativeCurrency(parseFloat(editAccBalance) || 0, editAccCurrency)
                        }
                      </span>
                      {editAccCurrency !== 'COP' && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                          ≈ $ {Math.round(convertToCOP(parseFloat(editAccBalance) || 0, editAccCurrency, trm)).toLocaleString('es-CO')} COP
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Selector de Moneda Principal en Edición */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Divisa principal de la cuenta *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { code: 'COP', label: '$ COP' },
                      { code: 'USD', label: '$ USD' },
                      { code: 'EUR', label: '€ EUR' }
                    ].map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setEditAccCurrency(item.code)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                          editAccCurrency === item.code
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
                            : 'border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre de la cuenta o método *
                  </label>
                  <input
                    type="text"
                    required
                    value={editAccName}
                    onChange={(e) => setEditAccName(e.target.value)}
                    className="w-full text-sm font-bold px-3.5 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white"
                    placeholder="ej: Bancolombia, Nequi, Daviplata, Efectivo..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tipo de método *
                    </label>
                    <select
                      value={editAccType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditAccType(val);
                        if (val === 'cash') setEditAccIcon('Wallet');
                        else if (val === 'card' || val === 'credit') setEditAccIcon('CreditCard');
                        else if (val === 'savings') setEditAccIcon('Smartphone');
                        else if (val === 'investment') setEditAccIcon('TrendingUp');
                        else setEditAccIcon('Building2');
                      }}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white"
                    >
                      <option value="bank">Banco / débito</option>
                      <option value="cash">Efectivo</option>
                      <option value="credit">Tarjeta de crédito</option>
                      <option value="savings">Ahorros / billetera digital</option>
                      <option value="investment">Inversión / acciones</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                      {(editAccType === 'card' || editAccType === 'credit')
                        ? 'Deuda actual / Saldo utilizado (opcional)'
                        : `Saldo inicial (${editAccCurrency}) *`
                      }
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      required
                      placeholder="0"
                      value={editAccBalance}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditAccBalance(e.target.value)}
                      className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono font-bold tabular-nums"
                    />
                  </div>
                </div>

                {/* Campos específicos si es Inversión / Acciones en Edición */}
                {editAccType === 'investment' && (
                  <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-3 animate-fadeIn">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <TrendingUp className="w-4 h-4" />
                      <span>Detalles de Acciones / Títulos (Opcional)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Ticker / Activo
                        </label>
                        <input
                          type="text"
                          placeholder="ej: CSPX, VOO, Apple"
                          value={editAccTicker}
                          onChange={(e) => setEditAccTicker(e.target.value.toUpperCase())}
                          className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Nº Acciones / Títulos
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="ej: 15.5"
                          value={editAccShares}
                          onChange={(e) => {
                            const sh = e.target.value;
                            setEditAccShares(sh);
                            const p = parseFloat(editAccUnitPrice) || 0;
                            if (parseFloat(sh) > 0 && p > 0) {
                              setEditAccBalance(String((parseFloat(sh) * p).toFixed(2)));
                            }
                          }}
                          className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Precio Unitario ({editAccCurrency})
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="ej: 450.00"
                          value={editAccUnitPrice}
                          onChange={(e) => {
                            const p = e.target.value;
                            setEditAccUnitPrice(p);
                            const sh = parseFloat(editAccShares) || 0;
                            if (sh > 0 && parseFloat(p) > 0) {
                              setEditAccBalance(String((sh * parseFloat(p)).toFixed(2)));
                            }
                          }}
                          className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    {parseFloat(editAccShares) > 0 && parseFloat(editAccUnitPrice) > 0 && (
                      <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-white/80 dark:bg-black/40 px-3 py-1.5 rounded-lg border border-emerald-500/20 flex items-center justify-between">
                        <span>Valor Posición ({editAccShares} × {formatNativeCurrency(parseFloat(editAccUnitPrice), editAccCurrency)}):</span>
                        <strong className="font-bold tabular-nums">
                          {formatNativeCurrency(parseFloat(editAccShares) * parseFloat(editAccUnitPrice), editAccCurrency)}
                        </strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Campos especiales si es Tarjeta de Crédito */}
                {(editAccType === 'card' || editAccType === 'credit') && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-zinc-800/40 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Cupo Total ($ COP) *</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="1"
                        required
                        placeholder="5000000"
                        value={editAccCreditLimit}
                        onChange={(e) => setEditAccCreditLimit(e.target.value)}
                        className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono font-bold tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Día Límite de Pago *</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="31"
                        required
                        placeholder="ej: 17"
                        value={editAccPaymentDueDate}
                        onChange={(e) => setEditAccPaymentDueDate(e.target.value)}
                        className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Día de Corte (Opcional)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="31"
                        placeholder="ej: 25"
                        value={editAccClosingDate}
                        onChange={(e) => setEditAccClosingDate(e.target.value)}
                        className="w-full h-11 text-xs sm:text-sm px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-mono tabular-nums"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pie de página FIJO SIEMPRE VISIBLE */}
              <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-[#181B26] border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Estás seguro de eliminar la cuenta "${editingAccount.name}"?`)) {
                      onDeleteAccount(editingAccount.id);
                      setEditingAccount(null);
                    }
                  }}
                  className="px-3.5 py-2.5 text-xs font-semibold text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-xl transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAccount(null)}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold bg-[#007AFF] hover:bg-blue-600 text-white rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar Cuenta</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
