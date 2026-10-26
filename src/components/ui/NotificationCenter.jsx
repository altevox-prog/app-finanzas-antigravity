import React from 'react';
import { createPortal } from 'react-dom';
import { Bell, CreditCard, Receipt, Target, CheckCircle2, Wifi, Tv, CalendarClock } from 'lucide-react';

const cleanNotificationTitle = (title) => (title || '').replace(/^(Cobro|Recordatorio( de Cobro)?|Vencimiento|Pago Próximo|Cobro Próximo|Cobro Atrasado|Deuda Vencida):\s*/i, '').trim();

function formatNotificationAmountAndMethod(item) {
  if (item.type === 'credit_card_payment') return 'Fecha límite de pago mensual';
  let amt = 0, method = '';
  if (item.recurringItem) {
    amt = Number(item.amount || item.recurringItem.amount || 0);
    method = item.recurringItem.mode === 'automatic' ? 'Débito automático' : (item.recurringItem.accountName || item.recurringItem.account || '');
  } else if (item.actionPayload?.subscription) {
    const sub = item.actionPayload.subscription;
    amt = Number(sub.amount || 0);
    method = sub.mode === 'automatic' || sub.isAutoPay ? 'Débito automático' : (sub.accountName || sub.account || '');
  } else if (item.actionPayload?.debtOrLoan) {
    const debt = item.actionPayload.debtOrLoan;
    amt = Number(debt.totalAmount || 0);
    method = (debt.type === 'receivable' || debt.type === 'lent') ? 'Por cobrar' : 'Por pagar';
  } else if (item.amount) amt = Number(item.amount || 0);

  const amtStr = amt > 0 ? `$ ${amt.toLocaleString('es-CO')}` : '';
  return amtStr && method ? `${amtStr} • ${method}` : amtStr || method || item.message || '';
}

const formatCategory = (cat) => {
  if (!cat) return 'Aviso';
  const c = String(cat).trim().toLowerCase();
  return /suscripci/.test(c) ? 'Pago recurrente' : /tarjeta/.test(c) ? 'Tarjeta de crédito' : cat.charAt(0).toUpperCase() + c.slice(1);
};

function getNotificationIcon(item) {
  const t = `${item.title || ''} ${item.category || ''} ${item.message || ''} ${item.recurringItem?.name || ''} ${item.actionPayload?.subscription?.name || ''}`.toLowerCase();
  if (/wifi|internet|fibra|claro|tigo|movistar|etb/.test(t)) return <Wifi className="w-4 h-4" />;
  if (/tv|netflix|spotify|disney|hbo|prime|youtube|streaming|entretenimiento/.test(t)) return <Tv className="w-4 h-4" />;
  if (item.type === 'credit_card_payment' || item.icon === 'CreditCard' || /tarjeta|cr[eé]dito/.test(t)) return <CreditCard className="w-4 h-4" />;
  if (item.icon === 'Receipt' || /factura|servicio|recibo|luz|agua|gas/.test(t)) return <Receipt className="w-4 h-4" />;
  return item.icon === 'Target' || /meta|ahorro/.test(t) ? <Target className="w-4 h-4" /> : <CalendarClock className="w-4 h-4" />;
}

function formatBadgeInfo(badge, urgency) {
  const b = String(badge || '').toLowerCase().trim();
  const isTomorrow = /1 d[ií]a|ma[ñn]ana/.test(b), isToday = /hoy/.test(b), isOverdue = urgency === 'urgent' || /vencid|atrasad/.test(b);
  const text = isTomorrow ? 'Vence mañana' : isToday ? 'Vence hoy' : isOverdue ? 'Vencido' : badge;
  const pillClasses = `text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
    isOverdue || isToday ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400' : isTomorrow ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
  }`;
  return { text, pillClasses };
}

