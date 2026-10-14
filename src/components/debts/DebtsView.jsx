import React, { useState } from 'react';
import LoansAndDebts from './LoansAndDebts';

/**
 * DebtsView
 * Muestra el módulo de préstamos y deudas preseleccionando la pestaña activa y
 * delegando la apertura del modal a la fuente única de verdad (ModalContainer).
 */
export default function DebtsView({
  initialTab = 'payable',
  onOpenAddDebt,
  onOpenAddLoan,
  setIsAddLoanOpen,
  ...props
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <LoansAndDebts 
      initialTab={activeTab} 
      onOpenAddDebt={(type = 'payable') => {
        setActiveTab('payable');
        if (onOpenAddDebt) onOpenAddDebt(type);
        else if (setIsAddLoanOpen) setIsAddLoanOpen(type);
      }}
      onOpenAddLoan={(type = 'receivable') => {
        setActiveTab('receivable');
        if (onOpenAddLoan) onOpenAddLoan(type);
        else if (setIsAddLoanOpen) setIsAddLoanOpen(type);
      }}
      setIsAddLoanOpen={(val) => {
        if (typeof val === 'string') {
          setActiveTab(val);
          if (setIsAddLoanOpen) setIsAddLoanOpen(val);
          else if (val === 'payable' && onOpenAddDebt) onOpenAddDebt('payable');
          else if (onOpenAddLoan) onOpenAddLoan('receivable');
        } else if (setIsAddLoanOpen) {
          setIsAddLoanOpen(val);
        }
      }}
      {...props} 
    />
  );
}
