import React from 'react';
import DebtCard from './DebtCard';

/**
 * DebtCardItem
 * Renderizado de tarjeta de deuda individual con badges de estado, progreso y acciones.
 */
export default function DebtCardItem({
  item,
  debt,
  stats,
  onPayment,
  onAddPayment,
  onEdit,
  onDelete,
  onAddDisbursement,
  onShareReceipt,
  onDeletePayment,
  formatMoney,
  formatCurrency
}) {
  const actualDebt = item || debt;
  const actualPaymentFn = onPayment || onAddPayment;
  const actualFormatFn = formatMoney || formatCurrency;

  return (
    <DebtCard
      debt={actualDebt}
      stats={stats}
      formatCurrency={actualFormatFn}
      onAddPayment={actualPaymentFn}
      onAddDisbursement={onAddDisbursement}
      onShareReceipt={onShareReceipt}
      onEdit={onEdit}
      onDelete={onDelete}
      onDeletePayment={onDeletePayment}
    />
  );
}
