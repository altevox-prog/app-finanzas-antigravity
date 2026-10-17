import React from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  CreditCard, 
  Receipt, 
  Target, 
  CheckCircle2, 
  Wifi, 
  Tv, 
  CalendarClock 
} from 'lucide-react';

/**
 * Helpers para formateo gramatical, Sentence Case y eliminación de textos redundantes
 */
function cleanNotificationTitle(title) {
  if (!title) return '';
  return title
    .replace(/^(Cobro:\s*|Recordatorio:\s*|Vencimiento:\s*|Recordatorio de Cobro:\s*|Cobro Próximo:\s*|Pago Próximo:\s*|Cobro Atrasado:\s*|Deuda Vencida:\s*)/i, '')
    .trim();
}

function formatNotificationAmountAndMethod(item) {
  let amt = 0;
  let method = '';

  if (item.recurringItem) {
    amt = Number(item.amount || item.recurringItem.amount || 0);
    method = item.recurringItem.mode === 'automatic'
      ? 'Débito automático'
      : (item.recurringItem.accountName || item.recurringItem.account || '');
  } else if (item.actionPayload?.subscription) {
    const sub = item.actionPayload.subscription;
    amt = Number(sub.amount || 0);
    method = sub.mode === 'automatic' || sub.isAutoPay
      ? 'Débito automático'
      : (sub.accountName || sub.account || '');
  } else if (item.type === 'credit_card_payment') {
    return 'Fecha límite de pago mensual';
  } else if (item.actionPayload?.debtOrLoan) {
    const debt = item.actionPayload.debtOrLoan;
    amt = Number(debt.totalAmount || 0);
    method = (debt.type === 'receivable' || debt.type === 'lent') ? 'Por cobrar' : 'Por pagar';
  } else if (item.amount) {
    amt = Number(item.amount || 0);
  }

  const amtStr = amt > 0 ? `$ ${amt.toLocaleString('es-CO')}` : '';
  if (amtStr && method) return `${amtStr} • ${method}`;
  if (amtStr) return amtStr;
  if (method) return method;
  return item.message || '';
}

function formatCategory(category) {
  if (!category) return 'Aviso';
  const c = String(category).trim().toLowerCase();
  if (c === 'suscripción' || c === 'suscripcion' || c === 'suscripciones') {
    return 'Pago recurrente';
  }
  if (c === 'tarjeta de crédito' || c === 'tarjeta') {
    return 'Tarjeta de crédito';
  }
  return category.charAt(0).toUpperCase() + c.slice(1);
}

function getNotificationIcon(item) {
  const text = `${item.title || ''} ${item.category || ''} ${item.message || ''} ${item.recurringItem?.name || ''} ${item.actionPayload?.subscription?.name || ''}`.toLowerCase();
  
  if (text.includes('wifi') || text.includes('internet') || text.includes('fibra') || text.includes('claro') || text.includes('tigo') || text.includes('movistar') || text.includes('etb')) {
    return <Wifi className="w-4 h-4" />;
  }
  if (text.includes('tv') || text.includes('netflix') || text.includes('spotify') || text.includes('disney') || text.includes('hbo') || text.includes('prime') || text.includes('youtube') || text.includes('streaming') || text.includes('entretenimiento')) {
    return <Tv className="w-4 h-4" />;
  }
  if (item.type === 'credit_card_payment' || item.icon === 'CreditCard' || text.includes('tarjeta') || text.includes('crédito') || text.includes('credito')) {
    return <CreditCard className="w-4 h-4" />;
  }
  if (item.icon === 'Receipt' || text.includes('factura') || text.includes('servicio') || text.includes('recibo') || text.includes('luz') || text.includes('agua') || text.includes('gas')) {
    return <Receipt className="w-4 h-4" />;
  }
  if (item.icon === 'Target' || text.includes('meta') || text.includes('ahorro')) {
    return <Target className="w-4 h-4" />;
  }
  return <CalendarClock className="w-4 h-4" />;
}

function formatBadgeInfo(badge, urgency) {
  const b = String(badge || '').toLowerCase().trim();
  const isTomorrow = b.includes('1 día') || b.includes('1 dia') || b.includes('en 1 d') || b === 'cobro mañana' || b === 'vence mañana' || b === 'mañana';
  const isToday = b === 'cobro hoy' || b === 'vence hoy' || b === 'hoy' || b === 'pendiente hoy';
  const isOverdue = urgency === 'urgent' || b.includes('vencid') || b.includes('atrasad');

  let text = badge;
  if (isTomorrow) text = 'Vence mañana';
  else if (isToday) text = 'Vence hoy';
  else if (isOverdue) text = 'Vencido';

  let pillClasses = 'text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ';
  if (isOverdue || isToday) {
    pillClasses += 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400';
  } else if (isTomorrow) {
    pillClasses += 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400';
  } else {
    pillClasses += 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
  }

  return { text, pillClasses };
}

/**
 * NotificationItems
 * Renderizado de cada alerta financiera como fila de lista fluida o estado vacío
 */
