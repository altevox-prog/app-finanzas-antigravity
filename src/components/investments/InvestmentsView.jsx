import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus } from 'lucide-react';
import { INVESTMENT_CATEGORIES } from '../../data/initialData';
import InvestmentFormModal from './modals/InvestmentFormModal';
import PortfolioSummaryHeader from './components/PortfolioSummaryHeader';
import InvestmentFilterBar from './components/InvestmentFilterBar';
import InvestmentBankGroup from './components/InvestmentBankGroup';
import InvestmentCard from './components/InvestmentCard';
import CDTLiquidationModal from './components/CDTLiquidationModal';
import InvestmentQuickUpdateModal from './components/InvestmentQuickUpdateModal';
import useInvestmentQuotes from './hooks/useInvestmentQuotes';
import useInvestmentLiquidation from './hooks/useInvestmentLiquidation';
import useInvestmentCalculations from './hooks/useInvestmentCalculations';

export default function InvestmentsView({
  investments = [],
  accounts = [],
  onAddInvestment,
  onUpdateInvestment,
  onDeleteInvestment,
  onAddTransaction,
  trm = 4050,
  livePrices: propLivePrices = null,
  handleRefreshQuotes: propRefreshQuotes = null,
  isRefreshing: propIsRefreshing = null
}) {
  const [viewCurrency] = useState(() => {
    try {
      return localStorage.getItem('presu_investment_view_currency') || 'COP';
    } catch {
      return 'COP';
    }
  });

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [viewGrouping, setViewGrouping] = useState('flat');
  const [expandedBanks, setExpandedBanks] = useState({});

  const toggleBankExpand = (bankName) => {
    setExpandedBanks(prev => ({ ...prev, [bankName]: prev[bankName] === undefined ? false : !prev[bankName] }));
  };

  const internalQuotes = useInvestmentQuotes({ investments: propLivePrices ? [] : investments });
  const livePrices = propLivePrices || internalQuotes.livePrices;
  const isRefreshing = propIsRefreshing !== null && propIsRefreshing !== undefined ? propIsRefreshing : internalQuotes.isRefreshing;
  const handleRefreshQuotes = propRefreshQuotes || internalQuotes.handleRefreshQuotes;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('monety:investment-quotes-status', { detail: { isRefreshing } }));
  }, [isRefreshing]);

  useEffect(() => {
    const handleOpenAdd = () => { setEditingInvestment(null); setIsFormModalOpen(true); };
    const handleRefresh = () => handleRefreshQuotes();

    window.addEventListener('monety:open-add-investment', handleOpenAdd);
    window.addEventListener('monety:refresh-investment-quotes', handleRefresh);
    return () => {
      window.removeEventListener('monety:open-add-investment', handleOpenAdd);
      window.removeEventListener('monety:refresh-investment-quotes', handleRefresh);
    };
  }, [handleRefreshQuotes]);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [quickUpdateItem, setQuickUpdateItem] = useState(null);
  const [quickUpdateValue, setQuickUpdateValue] = useState('');

  const {
    liquidatingCDT, liquidationAccountId, setLiquidationAccountId,
    liquidationDate, setLiquidationDate, isSubmittingLiquidation,
    handleOpenLiquidation, handleCloseLiquidation, handleConfirmLiquidation
  } = useInvestmentLiquidation({ accounts, onAddTransaction, onUpdateInvestment });

  const {
    portfolioMetrics, filteredInvestments, groupedInvestments,
    allocationByCategory, calculatePositionMetrics
  } = useInvestmentCalculations({
    investments, livePrices, selectedCategoryFilter, viewCurrency, trm
  });

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
    if (confirm(`¿Eliminar la inversión "${inv.name}"?`)) onDeleteInvestment(inv.id);
  };

  return (
    <div className="space-y-2.5 pb-36 animate-fadeIn">
      {/* 1. Resumen Portfolio */}
      <PortfolioSummaryHeader
        portfolioMetrics={portfolioMetrics}
        allocationByCategory={allocationByCategory}
        trm={trm}
      />

      {/* 2. Filtros */}
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

      {/* 3. Listado */}
      <div className="flex flex-col gap-2.5">
        {filteredInvestments.length === 0 ? (
          <div 
            className="text-center py-6 px-4 border border-dashed rounded-2xl flex flex-col items-center justify-center"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card-sub)' }}
          >
            <TrendingUp className="w-7 h-7 opacity-35 mx-auto mb-2 text-emerald-500" />
            <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
              {investments.length === 0 ? 'No tienes inversiones registradas' : 'No hay inversiones en esta categoría'}
            </p>
            <p className="text-[11px] opacity-60 mt-1 max-w-sm text-center">
              {investments.length === 0 
                ? 'Registra tus acciones, ETFs, criptoactivos o CDTs para hacer seguimiento en tiempo real.'
                : 'No se encontraron activos con el filtro seleccionado.'}
            </p>
            {investments.length === 0 ? (
              <button
                type="button" onClick={() => { setEditingInvestment(null); setIsFormModalOpen(true); }}
                className="mt-3.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" /><span>Registrar primera inversión</span>
              </button>
            ) : (
              <button
                type="button" onClick={() => setSelectedCategoryFilter('all')}
                className="mt-3 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-700/80 transition-all cursor-pointer active:scale-95"
              >
                Ver todas las inversiones
              </button>
            )}
          </div>
        ) : viewGrouping === 'flat' ? (
          filteredInvestments.map(inv => (
            <InvestmentCard
              key={inv.id} investment={inv} metrics={calculatePositionMetrics(inv)}
              viewCurrency={viewCurrency} livePrices={livePrices} trm={trm}
              onEdit={handleEditInvestment} onDelete={handleDeleteInvestmentClick}
              onQuickUpdate={(item, val) => { setQuickUpdateItem(item); setQuickUpdateValue(val); }}
              onOpenLiquidation={handleOpenLiquidation}
            />
          ))
        ) : (
          <InvestmentBankGroup
            groupedInvestments={groupedInvestments} viewCurrency={viewCurrency}
            livePrices={livePrices} trm={trm} expandedBanks={expandedBanks}
            onToggleBank={toggleBankExpand} onEditInvestment={handleEditInvestment}
            onDeleteInvestment={handleDeleteInvestmentClick}
            onQuickUpdate={(item, val) => { setQuickUpdateItem(item); setQuickUpdateValue(val); }}
            onOpenLiquidation={handleOpenLiquidation}
          />
        )}
      </div>

      {/* Modales */}
      <InvestmentFormModal
        isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)}
        initialInvestment={editingInvestment}
        onSave={(data) => {
          if (editingInvestment) onUpdateInvestment(data);
          else onAddInvestment(data);
        }}
        onDelete={onDeleteInvestment}
      />

      <InvestmentQuickUpdateModal
        item={quickUpdateItem} value={quickUpdateValue} onChangeValue={setQuickUpdateValue}
        onClose={() => setQuickUpdateItem(null)} onConfirm={handleSaveQuickValue}
      />

      <CDTLiquidationModal
        liquidatingCDT={liquidatingCDT} accounts={accounts}
        liquidationAccountId={liquidationAccountId} setLiquidationAccountId={setLiquidationAccountId}
        liquidationDate={liquidationDate} setLiquidationDate={setLiquidationDate}
        isSubmittingLiquidation={isSubmittingLiquidation} onClose={handleCloseLiquidation}
        onConfirm={handleConfirmLiquidation}
      />
    </div>
  );
}
