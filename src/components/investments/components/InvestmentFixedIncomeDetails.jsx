import React from 'react';
import { AlertCircle, CheckCircle2, HandCoins } from 'lucide-react';
import { calculateMonthlyLoanReturn } from '../../../utils/financeMath';

export default function InvestmentFixedIncomeDetails({
  inv, isCDT, isPrivateLoan, isMatured, cdtStats, cdtTermDays, formatInvestMoney, onOpenLiquidation
}) {
  if (isCDT && cdtStats) {
    return (
      <div className={`p-3.5 rounded-xl border space-y-2.5 ${isMatured ? 'bg-amber-500/10 border-amber-500/25' : 'bg-emerald-500/10 border-emerald-500/25'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold flex items-center gap-1.5 ${isMatured ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
            {isMatured ? <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            <span>{isMatured ? `CDT Vencido el ${inv.dueDate || 'Hoy'}` : `CDT Vigente ${inv.dueDate ? `(Vence el ${inv.dueDate})` : ''}`}</span>
          </span>
          <span className={`text-[11px] font-semibold ${isMatured ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {cdtTermDays} días ({inv.interestRate || 0}% E.A.)
          </span>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 border-t ${isMatured ? 'border-amber-500/20' : 'border-emerald-500/20'}`}>
          <div><span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">Capital inicial</span><span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">{formatInvestMoney(Number(inv.investedAmount || inv.buyPrice || 0), inv.currency || 'COP')}</span></div>
          <div><span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">{isMatured ? 'Ganancia neta (4% rete)' : 'Rendimiento proyectado'}</span><span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">+{formatInvestMoney(cdtStats.netReturn, inv.currency || 'COP')}</span></div>
          <div><span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">{isMatured ? 'Total liquidable' : 'Total proyectado'}</span><span className={`font-extrabold font-mono tabular-nums ${isMatured ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{formatInvestMoney(cdtStats.maturityTotal, inv.currency || 'COP')}</span></div>
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); onOpenLiquidation?.(inv, cdtStats); }} className={`w-full mt-1.5 py-2 px-3 rounded-xl active:scale-98 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${isMatured ? 'bg-amber-500 hover:bg-amber-600 text-slate-950' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
          <CheckCircle2 className="w-4 h-4" /><span>Liquidar CDT a cuenta</span>
        </button>
      </div>
    );
  }

  if (isPrivateLoan) {
    return (
      <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400"><HandCoins className="w-4 h-4" /></div>
          <div><span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">Deudor</span><span className="font-bold text-slate-900 dark:text-white">{inv.borrower || inv.loanBorrower || 'Tercero'}</span></div>
        </div>
        <div className="text-right">
          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">Rendimiento Proyectado</span>
          <span className="font-extrabold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">+{formatInvestMoney(calculateMonthlyLoanReturn(inv.investedAmount, inv.monthlyRate), inv.currency || 'COP')} / mes</span>
          {inv.paymentDay && <span className="block text-[10px] text-slate-400 font-normal">Cobro cada día {inv.paymentDay}</span>}
        </div>
      </div>
    );
  }

  return null;
}