const getNotificationTargetView = (item) => (/debt|loan/.test(item?.type || '') || item?.actionPayload?.debtOrLoan) ? 'debts' : (/investment|cdt/.test(item?.type || '') || item?.actionPayload?.investment) ? 'investments' : (/card|credit/.test(item?.type || '') || item?.actionPayload?.account) ? 'accounts' : 'recurring';

export default function NotificationCenter({
  isOpen, onClose, activeNotifications = [], onDismiss, onMarkAllAsRead,
  onApproveRecurring = null, onSkipRecurring = null, onNavigate = null
}) {
  if (!isOpen) return null;
  const count = activeNotifications.length, hasItems = count > 0;

  const handleNavigate = (target = 'recurring') => {
    if (typeof onNavigate === 'function') onNavigate(target);
    else if (typeof window !== 'undefined' && window.__monetyNavigate) window.__monetyNavigate(target);
    else if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monety:navigate', { detail: target }));
    onClose?.();
  };

  const content = (
    <>
      <div className="flex items-center justify-between pb-3 border-b border-white/30 dark:border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 p-2 rounded-xl shrink-0 flex items-center justify-center shadow-xs">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">Notificaciones</h3>
            <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 tabular-nums shadow-xs">{count}</span>
          </div>
        </div>
        {hasItems && (
          <button type="button" onClick={onMarkAllAsRead} className="text-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer" title="Marcar todas como leídas">
            Marcar leídas
          </button>
        )}
      </div>

      <div className="py-2 overflow-y-auto flex-1 flex flex-col space-y-1">
        {!hasItems ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center mb-3 shadow-xs"><CheckCircle2 className="w-6 h-6" /></div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Sin notificaciones pendientes</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">Tus fechas de corte, pagos de tarjeta, suscripciones y deudas están al día.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activeNotifications.map((item) => {
              const isUrgent = item.urgency === 'urgent', isWarning = item.urgency === 'warning';
              const { text: badgeText, pillClasses } = formatBadgeInfo(item.badge, item.urgency);
              const amountAndMethod = formatNotificationAmountAndMethod(item);
              return (
                <div key={item.id} onClick={() => handleNavigate(getNotificationTargetView(item))} className="group p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isUrgent ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400' : isWarning ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  }`}>
                    {getNotificationIcon(item)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide truncate block">{formatCategory(item.category)}</span>
                    <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate leading-snug">{cleanNotificationTitle(item.title)}</h5>
                    {amountAndMethod && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">{amountAndMethod}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {badgeText && <span className={pillClasses}>{badgeText}</span>}
                    {item.type === 'recurring_pending' && item.recurringItem ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        {onSkipRecurring && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); onSkipRecurring(item.recurringItem); }} className="text-[10px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer" title="Omitir este ciclo">Omitir</button>
                        )}
                        <button type="button" onClick={(e) => { e.stopPropagation(); onApproveRecurring?.(item.recurringItem); }} className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer" title="Pagar / Registrar">Pagar</button>
                      </div>
                    ) : onDismiss && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); onDismiss(item.id); }} className="text-[11px] font-medium text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer" title="Marcar como revisada">Descartar</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none">
      {/* 1. Backdrop global sutil: desenfoque suave de 3px y velo liviano */}
      <div
        className="fixed inset-0 bg-slate-950/15 backdrop-blur-[3px] transition-all duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Modal centrado con acabados de cristal de alta gama */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-sm sm:max-w-md min-h-[380px] sm:min-h-[420px] max-h-[85vh] sm:max-h-[620px] rounded-3xl p-6 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 pointer-events-auto transition-all"
        style={{
          background: 'rgba(255, 255, 255, 0.50)',
          backdropFilter: 'blur(24px) saturate(190%)',
          WebkitBackdropFilter: 'blur(24px) saturate(190%)',
          border: '1px solid rgba(255, 255, 255, 0.90)',
          boxShadow: 'inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.95), inset 0 0 24px rgba(255, 255, 255, 0.25), 0 30px 60px -12px rgba(15, 23, 42, 0.25)'
        }}
      >
        {content}
      </div>
    </div>,
    document.body
  );
}
