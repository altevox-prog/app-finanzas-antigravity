import React from 'react';
import { LayoutDashboard, Receipt, Plus, TrendingUp, HandCoins } from 'lucide-react';

/**
 * BottomNav
 * Barra de Navegación Inferior Estilo iOS Dock Central para pantallas móviles y tabletas reducidas.
 */
export default function BottomNav({
  activeTab,
  setActiveTab,
  onTabChange,
  isActionMenuOpen,
  setIsActionMenuOpen,
  onOpenTransaction,
  onOpenAddTx,
  onOpenTransfer,
  onOpenRecurring,
  onOpenLoan,
  onOpenDebt,
  onOpenInvestment,
  className = '',
  mobileOnlyClass = ''
}) {
  const handleTab = (tab) => {
    if (onTabChange) onTabChange(tab);
    else if (setActiveTab) setActiveTab(tab);
  };

  const handleFabClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (setIsActionMenuOpen) {
      setIsActionMenuOpen((prev) => !prev);
    } else if (onOpenAddTx) {
      onOpenAddTx();
    } else if (onOpenTransaction) {
      onOpenTransaction();
    }
  };

  return (
    <nav 
      aria-label="Navegación principal móvil"
      className={`fixed bottom-0 left-0 right-0 sm:max-w-[440px] sm:left-1/2 sm:-translate-x-1/2 z-40 backdrop-blur-xl border-t pt-1.5 px-2 pb-2 sm:pb-3 grid grid-cols-5 items-center justify-items-center shadow-lg bg-white/95 dark:bg-[#12141C]/95 border-slate-200/80 dark:border-white/10 ${mobileOnlyClass || className}`}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      {/* 1. Inicio */}
      <button
        id="dock-tab-dashboard"
        type="button"
        onClick={() => handleTab('dashboard')}
        className={`flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 w-full rounded-xl active:scale-90 transition-all cursor-pointer ${
          activeTab === 'dashboard' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400 opacity-70 hover:opacity-100'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 stroke-[2]" />
        <span className="text-[10px] leading-tight text-center truncate max-w-full">Inicio</span>
      </button>

      {/* 2. Movs */}
      <button
        id="dock-tab-transactions"
        type="button"
        onClick={() => handleTab('transactions')}
        className={`flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 w-full rounded-xl active:scale-90 transition-all cursor-pointer ${
          activeTab === 'transactions' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400 opacity-70 hover:opacity-100'
        }`}
      >
        <Receipt className="w-5 h-5 stroke-[2]" />
        <span className="text-[10px] leading-tight text-center truncate max-w-full">Movs</span>
      </button>

      {/* 3. Botón Central (+) Elevado y Verde Esmeralda */}
      <div className="flex items-center justify-center relative z-50">
        <button
          id="dock-btn-fab"
          type="button"
          onClick={handleFabClick}
          className="relative -top-5 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-600/40 active:scale-90 transition-all z-50 pointer-events-auto cursor-pointer"
          aria-label="Nuevo movimiento y acciones"
        >
          <Plus 
            className={`w-7 h-7 transition-transform duration-300 ${
              isActionMenuOpen ? 'rotate-45 text-rose-200' : ''
            }`} 
          />
        </button>
      </div>

      {/* 4. Inversión */}
      <button
        id="dock-tab-investments"
        type="button"
        onClick={() => handleTab('investments')}
        className={`flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 w-full rounded-xl active:scale-90 transition-all cursor-pointer ${
          activeTab === 'investments' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400 opacity-70 hover:opacity-100'
        }`}
      >
        <TrendingUp className="w-5 h-5 stroke-[2]" />
        <span className="text-[10px] leading-tight text-center truncate max-w-full">Inversión</span>
      </button>

      {/* 5. Deudas */}
      <button
        id="dock-tab-debts"
        type="button"
        onClick={() => handleTab('debts')}
        className={`flex flex-col items-center justify-center gap-1 py-1.5 px-0.5 w-full rounded-xl active:scale-90 transition-all relative cursor-pointer ${
          activeTab === 'debts' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400 opacity-70 hover:opacity-100'
        }`}
      >
        <HandCoins className="w-5 h-5 stroke-[2]" />
        <span className="text-[10px] leading-tight text-center truncate max-w-full">Deudas</span>
      </button>
    </nav>
  );
}
