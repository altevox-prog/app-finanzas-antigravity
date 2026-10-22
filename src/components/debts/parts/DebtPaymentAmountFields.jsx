import React from 'react';
import AmountInput from '../../common/AmountInput';

export default function DebtPaymentAmountFields({
  paymentMode,
  capitalAmount,
  setCapitalAmount,
  interestAmount,
  setInterestAmount,
  outstandingCapital,
  formatMoney,
  enableDecimals,
  inputCls
}) {
  return (
    <>
      {paymentMode === 'capital' && (
        <div className="space-y-1.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Monto a capital ($) *</label>
            {outstandingCapital > 0 && (
              <button
                type="button"
                onClick={() => setCapitalAmount(String(Math.round(outstandingCapital)))}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Liquidar saldo ({formatMoney(outstandingCapital)})
              </button>
            )}
          </div>
          <AmountInput placeholder="0" required value={capitalAmount} onFocus={(e) => e.target.select()} onChange={setCapitalAmount} enableDecimals={enableDecimals} className={inputCls('focus:ring-emerald-500')} style={{ color: 'var(--text-main)' }} />
        </div>
      )}

      {paymentMode === 'interest' && (
        <div className="space-y-1.5 animate-fadeIn">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Monto de intereses pagados ($) *</label>
          <AmountInput placeholder="0" required value={interestAmount} onFocus={(e) => e.target.select()} onChange={setInterestAmount} enableDecimals={enableDecimals} className={inputCls('focus:ring-amber-500')} style={{ color: 'var(--text-main)' }} />
        </div>
      )}

      {paymentMode === 'mixed' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Abono a Capital ($) *</label>
            <AmountInput placeholder="0" required value={capitalAmount} onFocus={(e) => e.target.select()} onChange={setCapitalAmount} enableDecimals={enableDecimals} className="w-full text-sm font-black px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-500" style={{ color: 'var(--text-main)' }} />
            <span className="text-[10px] text-slate-400 block">Reduce saldo</span>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Abono a Intereses ($) *</label>
            <AmountInput placeholder="0" required value={interestAmount} onFocus={(e) => e.target.select()} onChange={setInterestAmount} enableDecimals={enableDecimals} className="w-full text-sm font-black px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-amber-500" style={{ color: 'var(--text-main)' }} />
            <span className="text-[10px] text-slate-400 block">Costo financiero</span>
          </div>
        </div>
      )}
    </>
  );
}
