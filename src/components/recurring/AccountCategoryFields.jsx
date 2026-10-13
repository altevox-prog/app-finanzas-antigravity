import React from 'react';
import CategoryCombobox from '../CategoryCombobox';
import SubcategoryCombobox from '../SubcategoryCombobox';
import AccountCombobox from '../AccountCombobox';

export default function AccountCategoryFields({
  type,
  categoryId,
  setCategoryId,
  subcategoryId,
  setSubcategoryId,
  localCategories,
  availableSubcategories,
  onAddCategory,
  onAddSubcategory,
  accountId,
  setAccountId,
  accounts = []
}) {
  // Si no se pasa availableSubcategories explícitamente, se puede derivar de localCategories
  const safeCategories = Array.isArray(localCategories) ? localCategories.filter(Boolean) : [];
  const selectedCat = safeCategories.find(c => c && c.id === categoryId) || null;
  const subcats = availableSubcategories !== undefined
    ? availableSubcategories
    : (Array.isArray(selectedCat?.subcategories) ? selectedCat.subcategories.filter(Boolean) : []);

  return (
    <>
      {/* 6. Categoría y Subcategoría */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold opacity-60 mb-1">
            Categoría Principal *
          </label>
          <CategoryCombobox
            categories={localCategories}
            selectedCategoryId={categoryId}
            onSelectCategory={setCategoryId}
            onAddCategory={onAddCategory}
            type={type}
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold opacity-60 mb-1">
            Subcategoría
          </label>
          <SubcategoryCombobox
            subcategories={subcats}
            selectedSubcategoryId={subcategoryId}
            onSelectSubcategory={setSubcategoryId}
            onAddSubcategory={onAddSubcategory}
            parentCategoryId={categoryId}
            placeholder={categoryId ? "Selecciona o escribe..." : "Elige categoría"}
          />
        </div>
      </div>

      {/* 7. Cuenta / Tarjeta Asociada */}
      <div>
        <label className="block text-[11px] font-semibold opacity-60 mb-1">
          Cuenta de Cargo / Método *
        </label>
        <AccountCombobox
          accounts={accounts}
          selectedAccountId={accountId}
          onSelectAccount={setAccountId}
        />
      </div>
    </>
  );
}
