import React from 'react';
import { 
  Target, 
  PieChart, 
  PiggyBank, 
  CreditCard, 
  Tag, 
  ChevronRight,
  Scale,
  FileText 
} from 'lucide-react';

/**
 * ProfileFinancesTab
 * Subcomponente independiente para la pestaña "Gestión & Finanzas" del Centro de Control / Perfil.
 * Incluye los bloques de Planificación Financiera (Presupuesto mensual, Metas de Ahorro, Patrimonio Neto)
 * y Cuentas y Métodos (Mis Cuentas, Mis Categorías).
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
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Bloque Planificación: Presupuestos de Gasto y Metas de Ahorro */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <Target className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Planificación financiera
          </h3>
        </div>

        <div className="space-y-2">
          {/* Presupuesto mensual */}
          <button
            type="button"
            onClick={() => setCurrentView('budgets')}
            className="w-full p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 dark:text-violet-400 shrink-0">
                <PieChart className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors">
                  Presupuesto mensual
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {budgets?.global && Number(budgets.global) > 0
                    ? `Límite global: ${formatMoney(budgets.global)} (${Math.round((totalMonthExpense / budgets.global) * 100)}% consumido)`
                    : 'Sin límite configurado'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
          </button>

          {/* Metas de ahorro */}
          <button
            type="button"
            onClick={() => setCurrentView('savings_goals')}
            className="w-full p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <PiggyBank className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Metas de ahorro
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {savingsGoals.length} metas ({formatMoney(totalSavedAcrossGoals)} de {formatMoney(totalTargetAcrossGoals)})
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
          </button>

          {/* Patrimonio neto & balance */}
          <button
            type="button"
            onClick={() => {
              onClose?.();
              if (typeof onNavigate === 'function') {
                onNavigate('net_worth');
              } else if (typeof onNavigateToNetWorth === 'function') {
                onNavigateToNetWorth();
              } else if (typeof setCurrentView === 'function') {
                setCurrentView('net_worth');
              }
            }}
            className="w-full p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                <Scale className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  Patrimonio neto & balance
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Balance general, activos, pasivos y solvencia
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
          </button>

          {/* Impuestos y declaración de renta */}
          <button
            type="button"
            onClick={() => {
              onClose?.();
              if (typeof onNavigate === 'function') {
                onNavigate('tax');
              } else if (typeof setCurrentView === 'function') {
                setCurrentView('tax');
              }
            }}
            className="w-full p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Impuestos y declaración de renta
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Topes DIAN, estimación de renta y retenciones
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
          </button>
        </div>
      </div>

      {/* 2. Bloque Cuentas: Mis Cuentas y Mis Categorías */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <CreditCard className="w-4 h-4 text-[#007AFF]" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Cuentas y métodos
          </h3>
        </div>

        <div className="space-y-2">
          {/* Mis Cuentas */}
          <button
            type="button"
            onClick={() => setCurrentView('accounts')}
            className="w-full p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#007AFF] shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100 group-hover:text-[#007AFF] transition-colors">
                  Mis cuentas
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {accountsCount} cuentas bancarias, billeteras y efectivo
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#007AFF] transition-colors" />
          </button>

          {/* Mis Categorías */}
          <button
            type="button"
            onClick={() => setCurrentView('categories')}
            className="w-full p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Mis categorías
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {categoriesCount} rubros de ingresos y gastos personalizados
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
