import { useState, useEffect } from 'react';

export const CATEGORY_STORAGE_KEYS = ['finanzas_categories_v3', 'categories', 'user_categories'];

export const getStoredCategories = (fallback = []) => {
  for (const key of CATEGORY_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // continuar
    }
  }
  return fallback;
};

export const saveStoredCategories = (categoriesList) => {
  CATEGORY_STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.setItem(key, JSON.stringify(categoriesList));
    } catch (e) {
      console.error(`Error saving to ${key}:`, e);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('categories-updated', { detail: categoriesList }));
  }
};

/**
 * useRecurringCategories
 * Custom hook para gestionar sincronización reactiva, almacenamiento local y
 * creación instantánea de categorías y subcategorías en pagos recurrentes.
 */
export function useRecurringCategories(
  categoriesOrOptions = [],
  onAddCategory,
  onAddSubcategory,
  categoryId,
  setCategoryId,
  subcategoryId,
  setSubcategoryId,
  type = 'expense',
  isOpen = true
) {
  // Soporta tanto llamada por objeto de configuración como parámetros posicionales
  const isObject = categoriesOrOptions && typeof categoriesOrOptions === 'object' && !Array.isArray(categoriesOrOptions);
  const {
    categories = [],
    onAddCategory: propOnAddCategory,
    onAddSubcategory: propOnAddSubcategory,
    categoryId: propCategoryId,
    setCategoryId: propSetCategoryId,
    subcategoryId: propSubcategoryId,
    setSubcategoryId: propSetSubcategoryId,
    type: propType = 'expense',
    isOpen: propIsOpen = true
  } = isObject
    ? categoriesOrOptions
    : {
        categories: categoriesOrOptions,
        onAddCategory,
        onAddSubcategory,
        categoryId,
        setCategoryId,
        subcategoryId,
        setSubcategoryId,
        type,
        isOpen
      };

  // Estado reactivo y sincronizado de categorías
  const [localCategories, setLocalCategories] = useState(() => {
    return getStoredCategories(categories);
  });

  // Sincronizar categorías cuando cambia la prop o se abre el modal
  useEffect(() => {
    if (categories && categories.length > 0) {
      setLocalCategories(categories);
    } else {
      setLocalCategories(getStoredCategories([]));
    }
  }, [categories, propIsOpen]);

  // Escuchar eventos globales de sincronización de categorías
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUpdate = (e) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setLocalCategories(e.detail);
      } else {
        setLocalCategories(getStoredCategories([]));
      }
    };
    window.addEventListener('categories-updated', handleUpdate);
    return () => window.removeEventListener('categories-updated', handleUpdate);
  }, []);

  // Manejo de creación instantánea de categoría con sincronización a localStorage y selección automática
  const handleAddNewCategory = (newCat) => {
    const categoryToAdd = {
      id: newCat.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'cat-' + Date.now()),
      name: newCat.name.trim(),
      type: newCat.type || propType,
      color: newCat.color || '#34C759',
      icon: newCat.icon || (newCat.type === 'income' ? '💰' : '🏷️'),
      subcategories: newCat.subcategories || []
    };

    setLocalCategories((prev) => {
      const exists = prev.some(
        (c) => c.id === categoryToAdd.id ||
               c.name.trim().toLowerCase() === categoryToAdd.name.trim().toLowerCase()
      );
      if (exists) return prev;
      const updated = [...prev, categoryToAdd];
      saveStoredCategories(updated);
      return updated;
    });

    if (propSetCategoryId) {
      propSetCategoryId(categoryToAdd.id);
    }
    if (propSetSubcategoryId) {
      propSetSubcategoryId('');
    }

    if (propOnAddCategory) {
      propOnAddCategory(categoryToAdd);
    }
    return categoryToAdd;
  };

  // Manejo de creación instantánea de subcategoría
  const handleAddNewSubcategory = (parentCatId, subcategoryName) => {
    const trimmedName = subcategoryName.trim();
    const newSub = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sub-' + Date.now(),
      name: trimmedName
    };

    setLocalCategories((prev) => {
      const updated = prev.map((cat) => {
        if (cat.id !== parentCatId) return cat;
        const subExists = (cat.subcategories || []).some(
          (s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase()
        );
        if (subExists) return cat;
        return {
          ...cat,
          subcategories: [...(cat.subcategories || []), newSub]
        };
      });
      saveStoredCategories(updated);
      return updated;
    });

    if (propSetSubcategoryId) {
      propSetSubcategoryId(newSub.id);
    }

    if (propOnAddSubcategory) {
      propOnAddSubcategory(parentCatId, subcategoryName);
    }
    return newSub;
  };

  // Categories filtradas por tipo a partir de localCategories
  const safeLocalCategories = Array.isArray(localCategories) ? localCategories.filter(Boolean) : [];
  const availableCategories = safeLocalCategories.filter((c) => c && (c.type === propType || !c.type));
  const selectedCategory = safeLocalCategories.find((c) => c && c.id === propCategoryId) || availableCategories[0] || null;
  const availableSubcategories = (Array.isArray(selectedCategory?.subcategories) ? selectedCategory.subcategories : []).filter(Boolean);

  // Seleccionar primera categoría válida cuando cambia el tipo
  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.some((c) => c && c.id === propCategoryId)) {
      if (propSetCategoryId) {
        propSetCategoryId(availableCategories[0]?.id || '');
      }
    }
  }, [propType, availableCategories, propCategoryId, propSetCategoryId]);

  // Resetear subcategoría si la categoría cambia
  useEffect(() => {
    if (availableSubcategories.length > 0) {
      if (!availableSubcategories.some((s) => s && s.id === propSubcategoryId)) {
        if (propSetSubcategoryId) {
          propSetSubcategoryId(availableSubcategories[0]?.id || '');
        }
      }
    } else {
      if (propSetSubcategoryId) {
        propSetSubcategoryId('');
      }
    }
  }, [propCategoryId, availableSubcategories, propSubcategoryId, propSetSubcategoryId]);

  return {
    localCategories,
    setLocalCategories,
    availableCategories,
    availableSubcategories,
    selectedCategory,
    handleAddNewCategory,
    handleAddNewSubcategory
  };
}

export default useRecurringCategories;
