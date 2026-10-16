import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Bell, 
  Search, 
  SlidersHorizontal, 
  Eye, 
  EyeOff, 
  Plus, 
  Check, 
  CheckCircle2, 
  X, 
  CreditCard, 
  Receipt, 
  Target, 
  AlertTriangle,
  RotateCw 
} from 'lucide-react';
import AppLogo from '../ui/AppLogo';
import Avatar from '../ui/Avatar';
import { usePrivacy } from '../../context/PrivacyContext';
import useFinancialDueAlerts from '../../hooks/useFinancialDueAlerts';

const VIEW_TITLES = {
  transactions: 'Transacciones',
  movements: 'Transacciones',
  movimientos: 'Transacciones',
  investments: 'Portafolio de Inversiones',
  debts: 'Préstamos y Deudas',
  loans: 'Préstamos y Deudas',
  accounts: 'Cuentas y Métodos',
  recurring: 'Pagos Recurrentes',
  tax: 'Impuestos',
  taxes: 'Impuestos',
  impuestos: 'Impuestos',
  net_worth: 'Patrimonio Neto',
  networth: 'Patrimonio Neto',
  patrimonio: 'Patrimonio Neto',
  categories: 'Categorías',
  settings: 'Ajustes',
  profile: 'Perfil'
};

/**
 * TopAppBar
 * Barra superior dinámica y contextual por vista con acabado translúcido glass.
 * - Dashboard: Logo oficial Monety + Campana de notificaciones + Avatar de perfil
 * - Transacciones: Botón retorno + Título "Transacciones" + Lupa (toggle búsqueda) + Filtros avanzados
 * - Inversiones: Botón retorno + Título "Portafolio de Inversiones" + Modo discreto + Botón "+ Inversión"
 * - Préstamos y Deudas: Botón retorno + Título "Préstamos y Deudas" + Botón "+ Nuevo"
 * - Cuentas y Métodos: Botón retorno + Título "Cuentas y Métodos" + Botón "+ Cuenta"
 * - Otras vistas: Botón retorno + Título correspondiente
 */
