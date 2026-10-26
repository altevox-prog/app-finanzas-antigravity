import React from 'react';
import { Wallet, TrendingUp, HandCoins, CreditCard, ChevronRight } from 'lucide-react';

const ASSET_CARDS = [
  {
    key: 'accounts', tab: 'accounts', title: 'Cuentas y Billeteras', subtitle: 'Liquidez y saldos disponibles',
    icon: Wallet, iconBg: 'bg-blue-500/10', iconColor: 'text-[#007AFF]', hoverTitle: 'group-hover:text-[#007AFF]',
    getAmount: (p) => p.accountsBalance
  },
  {
    key: 'investments', tab: 'investments', title: 'Inversiones & Activos', subtitle: 'Renta variable, CDTs y cripto',
    icon: TrendingUp, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600 dark:text-purple-400', hoverTitle: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
    getAmount: (p) => p.investmentsValue
  },
  {
    key: 'loans', tab: 'loans', title: 'Préstamos a Favor', subtitle: (p) => `${p.receivableCount} ${p.receivableCount === 1 ? 'préstamo por cobrar' : 'préstamos por cobrar'}`,
    icon: HandCoins, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400', hoverTitle: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
    getAmount: (p) => p.receivableLoans
  }
];

export default function AssetLiabilityBreakdown(props) {
  const {
    accountsBalance = 0, investmentsValue = 0, receivableLoans = 0, payableDebts = 0,
    totalAssets = 0, receivableCount = 0, payableCount = 0, formatMoney = (val) => `$${val}`, onNavigate
  } = props;

  const assetsSafe = Math.max(0, Number(totalAssets) || 0);
  const getPercentOfAssets = (amount) => (!assetsSafe ? '0%' : `${(((Number(amount) || 0) / assetsSafe) * 100).toFixed(1)}%`);
  const handleNav = (tab) => { if (typeof onNavigate === 'function') onNavigate(tab, 'net_worth'); };

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">Desglose de Activos</h4></div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Total: {formatMoney(totalAssets)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {ASSET_CARDS.map(({ key, tab, title, subtitle, icon: Icon, iconBg, iconColor, hoverTitle, getAmount }) => {
            const amount = getAmount(props);
            const sub = typeof subtitle === 'function' ? subtitle(props) : subtitle;
            return (
              <div
                key={key} onClick={() => handleNav(tab)}
                className="p-3.5 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-white/70 dark:border-white/[0.08] shadow-xs hover:bg-white/70 dark:hover:bg-zinc-800/60 hover:border-emerald-500/40 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}><Icon className="w-4 h-4" /></div>
                    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md ${iconBg} ${iconColor}`}>{getPercentOfAssets(amount)}</span>
                  </div>
                  <h5 className={`text-xs font-bold text-slate-900 dark:text-white ${hoverTitle} transition-colors truncate`}>{title}</h5>
                  <p className="text-[10px] text-slate-600 dark:text-zinc-400 font-medium mt-0.5">{sub}</p>
                </div>
                <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-sm font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums">{formatMoney(amount)}</span>
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-400 ${hoverTitle} group-hover:translate-x-0.5 transition-all`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /><h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">Desglose de Pasivos</h4></div>
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Total: {formatMoney(payableDebts)}</span>
        </div>

        <div
          onClick={() => handleNav('debts')}
          className="p-3.5 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-white/70 dark:border-white/[0.08] shadow-xs hover:bg-white/70 dark:hover:bg-zinc-800/60 hover:border-rose-500/40 transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0"><CreditCard className="w-4.5 h-4.5" /></div>
            <div className="min-w-0">
              <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors truncate">Deudas y Créditos por Pagar</h5>
              <p className="text-[10px] text-slate-600 dark:text-zinc-400 font-medium truncate">{payableCount} {payableCount === 1 ? 'obligación activa' : 'obligaciones activas'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">{formatMoney(payableDebts)}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
}
