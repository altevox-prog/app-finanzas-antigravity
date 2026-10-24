import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const DEBT_TABS = [
  { id: 'receivable', label: 'Préstamo', icon: ArrowUpRight, activeClass: 'text-emerald-600 dark:text-emerald-400 font-bold', bgClass: 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/30' },
  { id: 'payable', label: 'Deuda', icon: ArrowDownLeft, activeClass: 'text-rose-600 dark:text-rose-400 font-bold', bgClass: 'bg-rose-500/15 dark:bg-rose-500/20 border-rose-500/30' }
];

export default function DebtTypeTabs({ type, setType }) {
  return (
    <div className="relative flex p-1 bg-slate-100 dark:bg-zinc-900/80 rounded-2xl border border-slate-200/80 dark:border-white/10 select-none">
      {DEBT_TABS.map((tab) => {
        const isActive = type === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setType(tab.id)}
            className={`relative z-10 flex-1 py-2 text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer rounded-xl ${
              isActive ? tab.activeClass : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeLoanTypeTab"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
                className={`absolute inset-0 rounded-xl border shadow-sm ${tab.bgClass}`}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
