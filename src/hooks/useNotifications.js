import { useState, useEffect, useMemo } from 'react';
import { safeNumber } from '../utils/financeMath';

/**
 * useNotifications
 * Hook centralizado para calcular alertas y recordatorios financieros:
 * - Tarjetas de crédito (cortes y fechas límites de pago)
 * - Suscripciones y pagos recurrentes
 * - Préstamos y deudas (cobros y vencimientos)
 * - Metas de ahorro: recordatorio en notification_day con cuota y cuenta de destino
 */
export function useNotifications({
  accounts = [],
  subscriptions = [],
  debtsAndLoans = [],
  savingsGoals = []
} = {}) {
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

  const notifications = useMemo(() => {
    const list = [];
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();
    const todayMidnight = new Date(todayYear, todayMonth, todayDay);
    const daysInMonth = new Date(todayYear, todayMonth + 1, 0).getDate();

    // 1. Tarjetas de Crédito
    (accounts || []).filter(acc => acc.type === 'card' || acc.type === 'credit').forEach(acc => {
      if (acc.closingDate !== undefined && acc.closingDate !== null && acc.closingDate !== '') {
        const closingDay = parseInt(acc.closingDate, 10);
        if (!isNaN(closingDay) && closingDay === todayDay) {
          list.push({
            id: `card-closing-${acc.id}-${todayYear}-${todayMonth + 1}`,
            category: 'Tarjeta de Crédito',
            title: `Día de Corte: ${acc.name}`,
            message: `Hoy es el día de corte (${closingDay}) de tu tarjeta. Revisa el cierre de facturación de tu periodo.`,
            badge: 'Corte hoy',
            urgency: 'info',
            icon: 'CreditCard'
          });
        }
      }

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
              id: `card-payment-${acc.id}-${todayYear}-${todayMonth + 1}`,
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

    // 2. Suscripciones y Recurrentes
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
              id: `sub-${sub.id}-${todayYear}-${todayMonth + 1}`,
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

      const isReceivable = item.type === 'receivable' || item.type === 'lent';
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
              id: `debt-${item.id}-${todayYear}-${todayMonth + 1}`,
              category: isReceivable ? 'Por Cobrar (Me deben)' : 'Deuda (Debo)',
              title,
              message,
              badge: diffDays === 0 ? (isReceivable ? 'Cobro hoy' : 'Vence hoy') : diffDays === 1 ? (isReceivable ? 'Cobro mañana' : 'Vence mañana') : `En ${diffDays} días`,
              urgency: diffDays === 0 ? 'urgent' : 'warning',
              icon: isReceivable ? 'Receipt' : 'Clock'
            });
          } else if (diffDays < 0 && Math.abs(diffDays) <= 14) {
            list.push({
              id: `debt-overdue-${item.id}-${todayYear}-${todayMonth + 1}`,
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

      // Si la meta ya se cumplió, no generar recordatorio
      if (isCompleted) return;

      const isNotifyEnabled = goal.notify_enabled !== false && goal.notifyEnabled !== false;
      if (!isNotifyEnabled) return;

      const rawDay = goal.notification_day || goal.notificationDay;
      const notifDay = parseInt(rawDay, 10);
      if (isNaN(notifDay) || notifDay < 1 || notifDay > 31) return;

      // Adaptar al día máximo del mes actual
      const effectiveDay = Math.min(notifDay, daysInMonth);

      if (todayDay === effectiveDay) {
        // ID único por meta, año y mes para no duplicar en el mismo mes tras descartar o leer
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

  return {
    notifications,
    activeNotifications,
    hasNotifications: activeNotifications.length > 0,
    readNotificationIds,
    handleDismissNotification,
    handleMarkAllAsRead
  };
}

export default useNotifications;
