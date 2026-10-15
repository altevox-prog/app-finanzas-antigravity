import React from 'react';
import { AppHeader, BottomNav, DesktopSidebar } from './components/layout';
import { ViewRouter } from './views';
import SplashScreen from './components/onboarding/SplashScreen';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import GlobalModals from './components/layout/GlobalModals';
import PwaUpdateBanner from './components/ui/PwaUpdateBanner';
import { RotateCcw } from 'lucide-react';
import Toaster from './components/ui/Toaster';
import { useAppOrchestrator } from './hooks/useAppOrchestrator';

export default function App() {
  const state = useAppOrchestrator();

  if (state.authLoading) {
    return <SplashScreen message="Verificando tu espacio..." />;
  }

  if (state.isOnboardingActive && (!state.user || state.user.id === 'local-user')) {
    return (
      <OnboardingWizard 
        onComplete={state.handleOnboardingComplete} 
        onRestoreBackup={state.handleRestoreBackup} 
      />
    );
  }

  const { isForcedMobile, isForcedDesktop, modalControls } = state;

  return (
    <div className={`min-h-[100dvh] bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 flex ${
      isForcedMobile ? 'flex-col items-center justify-start p-2 sm:p-4' :
      isForcedDesktop ? 'flex-row items-stretch justify-start p-0' :
      'flex-col lg:flex-row items-center lg:items-stretch justify-start sm:justify-center lg:justify-start p-0 sm:p-4 md:p-6 lg:p-0'
    } transition-colors font-sans antialiased w-full overflow-x-hidden`}>
      {/* 1. BARRA LATERAL FIJA EN ESCRITORIO */}
      <DesktopSidebar
        modalControls={modalControls}
        activeTab={state.activeTab}
        setActiveTab={state.setActiveTab}
        onTabChange={state.handleTabChange}
        onOpenTransaction={() => modalControls.openAddTransaction('expense')}
        onAddExpense={() => modalControls.openAddTransaction('expense')}
        onAddIncome={() => modalControls.openAddTransaction('income')}
        onOpenTransfer={() => modalControls.openTransfer()}
        onOpenRecurring={() => modalControls.openAddRecurring()}
        onOpenLoan={() => modalControls.openAddLoan('payable')}
        onOpenDebt={() => modalControls.openAddLoan('payable')}
        onOpenInvestment={() => modalControls.openAddInvestment()}
        isSettingsOpen={state.isSettingsOpen}
        setIsSettingsOpen={state.setIsSettingsOpen}
        onOpenProfile={state.handleOpenProfile}
        userProfile={state.userProfile}
        theme={state.theme}
        onToggleTheme={state.handleToggleTheme}
        onLock={() => state.setIsLocked(true)}
        onLogout={state.handleGlobalLogout}
        trm={state.trm}
        syncStatus={state.syncStatus}
        isCloudEnabled={state.isCloudEnabled}
        syncUser={state.syncUser}
        className={state.desktopOnlyClass}
      />

      {/* Indicador superior en pantallas móviles simuladas (< lg) */}
      <div className={`${isForcedMobile ? 'flex' : isForcedDesktop ? 'hidden' : 'hidden sm:flex lg:hidden'} items-center justify-between w-full max-w-[440px] px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium`}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">Monety</span>
          <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono">
            {isForcedMobile ? 'MÓVIL' : 'PWA'}
          </span>
        </div>
        <button 
          type="button"
          onClick={() => state.handleFullReset()}
          className="hover:text-slate-900 dark:hover:text-slate-200 text-[11px] flex items-center gap-1 opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
          title="Restablecer aplicación a cero"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restablecer</span>
        </button>
      </div>

      {/* Contenedor Principal Adaptable */}
      <div 
        className={`w-full ${
          isForcedMobile 
            ? 'max-w-[440px] mx-auto min-h-[100dvh] rounded-[40px] shadow-2xl border-[8px] border-slate-300 dark:border-slate-800' 
            : isForcedDesktop 
            ? 'max-w-none h-screen rounded-none shadow-none border-0 overflow-hidden' 
            : 'sm:max-w-[440px] lg:max-w-none min-h-[100dvh] lg:h-screen sm:rounded-[40px] lg:rounded-none sm:shadow-[0_25px_70px_rgba(0,0,0,0.25)] dark:sm:shadow-[0_25px_70px_rgba(0,0,0,0.7)] lg:shadow-none sm:border-[8px] lg:border-0 sm:border-slate-300 dark:sm:border-slate-800 lg:overflow-hidden'
        } flex flex-col justify-between relative transition-colors bg-[#F8FAFC] dark:bg-zinc-950 flex-1`}
        style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
      >
        {/* Cabecera Unificada */}
        <AppHeader
          activeTab={state.activeTab}
          userProfile={state.userProfile}
          currentMonthLabel={state.currentMonthLabel}
          selectedDate={state.selectedDate}
          selectedMonth={state.selectedMonth}
          selectedYear={state.selectedYear}
          selectedDay={state.selectedDay}
          onOpenMonthPicker={() => state.setShowMonthPicker(true)}
          handlePrevMonth={state.handlePrevMonth}
          handleNextMonth={state.handleNextMonth}
          handleResetToToday={state.handleResetToToday}
          trm={state.trm}
          isForcedMobile={isForcedMobile}
          isForcedDesktop={isForcedDesktop}
          mobileOnlyClass={state.mobileOnlyClass}
          desktopOnlyClass={state.desktopOnlyClass}
          monthlyStats={state.monthlyStats}
          theme={state.theme}
          onToggleTheme={state.handleToggleTheme}
          onOpenProfile={state.handleOpenProfile}
          onOpenSettings={state.handleOpenProfile}
          onOpenAuth={state.handleOpenProfile}
          onLogout={state.handleGlobalLogout}
          syncStatus={state.syncStatus}
          isCloudEnabled={state.isCloudEnabled}
          syncUser={state.syncUser}
          accounts={state.accounts}
          investments={state.investments}
          subscriptions={state.subscriptions}
          debtsAndLoans={state.debtsAndLoans}
          savingsGoals={state.savingsGoals}
        />

        {/* Main Content Area */}
        <main ref={state.mainContentRef} className="flex-1 w-full px-3.5 sm:px-4 lg:px-0 py-2.5 sm:py-3 lg:py-0 pb-28 sm:pb-32 lg:pb-12 relative lg:overflow-y-auto space-y-3.5 sm:space-y-4 lg:space-y-0">
          <div className="w-full lg:max-w-[1550px] lg:mx-auto lg:px-6 lg:py-6">
            <ViewRouter
              activeTab={state.activeTab}
              tabResetKeys={state.tabResetKeys}
              financeData={state.financeData}
              financeActions={state.financeActions}
              modalControls={modalControls}
              {...modalControls}
            />
          </div>
        </main>

        {/* Barra de Navegación Inferior Estilo iOS Dock Central */}
        <BottomNav
          activeTab={state.activeTab}
          setActiveTab={state.setActiveTab}
          onTabChange={state.handleTabChange}
          isActionMenuOpen={state.isActionMenuOpen}
          setIsActionMenuOpen={state.setIsActionMenuOpen}
          onOpenTransaction={state.handleOpenTransaction}
          onOpenAddTx={state.handleOpenTransaction}
          onOpenTransfer={state.handleOpenTransfer}
          onOpenRecurring={state.handleOpenRecurring}
          onOpenLoan={() => state.handleOpenAddLoan('receivable')}
          onOpenDebt={() => state.handleOpenAddDebt('payable')}
          onOpenInvestment={state.handleOpenInvestment}
          mobileOnlyClass={state.mobileOnlyClass}
        />

        {/* Barra Home Indicator de iOS para Desktop */}
        <div className={`${isForcedMobile ? 'block' : isForcedDesktop ? 'hidden' : 'hidden sm:block lg:hidden'} fixed bottom-1 left-0 right-0 sm:max-w-[440px] sm:left-1/2 sm:-translate-x-1/2 z-50 pointer-events-none`}>
          <div className="w-32 h-1 bg-slate-400/40 rounded-full mx-auto" />
        </div>

        {/* Modales Globales y Overlays Centralizados */}
        <GlobalModals
          modalControls={modalControls}
          financeData={state.financeData}
          financeActions={state.financeActions}
          onLogout={state.handleGlobalLogout}
          {...state}
        />

        {/* Banner Flotante de Actualización PWA */}
        {state.hasPwaUpdate && (
          <PwaUpdateBanner onClose={() => state.setHasPwaUpdate(false)} />
        )}

        {/* Sistema Global de Notificaciones Toaster */}
        <Toaster position="top-right" />
      </div>
    </div>
  );
}
