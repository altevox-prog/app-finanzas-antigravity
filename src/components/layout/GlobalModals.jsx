import React from 'react';
import QuickActionsModal from '../common/QuickActionsModal';
import ModalContainer from '../ui/ModalContainer';

/**
 * GlobalModals
 * Componente unificador de modales globales y menús emergentes de la aplicación.
 * Orquesta QuickActionsModal (menú flotante de acción rápida '+') y
 * ModalContainer (gestor central de formularios, filtros y overlays).
 */
export default function GlobalModals({
  modalControls,
  financeData = {},
  financeActions = {},
  onLogout,
  isActionMenuOpen,
  setIsActionMenuOpen,
  handleOpenTransaction,
  handleOpenTransfer,
  handleOpenRecurring,
  handleOpenAddDebt,
  handleOpenAddLoan,
  handleOpenInvestment,
  handleTabChange,
  ...rest
}) {
  const mergedControls = modalControls || rest.modalControls || rest;

  return (
    <>
      {/* 1. Menú Modal del Botón '+' de Acciones Rápidas */}
      <QuickActionsModal
        isOpen={Boolean(isActionMenuOpen)}
        onClose={() => setIsActionMenuOpen && setIsActionMenuOpen(false)}
        setIsOpen={setIsActionMenuOpen}
        modalControls={mergedControls}
        onAddExpense={() => {
          if (handleOpenTransaction) handleOpenTransaction('expense');
          else if (mergedControls?.openAddTransaction) mergedControls.openAddTransaction('expense');
        }}
        onAddIncome={() => {
          if (handleOpenTransaction) handleOpenTransaction('income');
          else if (mergedControls?.openAddTransaction) mergedControls.openAddTransaction('income');
        }}
        onOpenTransaction={handleOpenTransaction || (() => mergedControls?.openAddTransaction?.('expense'))}
        onOpenNewTransaction={handleOpenTransaction || (() => mergedControls?.openAddTransaction?.('expense'))}
        openModal={(modalName) => {
          if (modalName === 'expense' || modalName === 'income' || modalName === 'transaction') {
            if (handleOpenTransaction) handleOpenTransaction(modalName === 'income' ? 'income' : 'expense');
            else mergedControls?.openAddTransaction?.(modalName === 'income' ? 'income' : 'expense');
          } else if (modalName === 'transfer') {
            if (handleOpenTransfer) handleOpenTransfer();
            else mergedControls?.openTransfer?.();
          } else if (modalName === 'recurring') {
            if (handleOpenRecurring) handleOpenRecurring();
            else mergedControls?.openAddRecurring?.();
          } else if (modalName === 'debt') {
            if (handleOpenAddDebt) handleOpenAddDebt('payable');
            else mergedControls?.openAddLoan?.('payable');
          } else if (modalName === 'loan') {
            if (handleOpenAddLoan) handleOpenAddLoan('receivable');
            else mergedControls?.openAddLoan?.('receivable');
          } else if (modalName === 'investment') {
            if (handleOpenInvestment) handleOpenInvestment();
            else mergedControls?.openAddInvestment?.();
          }
        }}
        onOpenTransfer={handleOpenTransfer || (() => mergedControls?.openTransfer?.())}
        onOpenInvestment={handleOpenInvestment || (() => mergedControls?.openAddInvestment?.())}
        onOpenRecurring={handleOpenRecurring || (() => mergedControls?.openAddRecurring?.())}
        onOpenAddRecurring={handleOpenRecurring || (() => mergedControls?.openAddRecurring?.())}
        onOpenLoan={() => {
          if (handleOpenAddLoan) handleOpenAddLoan('receivable');
          else if (mergedControls?.openAddLoan) mergedControls.openAddLoan('receivable');
        }}
        onOpenAddLoan={() => {
          if (handleOpenAddLoan) handleOpenAddLoan('receivable');
          else if (mergedControls?.openAddLoan) mergedControls.openAddLoan('receivable');
        }}
        onOpenDebt={() => {
          if (handleOpenAddDebt) handleOpenAddDebt('payable');
          else if (mergedControls?.openAddLoan) mergedControls.openAddLoan('payable');
        }}
        onOpenAddDebt={() => {
          if (handleOpenAddDebt) handleOpenAddDebt('payable');
          else if (mergedControls?.openAddLoan) mergedControls.openAddLoan('payable');
        }}
        onAddDebtOrLoan={() => {
          if (handleOpenAddDebt) handleOpenAddDebt('payable');
          else if (mergedControls?.openAddLoan) mergedControls.openAddLoan('payable');
        }}
        setActiveTab={handleTabChange}
        financeActions={financeActions}
      />

      {/* 2. Contenedor Orquestador de Modales y Overlays */}
      <ModalContainer
        modalControls={mergedControls}
        {...mergedControls}
        financeData={financeData}
        financeActions={financeActions}
        onLogout={onLogout}
        {...rest}
      />
    </>
  );
}
