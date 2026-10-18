import React from 'react';
import BrandIcon from '../../ui/BrandIcon';
import { 
  getAccountNativeBalance, 
  formatNativeCurrency 
} from '../../../utils/currencyUtils';
import { usePrivacy } from '../../../context/PrivacyContext';

/**
 * TopAccountsWidget
 * Muestra las cuentas más destacadas con conversión de divisa, tarjetas e inversiones.
 */
export default function TopAccountsWidget({
  accounts = [],
  transactions = [],
  trm = 4000,
  formatMoney: propFormatMoney,
  onAccountClick,
  onNavigateToTab,
  onOpenAccounts,
  isReordering = false,
  showBalance,
  showBalances,
  isMasked
}) {
  const { isPrivacyMode, formatMoney: privacyFormatMoney } = usePrivacy();
  const formatMoney = propFormatMoney || privacyFormatMoney;
  const isVisible = showBalance !== undefined
    ? Boolean(showBalance)
    : showBalances !== undefined
    ? Boolean(showBalances)
    : isMasked !== undefined
    ? !isMasked
    : !isPrivacyMode;
  const topAccounts = Array.isArray(accounts) ? accounts.slice(0, 4) : [];
  const handleNavigate = () => {
    if (isReordering) return;
    if (typeof onOpenAccounts === 'function') {
      onOpenAccounts();
    } else if (typeof onAccountClick === 'function') {
      onAccountClick('accounts');
    } else if (typeof onNavigateToTab === 'function') {
      onNavigateToTab('accounts');
    }
  };

  return (
    <div 
      onClick={handleNavigate}
      className="lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-4 hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer active:scale-[0.99] group"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Mis cuentas
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {accounts.length} métodos y billeteras
          </p>
        </div>
      </div>

      {/* Lista de Cuentas */}
      <div className="space-y-2.5">
        {topAccounts.map((acc) => {
          const currency = acc?.currency || 'COP';
          const isCard = acc?.type === 'card' || acc?.type === 'credit';
          const isInvestment = acc?.type === 'investment';
          const isForeign = currency === 'USD' || currency === 'EUR';
          const currentBal = getAccountNativeBalance(acc, transactions, trm);
          const shares = Number(acc?.shares || 0);
          const unitPrice = Number(acc?.unitPrice || 0);
          const rate = currency === 'USD' ? Number(trm || 4000) : currency === 'EUR' ? Math.round(Number(trm || 4000) * 1.08) : 1;
          const copBal = currentBal * rate;

          return (
            <div
              key={acc.id}
              onClick={handleNavigate}
              className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#12151E] hover:border-emerald-500/40 hover:dark:bg-[#151924] shadow-sm transition-all flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center shrink-0">
                  <BrandIcon 
                    name={acc.name} 
                    type={acc.type} 
                    color={acc.color} 
                    size={38} 
                    className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl select-none shrink-0" 
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-500 transition-colors">
                    {acc.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      {acc.type === 'bank' ? 'Bancaria' : acc.type === 'wallet' ? 'Billetera' : isCard ? 'Tarjeta' : isInvestment ? 'Inversión' : 'Efectivo'}
                    </span>
                    {isInvestment && shares > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                        • {shares} acc{!isVisible ? '' : unitPrice > 0 ? ` @ ${formatNativeCurrency(unitPrice, currency)}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                {!isVisible ? (
                  <span className="text-xs sm:text-sm font-bold font-mono tracking-tight tabular-nums block text-slate-900 dark:text-slate-50">
                    ••••••
                  </span>
                ) : isForeign && !isCard ? (
                  <>
                    <span className="text-xs sm:text-sm font-bold font-mono tracking-tight tabular-nums block text-slate-900 dark:text-zinc-100">
                      {formatNativeCurrency(currentBal, currency)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block tabular-nums">
                      ≈ {formatMoney(copBal)} COP
                    </span>
                  </>
                ) : isCard ? (
                  <>
                    <span className={`text-xs sm:text-sm font-bold font-mono tracking-tight tabular-nums block ${
                      currentBal < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {currentBal < 0 ? `-${formatMoney(Math.abs(currentBal))}` : 'Sin deuda'}
                    </span>
                    {acc.creditLimit && (
                      <span className="text-[10px] text-zinc-500 font-mono tabular-nums block">
                        Cupo: {formatMoney(acc.creditLimit)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className={`text-xs sm:text-sm font-bold font-mono tracking-tight tabular-nums block ${
                    currentBal < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-zinc-100'
                  }`}>
                    {formatMoney(currentBal)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
