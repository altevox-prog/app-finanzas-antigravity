import React from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, Calendar, ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertCircle, Pencil, Receipt } from 'lucide-react';
import { usePrivacy } from '../../../context/PrivacyContext';
import { safeNumber } from '../../../utils/financeMath';
import { DynamicIcon } from '../../categories/components/CategoryIcon';
import BrandIcon from '../../ui/BrandIcon';
import { useBackHandler } from '../../../hooks/useBackHandler';
import CreditCardPaymentSection from '../../credit-cards/CreditCardPaymentSection';

export default function CreditCardDetailModal({
  isOpen, onClose, card, transactions = [], accounts = [], onAddTransaction, onOpenEdit
}) {
  const { formatMoney } = usePrivacy();
  useBackHandler(isOpen, onClose);

  if (!isOpen || !card) return null;

  const seen = new Set();
  const cardTxs = (Array.isArray(transactions) ? transactions : [])
    .filter((t) => t && card.id && (t.accountId === card.id || t.account_id === card.id || t.toAccountId === card.id || t.to_account_id === card.id || t.fromAccountId === card.id || t.from_account_id === card.id))
    .filter((t) => { const id = t?.id || t?._id; if (!id || seen.has(id)) return !id; seen.add(id); return true; })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const rawInit = safeNumber(card.initialBalance ?? card.initial_balance ?? 0);
  const initialDebt = rawInit < 0 ? Math.abs(rawInit) : 0, initialCredit = rawInit > 0 ? rawInit : 0;
  const totalExpenses = cardTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + safeNumber(t.amount), 0);
  const totalPayments = cardTxs.filter((t) => t.type === 'income').reduce((s, t) => s + safeNumber(t.amount), 0);
  const totalCharges = initialDebt + totalExpenses, totalPaid = initialCredit + totalPayments;
  const outstandingDebt = Math.round(Math.max(0, totalCharges - totalPaid) * 100) / 100, isPaidOff = outstandingDebt <= 1;

  const creditLimit = Number(card.creditLimit) || 5000000, availableCredit = Math.max(0, creditLimit - outstandingDebt);
  const usedPercent = Math.min(100, Math.round((outstandingDebt / creditLimit) * 100));

  const paymentDay = parseInt(card.paymentDueDate || 17, 10), closingDay = card.closingDate ? parseInt(card.closingDate, 10) : null;
  const now = new Date(), nextPaymentDate = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > paymentDay ? 1 : 0), paymentDay);
  const diffDays = Math.ceil((nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const formattedNextDate = `${paymentDay} ${monthNames[nextPaymentDate.getMonth()]}`;

  const modalContent = (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-fadeIn" onClick={onClose}>
      <div className="relative z-10 w-full max-w-lg max-h-[88vh] bg-white dark:bg-[#0c0f17] rounded-3xl border border-slate-200/80 dark:border-white/[0.08] flex flex-col shadow-2xl overflow-hidden animate-slideUp text-slate-900 dark:text-white" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera Superior Fija */}
        <div className="flex-shrink-0 p-4 sm:p-5 flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0c0f17] z-10 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button type="button" onClick={onClose} className="p-1.5 -ml-1 sm:hidden rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer" title="Volver"><ArrowLeft className="w-5 h-5" /></button>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 overflow-hidden" style={{ backgroundColor: card.color || '#AF52DE' }}>
              <BrandIcon name={card.name} size={24} fallback={<DynamicIcon name={card.icon || 'CreditCard'} size={20} />} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold truncate leading-tight">{card.name}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase" style={{ backgroundColor: `${card.color || '#AF52DE'}20`, color: card.color || '#AF52DE' }}>Tarjeta</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate mt-0.5">Crédito rotativo • Cupo y fechas de corte</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenEdit && (
              <button type="button" onClick={() => { onClose(); onOpenEdit(card); }} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer" title="Configurar cupo y fechas"><Pencil className="w-4 h-4" /></button>
            )}
            <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer" title="Cerrar"><X className="w-4.5 h-4.5" /></button>
          </div>
        </div>

        {/* Cuerpo Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain pr-1">
          <div className="p-4 sm:p-5 rounded-2xl border relative overflow-hidden space-y-2 shadow-sm bg-slate-50 dark:bg-white/[0.03]" style={{ borderColor: isPaidOff ? '#34C75940' : '#FF3B3040' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Saldo Restante por Pagar (Deuda Actual)</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${isPaidOff ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'}`}>
                {isPaidOff ? <><CheckCircle2 className="w-3 h-3" /><span>Al día • Sin deuda</span></> : <><AlertCircle className="w-3 h-3" /><span>Pago pendiente</span></>}
              </span>
            </div>
            <div className={`text-[26px] sm:text-[30px] font-extrabold font-mono tracking-tight tabular-nums leading-none ${isPaidOff ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>{formatMoney(outstandingDebt)}</div>
            <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Total consumos: {formatMoney(totalCharges)}</span><span>Total abonos: {formatMoney(totalPaid)}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] space-y-2.5">
            <div className="flex items-center justify-between">
              <div><span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Cupo disponible</span><span className="text-[20px] font-bold font-mono text-[#34C759] tracking-tight tabular-nums">{formatMoney(availableCredit)}</span></div>
              <div className="text-right"><span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Cupo total</span><span className="text-[14px] font-bold font-mono tabular-nums text-slate-900 dark:text-white">{formatMoney(creditLimit)}</span></div>
            </div>
            <div className="space-y-1">
              <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
                <div className={`h-full rounded-full transition-all duration-500 ${usedPercent > 80 ? 'bg-[#FF3B30]' : usedPercent > 50 ? 'bg-[#FF9500]' : 'bg-[#007AFF]'}`} style={{ width: `${usedPercent}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400"><span>{usedPercent}% cupo utilizado</span><span>{100 - usedPercent}% libre</span></div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-[#007AFF] flex items-center justify-center shrink-0"><Calendar className="w-4.5 h-4.5" /></div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Próxima fecha de pago</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs sm:text-sm font-bold text-[#007AFF]">Pagar antes del {formattedNextDate}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-[#007AFF] tabular-nums">{diffDays <= 0 ? '¡Vence hoy!' : `En ${diffDays} día${diffDays === 1 ? '' : 's'}`}</span>
                </div>
              </div>
            </div>
            {closingDay && (
              <div className="text-right shrink-0 border-l border-slate-200/60 dark:border-white/10 pl-3">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Corte</span><span className="text-xs font-bold text-slate-900 dark:text-white">Día {closingDay}</span>
              </div>
            )}
          </div>

          <CreditCardPaymentSection card={card} outstandingDebt={outstandingDebt} accounts={accounts} onAddTransaction={onAddTransaction} formatMoney={formatMoney} />

          <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Movimientos de la Tarjeta ({cardTxs.length})</span>
            {cardTxs.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03]">
                <Receipt className="w-8 h-8 opacity-25 mx-auto mb-2" /><p className="text-xs font-medium opacity-60">Sin consumos o abonos registrados aún</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-white/[0.06]">
                {cardTxs.map((tx) => {
                  const type = String(tx?.type || '').toLowerCase(), amt = Number(tx?.amount) || 0;
                  const isExpense = type === 'expense' || type === 'gasto' || amt < 0, isIncome = type === 'income' || type === 'ingreso' || (!isExpense && amt > 0);
                  return (
                    <div key={tx.id} className="p-3 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors flex flex-col justify-center gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 max-w-[65%]">
                          <BrandIcon name={tx.note || tx.categoryName || ''} size={14} wrapperClassName="w-6 h-6 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200/60 dark:border-white/[0.06]" fallback={<div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isExpense ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400' : 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400'}`}>{isIncome ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}</div>} />
                          <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">{tx.note || tx.categoryName || (isIncome ? 'Abono Tarjeta' : 'Compra con Tarjeta')}</span>
                        </div>
                        <span className={`text-xs font-bold font-mono tracking-tight tabular-nums shrink-0 whitespace-nowrap ${isExpense ? 'text-rose-500 dark:text-rose-400' : isIncome ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-600 dark:text-zinc-300'}`}>{isExpense ? '-' : isIncome ? '+' : ''}{formatMoney(Math.abs(amt))}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-[65%]">{tx.categoryName || (isIncome ? 'Abono a deuda' : 'Consumo TC')}</span>
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono shrink-0">{tx.date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pie de Acciones Fijo */}
        <div className="flex-shrink-0 p-3.5 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0c0f17] flex justify-end">
          <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-white/20 active:scale-95 transition-all cursor-pointer">Cerrar Detalle</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
