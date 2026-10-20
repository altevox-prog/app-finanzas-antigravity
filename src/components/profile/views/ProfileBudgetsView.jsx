import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Trash2, Pencil, Plus, Target } from 'lucide-react';
import AmountInput from '../../common/AmountInput';

/**
 * CategoryBudgetItem
 * Tarjeta individual de categoría en el presupuesto con soporte de gestos de swipe en móvil/tablet:
 * - Deslizar a la derecha (> 60px): Activa modo edición
 * - Deslizar a la izquierda (< -60px): Elimina la categoría del presupuesto
 * - En escritorio: Botones visuales explícitos de Editar y Eliminar
 */
function CategoryBudgetItem({
  cat,
  spent,
  catLimit,
  percent,
  isOver,
  barColor,
  textColorClass,
  isEditing,
  tempCatBudgetAmount,
  setTempCatBudgetAmount,
  onStartEdit,
  onCancelEdit,
  onSave,
  onRemove,
  formatMoney
}) {
  const x = useMotionValue(0);
  const editOpacity = useTransform(x, [10, 60], [0, 1]);
  const editScale = useTransform(x, [10, 60], [0.85, 1]);
  const deleteOpacity = useTransform(x, [-10, -60], [0, 1]);
  const deleteScale = useTransform(x, [-10, -60], [0.85, 1]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden select-none">
      {/* Fondo Swipe a la derecha: EDITAR */}
      <div className="absolute inset-y-0 left-0 w-full flex items-center justify-start pl-4 sm:pl-5 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent dark:from-emerald-500/25 dark:via-emerald-500/15 border border-emerald-500/30 rounded-2xl z-0 pointer-events-none">
        <motion.div 
          style={{ opacity: editOpacity, scale: editScale }}
          className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-xs">
            <Pencil className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span>Editar</span>
        </motion.div>
      </div>

      {/* Fondo Swipe a la izquierda: ELIMINAR */}
      <div className="absolute inset-y-0 right-0 w-full flex items-center justify-end pr-4 sm:pr-5 bg-gradient-to-l from-rose-500/20 via-rose-500/10 to-transparent dark:from-rose-500/25 dark:via-rose-500/15 border border-rose-500/30 rounded-2xl z-0 pointer-events-none">
        <motion.div 
          style={{ opacity: deleteOpacity, scale: deleteScale }}
          className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs sm:text-sm"
        >
          <span>Eliminar</span>
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shadow-xs">
            <Trash2 className="w-4 h-4 stroke-[2.5]" />
          </div>
        </motion.div>
      </div>

      {/* Tarjeta deslizable */}
      <motion.div
        style={{ x }}
        drag={!isEditing ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.35}
        onDragEnd={(_e, { offset, velocity }) => {
          if (isEditing) return;
          if (offset.x > 60 || velocity.x > 300) {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try { navigator.vibrate(25); } catch (_) {}
            }
            onStartEdit();
          } else if (offset.x < -60 || velocity.x < -300) {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try { navigator.vibrate(35); } catch (_) {}
            }
            onRemove();
          }
        }}
        className="w-full relative z-10 p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/[0.08] space-y-2.5 shadow-sm transition-colors touch-pan-y"
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
              <span className="text-slate-500 dark:text-zinc-400 font-normal"> / {formatMoney(catLimit)}</span>
            </span>

            {/* Acciones para escritorio (visibles con puntero) */}
            <button
              type="button"
              onClick={onStartEdit}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ml-1"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
              title="Eliminar límite de categoría"
              aria-label={`Eliminar límite de ${cat.name}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inline editor */}
        {isEditing && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-white/[0.06] animate-fadeIn">
            <AmountInput
              value={tempCatBudgetAmount}
              onFocus={(e) => e.target.select()}
              onChange={(cleanVal) => setTempCatBudgetAmount(cleanVal)}
              placeholder="Límite (ej. 0 o monto)"
              className="flex-1 h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
            />
            <button
              type="button"
              onClick={onSave}
              className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="h-11 px-3 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Eliminar límite"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Barra de progreso */}
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
              {isOver 
                ? `Excedido en ${formatMoney(spent - catLimit)}` 
                : (catLimit === 0 ? (spent === 0 ? 'Sin gastos' : `Excedido en ${formatMoney(spent)}`) : `Quedan ${formatMoney(catLimit - spent)}`)}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * ProfileBudgetsView
 * Subvista independiente para la gestión de Presupuestos de Gasto en el modal de Perfil.
 * Incluye:
 * - Presupuesto Global Mensual (Visualización, barra de progreso dinámico con colores de alerta, y edición en línea).
 * - Límites por Categoría Exclusivos (Listado filtrado únicamente con categorías presupuestadas, swipe en móvil/tablet y selector de incorporación).
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
  handleSaveCategoryBudget = () => {},
  handleRemoveCategoryBudget = () => {}
}) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [selectedCatToAdd, setSelectedCatToAdd] = useState('');
  const [addCatAmount, setAddCatAmount] = useState('');

  // 1. Filtrar ÚNICAMENTE las categorías que tienen presupuesto configurado activamente
  const activeBudgetCategories = categories
    .filter(c => c.type === 'expense')
    .filter(cat => {
      const rawCatLimit = budgets?.categories?.[cat.id];
      return rawCatLimit !== undefined && rawCatLimit !== null && rawCatLimit !== '';
    });

  // 2. Categorías de gasto disponibles que aún no han sido agregadas al presupuesto
  const availableCategories = categories
    .filter(c => c.type === 'expense')
    .filter(cat => {
      const rawCatLimit = budgets?.categories?.[cat.id];
      return rawCatLimit === undefined || rawCatLimit === null || rawCatLimit === '';
    });

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
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
            Límites por Categoría
          </h4>
          
          {/* Botón circular verde minimalista */}
          <button
            type="button"
            onClick={() => setIsAddingCategory((prev) => !prev)}
            title="Añadir categoría al presupuesto"
            className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]"/>
          </button>
        </div>

        {/* Selector interactivo para añadir categoría */}
        {isAddingCategory && (
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-500/30 shadow-md space-y-3 animate-fadeIn">
            {availableCategories.length === 0 ? (
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-mono py-1">
                <span>Todas tus categorías de gasto ya están en el presupuesto.</span>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ml-2"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                    <span>Seleccionar categoría para presupuestar</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setSelectedCatToAdd('');
                      setAddCatAmount('');
                    }}
                    className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 flex items-center justify-center text-xs transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      Categoría *
                    </label>
                    <select
                      value={selectedCatToAdd}
                      onChange={(e) => setSelectedCatToAdd(e.target.value)}
                      className="w-full h-11 px-3 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 cursor-pointer"
                    >
                      <option value="">-- Elige una categoría --</option>
                      {availableCategories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      Límite mensual ($ COP)
                    </label>
                    <AmountInput
                      value={addCatAmount}
                      onFocus={(e) => e.target.select()}
                      onChange={(val) => setAddCatAmount(val)}
                      placeholder="0 (o ingresa un monto)"
                      prefix={<span className="text-xs opacity-50 font-mono font-bold">$</span>}
                      className="w-full h-11 pl-8 pr-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setSelectedCatToAdd('');
                      setAddCatAmount('');
                    }}
                    className="h-10 px-3.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!selectedCatToAdd}
                    onClick={() => {
                      if (!selectedCatToAdd) return;
                      handleSaveCategoryBudget(selectedCatToAdd, addCatAmount || '0');
                      setIsAddingCategory(false);
                      setSelectedCatToAdd('');
                      setAddCatAmount('');
                    }}
                    className={`h-10 px-4 rounded-xl text-xs font-bold text-white shadow-xs transition-all ${
                      selectedCatToAdd 
                        ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 cursor-pointer' 
                        : 'bg-emerald-600/50 cursor-not-allowed'
                    }`}
                  >
                    Añadir al presupuesto
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Guía sutil para interacción touch */}
        {activeBudgetCategories.length > 0 && (
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono text-center sm:hidden pt-0.5">
            💡 Desliza a la derecha para editar • Desliza a la izquierda para eliminar
          </p>
        )}

        {/* Lista de Categorías Presupuestadas */}
        <div className="space-y-2">
          {activeBudgetCategories.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 space-y-2 bg-slate-50/50 dark:bg-white/[0.01]">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Target className="w-4 h-4 stroke-[2]" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                No tienes categorías añadidas al presupuesto
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                Agrega una con el botón (+) arriba para monitorearla y definir su límite mensual.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {activeBudgetCategories.map((cat) => {
                const spent = expenseByCatMap[cat.id] || 0;
                const rawCatLimit = budgets?.categories?.[cat.id];
                const catLimit = Number(rawCatLimit || 0);
                const percent = catLimit > 0
                  ? Math.min(100, Math.round((spent / catLimit) * 100))
                  : (spent > 0 ? 100 : 0);
                const isOver = (catLimit === 0 && spent > 0) || (catLimit > 0 && spent > catLimit);
                const barColor = isOver ? '#EF4444' : percent > 80 ? '#F59E0B' : cat.color || '#10B981';
                const textColorClass = isOver 
                  ? 'text-rose-600 dark:text-rose-400 font-semibold' 
                  : percent > 80 
                  ? 'text-amber-600 dark:text-amber-400 font-semibold' 
                  : 'text-emerald-600 dark:text-emerald-400 font-semibold';

                return (
                  <motion.div
                    key={cat.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CategoryBudgetItem
                      cat={cat}
                      spent={spent}
                      catLimit={catLimit}
                      percent={percent}
                      isOver={isOver}
                      barColor={barColor}
                      textColorClass={textColorClass}
                      isEditing={editingCatBudgetId === cat.id}
                      tempCatBudgetAmount={tempCatBudgetAmount}
                      setTempCatBudgetAmount={setTempCatBudgetAmount}
                      onStartEdit={() => {
                        setEditingCatBudgetId(cat.id);
                        setTempCatBudgetAmount(String(catLimit));
                      }}
                      onCancelEdit={() => setEditingCatBudgetId(null)}
                      onSave={() => handleSaveCategoryBudget(cat.id)}
                      onRemove={() => handleRemoveCategoryBudget(cat.id)}
                      formatMoney={formatMoney}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
