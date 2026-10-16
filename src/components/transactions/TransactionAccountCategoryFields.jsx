import React from 'react';
import CategoryBottomSheetPicker from '../categories/components/CategoryBottomSheetPicker';
import AccountCombobox from '../accounts/components/AccountCombobox';

export default function TransactionAccountCategoryFields({
  type,
  accountId,
  setAccountId,
  accounts = [],
  onAddAccount,
  categoryId,
  setCategoryId,
  categories = [],
  availableCategories,
  onAddCategory,
  subcategoryId,
  setSubcategoryId,
  availableSubcategories,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  date,
  setDate
}) {
  const catsToUse = availableCategories || categories;

  return (
    <>
      {/* Categoría Unificada con Subcategoría Contextual */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5 select-none">
          Categoría *
        </label>
        <CategoryBottomSheetPicker
          categories={catsToUse}
          selectedCategoryId={categoryId}
          onSelectCategory={setCategoryId}
          selectedSubcategoryId={subcategoryId}
          onSelectSubcategory={setSubcategoryId}
          onAddCategory={onAddCategory}
          onAddSubcategory={onAddSubcategory}
          type={type}
        />
      </div>

      {/* Cuenta y Fecha */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">
            Cuenta / Método *
          </label>
          <AccountCombobox
            accounts={accounts}
            selectedAccountId={accountId}
            onSelectAccount={setAccountId}
            onAddAccount={onAddAccount}
          />
        </div>

        {date !== undefined && setDate !== undefined && (
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">
              Fecha *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 px-3.5 text-sm bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all"
            />
          </div>
        )}
      </div>
    </>
  );
}
