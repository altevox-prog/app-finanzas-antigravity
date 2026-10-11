import { useState, useEffect, useMemo, useCallback } from 'react';
import { safeNumber } from '../utils/financeMath';

/**
 * useFinancialDueAlerts
 * 
 * Hook centralizado para la detección y gestión de alertas financieras críticas:
 * - CDTs / Renta fija: Vencidos por liquidar (urgente) o próximos a vencer (≤ 3 días).
 * - Tarjetas de crédito: Día de corte (hoy) y fecha límite de pago (0 a 3 días).
 * - Deudas y préstamos: Cobros y pagos próximos (0 a 3 días) o atrasados.
 * - Suscripciones: Días de facturación mensual (0 a 3 días).
 * - Metas de ahorro: Recordatorio de cuota programada del mes.
 */
export function useFinancialDueAlerts({
  accounts = [],
  investments = [],
  debtsAndLoans = [],
  subscriptions = [],
  savingsGoals = []
} = {}) {
  // Almacenamiento persistente de alertas leídas/descartadas
  const [readAlertIds, setReadAlertIds] = useState(() => {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
      const saved = localStorage.getItem('presu_read_notification_ids') || localStorage.getItem('presu_notifications') || '[]';
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const dismissAlert = useCallback((id) => {
    setReadAlertIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('presu_read_notification_ids', JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadAlertIds((prev) => {
      const allIds = alerts.map(a => a.id);
      const next = Array.from(new Set([...prev, ...allIds]));
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('presu_read_notification_ids', JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  }, []);

  // Generación y evaluación de todas las alertas financieras
  const alerts = useMemo(() => {
    const list = [];
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();
    const todayMidnight = new Date(todayYear, todayMonth, todayDay);
    const daysInMonth = new Date(todayYear, todayMonth + 1, 0).getDate();

    // 1. CDTs / Renta Fija e Inversiones con Vencimiento
    (investments || []).forEach((inv) => {
      // Ignorar inversiones ya liquidadas
      if (inv.status === 'liquidated' || inv.isLiquidated) return;

      const isCDT = 
        inv.assetType === 'cdt' || 
        inv.assetType === 'fixed_income' || 
        inv.category === 'fixed' || 
        inv.category === 'CDT' ||
        inv.subType === 'cdt';

      if (!isCDT || !inv.dueDate) return;

      const parts = String(inv.dueDate).split('-');
      if (parts.length === 3) {
        const dueDateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const diffDays = Math.round((dueDateObj - todayMidnight) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          // CDT vencido (urgente: requiere liquidación)
          list.push({
            id: `cdt-matured-${inv.id}`,
            type: 'investment_cdt',
            category: 'CDT / Renta Fija',
            title: `CDT vencido por liquidar: ${inv.name}`,
            message: `Tu CDT en ${inv.name} venció el ${inv.dueDate}. Puedes liquidar el capital y rendimientos directamente a tu cuenta.`,
            date: inv.dueDate,
            urgency: 'urgent',
            badge: 'Vencido',
            icon: 'AlertTriangle',
            actionPayload: { investment: inv, action: 'liquidate' }
          });
        } else if (diffDays <= 3) {
          // Vencimiento próximo en ≤ 3 días (preventivo)
          list.push({
            id: `cdt-expiring-${inv.id}`,
            type: 'investment_cdt',
            category: 'CDT / Renta Fija',
            title: `Vencimiento próximo: ${inv.name}`,
            message: diffDays === 1
              ? `Tu CDT en ${inv.name} vence mañana (${inv.dueDate}). Prepara tu cuenta para recibir los rendimientos.`
              : `Faltan ${diffDays} días para el vencimiento de tu CDT en ${inv.name} (${inv.dueDate}).`,
            date: inv.dueDate,
            urgency: 'warning',
            badge: `En ${diffDays}d`,
            icon: 'Clock',
            actionPayload: { investment: inv, action: 'view' }
          });
        }
      }
    });

    // 2. Tarjetas de Crédito: Cortes y Pagos Límite
    (accounts || []).filter(acc => acc.type === 'card' || acc.type === 'credit').forEach((acc) => {
      // Día de corte (closingDate)
      if (acc.closingDate !== undefined && acc.closingDate !== null && acc.closingDate !== '') {
        const closingDay = parseInt(acc.closingDate, 10);
        if (!isNaN(closingDay) && closingDay === todayDay) {
          list.push({
            id: `card-closing-${acc.id}-${todayYear}-${todayMonth + 1}`,
            type: 'credit_card_closing',
            category: 'Tarjeta de Crédito',
            title: `Día de Corte: ${acc.name}`,
            message: `Hoy es el día de corte (${closingDay}) de tu tarjeta. Revisa el cierre de facturación de tu periodo.`,
            date: `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(closingDay).padStart(2, '0')}`,
            urgency: 'info',
            badge: 'Corte hoy',
            icon: 'CreditCard',
            actionPayload: { account: acc, action: 'closing' }
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
              id: `card-payment-${acc.id}-${todayYear}-${todayMonth + 1}`,
              type: 'credit_card_payment',
              category: 'Tarjeta de Crédito',
              title: `Pago Próximo: ${acc.name}`,
              message: diffDays === 0
                ? `¡Hoy es la fecha límite para pagar tu tarjeta!`
                : diffDays === 1
                  ? `El pago límite de tu tarjeta vence mañana (Día ${dueDay}).`
                  : `Faltan ${diffDays} días para el pago límite de tu tarjeta (Día ${dueDay}).`,
              date: targetDueDate.toISOString().split('T')[0],
              urgency: diffDays === 0 ? 'urgent' : 'warning',
              badge: diffDays === 0 ? 'Vence hoy' : `En ${diffDays} días`,
              icon: 'CreditCard',
              actionPayload: { account: acc, action: 'pay' }
            });
          }
        }
      }
    });

    // 3. Suscripciones y Pagos Recurrentes
    (subscriptions || []).forEach((sub) => {
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
              type: 'subscription',
              category: 'Suscripción',
              title: `Cobro: ${sub.name}`,
              message: diffDays === 0
                ? `Hoy se realiza el débito/cobro mensual de ${sub.name}.`
                : diffDays === 1
                  ? `Mañana se realiza el débito mensual de ${sub.name}.`
                  : `En ${diffDays} días se procesará el cobro de ${sub.name}.`,
              date: targetDate.toISOString().split('T')[0],
              urgency: diffDays === 0 ? 'urgent' : 'warning',
              badge: diffDays === 0 ? 'Cobro hoy' : `En ${diffDays} días`,
              icon: 'Receipt',
              actionPayload: { subscription: sub }
            });
          }
        }
      }
    });

    // 4. Deudas y Préstamos
    (debtsAndLoans || []).forEach((item) => {
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
              type: isReceivable ? 'loan_collection' : 'debt_payment',
              category: isReceivable ? 'Por Cobrar (Me deben)' : 'Deuda (Debo)',
              title,
              message,
              date: targetDateStr,
              urgency: diffDays === 0 ? 'urgent' : 'warning',
              badge: diffDays === 0 ? (isReceivable ? 'Cobro hoy' : 'Vence hoy') : diffDays === 1 ? (isReceivable ? 'Cobro mañana' : 'Vence mañana') : `En ${diffDays} días`,
              icon: isReceivable ? 'Receipt' : 'Clock',
              actionPayload: { debtOrLoan: item }
            });
          } else if (diffDays < 0 && Math.abs(diffDays) <= 14) {
            list.push({
              id: `debt-overdue-${item.id}-${todayYear}-${todayMonth + 1}`,
              type: 'debt_overdue',
              category: isReceivable ? 'Por Cobrar (Me deben)' : 'Deuda (Debo)',
              title: isReceivable ? `Cobro Atrasado: ${item.name}` : `Deuda Vencida: ${item.name}`,
              message: isReceivable 
                ? `La fecha de cobro de ${item.name} pasó hace ${Math.abs(diffDays)} día(s).` 
                : `El plazo de pago de ${item.name} venció hace ${Math.abs(diffDays)} día(s).`,
              date: targetDateStr,
              urgency: 'urgent',
              badge: 'Atrasado',
              icon: 'AlertTriangle',
              actionPayload: { debtOrLoan: item }
            });
          }
        }
      }
    });

    // 5. Metas de Ahorro: Recordatorio mensual en notification_day
    (savingsGoals || []).forEach((goal) => {
      const target = Number(goal.targetAmount || goal.target_amount || 0);
      const current = Number(goal.currentAmount || goal.current_amount || 0);
      const isCompleted = target > 0 && current >= target;

      if (isCompleted) return;

      const isNotifyEnabled = goal.notify_enabled !== false && goal.notifyEnabled !== false;
      if (!isNotifyEnabled) return;

      const rawDay = goal.notification_day || goal.notificationDay;
      const notifDay = parseInt(rawDay, 10);
      if (isNaN(notifDay) || notifDay < 1 || notifDay > 31) return;

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
          type: 'savings_goal',
          category: 'Meta de Ahorro',
          title: `Recordatorio de ahorro para ${goal.name}`,
          message: `Recordatorio de ahorro para ${goal.name}: Hoy corresponde abonar tu cuota de ${formattedInstallment} en tu cuenta ${accountName}.`,
          date: `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(effectiveDay).padStart(2, '0')}`,
          urgency: 'info',
          badge: 'Ahorro hoy',
          icon: 'Target',
          actionPayload: { goal }
        });
      }
    });

    return list;
  }, [accounts, investments, subscriptions, debtsAndLoans, savingsGoals]);

  // Alertas activas no descartadas
  const activeAlerts = useMemo(() => {
    return alerts.filter(item => !readAlertIds.includes(item.id));
  }, [alerts, readAlertIds]);

  const unreadCount = activeAlerts.length;

  return {
    alerts,
    activeAlerts,
    unreadCount,
    dismissAlert,
    markAllAsRead,
    // Alias para compatibilidad total con NotificationCenter y vistas existentes
    notifications: alerts,
    activeNotifications: activeAlerts,
    hasNotifications: unreadCount > 0,
    readNotificationIds: readAlertIds,
    handleDismissNotification: dismissAlert,
    handleMarkAllAsRead: markAllAsRead
  };
}

export default useFinancialDueAlerts;
