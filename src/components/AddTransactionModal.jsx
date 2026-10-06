import React from 'react';
import { createPortal } from 'react-dom';
import TransactionForm from './TransactionForm';
import { INITIAL_ACCOUNTS, INITIAL_CATEGORIES } from '../data/initialData';

/**
 * AddTransactionModal
 * Wrapper robusto sobre TransactionForm montado con createPortal en document.body con z-[99999].
 * - Si accounts/categories no llegan como props, los lee de localStorage o usa INITIAL_*.
 * - Soporta tanto onSave como onAddTransaction.
 * - Nunca retorna null ni crashea si los datos están vacíos.
 */
export default function AddTransactionModal({
  isOpen = true,
  onClose,
  onSave,
  onAddTransaction,
  accounts: propAccounts,
  categories: propCategories,
  ...rest
}) {
  if (!isOpen) return null;

  const handleSave = onAddTransaction || onSave;

  // Fallback: si no llegan props, leer de localStorage con guard
  let accounts = Array.isArray(propAccounts) && propAccounts.length > 0 ? propAccounts.filter(Boolean) : [];
  if (accounts.length === 0) {
    try {
      const stored = localStorage.getItem('presu_accounts') || localStorage.getItem('user_accounts') || localStorage.getItem('finanzas_accounts_v3') || '[]';
      const parsed = JSON.parse(stored);
      accounts = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      accounts = [];
    }
  }

  let categories = Array.isArray(propCategories) && propCategories.length > 0 ? propCategories.filter(Boolean) : [];
  if (categories.length === 0) {
    try {
      const stored = localStorage.getItem('finanzas_categories_v3') || localStorage.getItem('categories') || '[]';
      const parsed = JSON.parse(stored);
      categories = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      categories = [];
    }
  }
  if (categories.length === 0) {
    categories = INITIAL_CATEGORIES;
  }

  const content = (
    <div className="relative z-[99999]">
      <TransactionForm
        {...rest}
        accounts={accounts}
        categories={categories}
        onAddTransaction={handleSave}
        isModal={true}
        onClose={onClose}
      />
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
