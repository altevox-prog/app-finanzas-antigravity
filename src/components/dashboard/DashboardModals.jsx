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
 * DashboardModals: Renderizado condicional centralizado de los modales secundarios del Dashboard
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
    if (typeof onAddCategory === 'function') onAddCategory(catPayload);
    if (typeof onClose === 'function') onClose('category');
    setNewCatName('');
  };

  const handleCreateAccount = (acc) => {
    if (typeof onAddAccount === 'function') onAddAccount(acc);
    if (typeof onClose === 'function') onClose('account');
  };

  return (
    <>
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

      {modalsState.isAccountModalOpen && (
        <AddAccountModal
          isOpen={true}
          onClose={() => onClose('account')}
          onCreateAccount={handleCreateAccount}
          trm={trm}
        />
      )}

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

      {selectedTxForDetail && (
        <TransactionDetailModal
          transaction={selectedTxForDetail}
          categories={categories}
          onClose={() => setSelectedTxForDetail(null)}
          onEdit={(tx) => { setSelectedTxForDetail(null); setSelectedTxForEdit(tx); }}
          onDelete={(id) => { onDeleteTransaction?.(id); setSelectedTxForDetail(null); }}
          onViewReceipt={(tx) => setSelectedTxForReceipt(tx)}
        />
      )}

      {selectedTxForEdit && (
        <EditTransactionModal
          transaction={selectedTxForEdit}
          accounts={accounts}
          categories={categories}
          onClose={() => setSelectedTxForEdit(null)}
          onSave={(updated) => { onUpdateTransaction?.(updated); setSelectedTxForEdit(null); }}
          onDelete={(id) => { onDeleteTransaction?.(id); setSelectedTxForEdit(null); }}
          onAddCategory={onAddCategory}
          onAddSubcategory={onAddSubcategory}
          onUpdateSubcategory={onUpdateSubcategory}
          onDeleteSubcategory={onDeleteSubcategory}
          onAddAccount={onAddAccount}
          trm={trm}
        />
      )}

      {selectedTxForReceipt && (
        <ReceiptModal
          transaction={selectedTxForReceipt}
          onClose={() => setSelectedTxForReceipt(null)}
        />
      )}
    </>
  );
}
