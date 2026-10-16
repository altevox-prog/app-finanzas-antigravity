import React, { useState, useEffect } from 'react';
import { HandCoins, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import DebtCardItem from './DebtCardItem';
import DebtMetricsSummary from './DebtMetricsSummary';
import DebtModals from './DebtModals';
import { calculateItemStats, calculateTabTotals } from '../../services/debts/debtCalculationService';
import SegmentedControl from '../common/SegmentedControl';

export default function LoansAndDebts({
  debtsAndLoans, accounts = [], onAddDebtOrLoan, onUpdateDebtOrLoan,
  onAddPayment, onAddDisbursement, onDeletePayment, onDeleteDebtOrLoan,
  onOpenAddDebt, onOpenAddLoan, setIsAddLoanOpen, modalControls, initialTab = 'receivable',
  onBack = null
}) {
  const { formatMoney: formatCurrency } = usePrivacy();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDebtItem, setEditingDebtItem] = useState(null);
  const [selectedItemForReceipt, setSelectedItemForReceipt] = useState(null);
  const [selectedItemForPayment, setSelectedItemForPayment] = useState(null);
  const [selectedItemForDisbursement, setSelectedItemForDisbursement] = useState(null);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const handleOpenCreateModal = () => {
    const targetType = (activeTab === 'payable' || activeTab === 'borrowed' || activeTab === 'debo') ? 'payable' : 'receivable';
    if (modalControls) {
      if (targetType === 'payable') return modalControls.openAddDebt?.('payable') ?? modalControls.openAddLoan?.('payable');
      return modalControls.openAddLoan?.('receivable') ?? modalControls.openAddDebt?.('receivable');
    }
    const opener = targetType === 'payable' ? (onOpenAddDebt || onOpenAddLoan) : (onOpenAddLoan || onOpenAddDebt);
    if (opener) opener(targetType);
    else if (setIsAddLoanOpen) setIsAddLoanOpen(targetType);
    else setIsCreateModalOpen(true);
  };

  const safeLoans = Array.isArray(debtsAndLoans) ? debtsAndLoans : [];
  const filteredItems = safeLoans.filter(item => item?.type === activeTab);
  const tabTotals = calculateTabTotals(filteredItems, calculateItemStats);

  return (
    <div className="space-y-4 px-4 sm:px-6">
      <div className="ios-card p-4 sm:p-5">
        {/* Segmented Control */}
        <div className="w-full mb-4">
          <SegmentedControl
            options={[
              { id: 'receivable', label: 'Préstamo', icon: ArrowUpRight, count: safeLoans.filter(d => d.type === 'receivable').length },
              { id: 'payable', label: 'Deuda', icon: ArrowDownLeft, count: safeLoans.filter(d => d.type === 'payable').length }
            ]}
            value={activeTab} onChange={setActiveTab} size="md"
          />
        </div>

        {/* Resumen de Métricas */}
        <DebtMetricsSummary
          activeTab={activeTab} tabTotals={tabTotals}
          formatCurrency={formatCurrency} filteredItemsCount={filteredItems.length}
        />

        {/* Lista de Registros unificada */}
        {filteredItems.length === 0 ? (
          <div 
            className="text-center py-8 px-4 border border-dashed rounded-2xl"
            style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          >
            <HandCoins className="w-9 h-9 opacity-30 mx-auto mb-2" />
            <h4 className="text-xs font-bold opacity-80">
              {activeTab === 'receivable' ? 'No tienes préstamos por cobrar registrados' : 'No tienes deudas por pagar registradas'}
            </h4>
            <p className="text-[11px] opacity-50 mt-1">
              Usa el botón central (+) para agregar un nuevo registro.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <DebtCardItem
                key={item.id} item={item} stats={calculateItemStats(item)} formatMoney={formatCurrency}
                onPayment={setSelectedItemForPayment} onAddDisbursement={setSelectedItemForDisbursement}
                onShareReceipt={setSelectedItemForReceipt} onEdit={setEditingDebtItem}
                onDelete={onDeleteDebtOrLoan} onDeletePayment={onDeletePayment}
              />
            ))}
          </div>
        )}
      </div>

      {/* Contenedor de Modales de Deudas */}
      <DebtModals
        isCreateModalOpen={isCreateModalOpen} setIsCreateModalOpen={setIsCreateModalOpen}
        activeTab={activeTab} onAddDebtOrLoan={onAddDebtOrLoan}
        selectedItemForPayment={selectedItemForPayment} setSelectedItemForPayment={setSelectedItemForPayment}
        accounts={accounts} onAddPayment={onAddPayment} formatCurrency={formatCurrency}
        selectedItemForDisbursement={selectedItemForDisbursement} setSelectedItemForDisbursement={setSelectedItemForDisbursement}
        onAddDisbursement={onAddDisbursement} editingDebtItem={editingDebtItem} setEditingDebtItem={setEditingDebtItem}
        onUpdateDebtOrLoan={onUpdateDebtOrLoan} selectedItemForReceipt={selectedItemForReceipt} setSelectedItemForReceipt={setSelectedItemForReceipt}
      />
    </div>
  );
}
