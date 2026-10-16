import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, Bell, Search, SlidersHorizontal, Eye, EyeOff } from 'lucide-react';
import Header from './Header';
import TopAppBar from './TopAppBar';
import AppLogo from '../ui/AppLogo';
import Avatar from '../ui/Avatar';
import SyncStatusBadge from '../ui/SyncStatusBadge';
import NotificationCenter from '../ui/NotificationCenter';
import useFinancialDueAlerts from '../../hooks/useFinancialDueAlerts';
import { usePrivacy } from '../../context/PrivacyContext';
import { 
  advanceNextDate, 
  getTodayLocalString, 
  normalizeDateToYYYYMMDD 
} from '../../services/recurring/recurringAutoProcessor';
import { generateUUID } from '../../utils/recordMerger';

const TAB_TITLES = {
  dashboard: 'Panel financiero',
  transactions: 'Historial de movimientos',
  accounts: 'Cuentas y métodos de pago',
  recurring: 'Pagos recurrentes y suscripciones',
  tax: 'Impuestos y declaración de renta',
  taxes: 'Impuestos y declaración de renta',
  impuestos: 'Impuestos y declaración de renta',
  debts: 'Préstamos y deudas',
  loans: 'Préstamos y deudas',
  investments: 'Portafolio de inversiones',
  net_worth: 'Patrimonio neto y balance',
  networth: 'Patrimonio neto y balance',
  patrimonio: 'Patrimonio neto y balance'
};

/**
 * AppHeader
 * Cabecera unificada de la aplicación:
 * - Barra de estado iOS simulada (en móvil emulado / tablet)
 * - Cabecera móvil con notificaciones, perfil y estadísticas rápidas (< lg)
 * - Cabecera panorámica de escritorio con título dinámico de sección, selector de fecha, campana de notificaciones y TRM (>= lg)
 */
