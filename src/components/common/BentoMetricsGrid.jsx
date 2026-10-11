import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, ArrowDownRight, ArrowUpRight, PiggyBank } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

export default function BentoMetricsGrid({
  // Métrica Principal (Hero)
  netWorth = 0,
  totalAssets = 0,
  totalPayable = 0,
  periodLabel = "Mes en curso",
  // Métricas Secundarias
  monthlyIncome = 0,
  monthlyExpenses = 0,
  savingsRate = 0,
  formatMoney = (val) => `$${Number(val).toLocaleString('es-CO')}`,
  onHeroClick = () => {},
  onIncomeClick = () => {},
  onExpenseClick = () => {}
}) {
  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-3 mb-4">
      {/* 1. TARJETA HERO DOMINANTE (7 de 12 columnas en Desktop) */}
      <motion.div
        onClick={onHeroClick}
        whileHover={{ y: -2, transition: { duration: 0.15 } }}
        whileTap={{ scale: 0.995 }}
        className="lg:col-span-7 bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/[0.08] flex flex-col justify-between cursor-pointer select-none transition-all"
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Patrimonio Total
              </span>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-white/[0.08]">
              {periodLabel}
            </span>
          </div>

          <div className="mt-2">
            <h2 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums">
              <AnimatedCounter value={netWorth} formatter={formatMoney} />
            </h2>
          </div>
        </div>

        {/* Desglose inferior */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/[0.06] grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-500 dark:text-zinc-400 block text-[11px] font-medium uppercase tracking-wider">Activos totales</span>
            <span className="font-bold text-slate-900 dark:text-zinc-100 font-mono text-sm sm:text-base tabular-nums">
              <AnimatedCounter value={totalAssets} formatter={formatMoney} />
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-zinc-400 block text-[11px] font-medium uppercase tracking-wider">Deudas y pasivos</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-sm sm:text-base tabular-nums">
              -{formatMoney(totalPayable)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. MÉTRICAS SECUNDARIAS COMPACTAS (5 de 12 columnas en Desktop) */}
      <div className="lg:col-span-5 grid grid-rows-3 gap-2">
        {/* Fila A: Ingresos */}
        <motion.div
          onClick={onIncomeClick}
          whileHover={{ y: -1 }}
          className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between cursor-pointer transition-all"
        >
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
                Ingresos del mes
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 mt-2 tabular-nums">
              <AnimatedCounter value={monthlyIncome} formatter={formatMoney} />
            </div>
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            + Flujo
          </span>
        </motion.div>

        {/* Fila B: Gastos */}
        <motion.div
          onClick={onExpenseClick}
          whileHover={{ y: -1 }}
          className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between cursor-pointer transition-all"
        >
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/10 dark:bg-zinc-800 text-rose-600 dark:text-rose-400">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
                Gastos del mes
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 mt-2 tabular-nums">
              <AnimatedCounter value={monthlyExpenses} formatter={formatMoney} />
            </div>
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Salidas
          </span>
        </motion.div>

        {/* Fila C: Tasa de Ahorro */}
        <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between transition-all">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-500/10 dark:bg-zinc-800 text-teal-600 dark:text-teal-400">
                <PiggyBank className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
                Tasa de ahorro
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 mt-2 tabular-nums">
              {Math.max(0, Math.round(savingsRate))}%
            </div>
          </div>
          <div className="w-24 bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
            <motion.div
              className="bg-emerald-500 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
