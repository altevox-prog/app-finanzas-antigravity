import React from 'react';
import { 
  Bell, 
  X, 
  Check, 
  CreditCard, 
  Receipt, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  Clock, 
  AlertCircle 
} from 'lucide-react';

/**
 * NotificationCenter
 * Modal / Drawer de notificaciones interactivo con descarte individual y marcar todas como leídas.
 */
export default function NotificationCenter({
  isOpen,
  onClose,
  notifications = [],
  activeNotifications = [],
  onDismiss,
  onMarkAllAsRead,
  onApproveRecurring = null,
  onSkipRecurring = null
}) {
  if (!isOpen) return null;

  const hasItems = activeNotifications.length > 0;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-start sm:items-center justify-center sm:justify-end sm:p-6 z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-[420px] rounded-b-3xl sm:rounded-3xl shadow-2xl border flex flex-col max-h-[85vh] overflow-hidden animate-slide-up bg-white dark:bg-[#0f172a] border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white"
      >
        {/* Header del Centro de Notificaciones */}
        <div className="p-4 sm:p-5 border-b border-slate-200/60 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold leading-tight">
                Notificaciones y Alertas
              </h3>
              <p className="text-[11px] opacity-60">
                {hasItems ? `${activeNotifications.length} alerta(s) pendientes` : 'Todo al día'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasItems && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:underline transition-all cursor-pointer px-2 py-1 rounded-lg hover:bg-emerald-500/10"
                title="Marcar todas como leídas"
              >
                Marcar todas como leídas
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lista de Notificaciones */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {!hasItems ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold mb-1">
                No tienes notificaciones pendientes
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                Tus fechas de corte, pagos de tarjeta, suscripciones, deudas y cuotas de metas de ahorro están al día.
              </p>
            </div>
          ) : (
            activeNotifications.map((item) => {
              const isUrgent = item.urgency === 'urgent';
              const isWarning = item.urgency === 'warning';

              return (
                <div 
                  key={item.id}
                  className="p-3.5 rounded-2xl border transition-all flex items-start gap-3 bg-slate-50/70 dark:bg-white/[0.03] border-slate-200/60 dark:border-white/5"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isUrgent 
                      ? 'bg-rose-500/15 text-rose-500' 
                      : isWarning 
                        ? 'bg-amber-500/15 text-amber-500' 
                        : 'bg-emerald-500/15 text-emerald-500'
                  }`}>
                    {item.icon === 'CreditCard' ? (
                      <CreditCard className="w-4.5 h-4.5" />
                    ) : item.icon === 'Receipt' ? (
                      <Receipt className="w-4.5 h-4.5" />
                    ) : item.icon === 'Target' ? (
                      <Target className="w-4.5 h-4.5" />
                    ) : item.icon === 'Clock' ? (
                      <Clock className="w-4.5 h-4.5" />
                    ) : (
                      <AlertTriangle className="w-4.5 h-4.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                        {item.category}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          isUrgent 
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                            : isWarning 
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {item.badge}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismiss(item.id);
                          }}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/15 active:scale-90 transition-all cursor-pointer"
                          title="Descartar notificación"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h5 className="text-xs font-bold leading-snug mb-0.5 text-slate-900 dark:text-white">
                      {item.title}
                    </h5>
                    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                      {item.message}
                    </p>

                    {item.type === 'recurring_pending' && item.recurringItem && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2">
                        <span className={`text-xs font-mono font-bold tabular-nums ${
                          item.isExpense ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {item.isExpense ? '-' : '+'}${Number(item.amount || 0).toLocaleString('es-CO')}
                        </span>
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSkipRecurring?.(item.recurringItem);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer"
                            title="Avanzar ciclo sin registrar transacción"
                          >
                            Omitir
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApproveRecurring?.(item.recurringItem);
                            }}
                            className="px-3 py-1 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                            title="Registrar en transacciones y avanzar fecha"
                          >
                            <Check className="w-3 h-3" />
                            <span>Aprobar</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
