import React, { useState } from 'react';
import { ArrowDownLeft, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { usePrivacy } from '../../context/PrivacyContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import AmountInput from '../common/AmountInput';

/**
 * CreditCardPaymentSection
 * Componente modular para el registro de pagos y abonos a una Tarjeta de Crédito.
 */
export default function CreditCardPaymentSection({
  card, outstandingDebt = 0, accounts = [], onAddTransaction,
  formatMoney: propFormatMoney, showPaymentForm: propShowPaymentForm, setShowPaymentForm: propSetShowPaymentForm
}) {
  const { formatMoney: privacyFormatMoney } = usePrivacy();
  const formatMoney = propFormatMoney || privacyFormatMoney;

  const [internalShow, setInternalShow] = useState(false);
  const isControlled = typeof propShowPaymentForm === 'boolean';
  const showPaymentForm = isControlled ? propShowPaymentForm : internalShow;
  const setShowPaymentForm = isControlled ? propSetShowPaymentForm : setInternalShow;

  useBackHandler(Boolean(showPaymentForm), () => setShowPaymentForm(false));

  const [paymentAmount, setPaymentAmount] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');

  const sourceAccountOptions = accounts.filter((a) => a.id !== card?.id && a.type !== 'card' && a.type !== 'credit');

  const handleOpenPayment = (amountToPay = outstandingDebt) => {
    setPaymentAmount(amountToPay > 0 ? String(amountToPay) : '');
    setSourceAccountId(sourceAccountOptions[0]?.id || '');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNote(`Abono a ${card?.name || 'tarjeta'}`);
    setShowPaymentForm(true);
  };

  const handleConfirmPayment = (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || !card) return;

    const baseId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('tx-' + Date.now());

    // 1. Ingreso a tarjeta
    onAddTransaction?.({
      id: baseId, date: paymentDate, type: 'income', amount, accountId: card.id,
      accountName: card.name, categoryId: 'cat-12', categoryName: 'Abono Tarjeta de Crédito',
      note: paymentNote.trim() || `Pago a ${card.name}`
    });

    // 2. Egreso en cuenta de origen
    if (sourceAccountId) {
      const sourceAcc = accounts.find((a) => a.id === sourceAccountId);
      if (sourceAcc) {
        onAddTransaction?.({
          id: baseId + '-debit', date: paymentDate, type: 'expense', amount, accountId: sourceAcc.id,
          accountName: sourceAcc.name, categoryId: 'cat-4', categoryName: 'Pago Tarjeta de Crédito',
          note: `Pago realizado a ${card.name}`
        });
      }
    }

    if (amount >= outstandingDebt - 1) {
      try { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); } catch (_) {}
    }

    setShowPaymentForm(false);
  };

  if (!card) return null;

  return (
    <div className="w-full">
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
              <span>Registrar abono a {card.name}</span>
            </h4>
            <button type="button" onClick={() => setShowPaymentForm(false)} className="opacity-50 hover:opacity-100 text-xs p-1 cursor-pointer">✕</button>
          </div>

          {outstandingDebt > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentAmount(String(outstandingDebt))}
                className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer"
                style={{ borderColor: '#34C759', backgroundColor: paymentAmount === String(outstandingDebt) ? '#34C75920' : 'transparent', color: 'var(--text-main)' }}
              >
                Pago total ({formatMoney(outstandingDebt)})
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
            <label className="block text-[11px] font-semibold opacity-70 mb-1">Monto a pagar ($ COP) *</label>
            <AmountInput
              required placeholder="0" value={paymentAmount} onFocus={(e) => e.target.select()}
              onChange={(cleanVal) => setPaymentAmount(cleanVal)}
              className="w-full text-sm font-bold px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#34C759]"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold opacity-70 mb-1">Debitar de cuenta de origen</label>
            <select
              value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#34C759]"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
              <option value="">(Sin debitar otra cuenta - Pago externo)</option>
              {sourceAccountOptions.map((acc) => <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold opacity-70 mb-1">Fecha de pago</label>
              <input type="date" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full text-xs px-3 py-2 border rounded-xl focus:outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold opacity-70 mb-1">Nota / Concepto</label>
              <input type="text" placeholder="ej: Pago quincena" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className="w-full text-xs px-3 py-2 border rounded-xl focus:outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button type="button" onClick={() => setShowPaymentForm(false)} className="px-3 py-1.5 text-xs font-semibold rounded-xl opacity-75 hover:opacity-100 cursor-pointer" style={{ backgroundColor: 'var(--bg-card-sub)', color: 'var(--text-main)' }}>
              Cancelar
            </button>
            <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-[#34C759] hover:bg-emerald-600 text-white rounded-xl shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirmar pago</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
