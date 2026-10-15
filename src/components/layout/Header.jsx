import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  CreditCard, 
  Receipt, 
  AlertTriangle, 
  CheckCircle2, 
  Target 
} from 'lucide-react';
import AppLogo from '../ui/AppLogo';
import Avatar from '../ui/Avatar';
import useFinancialDueAlerts from '../../hooks/useFinancialDueAlerts';

export default function Header({ 
  monthlyStats,
  userProfile = { name: 'Usuario', photo: null, initials: 'US' },
  syncUser = null,
  onOpenProfile,
  onOpenSettings,
  onOpenAuth,
  onLogout,
  theme = 'dark',
  onToggleTheme,
  accounts = [],
  investments = [],
  subscriptions = [],
  recurringPayments = [],
  debtsAndLoans = [],
  savingsGoals = [],
  onOpenCustomizeWidgets,
  onApproveRecurring = null,
  onSkipRecurring = null
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Hook unificado para evaluación de vencimientos y alertas financieras
  const {
    activeAlerts: activeNotifications,
    unreadCount,
    dismissAlert: handleDismissNotification,
    markAllAsRead: handleMarkAllAsRead,
    hasNotifications
  } = useFinancialDueAlerts({
    accounts,
    investments,
    debtsAndLoans,
    subscriptions,
    recurringPayments,
    savingsGoals
  });

  // Close notifications modal when pressing Escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header 
      className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-white/[0.08] shrink-0 z-40 w-full transition-all px-4 pb-3 shadow-xs"
      style={{ 
        backgroundColor: 'var(--header-bg)', 
        borderColor: 'var(--border-color)',
        paddingTop: 'max(env(safe-area-inset-top), 16px)'
      }}
    >
      <div className="flex items-center justify-between">
        {/* Extremo izquierdo: Logo oficial de Monety con nombre de marca */}
        <div className="flex items-center shrink-0">
          <AppLogo size="md" showText={true} />
        </div>

        {/* Extremo derecho: Notificaciones y Perfil */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Botón de Notificaciones con Badge dinámico */}
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all relative cursor-pointer opacity-85 hover:opacity-100 border border-slate-200/80 dark:border-white/10 shadow-sm"
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
            title={hasNotifications ? `${activeNotifications.length} notificaciones pendientes` : "Sin notificaciones"}
            aria-label="Notificaciones"
          >
            <Bell className="w-4.5 h-4.5" />
            {hasNotifications && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white dark:border-[#0f172a]"></span>
              </span>
            )}
          </button>

          {/* Botón de Perfil con Avatar determinista y presencia de red */}
          <button
            type="button"
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              else if (onOpenSettings) onOpenSettings();
            }}
            className="flex items-center justify-center select-none cursor-pointer active:scale-95 transition-transform p-0.5 rounded-full focus:outline-none"
            title={`Perfil - ${userProfile?.name || 'Usuario'}`}
            aria-label={`Perfil - ${userProfile?.name || 'Usuario'}`}
          >
            <Avatar 
              src={syncUser?.user_metadata?.avatar_url || userProfile?.avatar_url || userProfile?.photo} 
              name={syncUser?.user_metadata?.full_name || userProfile?.name} 
              email={syncUser?.email || userProfile?.email}
              size="sm" 
              showStatus={false} 
            />
          </button>
        </div>
      </div>

      {/* Modal / Drawer Limpio de Notificaciones */}
      {isNotificationsOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-start sm:items-center justify-center sm:justify-end sm:p-6 z-50 animate-fadeIn"
          onClick={() => setIsNotificationsOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-[420px] rounded-b-3xl sm:rounded-3xl shadow-2xl border flex flex-col max-h-[85vh] overflow-hidden animate-slide-up"
            style={{ 
              backgroundColor: 'var(--modal-bg, #0f172a)', 
              borderColor: 'var(--border-color, rgba(255,255,255,0.1))',
              color: 'var(--text-main)'
            }}
          >
            {/* Header del Modal */}
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
                    {hasNotifications 
                      ? `${activeNotifications.length} alerta(s) pendientes`
                      : 'Todo al día'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasNotifications && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:underline transition-all cursor-pointer px-2 py-1 rounded-lg hover:bg-emerald-500/10"
                    title="Marcar todas como leídas"
                  >
                    Marcar todas como leídas
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenido / Lista de Alertas */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
              {!hasNotifications ? (
                <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold mb-1">
                    No tienes notificaciones pendientes
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                    Tus fechas de corte, pagos de tarjeta, suscripciones y deudas están en orden y al día.
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
                            : 'bg-purple-500/15 text-purple-400'
                      }`}>
                        {item.icon === 'CreditCard' ? (
                          <CreditCard className="w-4.5 h-4.5" />
                        ) : item.icon === 'Receipt' ? (
                          <Receipt className="w-4.5 h-4.5" />
                        ) : item.icon === 'Target' ? (
                          <Target className="w-4.5 h-4.5 text-emerald-500" />
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
                                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            }`}>
                              {item.badge}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDismissNotification(item.id);
                              }}
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/15 active:scale-90 transition-all cursor-pointer"
                              title="Marcar como leída / Descartar"
                              aria-label="Marcar como leída"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h5 className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug mb-1">
                          {item.title}
                        </h5>
                        <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">
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

            {/* Footer del Modal */}
            <div className="p-3 border-t border-slate-200/60 dark:border-white/10 shrink-0 text-center">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(false)}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 transition-all cursor-pointer"
                style={{ color: 'var(--text-main)' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
