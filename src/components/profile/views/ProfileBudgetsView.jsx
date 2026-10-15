import React from 'react';
import AmountInput from '../../common/AmountInput';

/**
 * ProfileBudgetsView
 * Subvista independiente para la gestión de Presupuestos de Gasto en el modal de Perfil.
 * Incluye:
 * - Presupuesto Global Mensual (Visualización, barra de progreso dinámico con colores de alerta, y edición en línea).
 * - Límites por Categoría de Gasto (Listado de categorías, gasto acumulado, barra de progreso y edición en línea).
 */
export default function ProfileBudgetsView({
  budgets = { global: 0, categories: {} },
  categories = [],
  expenseByCatMap = {},
  totalMonthExpense = 0,
  formatMoney = (val) => val,
  // Estado y handlers para presupuesto global
  isEditingGlobalBudget = false,
  setIsEditingGlobalBudget = () => {},
  tempGlobalBudget = '',
  setTempGlobalBudget = () => {},
  handleSaveGlobalBudget = () => {},
  // Estado y handlers para presupuesto por categoría
  editingCatBudgetId = null,
  setEditingCatBudgetId = () => {},
  tempCatBudgetAmount = '',
  setTempCatBudgetAmount = () => {},
  handleSaveCategoryBudget = () => {}
}) {
  return (
    <div className="space-y-4">
      {/* Presupuesto Global Mensual */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-3 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
              Presupuesto Mensual Global
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
              Límite general para todo el mes
            </p>
          </div>
          {!isEditingGlobalBudget ? (
            <button
              type="button"
              onClick={() => {
                setTempGlobalBudget(budgets?.global ? budgets.global.toString() : '');
                setIsEditingGlobalBudget(true);
              }}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Modificar
            </button>
          ) : null}
        </div>

        {isEditingGlobalBudget ? (
          <div className="flex items-center gap-2 pt-1">
            <AmountInput
              value={tempGlobalBudget}
              onFocus={(e) => e.target.select()}
              onChange={(cleanVal) => setTempGlobalBudget(cleanVal)}
              placeholder="Sin límite ($0)"
              className="flex-1 h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-zinc-100 text-xs sm:text-sm font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
            />
            <button
              type="button"
              onClick={handleSaveGlobalBudget}
              className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shrink-0 cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setIsEditingGlobalBudget(false)}
              className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <span className="text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-zinc-100">
                {formatMoney(totalMonthExpense)}
              </span>
              <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono tabular-nums">
                {budgets?.global && Number(budgets.global) > 0 ? `de ${formatMoney(budgets.global)}` : 'Sin límite configurado'}
              </span>
            </div>

            {/* Progress Bar */}
            {(() => {
              const globalLimit = budgets?.global || 0;
              if (globalLimit === 0) {
                return (
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3 mb-2">
                      <div className="h-full rounded-full" style={{ width: '0%' }} />
                    </div>
                    <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-zinc-400">
                      <span>0% consumido</span>
                      <span>Sin límite global asignado</span>
                    </div>
                  </div>
                );
              }
              const percent = Math.min(100, Math.round((totalMonthExpense / globalLimit) * 100));
              const isOver = totalMonthExpense > globalLimit;
              const barColor = isOver ? '#EF4444' : percent > 80 ? '#F59E0B' : '#10B981';
              const textColorClass = isOver 
                ? 'text-rose-600 dark:text-rose-400 font-semibold' 
                : percent > 80 
                ? 'text-amber-600 dark:text-amber-400 font-semibold' 
                : 'text-emerald-600 dark:text-emerald-400 font-semibold';
              const remaining = Math.max(0, globalLimit - totalMonthExpense);

              return (
                <div className="space-y-1">
                  <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3 mb-2">
                    <div 
                      className="h-full rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${Math.max(4, percent)}%`, backgroundColor: barColor }} 
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono tabular-nums">
                    <span className={textColorClass}>{percent}% consumido</span>
                    <span className="text-slate-500 dark:text-zinc-400">
                      {isOver ? `Excedido en ${formatMoney(totalMonthExpense - globalLimit)}` : `Disponible: ${formatMoney(remaining)}`}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Presupuestos por Categoría */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider font-mono px-1">
          Límites por Categoría
        </h4>

        <div className="space-y-2">
          {categories.filter(c => c.type === 'expense').map((cat) => {
            const spent = expenseByCatMap[cat.id] || 0;
            const catLimit = budgets?.categories?.[cat.id] || 0;
            const percent = catLimit > 0 ? Math.min(100, Math.round((spent / catLimit) * 100)) : 0;
            const isOver = catLimit > 0 && spent > catLimit;
            const barColor = isOver ? '#EF4444' : percent > 80 ? '#F59E0B' : cat.color || '#10B981';
            const textColorClass = isOver 
              ? 'text-rose-600 dark:text-rose-400 font-semibold' 
              : percent > 80 
              ? 'text-amber-600 dark:text-amber-400 font-semibold' 
              : 'text-emerald-600 dark:text-emerald-400 font-semibold';

            return (
              <div 
                key={cat.id} 
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] space-y-2.5 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: cat.color || '#10B981' }} 
                    />
                    <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100 truncate">{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-zinc-100 tabular-nums">
                      {formatMoney(spent)}
                      {catLimit > 0 && (
                        <span className="text-slate-500 dark:text-zinc-400 font-normal"> / {formatMoney(catLimit)}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatBudgetId(cat.id);
                        setTempCatBudgetAmount(catLimit > 0 ? catLimit.toString() : '');
                      }}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ml-1"
                    >
                      {catLimit > 0 ? 'Editar' : 'Fijar'}
                    </button>
                  </div>
                </div>

                {/* Inline editor */}
                {editingCatBudgetId === cat.id && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-white/[0.06] animate-fadeIn">
                    <AmountInput
                      value={tempCatBudgetAmount}
                      onFocus={(e) => e.target.select()}
                      onChange={(cleanVal) => setTempCatBudgetAmount(cleanVal)}
                      placeholder="Límite para esta categoría"
                      className="flex-1 h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveCategoryBudget(cat.id)}
                      className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-sm"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCatBudgetId(null)}
                      className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {catLimit > 0 && (
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-2 mb-1.5">
                      <div 
                        className="h-full rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${Math.max(3, percent)}%`, backgroundColor: barColor }} 
                      />
                    </div>
                    <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-zinc-400 tabular-nums">
                      <span className={textColorClass}>{percent}% consumido</span>
                      <span>
                        {isOver ? `Excedido en ${formatMoney(spent - catLimit)}` : `Quedan ${formatMoney(catLimit - spent)}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
