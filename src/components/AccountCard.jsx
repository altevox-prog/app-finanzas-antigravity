import React from 'react';
import { ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import BrandIcon from './BrandIcon';
import { 
  getAccountNativeBalance, 
  formatNativeCurrency, 
  convertToCOP,
  safeNumber 
} from '../utils/currencyUtils';

export default function AccountCard({
  account,
  transactions = [],
  trm = 4050,
  formatMoney = (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
  onClick,
  onEdit,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false
}) {
  try {
    // 1. Solución Defensiva con Optional Chaining y Valores por Defecto
    const currency = account?.currency || 'COP';
    const balance = Number(account?.balance ?? account?.initialBalance ?? 0);
    const shares = Number(account?.shares || 0);
    const unitPrice = Number(account?.unitPrice || 0);

    const isCreditCard = account?.type === 'card' || account?.type === 'credit';
    const isInvestment = account?.type === 'investment';
    const isForeignCurrency = currency === 'USD' || currency === 'EUR';

    // Saldo nativo y conversión a COP
    const currentBalance = getAccountNativeBalance(account, transactions, trm);
    const rate = currency === 'USD' ? Number(trm || 4000) : currency === 'EUR' ? Math.round(Number(trm || 4000) * 1.08) : 1;
    const balanceInCop = isForeignCurrency ? convertToCOP(currentBalance, currency, trm) : currentBalance;

    const typeLabel = 
      account?.type === 'cash' ? 'Efectivo' :
      (account?.type === 'card' || account?.type === 'credit') ? 'Tarjeta de Crédito' :
      account?.type === 'savings' ? 'Ahorros' :
      account?.type === 'investment' ? 'Inversión / Acciones' : 'Cuenta Bancaria';

    // Cálculos específicos para Tarjeta de Crédito
    const cardTxs = Array.isArray(transactions) ? transactions.filter(t => t?.accountId === account?.id) : [];
    const initialDebt = balance < 0 ? Math.abs(balance) : 0;
    const initialCredit = balance > 0 ? balance : 0;
    const totalExpenses = cardTxs.filter(t => t?.type === 'expense').reduce((s, t) => s + safeNumber(t?.amount), 0);
    const totalPayments = cardTxs.filter(t => t?.type === 'income').reduce((s, t) => s + safeNumber(t?.amount), 0);
    const saldoRestante = Math.round(Math.max(0, (initialDebt + totalExpenses) - (initialCredit + totalPayments)) * 100) / 100;

    return (
      <div
        onClick={onClick}
        className={`p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#12141C] border border-slate-200/80 dark:border-white/10 shadow-xs transition-all ${
          isCreditCard ? 'cursor-pointer hover:border-slate-300 dark:hover:border-white/20 active:scale-[0.995]' : 'hover:border-slate-300 dark:hover:border-white/15'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Logo / Marca */}
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
            <BrandIcon 
              name={account?.name || 'Cuenta'} 
              size={40} 
              type={account?.type}
            />
          </div>

          {/* Datos principales */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-900 dark:text-white text-base truncate leading-snug">
                {account?.name || 'Sin nombre'}
              </h4>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 shrink-0">
                {currency}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="inline-block text-xs text-slate-500 dark:text-slate-400 font-medium">
                {typeLabel}
              </span>
              {isInvestment && shares > 0 && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                  • {account?.ticker ? `${account.ticker} · ` : ''}{shares} {shares === 1 ? 'acción' : 'acciones'}{unitPrice > 0 ? ` @ ${formatNativeCurrency(unitPrice, currency)} c/u` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Saldo y controles */}
          <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
            <div className="text-right">
              {isCreditCard ? (
                <span className={`font-bold text-lg tabular-nums block ${
                  saldoRestante > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {saldoRestante > 0 ? `-${formatMoney(saldoRestante)}` : formatMoney(0)}
                </span>
              ) : isForeignCurrency ? (
                <>
                  <span className="font-bold text-base sm:text-lg tabular-nums block text-slate-900 dark:text-white">
                    {formatNativeCurrency(currentBalance, currency)}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block tabular-nums">
                    ≈ $ {Math.round(balanceInCop).toLocaleString('es-CO')} COP
                  </span>
                </>
              ) : (
                <span className={`font-bold text-lg tabular-nums block ${
                  currentBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                }`}>
                  {formatMoney(currentBalance)}
                </span>
              )}
            </div>

            {/* Controles de reordenamiento ↑ y ↓ */}
            {(onMoveUp || onMoveDown) && (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  disabled={isFirst}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMoveUp) onMoveUp();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                  title="Subir posición"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isLast}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMoveDown) onMoveDown();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                  title="Bajar posición"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Botón de editar */}
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(account);
                }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Editar cuenta"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error renderizando AccountCard:', error, account);
    return (
      <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-500">
        {account?.name || 'Cuenta'} • {account?.currency || 'COP'}
      </div>
    );
  }
}