export default function TopAppBar({
  currentView = 'dashboard',
  activeTab = 'dashboard',
  userProfile = { name: 'Usuario', photo: null, initials: 'US' },
  syncUser = null,
  onNavigate,
  onBack,
  onOpenProfile,
  onOpenSettings,
  onOpenAddInvestment,
  onOpenAddDebt,
  onOpenAddAccount,
  accounts = [],
  investments = [],
  subscriptions = [],
  recurringPayments = [],
  debtsAndLoans = [],
  savingsGoals = [],
  onApproveRecurring = null,
  onSkipRecurring = null
}) {
  const current = (currentView || activeTab || 'dashboard').toLowerCase();
  const isDashboard = current === 'dashboard' || current === 'inicio';
  const isTransactions = current === 'transactions' || current === 'movements' || current === 'movimientos';
  const isInvestments = current === 'investments';
  const isDebts = current === 'debts' || current === 'loans';
  const isAccounts = current === 'accounts';

  const title = VIEW_TITLES[current] || 'Monety';

  // Privacidad de saldos
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();

  // Estados interactivos para transacciones
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Estado para refresco de cotizaciones en tiempo real
  const [isRefreshingQuotes, setIsRefreshingQuotes] = useState(false);

  // Estado del modal de notificaciones
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Hook unificado de alertas financieras
  const {
    activeAlerts,
    unreadCount,
    dismissAlert,
    markAllAsRead,
    hasNotifications
  } = useFinancialDueAlerts({
    accounts,
    investments,
    debtsAndLoans,
    subscriptions,
    recurringPayments,
    savingsGoals
  });

  // Suscripción a eventos de filtros y búsqueda desde TransactionList e Inversiones
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
    const handleQuotesStatus = (e) => {
      if (e?.detail) {
        setIsRefreshingQuotes(Boolean(e.detail.isRefreshing));
      }
    };

    window.addEventListener('monety:filter-status-changed', handleFilterStatus);
    window.addEventListener('monety:search-status-changed', handleSearchStatus);
    window.addEventListener('monety:investment-quotes-status', handleQuotesStatus);

    return () => {
      window.removeEventListener('monety:filter-status-changed', handleFilterStatus);
      window.removeEventListener('monety:search-status-changed', handleSearchStatus);
      window.removeEventListener('monety:investment-quotes-status', handleQuotesStatus);
    };
  }, []);

  // Cerrar notificaciones con tecla Escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
    } else if (typeof onNavigate === 'function') {
      onNavigate('dashboard');
    } else if (typeof window !== 'undefined' && window.history.length > 2) {
      window.history.back();
    }
  };

  const handleToggleSearch = () => {
    window.dispatchEvent(new CustomEvent('monety:toggle-search'));
  };

  const handleOpenFilterModal = () => {
    window.dispatchEvent(new CustomEvent('monety:open-filter-modal'));
  };

  const handleAddInvestmentClick = () => {
    if (typeof onOpenAddInvestment === 'function') {
      onOpenAddInvestment();
    } else {
      window.dispatchEvent(new CustomEvent('monety:open-add-investment'));
    }
  };

  const handleRefreshQuotesClick = () => {
    setIsRefreshingQuotes(true);
    window.dispatchEvent(new CustomEvent('monety:refresh-investment-quotes'));
    setTimeout(() => {
      setIsRefreshingQuotes(false);
    }, 1500);
  };

  const handleAddDebtClick = () => {
    if (typeof onOpenAddDebt === 'function') {
      onOpenAddDebt();
    } else {
      window.dispatchEvent(new CustomEvent('monety:open-add-debt'));
    }
  };

  const handleAddAccountClick = () => {
    if (typeof onOpenAddAccount === 'function') {
      onOpenAddAccount();
    } else {
      window.dispatchEvent(new CustomEvent('monety:open-add-account'));
    }
  };

  return (
    <>
      <header 
        className="sticky top-0 z-40 w-full h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between transition-all select-none shrink-0 relative overflow-hidden bg-slate-950/90 dark:bg-black/95 backdrop-blur-md border-b border-emerald-500/35 shadow-lg shadow-black/20"
        style={{ 
          paddingTop: 'max(env(safe-area-inset-top), 0px)'
        }}
      >
        {/* Línea base sutil con difuminado lateral */}
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent pointer-events-none z-0" />
       
        {/* Haz de resplandor neón ascendente concentrado en el centro */}
        <div 
          className="absolute inset-x-0 bottom-0 h-6 pointer-events-none z-0"
          style={{
            background: 'radial-gradient(ellipse 60% 100% at 50% 100%, rgba(16, 185, 129, 0.28) 0%, rgba(16, 185, 129, 0.08) 50%, transparent 100%)'
          }}
        />

        {/* ============================================================== */}
        {/* SECCIÓN IZQUIERDA: Logo (Dashboard) o Botón Retroceso (Vistas) */}
        {/* ============================================================== */}
        <div className="flex items-center shrink-0 relative z-10">
          {isDashboard ? (
            <div className="flex items-center gap-2.5">
              <AppLogo size="md" showText={false} />
              <span className="text-base sm:text-lg font-bold text-slate-100 tracking-tight select-none">
                Finanzas al día
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleBack}
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center bg-slate-900/80 border border-slate-800 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/40 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
              aria-label="Volver al inicio"
              title="Volver al inicio"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
          )}
        </div>

        {/* ============================================================== */}
        {/* SECCIÓN CENTRAL: Título Rigurosamente Centrado (Vistas sec.)   */}
        {/* ============================================================== */}
        {!isDashboard && (
          <div className="absolute left-1/2 -translate-x-1/2 max-w-[55%] sm:max-w-[65%] text-center pointer-events-none px-2 z-10">
            <h1 className="text-base sm:text-lg font-bold text-slate-100 truncate tracking-tight">
              {title}
            </h1>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECCIÓN DERECHA: Acciones Contextuales                          */}
        {/* ============================================================== */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto relative z-10">
        {/* Caso 1: Dashboard -> Privacidad + Campana + Avatar con Anillo de Luz Neón */}
        {isDashboard && (
          <>
            {/* 1. Botón de Privacidad (Ocultar / Mostrar saldos) */}
            <button
              type="button"
              onClick={togglePrivacyMode}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm ${
                isPrivacyMode
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/40'
              }`}
              title={isPrivacyMode ? "Mostrar cifras" : "Ocultar cifras (modo discreto)"}
              aria-label="Modo discreto"
            >
              {isPrivacyMode ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}
            </button>

            {/* 2. Botón de Notificaciones Dark Neón */}
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-slate-900/80 border border-slate-800 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/40 active:scale-95 transition-all relative cursor-pointer shadow-sm"
              title={hasNotifications ? `${activeAlerts.length} alertas pendientes` : "Sin notificaciones"}
              aria-label="Notificaciones"
            >
              <Bell className="w-4.5 h-4.5" />
              {hasNotifications && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950" />
                </span>
              )}
            </button>

            {/* 3. Avatar de Perfil con Anillo Neón Adherido (Cero Separación) */}
            <button
              type="button"
              onClick={() => {
                if (onOpenProfile) onOpenProfile();
                else if (onOpenSettings) onOpenSettings();
              }}
              className="flex items-center justify-center select-none cursor-pointer active:scale-95 transition-transform focus:outline-none"
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
          </>
        )}

        {/* Caso 2: Transacciones -> Lupa (Search) + Filtros avanzados Dark Glass */}
        {isTransactions && (
          <>
            {/* Botón Lupa */}
            <button
              type="button"
              onClick={handleToggleSearch}
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

            {/* Botón Filtros Avanzados con badge verde esmeralda */}
            <button
              type="button"
              onClick={handleOpenFilterModal}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm relative ${
                hasActiveFilters
                  ? 'bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/40'
              }`}
              title="Filtros avanzados"
              aria-label="Filtros avanzados"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center justify-center absolute -top-1 -right-1 shadow-sm">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </>
        )}

        {/* Caso 3: Inversiones -> Refrescar cotizaciones + Botón + Inversión Dark Glass */}
        {isInvestments && (
          <>
            {/* 1. Botón Icono Circular Refrescar Cotizaciones */}
            <button
              type="button"
              onClick={handleRefreshQuotesClick}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-900/80 border border-slate-800 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/40 active:scale-95 active:rotate-180 transition-all cursor-pointer shadow-sm"
              title="Actualizar cotizaciones en tiempo real"
              aria-label="Actualizar cotizaciones"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshingQuotes ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* 2. Botón de Acción Rápida + para Registrar Nueva Inversión */}
            <button
              type="button"
              onClick={handleAddInvestmentClick}
              className="w-9 h-9 sm:w-auto sm:px-3 sm:py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              title="Registrar nueva inversión"
              aria-label="Registrar nueva inversión"
            >
              <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Inversión</span>
            </button>
          </>
        )}

        {/* Caso 4: Préstamos y Deudas -> Botón Circular + Dark Glass */}
        {isDebts && (
          <button
            type="button"
            onClick={handleAddDebtClick}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/80 border border-slate-800 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/40 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm"
            title="Registrar nuevo préstamo o deuda"
            aria-label="Registrar nuevo préstamo o deuda"
          >
            <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
          </button>
        )}

        {/* Caso 5: Cuentas y Métodos -> Botón + Cuenta Dark Glass */}
        {isAccounts && (
          <button
            type="button"
            onClick={handleAddAccountClick}
            className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            title="Añadir nueva cuenta"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Cuenta</span>
          </button>
        )}

        {/* Caso 6: Otras vistas secundarias -> Campana Dark Glass */}
        {!isDashboard && !isTransactions && !isInvestments && !isDebts && !isAccounts && (
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-900/80 border border-slate-800 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/40 active:scale-95 transition-all relative cursor-pointer shadow-sm"
            title={hasNotifications ? `${activeAlerts.length} alertas pendientes` : "Sin notificaciones"}
            aria-label="Notificaciones"
          >
            <Bell className="w-4.5 h-4.5" />
            {hasNotifications && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950" />
              </span>
            )}
          </button>
        )}
      </div>
    </header>

      {/* ============================================================== */}
      {/* DRAWER / MODAL DE NOTIFICACIONES                               */}
      {/* ============================================================== */}
      {isNotificationsOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-start sm:items-center justify-center sm:justify-end sm:p-6 z-50 animate-fadeIn"
          onClick={() => setIsNotificationsOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-[420px] rounded-b-3xl sm:rounded-3xl shadow-2xl border flex flex-col max-h-[85vh] overflow-hidden animate-slide-up bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
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
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {hasNotifications 
                      ? `${activeAlerts.length} alerta(s) pendientes`
                      : 'Todo al día'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasNotifications && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:underline transition-all cursor-pointer px-2 py-1 rounded-lg hover:bg-emerald-500/10"
                    title="Marcar todas como leídas"
                  >
                    Marcar todas
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
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
                    Tus compromisos fijos, cortes de tarjeta y compromisos financieros están al día.
                  </p>
                </div>
              ) : (
                activeAlerts.map((item) => {
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
                                dismissAlert(item.id);
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
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 transition-all cursor-pointer text-slate-700 dark:text-slate-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
