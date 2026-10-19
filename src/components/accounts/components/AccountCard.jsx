import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import { usePrivacy } from '../../../context/PrivacyContext';
import { 
  formatNativeCurrency, 
  safeNumber 
} from '../../../utils/currencyUtils';

/**
 * AccountCard
 * Tarjeta individual limpia de cuenta bancaria, efectivo, inversión o tarjeta de crédito.
 * Soporta modo solo lectura (isReadOnly=true) para consulta y modo gestión (isReadOnly=false) con acciones de edición y eliminación.
 */
export default function AccountCard({
  account,
  index,
  onEdit,
  onDelete,
  onSelectCard,
  transactions = [],
  trm = 4050,
  showBalance,
  showBalances,
  isMasked,
  isReadOnly = false
}) {
  const { formatMoney, isPrivacyMode } = usePrivacy();
  const isVisible = showBalance !== undefined
    ? Boolean(showBalance)
    : showBalances !== undefined
    ? Boolean(showBalances)
    : isMasked !== undefined
    ? !isMasked
    : !isPrivacyMode;

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
    account?.type === 'cash' || (account?.name || '').toLowerCase().includes('efectivo') ? 'Efectivo' :
    (account?.type === 'card' || account?.type === 'credit') ? 'Tarjeta de Crédito' :
    (account?.name || '').toLowerCase().includes('nequi') || account?.type === 'wallet' ? 'Billetera Digital' :
    account?.type === 'savings' ? 'Cuenta de Ahorros' :
    account?.type === 'investment' ? 'Inversión / Acciones' : 'Cuenta Bancaria';

  // Cálculos específicos para Tarjeta de Crédito
  const rawCardTxs = Array.isArray(transactions) 
    ? transactions.filter(t => t && account?.id && (
        t.accountId === account.id || t.account_id === account.id || 
        t.toAccountId === account.id || t.to_account_id === account.id || 
        t.fromAccountId === account.id || t.from_account_id === account.id
      )) 
    : [];

  const seenTxIds = new Set();
  const cardTxs = rawCardTxs.filter(t => {
    const txId = t?.id || t?._id;
    if (!txId) return true;
    if (seenTxIds.has(txId)) return false;
    seenTxIds.add(txId);
    return true;
  });
  const rawInitial = safeNumber(account?.initialBalance ?? account?.initial_balance ?? 0);
  const initialDebt = rawInitial < 0 ? Math.abs(rawInitial) : 0;
  const initialCredit = rawInitial > 0 ? rawInitial : 0;
  const totalExpenses = cardTxs.filter(t => t?.type === 'expense').reduce((s, t) => s + safeNumber(t?.amount), 0);
  const totalPayments = cardTxs.filter(t => t?.type === 'income').reduce((s, t) => s + safeNumber(t?.amount), 0);
  const saldoRestante = Math.max(0, (initialDebt + totalExpenses) - (initialCredit + totalPayments));
  const creditLimit = Number(account?.creditLimit) || 5000000;
  const cupoDisponible = Math.max(0, creditLimit - saldoRestante);

  const x = useMotionValue(0);
  const editOpacity = useTransform(x, [10, 60], [0, 1]);
  const editScale = useTransform(x, [10, 60], [0.85, 1]);
  const deleteOpacity = useTransform(x, [-10, -60], [0, 1]);
  const deleteScale = useTransform(x, [-10, -60], [0.85, 1]);

  const handleCardClick = () => {
    if (isReadOnly) return;
    // En móviles y tablets (touch o viewport < 1024px), el tap simple no abre la edición para requerir swipe
    const isTouchOrMobile = typeof window !== 'undefined' && (
      window.innerWidth < 1024 || 
      'ontouchstart' in window || 
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)
    );
    if (isTouchOrMobile) {
      return;
    }
    // En escritorio con mouse:
    if (isCreditCard && onSelectCard) {
      onSelectCard(account);
    } else if (onEdit) {
      onEdit(account);
    }
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden select-none">
      {/* Fondo de acción Swipe a la derecha: EDITAR (tono esmeralda/azul) */}
      {!isReadOnly && onEdit && (
        <div className="absolute inset-y-0 left-0 w-full flex items-center justify-start pl-5 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent dark:from-emerald-500/25 dark:via-emerald-500/15 border border-emerald-500/30 rounded-2xl z-0 pointer-events-none">
          <motion.div 
            style={{ opacity: editOpacity, scale: editScale }}
            className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-xs">
              <Pencil className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span>Editar</span>
          </motion.div>
        </div>
      )}

      {/* Fondo de acción Swipe a la izquierda: ELIMINAR (tono rojo destructivo) */}
      {!isReadOnly && onDelete && (
        <div className="absolute inset-y-0 right-0 w-full flex items-center justify-end pr-5 bg-gradient-to-l from-rose-500/20 via-rose-500/10 to-transparent dark:from-rose-500/25 dark:via-rose-500/15 border border-rose-500/30 rounded-2xl z-0 pointer-events-none">
          <motion.div 
            style={{ opacity: deleteOpacity, scale: deleteScale }}
            className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold text-xs sm:text-sm"
          >
            <span>Eliminar</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shadow-xs">
              <Trash2 className="w-5 h-5 stroke-[2.5]" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Tarjeta de Cuenta con arrastre horizontal suave */}
      <motion.div
        style={{ x }}
        drag={!isReadOnly ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={(e, { offset, velocity }) => {
          if (isReadOnly) return;
          // Swipe hacia la derecha: Editar
          if (offset.x > 65 || velocity.x > 300) {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try { navigator.vibrate(25); } catch (_) {}
            }
            if (onEdit) onEdit(account);
          } 
          // Swipe hacia la izquierda: Eliminar
          else if (offset.x < -65 || velocity.x < -300) {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try { navigator.vibrate(35); } catch (_) {}
            }
            if (onDelete) onDelete(account.id || account);
          }
        }}
        onClick={handleCardClick}
        className={`group w-full h-full flex flex-col justify-between bg-white dark:bg-[#12151E] border border-slate-200/80 dark:border-white/[0.07] hover:border-emerald-500/40 hover:dark:bg-[#151924] rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-colors select-none relative z-10 touch-pan-y ${
          isReadOnly ? 'cursor-default' : 'cursor-default lg:cursor-pointer'
        }`}
      >
      {/* Fila superior (Cabecera homogénea): Logo limpio y nítido, Nombre y Tipo en bloque vertical, y Acciones */}
      <div className="flex items-start justify-between gap-3 min-h-[44px]">
        {/* Izquierda: Logo limpio sin caja opaca + Bloque vertical (Nombre + Tipo) */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center justify-center shrink-0">
            <BrandIcon 
              name={account?.name || 'Cuenta'} 
              size={38} 
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl select-none shrink-0"
              type={account?.type}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">
              {account?.name || 'Sin nombre'}
            </h4>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {typeLabel}
            </p>
            {isInvestment && shares > 0 && (
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                • {account?.ticker ? `${account.ticker} · ` : ''}{shares} {shares === 1 ? 'acción' : 'acciones'}{unitPrice > 0 ? ` @ ${formatNativeCurrency(unitPrice, currency)} c/u` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Derecha: Botones de administración visibles en escritorio (>= md) si no es readOnly */}
        {!isReadOnly && (
          <div className="hidden md:flex items-center gap-1.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(account);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                title="Editar cuenta"
                aria-label="Editar cuenta"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(account.id || account);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Eliminar cuenta"
                aria-label="Eliminar cuenta"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fila inferior (Saldo perfectamente alineado y compacto) */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100/60 dark:border-white/[0.07]">
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {isCreditCard ? 'Saldo utilizado / Deuda' : 'Saldo disponible'}
        </span>
        <div className="text-right">
          {isCreditCard ? (
            <span className={`text-xl font-bold font-mono tracking-tight tabular-nums block ${
              saldoRestante > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'
            }`}>
              {!isVisible ? '••••••' : (saldoRestante > 0 ? `-${formatMoney(saldoRestante)}` : formatMoney(0))}
            </span>
          ) : isForeignCurrency ? (
            <div>
              <span className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-50 tabular-nums block leading-tight">
                {!isVisible ? '••••••' : formatNativeCurrency(balance, currency)}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono tracking-tight block tabular-nums leading-tight mt-0.5">
                {!isVisible ? '≈ •••••• COP' : `≈ $ ${Math.round(balanceInCop).toLocaleString('es-CO')} COP`}
              </span>
            </div>
          ) : (
            <span className={`text-xl font-bold font-mono tracking-tight tabular-nums block ${
              balance < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-900 dark:text-slate-50'
            }`}>
              {!isVisible ? '••••••' : formatMoney(balance)}
            </span>
          )}
        </div>
      </div>

      {/* Si es Tarjeta de Crédito: cupo disponible y deuda visible */}
      {isCreditCard && (
        <div className="mt-2.5 pt-2 border-t border-slate-100/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="text-slate-400 dark:text-slate-500">Cupo disponible:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold font-mono tabular-nums">
              {!isVisible ? '••••••' : formatMoney(cupoDisponible)}
            </strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-400 dark:text-slate-500">Deuda:</span>
            <strong className="text-rose-600 dark:text-rose-400 font-bold font-mono tabular-nums">
              {!isVisible ? '••••••' : (saldoRestante > 0 ? formatMoney(saldoRestante) : formatMoney(0))}
            </strong>
          </span>
          <span className="tabular-nums shrink-0 text-slate-400 dark:text-slate-500 text-[10px] sm:text-[11px] hidden sm:inline">
            Corte: día {account.closingDate || account.paymentDueDate || 17} • Pago: día {account.paymentDueDate || 17}
          </span>
        </div>
      )}
      </motion.div>
    </div>
  );
}
