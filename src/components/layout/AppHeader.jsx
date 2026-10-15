import React, { useState } from 'react';
import { Calendar, ChevronDown, Bell } from 'lucide-react';
import Header from './Header';
import SyncStatusBadge from '../ui/SyncStatusBadge';
import NotificationCenter from '../ui/NotificationCenter';
import useFinancialDueAlerts from '../../hooks/useFinancialDueAlerts';
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
  debts: 'Préstamos y deudas',
  loans: 'Préstamos y deudas',
  investments: 'Inversiones y patrimonio',
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
  recurringPayments = [],
  debtsAndLoans = [],
  savingsGoals = [],
  onAddTransaction = null,
  onUpdateRecurring = null
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

  const headerTitle = TAB_TITLES[activeTab] || 'Panel financiero';
  const userName = userProfile?.name?.split(' ')[0] || 'Usuario';

  return (
    <>
      {/* Top Header Móvil (< lg) anclado fijamente */}
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
          recurringPayments={recurringPayments}
          debtsAndLoans={debtsAndLoans}
          savingsGoals={savingsGoals}
          onApproveRecurring={handleApproveRecurring}
          onSkipRecurring={handleSkipRecurring}
        />
      </div>

      {/* Top Header Panorámico de Escritorio (visible en lg:) */}
      <header className={`${desktopOnlyClass} border-b border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-slate-900/80 dark:bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-40 shrink-0 select-none shadow-xs`}>
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
        onApproveRecurring={handleApproveRecurring}
        onSkipRecurring={handleSkipRecurring}
      />
    </>
  );
}
