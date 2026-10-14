import React from 'react';
import { createPortal } from 'react-dom';
import DebtFormModal from './DebtFormModal';

/**
 * AddLoanModal
 * Wrapper estandarizado con createPortal en document.body y z-[99999].
 */
export default function AddLoanModal({ 
  isOpen = true, 
  onClose, 
  onSave, 
  initialType = 'receivable', 
  defaultType, 
  ...props 
}) {
  if (!isOpen) return null;

  const resolvedType = defaultType || initialType;

  const content = (
    <div className="relative z-[99999]">
      <DebtFormModal 
        isOpen={isOpen} 
        onClose={onClose} 
        onSave={onSave} 
        initialType={resolvedType} 
        defaultType={resolvedType} 
        {...props} 
      />
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
