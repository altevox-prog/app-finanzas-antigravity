import React from 'react';
import CategoryBottomSheetPicker from '../categories/components/CategoryBottomSheetPicker';
import AccountCombobox from '../accounts/components/AccountCombobox';

/**
 * AccountCategoryFields
 * Subcomponente para los selectores de clasificación del pago recurrente:
 * Categoría principal y subcategoría contextual unificada, y cuenta o método de cargo.
 *
 * @param {Object} props
 * @param {string} props.type Tipo de flujo ('expense' | 'income')
 * @param {string} props.categoryId ID de categoría seleccionada
 * @param {Function} props.setCategoryId Setter para la categoría
 * @param {string} props.subcategoryId ID de subcategoría seleccionada
 * @param {Function} props.setSubcategoryId Setter para la subcategoría
 * @param {Array} [props.localCategories] Categorías disponibles
 * @param {Array} [props.availableCategories] Alias para categorías disponibles
 * @param {Array} [props.availableSubcategories] Subcategorías filtradas por la categoría activa
 * @param {Function} [props.onAddCategory] Callback de creación rápida de categoría
 * @param {Function} [props.onAddSubcategory] Callback de creación rápida de subcategoría
 * @param {string} props.accountId ID de cuenta de cargo seleccionada
 * @param {Function} props.setAccountId Setter para la cuenta
 * @param {Array} [props.accounts] Lista de cuentas disponibles
 * @param {Array} [props.safeAccounts] Alias de cuentas seguras
 */
export default function AccountCategoryFields({
  type,
  categoryId,
  setCategoryId,
  subcategoryId,
  setSubcategoryId,
  localCategories,
  availableCategories,
  availableSubcategories,
  onAddCategory,
  onAddSubcategory,
  accountId,
  setAccountId,
  accounts = [],
  safeAccounts
}) {
  const categoriesList = Array.isArray(availableCategories)
    ? availableCategories
    : (Array.isArray(localCategories) ? localCategories.filter(Boolean) : []);

  const accountsList = Array.isArray(safeAccounts)
    ? safeAccounts
    : (Array.isArray(accounts) ? accounts.filter(Boolean) : []);

  return (
    <>
      {/* 1. Categoría Unificada */}
      <div>
        <label className="block text-[11px] font-semibold opacity-60 mb-1 select-none">
          Categoría *
        </label>
        <CategoryBottomSheetPicker
          categories={categoriesList}
          selectedCategoryId={categoryId}
          onSelectCategory={setCategoryId}
          selectedSubcategoryId={subcategoryId}
          onSelectSubcategory={setSubcategoryId}
          onAddCategory={onAddCategory}
          onAddSubcategory={onAddSubcategory}
          type={type}
        />
      </div>

      {/* 2. Cuenta / Tarjeta de Cargo Asociada */}
      <div>
        <label className="block text-[11px] font-semibold opacity-60 mb-1">
          Cuenta de Cargo / Método *
        </label>
        <AccountCombobox
          accounts={accountsList}
          selectedAccountId={accountId}
          onSelectAccount={setAccountId}
        />
      </div>
    </>
  );
}
