import React, { useState } from 'react';
import { 
  CreditCard, 
  X, 
  Calendar, 
  Clock, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  Pencil, 
  Sparkles, 
  DollarSign, 
  Wallet,
  Receipt,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { usePrivacy } from '../context/PrivacyContext';
import { safeNumber } from '../utils/financeMath';
import { DynamicIcon } from './CategoryIcon';
import BrandIcon from './BrandIcon';
import { useBackHandler } from '../hooks/useBackHandler';

export default function CreditCardDetailModal({
  isOpen,
  onClose,
  card,
  transactions = [],
  accounts = [],
  onAddTransaction,
  onOpenEdit
}) {
  const { formatMoney } = usePrivacy();

  // Payment State
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useBackHandler(isOpen, () => {
    if (showPaymentForm) {
      setShowPaymentForm(false);
    } else {
      onClose();
    }
  });

  const [paymentAmount, setPaymentAmount] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');

  if (!isOpen || !card) return null;

  // 1. Transactions on this card
  const cardTxs = transactions
    .filter(t => t.accountId === card.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Initial debt if initialBalance was negative
  const initialDebt = card.initialBalance < 0 ? Math.abs(safeNumber(card.initialBalance)) : 0;
  const initialCredit = card.initialBalance > 0 ? safeNumber(card.initialBalance) : 0;

  // Consumos (gastos cargados a la tarjeta)
  const totalExpenses = cardTxs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + safeNumber(t.amount), 0);

  // Abonos (ingresos/pagos a la tarjeta)
  const totalPayments = cardTxs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + safeNumber(t.amount), 0);

  // Saldo Restante por Pagar (Deuda Actual): (Total Consumos - Abonos)
  const totalCharges = initialDebt + totalExpenses;
  const totalPaid = initialCredit + totalPayments;
  const outstandingDebt = Math.round(Math.max(0, totalCharges - totalPaid) * 100) / 100;
  const isPaidOff = outstandingDebt <= 1;

  // Cupo Total y Cupo Disponible
  const creditLimit = Number(card.creditLimit) || 5000000;
  const availableCredit = Math.max(0, creditLimit - outstandingDebt);
  const usedPercent = Math.min(100, Math.round((outstandingDebt / creditLimit) * 100));

  // Próxima Fecha de Pago y Días Restantes
  const paymentDay = parseInt(card.paymentDueDate || 17, 10);
  const closingDay = card.closingDate ? parseInt(card.closingDate, 10) : null;

  const now = new Date();
  let nextPaymentDate = new Date(now.getFullYear(), now.getMonth(), paymentDay);
  if (now.getDate() > paymentDay) {
    nextPaymentDate = new Date(now.getFullYear(), now.getMonth() + 1, paymentDay);
  }
  
  const diffTime = nextPaymentDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const monthNamesShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const formattedNextDate = `${paymentDay} ${monthNamesShort[nextPaymentDate.getMonth()]}`;

  // Other accounts eligible to pay from (not credit cards)
  const sourceAccountOptions = accounts.filter(a => a.id !== card.id && a.type !== 'card' && a.type !== 'credit');

  // Handle open payment form
  const handleOpenPayment = (amountToPay = outstandingDebt) => {
    setPaymentAmount(amountToPay > 0 ? String(amountToPay) : '');
    setSourceAccountId(sourceAccountOptions[0]?.id || '');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNote(`Abono a ${card.name}`);
    setShowPaymentForm(true);
  };

  // Submit payment / abono
  const handleConfirmPayment = (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    // 1. Transaction to Credit Card (income -> reduces debt & frees credit)
    const cardPaymentTx = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('tx-' + Date.now()),
      date: paymentDate,
      type: 'income',
      amount: amount,
      accountId: card.id,
      accountName: card.name,
      categoryId: 'cat-12', // Transferencia / Abono
      categoryName: 'Abono Tarjeta de Crédito',
      note: paymentNote.trim() || `Pago a ${card.name}`
    };

    onAddTransaction(cardPaymentTx);

    // 2. If source account chosen, record expense on that account
    if (sourceAccountId) {
      const sourceAcc = accounts.find(a => a.id === sourceAccountId);
      if (sourceAcc) {
        const sourceDebitTx = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('tx-' + (Date.now() + 1)),
          date: paymentDate,
          type: 'expense',
          amount: amount,
          accountId: sourceAcc.id,
          accountName: sourceAcc.name,
          categoryId: 'cat-4', // Servicios / Pagos
          categoryName: 'Pago Tarjeta de Crédito',
          note: `Pago realizado a ${card.name}`
        };
        onAddTransaction(sourceDebitTx);
      }
    }

    // Confetti if paid off completely
    if (amount >= outstandingDebt - 1) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    setShowPaymentForm(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn">
      <div 
        className="rounded-t-[32px] sm:rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900 animate-slide-up flex flex-col max-h-[92vh] overflow-hidden"
        style={{ 
          color: 'var(--text-main, #ffffff)' 
        }}
      >
        {/* Barra superior de arrastre en móvil */}
        <div className="w-12 h-1.5 bg-slate-500/30 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header Modal */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b gap-3" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 overflow-hidden"
              style={{ backgroundColor: card.color || '#AF52DE' }}
            >
              <BrandIcon name={card.name} size={24} fallback={<DynamicIcon name={card.icon || 'CreditCard'} size={20} />} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold truncate leading-tight">
                  {card.name}
                </h3>
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase"
                  style={{ backgroundColor: `${card.color || '#AF52DE'}20`, color: card.color || '#AF52DE' }}
                >
                  Tarjeta
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate mt-0.5">
                Crédito rotativo • Cupo y fechas de corte
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit(card);
                }}
                className="p-2 rounded-xl opacity-60 hover:opacity-100 hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                title="Configurar cupo y fechas"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl opacity-60 hover:opacity-100 hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              title="Cerrar"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto scroll-touch p-4 sm:p-5 space-y-4">
          
          {/* 1. SECCIÓN DESTACADA: SALDO RESTANTE POR PAGAR (DEUDA ACTUAL) */}
          <div 
            className="p-4 sm:p-5 rounded-2xl border relative overflow-hidden space-y-2 shadow-sm"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: isPaidOff ? '#34C75940' : '#FF3B3040' 
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 tracking-normal">
                Saldo Restante por Pagar (Deuda Actual)
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                isPaidOff ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'
              }`}>
                {isPaidOff ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Al día • Sin deuda</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>Pago pendiente</span>
                  </>
                )}
              </span>
            </div>

            {/* Número Principal Grande */}
            <div className={`text-[26px] sm:text-[30px] font-extrabold font-mono tracking-tight tabular-nums leading-none ${
              isPaidOff ? 'text-[#34C759]' : 'text-[#FF3B30]'
            }`}>
              {formatMoney(outstandingDebt)}
            </div>

            {/* Desglose de cálculo transparente */}
            <div className="pt-2 border-t flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400" style={{ borderColor: 'var(--border-color)' }}>
              <span>Total Consumos: {formatMoney(totalCharges)}</span>
              <span>Total Abonos: {formatMoney(totalPaid)}</span>
            </div>
          </div>

          {/* 2. CUPO DISPONIBLE & UTILIZACIÓN */}
          <div 
            className="p-4 rounded-2xl border space-y-2.5"
            style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Cupo Disponible
                </span>
                <span className="text-[20px] font-bold font-mono text-[#34C759] tracking-tight tabular-nums">
                  {formatMoney(availableCredit)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Cupo Total
                </span>
                <span className="text-[14px] font-bold font-mono tabular-nums" style={{ color: 'var(--text-main)' }}>
                  {formatMoney(creditLimit)}
                </span>
              </div>
            </div>

            {/* Barra de utilización de cupo */}
            <div className="space-y-1">
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--pill-bg)' }}>
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    usedPercent > 80 ? 'bg-[#FF3B30]' : usedPercent > 50 ? 'bg-[#FF9500]' : 'bg-[#007AFF]'
                  }`}
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>{usedPercent}% cupo utilizado</span>
                <span>{100 - usedPercent}% libre</span>
              </div>
            </div>
          </div>

          {/* 3. PRÓXIMA FECHA DE PAGO Y CORTE */}
          <div 
            className="p-3.5 rounded-2xl border flex items-center justify-between gap-3"
            style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-[#007AFF] flex items-center justify-center shrink-0">
                <Calendar className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Próxima Fecha de Pago
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs sm:text-sm font-bold text-[#007AFF]">
                    Pagar antes del {formattedNextDate}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-[#007AFF] tabular-nums">
                    {diffDays <= 0 ? '¡Vence hoy!' : `En ${diffDays} día${diffDays === 1 ? '' : 's'}`}
                  </span>
                </div>
              </div>
            </div>

            {closingDay && (
              <div className="text-right shrink-0 border-l pl-3" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Corte
                </span>
                <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                  Día {closingDay}
                </span>
              </div>
            )}
          </div>

          {/* 4. BOTÓN / FORMULARIO ABONAR / PAGAR TARJETA */}
          {!showPaymentForm ? (
            <button
              type="button"
              onClick={() => handleOpenPayment()}
              className="w-full py-3 bg-[#34C759] hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Abonar / Pagar Tarjeta</span>
            </button>
          ) : (
            <form 
              onSubmit={handleConfirmPayment} 
              className="p-4 rounded-2xl border animate-slide-up space-y-3"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: '#34C759' }}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#34C759]">
                  <ArrowDownLeft className="w-4 h-4" />
                  Registrar Abono a {card.name}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="opacity-50 hover:opacity-100 text-xs p-1"
                >
                  ✕
                </button>
              </div>

              {/* Botones rápidos de pago */}
              {outstandingDebt > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(outstandingDebt))}
                    className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer"
                    style={{ 
                      borderColor: '#34C759', 
                      backgroundColor: paymentAmount === String(outstandingDebt) ? '#34C75920' : 'transparent',
                      color: 'var(--text-main)'
                    }}
                  >
                    Pago Total ({formatMoney(outstandingDebt)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(Math.round(outstandingDebt * 0.1)))}
                    className="py-1.5 px-3 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  >
                    Mínimo (10%)
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold opacity-70 mb-1">Monto a Pagar ($ COP) *</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full text-sm font-bold px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#34C759]"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold opacity-70 mb-1">Debitar de Cuenta de Origen</label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#34C759]"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                >
                  <option value="">(Sin debitar otra cuenta - Pago externo)</option>
                  {sourceAccountOptions.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold opacity-70 mb-1">Fecha de Pago</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-xl focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold opacity-70 mb-1">Nota / Concepto</label>
                  <input
                    type="text"
                    placeholder="ej: Pago quincena"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-xl focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl opacity-75 hover:opacity-100 cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-card-sub)', color: 'var(--text-main)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-[#34C759] hover:bg-emerald-600 text-white rounded-xl shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmar Pago</span>
                </button>
              </div>
            </form>
          )}

          {/* 5. HISTORIAL DE MOVIMIENTOS DE LA TARJETA */}
          <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Movimientos de la Tarjeta ({cardTxs.length})
              </span>
            </div>

            {cardTxs.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border" style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}>
                <Receipt className="w-8 h-8 opacity-25 mx-auto mb-2" />
                <p className="text-xs font-medium opacity-60">Sin consumos o abonos registrados aún</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-white/[0.06]">
                {cardTxs.map((tx) => {
                  const isIncome = tx.type === 'income';
                  return (
                    <div 
                      key={tx.id}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors flex flex-col justify-center gap-1"
                    >
                      {/* Línea 1 (Superior): Concepto a la izq y Monto a la der */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 max-w-[65%]">
                          <BrandIcon
                            name={tx.note || tx.categoryName || ''}
                            size={14}
                            wrapperClassName="w-6 h-6 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200/60 dark:border-white/[0.06]"
                            fallback={
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                isIncome ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              }`}>
                                {isIncome ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                              </div>
                            }
                          />
                          <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                            {tx.note || tx.categoryName || (isIncome ? 'Abono Tarjeta' : 'Compra con Tarjeta')}
                          </span>
                        </div>

                        <span className={`text-xs font-bold font-mono tracking-tight tabular-nums shrink-0 whitespace-nowrap ${
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-zinc-100'
                        }`}>
                          {isIncome ? '+' : '-'}{formatMoney(tx.amount)}
                        </span>
                      </div>

                      {/* Línea 2 (Inferior): Categoría a la izq y Fecha a la der */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-[65%]">
                          {tx.categoryName || (isIncome ? 'Abono a deuda' : 'Consumo TC')}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono shrink-0">
                          {tx.date}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t flex justify-end" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--modal-bg)' }}>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--bg-card-sub)', color: 'var(--text-main)' }}
          >
            Cerrar Detalle
          </button>
        </div>

      </div>
    </div>
  );
}
