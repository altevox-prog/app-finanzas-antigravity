import React from 'react';
import { 
  Plus, 
  Target, 
  Calendar, 
  Wallet, 
  Bell, 
  Pencil, 
  Trash2 
} from 'lucide-react';
import GoalModal from '../modals/GoalModal';

/**
 * ProfileSavingsGoalsView
 * Subvista modular para la gestión de Metas de Ahorro en el modal de Perfil.
 * Incluye:
 * - Resumen superior de Total Ahorrado vs Meta Total con botón '+' compacto
 * - GoalModal para creación y edición de metas
 * - Tarjetas individuales de metas de ahorro con barras de progreso, alertas de cuota y plazo
 * - Editor inline para realizar aportes rápidos (Abonar)
 */
export default function ProfileSavingsGoalsView({
  savingsGoals = [],
  totalSavedAcrossGoals = 0,
  totalTargetAcrossGoals = 0,
  formatMoney = (val) => val,
  accounts = [],
  now = new Date(),
  // Modal de agregar/editar meta
  showAddGoalForm = false,
  setShowAddGoalForm = () => {},
  editingGoal = null,
  setEditingGoal = () => {},
  onAddGoal = () => {},
  onUpdateGoal = () => {},
  onDeleteGoal = () => {},
  showToast = () => {},
  handleOpenEditGoal = () => {},
  // Abonos
  contributeGoalId = null,
  setContributeGoalId = () => {},
  contributeAmount = '',
  setContributeAmount = () => {},
  handleContributeToGoal = () => {}
}) {
  return (
    <div className="space-y-4">
      {/* Header con resumen de metas y botón '+' compacto */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex items-center justify-between transition-all">
        <div>
          <p className="text-xs uppercase tracking-wider font-bold font-mono text-emerald-600 dark:text-emerald-400">
            Total Ahorrado
          </p>
          <p className="text-lg sm:text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums mt-0.5">
            {formatMoney(totalSavedAcrossGoals)}
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-normal font-mono tabular-nums tracking-tight">
              {' '} / {formatMoney(totalTargetAcrossGoals)}
            </span>
          </p>
        </div>
        {/* Botón '+' para abrir GoalModal sólo si ya existen metas */}
        {savingsGoals.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditingGoal(null);
              setShowAddGoalForm(true);
            }}
            className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
            title="Nueva Meta de Ahorro"
            aria-label="Agregar meta de ahorro"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Modal Especializado para Crear o Editar Meta de Ahorro */}
      {(showAddGoalForm || !!editingGoal) && (
        <GoalModal
          isOpen={showAddGoalForm || !!editingGoal}
          disableBackHandler={true}
          onClose={() => {
            setShowAddGoalForm(false);
            setEditingGoal(null);
          }}
          onSave={(goalData) => {
            if (editingGoal) {
              onUpdateGoal(goalData);
              showToast(`Meta "${goalData.name}" actualizada.`);
            } else {
              onAddGoal(goalData);
              showToast(`Meta "${goalData.name}" creada.`);
            }
            setShowAddGoalForm(false);
            setEditingGoal(null);
          }}
          goal={editingGoal}
          accounts={accounts}
          formatMoney={formatMoney}
        />
      )}

      {/* Lista de Metas */}
      <div className="space-y-3">
        {savingsGoals.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 space-y-3 bg-slate-50/50 dark:bg-white/[0.01]">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                No tienes metas de ahorro registradas aún
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                Establece objetivos financieros con cuotas mensuales sugeridas.
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditingGoal(null);
                setShowAddGoalForm(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar meta de ahorro</span>
            </button>
          </div>
        ) : (
          savingsGoals.map((goal) => {
            const current = Number(goal.currentAmount || 0);
            const target = Number(goal.targetAmount || 1);
            const percent = Math.min(100, Math.round((current / target) * 100));

            // Days remaining
            let daysLeftText = null;
            const rawDueDate = goal.target_date || goal.dueDate || goal.deadline;
            if (rawDueDate) {
              const due = new Date(String(rawDueDate).split('T')[0] + 'T00:00:00');
              const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
              if (diffDays > 0) {
                daysLeftText = `${diffDays} días restantes`;
              } else if (diffDays === 0) {
                daysLeftText = 'Vence hoy';
              } else {
                daysLeftText = 'Plazo cumplido';
              }
            }

            const targetAcc = (accounts || []).find(a => String(a.id) === String(goal.target_account_id || goal.targetAccountId));
            const monthsCount = Math.max(1, Number(goal.months) || 1);
            const remainingGoal = Math.max(0, target - current);
            const suggestedQuota = Math.round(remainingGoal / monthsCount);
            const notifDay = goal.notification_day || goal.notificationDay;

            const barColor = percent >= 100 ? '#10B981' : percent >= 50 ? '#10B981' : percent >= 20 ? '#F59E0B' : '#0D9488';

            return (
              <div
                key={goal.id}
                className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-sm transition-all space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100 truncate">
                        {goal.name}
                      </h5>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {daysLeftText && (
                          <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{daysLeftText}</span>
                          </span>
                        )}
                        {targetAcc && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                            <Wallet className="w-3 h-3 shrink-0" />
                            <span>{targetAcc.name}</span>
                          </span>
                        )}
                        {suggestedQuota > 0 && (
                          <span className="text-xs text-teal-600 dark:text-teal-400 font-mono">
                            Cuota: {formatMoney(suggestedQuota)}/m ({monthsCount}m)
                          </span>
                        )}
                        {goal.notify_enabled !== false && notifDay && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-mono flex items-center gap-0.5">
                            <Bell className="w-2.5 h-2.5" />
                            <span>Día {notifDay}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300">
                      {percent}%
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContributeGoalId(contributeGoalId === goal.id ? null : goal.id);
                        setContributeAmount('');
                      }}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <span>Abonar</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOpenEditGoal(goal);
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
                      title="Editar meta"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`¿Eliminar la meta "${goal.name}"?`)) {
                          onDeleteGoal(goal.id);
                        }
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Eliminar meta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Modal inline de abono estandarizado en h-11 */}
                {contributeGoalId === goal.id && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-emerald-500/30 flex items-center gap-2 animate-fadeIn">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="Monto a abonar ($)"
                      value={contributeAmount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setContributeAmount(e.target.value)}
                      className="flex-1 h-11 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm font-mono tabular-nums text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleContributeToGoal(goal.id);
                      }}
                      className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-sm cursor-pointer"
                    >
                      Abonar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContributeGoalId(null);
                      }}
                      className="h-11 px-3 rounded-xl text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-xs transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Progress bar y montos */}
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-zinc-100">
                      {formatMoney(current)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono tabular-nums tracking-tight">
                      Meta: {formatMoney(target)}
                    </span>
                  </div>

                  {/* Riel y Relleno de Barra de Progreso */}
                  <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3 mb-2">
                    <div 
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.max(4, percent)}%`, backgroundColor: barColor }}
                    />
                  </div>

                  <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-zinc-400 tabular-nums">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{percent}% alcanzado</span>
                    <span>Faltan {formatMoney(Math.max(0, target - current))}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
