import { useState, useEffect } from 'react';

export const CATEGORY_STORAGE_KEYS = ['finanzas_categories_v3', 'categories', 'user_categories'];

export const getStoredCategories = (fallback = []) => {
  for (const key of CATEGORY_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return fallback;
};

export const saveStoredCategories = (categoriesList) => {
  CATEGORY_STORAGE_KEYS.forEach((key) => {
    try { localStorage.setItem(key, JSON.stringify(categoriesList)); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('categories-updated', { detail: categoriesList }));
  }
};

export function useRecurringCategories(
  categoriesOrOptions = [], onAddCategory, onAddSubcategory, categoryId, setCategoryId, subcategoryId, setSubcategoryId, type = 'expense', isOpen = true
) {
  const isObject = categoriesOrOptions && typeof categoriesOrOptions === 'object' && !Array.isArray(categoriesOrOptions);
  const p = isObject
    ? categoriesOrOptions
    : { categories: categoriesOrOptions, onAddCategory, onAddSubcategory, categoryId, setCategoryId, subcategoryId, setSubcategoryId, type, isOpen };

  const [localCategories, setLocalCategories] = useState(() => getStoredCategories(p.categories || []));

  useEffect(() => {
    setLocalCategories(p.categories?.length ? p.categories : getStoredCategories([]));
  }, [p.categories?.length, p.isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUpdate = (e) => setLocalCategories(Array.isArray(e?.detail) ? e.detail : getStoredCategories([]));
    window.addEventListener('categories-updated', handleUpdate);
    return () => window.removeEventListener('categories-updated', handleUpdate);
  }, []);

  const handleAddNewCategory = (newCat) => {
    const categoryToAdd = {
      id: newCat.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`),
      name: newCat.name.trim(), type: newCat.type || p.type || 'expense',
      color: newCat.color || '#34C759', icon: newCat.icon || (newCat.type === 'income' ? '💰' : '🏷️'),
      subcategories: newCat.subcategories || []
    };

    setLocalCategories((prev) => {
      const exists = prev.some((c) => c.id === categoryToAdd.id || c.name.trim().toLowerCase() === categoryToAdd.name.trim().toLowerCase());
      if (exists) return prev;
      const updated = [...prev, categoryToAdd];
      saveStoredCategories(updated);
      return updated;
    });

    p.setCategoryId?.(categoryToAdd.id);
    p.setSubcategoryId?.('');
    p.onAddCategory?.(categoryToAdd);
    return categoryToAdd;
  };

  const handleAddNewSubcategory = (parentCatId, subcategoryName) => {
    const trimmed = subcategoryName.trim();
    const newSub = { id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}`, name: trimmed };

    setLocalCategories((prev) => {
      const updated = prev.map((cat) => {
        if (cat.id !== parentCatId) return cat;
        if ((cat.subcategories || []).some((s) => s.name?.trim().toLowerCase() === trimmed.toLowerCase())) return cat;
        return { ...cat, subcategories: [...(cat.subcategories || []), newSub] };
      });
      saveStoredCategories(updated);
      return updated;
    });

    p.setSubcategoryId?.(newSub.id);
    p.onAddSubcategory?.(parentCatId, subcategoryName);
    return newSub;
  };

  const safeList = Array.isArray(localCategories) ? localCategories.filter(Boolean) : [];
  const availableCategories = safeList.filter((c) => c && (c.type === p.type || !c.type));
  const selectedCategory = safeList.find((c) => c && c.id === p.categoryId) || availableCategories[0] || null;
  const availableSubcategories = (Array.isArray(selectedCategory?.subcategories) ? selectedCategory.subcategories : []).filter(Boolean);

  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.some((c) => c.id === p.categoryId)) {
      p.setCategoryId?.(availableCategories[0]?.id || '');
    }
  }, [p.type, p.categoryId, availableCategories.length]);

  useEffect(() => {
    if (availableSubcategories.length > 0) {
      if (!availableSubcategories.some((s) => s.id === p.subcategoryId)) p.setSubcategoryId?.(availableSubcategories[0]?.id || '');
    } else if (p.subcategoryId) {
      p.setSubcategoryId?.('');
    }
  }, [p.categoryId, p.subcategoryId, availableSubcategories.length]);

  return { localCategories, setLocalCategories, availableCategories, availableSubcategories, selectedCategory, handleAddNewCategory, handleAddNewSubcategory };
}

export default useRecurringCategories;
