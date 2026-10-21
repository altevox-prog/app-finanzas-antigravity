import React, { useState } from 'react';
import { HandCoins, AlertCircle, Trash2, Pencil, ChevronDown, Plus } from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import SwipeableRow from '../../common/SwipeableRow';
import { usePrivacy } from '../../../context/PrivacyContext';
import { formatCurrency, formatUSD } from '../../../data/initialData';
import { calculateCDTMaturityReturn } from '../../../utils/financeMath';
import { calculateAssetMetrics } from '../utils/investmentConsolidation';
import InvestmentLotHistory from './InvestmentLotHistory';
import InvestmentFixedIncomeDetails from './InvestmentFixedIncomeDetails';

export default function InvestmentCard({
  investment, inv: invProp, metrics: metricsProp, viewCurrency = 'COP', livePrices = {}, trm = 4050,
  onEdit, onDelete, onOpenLiquidation, onOpenAddLot, onDeleteLot
}) {
  const inv = investment || invProp;
  const [isExpanded, setIsExpanded] = useState(false);
  const { isPrivacyMode, enableDecimals } = usePrivacy();
  const showDecimals = enableDecimals ?? (typeof window !== 'undefined' && localStorage.getItem('app_enable_decimals') === 'true');

  const formatInvestMoney = (amt, cur = viewCurrency) => (
    cur === 'USD' ? formatUSD(amt, isPrivacyMode, showDecimals) : formatCurrency(amt, isPrivacyMode, showDecimals)
  );

  const m = metricsProp || (inv ? calculateAssetMetrics(inv, livePrices, trm) : {});
  if (!inv) return null;

  const isPrivateLoan = inv.subType === 'private_loan' || inv.assetType === 'loan';
  const isCDT = !isPrivateLoan && (inv.assetType === 'cdt' || inv.assetType === 'fixed_income' || inv.category === 'CDT' || inv.category === 'fixed' || inv.subType === 'cdt');
  const todayStr = new Date().toISOString().split('T')[0], isMatured = isCDT && Boolean(inv.dueDate) && todayStr >= inv.dueDate;

  let cdtTermDays = 0, cdtStats = null;
  if (isCDT) {
    const invested = Number(inv.investedAmount || inv.buyPrice || inv.currentAmount || 0), rate = Number(inv.interestRate || 0);
    if (inv.startDate && inv.dueDate) cdtTermDays = Math.max(1, Math.round((new Date(inv.dueDate + 'T00:00:00') - new Date(inv.startDate + 'T00:00:00')) / 86400000));
    else if (inv.termDays) cdtTermDays = Number(inv.termDays);
    else if (inv.dueDate) cdtTermDays = Math.max(1, Math.round((new Date(inv.dueDate + 'T00:00:00') - new Date(inv.created_at || inv.createdAt || Date.now())) / 86400000));
    cdtTermDays = (!cdtTermDays || cdtTermDays <= 0) ? 180 : cdtTermDays;
    cdtStats = calculateCDTMaturityReturn(invested, rate, cdtTermDays, 0.04);
  }

  const assetTypeLabel = isPrivateLoan ? 'Préstamo' : inv.subType === 'bond' || inv.assetType === 'bond' ? 'Bono' : inv.assetType === 'crypto' || inv.category === 'crypto' ? 'Cripto' : inv.assetType === 'stock' || inv.category === 'variable' ? 'Acción' : inv.assetType === 'etf' ? 'ETF' : isCDT ? 'CDT' : 'Fondo';
  const badgeColor = isPrivateLoan || (!isCDT && m.isPositive) || (isCDT && !isMatured) ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : isMatured ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' : 'bg-rose-500/10 text-rose-500 border-rose-500/20';
  const isMarket = ['crypto', 'variable', 'stock', 'etf'].includes(inv.category) || Boolean(inv.ticker);

  return (
    <SwipeableRow onEdit={onEdit ? () => onEdit(inv) : undefined} onDelete={onDelete ? () => onDelete(inv) : undefined} className="rounded-2xl" contentClassName="rounded-2xl">
      <div className={`w-full rounded-2xl border shadow-sm transition-all overflow-hidden ${isMatured ? 'border-amber-500/40 bg-amber-500/[0.03]' : 'hover:border-emerald-500/30'}`} style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div onClick={() => setIsExpanded(p => !p)} className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center p-1 bg-slate-100 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 shrink-0">
              {isPrivateLoan ? <div className="text-emerald-500"><HandCoins className="w-6 h-6" /></div> : <BrandIcon name={m.ticker || inv.name} type={inv.assetType || inv.category} size={28} />}
            </div>
            <div className="min-w-0 flex-1 truncate">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-tight truncate">{isPrivateLoan ? (inv.borrower || inv.name) : (m.ticker || inv.name)}</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 shrink-0">{assetTypeLabel}</span>
                {isMatured && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 flex items-center gap-1 shrink-0"><AlertCircle className="w-3 h-3" /><span>Vencido</span></span>}
                {inv.institution && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 truncate max-w-[120px]">{inv.institution}</span>}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium mt-0.5">{inv.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-right">
            <div className="flex flex-col items-end justify-center">
              <span className="text-sm sm:text-base font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-zinc-100 leading-tight">
                {m.currency === 'USD' ? `${formatInvestMoney(m.currentValueUSD, 'USD')} USD` : `${formatInvestMoney(m.currentValueCOP, 'COP')} COP`}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono tracking-tight tabular-nums border ${badgeColor}`}>
                  {isPrivateLoan ? `+${Number(inv.monthlyRate || 0).toFixed(1)}% M.V.` : isCDT ? `+${Number(inv.interestRate || 0).toFixed(2)}% E.A.` : `${m.isPositive ? '+' : ''}${m.pnlPercentage ? m.pnlPercentage.toFixed(2) : '0.00'}%`}
                </span>
                {m.shares > 0 && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-mono tabular-nums hidden sm:inline">{m.shares.toLocaleString('es-CO', { maximumFractionDigits: 4 })} {m.ticker || 'uds'}</span>}
              </div>
            </div>
            {isMarket && onOpenAddLot && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onOpenAddLot(inv); }} className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors" title="Añadir compra / Lote">
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
            <div className="hidden md:flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(inv); }} className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 flex items-center justify-center cursor-pointer" title="Editar"><Pencil className="w-3 h-3" /></button>}
              {onDelete && <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(inv); }} className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer" title="Eliminar"><Trash2 className="w-3 h-3" /></button>}
            </div>
            <div className="p-1 text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-emerald-500' : ''}`} /></div>
          </div>
        </div>

        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[1000px] opacity-100 border-t border-slate-100 dark:border-white/5' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <div className="p-4 sm:p-5 pt-3.5 space-y-3.5 bg-slate-50/50 dark:bg-white/[0.01]">
            <div className="flex items-center gap-1.5 flex-wrap pt-1 pb-2 border-b border-slate-100 dark:border-white/5 text-xs text-slate-500 font-medium">
              <span className="text-[11px] opacity-75">Equivalente:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">{m.currency === 'USD' ? `≈ ${formatInvestMoney(m.currentValueCOP, 'COP')} COP` : `≈ ${formatInvestMoney(m.currentValueUSD, 'USD')} USD`}</span>
              <span className="opacity-60 text-[10px] font-mono shrink-0">(TRM: {formatInvestMoney(trm || 4050, 'COP')})</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              {[
                { title: 'CAPITAL INVERTIDO', val: m.currency === 'USD' ? `${formatInvestMoney(m.totalCostUSD, 'USD')} USD` : `${formatInvestMoney(m.totalCostCOP, 'COP')} COP`, sub: m.currency === 'USD' ? `≈ ${formatInvestMoney(m.totalCostCOP, 'COP')} COP` : `≈ ${formatInvestMoney(m.totalCostUSD, 'USD')} USD` },
                { title: 'RENDIMIENTO TOTAL', val: `${m.currency === 'USD' ? `${m.pnlUSD >= 0 ? '+' : ''}${formatInvestMoney(m.pnlUSD, 'USD')} USD` : `${m.pnlCOP >= 0 ? '+' : ''}${formatInvestMoney(m.pnlCOP, 'COP')} COP`} (${m.pnlPercentage >= 0 ? '+' : ''}${m.pnlPercentage ? m.pnlPercentage.toFixed(2) : '0.00'}%)`, sub: `≈ ${m.currency === 'USD' ? `${m.pnlCOP >= 0 ? '+' : ''}${formatInvestMoney(m.pnlCOP, 'COP')} COP` : `${m.pnlUSD >= 0 ? '+' : ''}${formatInvestMoney(m.pnlUSD, 'USD')} USD`}`, isPnl: true },
                { title: 'PRECIO ACTUAL', val: m.shares > 0 ? formatInvestMoney(m.currentPrice, m.currency) : formatInvestMoney(m.currency === 'USD' ? m.currentValueUSD : m.currentValueCOP, m.currency), sub: m.shares > 0 ? `${m.shares.toLocaleString('es-CO', { maximumFractionDigits: 4 })} ${m.ticker || 'uds'}` : '1 posición', border: true },
                { title: 'PRECIO DE COMPRA', val: m.shares > 0 ? formatInvestMoney(m.buyPrice, m.currency) : formatInvestMoney(m.currency === 'USD' ? m.totalCostUSD : m.totalCostCOP, m.currency), sub: m.shares > 0 ? 'Precio Promedio (PPP)' : 'Costo inicial', border: true }
              ].map((it, i) => (
                <div key={i} className={it.border ? "pt-2 border-t border-slate-200/60 dark:border-white/5" : ""}>
                  <span className="block text-[10px] tracking-wider text-slate-400 font-semibold uppercase">{it.title}</span>
                  <span className={`font-bold font-mono tracking-tight tabular-nums block mt-0.5 text-xs sm:text-sm ${it.isPnl ? (m.isPositive ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-900 dark:text-white'}`}>{it.val}</span>
                  <span className={`text-[10px] font-mono tracking-tight tabular-nums block mt-0.5 ${it.isPnl ? (m.isPositive ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-rose-600/80 dark:text-rose-400/80') : 'text-slate-500 dark:text-slate-400'}`}>{it.sub}</span>
                </div>
              ))}
            </div>

            <InvestmentFixedIncomeDetails inv={inv} isCDT={isCDT} isPrivateLoan={isPrivateLoan} isMatured={isMatured} cdtStats={cdtStats} cdtTermDays={cdtTermDays} formatInvestMoney={formatInvestMoney} onOpenLiquidation={onOpenLiquidation} />
            <InvestmentLotHistory asset={inv} lots={m.lots || []} currency={m.currency} onOpenAddLot={onOpenAddLot} onDeleteLot={onDeleteLot} />
          </div>
        </div>
      </div>
    </SwipeableRow>
  );
}
