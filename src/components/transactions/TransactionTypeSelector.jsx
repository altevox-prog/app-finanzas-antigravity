import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function TransactionTypeSelector({ type, setType }) {
  return (
    <div className="relative flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/50">
      {['expense', 'income'].map((tabType) => {
        const isActive = type === tabType;
        const label = tabType === 'expense' ? 'Gasto' : 'Ingreso';
        const Icon = tabType === 'expense' ? ArrowDownRight : ArrowUpRight;
        const activeColor = tabType === 'expense' 
          ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30' 
          : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';

        return (
          <button
            key={tabType}
            type="button"
            onClick={() => setType(tabType)}
            className={`relative flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors duration-150 z-10 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              isActive 
                ? (tabType === 'expense' ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-emerald-600 dark:text-emerald-400 font-extrabold') 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTransactionTypeTab"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
                className={`absolute inset-0 rounded-xl shadow-sm -z-10 ${activeColor}`}
              />
            )}
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
