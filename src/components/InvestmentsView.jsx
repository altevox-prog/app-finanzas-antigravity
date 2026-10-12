import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';
import { 
  INVESTMENT_CATEGORIES, 
  formatCurrency, 
  formatUSD 
} from '../data/initialData';
import { usePrivacy } from '../context/PrivacyContext';
import InvestmentFormModal from './InvestmentFormModal';
import PortfolioSummaryHeader from './investments/components/PortfolioSummaryHeader';
import InvestmentFilterBar from './investments/components/InvestmentFilterBar';
import InvestmentBankGroup from './investments/components/InvestmentBankGroup';
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
      {/* 2. BARRA DE FILTROS POR CATEGORÍA Y SELECTOR DE VISTA         */}
      {/* ============================================================== */}
      <InvestmentFilterBar
        categories={INVESTMENT_CATEGORIES}
        selectedCategory={selectedCategoryFilter}
        onSelectCategory={setSelectedCategoryFilter}
        viewGrouping={viewGrouping}
        onChangeViewGrouping={setViewGrouping}
        totalFilteredCount={filteredInvestments.length}
        totalGroupedCount={Object.keys(groupedInvestments).length}
        investments={investments}
      />

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
          <InvestmentBankGroup
            groupedInvestments={groupedInvestments}
            viewCurrency={viewCurrency}
            livePrices={livePrices}
            trm={trm}
            expandedBanks={expandedBanks}
            onToggleBank={toggleBankExpand}
            onEditInvestment={handleEditInvestment}
            onDeleteInvestment={handleDeleteInvestmentClick}
            onQuickUpdate={handleQuickUpdateClick}
            onOpenLiquidation={handleOpenLiquidation}
          />
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
