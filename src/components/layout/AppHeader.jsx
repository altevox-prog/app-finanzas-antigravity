import React, { useState } from 'react';
import { Calendar, ChevronDown, Bell } from 'lucide-react';
import Header from '../Header';
import SyncStatusBadge from '../SyncStatusBadge';
import NotificationCenter from '../NotificationCenter';
import useFinancialDueAlerts from '../../hooks/useFinancialDueAlerts';

const TAB_TITLES = {
  dashboard: 'Panel financiero',
  transactions: 'Historial de movimientos',
  accounts: 'Cuentas y métodos de pago',
  recurring: 'Pagos recurrentes y suscripciones',
  tax: 'Impuestos y declaración de renta',
  debts: 'Préstamos y deudas',
  loans: 'Préstamos y deudas',
  investments: 'Inversiones y patrimonio'
};

/**
 * AppHeader
 * Cabecera unificada de la aplicación:
 * - Barra de estado iOS simulada (en móvil emulado / tablet)
 * - Cabecera móvil con notificaciones, perfil y estadísticas rápidas (< lg)
 * - Cabecera panorámica de escritorio con título dinámico de sección, selector de fecha, campana de notificaciones y TRM (>= lg)
 */
export default function AppHeader({
  activeTab = 'dashboard',
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
  debtsAndLoans = [],
  savingsGoals = []
}) {
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

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
    savingsGoals
  });

  const handleOpenPicker = () => {
    if (onOpenMonthPicker) onOpenMonthPicker();
    else if (setShowMonthPicker) setShowMonthPicker(true);
  };

  const headerTitle = TAB_TITLES[activeTab] || 'Panel financiero';
  const userName = userProfile?.name?.split(' ')[0] || 'Usuario';

  return (
    <>
      {/* Barra de Estado iOS simulada para móviles en tablet reducida (< lg) */}
      <div 
        className={`${isForcedMobile ? 'flex' : isForcedDesktop ? 'hidden' : 'hidden sm:flex lg:hidden'} items-center justify-between px-7 pt-3 pb-1 text-xs font-semibold select-none shrink-0 z-40 bg-slate-50/90 dark:bg-[#09090b]/90 text-slate-900 dark:text-slate-100`} 
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

      {/* Top Header Móvil (< lg) */}
      <div className={mobileOnlyClass}>
        <Header 
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
          debtsAndLoans={debtsAndLoans}
          savingsGoals={savingsGoals}
        />
      </div>

      {/* Top Header Panorámico de Escritorio (visible en lg:) */}
      <header className={`${desktopOnlyClass} border-b border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-20 shrink-0 select-none`}>
        <div className="max-w-[1550px] w-full mx-auto px-6 py-4.5 flex sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {headerTitle}
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Bienvenido de nuevo, {userName} • {currentMonthLabel}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Selector de Mes Interactivo */}
            <button
              type="button"
              onClick={handleOpenPicker}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer border border-slate-200/80 dark:border-white/[0.08] shadow-sm group"
              title="Abrir selector de mes y año"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span>{selectedDay ? selectedDay : currentMonthLabel}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </button>

            {/* Estado de Sincronización en la Nube */}
            <div className="hidden sm:flex max-w-[190px]">
              <SyncStatusBadge
                syncStatus={syncStatus}
                isCloudEnabled={isCloudEnabled}
                user={syncUser}
                onOpenAuth={onOpenAuth}
              />
            </div>

            {/* TRM Oficial Automatizado (No editable) */}
            <div 
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-300 select-none shadow-sm"
              title="Tasa Representativa del Mercado (TRM) oficial sincronizada automáticamente con datos abiertos"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>TRM Oficial: ${Number(trm).toLocaleString('es-CO')} COP</span>
            </div>

            {/* Botón de Campana de Notificaciones en Escritorio */}
            <button
              type="button"
              onClick={() => setIsNotificationCenterOpen(true)}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 relative transition-colors cursor-pointer"
              title={unreadCount > 0 ? `${unreadCount} alerta(s) pendientes` : "Sin notificaciones"}
              aria-label="Centro de notificaciones"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold flex items-center justify-center leading-none shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Modal / Drawer Centro de Notificaciones (Escritorio) */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={alerts}
        activeNotifications={activeAlerts}
        onDismiss={dismissAlert}
        onMarkAllAsRead={markAllAsRead}
      />
    </>
  );
}
