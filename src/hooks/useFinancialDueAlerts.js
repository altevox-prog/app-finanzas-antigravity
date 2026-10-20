import { useState, useMemo, useCallback } from 'react';
import { safeNumber } from '../utils/financeMath';
import { getTodayLocalString, normalizeDateToYYYYMMDD } from '../services/recurring/recurringAutoProcessor';

export function useFinancialDueAlerts({
  accounts = [], investments = [], debtsAndLoans = [],
  subscriptions = [], recurringPayments = [], savingsGoals = []
} = {}) {
  const [readAlertIds, setReadAlertIds] = useState(() => {
    try {
      if (typeof localStorage === 'undefined') return [];
      return JSON.parse(localStorage.getItem('presu_read_notification_ids') || localStorage.getItem('presu_notifications') || '[]');
    } catch { return []; }
  });

  const saveReadIds = (next) => { try { if (typeof localStorage !== 'undefined') localStorage.setItem('presu_read_notification_ids', JSON.stringify(next)); } catch {} };

  const dismissAlert = useCallback((id) => {
    setReadAlertIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveReadIds(next);
      return next;
    });
  }, []);

  const alerts = useMemo(() => {
    const list = [], now = new Date(), todayY = now.getFullYear(), todayM = now.getMonth(), todayD = now.getDate();
    const todayMidnight = new Date(todayY, todayM, todayD), daysInMonth = new Date(todayY, todayM + 1, 0).getDate();
    const getDiffDays = (d) => Math.round((d - todayMidnight) / (1000 * 60 * 60 * 24));
    const parseYMD = (str) => { if (!str) return null; const p = String(str).split('-'); return p.length === 3 ? new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)) : null; };

    // 1. CDTs / Renta Fija
    (investments || []).forEach((inv) => {
      if (inv.status === 'liquidated' || inv.isLiquidated || !inv.dueDate) return;
      if (!(['cdt', 'fixed_income'].includes(inv.assetType) || ['fixed', 'CDT'].includes(inv.category) || inv.subType === 'cdt')) return;
      const dueObj = parseYMD(inv.dueDate);
      if (!dueObj) return;
      const diff = getDiffDays(dueObj);
      if (diff <= 0) {
        list.push({ id: `cdt-matured-${inv.id}`, type: 'investment_cdt', category: 'CDT / Renta Fija', title: `CDT vencido por liquidar: ${inv.name}`, message: `Tu CDT en ${inv.name} venció el ${inv.dueDate}. Puedes liquidarlo a tu cuenta.`, date: inv.dueDate, urgency: 'urgent', badge: 'Vencido', icon: 'AlertTriangle', actionPayload: { investment: inv, action: 'liquidate' } });
      } else if (diff <= 3) {
        list.push({ id: `cdt-expiring-${inv.id}`, type: 'investment_cdt', category: 'CDT / Renta Fija', title: `Vencimiento próximo: ${inv.name}`, message: diff === 1 ? `Tu CDT en ${inv.name} vence mañana (${inv.dueDate}).` : `Faltan ${diff} días para el vencimiento de ${inv.name} (${inv.dueDate}).`, date: inv.dueDate, urgency: 'warning', badge: `En ${diff}d`, icon: 'Clock', actionPayload: { investment: inv, action: 'view' } });
      }
    });

    // 2. Tarjetas de Crédito
    (accounts || []).filter((a) => ['card', 'credit'].includes(a.type)).forEach((acc) => {
      if (acc.closingDate !== undefined && acc.closingDate !== null && acc.closingDate !== '') {
        const cDay = parseInt(acc.closingDate, 10);
        if (!isNaN(cDay) && cDay === todayD) {
          list.push({ id: `card-closing-${acc.id}-${todayY}-${todayM + 1}`, type: 'credit_card_closing', category: 'Tarjeta de Crédito', title: `Día de Corte: ${acc.name}`, message: `Hoy es el día de corte (${cDay}) de tu tarjeta.`, date: `${todayY}-${String(todayM + 1).padStart(2, '0')}-${String(cDay).padStart(2, '0')}`, urgency: 'info', badge: 'Corte hoy', icon: 'CreditCard', actionPayload: { account: acc, action: 'closing' } });
        }
      }
      if (acc.paymentDueDate !== undefined && acc.paymentDueDate !== null && acc.paymentDueDate !== '') {
        const dueDay = parseInt(acc.paymentDueDate, 10);
        if (!isNaN(dueDay)) {
          let target = new Date(todayY, todayM, dueDay), diff = getDiffDays(target);
          if (diff < 0 && Math.abs(diff) > 3) { target = new Date(todayY, todayM + 1, dueDay); diff = getDiffDays(target); }
          if (diff >= 0 && diff <= 3) {
            list.push({ id: `card-payment-${acc.id}-${todayY}-${todayM + 1}`, type: 'credit_card_payment', category: 'Tarjeta de Crédito', title: `Pago Próximo: ${acc.name}`, message: diff === 0 ? '¡Hoy es la fecha límite para pagar tu tarjeta!' : diff === 1 ? `El pago límite vence mañana (Día ${dueDay}).` : `Faltan ${diff} días para el pago límite (Día ${dueDay}).`, date: target.toISOString().split('T')[0], urgency: diff === 0 ? 'urgent' : 'warning', badge: diff === 0 ? 'Vence hoy' : `En ${diff} días`, icon: 'CreditCard', actionPayload: { account: acc, action: 'pay' } });
          }
        }
      }
    });

    // 3. Pagos Recurrentes
    const todayStr = getTodayLocalString();
    const allRec = (recurringPayments && recurringPayments.length > 0) ? recurringPayments : (subscriptions || []);
    allRec.forEach((item) => {
      if (!item) return;
      if (item.mode === 'manual' && item.active !== false && item.isActive !== false) {
        const nextDate = normalizeDateToYYYYMMDD(item.nextPaymentDate || item.nextDate || item.next_date);
        if (nextDate && nextDate <= todayStr) {
          const isOverdue = nextDate < todayStr, isExp = item.type !== 'income';
          list.push({ id: `pending-recurring-${item.id}-${nextDate}`, type: 'recurring_pending', category: isExp ? 'Gasto por confirmar' : 'Ingreso por confirmar', title: item.name || 'Movimiento recurrente', message: isOverdue ? `Venció el ${nextDate}. Requiere confirmación.` : `Vence hoy. Confirma si deseas registrar este ${isExp ? 'gasto' : 'ingreso'}.`, amount: Number(item.amount) || 0, isExpense: isExp, date: nextDate, urgency: isOverdue ? 'urgent' : 'warning', badge: isOverdue ? 'Vencido' : 'Pendiente hoy', icon: 'Bell', recurringItem: item });
        }
      } else if (item.mode !== 'manual' && item.billingDay) {
        const bDay = parseInt(item.billingDay, 10);
        if (!isNaN(bDay)) {
          let target = new Date(todayY, todayM, bDay), diff = getDiffDays(target);
          if (diff < 0 && Math.abs(diff) > 3) { target = new Date(todayY, todayM + 1, bDay); diff = getDiffDays(target); }
          if (diff >= 0 && diff <= 3) {
            list.push({ id: `sub-${item.id}-${todayY}-${todayM + 1}`, type: 'subscription', category: 'Suscripción', title: `Cobro: ${item.name}`, message: diff === 0 ? `Hoy se realiza el débito de ${item.name}.` : diff === 1 ? `Mañana se realiza el débito de ${item.name}.` : `En ${diff} días se procesará el cobro de ${item.name}.`, date: target.toISOString().split('T')[0], urgency: diff === 0 ? 'urgent' : 'warning', badge: diff === 0 ? 'Cobro hoy' : `En ${diff} días`, icon: 'Receipt', actionPayload: { subscription: item } });
          }
        }
      }
    });

    // 4. Deudas y Préstamos
    (debtsAndLoans || []).forEach((item) => {
      const base = safeNumber(item.totalAmount);
      const totalToPay = base + (base * (safeNumber(item.interestRate) / 100)) + safeNumber(item.insuranceFee);
      const totalPaid = (item.payments || []).reduce((s, p) => s + safeNumber(p.amount), 0);
      if (Math.max(0, totalToPay - totalPaid) <= 1) return;

      const isRec = item.type === 'receivable' || item.type === 'lent';
      const targetStr = isRec ? (item.collectionDate || item.dueDate) : item.dueDate;
      const targetDate = parseYMD(targetStr);
      if (!targetDate) return;
      const diff = getDiffDays(targetDate);

      if (diff >= 0 && diff <= 3) {
        list.push({
          id: `debt-${item.id}-${todayY}-${todayM + 1}`, type: isRec ? 'loan_collection' : 'debt_payment',
          category: isRec ? 'Por Cobrar (Me deben)' : 'Deuda (Debo)',
          title: diff === 1 ? (isRec ? `Recordatorio de Cobro: ${item.name}` : `Recordatorio: Vence mañana ${item.name}`) : (isRec ? `Cobro Próximo: ${item.name}` : `Vencimiento: ${item.name}`),
          message: diff === 0 ? (isRec ? `Hoy corresponde cobrar a ${item.name}.` : `Hoy es el día límite de pago para ${item.name}.`) : diff === 1 ? (isRec ? `Mañana corresponde cobrarle a ${item.name}.` : `El pago de ${item.name} vence mañana.`) : `Faltan ${diff} días para el vencimiento de ${item.name}.`,
          date: targetStr, urgency: diff === 0 ? 'urgent' : 'warning', badge: diff === 0 ? (isRec ? 'Cobro hoy' : 'Vence hoy') : `En ${diff} días`, icon: isRec ? 'Receipt' : 'Clock', actionPayload: { debtOrLoan: item }
        });
      } else if (diff < 0 && Math.abs(diff) <= 14) {
        list.push({ id: `debt-overdue-${item.id}-${todayY}-${todayM + 1}`, type: 'debt_overdue', category: isRec ? 'Por Cobrar (Me deben)' : 'Deuda (Debo)', title: isRec ? `Cobro Atrasado: ${item.name}` : `Deuda Vencida: ${item.name}`, message: `La fecha de vencimiento de ${item.name} pasó hace ${Math.abs(diff)} día(s).`, date: targetStr, urgency: 'urgent', badge: 'Atrasado', icon: 'AlertTriangle', actionPayload: { debtOrLoan: item } });
      }
    });

    // 5. Metas de Ahorro
    (savingsGoals || []).forEach((goal) => {
      const target = Number(goal.targetAmount || goal.target_amount || 0), current = Number(goal.currentAmount || goal.current_amount || 0);
      if ((target > 0 && current >= target) || goal.notify_enabled === false || goal.notifyEnabled === false) return;
      const notifDay = parseInt(goal.notification_day || goal.notificationDay, 10);
      if (isNaN(notifDay) || notifDay < 1 || notifDay > 31) return;
      const effectiveDay = Math.min(notifDay, daysInMonth);
      if (todayD === effectiveDay) {
        const installment = Math.round(Math.max(0, target - current) / Math.max(1, Number(goal.months) || 1));
        const targetAcc = (accounts || []).find((a) => String(a.id) === String(goal.target_account_id || goal.targetAccountId));
        list.push({
          id: `goal-reminder-${goal.id}-${todayY}-${todayM + 1}`, type: 'savings_goal', category: 'Meta de Ahorro',
          title: `Recordatorio de ahorro: ${goal.name}`,
          message: `Hoy corresponde abonar $${installment.toLocaleString('es-CO')} en ${targetAcc ? targetAcc.name : 'tu cuenta'}.`,
          date: `${todayY}-${String(todayM + 1).padStart(2, '0')}-${String(effectiveDay).padStart(2, '0')}`,
          urgency: 'info', badge: 'Ahorro hoy', icon: 'Target', actionPayload: { goal }
        });
      }
    });

    return list;
  }, [accounts, investments, subscriptions, recurringPayments, debtsAndLoans, savingsGoals]);

  const markAllAsRead = useCallback(() => {
    setReadAlertIds((prev) => {
      const next = Array.from(new Set([...prev, ...alerts.map((a) => a.id)]));
      saveReadIds(next);
      return next;
    });
  }, [alerts]);

  const activeAlerts = useMemo(() => alerts.filter((item) => !readAlertIds.includes(item.id)), [alerts, readAlertIds]);

  return {
    alerts, activeAlerts, unreadCount: activeAlerts.length, dismissAlert, markAllAsRead,
    notifications: alerts, activeNotifications: activeAlerts, hasNotifications: activeAlerts.length > 0,
    readNotificationIds: readAlertIds, handleDismissNotification: dismissAlert, handleMarkAllAsRead: markAllAsRead
  };
}

export default useFinancialDueAlerts;
