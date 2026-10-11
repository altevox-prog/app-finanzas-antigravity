import React from 'react';
import { 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  Check, 
  CalendarClock,
  Sparkles
} from 'lucide-react';

export default function DebtAlertBanner({
  alerts = [],
  onReview,
  onDismiss,
  formatMoney
}) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-2.5 animate-fadeIn">
      {alerts.map((alert) => {
        const isReceivable = alert.type === 'receivable';

        return (
          <div
            key={alert.id}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isReceivable
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
            }`}
          >
            {/* Lado izquierdo: Icono + Título + Mensaje */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5 ${
                  isReceivable
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {isReceivable ? (
                  <CalendarClock className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider ${
                      isReceivable
                        ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-500/20 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {isReceivable ? 'Cobro Mañana' : 'Pago Mañana'}
                  </span>
                  <span className="text-[11px] opacity-70 font-semibold">
                    1 día de anticipación
                  </span>
                </div>

                <h4 className="text-sm font-bold truncate mt-0.5 leading-snug">
                  {alert.title}
                </h4>

                <p className="text-xs opacity-80 mt-0.5">
                  {alert.message}{' '}
                  {alert.amount > 0 && formatMoney && (
                    <span className="font-bold underline">
                      ({formatMoney(alert.amount)})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Lado derecho: Botones rápidos */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => onDismiss && onDismiss(alert.id)}
                className="px-3 py-1.5 rounded-xl border border-current/20 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                title="Marcar como gestionado para hoy"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Gestionado</span>
              </button>

              <button
                type="button"
                onClick={() => onReview && onReview(alert)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm active:scale-95 flex items-center gap-1.5 transition-all cursor-pointer ${
                  isReceivable
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                <span>Revisar deuda</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
