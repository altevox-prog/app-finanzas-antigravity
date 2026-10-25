import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
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

  const handleSaveInvestmentWithAccounting = async (data) => {
    if (editingInvestment) {
      await onUpdateInvestment(data);
    } else {
      await onAddInvestment(data);
      if (data.deductFromAccount && data.originAccountId && onAddTransaction) {
        const targetAccount = accounts.find((a) => a.id === data.originAccountId);
        const rawInvested = Number(data.investedAmount || data.buyPrice || data.amount || 0);
        const invCurr = (data.currency || 'COP').toUpperCase();
        const accCurr = (targetAccount?.currency || 'COP').toUpperCase();

        let finalDeductAmount = rawInvested;
        if (invCurr === 'USD' && accCurr === 'COP') finalDeductAmount = Math.round(rawInvested * (trm || 4050));
        else if (invCurr === 'COP' && accCurr === 'USD') finalDeductAmount = Number(((rawInvested / (trm || 4050))).toFixed(2));

        const entityOrName = data.institution || data.bank || data.name || data.ticker || 'Inversión';
        const txTitle = `Desembolso Inversión: ${entityOrName}`;
        const txDate = data.startDate || data.start_date || new Date().toISOString().split('T')[0];

        const txOutflow = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('tx-inv-out-' + Date.now()),
          date: txDate,
          type: 'expense',
          amount: finalDeductAmount,
          accountId: targetAccount ? targetAccount.id : data.originAccountId,
          accountName: targetAccount ? targetAccount.name : 'Cuenta Principal',
          category: 'Inversiones / Desembolso',
          categoryId: 'cat-inversiones',
          categoryName: 'Inversiones',
          subcategoryId: 'sub-desembolso-capital',
          subcategoryName: 'Desembolso Capital',
          isCapitalOutflow: true,
          isTransfer: true,
          displayName: txTitle,
          description: txTitle,
          note: txTitle
        };
        await onAddTransaction(txOutflow);
      }
    }
  };

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
        accounts={accounts} onSave={handleSaveInvestmentWithAccounting} onDelete={onDeleteInvestment}
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
