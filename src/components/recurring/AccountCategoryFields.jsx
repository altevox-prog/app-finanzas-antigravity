import React from 'react';
import CategoryBottomSheetPicker from '../categories/components/CategoryBottomSheetPicker';
import AccountCombobox from '../accounts/components/AccountCombobox';

/**
 * AccountCategoryFields
 * Subcomponente para los selectores de clasificación del pago recurrente:
 * Categoría principal y subcategoría contextual unificada, y cuenta o método de cargo.
 * Configurado con scope="recurring" para filtrar gastos fijos y suscripciones.
 */
export default function AccountCategoryFields({
  type,
  categoryId,
  setCategoryId,
  subcategoryId,
  setSubcategoryId,
  categories = [],
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
  const categoriesList = availableCategories || localCategories || categories;
  const safeCats = Array.isArray(categoriesList) ? categoriesList.filter(Boolean) : [];

  const accountsList = safeAccounts || accounts;
  const safeAccs = Array.isArray(accountsList) ? accountsList.filter(Boolean) : [];

  return (
    <>
      {/* 1. Categoría Unificada con Subcategoría Contextual (filtrada para pagos recurrentes) */}
      <div>
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-400 mb-1.5 select-none">
          Categoría *
        </label>
        <CategoryBottomSheetPicker
          categories={safeCats}
          selectedCategoryId={categoryId}
          onSelectCategory={setCategoryId}
          selectedSubcategoryId={subcategoryId}
          onSelectSubcategory={setSubcategoryId}
          onAddCategory={onAddCategory}
          onAddSubcategory={onAddSubcategory}
          type={type}
          scope="recurring"
        />
      </div>

      {/* 2. Cuenta / Tarjeta de Cargo Asociada */}
      <div>
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-400 mb-1.5 select-none">
          Cuenta de Cargo / Método *
        </label>
        <AccountCombobox
          accounts={safeAccs}
          selectedAccountId={accountId}
          onSelectAccount={setAccountId}
        />
      </div>
    </>
  );
}
