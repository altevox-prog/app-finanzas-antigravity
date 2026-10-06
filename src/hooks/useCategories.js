import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { DEFAULT_CATEGORIES } from '../data/initialData';
import { toast } from '../utils/toast';

const legacyIconMap = {
  Utensils: '🍔', Home: '🏠', Car: '🚗', Zap: '💡', Film: '🍿',
  HeartPulse: '💊', Activity: '💊', GraduationCap: '📚', Briefcase: '💼',
  TrendingUp: '📈', ShoppingBag: '🛍️', Plane: '✈️', Smartphone: '📱',
  Gift: '🎁', Coins: '💰', DollarSign: '💰', Wallet: '👛',
  CreditCard: '💳', PiggyBank: '💰', Tag: '🏷️'
};

const nameToEmoji = {
  'Comida / Restaurantes': '🍔', 'Alimentación': '🍔', 'Transporte': '🚗',
  'Vivienda / Hogar': '🏠', 'Vivienda': '🏠', 'Entretenimiento': '🍿',
  'Salud / Cuidado': '💊', 'Salud': '💊', 'Salud y Bienestar': '💊',
  'Educación': '📚', 'Compras / Ropa': '🛍️', 'Compras': '🛍️', 'Ingresos': '💰'
};

const subcatEmojiMap = {
  'Café': '☕ Café', 'Mercado': '🛒 Mercado', 'Domicilios': '🍕 Domicilios', 'Salidas': '🍻 Salidas',
  'Gasolina': '⛽ Gasolina', 'Taxi/Uber': '🚕 Taxi/Uber', 'Taxi': '🚕 Taxi/Uber', 'Pasajes': '🚌 Pasajes',
  'Mantenimiento': '🔧 Mantenimiento', 'Arriendo': '🔑 Arriendo', 'Luz': '💡 Luz', 'Agua': '💧 Agua',
  'Internet': '🌐 Internet', 'Cine': '🎬 Cine', 'Videojuegos': '🎮 Videojuegos', 'Viajes': '✈️ Viajes',
  'Suscripciones': '🎵 Suscripciones', 'Citas médicas': '🏥 Citas médicas', 'Aseo personal': '🧴 Aseo personal',
  'Gimnasio': '🏋️ Gimnasio', 'Universidad': '🎓 Universidad', 'Libros': '📖 Libros', 'Cursos': '💻 Cursos',
  'Ropa': '👕 Ropa', 'Calzado': '👟 Calzado', 'Tecnología': '📱 Tecnología', 'Salario': '💼 Salario',
  'Inversiones': '📈 Inversiones', 'Regalos': '🎁 Regalos'
};

function getInitialCategories() {
  const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES) || localStorage.getItem('categories');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const processed = parsed.map((c) => {
          let icon = c.icon;
          if (icon && legacyIconMap[icon]) {
            icon = legacyIconMap[icon];
          } else if (!icon || (!(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F0FF}\u{1F900}-\u{1F9FF}]/u.test(icon)) && nameToEmoji[c.name])) {
            icon = nameToEmoji[c.name] || icon;
          }

          let subcategories = c.subcategories;
          if (Array.isArray(subcategories)) {
            subcategories = subcategories.map((sub) => {
              if (sub && sub.name && subcatEmojiMap[sub.name]) {
                return { ...sub, name: subcatEmojiMap[sub.name] };
              }
              return sub;
            });
          }

          let color = c.color;
          if (c.name?.toLowerCase() === 'alimentación' && (color === '#FF3B30' || color?.toLowerCase() === '#ef4444' || color?.toLowerCase() === '#dc2626')) {
            color = '#FF9500';
          }

          return { ...c, icon, subcategories, color };
        });

        // Asegurar que si el usuario tenía el catálogo antiguo de 7 u 8 categorías, se completen las 14 categorías
        if (processed.length < DEFAULT_CATEGORIES.length) {
          const existingNames = new Set(processed.map((c) => c.name?.trim().toLowerCase()));
          const missing = DEFAULT_CATEGORIES.filter((c) => !existingNames.has(c.name?.trim().toLowerCase()));
          return [...processed, ...missing];
        }

        return processed;
      }
    } catch (e) {
      console.error('Error parseando categorías:', e);
    }
  }
  return DEFAULT_CATEGORIES;
}

