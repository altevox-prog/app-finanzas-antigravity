import React, { useState } from 'react';
import { 
  HandCoins, 
  AlertCircle, 
  Trash2, 
  Pencil,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import BrandIcon from '../../ui/BrandIcon';
import SwipeableRow from '../../common/SwipeableRow';
import { usePrivacy } from '../../../context/PrivacyContext';
import { formatCurrency, formatUSD } from '../../../data/initialData';
import { 
  toSafeNumber, 
  convertUSDtoCOP, 
  convertCOPtoUSD,
  calculateCDTMaturityReturn, 
  calculateMonthlyLoanReturn 
} from '../../../utils/financeMath';

/**
 * InvestmentCard
 * Componente que renderiza la tarjeta individual para una posición de inversión,
 * incluyendo activos de renta variable, cripto, fondos, préstamos privados y CDTs.
 * Inicia colapsada por defecto con cabecera compacta e interactiva tipo acordeón.
 */
export default function InvestmentCard({
  investment,
  inv: invProp,
  metrics: metricsProp,
  viewCurrency = 'COP',
  livePrices = {},
  trm = 4050,
  onEdit,
  onDelete,
  onQuickUpdate,
  onOpenLiquidation,
}) {
  const inv = investment || invProp;
  const [isExpanded, setIsExpanded] = useState(false);
  const { isPrivacyMode, enableDecimals } = usePrivacy();
  const showDecimals = enableDecimals ?? (typeof window !== 'undefined' && localStorage.getItem('app_enable_decimals') === 'true');

  const formatInvestMoney = (amount, currency = viewCurrency) => {
    if (currency === 'USD') {
      return formatUSD(amount, isPrivacyMode, showDecimals);
    }
    return formatCurrency(amount, isPrivacyMode, showDecimals);
  };

  // Fallback para calcular métricas de la posición si no vienen provistas
  const m = metricsProp || (() => {
    if (!inv) return {};
    const ticker = (inv.ticker || inv.symbol || (inv.name && inv.name.length <= 6 ? inv.name : '')).toUpperCase().trim();
    const livePrice = livePrices[ticker];
    
    const rawInvested = toSafeNumber(inv.investedAmount ?? inv.invested_amount ?? inv.amount ?? inv.totalInvested);
    const rawCurrent = toSafeNumber(inv.currentAmount ?? inv.currentValue ?? inv.current_value);

    const hasShares = Boolean(inv.shares && Number(inv.shares) > 0);
    const shares = hasShares ? toSafeNumber(inv.shares) : 0;

    let buyPrice = toSafeNumber(inv.buyPrice || inv.purchasePrice);
    if (buyPrice === 0 && shares > 0 && rawInvested > 0) {
      buyPrice = rawInvested / shares;
    }

    let currentPrice = toSafeNumber(livePrice || inv.currentPrice || inv.unitPrice);
    if (currentPrice === 0 && shares > 0 && rawCurrent > 0) {
      currentPrice = rawCurrent / shares;
    } else if (currentPrice === 0 && buyPrice > 0) {
      currentPrice = buyPrice;
    }

    const currency = inv.currency || 'USD';
    const trmValue = toSafeNumber(trm) || 4050;

    const totalCostOrigin = rawInvested > 0 
      ? rawInvested 
      : (shares > 0 && buyPrice > 0 ? (shares * buyPrice) : 0);

    let currentValueOrigin = rawCurrent > 0 ? rawCurrent : totalCostOrigin;
    if (livePrice && shares > 0) {
      currentValueOrigin = shares * livePrice;
    } else if (rawCurrent === 0 && shares > 0 && currentPrice > 0) {
      currentValueOrigin = shares * currentPrice;
    }

    const totalCostUSD = currency === 'USD' ? totalCostOrigin : convertCOPtoUSD(totalCostOrigin, trmValue);
    const currentValueUSD = currency === 'USD' ? currentValueOrigin : convertCOPtoUSD(currentValueOrigin, trmValue);
    const pnlUSD = currentValueUSD - totalCostUSD;

    const totalCostCOP = currency === 'COP' ? totalCostOrigin : convertUSDtoCOP(totalCostOrigin, trmValue);
    const currentValueCOP = currency === 'COP' ? currentValueOrigin : convertUSDtoCOP(currentValueOrigin, trmValue);
    const pnlCOP = currentValueCOP - totalCostCOP;

    const pnlPercentage = totalCostOrigin > 0 ? ((currentValueOrigin - totalCostOrigin) / totalCostOrigin) * 100 : 0;
    const isPositive = pnlPercentage >= 0;

    return {
      ticker,
      shares,
      buyPrice,
      currentPrice,
      currency,
      totalCostOrigin,
      currentValueOrigin,
      totalCostUSD,
      currentValueUSD,
      pnlUSD,
      totalCostCOP,
      currentValueCOP,
      pnlCOP,
      pnlPercentage,
      isPositive
    };
  })();

  if (!inv) return null;

  const isPrivateLoan = inv.subType === 'private_loan' || inv.assetType === 'loan';
  const isCDT = !isPrivateLoan && (
    inv.assetType === 'cdt' || 
    inv.assetType === 'fixed_income' || 
    inv.category === 'CDT' || 
    inv.category === 'fixed' || 
    inv.subType === 'cdt'
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const isMatured = isCDT && Boolean(inv.dueDate) && todayStr >= inv.dueDate;

  let cdtTermDays = 0;
  let cdtStats = null;
  if (isCDT) {
    const invested = Number(inv.investedAmount || inv.buyPrice || inv.currentAmount || 0);
    const rate = Number(inv.interestRate || 0);
    
    if (inv.startDate && inv.dueDate) {
      const start = new Date(inv.startDate + 'T00:00:00');
      const due = new Date(inv.dueDate + 'T00:00:00');
      cdtTermDays = Math.max(1, Math.round((due - start) / (1000 * 60 * 60 * 24)));
    } else if (inv.termDays) {
      cdtTermDays = Number(inv.termDays);
    } else if (inv.dueDate) {
      const createdRaw = inv.created_at || inv.createdAt;
      const start = createdRaw ? new Date(createdRaw) : new Date();
      const due = new Date(inv.dueDate + 'T00:00:00');
      cdtTermDays = Math.max(1, Math.round((due - start) / (1000 * 60 * 60 * 24)));
    }
    if (!cdtTermDays || cdtTermDays <= 0) cdtTermDays = 180;

    cdtStats = calculateCDTMaturityReturn(invested, rate, cdtTermDays, 0.04);
  }

  const assetTypeLabel = 
    isPrivateLoan ? 'Préstamo a Tercero' :
    inv.subType === 'bond' || inv.assetType === 'bond' ? 'Bono' :
    inv.assetType === 'crypto' || inv.category === 'crypto' ? 'Cripto' :
    inv.assetType === 'stock' || inv.category === 'variable' ? 'Acción US' :
    inv.assetType === 'etf' ? 'ETF' :
    isCDT ? 'CDT' :
    inv.assetType === 'fund' || inv.category === 'liquidity' ? 'Fondo' : 'Inversión';

  return (
    <SwipeableRow
      onEdit={onEdit ? () => onEdit(inv) : undefined}
      onDelete={onDelete ? () => onDelete(inv) : undefined}
      className="rounded-2xl"
      contentClassName="rounded-2xl"
    >
      <div
        key={inv.id}
        className={`w-full rounded-2xl border shadow-sm transition-all overflow-hidden ${
          isMatured 
            ? 'border-amber-500/40 bg-amber-500/[0.03] dark:bg-amber-500/[0.04]' 
            : 'hover:border-emerald-500/30'
        }`}
        style={{ 
          backgroundColor: isMatured ? undefined : 'var(--bg-card)', 
          borderColor: isMatured ? undefined : 'var(--border-color)' 
        }}
      >
        {/* 1. CABECERA INTERACTIVA (VISTA COLAPSADA: ~72px a 80px, SIMÉTRICA Y UNIFORME) */}
        <div 
          onClick={() => setIsExpanded(prev => !prev)}
          className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.02]"
        >
          {/* Lado Izquierdo: Icono/logo, Símbolo/Nombre en negrita y micro-badge de entidad/categoría */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center p-1 bg-slate-100 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 shrink-0">
              {isPrivateLoan ? (
                <div className="w-full h-full flex items-center justify-center text-emerald-500">
                  <HandCoins className="w-6 h-6" />
                </div>
              ) : (
                <BrandIcon name={m.ticker || inv.name} type={inv.assetType || inv.category} size={28} />
              )}
            </div>

            <div className="min-w-0 flex-1 truncate">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-tight truncate">
                  {isPrivateLoan ? (inv.borrower || inv.name) : (m.ticker || inv.name)}
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 shrink-0">
                  {assetTypeLabel}
                </span>
                {isMatured && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0">
                    <AlertCircle className="w-3 h-3" />
                    <span>Vencido</span>
                  </span>
                )}
                {inv.institution && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 truncate max-w-[120px]">
                    {inv.institution}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium mt-0.5">
                {inv.name}
              </p>
            </div>
          </div>

          {/* Lado Derecho: Valor actual en grande, badge de rendimiento porcentual y chevron animado */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-right">
            <div className="flex flex-col items-end justify-center">
              <span className="text-sm sm:text-base font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-zinc-100 leading-tight">
                {m.currency === 'USD' 
                  ? `${formatInvestMoney(m.currentValueUSD, 'USD')} USD`
                  : `${formatInvestMoney(m.currentValueCOP, 'COP')} COP`
                }
              </span>
              
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono tracking-tight tabular-nums border ${
                  isPrivateLoan
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : isCDT
                      ? isMatured 
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : m.isPositive 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                }`}>
                  {isPrivateLoan 
                    ? `+${Number(inv.monthlyRate || 0).toFixed(1)}% M.V.`
                    : isCDT
                      ? `+${Number(inv.interestRate || 0).toFixed(2)}% E.A.`
                      : `${m.isPositive ? '+' : ''}${m.pnlPercentage ? m.pnlPercentage.toFixed(2) : '0.00'}%`
                  }
                </span>

                {m.shares > 0 && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-mono tabular-nums hidden sm:inline">
                    {m.shares.toLocaleString('es-CO', { maximumFractionDigits: 4 })} {m.ticker || 'uds'}
                  </span>
                )}
              </div>
            </div>

            {/* Microbotones en Hover para escritorio (SIN tapar valores) */}
            <div className="hidden md:flex items-center justify-end w-14 shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(inv);
                  }}
                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="Editar"
                  aria-label="Editar"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(inv);
                  }}
                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="Eliminar"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Chevron animado rotatorio 180° */}
            <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180 text-emerald-500' : 'rotate-0'}`} />
            </div>
          </div>
        </div>

        {/* 2. VISTA EXPANDIDA (DESPLEGABLE CON ANIMACIÓN FLUIDA) */}
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[800px] opacity-100 border-t border-slate-100 dark:border-white/5' : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="p-4 sm:p-5 pt-3.5 space-y-3.5 bg-slate-50/50 dark:bg-white/[0.01]">
            {/* Fila de conversión monetaria y TRM limpia */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2.5 pb-2 border-b border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="text-[11px] opacity-75">Equivalente:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                {m.currency === 'USD' 
                  ? `≈ ${formatInvestMoney(m.currentValueCOP, 'COP')} COP` 
                  : `≈ ${formatInvestMoney(m.currentValueUSD, 'USD')} USD`
                }
              </span>
              <span className="opacity-60 text-[10px] font-mono shrink-0">(TRM: {formatInvestMoney(trm || 4050, 'COP')})</span>
            </div>

            {/* Matriz de métricas en Cuadrícula 2x2 */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              {/* Cuadrante 1 (Superior Izquierdo): CAPITAL INVERTIDO */}
              <div>
                <span className="block text-[10px] tracking-wider text-slate-400 font-semibold uppercase">
                  CAPITAL INVERTIDO
                </span>
                <span className="font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums block mt-0.5 text-xs sm:text-sm">
                  {m.currency === 'USD' 
                    ? `${formatInvestMoney(m.totalCostUSD, 'USD')} USD`
                    : `${formatInvestMoney(m.totalCostCOP, 'COP')} COP`
                  }
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-tight tabular-nums block mt-0.5">
                  {m.currency === 'USD' 
                    ? `≈ ${formatInvestMoney(m.totalCostCOP, 'COP')} COP` 
                    : `≈ ${formatInvestMoney(m.totalCostUSD, 'USD')} USD`
                  }
                </span>
              </div>

              {/* Cuadrante 2 (Superior Derecho): RENDIMIENTO TOTAL */}
              <div>
                <span className="block text-[10px] tracking-wider text-slate-400 font-semibold uppercase">
                  RENDIMIENTO TOTAL
                </span>
                <span className={`font-bold font-mono tracking-tight tabular-nums block mt-0.5 text-xs sm:text-sm ${
                  m.isPositive ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {m.currency === 'USD'
                    ? `${m.pnlUSD >= 0 ? '+' : ''}${formatInvestMoney(m.pnlUSD, 'USD')} USD`
                    : `${m.pnlCOP >= 0 ? '+' : ''}${formatInvestMoney(m.pnlCOP, 'COP')} COP`
                  }
                  <span className="text-[11px] font-bold ml-1">
                    ({m.pnlPercentage >= 0 ? '+' : ''}${m.pnlPercentage ? m.pnlPercentage.toFixed(2) : '0.00'}%)
                  </span>
                </span>
                <span className={`text-[10px] font-mono tracking-tight tabular-nums block mt-0.5 ${
                  m.isPositive ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-rose-600/80 dark:text-rose-400/80'
                }`}>
                  ≈ {m.currency === 'USD'
                    ? `${m.pnlCOP >= 0 ? '+' : ''}${formatInvestMoney(m.pnlCOP, 'COP')} COP`
                    : `${m.pnlUSD >= 0 ? '+' : ''}${formatInvestMoney(m.pnlUSD, 'USD')} USD`
                  }
                </span>
              </div>

              {/* Cuadrante 3 (Inferior Izquierdo): PRECIO ACTUAL */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-white/5">
                <span className="block text-[10px] tracking-wider text-slate-400 font-semibold uppercase">
                  PRECIO ACTUAL
                </span>
                <span className="font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums block mt-0.5 text-xs sm:text-sm">
                  {m.shares > 0 
                    ? formatInvestMoney(m.currentPrice, m.currency)
                    : formatInvestMoney(m.currency === 'USD' ? m.currentValueUSD : m.currentValueCOP, m.currency)
                  }
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-tight tabular-nums block mt-0.5">
                  {m.shares > 0 
                    ? `${m.shares.toLocaleString('es-CO', { maximumFractionDigits: 6 })} ${m.ticker || 'uds'}`
                    : '1 posición'
                  }
                </span>
              </div>

              {/* Cuadrante 4 (Inferior Derecho): PRECIO DE COMPRA */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-white/5">
                <span className="block text-[10px] tracking-wider text-slate-400 font-semibold uppercase">
                  PRECIO DE COMPRA
                </span>
                <span className="font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums block mt-0.5 text-xs sm:text-sm">
                  {m.shares > 0 
                    ? formatInvestMoney(m.buyPrice, m.currency)
                    : formatInvestMoney(m.currency === 'USD' ? m.totalCostUSD : m.totalCostCOP, m.currency)
                  }
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-tight tabular-nums block mt-0.5">
                  {m.shares > 0 ? 'Promedio compra' : 'Costo inicial'}
                </span>
              </div>
            </div>

            {/* Info y Liquidación para CDTs */}
            {isCDT && isMatured && cdtStats && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>CDT Vencido el {inv.dueDate}</span>
                  </span>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    {cdtTermDays} días ({inv.interestRate}% E.A.)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-amber-500/20">
                  <div>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">Capital inicial</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                      {formatInvestMoney(Number(inv.investedAmount || inv.buyPrice || 0), inv.currency || 'COP')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">Ganancia neta (retefuente 4%)</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                      +{formatInvestMoney(cdtStats.netReturn, inv.currency || 'COP')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">Total liquidable</span>
                    <span className="font-extrabold text-amber-700 dark:text-amber-300 font-mono tabular-nums">
                      {formatInvestMoney(cdtStats.maturityTotal, inv.currency || 'COP')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenLiquidation) onOpenLiquidation(inv, cdtStats);
                  }}
                  className="w-full mt-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Liquidar a cuenta</span>
                </button>
              </div>
            )}

            {/* Info para CDTs vigentes (no vencidos) */}
            {isCDT && !isMatured && inv.interestRate && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-0.5 font-medium flex-wrap gap-1">
                <span>Tasa: <strong className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{inv.interestRate}% E.A.</strong></span>
                {inv.dueDate && (
                  <span>Vence: <strong className="text-slate-700 dark:text-slate-200">{inv.dueDate}</strong> ({cdtTermDays}d)</span>
                )}
                {cdtStats && (
                  <span className="hidden sm:inline">Rendimiento proyectado: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">+{formatInvestMoney(cdtStats.netReturn, inv.currency || 'COP')}</strong></span>
                )}
              </div>
            )}

            {/* Info adicional para otros activos de renta fija (ej. Bonos) */}
            {!isCDT && !isPrivateLoan && inv.interestRate && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-0.5 font-medium">
                <span>Tasa: <strong className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{inv.interestRate}% E.A.</strong></span>
                {inv.dueDate && (
                  <span>Vence: <strong className="text-slate-700 dark:text-slate-200">{inv.dueDate}</strong></span>
                )}
              </div>
            )}

            {/* Info adicional para Préstamo a Tercero */}
            {isPrivateLoan && (
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <HandCoins className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">Deudor</span>
                    <span className="font-bold text-slate-900 dark:text-white">{inv.borrower || inv.loanBorrower || 'Tercero'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">Rendimiento Proyectado</span>
                  <span className="font-extrabold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{formatInvestMoney(calculateMonthlyLoanReturn(inv.investedAmount, inv.monthlyRate), inv.currency || 'COP')} / mes
                  </span>
                  {inv.paymentDay && (
                    <span className="block text-[10px] text-slate-400 font-normal">Cobro cada día {inv.paymentDay}</span>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </SwipeableRow>
  );
}
