import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  ShieldCheck, 
  Coins, 
  Sparkles, 
  Layers, 
  DollarSign, 
  ArrowRight,
  Clock, 
  Info, 
  PieChart, 
  Check, 
  SlidersHorizontal,
  ExternalLink,
  Building2,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { 
  INVESTMENT_CATEGORIES, 
  formatCurrency, 
  formatUSD 
} from '../data/initialData';
import { usePrivacy } from '../context/PrivacyContext';
import InvestmentFormModal from './InvestmentFormModal';
import BrandIcon from './BrandIcon';
import PortfolioSummaryHeader from './investments/components/PortfolioSummaryHeader';
import InvestmentCard from './investments/components/InvestmentCard';
import CDTLiquidationModal from './investments/components/CDTLiquidationModal';
import InvestmentQuickUpdateModal from './investments/components/InvestmentQuickUpdateModal';
import useInvestmentQuotes from './investments/hooks/useInvestmentQuotes';
import useInvestmentLiquidation from './investments/hooks/useInvestmentLiquidation';
import useInvestmentCalculations from './investments/hooks/useInvestmentCalculations';

export default function InvestmentsView({
  investments = [],
  accounts = [],
  onAddInvestment,
  onUpdateInvestment,
  onDeleteInvestment,
  onAddTransaction,
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

  // Cotizaciones en vivo en tiempo real (Custom Hook)
  const {
    livePrices,
    isRefreshing,
    lastRefreshedAt,
    handleRefreshQuotes,
    setLivePrices
  } = useInvestmentQuotes({ investments });

  // Modal State for Add / Edit Investment
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);

  // Quick Update Market Value Modal State
  const [quickUpdateItem, setQuickUpdateItem] = useState(null);
  const [quickUpdateValue, setQuickUpdateValue] = useState('');

  // Liquidación de CDT (Custom Hook)
  const {
    liquidatingCDT,
    liquidationAccountId,
    setLiquidationAccountId,
    liquidationDate,
    setLiquidationDate,
    isSubmittingLiquidation,
    handleOpenLiquidation,
    handleCloseLiquidation,
    handleConfirmLiquidation
  } = useInvestmentLiquidation({
    accounts,
    onAddTransaction,
    onUpdateInvestment
  });


  // Cálculos consolidados, filtros y agrupaciones (Custom Hook)
  const {
    portfolioMetrics,
    filteredInvestments,
    groupedInvestments,
    allocationByCategory,
    calculatePositionMetrics
  } = useInvestmentCalculations({
    investments,
    livePrices,
    selectedCategoryFilter,
    viewCurrency,
    trm
  });

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

  const handleEditInvestment = (inv) => {
    setEditingInvestment(inv);
    setIsFormModalOpen(true);
  };

  const handleDeleteInvestmentClick = (inv) => {
    if (confirm(`¿Eliminar la inversión "${inv.name}"?`)) {
      onDeleteInvestment(inv.id);
    }
  };

  const handleQuickUpdateClick = (inv, val) => {
    setQuickUpdateItem(inv);
    setQuickUpdateValue(val);
  };

  return (
    <div className="space-y-4 pb-36 animate-fadeIn">
      {/* ============================================================== */}
      {/* 1. RESUMEN TOTAL DEL PORTAFOLIO DE INVERSIONES (CABECERA) */}
      {/* ============================================================== */}
      <PortfolioSummaryHeader
        portfolioMetrics={portfolioMetrics}
        allocationByCategory={allocationByCategory}
        viewCurrency={viewCurrency}
        onToggleCurrency={handleSetViewCurrency}
        isRefreshing={isRefreshing}
        lastRefreshedAt={lastRefreshedAt}
        onRefreshQuotes={handleRefreshQuotes}
        onNewInvestment={() => {
          setEditingInvestment(null);
          setIsFormModalOpen(true);
        }}
        trm={trm}
        investmentsCount={investments.length}
      />

      {/* ============================================================== */}
      {/* 2. BARRA DE FILTROS POR CATEGORÍA */}
      {/* ============================================================== */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
            selectedCategoryFilter === 'all'
              ? 'bg-emerald-600 text-white shadow-sm'
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
                  ? 'bg-emerald-600 text-white shadow-sm'
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
                  ? 'bg-emerald-600 text-white shadow-sm'
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
                  ? 'bg-emerald-600 text-white shadow-sm'
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 cursor-pointer"
            >
              Agregar inversión
            </button>
          </div>
        ) : viewGrouping === 'flat' ? (
          /* ============================================================== */
          /* VISTA PLANA DE TODOS LOS ACTIVOS (ACTIVA POR DEFECTO)          */
          filteredInvestments.map(inv => (
            <InvestmentCard
              key={inv.id}
              investment={inv}
              metrics={calculatePositionMetrics(inv)}
              viewCurrency={viewCurrency}
              livePrices={livePrices}
              trm={trm}
              onEdit={handleEditInvestment}
              onDelete={handleDeleteInvestmentClick}
              onQuickUpdate={handleQuickUpdateClick}
              onOpenLiquidation={handleOpenLiquidation}
            />
          ))
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
                className="rounded-3xl border shadow-sm overflow-hidden transition-all"
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
                      <span className="text-sm sm:text-base font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums block mt-0.5">
                        {formatInvestMoney(currentValue, viewCurrency)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Total Invertido
                      </span>
                      <span className="text-sm sm:text-base font-bold font-mono tracking-tight text-slate-700 dark:text-slate-300 tabular-nums block mt-0.5">
                        {formatInvestMoney(totalInvested, viewCurrency)}
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Ganancia Total Acumulada
                      </span>
                      <span className={`text-sm sm:text-base font-bold font-mono tracking-tight tabular-nums block mt-0.5 ${
                        isGainPositive ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {isGainPositive ? '+' : ''}{formatInvestMoney(netGain, viewCurrency)}
                        <span className="text-xs font-bold font-mono tracking-tight ml-1 sm:hidden">
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
                    {bankData.items.map(item => (
                      <InvestmentCard
                        key={item.id}
                        investment={item}
                        metrics={item.metrics}
                        viewCurrency={viewCurrency}
                        livePrices={livePrices}
                        trm={trm}
                        onEdit={handleEditInvestment}
                        onDelete={handleDeleteInvestmentClick}
                        onQuickUpdate={handleQuickUpdateClick}
                        onOpenLiquidation={handleOpenLiquidation}
                      />
                    ))}
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
      <InvestmentQuickUpdateModal
        item={quickUpdateItem}
        value={quickUpdateValue}
        onChangeValue={setQuickUpdateValue}
        onClose={() => setQuickUpdateItem(null)}
        onConfirm={handleSaveQuickValue}
      />

      {/* MODAL 3: Confirmación y Liquidación de CDT a Cuenta */}
      <CDTLiquidationModal
        liquidatingCDT={liquidatingCDT}
        accounts={accounts}
        liquidationAccountId={liquidationAccountId}
        setLiquidationAccountId={setLiquidationAccountId}
        liquidationDate={liquidationDate}
        setLiquidationDate={setLiquidationDate}
        isSubmittingLiquidation={isSubmittingLiquidation}
        onClose={handleCloseLiquidation}
        onConfirm={handleConfirmLiquidation}
      />
    </div>
  );
}
