import React from 'react';
import { Plus } from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import { 
  getAccountNativeBalance, 
  formatNativeCurrency 
} from '../../../utils/currencyUtils';

/**
 * TopAccountsWidget
 * Muestra las cuentas más destacadas con conversión de divisa, tarjetas e inversiones.
 */
export default function TopAccountsWidget({
  accounts = [],
  transactions = [],
  trm = 4000,
  formatMoney = (val) => `$${val}`,
  onAccountClick,
  onNavigateToTab,
  onOpenAccounts
}) {
  const topAccounts = Array.isArray(accounts) ? accounts.slice(0, 4) : [];
  const handleNavigate = () => {
    if (typeof onOpenAccounts === 'function') {
      onOpenAccounts();
    } else if (typeof onAccountClick === 'function') {
      onAccountClick('accounts');
    } else if (typeof onNavigateToTab === 'function') {
      onNavigateToTab('accounts');
    }
  };

  return (
    <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Mis cuentas
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {accounts.length} métodos y billeteras
          </p>
        </div>
        <button
          type="button"
          onClick={handleNavigate}
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors cursor-pointer"
        >
          Ver todas →
        </button>
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
              className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 hover:border-slate-300 dark:hover:border-white/20 shadow-sm transition-all flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                  <BrandIcon name={acc.name} type={acc.type} color={acc.color} size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate group-hover:text-emerald-500 transition-colors">
                      {acc.name}
                    </h4>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-white/[0.06]">
                      {acc.currency || 'COP'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    <span className="text-xs font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400">
                      {acc.type === 'bank' ? 'Bancaria' : acc.type === 'wallet' ? 'Billetera' : isCard ? 'Tarjeta' : isInvestment ? 'Inversión' : 'Efectivo'}
                    </span>
                    {isInvestment && shares > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                        • {shares} acc{unitPrice > 0 ? ` @ ${formatNativeCurrency(unitPrice, currency)}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                {isForeign && !isCard ? (
                  <>
                    <span className="text-xs sm:text-sm font-bold font-mono tracking-tight tabular-nums block text-slate-900 dark:text-zinc-100">
                      {formatNativeCurrency(currentBal, currency)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block tabular-nums">
                      ≈ $ {Math.round(copBal).toLocaleString('es-CO')} COP
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

      <button
        type="button"
        onClick={handleNavigate}
        className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-white/10 hover:border-emerald-500 text-slate-600 dark:text-slate-300 hover:text-emerald-500 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Gestionar cuentas</span>
      </button>
    </div>
  );
}
