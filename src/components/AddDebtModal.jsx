import React from 'react';
import DebtFormModal from './DebtFormModal';

export default function AddDebtModal({ 
  isOpen = true, 
  onClose, 
  onSave, 
  initialType = 'payable', 
  defaultType,
  ...props 
}) {
  if (!isOpen) return null;
  const resolvedType = defaultType || initialType;
  return (
    <DebtFormModal 
      isOpen={isOpen} 
      onClose={onClose} 
      onSave={onSave} 
      initialType={resolvedType} 
      defaultType={resolvedType} 
      {...props} 
    />
  );
}
