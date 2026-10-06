import React, { useState } from 'react';
import LoansAndDebts from './LoansAndDebts';
import DebtModal from './DebtModal';

/**
 * LoansView
 * Muestra el módulo de préstamos y deudas preseleccionando 'receivable' (Me deben).
 */
export default function LoansView({
  initialTab = 'receivable',
  onOpenAddDebt,
  onOpenAddLoan,
  setIsAddLoanOpen,
  ...props
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <LoansAndDebts 
        initialTab={activeTab} 
        onOpenAddDebt={() => {
          setActiveTab('payable');
          if (onOpenAddDebt) onOpenAddDebt('payable');
          else setIsModalOpen(true);
        }}
        onOpenAddLoan={() => {
          setActiveTab('receivable');
          if (onOpenAddLoan) onOpenAddLoan('receivable');
          else setIsModalOpen(true);
        }}
        setIsAddLoanOpen={(val) => {
          if (typeof val === 'string') {
            setActiveTab(val);
            if (setIsAddLoanOpen) setIsAddLoanOpen(val);
            else setIsModalOpen(true);
          } else if (setIsAddLoanOpen) {
            setIsAddLoanOpen(val);
          } else {
            setIsModalOpen(Boolean(val));
          }
        }}
        {...props} 
      />
      {isModalOpen && (
        <DebtModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialType={activeTab}
          defaultType={activeTab}
          onSave={(newItem) => {
            if (props.onAddDebtOrLoan) props.onAddDebtOrLoan(newItem);
            setIsModalOpen(false);
          }}
        />
      )}
    </>
  );
}

export { DebtModal };
