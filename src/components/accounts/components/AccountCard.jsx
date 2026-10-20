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
    <div className="relative w-full h-full min-h-[134px] sm:min-h-[138px] flex flex-col rounded-2xl overflow-hidden select-none">
      {/* Fondo de acción Swipe a la derecha: EDITAR (tono esmeralda/azul) */}
      {!isReadOnly && onEdit && (
        <div className="absolute inset-y-0 left-0 w-full flex items-center justify-start pl-5 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent dark:from-emerald-500/25 dark:via-emerald-500/15 border border-emerald-500/30 rounded-2xl z-0 pointer-events-none">
          <motion.div 
            style={{ opacity: editOpacity, scale: editScale }}
            className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-xs">
              <Pencil className="w-4 h-4 stroke-[2.5]" />
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
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shadow-xs">
              <Trash2 className="w-4 h-4 stroke-[2.5]" />
            </div>
          </motion.div>
        </div>
      )}

      <motion.div
        style={{ x }}
        drag={!isReadOnly ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={(e, { offset, velocity }) => {
          if (isReadOnly) return;
          if (offset.x > 65 || velocity.x > 300) {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try { navigator.vibrate(25); } catch (_) {}
            }
            if (onEdit) onEdit(account);
          } else if (offset.x < -65 || velocity.x < -300) {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try { navigator.vibrate(35); } catch (_) {}
            }
            if (onDelete) onDelete(account.id || account);
          }
        }}
        onClick={handleCardClick}
        className={`group w-full h-full min-h-[134px] sm:min-h-[138px] flex flex-col justify-between bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-500/40 hover:dark:bg-[#151924] rounded-2xl p-3 sm:p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all select-none relative z-10 touch-pan-y ${
          isReadOnly ? 'cursor-default' : 'cursor-default lg:cursor-pointer'
        }`}
      >
        {/* COMPARTIMENTO 1: Encabezado (Header - h-8 compacto) */}
        <div className="h-8 flex items-center justify-between gap-2 mb-1 shrink-0">
          {/* Izquierda: Ícono de marca + Nombre + Subtipo */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <div className="flex items-center justify-center shrink-0">
              <BrandIcon 
                name={account?.name || 'Cuenta'} 
                size={32} 
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-lg select-none shrink-0"
                type={account?.type}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm leading-snug truncate">
                {account?.name || 'Sin nombre'}
              </h4>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-zinc-500 truncate leading-none mt-0.5">
                {typeLabel}
              </p>
            </div>
          </div>

          {/* Derecha: Acciones de administración en Desktop con hover dinámico */}
          {!isReadOnly && (
            <div className="hidden md:flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(account);
                  }}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                  title="Editar cuenta"
                  aria-label="Editar cuenta"
                >
                  <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(account.id || account);
                  }}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title="Eliminar cuenta"
                  aria-label="Eliminar cuenta"
                >
                  <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* COMPARTIMENTO 2: Centro (Métrica Principal Unificada - Altura homogénea para todas las tarjetas) */}
        <div className="flex-1 flex flex-col justify-center py-0.5 sm:py-1 min-h-0">
          {isCreditCard ? (
            /* Tarjeta de crédito */
            <div className="flex flex-col items-start w-full min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500 block truncate max-w-full leading-none mb-0.5">
                DEUDA ACUMULADA
              </span>
              <span className={`text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums truncate max-w-full block ${
                saldoRestante > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'
              }`}>
                {!isVisible ? '••••••' : (saldoRestante > 0 ? `-${formatMoney(saldoRestante)}` : formatMoney(0))}
              </span>
            </div>
          ) : (
            /* Débito, Ahorros, Efectivo e Inversión */
            <div className="flex flex-col items-start w-full min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500 block truncate max-w-full leading-none mb-0.5">
                SALDO DISPONIBLE
              </span>
              {isForeignCurrency ? (
                <div className="w-full min-w-0">
                  <span className="text-lg sm:text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums truncate max-w-full block leading-tight">
                    {!isVisible ? '••••••' : formatNativeCurrency(balance, currency)}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono tracking-tight block tabular-nums leading-tight mt-0.5 truncate max-w-full">
                    {!isVisible ? '≈ •••••• COP' : `≈ $${Math.round(balanceInCop).toLocaleString('es-CO')} COP`}
                  </span>
                </div>
              ) : (
                <span className={`text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums truncate max-w-full block ${
                  balance < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                }`}>
                  {!isVisible ? '••••••' : formatMoney(balance)}
                </span>
              )}
              {isInvestment && shares > 0 && (
                <div className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 truncate mt-0.5 max-w-full">
                  • {account?.ticker ? `${account.ticker} · ` : ''}{shares} {shares === 1 ? 'acc.' : 'accs.'}{unitPrice > 0 ? ` @ ${formatNativeCurrency(unitPrice, currency)}` : ''}
                </div>
              )}
            </div>
          )}
        </div>

        {/* COMPARTIMENTO 3: Pie (Footer / Metadatos - Altura compacta y simétrica min-h-[22px]) */}
        <div className="mt-auto pt-1.5 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[10px] sm:text-[11px] min-h-[22px]">
          {isCreditCard ? (
            /* Tarjeta de crédito: Cupo libre y badge de corte */
            <>
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-slate-500 dark:text-zinc-400 text-[10px] sm:text-[11px] shrink-0 font-medium">Cupo libre:</span>
                <b className="text-emerald-600 dark:text-emerald-400 font-bold font-mono tabular-nums text-[10px] sm:text-[11px] truncate">
                  {!isVisible ? '••••••' : formatMoney(cupoDisponible)}
                </b>
              </div>
              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-[9px] sm:text-[10px] font-medium font-mono shrink-0 ml-2">
                Corte d.{account.closingDate || account.paymentDueDate || 17}
              </span>
            </>
          ) : (
            /* Cuentas de ahorros, corriente, billetera o efectivo */
            <>
              <span className="text-slate-400 dark:text-zinc-500 text-[10px] sm:text-[11px] truncate font-medium">
                Activa • {account?.currency || 'COP'}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-[9px] sm:text-[10px] font-medium font-mono shrink-0 ml-2">
                {typeLabel}
              </span>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
