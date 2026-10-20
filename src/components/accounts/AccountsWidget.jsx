import React, { useMemo } from 'react';
import { ArrowRight, Wallet } from 'lucide-react';
import BrandIcon from '../ui/BrandIcon';
import { getAccountNativeBalance, formatNativeCurrency, safeNumber } from '../../utils/currencyUtils';
import { usePrivacy } from '../../context/PrivacyContext';

/**
 * AccountsWidget: Bloque estático consolidado de liquidez y tarjetas de cuentas (Carrusel / Grid)
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
  isReordering = false,
  showBalance,
  showBalances,
  isMasked
}) {
  const { isPrivacyMode, formatMoney: privacyFormatMoney } = usePrivacy();
  const formatMoney = propFormatMoney || privacyFormatMoney;
  const isVisible = showBalance !== undefined ? Boolean(showBalance) : showBalances !== undefined ? Boolean(showBalances) : isMasked !== undefined ? !isMasked : !isPrivacyMode;

  const accountList = Array.isArray(accounts) ? accounts : [];
  const isLiquidAccount = (acc) => acc && !['card', 'credit', 'credit_card', 'debt', 'loan', 'liability'].includes(String(acc.type || '').toLowerCase());

  const liquidBalance = useMemo(() => {
    const liquidTotal = accountList.filter(isLiquidAccount).reduce((sum, acc) => {
      const balNative = safeNumber(getAccountNativeBalance(acc, transactions, trm));
      if (balNative <= 0) return sum;
      const rate = acc?.currency === 'USD' ? Number(trm || 4000) : acc?.currency === 'EUR' ? Math.round(Number(trm || 4000) * 1.08) : 1;
      return sum + (balNative * rate);
    }, 0);

    return (liquidTotal > 0 || propLiquidBalance == null || Number(propLiquidBalance) <= 0) ? liquidTotal : Number(propLiquidBalance);
  }, [accountList, transactions, trm, propLiquidBalance]);

  const displayedAccounts = useMemo(() => {
    return [...accountList].sort((a, b) => (a?.order_index ?? 0) - (b?.order_index ?? 0)).slice(0, 4);
  }, [accountList]);

  const handleNavigateToAccounts = () => {
    if (isReordering) return;
    if (typeof onOpenAccounts === 'function') onOpenAccounts();
    else if (typeof onNavigateToTab === 'function') onNavigateToTab('accounts');
    else if (typeof setActiveTab === 'function') setActiveTab('accounts');
  };

  return (
    <div className="w-full space-y-2">
      {/* Cabecera del bloque estático de cuentas */}
      <div onClick={handleNavigateToAccounts} className="flex items-center justify-between px-0.5 cursor-pointer group select-none">
        <span className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase group-hover:text-emerald-500 transition-colors">
          SALDO DISPONIBLE
        </span>
        <div className="flex items-baseline gap-1.5 font-mono">
          <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-50 tabular-nums tracking-tight">
            {!isVisible ? '••••••' : formatMoney(liquidBalance)}
          </span>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">COP</span>
        </div>
      </div>

      {/* Contenedor de cuentas */}
      {displayedAccounts.length === 0 ? (
        <div 
          onClick={handleNavigateToAccounts}
          className="w-full min-h-[108px] p-4 rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 dark:border-white/[0.07] bg-white dark:bg-[#12151E] flex items-center justify-between gap-3.5 cursor-pointer hover:border-slate-400 dark:hover:border-emerald-500/40 transition-all group shrink-0"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.04] dark:border dark:border-white/[0.06] text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Sin cuentas</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Saldo disponible: {!isVisible ? '••••••' : formatMoney(0)}</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 opacity-70 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      ) : (
        <div className={`w-full grid gap-3 mt-3 ${displayedAccounts.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4'}`}>
          {displayedAccounts.map((acc, index) => {
            const currency = acc?.currency || 'COP';
            const isCreditCard = acc?.type === 'card' || acc?.type === 'credit';
            const isInvestment = acc?.type === 'investment';
            const isForeign = currency === 'USD' || currency === 'EUR';
            const balNative = getAccountNativeBalance(acc, transactions, trm);
            const shares = Number(acc?.shares || 0);
            const unitPrice = Number(acc?.unitPrice || 0);
            const rate = currency === 'USD' ? Number(trm || 4000) : currency === 'EUR' ? Math.round(Number(trm || 4000) * 1.08) : 1;
            const copBal = balNative * rate;

            // Cálculo condensado de tarjeta de crédito
            let cardDebt = 0;
            if (isCreditCard) {
              const seenTxIds = new Set();
              const cardTxs = (Array.isArray(transactions) ? transactions : []).filter(t => {
                if (!t || !acc?.id) return false;
                if (t.accountId !== acc.id && t.account_id !== acc.id && t.toAccountId !== acc.id && t.to_account_id !== acc.id && t.fromAccountId !== acc.id && t.from_account_id !== acc.id) return false;
                const txId = t?.id || t?._id;
                if (!txId || seenTxIds.has(txId)) return false;
                seenTxIds.add(txId);
                return true;
              });
              const rawInitial = safeNumber(acc?.initialBalance ?? acc?.initial_balance ?? 0);
              const initialDebt = rawInitial < 0 ? Math.abs(rawInitial) : 0;
              const initialCredit = rawInitial > 0 ? rawInitial : 0;
              const expenses = cardTxs.filter(t => t?.type === 'expense').reduce((s, t) => s + safeNumber(t?.amount), 0);
              const payments = cardTxs.filter(t => t?.type === 'income').reduce((s, t) => s + safeNumber(t?.amount), 0);
              cardDebt = Math.round(Math.max(0, (initialDebt + expenses) - (initialCredit + payments)) * 100) / 100;
            }

            const isDebtPos = cardDebt > 0;
            const balanceColor = !isVisible ? 'text-slate-900 dark:text-slate-50' : isCreditCard ? (isDebtPos ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400') : balNative < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-900 dark:text-slate-50';

            return (
              <div 
                key={acc?.id || `acc-car-${index}`}
                onClick={handleNavigateToAccounts}
                className={`w-full min-h-[116px] h-full p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#12151E] flex flex-col justify-between shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] cursor-pointer active:scale-98 transition-all hover:border-emerald-500/40 hover:dark:bg-[#151924] group ${
                  index >= 2 ? 'hidden md:flex' : 'flex'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 min-h-[40px]">
                  <div className="flex items-center justify-center shrink-0">
                    <BrandIcon name={acc?.name || 'Cuenta'} type={acc?.type} size={38} className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl select-none" />
                  </div>
                </div>

                <div className="min-w-0 mt-2 sm:mt-2.5">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5 truncate leading-normal">
                    {acc?.name || 'Sin nombre'}
                  </div>

                  <div className={`text-base sm:text-lg font-bold font-mono tracking-tight leading-tight tabular-nums whitespace-nowrap ${balanceColor}`}>
                    {!isVisible ? '••••••' : isCreditCard ? (isDebtPos ? `-${formatMoney(cardDebt)}` : 'Sin deuda') : isForeign ? formatNativeCurrency(balNative, currency) : formatMoney(balNative)}
                  </div>

                  {isForeign && !isCreditCard ? (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tight leading-none truncate tabular-nums mt-1">
                      {!isVisible ? '••••••' : `≈ ${formatMoney(copBal)} COP`}
                    </div>
                  ) : isInvestment && shares > 0 ? (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate leading-none mt-1">
                      {!isVisible ? '••••••' : `${shares} ${shares === 1 ? 'acc' : 'accs'}${unitPrice > 0 ? ` @ ${formatNativeCurrency(unitPrice, currency)}` : ''}`}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
