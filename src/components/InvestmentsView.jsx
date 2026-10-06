import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  ShieldCheck, 
  Coins, 
  Sparkles, 
  Layers, 
  Pencil, 
  Trash2, 
  RefreshCw, 
  DollarSign, 
  ArrowRight,
  Clock, 
  Info, 
  PieChart, 
  Check, 
  SlidersHorizontal,
  ExternalLink,
  HandCoins,
  Building2,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List
} from 'lucide-react';
import { 
  INVESTMENT_CATEGORIES, 
  formatCurrency, 
  formatUSD 
} from '../data/initialData';
import { usePrivacy } from '../context/PrivacyContext';
import InvestmentFormModal from './InvestmentFormModal';
import BrandIcon from './BrandIcon';
import { fetchBatchMarketPrices } from '../services/marketQuotesService';
import { 
  toSafeNumber, 
  convertUSDtoCOP, 
  convertCOPtoUSD,
  calculateMonthlyLoanReturn 
} from '../utils/financeMath';

export default function InvestmentsView({
  investments = [],
  onAddInvestment,
  onUpdateInvestment,
  onDeleteInvestment,
  trm = 4050
}) {
  const { formatMoney, isPrivacyMode, enableDecimals } = usePrivacy();
  const showDecimals = enableDecimals ?? (typeof window !== 'undefined' && localStorage.getItem('app_enable_decimals') === 'true');

  // Multi-currency view state: 'COP' | 'USD'
  const [viewCurrency, setViewCurrency] = useState(() => {
    try {
      return localStorage.getItem('presu_investment_view_currency') || 'COP';
    } catch {
      return 'COP';
    }
  });

  const formatInvestMoney = (amount, currency = viewCurrency) => {
    if (currency === 'USD') {
      return formatUSD(amount, isPrivacyMode, showDecimals);
    }
    return formatCurrency(amount, isPrivacyMode, showDecimals);
  };

  const handleSetViewCurrency = (curr) => {
    setViewCurrency(curr);
    try {
      localStorage.setItem('presu_investment_view_currency', curr);
    } catch {}
  };

  // Category filter: 'all' | categoryId
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Vista agrupada por Entidad / Banco o lista plana (por defecto 'flat' - Todas las inversiones)
  const [viewGrouping, setViewGrouping] = useState('flat'); // 'flat' | 'by_institution'
  const [expandedBanks, setExpandedBanks] = useState(() => ({}));

  const toggleBankExpand = (bankName) => {
    setExpandedBanks(prev => ({
      ...prev,
      [bankName]: prev[bankName] === undefined ? false : !prev[bankName]
    }));
  };

  // Cotizaciones en vivo en tiempo real
  const [livePrices, setLivePrices] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  // Modal State for Add / Edit Investment
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);

  // Quick Update Market Value Modal State
  const [quickUpdateItem, setQuickUpdateItem] = useState(null);
  const [quickUpdateValue, setQuickUpdateValue] = useState('');

  // Consulta de cotizaciones en tiempo real
  const handleRefreshQuotes = async () => {
    if (!investments || investments.length === 0) return;
    setIsRefreshing(true);
    try {
      const quotes = await fetchBatchMarketPrices(investments);
      if (quotes && Object.keys(quotes).length > 0) {
        setLivePrices(prev => ({ ...prev, ...quotes }));
        setLastRefreshedAt(new Date());
      }
    } catch (e) {
      console.warn('Error consultando cotizaciones en vivo:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Consulta automática al montar o cambiar cantidad de inversiones
  useEffect(() => {
    if (investments.length > 0) {
      handleRefreshQuotes();
    }
  }, [investments.length]);

  /**
   * Calcula las métricas individuales de cada posición de inversión
   * (PnL, Costo Total, Valor Actual, conversión oficial a COP)
   */
  const calculatePositionMetrics = (asset) => {
    const ticker = (asset.ticker || asset.symbol || (asset.name && asset.name.length <= 6 ? asset.name : '')).toUpperCase().trim();
    const livePrice = livePrices[ticker];
    
    // Precio actual: prioriza cotización en vivo si existe
    const currentPrice = toSafeNumber(
      livePrice || 
      asset.currentPrice || 
      asset.unitPrice || 
      (asset.shares > 0 && asset.currentAmount > 0 ? asset.currentAmount / asset.shares : asset.buyPrice) || 
      (asset.investedAmount && asset.shares ? asset.investedAmount / asset.shares : 0)
    );

    const buyPrice = toSafeNumber(
      asset.buyPrice || 
      (asset.shares > 0 && asset.investedAmount > 0 ? asset.investedAmount / asset.shares : currentPrice) || 
      0
    );

    const shares = toSafeNumber(
      asset.shares || 
      (buyPrice > 0 ? toSafeNumber(asset.investedAmount || asset.currentAmount) / buyPrice : 1)
    );

    const currency = asset.currency || 'USD';
    const trmValue = toSafeNumber(trm) || 4050;

    // Valores en moneda de origen
    const totalCostOrigin = shares > 0 && buyPrice > 0 
      ? (shares * buyPrice) 
      : toSafeNumber(asset.investedAmount);

    const currentValueOrigin = shares > 0 && currentPrice > 0 
      ? (shares * currentPrice) 
      : toSafeNumber(asset.currentAmount || totalCostOrigin);

    // Normalización en USD (Usa convertCOPtoUSD si origen es COP)
    const totalCostUSD = currency === 'USD' ? totalCostOrigin : convertCOPtoUSD(totalCostOrigin, trmValue);
    const currentValueUSD = currency === 'USD' ? currentValueOrigin : convertCOPtoUSD(currentValueOrigin, trmValue);
    const pnlUSD = currentValueUSD - totalCostUSD;

    // Normalización en COP usando la TRM oficial (¡Multiplicación estricta para USD a COP!)
    const totalCostCOP = currency === 'COP' ? totalCostOrigin : convertUSDtoCOP(totalCostOrigin, trmValue);
    const currentValueCOP = currency === 'COP' ? currentValueOrigin : convertUSDtoCOP(currentValueOrigin, trmValue);
    const pnlCOP = currentValueCOP - totalCostCOP;

    // Rendimiento porcentual
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
  };

  // Cálculo consolidado de todo el portafolio de inversiones
  const portfolioMetrics = useMemo(() => {
    let totalValueCOP = 0;
    let totalCostCOP = 0;
    let totalValueUSD = 0;
    let totalCostUSD = 0;

    investments.forEach((inv) => {
      const m = calculatePositionMetrics(inv);
      totalValueCOP += m.currentValueCOP;
      totalCostCOP += m.totalCostCOP;
      totalValueUSD += m.currentValueUSD;
      totalCostUSD += m.totalCostUSD;
    });

    const netGainCOP = totalValueCOP - totalCostCOP;
    const netGainUSD = totalValueUSD - totalCostUSD;
    const totalPercentage = totalCostCOP > 0 ? (netGainCOP / totalCostCOP) * 100 : 0;

    return {
      totalValueCOP,
      totalCostCOP,
      totalValueUSD,
      totalCostUSD,
      netGainCOP,
      netGainUSD,
      totalPercentage,
      isPositive: netGainCOP >= 0
    };
  }, [investments, livePrices, trm]);

  // Inversiones filtradas según categoría
  const filteredInvestments = useMemo(() => {
    return investments.filter(inv => {
      if (selectedCategoryFilter === 'all') return true;
      return inv.category === selectedCategoryFilter || inv.assetType === selectedCategoryFilter;
    });
  }, [investments, selectedCategoryFilter]);

  // Agrupación de Inversiones por Entidad / Banco
  const groupedInvestments = useMemo(() => {
    return filteredInvestments.reduce((acc, inv) => {
      let bank = inv.institution?.trim();
      if (!bank && inv.name) {
        const lowerName = inv.name.toLowerCase();
        if (lowerName.includes('nu') || lowerName.includes('cuenta nu')) bank = 'Nu';
        else if (lowerName.includes('bancolombia')) bank = 'Bancolombia';
        else if (lowerName.includes('lulo')) bank = 'Lulo Bank';
        else if (lowerName.includes('davivienda') || lowerName.includes('daviplata')) bank = 'Davivienda';
        else if (lowerName.includes('bbva')) bank = 'BBVA';
        else if (lowerName.includes('tyba')) bank = 'Tyba';
        else if (lowerName.includes('trii')) bank = 'Trii';
        else if (lowerName.includes('littio')) bank = 'Littio';
        else if (lowerName.includes('binance')) bank = 'Binance';
        else if (lowerName.includes('hapi')) bank = 'Hapi';
        else if (lowerName.includes('pibank')) bank = 'Pibank';
        else if (lowerName.includes('finandina')) bank = 'Finandina';
      }
      if (!bank) bank = 'Otras Entidades';

      if (!acc[bank]) {
        acc[bank] = {
          bank,
          items: [],
          totalInvestedCOP: 0,
          currentValueCOP: 0,
          totalInvestedUSD: 0,
          currentValueUSD: 0
        };
      }
      const m = calculatePositionMetrics(inv);
      acc[bank].items.push({ ...inv, metrics: m });
      acc[bank].totalInvestedCOP += m.totalCostCOP;
      acc[bank].currentValueCOP += m.currentValueCOP;
      acc[bank].totalInvestedUSD += m.totalCostUSD;
      acc[bank].currentValueUSD += m.currentValueUSD;
      return acc;
    }, {});
  }, [filteredInvestments, livePrices, trm]);

  // Distribución de activos por categoría
  const allocationByCategory = useMemo(() => {
    return INVESTMENT_CATEGORIES.map(cat => {
      const catTotalCOP = investments
        .filter(inv => inv.category === cat.id || inv.assetType === cat.id)
        .reduce((sum, inv) => {
          const m = calculatePositionMetrics(inv);
          return sum + m.currentValueCOP;
        }, 0);

      const percent = portfolioMetrics.totalValueCOP > 0 
        ? (catTotalCOP / portfolioMetrics.totalValueCOP) * 100 
        : 0;

      return {
        ...cat,
        totalCOP: catTotalCOP,
        percent: Math.round(percent * 10) / 10
      };
    }).filter(cat => cat.totalCOP > 0 || cat.percent > 0);
  }, [investments, livePrices, portfolioMetrics.totalValueCOP]);

  // Guardar valor manual rápido
  const handleSaveQuickValue = (e) => {
    e.preventDefault();
    if (!quickUpdateItem) return;
    const newVal = parseFloat(quickUpdateValue);
    if (isNaN(newVal) || newVal < 0) return;

    onUpdateInvestment({
      ...quickUpdateItem,
      currentAmount: newVal,
      currentPrice: quickUpdateItem.shares > 0 ? newVal / quickUpdateItem.shares : newVal
    });
    setQuickUpdateItem(null);
  };

  const renderInvestmentCard = (inv, m = calculatePositionMetrics(inv)) => {
    const isPrivateLoan = inv.subType === 'private_loan' || inv.assetType === 'loan';
    const assetTypeLabel = 
      isPrivateLoan ? 'Préstamo a Tercero' :
      inv.subType === 'bond' || inv.assetType === 'bond' ? 'Bono' :
      inv.assetType === 'crypto' || inv.category === 'crypto' ? 'Cripto' :
      inv.assetType === 'stock' || inv.category === 'variable' ? 'Acción US' :
      inv.assetType === 'etf' ? 'ETF' :
      inv.assetType === 'cdt' || inv.category === 'fixed' ? 'CDT' :
      inv.assetType === 'fund' || inv.category === 'liquidity' ? 'Fondo' : 'Inversión';

    return (
      <div
        key={inv.id}
        className="p-4 sm:p-5 rounded-2xl border shadow-xs space-y-3.5 transition-all hover:border-emerald-500/30"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        {/* 1. CABECERA DE LA TARJETA */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Logo/Icono del Activo */}
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center p-1 bg-slate-100 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 shrink-0">
              {isPrivateLoan ? (
                <div className="w-full h-full flex items-center justify-center text-emerald-500">
                  <HandCoins className="w-6 h-6" />
                </div>
              ) : (
                <BrandIcon name={m.ticker || inv.name} type={inv.assetType || inv.category} size={28} />
              )}
            </div>

            <div className="truncate">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-tight">
                  {isPrivateLoan ? (inv.borrower || inv.name) : (m.ticker || inv.name)}
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10">
                  {assetTypeLabel}
                </span>
                {inv.institution && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    {inv.institution}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">
                {inv.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Badge de Rendimiento (Fintech) */}
            <div className={`px-2.5 py-1 rounded-xl text-xs font-extrabold tabular-nums border ${
              isPrivateLoan
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : m.isPositive 
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}>
              {isPrivateLoan 
                ? `+${Number(inv.monthlyRate || 0).toFixed(1)}% M.V.`
                : `${m.isPositive ? '+' : ''}${m.pnlPercentage.toFixed(2)}%`
              }
            </div>

            {/* Botones de acción discretos */}
            <button
              type="button"
              onClick={() => {
                setQuickUpdateItem(inv);
                setQuickUpdateValue(String(inv.currentAmount || m.currentValueOrigin));
              }}
              className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors cursor-pointer"
              title="Actualizar valor de mercado rápido"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingInvestment(inv);
                setIsFormModalOpen(true);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Editar inversión"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`¿Eliminar la inversión "${inv.name}"?`)) {
                  onDeleteInvestment(inv.id);
                }
              }}
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
              title="Eliminar inversión"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. CUERPO DE LA TARJETA: Valor Actual Grande y Conversión a COP */}
        <div className="space-y-0.5 pt-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl sm:text-[26px] font-black tracking-tight tabular-nums text-slate-900 dark:text-white leading-none">
              {m.currency === 'USD' 
                ? `${formatInvestMoney(m.currentValueUSD, 'USD')} USD`
                : `${formatInvestMoney(m.currentValueCOP, 'COP')} COP`
              }
            </span>
            {m.shares > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                ({m.shares.toLocaleString('es-CO', { maximumFractionDigits: 4 })} {m.ticker || 'unidades'})
              </span>
            )}
          </div>

          {/* Conversión Automática a COP */}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            ≈ {formatInvestMoney(m.currentValueCOP, 'COP')} COP{' '}
            <span className="opacity-70 font-mono text-[11px]">(TRM: {formatInvestMoney(trm || 4050, 'COP')})</span>
          </div>
        </div>

        {/* 3. FILA DE MÉTRICAS CLAVE (GRID DE 3 COLUMNAS COMPACTAS) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 text-xs">
          {/* Col 1: Invertido (Costo) */}
          <div>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Invertido (Costo)
            </span>
            <span className="font-bold text-slate-900 dark:text-white tabular-nums block mt-0.5">
              {formatInvestMoney(m.totalCostUSD, 'USD')} USD
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              ≈ {formatInvestMoney(m.totalCostCOP, 'COP')} COP
            </span>
          </div>

          {/* Col 2: Ganancia / Pérdida */}
          <div>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Ganancia / Pérdida
            </span>
            <span className={`font-bold tabular-nums block mt-0.5 ${
              m.isPositive ? 'text-emerald-500' : 'text-rose-500'
            }`}>
              {m.pnlUSD >= 0 ? '+' : ''}{formatInvestMoney(m.pnlUSD, 'USD')} USD
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              ≈ {m.pnlCOP >= 0 ? '+' : ''}{formatInvestMoney(m.pnlCOP, 'COP')} COP
            </span>
          </div>

          {/* Col 3: Precio Actual vs Compra */}
          <div>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Precio Actual vs Compra
            </span>
            <span className="font-bold text-slate-900 dark:text-white tabular-nums block mt-0.5">
              Actual: {formatInvestMoney(m.currentPrice, m.currency)}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              Compra: {formatInvestMoney(m.buyPrice, m.currency)}
            </span>
          </div>
        </div>

        {/* Info adicional para CDTs si aplica */}
        {inv.interestRate && !isPrivateLoan && (
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
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{formatInvestMoney(calculateMonthlyLoanReturn(inv.investedAmount, inv.monthlyRate), inv.currency || 'COP')} / mes
              </span>
              {inv.paymentDay && (
                <span className="block text-[10px] text-slate-400 font-normal">Cobro cada día {inv.paymentDay}</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-36 animate-fadeIn">
      {/* ============================================================== */}
      {/* 1. RESUMEN TOTAL DEL PORTAFOLIO DE INVERSIONES (CABECERA) */}
      {/* ============================================================== */}
      <div 
        className="p-4 sm:p-5 rounded-3xl border shadow-sm space-y-4"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        {/* Barra de Título y Botón de Actualización Rápida En Vivo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-main)' }}>
              Portafolio de Inversiones
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>En vivo</span>
            </span>
            {lastRefreshedAt && (
              <span className="text-[10px] text-slate-400 font-medium hidden md:inline">
                • {lastRefreshedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Botón de Actualización Rápida */}
            <button
              type="button"
              onClick={handleRefreshQuotes}
              disabled={isRefreshing || investments.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200/60 dark:border-white/10 active:scale-95 disabled:opacity-50"
              title="Actualizar cotizaciones en tiempo real"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Actualizando...' : '↺ Actualizar cotizaciones'}</span>
            </button>

            {/* Botón Nueva Inversión */}
            <button
              type="button"
              onClick={() => {
                setEditingInvestment(null);
                setIsFormModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva inversión</span>
            </button>
          </div>
        </div>

        {/* 2 Tarjetas Principales del Portafolio: Patrimonio Total y Ganancia Histórica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Tarjeta 1: Patrimonio en Inversiones Total (COP consolidado y USD) */}
          <div 
            className="p-4 rounded-2xl border flex flex-col justify-between"
            style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}
          >
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block tracking-normal">
                Patrimonio en Inversiones Total
              </span>
              <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums mt-1 text-slate-900 dark:text-white">
                {formatMoney(portfolioMetrics.totalValueCOP, 'COP')}
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5 font-medium">
              <span>≈ {formatMoney(portfolioMetrics.totalValueUSD, 'USD')}</span>
              <span>•</span>
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                TRM: {formatInvestMoney(trm || 4050, 'COP')}
              </span>
            </div>
          </div>

          {/* Tarjeta 2: Ganancia Total Histórica (PnL acumulado con indicador verde/rojo) */}
          <div 
            className="p-4 rounded-2xl border flex flex-col justify-between"
            style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)' }}
          >
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block tracking-normal">
                Ganancia / Pérdida Total (PnL Histórico)
              </span>
              <div className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums mt-1 ${
                portfolioMetrics.isPositive ? 'text-emerald-500' : 'text-rose-500'
              }`}>
                {portfolioMetrics.isPositive ? '+' : ''}{formatMoney(portfolioMetrics.netGainCOP, 'COP')}
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-extrabold tabular-nums border ${
                portfolioMetrics.isPositive 
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
              }`}>
                {portfolioMetrics.isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {portfolioMetrics.isPositive ? '+' : ''}{portfolioMetrics.totalPercentage.toFixed(2)}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                ({portfolioMetrics.isPositive ? '+' : ''}{formatMoney(portfolioMetrics.netGainUSD, 'USD')})
              </span>
            </div>
          </div>
        </div>

        {/* Distribución de Activos Segmentada */}
        {allocationByCategory.length > 0 && (
          <div className="pt-2 space-y-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Distribución de Activos</span>
              <span className="tabular-nums font-mono text-[11px]">100% Portafolio</span>
            </div>

            {/* Barra segmentada */}
            <div className="w-full h-2.5 bg-black/5 dark:bg-white/10 rounded-full flex overflow-hidden p-0.5 gap-0.5">
              {allocationByCategory.map(item => (
                <div
                  key={item.id}
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(2, item.percent)}%`,
                    backgroundColor: item.color
                  }}
                  title={`${item.shortName}: ${item.percent}%`}
                />
              ))}
            </div>

            {/* Leyenda de Categorías */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
              {allocationByCategory.map(item => (
                <div key={item.id} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-bold text-slate-700 dark:text-slate-300">{item.shortName}:</span>
                  <span className="opacity-70 tabular-nums">{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. BARRA DE FILTROS POR CATEGORÍA */}
      {/* ============================================================== */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
            selectedCategoryFilter === 'all'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-[#121622] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
          }`}
        >
          Todos ({investments.length})
        </button>

        {INVESTMENT_CATEGORIES.map(cat => {
          const count = investments.filter(i => i.category === cat.id || i.assetType === cat.id).length;
          if (count === 0 && selectedCategoryFilter !== cat.id) return null;
          const isSelected = selectedCategoryFilter === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#121622] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              <span>{cat.shortName} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 3. SELECTOR DE VISTA (POR BANCO VS TODOS) Y LISTA DE TARJETAS  */}
      {/* ============================================================== */}
      {investments.length > 0 && (
        <div className="flex items-center justify-between gap-2 pt-1 pb-0.5">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setViewGrouping('flat')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewGrouping === 'flat'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Todas las Inversiones</span>
            </button>
            <button
              type="button"
              onClick={() => setViewGrouping('by_institution')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewGrouping === 'by_institution'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Por Entidad / Banco</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            {viewGrouping === 'flat' 
              ? `${filteredInvestments.length} activos listados` 
              : `${Object.keys(groupedInvestments).length} entidades consolidadas`}
          </span>
        </div>
      )}

      <div className="space-y-3">
        {filteredInvestments.length === 0 ? (
          <div 
            className="text-center py-10 px-4 border border-dashed rounded-3xl"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card-sub)' }}
          >
            <TrendingUp className="w-8 h-8 opacity-30 mx-auto mb-2 text-emerald-500" />
            <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
              {investments.length === 0 
                ? 'No tienes inversiones registradas' 
                : 'No hay inversiones en esta categoría'}
            </p>
            <p className="text-[11px] opacity-50 mt-0.5 mb-3">
              Toca "Nueva inversión" para registrar acciones, ETFs, criptoactivos o CDTs con cotización en tiempo real.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingInvestment(null);
                setIsFormModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 cursor-pointer"
            >
              Agregar inversión
            </button>
          </div>
        ) : viewGrouping === 'flat' ? (
          /* ============================================================== */
          /* VISTA PLANA DE TODOS LOS ACTIVOS (ACTIVA POR DEFECTO)          */
          /* ============================================================== */
          filteredInvestments.map(inv => renderInvestmentCard(inv, calculatePositionMetrics(inv)))
        ) : (
          /* ============================================================== */
          /* VISTA AGRUPADA POR BANCO / ENTIDAD (ACORDEÓN CONSOLIDADO)       */
          /* ============================================================== */
          Object.entries(groupedInvestments).map(([bankName, bankData]) => {
            const isExpanded = expandedBanks[bankName] !== false;
            const totalInvested = viewCurrency === 'USD' ? bankData.totalInvestedUSD : bankData.totalInvestedCOP;
            const currentValue = viewCurrency === 'USD' ? bankData.currentValueUSD : bankData.currentValueCOP;
            const netGain = currentValue - totalInvested;
            const gainPercent = totalInvested > 0 ? (netGain / totalInvested) * 100 : 0;
            const isGainPositive = netGain >= 0;

            const productCount = bankData.items.length;
            const cdtCount = bankData.items.filter(i => i.assetType === 'cdt' || i.category === 'fixed').length;
            let productsSummary = `${productCount} ${productCount === 1 ? 'producto' : 'productos'}`;
            if (cdtCount === productCount && cdtCount > 0) {
              productsSummary = `${cdtCount} ${cdtCount === 1 ? 'CDT' : 'CDTs'}`;
            }

            return (
              <div 
                key={bankName}
                className="rounded-3xl border shadow-xs overflow-hidden transition-all"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                {/* Cabecera Consolidada del Banco (Clickeable para desplegar/contraer) */}
                <div 
                  onClick={() => toggleBankExpand(bankName)}
                  className="p-4 sm:p-5 flex flex-col gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Logo de la Entidad */}
                      <div className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center p-1 bg-slate-100 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 shrink-0">
                        <BrandIcon name={bankName} type="bank" size={32} />
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                            {bankName}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10">
                            {productsSummary}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          Consolidado de inversiones
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Badge de Rendimiento Acumulado */}
                      <div className={`px-2.5 py-1 rounded-xl text-xs font-black tabular-nums border text-right hidden sm:block ${
                        isGainPositive 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {isGainPositive ? '+' : ''}{gainPercent.toFixed(2)}%
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Cifras Consolidadas: Saldo Actual, Invertido y Ganancia */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 text-xs">
                    <div>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Saldo Actual Consolidado
                      </span>
                      <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white tabular-nums block mt-0.5">
                        {formatInvestMoney(currentValue, viewCurrency)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Total Invertido
                      </span>
                      <span className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 tabular-nums block mt-0.5">
                        {formatInvestMoney(totalInvested, viewCurrency)}
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Ganancia Total Acumulada
                      </span>
                      <span className={`text-sm sm:text-base font-black tabular-nums block mt-0.5 ${
                        isGainPositive ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {isGainPositive ? '+' : ''}{formatInvestMoney(netGain, viewCurrency)}
                        <span className="text-xs font-bold ml-1 sm:hidden">
                          ({isGainPositive ? '+' : ''}{gainPercent.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acordeón Desplegable: Productos Individuales */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 pt-0 space-y-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/40 dark:bg-white/[0.01]">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider pt-3 pb-0.5">
                      <span>Detalle individual ({bankData.items.length})</span>
                      <span className="text-[11px] font-normal normal-case opacity-70">Toca un activo para editar o actualizar</span>
                    </div>
                    {bankData.items.map(item => renderInvestmentCard(item, item.metrics))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================== */}
      {/* 4. MODALES */}
      {/* ============================================================== */}
      {/* MODAL 1: Formulario Dinámico Añadir / Editar Inversión */}
      <InvestmentFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialInvestment={editingInvestment}
        onSave={(data) => {
          if (editingInvestment) {
            onUpdateInvestment(data);
          } else {
            onAddInvestment(data);
          }
        }}
        onDelete={onDeleteInvestment}
      />

      {/* MODAL 2: Actualización Rápida de Valor de Mercado */}
      {quickUpdateItem && (
        <div 
          className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => setQuickUpdateItem(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[340px] rounded-3xl shadow-2xl border p-5 animate-modal-pop space-y-3.5"
            style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h4 className="text-sm font-extrabold">Actualizar Valor de Mercado</h4>
                <p className="text-[10px] opacity-60 truncate max-w-[220px]">{quickUpdateItem.name}</p>
              </div>
              <button 
                onClick={() => setQuickUpdateItem(null)}
                className="w-6 h-6 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 text-xs font-bold"
                style={{ backgroundColor: 'var(--bg-card-sub)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickValue} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold opacity-70 mb-1">
                  Nuevo Valor Actual ({quickUpdateItem.currency}) *
                </label>
                <input 
                  type="number"
                  step="any"
                  min="0"
                  required
                  autoFocus
                  value={quickUpdateValue}
                  onChange={(e) => setQuickUpdateValue(e.target.value)}
                  className="w-full text-base font-black px-3.5 py-2.5 rounded-xl border border-transparent focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setQuickUpdateItem(null)}
                  className="px-3.5 py-2 text-xs font-semibold opacity-70 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-card-sub)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs active:scale-95"
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
