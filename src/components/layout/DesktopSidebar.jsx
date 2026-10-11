import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ArrowUpDown,
  CreditCard,
  CalendarSync,
  Landmark,
  Scale,
  HandCoins,
  TrendingUp,
  Plus,
  Settings,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import AppLogo from '../AppLogo';
import Avatar from '../ui/Avatar';

/**
 * DesktopSidebar
 * Barra lateral fija para escritorio (visible solo en viewport >= lg).
 * Incluye navegación principal, botón flotante/menú de nuevo movimiento (+),
 * badge de sincronización en la nube, toggle de tema y tarjeta de perfil.
 */
export default function DesktopSidebar({
  modalControls,
  activeTab = 'dashboard',
  setActiveTab,
  onTabChange,
  onOpenTransaction,
  onOpenAddTx,
  onOpenTransfer,
  onAddExpense,
  onAddIncome,
  isAddTransactionOpen,
  setIsAddTransactionOpen,
  onOpenAddTransaction,
  onOpenNewTransaction,
  onOpenRecurring,
  onOpenLoan,
  onOpenDebt,
  onAddDebtOrLoan,
  onOpenInvestment,
  setIsOpen,
  userProfile,
  theme = 'dark',
  onToggleTheme,
  isSettingsOpen,
  setIsSettingsOpen,
  onOpenSettings,
  onOpenProfile,
  onOpenAuth,
  onLock,
  onLogout,
  syncStatus = 'idle',
  isCloudEnabled = false,
  syncUser = null,
  trm = 4000,
  className = 'hidden lg:flex'
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleTab = (tab) => {
    if (onTabChange) onTabChange(tab);
    else if (setActiveTab) setActiveTab(tab);
  };

  const handleOpenTransaction = () => {
    if (onOpenAddTx) {
      onOpenAddTx();
    } else if (onOpenTransaction) {
      onOpenTransaction();
    } else if (setIsAddTransactionOpen) {
      setIsAddTransactionOpen(true);
    } else if (onOpenAddTransaction) {
      onOpenAddTransaction();
    } else if (onOpenNewTransaction) {
      onOpenNewTransaction();
    }
  };

  const handleOpenSettings = () => {
    if (setIsSettingsOpen) {
      setIsSettingsOpen(true);
    } else if (onOpenSettings) {
      onOpenSettings();
    } else if (onOpenProfile) {
      onOpenProfile();
    }
  };

  const NAV_ITEMS = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: <LayoutDashboard className="w-4.5 h-4.5" />
    },
    {
      id: 'transactions',
      label: 'Movimientos',
      icon: <ArrowLeftRight className="w-4.5 h-4.5" />
    },
    {
      id: 'accounts',
      label: 'Cuentas y métodos',
      icon: <CreditCard className="w-4.5 h-4.5" />
    },
    {
      id: 'recurring',
      label: 'Pagos recurrentes',
      icon: <CalendarSync className="w-4.5 h-4.5" />
    },
    {
      id: 'tax',
      label: 'Impuestos y renta',
      icon: <Landmark className="w-4.5 h-4.5" />,
      badge: 'DIAN'
    },
    {
      id: 'debts',
      label: 'Préstamos y deudas',
      icon: <HandCoins className="w-4.5 h-4.5" />
    },
    {
      id: 'investments',
      label: 'Inversiones y activos',
      icon: <TrendingUp className="w-4.5 h-4.5" />
    }
  ];

  return (
    <aside 
      className={`${className} w-64 xl:w-72 h-screen sticky top-0 flex-col justify-between p-5 border-r border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#09090b]/90 backdrop-blur-xl z-30 select-none shrink-0 transition-all`}
    >
      {/* SECCIÓN SUPERIOR: Logo + Botón Acción + Navegación */}
      <div className="space-y-6">
        {/* Identidad de Marca */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <AppLogo className="w-9 h-9" />
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-tight">
                Monety
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase block">
                Finanzas Personales
              </span>
            </div>
          </div>
        </div>

        {/* Botón Principal de Acción Rápida con Menú Desplegable */}
        <button
          id="desktop-btn-new-transaction"
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-150 ease-out active:scale-[0.97] active:brightness-95 hover:shadow-md cursor-pointer select-none relative"
        >
          <Plus className={`w-5 h-5 transition-transform duration-200 ${isMenuOpen ? 'rotate-45' : ''}`} />
          <span>Nuevo movimiento</span>
        </button>

        {/* Menú Desplegable Flotante renderizado vía createPortal */}
        {isMenuOpen && typeof document !== 'undefined' && createPortal(
          <>
            <div 
              className="fixed inset-0 z-[9980] bg-black/20 backdrop-blur-[2px]" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMenuOpen(false);
              }} 
            />
            <div 
              className="fixed left-6 top-32 z-[9990] w-64 bg-white dark:bg-[#27272a] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-2 shadow-2xl space-y-1 animate-slide-up pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Opción Movimiento (Gasto o ingreso) */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  if (modalControls && typeof modalControls.openAddTransaction === 'function') {
                    modalControls.openAddTransaction('expense');
                  } else {
                    handleOpenTransaction();
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-all duration-150 ease-out active:scale-[0.97] active:brightness-95 select-none"
              >
                <ArrowUpDown className="w-4 h-4 text-emerald-500" />
                <span>Registrar gasto o ingreso</span>
              </button>
              
              {/* Opción Transferencia */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  if (modalControls && typeof modalControls.openTransfer === 'function') {
                    modalControls.openTransfer();
                  } else if (typeof onOpenTransfer === 'function') {
                    onOpenTransfer();
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-all duration-150 ease-out active:scale-[0.97] active:brightness-95 select-none"
              >
                <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                <span>Transferencia entre cuentas</span>
              </button>

              {/* Opción Pagos Recurrentes */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  if (modalControls && typeof modalControls.openAddRecurring === 'function') {
                    modalControls.openAddRecurring();
                  } else if (typeof onOpenRecurring === 'function') {
                    onOpenRecurring();
                  } else {
                    handleTab('recurring');
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-all duration-150 ease-out active:scale-[0.97] active:brightness-95 select-none"
              >
                <CalendarSync className="w-4 h-4 text-purple-500" />
                <span>Suscripción o recurrente</span>
              </button>

              {/* Opción Préstamo o Deuda */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  if (modalControls && typeof modalControls.openAddLoan === 'function') {
                    modalControls.openAddLoan('payable');
                  } else if (modalControls && typeof modalControls.openAddDebt === 'function') {
                    modalControls.openAddDebt('payable');
                  } else if (typeof onOpenLoan === 'function') {
                    onOpenLoan();
                  } else if (typeof onOpenDebt === 'function') {
                    onOpenDebt();
                  } else if (typeof onAddDebtOrLoan === 'function') {
                    onAddDebtOrLoan();
                  } else {
                    handleTab('debts');
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-all duration-150 ease-out active:scale-[0.97] active:brightness-95 select-none"
              >
                <HandCoins className="w-4 h-4 text-amber-500" />
                <span>Préstamo o deuda</span>
              </button>

              {/* Opción Inversión */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  if (modalControls && typeof modalControls.openAddInvestment === 'function') {
                    modalControls.openAddInvestment();
                  } else if (modalControls && typeof modalControls.openInvestment === 'function') {
                    modalControls.openInvestment();
                  } else if (typeof onOpenInvestment === 'function') {
                    onOpenInvestment();
                  } else {
                    handleTab('investments');
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-all duration-150 ease-out active:scale-[0.97] active:brightness-95 select-none"
              >
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <span>Registrar inversión</span>
              </button>
            </div>
          </>,
          document.body
        )}

        {/* Menú de Navegación Principal */}
        <nav className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 pb-1 block">
            Navegación
          </span>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-semibold text-xs transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-emerald-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* SECCIÓN INFERIOR: Perfil y Ajustes */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-white/5">
        {/* Tarjeta de Perfil y Acceso a Ajustes */}
        <button
          type="button"
          onClick={handleOpenSettings}
          className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left cursor-pointer group"
          title="Abrir configuración y perfil"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar
              src={syncUser?.user_metadata?.avatar_url || userProfile?.avatar_url || userProfile?.photo}
              name={syncUser?.user_metadata?.full_name || userProfile?.name}
              email={syncUser?.email || userProfile?.email}
              size="md"
              showStatus={Boolean(syncUser?.id && syncUser?.id !== 'local-user')}
              isOnline={Boolean(syncUser?.id && syncUser?.id !== 'local-user')}
            />
            <div className="min-w-0 text-left flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {userProfile?.name || 'Usuario'}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                Configuración y datos
              </p>
            </div>
          </div>
          <Settings className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0" />
        </button>
      </div>
    </aside>
  );
}