function NotificationItems({
  hasItems,
  activeNotifications,
  onDismiss,
  onApproveRecurring,
  onSkipRecurring
}) {
  if (!hasItems) {
    return (
      <div className="py-8 flex flex-col items-center justify-center text-center px-4">
        <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-0.5">
          Sin notificaciones pendientes
        </h4>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
          Tus fechas de corte, pagos de tarjeta, suscripciones y deudas están al día.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activeNotifications.map((item) => {
        const isUrgent = item.urgency === 'urgent';
        const isWarning = item.urgency === 'warning';
        const { text: badgeText, pillClasses } = formatBadgeInfo(item.badge, item.urgency);
        const titleClean = cleanNotificationTitle(item.title);
        const amountAndMethod = formatNotificationAmountAndMethod(item);
        const categoryClean = formatCategory(item.category);

        return (
          <div 
            key={item.id}
            className="group p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer flex items-start gap-3"
          >
            {/* Icono: Contenedor redondeado moderno con icono según categoría */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isUrgent 
                ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400' 
                : isWarning 
                  ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-400' 
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
            }`}>
              {getNotificationIcon(item)}
            </div>

            {/* Contenido Central */}
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide truncate block">
                {categoryClean}
              </span>
              <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate leading-snug">
                {titleClean}
              </h5>
              {amountAndMethod && (
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                  {amountAndMethod}
                </p>
              )}
            </div>

            {/* Acción a la derecha: Badge de urgencia en pill refinado + Acción (Pagar o Descartar en hover) */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {badgeText && (
                <span className={pillClasses}>
                  {badgeText}
                </span>
              )}

              {item.type === 'recurring_pending' && item.recurringItem ? (
                <div className="flex items-center gap-1 mt-0.5">
                  {onSkipRecurring && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSkipRecurring(item.recurringItem);
                      }}
                      className="text-[10px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Omitir este ciclo"
                    >
                      Omitir
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApproveRecurring?.(item.recurringItem);
                    }}
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer"
                    title="Pagar / Registrar"
                  >
                    Pagar
                  </button>
                </div>
              ) : (
                onDismiss && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(item.id);
                    }}
                    className="text-[11px] font-medium text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Marcar como revisada"
                  >
                    Descartar
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * NotificationCenter
 * - Popover flotante premium anclado en PC (Escritorio md:) con backdrop invisible.
 * - Tarjeta flotante en Móvil (md:hidden) con backdrop desenfocado.
 */
export default function NotificationCenter({
  isOpen,
  onClose,
  notifications = [],
  activeNotifications = [],
  onDismiss,
  onMarkAllAsRead,
  onApproveRecurring = null,
  onSkipRecurring = null,
  onNavigate = null
}) {
  if (!isOpen) return null;

  const count = activeNotifications.length;
  const hasItems = count > 0;

  const handleViewRecurring = () => {
    if (typeof onNavigate === 'function') {
      onNavigate('recurring');
    } else if (typeof window !== 'undefined' && window.__monetyNavigate) {
      window.__monetyNavigate('recurring');
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('monety:navigate', { detail: 'recurring' }));
    }
    onClose?.();
  };

  return (
    <>
      {/* ============================================================== */}
      {/* 1. MODO ESCRITORIO (hidden md:block): Popover Anclado           */}
      {/* ============================================================== */}
      {/* Backdrop transparente global para cerrar al hacer clic afuera en PC */}
      <div 
        className="hidden md:block fixed inset-0 z-[65] bg-transparent" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div 
        onClick={(e) => e.stopPropagation()}
        className="hidden md:flex absolute right-0 top-full mt-3 w-84 sm:w-96 max-h-[520px] z-[70] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl p-4 backdrop-blur-md overflow-hidden flex-col text-slate-900 dark:text-white animate-slide-up"
      >
        {/* Cabecera Desktop */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-2 rounded-xl shrink-0 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">
                Notificaciones
              </h3>
              <span className="bg-emerald-100/60 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0">
                {count}
              </span>
            </div>
          </div>

          {hasItems && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="text-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              title="Marcar todas como leídas"
            >
              Marcar leídas
            </button>
          )}
        </div>

        {/* Lista de Notificaciones Desktop */}
        <div className="py-2 overflow-y-auto flex-1 space-y-1">
          <NotificationItems
            hasItems={hasItems}
            activeNotifications={activeNotifications}
            onDismiss={onDismiss}
            onApproveRecurring={onApproveRecurring}
            onSkipRecurring={onSkipRecurring}
          />
        </div>

        {/* Pie del Popover */}
        <div className="border-t border-slate-100 dark:border-slate-800 mt-2 pt-2 text-center shrink-0">
          <button
            type="button"
            onClick={handleViewRecurring}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Ver pagos recurrentes →
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. MODO MÓVIL (md:hidden): Tarjeta Flotante Centrada (Portal)  */}
      {/* ============================================================== */}
      {typeof document !== 'undefined' && createPortal(
        <div className="md:hidden fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Backdrop oscuro real a pantalla completa */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={onClose} 
          />

          {/* Contenedor de la tarjeta flotante centrada */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm max-h-[80vh] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl p-4 backdrop-blur-md flex flex-col z-10 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white"
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-2 rounded-xl shrink-0 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">
                    Notificaciones
                  </h3>
                  <span className="bg-emerald-100/60 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0">
                    {count}
                  </span>
                </div>
              </div>

              {hasItems && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="text-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  title="Marcar todas como leídas"
                >
                  Marcar leídas
                </button>
              )}
            </div>

            {/* Lista scrolleable interna de notificaciones */}
            <div className="overflow-y-auto max-h-[50vh] flex-1 py-2 space-y-1">
              <NotificationItems
                hasItems={hasItems}
                activeNotifications={activeNotifications}
                onDismiss={onDismiss}
                onApproveRecurring={onApproveRecurring}
                onSkipRecurring={onSkipRecurring}
              />
            </div>

            {/* Pie del Popover */}
            <div className="border-t border-slate-100 dark:border-slate-800 mt-2 pt-2 text-center shrink-0">
              <button
                type="button"
                onClick={handleViewRecurring}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Ver pagos recurrentes →
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

