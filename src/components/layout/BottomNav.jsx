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
  onQuickAction,
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
    if (onQuickAction) {
      onQuickAction(e);
    } else if (setIsActionMenuOpen) {
      setIsActionMenuOpen((prev) => !prev);
    } else if (onOpenAddTx) {
      onOpenAddTx();
    } else if (onOpenTransaction) {
      onOpenTransaction();
    }
  };

  return (
    <div 
      className={`fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] inset-x-0 z-40 flex justify-center px-4 pointer-events-none ${mobileOnlyClass || className}`}
    >
      <nav 
        aria-label="Navegación principal móvil"
        className="pointer-events-auto relative flex items-center justify-between px-4 py-2.5 h-16 w-full max-w-md mx-auto rounded-3xl bg-slate-950/90 backdrop-blur-xl border border-emerald-500/25 shadow-[0_12px_36px_rgba(0,0,0,0.6),0_0_15px_rgba(16,185,129,0.12)]"
      >
        {/* Haz decorativo sutil en el borde superior de la cápsula */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent pointer-events-none rounded-t-3xl" />

        {/* Grupo Izquierdo (50% menos margen del botón central): Inicio y Movs */}
        <div className="flex items-center justify-around w-[calc(50%-28px)]">
          {/* 1. Inicio */}
          <button
            id="dock-tab-dashboard"
            type="button"
            onClick={() => handleTab('dashboard')}
            className={`cursor-pointer select-none py-1 px-1.5 flex flex-col items-center gap-0.5 text-[10px] sm:text-xs transition-colors ${
              activeTab === 'dashboard'
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 stroke-[2] ${
              activeTab === 'dashboard'
                ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.75)] scale-110 transition-all duration-200'
                : 'transition-all duration-200'
            }`} />
            <span className="leading-tight text-center">
              Inicio
            </span>
          </button>

          {/* 2. Movs */}
          <button
            id="dock-tab-transactions"
            type="button"
            onClick={() => handleTab('transactions')}
            className={`cursor-pointer select-none py-1 px-1.5 flex flex-col items-center gap-0.5 text-[10px] sm:text-xs transition-colors ${
              activeTab === 'transactions'
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <Receipt className={`w-5 h-5 stroke-[2] ${
              activeTab === 'transactions'
                ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.75)] scale-110 transition-all duration-200'
                : 'transition-all duration-200'
            }`} />
            <span className="leading-tight text-center">
              Movs
            </span>
          </button>
        </div>

        {/* Botón Central '+' con Centrado Absoluto Matemático Exacto */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          {/* Resplandor decorativo de luz neón desenfocada */}
          <div className="absolute -inset-1 rounded-full bg-emerald-500/25 blur-md pointer-events-none -z-10 translate-y-1" />
          <button 
            id="dock-btn-fab"
            type="button"
            onClick={handleFabClick}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-emerald-400 text-slate-950 font-bold shadow-[0_8px_22px_rgba(16,185,129,0.5)] flex items-center justify-center transition-all active:scale-95 focus:outline-none cursor-pointer select-none"
            aria-label="Registrar nueva operación"
          >
            <Plus className={`w-6 h-6 stroke-[2.5] transition-transform duration-300 ${isActionMenuOpen ? 'rotate-45' : ''}`}/>
          </button>
        </div>

        {/* Grupo Derecho (50% menos margen del botón central): Inversión y Deudas */}
        <div className="flex items-center justify-around w-[calc(50%-28px)]">
          {/* 3. Inversión */}
          <button
            id="dock-tab-investments"
            type="button"
            onClick={() => handleTab('investments')}
            className={`cursor-pointer select-none py-1 px-1.5 flex flex-col items-center gap-0.5 text-[10px] sm:text-xs transition-colors ${
              activeTab === 'investments'
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <TrendingUp className={`w-5 h-5 stroke-[2] ${
              activeTab === 'investments'
                ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.75)] scale-110 transition-all duration-200'
                : 'transition-all duration-200'
            }`} />
            <span className="leading-tight text-center">
              Inversión
            </span>
          </button>

          {/* 4. Deudas */}
          <button
            id="dock-tab-debts"
            type="button"
            onClick={() => handleTab('debts')}
            className={`cursor-pointer select-none py-1 px-1.5 flex flex-col items-center gap-0.5 text-[10px] sm:text-xs transition-colors ${
              activeTab === 'debts'
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <HandCoins className={`w-5 h-5 stroke-[2] ${
              activeTab === 'debts'
                ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.75)] scale-110 transition-all duration-200'
                : 'transition-all duration-200'
            }`} />
            <span className="leading-tight text-center">
              Deudas
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
