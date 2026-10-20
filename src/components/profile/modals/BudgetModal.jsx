import React, { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import AmountInput from '../../common/AmountInput';

export default function BudgetModal({
  isOpen,
  onClose,
  onSave,
  categories = [],
  initialCategory = '',
  initialAmount = '',
  isGlobal = false
}) {
  const [selectedCat, setSelectedCat] = useState('');
  const [amount, setAmount] = useState('');
  const [isGlobalBudget, setIsGlobalBudget] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedCat(initialCategory || '');
      setAmount(initialAmount ? String(initialAmount) : '');
      setIsGlobalBudget(isGlobal);
    }
  }, [isOpen, initialCategory, initialAmount, isGlobal]);

  if (!isOpen) return null;

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanAmount = String(amount).replace(/[^0-9.]/g, '');
    if (!isGlobalBudget && !selectedCat) return;

    if (onSave) {
      onSave({
        categoryId: isGlobalBudget ? null : selectedCat,
        amount: cleanAmount || '0',
        isGlobal: isGlobalBudget
      }, selectedCat, cleanAmount || '0');
    }
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 animate-fadeIn p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/[0.08] shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Target className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                {isGlobalBudget ? 'Presupuesto Global' : 'Presupuesto por Categoría'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">Define el límite de gasto mensual</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 flex items-center justify-center text-sm cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-xl gap-1">
            <button type="button" onClick={() => setIsGlobalBudget(false)}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${!isGlobalBudget ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500 dark:text-zinc-400'}`}>
              Por Categoría
            </button>
            <button type="button" onClick={() => setIsGlobalBudget(true)}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${isGlobalBudget ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500 dark:text-zinc-400'}`}>
              Global
            </button>
          </div>

          {!isGlobalBudget && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">Categoría de Gasto *</label>
              <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)} required={!isGlobalBudget}
                className="w-full h-11 px-3 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 cursor-pointer">
                <option value="">-- Elige una categoría --</option>
                {expenseCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">Límite mensual ($ COP)</label>
            <AmountInput value={amount} onFocus={(e) => e.target.select()} onChange={setAmount} placeholder="0 (Sin límite o monto)"
              prefix={<span className="text-xs opacity-50 font-mono font-bold">$</span>}
              className="w-full h-11 pl-8 pr-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 font-bold" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <button type="button" onClick={onClose} className="h-11 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer">Cancelar</button>
            <button type="submit" disabled={!isGlobalBudget && !selectedCat}
              className={`h-11 px-5 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${isGlobalBudget || selectedCat ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 cursor-pointer' : 'bg-emerald-600/50 cursor-not-allowed'}`}>
              Guardar Presupuesto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
