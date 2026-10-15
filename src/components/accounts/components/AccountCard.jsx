import React from 'react';
import BrandIcon from '../../ui/BrandIcon';
import { usePrivacy } from '../../../context/PrivacyContext';
import { 
  formatNativeCurrency, 
  safeNumber 
} from '../../../utils/currencyUtils';

/**
 * AccountCard
 * Tarjeta individual limpia de cuenta bancaria, efectivo, inversión o tarjeta de crédito.
 * Estilo Fintech Bento interactiva con saldo en divisa nativa y equivalente en COP.
 * Sin botones redundantes de flechas, lápiz o papelera (gestionados vía Swipe y Long-Press).
 */
export default function AccountCard({
  account,
  index,
  onEdit,
  onDelete,
  onSelectCard,
  transactions = [],
  trm = 4050
}) {
  const { formatMoney } = usePrivacy();

  if (!account) return null;

  const currency = account?.currency || 'COP';
  const balance = Number(account?.currentBalance ?? (account?.balance ?? (account?.initialBalance ?? 0)));
  const shares = Number(account?.shares || 0);
  const unitPrice = Number(account?.unitPrice || 0);
  const rate = currency === 'USD' ? Number(trm || 4000) : currency === 'EUR' ? Math.round(Number(trm || 4000) * 1.08) : 1;
  const balanceInCop = Number(account?.copEquivalent) || (balance * rate);

  const isCreditCard = account?.type === 'card' || account?.type === 'credit';
  const isInvestment = account?.type === 'investment';
  const isForeignCurrency = currency === 'USD' || currency === 'EUR';

  const typeLabel = 
    account?.type === 'cash' ? 'Efectivo' :
    (account?.type === 'card' || account?.type === 'credit') ? 'Tarjeta de Crédito' :
    account?.type === 'savings' ? 'Ahorros' :
    account?.type === 'investment' ? 'Inversión / Acciones' : 'Cuenta Bancaria';

  // Cálculos específicos para Tarjeta de Crédito
  const cardTxs = Array.isArray(transactions) 
    ? transactions.filter(t => t?.accountId === account?.id || t?.account === account?.name) 
    : [];
  const initialDebt = balance < 0 ? Math.abs(balance) : 0;
  const initialCredit = balance > 0 ? balance : 0;
  const totalExpenses = cardTxs.filter(t => t?.type === 'expense').reduce((s, t) => s + safeNumber(t?.amount), 0);
  const totalPayments = cardTxs.filter(t => t?.type === 'income').reduce((s, t) => s + safeNumber(t?.amount), 0);
  const saldoRestante = Math.max(0, (initialDebt + totalExpenses) - (initialCredit + totalPayments));
  const creditLimit = Number(account?.creditLimit) || 5000000;
  const cupoDisponible = Math.max(0, creditLimit - saldoRestante);

  const handleCardClick = () => {
    if (isCreditCard && onSelectCard) {
      onSelectCard(account);
    } else if (onEdit) {
      onEdit(account);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm transition-all cursor-pointer hover:border-slate-300 dark:hover:border-white/20 active:scale-[0.995]"
    >
      {/* Fila superior (Cabecera): Icono, Nombre, Badges */}
      <div className="flex items-center justify-between gap-2">
        {/* Izquierda: Contenedor de icono + Nombre + Badges */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 shrink-0 flex items-center justify-center">
            <BrandIcon 
              name={account?.name || 'Cuenta'} 
              size={22} 
              type={account?.type}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100 truncate leading-snug">
                {account?.name || 'Sin nombre'}
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
                • {account?.ticker ? `${account.ticker} · ` : ''}{shares} {shares === 1 ? 'acción' : 'acciones'}{unitPrice > 0 ? ` @ ${formatNativeCurrency(unitPrice, currency)} c/u` : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fila inferior (Cuerpo de saldo): Contenedor con mt-3 */}
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
            Corte: día {account.closingDate || account.paymentDueDate || 17} • Pago: día {account.paymentDueDate || 17}
          </span>
        </div>
      )}
    </div>
  );
}
