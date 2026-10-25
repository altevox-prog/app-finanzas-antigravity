import React, { useState, useEffect } from 'react';
import { Bell, Search, SlidersHorizontal, Eye, EyeOff, Plus } from 'lucide-react';
import TopAppBar from './TopAppBar';
import AppLogo from '../ui/AppLogo';
import NotificationCenter from '../ui/NotificationCenter';
import useFinancialDueAlerts from '../../hooks/useFinancialDueAlerts';
import { usePrivacy } from '../../context/PrivacyContext';
import { advanceNextDate, getTodayLocalString, normalizeDateToYYYYMMDD } from '../../services/recurring/recurringAutoProcessor';
import { generateUUID } from '../../utils/recordMerger';

export default function AppHeader({
  desktopOnly = false, mobileOnly = false, activeTab = 'dashboard', currentView,
  onNavigate, onBack, onOpenAddInvestment, onOpenAddDebt, onOpenAddAccount, fromSettings = false,
  userProfile = { name: 'Usuario' }, trm = 4050, isForcedMobile = false, isForcedDesktop = false,
  mobileOnlyClass = '', desktopOnlyClass = '', monthlyStats = {}, theme = 'dark', onToggleTheme,
  onOpenProfile, onOpenSettings, onOpenAuth = () => {}, onLogout, syncUser = null,
  accounts = [], investments = [], subscriptions = [], recurringPayments = [], debtsAndLoans = [], savingsGoals = [],
  onAddTransaction = null, onUpdateRecurring = null
}) {
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  useEffect(() => {
    const onFilter = (e) => { if (e?.detail) { setHasActiveFilters(Boolean(e.detail.hasActiveFilters)); setActiveFilterCount(Number(e.detail.activeFilterCount || 0)); } };
    const onSearch = (e) => { if (e?.detail) setIsSearchActive(Boolean(e.detail.isSearchOpen || e.detail.hasSearchTerm)); };
    window.addEventListener('monety:filter-status-changed', onFilter);
    window.addEventListener('monety:search-status-changed', onSearch);
    return () => { window.removeEventListener('monety:filter-status-changed', onFilter); window.removeEventListener('monety:search-status-changed', onSearch); };
  }, []);

  const { alerts, activeAlerts, unreadCount, dismissAlert, markAllAsRead } = useFinancialDueAlerts({
    accounts, investments, debtsAndLoans, subscriptions, recurringPayments, savingsGoals
  });

  const updateRecurringItem = (item, nextDate) => ({
    ...item, nextDate, next_date: nextDate, nextPaymentDate: nextDate, lastProcessedDate: nextDate,
    updatedAt: new Date().toISOString(), updated_at: new Date().toISOString()
  });

  const handleApproveRecurring = async (item) => {
    if (!item) return;
    try {
      const nextDate = normalizeDateToYYYYMMDD(item.nextPaymentDate || item.nextDate || item.next_date) || getTodayLocalString();
      const desc = item.name || item.description || item.note || 'Movimiento recurrente';
      const amount = Number(item.amount) || 0;
      const newTx = {
        id: generateUUID(), description: desc, note: desc, amount,
        originalAmount: Number(item.originalAmount || item.amount) || amount,
        currency: item.currency || item.originalCurrency || 'COP', originalCurrency: item.originalCurrency || item.currency || 'COP',
        exchangeRate: Number(item.exchangeRate) || 1, type: item.type === 'income' ? 'income' : 'expense',
        category: item.categoryName || item.category || 'Recurrentes', categoryName: item.categoryName || item.category || 'Recurrentes',
        categoryId: item.categoryId || item.category_id || '', subcategoryId: item.subcategoryId || item.subcategory_id || null,
        subcategoryName: item.subcategoryName || null, accountId: item.accountId || item.account_id || '',
        accountName: item.accountName || 'Principal', date: nextDate, createdAt: new Date().toISOString(),
        isRecurring: true, recurringId: item.id
      };
      if (typeof onAddTransaction === 'function') await onAddTransaction(newTx);
      if (typeof onUpdateRecurring === 'function') await onUpdateRecurring(updateRecurringItem(item, advanceNextDate(nextDate, item.frequency, item.billingDay)));
    } catch (err) { console.error('[AppHeader] Error approve recurring:', err); }
  };

  const handleSkipRecurring = async (item) => {
    if (!item || typeof onUpdateRecurring !== 'function') return;
    try {
      const nextDate = normalizeDateToYYYYMMDD(item.nextPaymentDate || item.nextDate || item.next_date) || getTodayLocalString();
      await onUpdateRecurring(updateRecurringItem(item, advanceNextDate(nextDate, item.frequency, item.billingDay)));
    } catch (err) { console.error('[AppHeader] Error skip recurring:', err); }
  };

  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();

  const iconBtnClass = (active = false) => `w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm ${
    active ? 'bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-zinc-900 border border-zinc-800 text-slate-200 hover:text-white hover:border-zinc-700'
  }`;

  return (
    <>
      {!desktopOnly && (
        <div className={`${mobileOnlyClass} shrink-0 z-40 w-full`}>
          <div className={`${isForcedMobile ? 'flex' : isForcedDesktop ? 'hidden' : 'hidden sm:flex lg:hidden'} items-center justify-between px-7 pt-3 pb-1 text-xs font-semibold select-none shrink-0 bg-slate-50/90 dark:bg-[#09090b]/90 text-slate-900 dark:text-slate-100`} style={{ backgroundColor: 'var(--header-bg)', color: 'var(--text-main)' }}>
            <span className="text-[11px] font-bold">9:41</span>
            <div className="w-24 h-4.5 bg-black rounded-full shadow-inner flex items-center justify-end px-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /></div>
            <div className="flex items-center gap-1.5 text-[10px]"><span className="font-bold">5G</span><div className="w-4 h-2.5 border border-current rounded-xs p-0.5 flex items-center"><div className="w-full h-full bg-current rounded-2xs" /></div></div>
          </div>
          <TopAppBar 
            currentView={currentView || activeTab} activeTab={activeTab} onNavigate={onNavigate} onBack={onBack}
            onOpenAddInvestment={onOpenAddInvestment} onOpenAddDebt={onOpenAddDebt} onOpenAddAccount={onOpenAddAccount}
            fromSettings={fromSettings} monthlyStats={monthlyStats} userProfile={userProfile} syncUser={syncUser}
            theme={theme} onToggleTheme={onToggleTheme} onOpenProfile={onOpenProfile} onOpenSettings={onOpenSettings || onOpenProfile}
            onOpenAuth={onOpenAuth} onLogout={onLogout} accounts={accounts} investments={investments} subscriptions={subscriptions}
            recurringPayments={recurringPayments} debtsAndLoans={debtsAndLoans} savingsGoals={savingsGoals}
            onApproveRecurring={handleApproveRecurring} onSkipRecurring={handleSkipRecurring}
          />
        </div>
      )}

      {!mobileOnly && (
        <header className={`${desktopOnlyClass} sticky top-0 z-40 w-full h-16 shrink-0 select-none relative bg-[#090A0F]/95 backdrop-blur-md border-b border-emerald-500/10 shadow-2xl flex items-center overflow-visible`}>
          <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-transparent pointer-events-none z-0" />
          <div className="absolute top-0 left-1/4 right-1/4 h-8 bg-emerald-500/20 blur-2xl pointer-events-none z-0" />
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/35 to-transparent pointer-events-none z-0" />

          <div className="w-full px-6 flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2.5 select-none shrink-0">
              <AppLogo size="sm" showText={false} iconClassName="w-8 h-8 sm:w-9 sm:h-9 rounded-full [&_img]:rounded-full shadow-sm ring-1 ring-white/10" />
              <div className="flex flex-col min-w-0">
                <span className="text-base sm:text-lg font-black tracking-tight text-white leading-none">Monety</span>
                <span className="text-[9px] font-bold tracking-wider text-emerald-400 uppercase leading-none mt-0.5">Finanzas Personales</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {(activeTab === 'transactions' || activeTab === 'movements' || activeTab === 'movimientos') && (
                <div className="flex items-center gap-1.5 mr-1">
                  <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('monety:toggle-search'))} className={iconBtnClass(isSearchActive)} title="Buscar movimientos" aria-label="Buscar movimientos"><Search className="w-4 h-4" /></button>
                  <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('monety:open-filter-modal'))} className={iconBtnClass(hasActiveFilters)} title="Filtros avanzados" aria-label="Filtros avanzados">
                    <SlidersHorizontal className="w-4 h-4" />
                    {hasActiveFilters && <span className="min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-mono font-bold flex items-center justify-center absolute -top-1 -right-1 shadow-sm">{activeFilterCount}</span>}
                  </button>
                </div>
              )}

              {activeTab === 'accounts' && fromSettings && (
                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('monety:open-add-account'))} className="w-9 h-9 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm mr-1" title="Añadir nueva cuenta" aria-label="Agregar cuenta"><Plus className="w-5 h-5 stroke-[2.5]" /></button>
              )}

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-slate-200 font-medium select-none shadow-sm" title="Tasa Representativa del Mercado (TRM) oficial sincronizada automáticamente con datos abiertos">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span>TRM Oficial: ${Number(trm).toLocaleString('es-CO')} COP</span>
              </div>

              <button type="button" onClick={togglePrivacyMode} className={iconBtnClass(isPrivacyMode)} title={isPrivacyMode ? "Mostrar cifras" : "Ocultar cifras (modo discreto)"} aria-label="Modo discreto">
                {isPrivacyMode ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}
              </button>

              <div className="relative z-[60]">
                <button type="button" onClick={() => setIsNotificationCenterOpen((p) => !p)} className="w-9 h-9 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-800 text-slate-200 hover:text-white hover:border-zinc-700 relative transition-colors cursor-pointer shadow-sm active:scale-95" title={unreadCount > 0 ? `${unreadCount} alerta(s) pendientes` : "Sin notificaciones"} aria-label="Centro de notificaciones">
                  <Bell className="w-4.5 h-4.5" />
                  {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500/90 text-white text-[10px] font-mono font-bold flex items-center justify-center leading-none shadow-sm ring-2 ring-[#0D0F17]">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>
                <NotificationCenter isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} notifications={alerts} activeNotifications={activeAlerts} onDismiss={dismissAlert} onMarkAllAsRead={markAllAsRead} onApproveRecurring={handleApproveRecurring} onSkipRecurring={handleSkipRecurring} onNavigate={onNavigate} />
              </div>
            </div>
          </div>
        </header>
      )}
    </>
  );
}
