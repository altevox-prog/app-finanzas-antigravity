import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import TransactionForm from '../../TransactionForm';
import { INITIAL_ACCOUNTS, INITIAL_CATEGORIES } from '../../../data/initialData';

/**
 * AddTransactionModal
 * Modal global para la captura y registro de transacciones (ingresos y gastos).
 * Encapsula campos de monto, tipo (ingreso/gasto), categoría, subcategoría, cuenta, fecha, notas y comprobante.
 */
export default function AddTransactionModal({
  isOpen = true,
  onClose,
  onSave,
  onAddTransaction,
  accounts: propAccounts,
  categories: propCategories,
  trm = 4050,
  defaultDate,
  defaultType = 'expense',
  ...rest
}) {
  if (!isOpen) return null;

  const handleSave = onAddTransaction || onSave;

  // Blindaje defensivo de cuentas con fallback a localStorage
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

  // Blindaje defensivo de categorías con fallback a localStorage
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && typeof onClose === 'function') onClose();
      }}
    >
      <TransactionForm
        {...rest}
        accounts={accounts}
        categories={categories}
        onAddTransaction={handleSave}
        isModal={true}
        onClose={onClose}
        trm={trm}
        defaultDate={defaultDate}
        defaultType={defaultType}
      />
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
