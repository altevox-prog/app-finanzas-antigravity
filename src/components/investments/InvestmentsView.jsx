import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus } from 'lucide-react';
import { INVESTMENT_CATEGORIES } from '../../data/initialData';
import InvestmentFormModal from './modals/InvestmentFormModal';
import AddLotModal from './modals/AddLotModal';
import PortfolioSummaryHeader from './components/PortfolioSummaryHeader';
import InvestmentFilterBar from './components/InvestmentFilterBar';
import InvestmentBankGroup from './components/InvestmentBankGroup';
import InvestmentCard from './components/InvestmentCard';
import CDTLiquidationModal from './components/CDTLiquidationModal';
import useInvestmentQuotes from './hooks/useInvestmentQuotes';
import useInvestmentLiquidation from './hooks/useInvestmentLiquidation';
import useInvestmentCalculations from './hooks/useInvestmentCalculations';
import { applyNewLot, applyDeleteLot } from './utils/investmentNormalizer';

export default function InvestmentsView({
  investments = [], accounts = [], onAddInvestment, onUpdateInvestment, onDeleteInvestment,
  onAddLot: propAddLot, onDeleteLot: propDeleteLot, onAddTransaction, trm = 4050,
  livePrices: propLivePrices = null, handleRefreshQuotes: propRefreshQuotes = null, isRefreshing: propIsRefreshing = null
}) {
  const [viewCurrency] = useState(() => {
    try { return localStorage.getItem('presu_investment_view_currency') || 'COP'; } catch { return 'COP'; }
  });
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [viewGrouping, setViewGrouping] = useState('flat');
  const [expandedBanks, setExpandedBanks] = useState({});
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [lotModalAsset, setLotModalAsset] = useState(null);

  const toggleBankExpand = (bank) => setExpandedBanks((p) => ({ ...p, [bank]: p[bank] === undefined ? false : !p[bank] }));
  const internalQuotes = useInvestmentQuotes({ investments: propLivePrices ? [] : investments });
  const livePrices = propLivePrices || internalQuotes.livePrices;
  const handleRefreshQuotes = propRefreshQuotes || internalQuotes.handleRefreshQuotes;

  useEffect(() => {
    const handleOpenAdd = () => { setEditingInvestment(null); setIsFormModalOpen(true); };
    window.addEventListener('monety:open-add-investment', handleOpenAdd);
    window.addEventListener('monety:refresh-investment-quotes', handleRefreshQuotes);
    return () => {
      window.removeEventListener('monety:open-add-investment', handleOpenAdd);
      window.removeEventListener('monety:refresh-investment-quotes', handleRefreshQuotes);
    };
  }, [handleRefreshQuotes]);

  const {
    liquidatingCDT, liquidationAccountId, setLiquidationAccountId,
    liquidationDate, setLiquidationDate, isSubmittingLiquidation,
    handleOpenLiquidation, handleCloseLiquidation, handleConfirmLiquidation
  } = useInvestmentLiquidation({ accounts, onAddTransaction, onUpdateInvestment });

  const {
    portfolioMetrics, filteredInvestments, groupedInvestments,
    allocationByCategory, calculatePositionMetrics
  } = useInvestmentCalculations({ investments, livePrices, selectedCategoryFilter, viewCurrency, trm });

  const handleExecuteAddLot = (assetId, newLot) => {
    if (propAddLot) { propAddLot(assetId, newLot); return; }
    const target = investments.find((i) => i.id === assetId);
    if (target && onUpdateInvestment) onUpdateInvestment(applyNewLot(target, newLot));
  };

  const handleExecuteDeleteLot = (assetId, lotId) => {
    if (propDeleteLot) { propDeleteLot(assetId, lotId); return; }
    const target = investments.find((i) => i.id === assetId);
    if (target && onUpdateInvestment) onUpdateInvestment(applyDeleteLot(target, lotId));
  };

  const handleEditInvestment = (inv) => { setEditingInvestment(inv); setIsFormModalOpen(true); };
  const handleDeleteInvestmentClick = (inv) => { if (confirm(`¿Eliminar la inversión "${inv.name}"?`)) onDeleteInvestment(inv.id); };

  return (
    <div className="space-y-2.5 pb-36 animate-fadeIn">
      <PortfolioSummaryHeader portfolioMetrics={portfolioMetrics} allocationByCategory={allocationByCategory} trm={trm} />
      <InvestmentFilterBar
        categories={INVESTMENT_CATEGORIES} selectedCategory={selectedCategoryFilter}
        onSelectCategory={setSelectedCategoryFilter} viewGrouping={viewGrouping}
        onChangeViewGrouping={setViewGrouping} totalFilteredCount={filteredInvestments.length}
        totalGroupedCount={Object.keys(groupedInvestments).length} investments={investments}
      />

      <div className="flex flex-col gap-2.5">
        {filteredInvestments.length === 0 ? (
          <div className="text-center py-6 px-4 border border-dashed rounded-2xl flex flex-col items-center justify-center" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card-sub)' }}>
            <TrendingUp className="w-7 h-7 opacity-35 mx-auto mb-2 text-emerald-500" />
            <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{investments.length === 0 ? 'No tienes inversiones registradas' : 'No hay inversiones en esta categoría'}</p>
            <button type="button" onClick={investments.length === 0 ? () => { setEditingInvestment(null); setIsFormModalOpen(true); } : () => setSelectedCategoryFilter('all')} className="mt-3.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer">
              {investments.length === 0 ? <><Plus className="w-3.5 h-3.5 stroke-[2.5]" /><span>Registrar primera inversión</span></> : 'Ver todas las inversiones'}
            </button>
          </div>
        ) : viewGrouping === 'flat' ? (
          filteredInvestments.map((inv) => (
            <InvestmentCard
              key={inv.id} investment={inv} metrics={calculatePositionMetrics(inv)}
              viewCurrency={viewCurrency} livePrices={livePrices} trm={trm}
              onEdit={handleEditInvestment} onDelete={handleDeleteInvestmentClick}
              onOpenLiquidation={handleOpenLiquidation} onOpenAddLot={setLotModalAsset} onDeleteLot={handleExecuteDeleteLot}
            />
          ))
        ) : (
          <InvestmentBankGroup
            groupedInvestments={groupedInvestments} viewCurrency={viewCurrency}
            livePrices={livePrices} trm={trm} expandedBanks={expandedBanks}
            onToggleBank={toggleBankExpand} onEditInvestment={handleEditInvestment}
            onDeleteInvestment={handleDeleteInvestmentClick} onOpenLiquidation={handleOpenLiquidation}
            onOpenAddLot={setLotModalAsset} onDeleteLot={handleExecuteDeleteLot}
          />
        )}
      </div>

      <InvestmentFormModal
        isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} initialInvestment={editingInvestment}
        onSave={(data) => { if (editingInvestment) onUpdateInvestment(data); else onAddInvestment(data); }} onDelete={onDeleteInvestment}
      />
      <AddLotModal isOpen={Boolean(lotModalAsset)} onClose={() => setLotModalAsset(null)} asset={lotModalAsset} onAddLot={handleExecuteAddLot} />
      <CDTLiquidationModal
        liquidatingCDT={liquidatingCDT} accounts={accounts} liquidationAccountId={liquidationAccountId}
        setLiquidationAccountId={setLiquidationAccountId} liquidationDate={liquidationDate} setLiquidationDate={setLiquidationDate}
        isSubmittingLiquidation={isSubmittingLiquidation} onClose={handleCloseLiquidation} onConfirm={handleConfirmLiquidation}
      />
    </div>
  );
}
