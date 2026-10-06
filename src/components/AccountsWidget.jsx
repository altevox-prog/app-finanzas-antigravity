import React from 'react';
import { ArrowRight, Wallet, Plus, CreditCard } from 'lucide-react';
import BrandIcon from './BrandIcon';
import { getAccountNativeBalance, formatNativeCurrency, safeNumber } from '../utils/currencyUtils';

/**
 * AccountsWidget: Galería horizontal deslizable de cuentas y métodos de pago (Carrusel Monety)
 */
export default function AccountsWidget({
  accounts = [],
  transactions = [],
  trm = 4050,
  onNavigateToTab = () => {},
  onSelectCreditCardDetail = () => {},
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`
}) {
  const accountList = Array.isArray(accounts) ? accounts : [];
  const isTwoAccounts = accountList.length === 2;
  const isThreeOrMore = accountList.length >= 3;

  // En PC (md: en adelante): 2 columnas al 100% alineadas con el Dashboard si hay 2 cuentas, o 3 columnas si hay 3 o más
  // En Móvil (< md): carrusel horizontal táctil (flex overflow-x-auto snap-x gap-3)
  const containerResponsiveClasses = isTwoAccounts
    ? "md:grid md:grid-cols-2 md:gap-4 w-full md:overflow-visible"
    : isThreeOrMore
    ? "md:grid md:grid-cols-3 md:gap-4 w-full md:overflow-visible"
    : "w-full md:flex md:gap-4";

  const cardResponsiveClasses = accountList.length === 1
    ? "w-full min-w-0 md:w-full"
    : (isTwoAccounts || isThreeOrMore)
    ? "w-[calc(50%-5px)] min-w-[calc(50%-5px)] sm:w-[calc(50%-6px)] sm:min-w-[calc(50%-6px)] md:w-full md:min-w-0 md:shrink"
    : "w-[calc(50%-5px)] min-w-[calc(50%-5px)] sm:w-[260px] sm:min-w-[260px] md:w-[280px]";

  return (
    <div className="w-full space-y-2.5">
      {/* Header del widget */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] sm:text-[16px] font-bold tracking-tight text-slate-900 dark:text-white">
            Mis Cuentas
          </h3>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {accountList.length} {accountList.length === 1 ? 'cuenta' : 'cuentas'}
          </span>
        </div>
      </div>

      {/* Galería horizontal deslizable con no-scrollbar en móvil / grid alineado en PC */}
      <div 
        className={`flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-1.5 pt-0.5 px-0.5 ${containerResponsiveClasses}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {accountList.length === 0 ? (
          <div 
            onClick={() => onNavigateToTab('accounts')}
            className="w-full sm:w-[320px] p-4 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-white/50 dark:bg-[#101C18]/60 flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-500/50 dark:hover:border-[#29D691]/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-[#29D691]/15 text-emerald-600 dark:text-[#29D691] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Sin cuentas registradas
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Toca aquí para vincular tu primera cuenta
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-500 dark:text-[#29D691] opacity-70 group-hover:translate-x-0.5 transition-transform" />
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
                onClick={() => {
                  if (isCreditCard) {
                    onSelectCreditCardDetail(acc);
                  } else {
                    onNavigateToTab('accounts');
                  }
                }}
                className={`shrink-0 snap-start ${cardResponsiveClasses} p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-[#1A2F28] bg-white dark:bg-[#101C18] flex flex-col justify-between shadow-xs hover:shadow-md cursor-pointer active:scale-98 transition-all hover:border-emerald-500/50 dark:hover:border-[#29D691]/50 group`}
              >
                {/* Cabecera de la tarjeta: Logo + Tipo + Moneda */}
                <div className="flex items-center justify-between gap-1 mb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      <BrandIcon 
                        name={acc?.name || 'Cuenta'} 
                        type={acc?.type}
                        size={22} 
                      />
                    </div>
                    <span 
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 truncate max-w-[85px] bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300"
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: acc?.color || '#29D691' }} />
                      <span className="truncate">{typeLabel}</span>
                    </span>
                  </div>

                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 shrink-0">
                    {currency}
                  </span>
                </div>

                {/* Detalle y Saldo */}
                <div className="min-w-0">
                  <div className="text-[13px] sm:text-[14px] font-bold text-slate-800 dark:text-slate-200 truncate leading-snug group-hover:text-emerald-600 dark:group-hover:text-[#29D691] transition-colors">
                    {acc?.name || 'Sin nombre'}
                  </div>

                  <div className={`text-[15px] sm:text-[17px] font-black mt-1 tracking-tight leading-none tabular-nums truncate ${
                    isCreditCard 
                      ? (cardOutstandingDebt > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-[#29D691]') 
                      : balNative < 0 
                      ? 'text-rose-500 dark:text-rose-400' 
                      : 'text-slate-900 dark:text-white'
                  }`}>
                    {isCreditCard 
                      ? (cardOutstandingDebt > 0 ? `-${formatMoney(cardOutstandingDebt)}` : 'Sin deuda')
                      : isForeign
                      ? formatNativeCurrency(balNative, currency)
                      : formatMoney(balNative)
                    }
                  </div>

                  {isForeign && !isCreditCard && (
                    <div className="text-[10px] text-slate-400 font-medium mt-1 truncate tabular-nums">
                      ≈ $ {Math.round(copBal).toLocaleString('es-CO')} COP
                    </div>
                  )}

                  {isInvestment && shares > 0 && (
                    <div className="text-[10px] text-emerald-600 dark:text-[#29D691] font-semibold mt-1 truncate">
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
