import React from 'react';
import DebtModal from './DebtFormModal';
import DebtReceiptModal from './DebtReceiptModal';
import AddDisbursementModal from './AddDisbursementModal';
import DebtPaymentModal from './DebtPaymentModal';
import { calculateItemStats } from '../../services/debts/debtCalculationService';

export default function DebtModals({
  isCreateModalOpen,
  setIsCreateModalOpen,
  activeTab,
  onAddDebtOrLoan,
  selectedItemForPayment,
  setSelectedItemForPayment,
  accounts = [],
  onAddPayment,
  formatCurrency,
  selectedItemForDisbursement,
  setSelectedItemForDisbursement,
  onAddDisbursement,
  editingDebtItem,
  setEditingDebtItem,
  onUpdateDebtOrLoan,
  selectedItemForReceipt,
  setSelectedItemForReceipt
}) {
  return (
    <>
      {/* Modal para Crear Deuda o Préstamo */}
      {isCreateModalOpen && (
        <DebtModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          initialType={activeTab}
          defaultType={activeTab}
          onSave={(newItem) => {
            onAddDebtOrLoan?.(newItem);
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* Modal para Registrar Abono / Pago */}
      {selectedItemForPayment && (
        <DebtPaymentModal
          isOpen={!!selectedItemForPayment}
          onClose={() => setSelectedItemForPayment(null)}
          item={selectedItemForPayment}
          stats={calculateItemStats(selectedItemForPayment)}
          accounts={accounts}
          onConfirmPayment={onAddPayment}
          formatMoney={formatCurrency}
        />
      )}

      {/* Modal para Añadir Desembolso */}
      {selectedItemForDisbursement && (
        <AddDisbursementModal
          isOpen={!!selectedItemForDisbursement}
          onClose={() => setSelectedItemForDisbursement(null)}
          debt={selectedItemForDisbursement}
          accounts={accounts}
          onSaveDisbursement={(debtId, disbData) => {
            onAddDisbursement?.(debtId, disbData);
            setSelectedItemForDisbursement(null);
          }}
          formatMoney={formatCurrency}
        />
      )}

      {/* Modal para Editar Deuda / Préstamo */}
      {editingDebtItem && (
        <DebtModal
          isOpen={!!editingDebtItem}
          onClose={() => setEditingDebtItem(null)}
          editingItem={editingDebtItem}
          initialType={editingDebtItem.type}
          defaultType={editingDebtItem.type}
          onSave={(updated) => {
            onUpdateDebtOrLoan?.(updated);
            setEditingDebtItem(null);
          }}
        />
      )}

      {/* Modal para Compartir Estado de Cuenta */}
      {selectedItemForReceipt && (
        <DebtReceiptModal
          isOpen={!!selectedItemForReceipt}
          onClose={() => setSelectedItemForReceipt(null)}
          debt={selectedItemForReceipt}
          stats={calculateItemStats(selectedItemForReceipt)}
          formatMoney={formatCurrency}
        />
      )}
    </>
  );
}
