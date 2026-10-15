import React, { useState } from 'react';
import AddTransactionModal from '../transactions/modals/AddTransactionModal';
import DebtFormModal from '../debts/DebtFormModal';
import AddRecurringModal from '../recurring/modals/AddRecurringModal';
import AddAccountModal from '../accounts/modals/AddAccountModal';
import AddCategoryModal from '../categories/modals/AddCategoryModal';
import TransactionDetailModal from '../transactions/modals/TransactionDetailModal';
import EditTransactionModal from '../transactions/modals/EditTransactionModal';
import ReceiptModal from '../transactions/modals/ReceiptModal';

/**
 * DashboardModals
 * Subcomponente para el renderizado condicional de los modales secundarios del Dashboard
 * y gestión de creación rápida (transacciones, deudas, pagos recurrentes, cuentas y categorías)
 * así como detalle y edición de movimientos seleccionados.
 */
export default function DashboardModals({
  modalsState = {},
  onClose = () => {},
  onAddTransaction,
  onAddDebtOrLoan,
  onAddRecurring,
  onAddAccount,
  onAddCategory,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  onUpdateTransaction,
  onDeleteTransaction,
  selectedTxForDetail = null,
  setSelectedTxForDetail = () => {},
  selectedTxForEdit = null,
  setSelectedTxForEdit = () => {},
  selectedTxForReceipt = null,
  setSelectedTxForReceipt = () => {},
  accounts = [],
  categories = [],
  trm = 4050
}) {
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('expense');
  const [newCatColor, setNewCatColor] = useState('#34C759');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');
  const [newCatInitialSub, setNewCatInitialSub] = useState('');

  const handleCreateCategory = (e) => {
    e?.preventDefault?.();
    if (!newCatName.trim()) return;
    const catPayload = {
      id: crypto.randomUUID?.() || Date.now().toString(),
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor,
      icon: newCatIcon,
      subcategories: newCatInitialSub.trim() ? [newCatInitialSub.trim()] : []
    };
    if (typeof onAddCategory === 'function') {
      onAddCategory(catPayload);
    }
    if (typeof onClose === 'function') {
      onClose('category');
    }
    setNewCatName('');
  };

  const handleCreateAccount = (acc) => {
    if (typeof onAddAccount === 'function') {
      onAddAccount(acc);
    }
    if (typeof onClose === 'function') {
      onClose('account');
    }
  };

  return (
    <>
      {/* 1. Modal de Transacción Rápida */}
      {modalsState.isTxModalOpen && (
        <AddTransactionModal
          isOpen={true}
          onClose={() => onClose('transaction')}
          onAddTransaction={onAddTransaction}
          accounts={accounts}
          categories={categories}
          trm={trm}
          defaultType={modalsState.txType || 'expense'}
        />
      )}

      {/* 2. Modal de Deuda / Préstamo */}
      {modalsState.isDebtModalOpen && (
        <DebtFormModal
          isOpen={true}
          onClose={() => onClose('debt')}
          onSave={onAddDebtOrLoan}
          initialType={modalsState.debtType || 'payable'}
          defaultType={modalsState.debtType || 'payable'}
          editingItem={modalsState.editingDebtItem || null}
        />
      )}

      {/* 3. Modal de Pago Recurrente */}
      {modalsState.isRecurringModalOpen && (
        <AddRecurringModal
          isOpen={true}
          onClose={() => onClose('recurring')}
          onSave={onAddRecurring}
          accounts={accounts}
          categories={categories}
          trm={trm}
        />
      )}

      {/* 4. Modal de Cuenta */}
      {modalsState.isAccountModalOpen && (
        <AddAccountModal
          isOpen={true}
          onClose={() => onClose('account')}
          onCreateAccount={handleCreateAccount}
          trm={trm}
        />
      )}

      {/* 5. Modal de Categoría */}
      {modalsState.isCategoryModalOpen && (
        <AddCategoryModal
          isOpen={true}
          onClose={() => onClose('category')}
          newCatName={newCatName}
          setNewCatName={setNewCatName}
          newCatType={newCatType}
          setNewCatType={setNewCatType}
          newCatColor={newCatColor}
          setNewCatColor={setNewCatColor}
          newCatIcon={newCatIcon}
          setNewCatIcon={setNewCatIcon}
          newCatInitialSub={newCatInitialSub}
          setNewCatInitialSub={setNewCatInitialSub}
          onSubmit={handleCreateCategory}
        />
      )}

      {/* 6. Modal de Detalle de Transacción */}
      {selectedTxForDetail && (
        <TransactionDetailModal
          transaction={selectedTxForDetail}
          categories={categories}
          onClose={() => setSelectedTxForDetail(null)}
          onEdit={(tx) => {
            setSelectedTxForDetail(null);
            setSelectedTxForEdit(tx);
          }}
          onDelete={(id) => {
            if (typeof onDeleteTransaction === 'function') {
              onDeleteTransaction(id);
            }
            setSelectedTxForDetail(null);
          }}
          onViewReceipt={(tx) => setSelectedTxForReceipt(tx)}
        />
      )}

      {/* 7. Modal de Edición de Transacción */}
      {selectedTxForEdit && (
        <EditTransactionModal
          transaction={selectedTxForEdit}
          accounts={accounts}
          categories={categories}
          onClose={() => setSelectedTxForEdit(null)}
          onSave={(updated) => {
            if (typeof onUpdateTransaction === 'function') {
              onUpdateTransaction(updated);
            }
            setSelectedTxForEdit(null);
          }}
          onDelete={(id) => {
            if (typeof onDeleteTransaction === 'function') {
              onDeleteTransaction(id);
            }
            setSelectedTxForEdit(null);
          }}
          onAddCategory={onAddCategory}
          onAddSubcategory={onAddSubcategory}
          onUpdateSubcategory={onUpdateSubcategory}
          onDeleteSubcategory={onDeleteSubcategory}
          onAddAccount={onAddAccount}
          trm={trm}
        />
      )}

      {/* 8. Modal de Comprobante / Recibo */}
      {selectedTxForReceipt && (
        <ReceiptModal
          transaction={selectedTxForReceipt}
          onClose={() => setSelectedTxForReceipt(null)}
        />
      )}
    </>
  );
}
