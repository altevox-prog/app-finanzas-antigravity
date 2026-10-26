import React from 'react';
import { AppHeader, BottomNav, DesktopSidebar } from './components/layout';
import { ViewRouter } from './views';
import SplashScreen from './components/onboarding/SplashScreen';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import AuthModal from './components/auth/AuthModal';
import GlobalModals from './components/layout/GlobalModals';
import PwaUpdateBanner from './components/ui/PwaUpdateBanner';
import { RotateCcw } from 'lucide-react';
import Toaster from './components/ui/Toaster';
import { useAppOrchestrator } from './hooks/useAppOrchestrator';
import { useGlobalCapitalize } from './hooks/useGlobalCapitalize';

export default function App() {
  useGlobalCapitalize();
  const state = useAppOrchestrator();

  if (state.authLoading || (state.user && state.isOnboardingLoading)) return <SplashScreen message="Verificando tu espacio..." />;

  if (!state.user) {
    return (
      <div className="min-h-[100dvh] bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors font-sans antialiased">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <AuthModal isOpen={true} onClose={() => {}} isRequired={true} />
        <Toaster position="top-center" />
      </div>
    );
  }

  if (state.isOnboardingActive) {
    return <OnboardingWizard onComplete={state.handleOnboardingComplete} onRestoreBackup={state.handleRestoreBackup} />;
  }

  const { isForcedMobile, isForcedDesktop, modalControls } = state;

  const headerProps = {
    activeTab: state.activeTab, currentView: state.activeTab, onNavigate: state.handleTabChange,
    onBack: state.handleGoBackFromSubView,
    onOpenAddInvestment: () => modalControls.openAddInvestment(),
    onOpenAddDebt: () => modalControls.openAddLoan('payable'),
    onOpenAddLoan: () => modalControls.openAddLoan('receivable'),
    fromSettings: state.fromSettings, userProfile: state.userProfile, currentMonthLabel: state.currentMonthLabel,
    selectedDate: state.selectedDate, selectedMonth: state.selectedMonth, selectedYear: state.selectedYear, selectedDay: state.selectedDay,
    onOpenMonthPicker: () => state.setShowMonthPicker(true), handlePrevMonth: state.handlePrevMonth,
    handleNextMonth: state.handleNextMonth, handleResetToToday: state.handleResetToToday, trm: state.trm,
    isForcedMobile, isForcedDesktop, mobileOnlyClass: state.mobileOnlyClass, desktopOnlyClass: state.desktopOnlyClass,
    monthlyStats: state.monthlyStats, theme: state.theme, onToggleTheme: state.handleToggleTheme,
    onOpenProfile: state.handleOpenProfile, onOpenSettings: state.handleOpenProfile, onOpenAuth: state.handleOpenProfile,
    onLogout: state.handleGlobalLogout, syncStatus: state.syncStatus, isCloudEnabled: state.isCloudEnabled,
    syncUser: state.syncUser, accounts: state.accounts, investments: state.investments,
    subscriptions: state.subscriptions, recurringPayments: state.recurringPayments,
    debtsAndLoans: state.debtsAndLoans, savingsGoals: state.savingsGoals,
    onAddTransaction: state.financialOps?.handleAddTransaction || state.financeActions?.handleAddTransaction,
    onUpdateRecurring: state.handleUpdateRecurring || state.financeActions?.handleUpdateRecurring
  };

  const containerClasses = isForcedMobile
    ? 'max-w-[440px] mx-auto h-full max-h-dvh rounded-[40px] shadow-2xl border-[8px] border-slate-300 dark:border-slate-800'
    : isForcedDesktop
    ? 'max-w-none h-full rounded-none shadow-none border-0'
    : 'sm:max-w-[440px] lg:max-w-none h-full max-h-dvh sm:rounded-[40px] lg:rounded-none sm:shadow-[0_25px_70px_rgba(0,0,0,0.25)] dark:sm:shadow-[0_25px_70px_rgba(0,0,0,0.7)] lg:shadow-none sm:border-[8px] lg:border-0 sm:border-slate-300 dark:sm:border-slate-800';

  const layoutClasses = isForcedMobile
    ? 'flex-col items-center justify-start p-2 sm:p-4'
    : isForcedDesktop
    ? 'flex-row items-center justify-start p-0'
    : 'flex-col lg:flex-row items-center lg:items-center justify-start sm:justify-center lg:justify-start p-0 sm:p-4 md:p-6 lg:p-0';

  return (
    <div className="min-h-[100dvh] h-[100dvh] max-h-[100dvh] bg-[#E2E8F0] dark:bg-[#0B0E14] text-slate-800 dark:text-slate-100 flex flex-col transition-colors font-sans antialiased w-full overflow-hidden relative">
      {/* Fondo de oficina desenfocado escénico exclusivo de Modo Claro */}
      <div 
        className="fixed inset-0 bg-[url('/assets/images/green_office.jpg')] bg-cover bg-center filter blur-[5px] scale-105 opacity-90 pointer-events-none dark:hidden z-0" 
        aria-hidden="true" 
      />
      <div className="fixed inset-0 bg-white/20 pointer-events-none dark:hidden z-0" aria-hidden="true" />

      {/* Orbes para Modo Oscuro */}
      <div className="fixed -top-40 right-[-5%] w-[650px] h-[650px] rounded-full bg-gradient-to-br from-emerald-500/25 via-teal-500/20 to-transparent blur-3xl pointer-events-none hidden dark:block z-0" aria-hidden="true" />
      <div className="fixed -bottom-40 left-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-emerald-600/25 via-emerald-400/15 to-transparent blur-3xl pointer-events-none hidden dark:block z-0" aria-hidden="true" />

      <div className={`flex-1 flex ${layoutClasses} w-full overflow-hidden relative`}>
        <DesktopSidebar
          modalControls={modalControls} isActionMenuOpen={state.isActionMenuOpen} setIsActionMenuOpen={state.setIsActionMenuOpen}
          onOpenActionMenu={() => state.setIsActionMenuOpen(true)} activeTab={state.activeTab} setActiveTab={state.setActiveTab}
          onTabChange={state.handleTabChange} onOpenTransaction={() => modalControls.openAddTransaction('expense')}
          onAddExpense={() => modalControls.openAddTransaction('expense')} onAddIncome={() => modalControls.openAddTransaction('income')}
          onOpenTransfer={() => modalControls.openTransfer()} onOpenRecurring={() => modalControls.openAddRecurring()}
          onOpenLoan={() => modalControls.openAddLoan('payable')} onOpenDebt={() => modalControls.openAddLoan('payable')}
          onOpenInvestment={() => modalControls.openAddInvestment()} isSettingsOpen={state.isSettingsOpen}
          setIsSettingsOpen={state.setIsSettingsOpen} onOpenProfile={state.handleOpenProfile} userProfile={state.userProfile}
          theme={state.theme} onToggleTheme={state.handleToggleTheme} onLock={() => state.setIsLocked(true)}
          onLogout={state.handleGlobalLogout} trm={state.trm} syncStatus={state.syncStatus}
          isCloudEnabled={state.isCloudEnabled} syncUser={state.syncUser} className={state.desktopOnlyClass}
        />

        <div className={`${isForcedMobile ? 'flex' : isForcedDesktop ? 'hidden' : 'hidden sm:flex lg:hidden'} items-center justify-between w-full max-w-[440px] px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0`}>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Monety</span>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono">{isForcedMobile ? 'MÓVIL' : 'PWA'}</span>
          </div>
          <button type="button" onClick={() => state.handleFullReset()} className="hover:text-slate-900 dark:hover:text-slate-200 text-[11px] flex items-center gap-1 opacity-75 hover:opacity-100 transition-opacity cursor-pointer" title="Restablecer aplicación a cero">
            <RotateCcw className="w-3 h-3" /><span>Restablecer</span>
          </button>
        </div>

        <div className={`w-full ${containerClasses} flex flex-col overflow-hidden relative transition-colors bg-transparent dark:bg-[#090A0F] text-slate-800 dark:text-slate-100 antialiased flex-1 h-full`}>
          <AppHeader mobileOnly {...headerProps} />

          <main ref={state.mainContentRef} className={`flex-1 w-full px-3.5 sm:px-4 lg:px-0 py-2.5 sm:py-3 lg:py-0 ${isForcedMobile ? 'pb-32 pb-[calc(8rem+env(safe-area-inset-bottom,0px))]' : isForcedDesktop ? 'pb-12' : 'pb-32 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] lg:pb-12'} relative overflow-y-auto overscroll-y-contain space-y-3.5 sm:space-y-4 lg:space-y-0`}>
            <div className="w-full lg:max-w-[1550px] lg:mx-auto lg:px-6 lg:pt-3 lg:pb-6 flex flex-col gap-3">
              <AppHeader desktopOnly {...headerProps} />
              <ViewRouter
                activeTab={state.activeTab}
                tabResetKeys={state.tabResetKeys}
                financeData={state.financeData}
                financeActions={state.financeActions}
                modalControls={modalControls}
                handleGoBackFromSubView={state.handleGoBackFromSubView}
                handleTabChange={state.handleTabChange}
                fromSettings={state.fromSettings}
                accounts={state.accounts || []}
                {...modalControls}
                {...state}
              />
            </div>
          </main>

          <BottomNav
            activeTab={state.activeTab} setActiveTab={state.setActiveTab} onTabChange={state.handleTabChange}
            isActionMenuOpen={state.isActionMenuOpen} setIsActionMenuOpen={state.setIsActionMenuOpen}
            onOpenTransaction={state.handleOpenTransaction} onOpenAddTx={state.handleOpenTransaction}
            onOpenTransfer={state.handleOpenTransfer} onOpenRecurring={state.handleOpenRecurring}
            onOpenLoan={() => state.handleOpenAddLoan('receivable')} onOpenDebt={() => state.handleOpenAddDebt('payable')}
            onOpenInvestment={state.handleOpenInvestment} mobileOnlyClass={state.mobileOnlyClass}
          />

          <div className={`${isForcedMobile ? 'block' : isForcedDesktop ? 'hidden' : 'hidden sm:block lg:hidden'} absolute bottom-1 left-0 right-0 pointer-events-none z-50`}>
            <div className="w-32 h-1 bg-slate-400/40 rounded-full mx-auto" />
          </div>

          <GlobalModals modalControls={modalControls} financeData={state.financeData} financeActions={state.financeActions} onLogout={state.handleGlobalLogout} {...state} />
          {state.hasPwaUpdate && <PwaUpdateBanner onClose={() => state.setHasPwaUpdate(false)} />}
          <Toaster position="top-center" />
        </div>
      </div>
    </div>
  );
}
