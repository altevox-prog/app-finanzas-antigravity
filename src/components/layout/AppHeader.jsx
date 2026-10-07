import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import Header from '../Header';

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
 * - Cabecera panorámica de escritorio con título dinámico de sección, selector de fecha y TRM (>= lg)
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
  accounts = [],
  subscriptions = [],
  debtsAndLoans = [],
  savingsGoals = []
}) {
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
        className={`${isForcedMobile ? 'flex' : isForcedDesktop ? 'hidden' : 'hidden sm:flex lg:hidden'} items-center justify-between px-7 pt-3 pb-1 text-xs font-semibold select-none shrink-0 z-40 bg-slate-50/90 dark:bg-[#090A0F]/90 text-slate-900 dark:text-slate-100`} 
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
          theme={theme}
          onToggleTheme={onToggleTheme}
          onOpenProfile={onOpenProfile}
          onOpenSettings={onOpenSettings || onOpenProfile}
          onOpenAuth={onOpenAuth}
          onLogout={onLogout}
          accounts={accounts}
          subscriptions={subscriptions}
          debtsAndLoans={debtsAndLoans}
          savingsGoals={savingsGoals}
        />
      </div>

      {/* Top Header Panorámico de Escritorio (visible en lg:) */}
      <header className={`${desktopOnlyClass} border-b border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-[#0B0E14]/80 backdrop-blur-md sticky top-0 z-20 shrink-0 select-none`}>
        <div className="max-w-[1550px] w-full mx-auto px-6 py-4.5 flex sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {headerTitle}
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Bienvenido de nuevo, {userName} • {currentMonthLabel}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Selector de Mes Interactivo */}
            <button
              type="button"
              onClick={handleOpenPicker}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer border border-slate-200/80 dark:border-white/10 shadow-2xs group"
              title="Abrir selector de mes y año"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span>{selectedDay ? selectedDay : currentMonthLabel}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </button>

            {/* TRM Oficial Automatizado (No editable) */}
            <div 
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 select-none shadow-2xs"
              title="Tasa Representativa del Mercado (TRM) oficial sincronizada automáticamente con datos abiertos"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>TRM Oficial: ${Number(trm).toLocaleString('es-CO')} COP</span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
