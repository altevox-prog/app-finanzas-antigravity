import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight } from 'lucide-react';

export default function TransactionTypeSelector({ type, setType }) {
  const tabs = [
    { 
      id: 'expense', 
      label: 'Gasto', 
      icon: ArrowDownRight, 
      activeBg: 'bg-rose-500/20 border-rose-500/30', 
      activeText: 'text-rose-600 dark:text-rose-400 font-extrabold' 
    },
    { 
      id: 'income', 
      label: 'Ingreso', 
      icon: ArrowUpRight, 
      activeBg: 'bg-emerald-500/20 border-emerald-500/30', 
      activeText: 'text-emerald-600 dark:text-emerald-400 font-extrabold' 
    },
    { 
      id: 'transfer', 
      label: 'Transferencia', 
      icon: ArrowLeftRight, 
      activeBg: 'bg-blue-500/20 border-blue-500/30', 
      activeText: 'text-blue-600 dark:text-blue-400 font-extrabold' 
    }
  ];

  return (
    <div className="relative flex p-1 bg-slate-100 dark:bg-zinc-900/80 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
      {tabs.map((tab) => {
        const isActive = type === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setType(tab.id)}
            className={`relative flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors duration-150 z-10 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              isActive 
                ? tab.activeText 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTransactionTypeTab"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
                className={`absolute inset-0 rounded-xl shadow-sm border -z-10 ${tab.activeBg}`}
              />
            )}
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
