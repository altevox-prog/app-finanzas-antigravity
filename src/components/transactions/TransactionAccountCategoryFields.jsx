import React from 'react';
import CategoryCombobox from '../categories/components/CategoryCombobox';
import SubcategoryCombobox from '../categories/components/SubcategoryCombobox';
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

  // Derivación segura de subcategorías si no se pasan explícitamente
  const safeCats = Array.isArray(catsToUse) ? catsToUse.filter(Boolean) : [];
  const activeCategory = safeCats.find(c => c && c.id === categoryId) || null;
  const subcatsToUse = availableSubcategories !== undefined 
    ? availableSubcategories 
    : (Array.isArray(activeCategory?.subcategories) ? activeCategory.subcategories.filter(Boolean) : []);

  return (
    <>
      {/* Categoría y Subcategoría */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">
            Categoría Principal *
          </label>
          <CategoryCombobox
            categories={catsToUse}
            selectedCategoryId={categoryId}
            onSelectCategory={setCategoryId}
            onAddCategory={onAddCategory}
            type={type}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">
            Subcategoría
          </label>
          <SubcategoryCombobox
            subcategories={subcatsToUse}
            selectedSubcategoryId={subcategoryId}
            onSelectSubcategory={setSubcategoryId}
            onAddSubcategory={onAddSubcategory}
            onUpdateSubcategory={onUpdateSubcategory}
            onDeleteSubcategory={onDeleteSubcategory}
            parentCategoryId={categoryId}
            placeholder={categoryId ? "Selecciona o escribe..." : "Elige categoría"}
          />
        </div>
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
