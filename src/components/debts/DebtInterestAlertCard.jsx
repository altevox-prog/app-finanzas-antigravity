import React from 'react';
import { Clock } from 'lucide-react';

export default function DebtInterestAlertCard({ monthsElapsed, monthlyRate, accruedInterest, principalAmount }) {
  if (monthsElapsed <= 0 || monthlyRate <= 0) return null;

  return (
    <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col gap-1.5 text-xs text-amber-600 dark:text-amber-400 animate-fadeIn">
      <div className="flex items-center gap-2 font-bold">
        <Clock className="w-4 h-4 shrink-0" />
        <span>Liquidación de Intereses Acumulados ({monthsElapsed} {monthsElapsed === 1 ? 'mes transcurrido' : 'meses transcurridos'})</span>
      </div>
      <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
        <span>Intereses causados a hoy:</span>
        <span className="font-bold text-amber-500">${accruedInterest.toLocaleString('es-CO')}</span>
      </div>
      <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
        <span>Saldo total adeudado a hoy:</span>
        <span className="font-bold text-slate-900 dark:text-white">
          ${(principalAmount + accruedInterest).toLocaleString('es-CO')}
        </span>
      </div>
    </div>
  );
}
