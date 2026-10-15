import React from 'react';
import confetti from 'canvas-confetti';
import AddDebtPaymentModal from './AddDebtPaymentModal';

/**
 * DebtPaymentModal
 * Modal para registrar abonos/pagos discriminando capital e intereses, con celebración (confetti) al liquidar.
 */
export default function DebtPaymentModal({
  isOpen,
  onClose,
  item,
  debt,
  stats,
  accounts = [],
  onConfirmPayment,
  onSavePayment,
  formatMoney
}) {
  const currentItem = item || debt;
  if (!isOpen || !currentItem) return null;

  const handleSavePayment = (debtId, paymentData) => {
    const balance = stats?.outstandingBalance ?? currentItem?.outstandingBalance ?? 0;
    const capitalPaid = paymentData?.capitalAmount || paymentData?.amount || 0;
    const willBePaid = (balance - capitalPaid) <= 1;

    if (typeof onConfirmPayment === 'function') {
      onConfirmPayment(debtId, paymentData);
    } else if (typeof onSavePayment === 'function') {
      onSavePayment(debtId, paymentData);
    }

    if (willBePaid) {
      try {
        confetti({
          particleCount: 120,
          spread: 75,
          origin: { y: 0.65 }
        });
      } catch {}
    }

    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <AddDebtPaymentModal
      isOpen={Boolean(isOpen)}
      onClose={onClose}
      debt={currentItem}
      stats={stats}
      accounts={accounts}
      onSavePayment={handleSavePayment}
      formatMoney={formatMoney}
    />
  );
}
