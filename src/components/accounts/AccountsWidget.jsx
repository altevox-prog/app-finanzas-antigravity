import React, { useMemo } from 'react';
import { ArrowRight, Wallet, Plus, CreditCard } from 'lucide-react';
import BrandIcon from '../ui/BrandIcon';
import { getAccountNativeBalance, formatNativeCurrency, safeNumber } from '../../utils/currencyUtils';
import { usePrivacy } from '../../context/PrivacyContext';

/**
 * AccountsWidget: Bloque estático consolidado de liquidez y tarjetas de cuentas (Carrusel / Grid Monety)
 */
export default function AccountsWidget({
  accounts = [],
  transactions = [],
  trm = 4050,
  availableLiquidBalance: propLiquidBalance,
  onNavigateToTab = () => {},
  onOpenAccounts,
  setActiveTab,
  onSelectCreditCardDetail = () => {},
  formatMoney: propFormatMoney,
  isReordering = false
}) {
  const { formatMoney: privacyFormatMoney } = usePrivacy();
  const formatMoney = propFormatMoney || privacyFormatMoney;

  const accountList = Array.isArray(accounts) ? accounts : [];

  const isLiquidAccount = (acc) => {
    if (!acc) return false;
    const t = String(acc.type || '').toLowerCase();
    return !(t === 'card' || t === 'credit' || t === 'credit_card' || t === 'debt' || t === 'loan' || t === 'liability');
  };

  const liquidBalance = useMemo(() => {
    const liquidTotal = accountList.filter(isLiquidAccount).reduce((sum, acc) => {
      const balNative = safeNumber(getAccountNativeBalance(acc, transactions, trm));
      if (balNative <= 0) return sum;
      const currency = acc?.currency || 'COP';
      const rate = currency === 'USD' ? Number(trm || 4000) : currency === 'EUR' ? Math.round(Number(trm || 4000) * 1.08) : 1;
      return sum + (balNative * rate);
    }, 0);

    if (liquidTotal > 0) return liquidTotal;
    if (propLiquidBalance !== undefined && propLiquidBalance !== null && Number(propLiquidBalance) > 0) {
      return Number(propLiquidBalance);
    }
    return liquidTotal;
  }, [accountList, transactions, trm, propLiquidBalance]);

  const handleNavigateToAccounts = () => {
    if (isReordering) return;
    if (typeof onOpenAccounts === 'function') {
      onOpenAccounts();
    } else if (typeof onNavigateToTab === 'function') {
      onNavigateToTab('accounts');
    } else if (typeof setActiveTab === 'function') {
      setActiveTab('accounts');
    }
  };

  const handleCardClick = (acc) => {
    if (isReordering) return;
    if ((acc?.type === 'card' || acc?.type === 'credit') && typeof onSelectCreditCardDetail === 'function') {
      onSelectCreditCardDetail(acc);
    } else {
      handleNavigateToAccounts();
    }
  };

  return (
    <div className="w-full space-y-2 -mb-1 sm:-mb-1.5">
      {/* Cabecera del bloque estático de cuentas: KPI consolidado de liquidez + Subtexto */}
      <div 
        onClick={handleNavigateToAccounts}
        className="flex items-center justify-between px-0.5 cursor-pointer group select-none"
      >
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 group-hover:text-emerald-500 transition-colors">
            Saldo disponible
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-mono font-bold text-lg sm:text-xl text-slate-900 dark:text-white tabular-nums tracking-tight">
              {formatMoney(liquidBalance)}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 hidden xs:inline truncate">
              Total en cuentas a la vista
            </span>
          </div>
        </div>
      </div>

      {/* Contenedor de cuentas: Fila única horizontal continua con snap táctil y grid de 4 columnas en desktop */}
      <div 
        className={`flex flex-row items-stretch overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2.5 md:gap-3 pb-0 pt-0.5 px-0.5 w-full ${
          accountList.length <= 4 
            ? 'lg:grid lg:grid-cols-4 lg:overflow-x-visible' 
            : 'lg:flex lg:overflow-x-auto'
        }`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {accountList.length === 0 ? (
          <div 
            onClick={handleNavigateToAccounts}
            className="w-full sm:w-80 p-3 rounded-2xl border border-dashed border-slate-300 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 flex items-center justify-between gap-3 cursor-pointer hover:border-slate-400 dark:hover:border-white/20 transition-all group shrink-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                  Sin cuentas registradas
                </p>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                  Toca aquí para vincular tu primera cuenta
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 dark:text-zinc-400 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </div>
        ) : (
          accountList.map((acc, index) => {
            const currency = acc?.currency || 'COP';
            const isCreditCard = acc?.type === 'card' || acc?.type === 'credit';
            const isInvestment = acc?.type === 'investment';
            const isForeign = currency === 'USD' || currency === 'EUR';
            const balNative = getAccountNativeBalance(acc, transactions, trm);
            const shares = Number(acc?.shares || 0);
            const unitPrice = Number(acc?.unitPrice || 0);
            const rate = currency === 'USD' ? Number(trm || 4000) : currency === 'EUR' ? Math.round(Number(trm || 4000) * 1.08) : 1;
            const copBal = balNative * rate;

            const cardTxs = Array.isArray(transactions) ? transactions.filter(t => t?.accountId === acc?.id) : [];
            const initialDebt = acc?.initialBalance < 0 ? Math.abs(safeNumber(acc.initialBalance)) : 0;
            const initialCredit = acc?.initialBalance > 0 ? safeNumber(acc.initialBalance) : 0;
            const cardExpenses = cardTxs.filter(t => t?.type === 'expense').reduce((s, t) => s + safeNumber(t?.amount), 0);
            const cardPayments = cardTxs.filter(t => t?.type === 'income').reduce((s, t) => s + safeNumber(t?.amount), 0);
            const cardOutstandingDebt = isCreditCard ? Math.round(Math.max(0, (initialDebt + cardExpenses) - (initialCredit + cardPayments)) * 100) / 100 : 0;

            const typeLabel = 
              acc?.type === 'cash' ? 'Efectivo' :
              isCreditCard ? 'Tarjeta' :
              acc?.type === 'savings' ? 'Ahorros' :
              acc?.type === 'investment' ? 'Inversión' :
              acc?.type === 'wallet' ? 'Billetera' : 'Banco';

            return (
              <div 
                key={acc?.id || `acc-car-${index}`}
                onClick={() => handleCardClick(acc)}
                className={`${accountList.length === 1 ? 'w-full' : 'w-[calc((100%-0.625rem)/2)]'} shrink-0 snap-start md:w-56 lg:w-full py-3 px-3.5 sm:px-4 rounded-3xl border border-slate-200/60 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 flex flex-col justify-between shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] cursor-pointer active:scale-98 transition-all hover:border-slate-300 dark:hover:border-white/20 group`}
              >
                {/* Cabecera de la tarjeta: Logo + Tipo + Moneda */}
                <div className="flex items-center justify-between gap-1 mb-1 sm:mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="p-1 sm:p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0 overflow-hidden">
                      <BrandIcon 
                        name={acc?.name || 'Cuenta'} 
                        type={acc?.type}
                        size={16} 
                      />
                    </div>
                    <span 
                      className="text-[10.5px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 truncate max-w-[85px] sm:max-w-[95px] bg-slate-100 text-slate-600 dark:bg-zinc-800/80 dark:text-zinc-400 border border-slate-200/50 dark:border-white/[0.06]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: acc?.color || '#3b82f6' }} />
                      <span className="truncate">{typeLabel}</span>
                    </span>
                  </div>

                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-zinc-800/80 dark:text-zinc-400 border border-slate-200/50 dark:border-white/[0.06] shrink-0">
                    {currency}
                  </span>
                </div>

                {/* Detalle y Saldo */}
                <div className="min-w-0 mt-1 sm:mt-1.5">
                  <div className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-0.5 truncate leading-normal">
                    {acc?.name || 'Sin nombre'}
                  </div>

                  <div className={`text-lg sm:text-xl font-bold font-mono tracking-tight leading-tight tabular-nums truncate ${
                    isCreditCard 
                      ? (cardOutstandingDebt > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400') 
                      : balNative < 0 
                      ? 'text-rose-600 dark:text-rose-400' 
                      : 'text-slate-900 dark:text-zinc-100'
                  }`}>
                    {isCreditCard 
                      ? (cardOutstandingDebt > 0 ? `-${formatMoney(cardOutstandingDebt)}` : 'Sin deuda')
                      : isForeign
                      ? formatNativeCurrency(balNative, currency)
                      : formatMoney(balNative)
                    }
                  </div>

                  {isForeign && !isCreditCard && (
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono tracking-tight leading-none mt-1 truncate tabular-nums">
                      ≈ $ {Math.round(copBal).toLocaleString('es-CO')} COP
                    </div>
                  )}

                  {isInvestment && shares > 0 && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 truncate leading-none">
                      {shares} {shares === 1 ? 'acc' : 'accs'}{unitPrice > 0 ? ` @ ${formatNativeCurrency(unitPrice, currency)}` : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
