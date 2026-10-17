import React, { useState, Suspense, lazy } from 'react';
import { Calendar, Pencil, Sparkles, ChevronDown } from 'lucide-react';
import DesktopSidebar from './DesktopSidebar';
import DesktopMonthPicker from './DesktopMonthPicker';

import AddTransactionModal from '../transactions/modals/AddTransactionModal';
import AddLoanModal from '../debts/AddLoanModal';
import AddRecurringModal from '../recurring/modals/AddRecurringModal';

export default function DesktopLayout({
  activeTab = 'dashboard',
  onTabChange,
  // Modals state & handlers
  onOpenTransaction,
  isAddTransactionOpen,
  setIsAddTransactionOpen,
  onOpenAddTransaction,
  isSettingsOpen,
  setIsSettingsOpen,
  onOpenSettings,
  isAddLoanOpen,
  setIsAddLoanOpen,
  onOpenAddLoan,
  addLoanInitialType = 'receivable',
  isAddRecurringOpen,
  setIsAddRecurringOpen,
  onOpenAddRecurring,
  // Data & settings
  userProfile,
  theme,
  onToggleTheme,
  onLogout,
  trm,
  setCustomTRM,
  selectedDate,
  onChangeMonth,
  selectedDay,
  onSelectDay,
  currentMonthLabel,
  availableLiquidBalance,
  formatMoney,
  transactions = [],
  children
}) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showTRMModal, setShowTRMModal] = useState(false);

  const handleOpenTx = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onOpenTransaction) onOpenTransaction();
    else if (onOpenAddTransaction) onOpenAddTransaction();
    else if (setIsAddTransactionOpen) setIsAddTransactionOpen(true);
  };
  const handleOpenSettings = onOpenSettings || (() => setIsSettingsOpen?.(true));

  return (
    <div className="hidden lg:flex w-full min-h-screen bg-slate-100 dark:bg-[#06070A] text-slate-900 dark:text-slate-100 transition-colors font-sans antialiased">
      {/* 1. Barra Lateral Fija */}
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenTransaction={handleOpenTx}
        isAddTransactionOpen={isAddTransactionOpen}
        setIsAddTransactionOpen={setIsAddTransactionOpen}
        onOpenAddTransaction={handleOpenTx}
        onOpenNewTransaction={handleOpenTx}
        onOpenRecurring={onOpenAddRecurring}
        onOpenLoan={onOpenAddLoan}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        onOpenSettings={handleOpenSettings}
        onOpenProfile={handleOpenSettings}
        userProfile={userProfile}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onLogout={onLogout}
        trm={trm}
      />

      {/* 2. Área Principal Panorámica */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#090A0F]">
        {/* Barra Superior Panorámica */}
        <header className="border-b border-slate-200/80 dark:border-white/[0.06] bg-white/80 dark:bg-[#0D0F17]/80 backdrop-blur-md sticky top-0 z-40 shrink-0 select-none shadow-xs">
          <div className="max-w-[1550px] w-full mx-auto px-6 py-4.5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {activeTab === 'dashboard' && 'Panel financiero'}
                {activeTab === 'transactions' && 'Historial de movimientos'}
                {activeTab === 'accounts' && 'Cuentas y métodos de pago'}
                {activeTab === 'recurring' && 'Pagos recurrentes y suscripciones'}
                {(activeTab === 'tax' || activeTab === 'taxes' || activeTab === 'impuestos') && 'Impuestos y declaración de renta'}
                {(activeTab === 'debts' || activeTab === 'loans') && 'Préstamos y deudas'}
                {activeTab === 'investments' && 'Portafolio de inversiones'}
                {(activeTab === 'net_worth' || activeTab === 'networth' || activeTab === 'patrimonio') && 'Patrimonio neto y balance'}
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Bienvenido de nuevo, {userProfile?.name?.split(' ')[0] || 'Usuario'} • {currentMonthLabel}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* 3. Selector de Mes / Calendario Interactivo */}
              <button
                type="button"
                onClick={() => setShowMonthPicker(true)}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-[#131620] hover:bg-slate-200/80 hover:dark:bg-[#181C28] text-slate-700 dark:text-slate-300 text-xs font-medium transition-all flex items-center gap-2 cursor-pointer border border-slate-200/80 dark:border-white/[0.08] shadow-sm group"
                title="Abrir selector de mes y año"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span>{selectedDay ? selectedDay : currentMonthLabel}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>

              {/* 4. Chip de TRM Oficial Automatizado (No editable) */}
              <div 
                className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-[#131620] border border-slate-200/80 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 select-none shadow-sm"
                title="Tasa Representativa del Mercado (TRM) oficial sincronizada automáticamente con datos abiertos"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span>TRM Oficial: ${Number(trm || 4050).toLocaleString('es-CO')} COP</span>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido Central Centrado */}
        <main className="flex-1 overflow-y-auto px-6 py-6 pb-12">
          <div className="max-w-[1550px] w-full mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Selector de Mes / Año Dropdown */}
      <DesktopMonthPicker
        isOpen={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        selectedDate={selectedDate}
        onChangeMonth={onChangeMonth}
        selectedDay={selectedDay}
        onSelectDay={onSelectDay}
        onClearSelectedDay={() => onSelectDay?.(null)}
        transactions={transactions}
      />

      {/* Modales integrados en versión escritorio */}
      <Suspense fallback={null}>
        {isAddTransactionOpen && (
          <AddTransactionModal
            isOpen={isAddTransactionOpen}
            onClose={() => setIsAddTransactionOpen?.(false)}
          />
        )}
        {isAddLoanOpen && (
          <AddLoanModal
            isOpen={isAddLoanOpen}
            initialType={addLoanInitialType}
            defaultType={addLoanInitialType}
            onClose={() => setIsAddLoanOpen?.(false)}
          />
        )}
        {isAddRecurringOpen && (
          <AddRecurringModal
            isOpen={isAddRecurringOpen}
            onClose={() => setIsAddRecurringOpen?.(false)}
          />
        )}
      </Suspense>
    </div>
  );
}
