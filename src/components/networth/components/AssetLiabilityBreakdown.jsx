import React from 'react';
import { 
  Wallet, 
  TrendingUp, 
  HandCoins, 
  CreditCard, 
  ChevronRight 
} from 'lucide-react';

/**
 * AssetLiabilityBreakdown
 * Desglose modular de componentes:
 * - Activos: Cuentas líquidas, Inversiones, Préstamos por cobrar
 * - Pasivos: Deudas y créditos por pagar
 */
export default function AssetLiabilityBreakdown({
  accountsBalance = 0,
  investmentsValue = 0,
  receivableLoans = 0,
  payableDebts = 0,
  totalAssets = 0,
  receivableCount = 0,
  payableCount = 0,
  formatMoney = (val) => `$${val}`,
  onNavigate = null
}) {
  const assetsSafe = Math.max(0, Number(totalAssets) || 0);

  const getPercentOfAssets = (amount) => {
    if (!assetsSafe || assetsSafe <= 0) return '0%';
    const pct = ((Number(amount) || 0) / assetsSafe) * 100;
    return `${pct.toFixed(1)}%`;
  };

  const handleNav = (tab) => {
    if (typeof onNavigate === 'function') {
      onNavigate(tab);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sección Activos */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Desglose de Activos
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            Total: {formatMoney(totalAssets)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. Saldo Líquido en Cuentas */}
          <div
            onClick={() => handleNav('accounts')}
            className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#007AFF] flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-blue-500/10 text-[#007AFF]">
                  {getPercentOfAssets(accountsBalance)}
                </span>
              </div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#007AFF] transition-colors truncate">
                Cuentas y Billeteras
              </h5>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                Liquidez y saldos disponibles
              </p>
            </div>
            <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-sm font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums">
                {formatMoney(accountsBalance)}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#007AFF] group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* 2. Portafolio de Inversiones */}
          <div
            onClick={() => handleNav('investments')}
            className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  {getPercentOfAssets(investmentsValue)}
                </span>
              </div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                Inversiones & Activos
              </h5>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                Renta variable, CDTs y cripto
              </p>
            </div>
            <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-sm font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums">
                {formatMoney(investmentsValue)}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* 3. Préstamos por Cobrar */}
          <div
            onClick={() => handleNav('debts')}
            className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <HandCoins className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {getPercentOfAssets(receivableLoans)}
                </span>
              </div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                Préstamos a Favor
              </h5>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                {receivableCount} {receivableCount === 1 ? 'préstamo por cobrar' : 'préstamos por cobrar'}
              </p>
            </div>
            <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-sm font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums">
                {formatMoney(receivableLoans)}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>
      </div>

      {/* Sección Pasivos */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Desglose de Pasivos
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            Total: {formatMoney(payableDebts)}
          </span>
        </div>

        <div
          onClick={() => handleNav('debts')}
          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm hover:border-rose-500/40 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors truncate">
                Deudas y Créditos por Pagar
              </h5>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                {payableCount} {payableCount === 1 ? 'obligación activa' : 'obligaciones activas'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
              {formatMoney(payableDebts)}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
}
