import React, { useState } from 'react';
import { Target, PieChart, PiggyBank, CreditCard, Tag, ChevronRight, ChevronDown, Scale, FileText, ReceiptText } from 'lucide-react';

export default function ProfileFinancesTab({
  setCurrentView, formatMoney, budgets, totalMonthExpense = 0, savingsGoals = [],
  totalSavedAcrossGoals = 0, totalTargetAcrossGoals = 0, subscriptions = [],
  totalMonthlySubscriptions = 0, onNavigateToRecurring, onNavigateToNetWorth,
  onNavigate, onClose, onOpenAccounts, accountsCount = 0, categoriesCount = 0,
  accounts = [], transactions = [], onAddTransaction, onDeleteTransaction
}) {
  const [isPlanningOpen, setIsPlanningOpen] = useState(false);

  const handleNavView = (viewKey, altCallback) => {
    onClose?.();
    if (typeof onNavigate === 'function') onNavigate(viewKey);
    else if (typeof altCallback === 'function') altCallback();
    else if (typeof setCurrentView === 'function') setCurrentView(viewKey);
  };

  const renderItem = ({ icon: Icon, iconBg, iconColor, title, subtitle, onClick, hoverColor = 'group-hover:text-emerald-500', className = '' }) => (
    <button
      key={title} type="button" onClick={onClick}
      className={`w-full p-3.5 rounded-2xl border border-white/70 dark:border-white/[0.08] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hover:bg-white/70 dark:hover:bg-zinc-800/60 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group shadow-xs ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div>
          <p className={`text-[13px] font-bold text-slate-900 dark:text-white transition-colors ${hoverColor}`}>{title}</p>
          <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
    </button>
  );

  const budgetSubtitle = budgets?.global && Number(budgets.global) > 0
    ? `Límite global: ${formatMoney(budgets.global)} (${Math.round((totalMonthExpense / budgets.global) * 100)}% consumido)`
    : 'Sin límite configurado';

  const planningItems = [
    {
      icon: PieChart, iconBg: 'bg-violet-500/10 border-violet-500/20', iconColor: 'text-violet-500 dark:text-violet-400',
      title: 'Presupuesto mensual', subtitle: budgetSubtitle, onClick: () => setCurrentView('budgets'), hoverColor: 'group-hover:text-violet-500 dark:group-hover:text-violet-400'
    },
    {
      icon: PiggyBank, iconBg: 'bg-emerald-500/10 border-emerald-500/20', iconColor: 'text-emerald-600 dark:text-emerald-400',
      title: 'Metas de ahorro', subtitle: `${savingsGoals.length} metas (${formatMoney(totalSavedAcrossGoals)} de ${formatMoney(totalTargetAcrossGoals)})`,
      onClick: () => setCurrentView('savings_goals'), hoverColor: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
    },
    {
      icon: Scale, iconBg: 'bg-teal-500/10 border-teal-500/20', iconColor: 'text-teal-600 dark:text-teal-400',
      title: 'Patrimonio neto & balance', subtitle: 'Balance general, activos, pasivos y solvencia',
      onClick: () => handleNavView('net_worth', onNavigateToNetWorth), hoverColor: 'group-hover:text-teal-600 dark:group-hover:text-teal-400'
    },
    {
      icon: FileText, iconBg: 'bg-amber-500/10 border-amber-500/20', iconColor: 'text-amber-600 dark:text-amber-400',
      title: 'Impuestos y declaración de renta', subtitle: 'Topes DIAN, estimación de renta y retenciones',
      onClick: () => handleNavView('tax'), hoverColor: 'group-hover:text-amber-500'
    },
    {
      icon: ReceiptText, iconBg: 'bg-sky-500/10 border-sky-500/20', iconColor: 'text-sky-600 dark:text-sky-400',
      title: 'Cuentas por Cobrar / Facturas', subtitle: 'Historial de cobros y facturas emitidas',
      onClick: () => setCurrentView('invoice_history'), hoverColor: 'group-hover:text-sky-500',
      className: 'md:hidden'
    }
  ];

  const accountsItems = [
    {
      icon: CreditCard, iconBg: 'bg-blue-500/10 border-blue-500/20', iconColor: 'text-[#007AFF]',
      title: 'Mis cuentas', subtitle: `${accountsCount} cuentas bancarias, billeteras y efectivo`,
      onClick: () => setCurrentView('accounts'), hoverColor: 'group-hover:text-[#007AFF]'
    },
    {
      icon: Tag, iconBg: 'bg-purple-500/10 border-purple-500/20', iconColor: 'text-purple-600 dark:text-purple-400',
      title: 'Mis categorías', subtitle: `${categoriesCount} rubros de ingresos y gastos personalizados`,
      onClick: () => setCurrentView('categories'), hoverColor: 'group-hover:text-purple-600 dark:group-hover:text-purple-400'
    }
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. SECCIÓN COLAPSABLE: PLANIFICACIÓN FINANCIERA (TARJETA GLASS CAPSULAR) */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => setIsPlanningOpen(prev => !prev)}
          className="w-full p-3.5 rounded-2xl border border-white/70 dark:border-white/[0.08] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hover:bg-white/70 dark:hover:bg-zinc-800/60 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group shadow-xs select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Planificación financiera
              </span>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-white transition-transform duration-200 ${
              isPlanningOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isPlanningOpen && (
          <div className="space-y-2 pt-1 pl-0 sm:pl-2 animate-fadeIn">
            {planningItems.map(renderItem)}
          </div>
        )}
      </div>

      {/* 2. SECCIÓN: CUENTAS Y MÉTODOS (DISTRIBUCIÓN EN GRID DE 2 COLUMNAS) */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <CreditCard className="w-4 h-4 text-[#007AFF]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
            Cuentas y métodos
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {accountsItems.map(renderItem)}
        </div>
      </div>
    </div>
  );
}
