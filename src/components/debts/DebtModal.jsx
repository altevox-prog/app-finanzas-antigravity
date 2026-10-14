import React from 'react';
import DebtFormModal from './DebtFormModal';

/**
 * DebtModal
 * Componente modal para crear o editar Préstamos y Deudas.
 * Inicializa y sincroniza el tipo con initialType o defaultType.
 */
export default function DebtModal({
  isOpen,
  onClose,
  onSave,
  initialType = 'receivable',
  defaultType,
  editingItem = null,
  ...props
}) {
  const resolvedType = defaultType || initialType;

  return (
    <DebtFormModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={onSave}
      initialType={resolvedType}
      defaultType={resolvedType}
      editingItem={editingItem}
      {...props}
    />
  );
}
