import React from 'react';
import InvestmentFormModal from './InvestmentFormModal';

/**
 * AddInvestmentModal
 * Modal estandarizado de Inversión montado en document.body con z-[99999].
 */
export default function AddInvestmentModal({
  isOpen = true,
  onClose,
  onSave,
  onDelete,
  initialData,
  initialInvestment,
  ...props
}) {
  if (!isOpen) return null;

  return (
    <InvestmentFormModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
      initialInvestment={initialInvestment || initialData}
      {...props}
    />
  );
}
