import React, { useState, useEffect } from 'react';
import { HandCoins, ArrowUpRight, ArrowDownLeft, ArrowLeft } from 'lucide-react';
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
        {/* Header con Botón de Regreso y Título */}
        <div className="w-full flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={onBack ? onBack : () => {
                if (typeof window !== 'undefined' && window.history.length > 2) window.history.back();
              }}
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 active:scale-95 transition-colors cursor-pointer border border-slate-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm shrink-0"
              aria-label="Volver"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] sm:text-[20px] font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <HandCoins className="w-5 h-5 text-[#34C759] shrink-0" />
                <span className="truncate">Préstamos y Deudas</span>
              </h2>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate font-normal mt-0.5">
                {activeTab === 'receivable' ? 'Cuentas por cobrar a terceros' : 'Pasivos y compromisos por pagar'}
              </p>
            </div>
          </div>
        </div>

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
