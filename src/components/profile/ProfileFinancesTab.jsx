import React from 'react';
import { Target, PieChart, PiggyBank, CreditCard, Tag, ChevronRight, Scale, FileText } from 'lucide-react';

/**
 * ProfileFinancesTab: Pestaña "Gestión & Finanzas" del Centro de Control / Perfil.
 */
export default function ProfileFinancesTab({
  setCurrentView,
  formatMoney,
  budgets,
  totalMonthExpense = 0,
  savingsGoals = [],
  totalSavedAcrossGoals = 0,
  totalTargetAcrossGoals = 0,
  subscriptions = [],
  totalMonthlySubscriptions = 0,
  onNavigateToRecurring,
  onNavigateToNetWorth,
  onNavigate,
  onClose,
  onOpenAccounts,
  accountsCount = 0,
  categoriesCount = 0
}) {
  const handleNavView = (viewKey, altCallback) => {
    onClose?.();
    if (typeof onNavigate === 'function') onNavigate(viewKey);
    else if (typeof altCallback === 'function') altCallback();
    else if (typeof setCurrentView === 'function') setCurrentView(viewKey);
  };

  const renderItem = ({ icon: Icon, iconBg, iconColor, title, subtitle, onClick, hoverColor = 'group-hover:text-emerald-500' }) => (
    <button
      key={title}
      type="button"
      onClick={onClick}
      className="w-full p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div>
          <p className={`text-[13px] font-semibold text-slate-800 dark:text-zinc-100 transition-colors ${hoverColor}`}>
            {title}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>
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
      icon: PieChart,
      iconBg: 'bg-violet-500/10 border-violet-500/20',
      iconColor: 'text-violet-500 dark:text-violet-400',
      title: 'Presupuesto mensual',
      subtitle: budgetSubtitle,
      onClick: () => setCurrentView('budgets'),
      hoverColor: 'group-hover:text-violet-500 dark:group-hover:text-violet-400'
    },
    {
      icon: PiggyBank,
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      title: 'Metas de ahorro',
      subtitle: `${savingsGoals.length} metas (${formatMoney(totalSavedAcrossGoals)} de ${formatMoney(totalTargetAcrossGoals)})`,
      onClick: () => setCurrentView('savings_goals'),
      hoverColor: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
    },
    {
      icon: Scale,
      iconBg: 'bg-teal-500/10 border-teal-500/20',
      iconColor: 'text-teal-600 dark:text-teal-400',
      title: 'Patrimonio neto & balance',
      subtitle: 'Balance general, activos, pasivos y solvencia',
      onClick: () => handleNavView('net_worth', onNavigateToNetWorth),
      hoverColor: 'group-hover:text-teal-600 dark:group-hover:text-teal-400'
    },
    {
      icon: FileText,
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      title: 'Impuestos y declaración de renta',
      subtitle: 'Topes DIAN, estimación de renta y retenciones',
      onClick: () => handleNavView('tax'),
      hoverColor: 'group-hover:text-amber-500'
    }
  ];

  const accountsItems = [
    {
      icon: CreditCard,
      iconBg: 'bg-blue-500/10 border-blue-500/20',
      iconColor: 'text-[#007AFF]',
      title: 'Mis cuentas',
      subtitle: `${accountsCount} cuentas bancarias, billeteras y efectivo`,
      onClick: () => setCurrentView('accounts'),
      hoverColor: 'group-hover:text-[#007AFF]'
    },
    {
      icon: Tag,
      iconBg: 'bg-purple-500/10 border-purple-500/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      title: 'Mis categorías',
      subtitle: `${categoriesCount} rubros de ingresos y gastos personalizados`,
      onClick: () => setCurrentView('categories'),
      hoverColor: 'group-hover:text-purple-600 dark:group-hover:text-purple-400'
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Bloque Planificación */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <Target className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Planificación financiera
          </h3>
        </div>
        <div className="space-y-2">{planningItems.map(renderItem)}</div>
      </div>

      {/* 2. Bloque Cuentas y Métodos */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <CreditCard className="w-4 h-4 text-[#007AFF]" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Cuentas y métodos
          </h3>
        </div>
        <div className="space-y-2">{accountsItems.map(renderItem)}</div>
      </div>
    </div>
  );
}