export default function AppHeader({
  desktopOnly = false,
  mobileOnly = false,
  activeTab = 'dashboard',
  currentView,
  onNavigate,
  onBack,
  onOpenAddInvestment,
  onOpenAddDebt,
  onOpenAddAccount,
  userProfile = { name: 'Usuario' },
  currentMonthLabel = '',
  selectedDay = null,
  onOpenMonthPicker,
  setShowMonthPicker,
  trm = 4050,
  isForcedMobile = false,
  isForcedDesktop = false,
  mobileOnlyClass = '',
  desktopOnlyClass = '',
  // Props para Header móvil:
  monthlyStats = {},
  theme = 'dark',
  onToggleTheme,
  onOpenProfile,
  onOpenSettings,
  onOpenAuth = () => {},
  onLogout,
  syncStatus = 'idle',
  isCloudEnabled = false,
  syncUser = null,
  accounts = [],
  investments = [],
  subscriptions = [],
  recurringPayments = [],
  debtsAndLoans = [],
  savingsGoals = [],
  onAddTransaction = null,
  onUpdateRecurring = null
}) {
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // Estados interactivos sincronizados para escritorio (Lupa y Filtros)
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  useEffect(() => {
    const handleFilterStatus = (e) => {
      if (e?.detail) {
        setHasActiveFilters(Boolean(e.detail.hasActiveFilters));
        setActiveFilterCount(Number(e.detail.activeFilterCount || 0));
      }
    };
    const handleSearchStatus = (e) => {
      if (e?.detail) {
        setIsSearchActive(Boolean(e.detail.isSearchOpen || e.detail.hasSearchTerm));
      }
    };

    window.addEventListener('monety:filter-status-changed', handleFilterStatus);
    window.addEventListener('monety:search-status-changed', handleSearchStatus);

    return () => {
      window.removeEventListener('monety:filter-status-changed', handleFilterStatus);
      window.removeEventListener('monety:search-status-changed', handleSearchStatus);
    };
  }, []);

  // Hook unificado para evaluación de vencimientos y alertas financieras
  const {
    alerts,
    activeAlerts,
    unreadCount,
    dismissAlert,
    markAllAsRead
  } = useFinancialDueAlerts({
    accounts,
    investments,
    debtsAndLoans,
    subscriptions,
    recurringPayments,
    savingsGoals
  });

  // Manejador para aprobar recurrente manual desde el centro de notificaciones
  const handleApproveRecurring = async (item) => {
    if (!item) return;
    try {
      const nextDate = normalizeDateToYYYYMMDD(item.nextPaymentDate || item.nextDate || item.next_date) || getTodayLocalString();
      const type = item.type === 'income' ? 'income' : 'expense';
      const description = item.name || item.description || item.note || 'Movimiento recurrente';
      const amount = Number(item.amount) || 0;

      const newTx = {
        id: generateUUID(),
        description,
        note: description,
        amount,
        originalAmount: Number(item.originalAmount || item.amount) || amount,
        currency: item.currency || item.originalCurrency || 'COP',
        originalCurrency: item.originalCurrency || item.currency || 'COP',
        exchangeRate: Number(item.exchangeRate) || 1,
        type,
        category: item.categoryName || item.category || 'Recurrentes',
        categoryName: item.categoryName || item.category || 'Recurrentes',
        categoryId: item.categoryId || item.category_id || '',
        subcategoryId: item.subcategoryId || item.subcategory_id || null,
        subcategoryName: item.subcategoryName || null,
        accountId: item.accountId || item.account_id || '',
        accountName: item.accountName || 'Principal',
        date: nextDate,
        createdAt: new Date().toISOString(),
        isRecurring: true,
        recurringId: item.id
      };

      const newNextDate = advanceNextDate(nextDate, item.frequency, item.billingDay);
      const updatedItem = {
        ...item,
        nextDate: newNextDate,
        next_date: newNextDate,
        nextPaymentDate: newNextDate,
        lastProcessedDate: nextDate,
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (typeof onAddTransaction === 'function') {
        await onAddTransaction(newTx);
      }
      if (typeof onUpdateRecurring === 'function') {
        await onUpdateRecurring(updatedItem);
      }
    } catch (err) {
      console.error('[AppHeader] Error al aprobar movimiento recurrente:', err);
    }
  };

  // Manejador para omitir recurrente manual desde el centro de notificaciones
  const handleSkipRecurring = async (item) => {
    if (!item) return;
    try {
      const nextDate = normalizeDateToYYYYMMDD(item.nextPaymentDate || item.nextDate || item.next_date) || getTodayLocalString();
      const newNextDate = advanceNextDate(nextDate, item.frequency, item.billingDay);
      const updatedItem = {
        ...item,
        nextDate: newNextDate,
        next_date: newNextDate,
        nextPaymentDate: newNextDate,
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (typeof onUpdateRecurring === 'function') {
        await onUpdateRecurring(updatedItem);
      }
    } catch (err) {
      console.error('[AppHeader] Error al omitir movimiento recurrente:', err);
    }
  };

  const handleOpenPicker = () => {
    if (onOpenMonthPicker) onOpenMonthPicker();
    else if (setShowMonthPicker) setShowMonthPicker(true);
  };

  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();

  const userName = userProfile?.name?.split(' ')[0] || 'Alex';
  const headerTitle = activeTab === 'dashboard' 
    ? (userProfile?.name ? `Hola, ${userProfile.name.split(' ')[0]}` : 'Hola, Alex') 
    : (TAB_TITLES[activeTab] || 'Panel financiero');

  return (
    <>
      {/* Top Header Móvil (< lg) anclado fijamente */}
      {!desktopOnly && (
        <div className={`${mobileOnlyClass} shrink-0 z-40 w-full`}>
          {/* Barra de Estado iOS simulada para móviles en tablet reducida (< lg) */}
          <div 
            className={`${isForcedMobile ? 'flex' : isForcedDesktop ? 'hidden' : 'hidden sm:flex lg:hidden'} items-center justify-between px-7 pt-3 pb-1 text-xs font-semibold select-none shrink-0 bg-slate-50/90 dark:bg-[#09090b]/90 text-slate-900 dark:text-slate-100`} 
            style={{ backgroundColor: 'var(--header-bg)', color: 'var(--text-main)' }}
          >
            <span className="text-[11px] font-bold">9:41</span>
            <div className="w-24 h-4.5 bg-black rounded-full shadow-inner flex items-center justify-end px-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="font-bold">5G</span>
              <div className="w-4 h-2.5 border border-current rounded-xs p-0.5 flex items-center">
                <div className="w-full h-full bg-current rounded-2xs"></div>
              </div>
            </div>
          </div>

          <TopAppBar 
            currentView={currentView || activeTab}
            activeTab={activeTab}
            onNavigate={onNavigate}
            onBack={onBack}
            onOpenAddInvestment={onOpenAddInvestment}
            onOpenAddDebt={onOpenAddDebt}
            onOpenAddAccount={onOpenAddAccount}
            monthlyStats={monthlyStats} 
            userProfile={userProfile}
            syncUser={syncUser}
            theme={theme}
            onToggleTheme={onToggleTheme}
            onOpenProfile={onOpenProfile}
            onOpenSettings={onOpenSettings || onOpenProfile}
            onOpenAuth={onOpenAuth}
            onLogout={onLogout}
            accounts={accounts}
            investments={investments}
            subscriptions={subscriptions}
            recurringPayments={recurringPayments}
            debtsAndLoans={debtsAndLoans}
            savingsGoals={savingsGoals}
            onApproveRecurring={handleApproveRecurring}
            onSkipRecurring={handleSkipRecurring}
          />
        </div>
      )}

      {/* Top Header Panorámico de Escritorio (visible en lg:) continuo full-width con acabado Dark Glass Neón */}
      {!mobileOnly && (
        <header className={`${desktopOnlyClass} sticky top-0 z-40 w-full h-16 shrink-0 select-none relative overflow-hidden bg-slate-950/90 dark:bg-black/95 backdrop-blur-md border-b border-emerald-500/35 shadow-lg shadow-black/20 flex items-center`}>
          {/* Línea base sutil con difuminado lateral */}
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent pointer-events-none z-0" />
         
          {/* Haz de resplandor neón ascendente */}
          <div 
            className="absolute inset-x-0 bottom-0 h-6 pointer-events-none z-0"
            style={{
              background: 'radial-gradient(ellipse 60% 100% at 50% 100%, rgba(16, 185, 129, 0.28) 0%, rgba(16, 185, 129, 0.08) 50%, transparent 100%)'
            }}
          />

          <div className="w-full px-6 flex items-center justify-between gap-3 relative z-10">
            {/* Extremo Izquierdo: Logotipo e isotipo 'Finanzas al día' con texto blanco */}
            <div className="flex items-center gap-3 shrink-0">
              <AppLogo size="sm" showText={false} />
              <span className="text-base sm:text-lg font-bold text-white tracking-tight select-none">
                Finanzas al día
              </span>
            </div>

            {/* Extremo Derecho: TRM, Ojo, Notificaciones, Avatar de usuario */}
            <div className="flex items-center gap-2.5">
              {/* Acciones contextuales para Transacciones en Escritorio */}
              {(activeTab === 'transactions' || activeTab === 'movements' || activeTab === 'movimientos') && (
                <div className="flex items-center gap-1.5 mr-1">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('monety:toggle-search'))}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm ${
                      isSearchActive
                        ? 'bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 ring-1 ring-emerald-500/30'
                        : 'bg-slate-900/80 border border-slate-800 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/40'
                    }`}
                    title="Buscar movimientos"
                    aria-label="Buscar movimientos"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('monety:open-filter-modal'))}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative active:scale-95 shadow-sm ${
                      hasActiveFilters
                        ? 'bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 ring-1 ring-emerald-500/30'
                        : 'bg-slate-900/80 border border-slate-800 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/40'
                    }`}
                    title="Filtros avanzados"
                    aria-label="Filtros avanzados"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    {hasActiveFilters && (
                      <span className="min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-mono font-bold flex items-center justify-center absolute -top-1 -right-1 shadow-sm">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* TRM Oficial Automatizado (No editable) */}
              <div 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-200 select-none shadow-sm"
                title="Tasa Representativa del Mercado (TRM) oficial sincronizada automáticamente con datos abiertos"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>TRM Oficial: ${Number(trm).toLocaleString('es-CO')} COP</span>
              </div>

              {/* Botón Toggle de Visibilidad / Modo Discreto */}
              <button
                type="button"
                onClick={togglePrivacyMode}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm ${
                  isPrivacyMode
                    ? 'bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/40'
                }`}
                title={isPrivacyMode ? "Mostrar cifras" : "Ocultar cifras (modo discreto)"}
                aria-label="Modo discreto"
              >
                {isPrivacyMode ? (
                  <EyeOff className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>

              {/* Botón de Campana de Notificaciones en Escritorio */}
              <button
                type="button"
                onClick={() => setIsNotificationCenterOpen(true)}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-900/80 border border-slate-800 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/40 relative transition-colors cursor-pointer shadow-sm active:scale-95"
                title={unreadCount > 0 ? `${unreadCount} alerta(s) pendientes` : "Sin notificaciones"}
                aria-label="Centro de notificaciones"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold flex items-center justify-center leading-none shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Avatar de Usuario con anillo verde esmeralda */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenProfile) onOpenProfile();
                  else if (onOpenSettings) onOpenSettings();
                }}
                className="flex items-center justify-center select-none cursor-pointer active:scale-95 transition-transform focus:outline-none ml-1"
                title={`Perfil - ${userProfile?.name || 'Usuario'}`}
                aria-label={`Perfil - ${userProfile?.name || 'Usuario'}`}
              >
                <div className="relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10">
                  {/* Anillo de pulso neón adherido al perímetro exacto */}
                  <span className="absolute inset-0 rounded-full border-2 border-emerald-400 dark:border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.85)] animate-pulse pointer-events-none z-0" />
                  
                  {/* Círculo interior del avatar/iniciales encajado al 100% */}
                  <div className="relative z-10 w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                    <Avatar 
                      src={syncUser?.user_metadata?.avatar_url || userProfile?.avatar_url || userProfile?.photo} 
                      name={syncUser?.user_metadata?.full_name || userProfile?.name} 
                      email={syncUser?.email || userProfile?.email}
                      size="sm" 
                      className="!w-full !h-full"
                      showStatus={false} 
                    />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Modal / Drawer Centro de Notificaciones (Escritorio) */}
      {!mobileOnly && (
        <NotificationCenter
          isOpen={isNotificationCenterOpen}
          onClose={() => setIsNotificationCenterOpen(false)}
          notifications={alerts}
          activeNotifications={activeAlerts}
          onDismiss={dismissAlert}
          onMarkAllAsRead={markAllAsRead}
          onApproveRecurring={handleApproveRecurring}
          onSkipRecurring={handleSkipRecurring}
        />
      )}
    </>
  );
}
