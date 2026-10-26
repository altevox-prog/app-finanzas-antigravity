import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Bell, Search, SlidersHorizontal, Eye, EyeOff, Plus, Check, 
  CheckCircle2, CreditCard, Receipt, Target, AlertTriangle, RotateCw 
} from 'lucide-react';
import AppLogo from '../ui/AppLogo';
import Avatar from '../ui/Avatar';
import { usePrivacy } from '../../context/PrivacyContext';
import useFinancialDueAlerts from '../../hooks/useFinancialDueAlerts';

const VIEW_TITLES = { transactions: 'Transacciones', movements: 'Transacciones', movimientos: 'Transacciones', investments: 'Portafolio de Inversiones', debts: 'Préstamos y Deudas', loans: 'Préstamos y Deudas', accounts: 'Cuentas y Métodos', recurring: 'Pagos Recurrentes', tax: 'Impuestos', taxes: 'Impuestos', net_worth: 'Patrimonio Neto', networth: 'Patrimonio Neto', categories: 'Categorías', settings: 'Ajustes', profile: 'Perfil' };
const ROOT_TABS = new Set(['dashboard', 'inicio', 'transactions', 'movements', 'movimientos', 'investments', 'debts', 'loans', 'prestamos']);
const BTN_BASE = "rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs backdrop-blur-md";
const BTN_INACTIVE = "bg-white/50 dark:bg-zinc-900/50 border border-white/70 dark:border-white/[0.08] text-slate-700 dark:text-zinc-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/70 dark:hover:bg-zinc-800/60";
const BTN_ACTIVE = "bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30 font-bold";
const URGENCY = {
  urgent: { icon: 'bg-rose-500/15 text-rose-500', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  warning: { icon: 'bg-amber-500/15 text-amber-500', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  default: { icon: 'bg-purple-500/15 text-purple-400', badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' }
};
const ALERT_ICONS = { CreditCard, Receipt, Target };

export default function TopAppBar({
  currentView = 'dashboard', activeTab = 'dashboard', userProfile = { name: 'Usuario', photo: null, initials: 'US' },
  syncUser = null, onNavigate, onBack, onOpenProfile, onOpenSettings, onOpenAddAccount, fromSettings = false,
  accounts = [], investments = [], subscriptions = [], recurringPayments = [], debtsAndLoans = [], savingsGoals = [],
  onApproveRecurring = null, onSkipRecurring = null
}) {
  const current = (currentView || activeTab || 'dashboard').toLowerCase();
  const showBackButton = !ROOT_TABS.has(current) || Boolean(fromSettings);
  const isDashboard = ['dashboard', 'inicio'].includes(current), isTransactions = ['transactions', 'movements', 'movimientos'].includes(current);
  const isInvestments = current === 'investments', isAccounts = current === 'accounts', title = VIEW_TITLES[current] || 'Monety';
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false), [activeFilterCount, setActiveFilterCount] = useState(0);
  const [isRefreshingQuotes, setIsRefreshingQuotes] = useState(false), [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const { activeAlerts, dismissAlert, markAllAsRead, hasNotifications } = useFinancialDueAlerts({
    accounts, investments, debtsAndLoans, subscriptions, recurringPayments, savingsGoals
  });

  useEffect(() => {
    const handlers = [
      ['monety:filter-status-changed', (e) => { if (e?.detail) { setHasActiveFilters(Boolean(e.detail.hasActiveFilters)); setActiveFilterCount(Number(e.detail.activeFilterCount || 0)); } }, window],
      ['monety:search-status-changed', (e) => e?.detail && setIsSearchActive(Boolean(e.detail.isSearchOpen || e.detail.hasSearchTerm)), window],
      ['monety:investment-quotes-status', (e) => e?.detail && setIsRefreshingQuotes(Boolean(e.detail.isRefreshing)), window],
      ['keydown', (e) => e.key === 'Escape' && setIsNotificationsOpen(false), document]
    ];
    handlers.forEach(([ev, fn, target]) => target.addEventListener(ev, fn));
    return () => handlers.forEach(([ev, fn, target]) => target.removeEventListener(ev, fn));
  }, []);

  const handleBack = () => (typeof onBack === 'function' ? onBack() : typeof onNavigate === 'function' ? onNavigate('dashboard') : typeof window !== 'undefined' && window.history.length > 2 && window.history.back());

  const renderNotifBtn = (size = "w-9 h-9 sm:w-10 sm:h-10") => (
    <button type="button" onClick={() => setIsNotificationsOpen(true)} className={`${size} ${BTN_BASE} ${BTN_INACTIVE} relative`} title={hasNotifications ? `${activeAlerts.length} alertas pendientes` : "Sin notificaciones"} aria-label="Notificaciones">
      <Bell className="w-4.5 h-4.5" />
      {hasNotifications && <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 rounded-full bg-rose-500/90 text-white text-[9px] font-mono font-bold flex items-center justify-center leading-none ring-2 ring-[#0D0F17]">{activeAlerts.length > 9 ? '9+' : activeAlerts.length}</span>}
    </button>
  );

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between transition-all select-none shrink-0 relative overflow-hidden bg-[#090A0F]/95 backdrop-blur-md border-b border-emerald-500/10 shadow-2xl text-slate-100" style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}>
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-transparent pointer-events-none z-0" />
        <div className="absolute top-0 left-1/4 right-1/4 h-6 bg-emerald-500/20 blur-xl pointer-events-none z-0" />
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent pointer-events-none z-0" />
        <div className="flex items-center shrink-0 relative z-10">
          {!showBackButton ? (
            <div className="flex items-center gap-2.5"><AppLogo size="md" showText={false} /><span className="text-base sm:text-lg font-bold text-slate-100 tracking-tight select-none">Finanzas al día</span></div>
          ) : (
            <button type="button" onClick={handleBack} className={`w-9 h-9 ${BTN_BASE} ${BTN_INACTIVE} shrink-0`} aria-label="Volver" title="Volver"><ArrowLeft className="w-4.5 h-4.5" /></button>
          )}
        </div>
        {showBackButton && <div className="absolute left-1/2 -translate-x-1/2 max-w-[55%] sm:max-w-[65%] text-center pointer-events-none px-2 z-10"><h1 className="text-base sm:text-lg font-bold text-slate-100 truncate tracking-tight">{title}</h1></div>}

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto relative z-10">
          {isDashboard && (
            <>
              <button type="button" onClick={togglePrivacyMode} className={`w-9 h-9 sm:w-10 sm:h-10 border ${BTN_BASE} ${isPrivacyMode ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 ring-1 ring-emerald-500/30' : BTN_INACTIVE}`} title={isPrivacyMode ? "Mostrar cifras" : "Modo discreto"} aria-label="Modo discreto">{isPrivacyMode ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}</button>
              {renderNotifBtn()}
              <button type="button" onClick={() => (onOpenProfile?.() ?? onOpenSettings?.())} className="relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 select-none cursor-pointer active:scale-95 transition-transform" title={`Perfil - ${userProfile?.name || 'Usuario'}`}>
                <span className="absolute inset-0 rounded-full border-2 border-emerald-400 dark:border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.85)] animate-pulse pointer-events-none" />
                <Avatar src={syncUser?.user_metadata?.avatar_url || userProfile?.avatar_url || userProfile?.photo} name={syncUser?.user_metadata?.full_name || userProfile?.name} email={syncUser?.email || userProfile?.email} size="sm" className="!w-full !h-full relative z-10" showStatus={false} />
              </button>
            </>
          )}
          {isTransactions && (
            <>
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('monety:toggle-search'))} className={`w-9 h-9 ${BTN_BASE} ${isSearchActive ? BTN_ACTIVE : BTN_INACTIVE}`} title="Buscar movimientos"><Search className="w-4 h-4" /></button>
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('monety:open-filter-modal'))} className={`w-9 h-9 ${BTN_BASE} relative ${hasActiveFilters ? BTN_ACTIVE : BTN_INACTIVE}`} title="Filtros avanzados">
                <SlidersHorizontal className="w-4 h-4" />{hasActiveFilters && <span className="min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center justify-center absolute -top-1 -right-1 shadow-sm">{activeFilterCount}</span>}
              </button>
            </>
          )}
          {isInvestments && (
            <button type="button" onClick={() => { setIsRefreshingQuotes(true); window.dispatchEvent(new CustomEvent('monety:refresh-investment-quotes')); setTimeout(() => setIsRefreshingQuotes(false), 1500); }} className={`w-9 h-9 ${BTN_BASE} ${BTN_INACTIVE}`} title="Actualizar cotizaciones">
              <RotateCw className={`w-4 h-4 ${isRefreshingQuotes ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          )}
          {isAccounts && fromSettings && (
            <button type="button" onClick={() => (onOpenAddAccount?.() ?? window.dispatchEvent(new CustomEvent('monety:open-add-account')))} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm" title="Añadir nueva cuenta"><Plus className="w-5 h-5 stroke-[2.5]" /></button>
          )}
          {!isDashboard && !isTransactions && !isInvestments && !['debts', 'loans'].includes(current) && (!isAccounts || !fromSettings) && renderNotifBtn("w-9 h-9")}
        </div>
      </header>

      {isNotificationsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50 animate-fadeIn" onClick={() => setIsNotificationsOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm sm:max-w-[420px] rounded-3xl shadow-2xl border flex flex-col max-h-[85vh] overflow-hidden animate-slide-up bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
            <div className="p-4 sm:p-5 border-b border-slate-200/60 dark:border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Bell className="w-4 h-4" /></div>
                <div><h3 className="text-sm sm:text-base font-bold leading-tight">Notificaciones y Alertas</h3><p className="text-[11px] text-slate-500">{hasNotifications ? `${activeAlerts.length} alerta(s) pendientes` : 'Todo al día'}</p></div>
              </div>
              {hasNotifications && <button type="button" onClick={markAllAsRead} className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1 rounded-lg cursor-pointer">Marcar todas</button>}
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
              {!hasNotifications ? (
                <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3"><CheckCircle2 className="w-7 h-7" /></div>
                  <h4 className="text-sm font-bold mb-1">No tienes notificaciones pendientes</h4>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">Tus compromisos fijos, cortes de tarjeta y deudas están al día.</p>
                </div>
              ) : activeAlerts.map((item) => {
                const urg = URGENCY[item.urgency] || URGENCY.default, AlertIcon = ALERT_ICONS[item.icon] || AlertTriangle;
                return (
                  <div key={item.id} className="p-3.5 rounded-2xl border flex items-start gap-3 bg-slate-50/70 dark:bg-white/[0.03] border-slate-200/60 dark:border-white/5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${urg.icon}`}><AlertIcon className="w-4.5 h-4.5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 truncate">{item.category}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${urg.badge}`}>{item.badge}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); dismissAlert(item.id); }} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-500 cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <h5 className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug mb-1">{item.title}</h5>
                      <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{item.message}</p>
                      {item.type === 'recurring_pending' && item.recurringItem && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2">
                          <span className={`text-xs font-mono font-bold tabular-nums ${item.isExpense ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{item.isExpense ? '-' : '+'}${Number(item.amount || 0).toLocaleString('es-CO')}</span>
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button type="button" onClick={(e) => { e.stopPropagation(); onSkipRecurring?.(item.recurringItem); }} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 cursor-pointer">Omitir</button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); onApproveRecurring?.(item.recurringItem); }} className="px-3 py-1 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs flex items-center gap-1 cursor-pointer"><Check className="w-3 h-3" /><span>Aprobar</span></button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t border-slate-200/60 dark:border-white/10 shrink-0 text-center">
              <button type="button" onClick={() => setIsNotificationsOpen(false)} className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 cursor-pointer text-slate-700 dark:text-slate-200">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
