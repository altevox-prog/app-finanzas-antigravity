import React, { useState, useEffect, useCallback } from 'react';
import { HandCoins, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react';
import { usePrivacy } from '../../context/PrivacyContext';
import DebtCardItem from './DebtCardItem';
import DebtMetricsSummary from './DebtMetricsSummary';
import DebtModals from './DebtModals';
import { calculateItemStats, calculateTabTotals } from '../../services/debts/debtCalculationService';

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

  const handleOpenCreateModal = useCallback(() => {
    const targetType = (activeTab === 'payable' || activeTab === 'borrowed' || activeTab === 'debo') ? 'payable' : 'receivable';
    if (modalControls) {
      if (targetType === 'payable') return modalControls.openAddDebt?.('payable') ?? modalControls.openAddLoan?.('payable');
      return modalControls.openAddLoan?.('receivable') ?? modalControls.openAddDebt?.('receivable');
    }
    const opener = targetType === 'payable' ? (onOpenAddDebt || onOpenAddLoan) : (onOpenAddLoan || onOpenAddDebt);
    if (opener) opener(targetType);
    else if (setIsAddLoanOpen) setIsAddLoanOpen(targetType);
    else setIsCreateModalOpen(true);
  }, [activeTab, modalControls, onOpenAddDebt, onOpenAddLoan, setIsAddLoanOpen]);

  // Escuchar evento global desde TopAppBar
  useEffect(() => {
    const handleOpenAdd = () => {
      handleOpenCreateModal();
    };
    window.addEventListener('monety:open-add-debt', handleOpenAdd);
    return () => {
      window.removeEventListener('monety:open-add-debt', handleOpenAdd);
    };
  }, [handleOpenCreateModal]);

  const safeLoans = Array.isArray(debtsAndLoans) ? debtsAndLoans : [];
  const filteredItems = safeLoans.filter(item => item?.type === activeTab);
  const tabTotals = calculateTabTotals(filteredItems, calculateItemStats);

  return (
    <div className="min-h-full bg-transparent p-4 sm:p-6 pb-32 sm:pb-36 space-y-3 sm:space-y-4 animate-fadeIn">
      {/* 1. Barra de pestañas tipo pastilla compacta y moderna (Aislada contra parpadeo GPU) */}
      <div className="relative isolate bg-white/40 dark:bg-zinc-900/40 border border-slate-900/[0.08] dark:border-white/[0.08] rounded-2xl p-1 flex gap-1 backdrop-blur-xl w-full overflow-hidden select-none">
        {/* Pestaña: Préstamos (Por cobrar) */}
        <button
          type="button"
          onClick={() => setActiveTab('receivable')}
          className={`flex-1 flex items-center justify-center gap-1.5 cursor-pointer px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-colors duration-150 ${
            activeTab === 'receivable'
              ? 'bg-white/60 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs'
              : 'text-slate-700 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-zinc-200 font-semibold hover:bg-white/20'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 shrink-0" />
          <span>Préstamos</span>
          <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono transition-colors duration-150 ${
            activeTab === 'receivable'
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-900/5 dark:bg-white/5 text-slate-600 dark:text-zinc-400'
          }`}>
            {safeLoans.filter(d => d.type === 'receivable').length}
          </span>
        </button>

        {/* Pestaña: Deudas (Por pagar) */}
        <button
          type="button"
          onClick={() => setActiveTab('payable')}
          className={`flex-1 flex items-center justify-center gap-1.5 cursor-pointer px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-colors duration-150 ${
            activeTab === 'payable'
              ? 'bg-white/60 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-bold shadow-xs'
              : 'text-slate-700 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-zinc-200 font-semibold hover:bg-white/20'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 shrink-0" />
          <span>Deudas</span>
          <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono transition-colors duration-150 ${
            activeTab === 'payable'
              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
              : 'bg-slate-900/5 dark:bg-white/5 text-slate-600 dark:text-zinc-400'
          }`}>
            {safeLoans.filter(d => d.type === 'payable').length}
          </span>
        </button>
      </div>

      {/* 2. Hero Card Ejecutiva 3 en 1 */}
      <DebtMetricsSummary
        activeTab={activeTab}
        tabTotals={tabTotals}
        formatCurrency={formatCurrency}
        filteredItemsCount={filteredItems.length}
      />

      {/* 3. Lista de Registros unificada o Estado Vacío */}
      {filteredItems.length === 0 ? (
        <div 
          className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/60 dark:border-white/[0.08] rounded-3xl p-8 sm:p-10 text-center shadow-sm flex flex-col items-center justify-center"
        >
          <HandCoins className="text-emerald-500 dark:text-emerald-400 w-10 h-10 mx-auto" />
          <h4 className="text-slate-800 dark:text-slate-100 font-semibold text-base sm:text-lg mt-3">
            {activeTab === 'receivable' ? 'No tienes préstamos por cobrar registrados' : 'No tienes deudas por pagar registradas'}
          </h4>
          <p className="text-slate-700 dark:text-zinc-300 text-xs sm:text-sm font-medium mt-1 mb-5 max-w-sm mx-auto leading-relaxed">
            {activeTab === 'receivable'
              ? 'Registra préstamos concedidos a terceros para llevar el control de cuotas y abonos.'
              : 'Registra obligaciones financieras, créditos o deudas para monitorear tu amortización.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="bg-emerald-600 hover:bg-emerald-500 dark:bg-gradient-to-r dark:from-emerald-600 dark:to-emerald-400 text-white dark:text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 dark:shadow-[0_0_16px_rgba(16,185,129,0.35)] transition-all active:scale-95 inline-flex items-center gap-2 cursor-pointer text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Registrar {activeTab === 'payable' ? 'nueva deuda' : 'nuevo préstamo'}</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 sm:gap-3">
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

      {/* 4. Contenedor de Modales de Deudas */}
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
