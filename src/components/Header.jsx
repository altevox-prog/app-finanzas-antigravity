import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  X, 
  Check,
  CreditCard, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Receipt,
  AlertTriangle,
  Target
} from 'lucide-react';
import AppLogo from './AppLogo';
import { safeNumber } from '../utils/financeMath';

export default function Header({ 
  monthlyStats,
  userProfile = { name: 'Usuario', photo: null, initials: 'US' },
  onOpenProfile,
  onOpenSettings,
  onOpenAuth,
  onLogout,
  theme = 'dark',
  onToggleTheme,
  accounts = [],
  subscriptions = [],
  debtsAndLoans = [],
  savingsGoals = [],
  onOpenCustomizeWidgets
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Estado de notificaciones leídas/descartadas persistido en localStorage
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try {
      const saved = localStorage.getItem('presu_read_notification_ids') || localStorage.getItem('presu_notifications') || '[]';
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const handleDismissNotification = (id) => {
    setReadNotificationIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem('presu_read_notification_ids', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotificationIds((prev) => {
      const next = Array.from(new Set([...prev, ...allIds]));
      try {
        localStorage.setItem('presu_read_notification_ids', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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

  // Dynamic notifications calculation
  const notifications = useMemo(() => {
    const list = [];
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();
    const todayMidnight = new Date(todayYear, todayMonth, todayDay);

    // 1. Tarjetas de Crédito
    (accounts || []).filter(acc => acc.type === 'card' || acc.type === 'credit').forEach(acc => {
      // Día de corte (closingDate)
      if (acc.closingDate !== undefined && acc.closingDate !== null && acc.closingDate !== '') {
        const closingDay = parseInt(acc.closingDate, 10);
        if (!isNaN(closingDay) && closingDay === todayDay) {
          list.push({
            id: `card-closing-${acc.id}`,
            category: 'Tarjeta de Crédito',
            title: `Día de Corte: ${acc.name}`,
            message: `Hoy es el día de corte (${closingDay}) de tu tarjeta. Revisa el cierre de facturación de tu periodo.`,
            badge: 'Corte hoy',
            urgency: 'info',
            icon: 'CreditCard'
          });
        }
      }

      // Día límite de pago (paymentDueDate)
      if (acc.paymentDueDate !== undefined && acc.paymentDueDate !== null && acc.paymentDueDate !== '') {
        const dueDay = parseInt(acc.paymentDueDate, 10);
        if (!isNaN(dueDay)) {
          let targetDueDate = new Date(todayYear, todayMonth, dueDay);
          let diffDays = Math.round((targetDueDate - todayMidnight) / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0 && Math.abs(diffDays) > 3) {
            targetDueDate = new Date(todayYear, todayMonth + 1, dueDay);
            diffDays = Math.round((targetDueDate - todayMidnight) / (1000 * 60 * 60 * 24));
          }

          if (diffDays >= 0 && diffDays <= 3) {
            list.push({
              id: `card-payment-${acc.id}`,
              category: 'Tarjeta de Crédito',
              title: `Pago Próximo: ${acc.name}`,
              message: diffDays === 0 
                ? `¡Hoy es la fecha límite para pagar tu tarjeta!` 
                : diffDays === 1 
                  ? `El pago límite de tu tarjeta vence mañana (Día ${dueDay}).`
                  : `Faltan ${diffDays} días para el pago límite de tu tarjeta (Día ${dueDay}).`,
              badge: diffDays === 0 ? 'Vence hoy' : `En ${diffDays} días`,
              urgency: diffDays === 0 ? 'urgent' : 'warning',
              icon: 'CreditCard'
            });
          }
        }
      }
    });

    // 2. Suscripciones
    (subscriptions || []).forEach(sub => {
      if (sub.billingDay !== undefined && sub.billingDay !== null && sub.billingDay !== '') {
        const bDay = parseInt(sub.billingDay, 10);
        if (!isNaN(bDay)) {
          let targetDate = new Date(todayYear, todayMonth, bDay);
          let diffDays = Math.round((targetDate - todayMidnight) / (1000 * 60 * 60 * 24));

          if (diffDays < 0 && Math.abs(diffDays) > 3) {
            targetDate = new Date(todayYear, todayMonth + 1, bDay);
            diffDays = Math.round((targetDate - todayMidnight) / (1000 * 60 * 60 * 24));
          }

          if (diffDays >= 0 && diffDays <= 3) {
            list.push({
              id: `sub-${sub.id}`,
              category: 'Suscripción',
              title: `Cobro: ${sub.name}`,
              message: diffDays === 0
                ? `Hoy se realiza el débito/cobro mensual de ${sub.name}.`
                : diffDays === 1
                  ? `Mañana se realiza el débito mensual de ${sub.name}.`
                  : `En ${diffDays} días se procesará el cobro de ${sub.name}.`,
              badge: diffDays === 0 ? 'Cobro hoy' : `En ${diffDays} días`,
              urgency: diffDays === 0 ? 'urgent' : 'warning',
              icon: 'Receipt'
            });
          }
        }
      }
    });

    // 3. Deudas y Préstamos
    (debtsAndLoans || []).forEach(item => {
      const base = safeNumber(item.totalAmount);
      const rate = safeNumber(item.interestRate);
      const insurance = safeNumber(item.insuranceFee);
      const totalToPay = base + (base * (rate / 100)) + insurance;
      const totalPaid = (item.payments || []).reduce((sum, p) => sum + safeNumber(p.amount), 0);
      const outstandingBalance = Math.max(0, totalToPay - totalPaid);
      const isPending = outstandingBalance > 1;

      if (!isPending) return;

      const isReceivable = item.type === 'receivable';
      const targetDateStr = isReceivable ? (item.collectionDate || item.dueDate) : item.dueDate;

      if (targetDateStr) {
        const parts = targetDateStr.split('-');
        if (parts.length === 3) {
          const targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          const diffDays = Math.round((targetDate - todayMidnight) / (1000 * 60 * 60 * 24));

          if (diffDays >= 0 && diffDays <= 3) {
            const title = diffDays === 1
              ? (isReceivable 
                  ? `Recordatorio de Cobro: Mañana corresponde cobrarle a ${item.name}`
                  : `Recordatorio: Mañana vence el pago de ${item.name}`)
              : (isReceivable ? `Cobro Próximo: ${item.name}` : `Vencimiento: ${item.name}`);

            const message = diffDays === 0
              ? (isReceivable ? `Hoy corresponde cobrar la cuota o saldo a ${item.name}.` : `Hoy es el día límite de pago para ${item.name}.`)
              : diffDays === 1
                ? (isReceivable ? `Mañana corresponde cobrarle la cuota o saldo a ${item.name}.` : `El pago para ${item.name} vence mañana.`)
                : (isReceivable ? `En ${diffDays} días corresponde cobrarle a ${item.name}.` : `Faltan ${diffDays} días para el vencimiento de ${item.name}.`);

            list.push({
              id: `debt-${item.id}`,
              category: isReceivable ? 'Por Cobrar (Me deben)' : 'Deuda (Debo)',
              title,
              message,
              badge: diffDays === 0 ? (isReceivable ? 'Cobro hoy' : 'Vence hoy') : diffDays === 1 ? (isReceivable ? 'Cobro mañana' : 'Vence mañana') : `En ${diffDays} días`,
              urgency: diffDays === 0 ? 'urgent' : 'warning',
              icon: isReceivable ? 'Receipt' : 'Clock'
            });
          } else if (diffDays < 0 && Math.abs(diffDays) <= 14) {
            list.push({
              id: `debt-overdue-${item.id}`,
              category: isReceivable ? 'Por Cobrar (Me deben)' : 'Deuda (Debo)',
              title: isReceivable ? `Cobro Atrasado: ${item.name}` : `Deuda Vencida: ${item.name}`,
              message: isReceivable 
                ? `La fecha de cobro de ${item.name} pasó hace ${Math.abs(diffDays)} día(s).` 
                : `El plazo de pago de ${item.name} venció hace ${Math.abs(diffDays)} día(s).`,
              badge: 'Atrasado',
              urgency: 'urgent',
              icon: 'AlertCircle'
            });
          }
        }
      }
    });

    // 4. Metas de Ahorro: Recordatorio mensual en notification_day
    (savingsGoals || []).forEach(goal => {
      const target = Number(goal.targetAmount || goal.target_amount || 0);
      const current = Number(goal.currentAmount || goal.current_amount || 0);
      const isCompleted = target > 0 && current >= target;

      if (isCompleted) return;

      const isNotifyEnabled = goal.notify_enabled !== false && goal.notifyEnabled !== false;
      if (!isNotifyEnabled) return;

      const rawDay = goal.notification_day || goal.notificationDay;
      const notifDay = parseInt(rawDay, 10);
      if (isNaN(notifDay) || notifDay < 1 || notifDay > 31) return;

      const daysInMonth = new Date(todayYear, todayMonth + 1, 0).getDate();
      const effectiveDay = Math.min(notifDay, daysInMonth);

      if (todayDay === effectiveDay) {
        const notifId = `goal-reminder-${goal.id}-${todayYear}-${todayMonth + 1}`;
        const m = Math.max(1, Number(goal.months) || 1);
        const remaining = Math.max(0, target - current);
        const installment = Math.round(remaining / m);

        const targetAccId = goal.target_account_id || goal.targetAccountId;
        const targetAcc = (accounts || []).find(a => String(a.id) === String(targetAccId));
        const accountName = targetAcc ? targetAcc.name : 'tu cuenta de ahorros';
        const formattedInstallment = `$${installment.toLocaleString('es-CO')}`;

        list.push({
          id: notifId,
          category: 'Meta de Ahorro',
          title: `Recordatorio de ahorro para ${goal.name}`,
          message: `Recordatorio de ahorro para ${goal.name}: Hoy corresponde abonar tu cuota de ${formattedInstallment} en tu cuenta ${accountName}.`,
          badge: 'Ahorro hoy',
          urgency: 'info',
          icon: 'Target'
        });
      }
    });

    return list;
  }, [accounts, subscriptions, debtsAndLoans, savingsGoals]);

  const activeNotifications = useMemo(() => {
    return notifications.filter(item => !readNotificationIds.includes(item.id));
  }, [notifications, readNotificationIds]);

  const hasNotifications = activeNotifications.length > 0;

  return (
    <header 
      className="backdrop-blur-xl border-b sticky top-0 z-30 transition-all px-4 pb-3"
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
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all relative cursor-pointer opacity-85 hover:opacity-100 border border-slate-200/80 dark:border-white/10 shadow-2xs"
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

          {/* Botón de Perfil (el avatar con foto o iniciales) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              else if (onOpenSettings) onOpenSettings();
            }}
            className="w-9 h-9 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/15 flex items-center justify-center shadow-2xs select-none cursor-pointer active:scale-95 hover:border-emerald-500/60 transition-all bg-emerald-600/10"
            title={`Perfil - ${userProfile?.name || 'Usuario'}`}
            aria-label={`Perfil - ${userProfile?.name || 'Usuario'}`}
          >
            {userProfile?.photo ? (
              <img 
                src={userProfile.photo} 
                alt={userProfile.name} 
                className="w-full h-full object-cover"
              />
            ) : userProfile?.initials && userProfile.initials !== 'US' ? (
              <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                {userProfile.initials}
              </div>
            ) : (
              <img 
                src="/icon-192x192.png" 
                alt="Monety" 
                className="w-full h-full object-cover"
              />
            )}
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