export function useCategories({ isResettingRef, onCategoryUpdated, onSubcategoryUpdated } = {}) {
  const [categories, setCategories] = useState(getInitialCategories);

  // Persistencia reactiva en localStorage
  useEffect(() => {
    if (isResettingRef?.current) return;
    try {
      const serialized = JSON.stringify(categories);
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, serialized);
      localStorage.setItem('categories', serialized);
    } catch (e) {
      console.error('Error guardando categorías:', e);
    }
  }, [categories, isResettingRef]);

  // Sincronización con eventos globales ('categories-updated')
  useEffect(() => {
    const handleCategoriesUpdated = (e) => {
      if (e?.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setCategories(e.detail);
      } else {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES) || localStorage.getItem('categories');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) setCategories(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('categories-updated', handleCategoriesUpdated);
    return () => window.removeEventListener('categories-updated', handleCategoriesUpdated);
  }, []);

  // Category Actions
  const handleAddCategory = useCallback((newCat) => {
    const catToAdd = {
      ...newCat,
      id: newCat.id || crypto.randomUUID()
    };
    setCategories((prev) => {
      const exists = prev.some(
        (c) => c.id === catToAdd.id ||
               c.name.trim().toLowerCase() === catToAdd.name.trim().toLowerCase()
      );
      if (exists) return prev;
      const updated = [...prev, catToAdd];
      try { localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated)); } catch {}
      try { localStorage.setItem('categories', JSON.stringify(updated)); } catch {}
      return updated;
    });
    return catToAdd;
  }, []);

  const handleUpdateCategory = useCallback((updatedCat) => {
    setCategories((prev) => {
      const updated = prev.map((c) => (c.id === updatedCat.id ? updatedCat : c));
      try { localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated)); } catch {}
      try { localStorage.setItem('categories', JSON.stringify(updated)); } catch {}
      return updated;
    });
    if (onCategoryUpdated) {
      onCategoryUpdated(updatedCat);
    }
  }, [onCategoryUpdated]);

  const handleDeleteCategory = useCallback((catId) => {
    setCategories((prev) => {
      const updated = prev.filter((c) => c.id !== catId);
      try { localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated)); } catch {}
      try { localStorage.setItem('categories', JSON.stringify(updated)); } catch {}
      return updated;
    });
    toast.info('Elemento eliminado');
  }, []);

  // Subcategory Actions
  const handleAddSubcategory = useCallback((categoryId, subcategoryName) => {
    const trimmedName = subcategoryName.trim();
    const newSub = {
      id: crypto.randomUUID(),
      name: trimmedName
    };

    setCategories((prev) => {
      const updated = prev.map((cat) => {
        if (cat.id !== categoryId) return cat;
        const subExists = (cat.subcategories || []).some(
          (s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase()
        );
        if (subExists) return cat;
        return {
          ...cat,
          subcategories: [...(cat.subcategories || []), newSub]
        };
      });
      try { localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated)); } catch {}
      try { localStorage.setItem('categories', JSON.stringify(updated)); } catch {}
      return updated;
    });
    return newSub;
  }, []);

  const handleUpdateSubcategory = useCallback((categoryId, subcategoryId, newName, newColor) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            subcategories: (cat.subcategories || []).map((s) =>
              s.id === subcategoryId
                ? { ...s, name: (newName || s.name).trim(), ...(newColor ? { color: newColor } : {}) }
                : s
            )
          };
        }
        return cat;
      })
    );
    if (newName && onSubcategoryUpdated) {
      onSubcategoryUpdated(subcategoryId, newName);
    }
  }, [onSubcategoryUpdated]);

  const handleDeleteSubcategory = useCallback((categoryId, subcategoryId) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            subcategories: (cat.subcategories || []).filter((s) => s.id !== subcategoryId)
          };
        }
        return cat;
      })
    );
  }, []);

  const resetCategories = useCallback(() => {
    setCategories(DEFAULT_CATEGORIES);
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      localStorage.setItem('categories', JSON.stringify(DEFAULT_CATEGORIES));
    } catch {}
  }, []);

  return {
    categories,
    setCategories,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleAddSubcategory,
    handleUpdateSubcategory,
    handleDeleteSubcategory,
    resetCategories
  };
}
