import { useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_CATEGORIES } from '../data/initialData';
import { toast } from '../utils/toast';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { ensureUUID } from '../services/syncEngine';

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

/**
 * Normaliza una categoría procesando iconos legados, subcategorías y colores
 */
export function normalizeCategoryItem(c) {
  if (!c || typeof c !== 'object') return c;

  let icon = c.icon;
  if (icon && legacyIconMap[icon]) {
    icon = legacyIconMap[icon];
  } else if (!icon || (!(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F0FF}\u{1F900}-\u{1F9FF}]/u.test(icon)) && nameToEmoji[c.name])) {
    icon = nameToEmoji[c.name] || icon;
  }

  const rawData = c.raw_data && typeof c.raw_data === 'object' ? c.raw_data : {};
  let subcategories = c.subcategories || rawData.subcategories;
  if (Array.isArray(subcategories)) {
    subcategories = subcategories.map((sub) => {
      if (sub && sub.name && subcatEmojiMap[sub.name]) {
        return { ...sub, name: subcatEmojiMap[sub.name] };
      }
      return sub;
    });
  } else {
    subcategories = [];
  }

  let color = c.color || rawData.color;
  if (c.name?.toLowerCase() === 'alimentación' && (color === '#FF3B30' || color?.toLowerCase() === '#ef4444' || color?.toLowerCase() === '#dc2626')) {
    color = '#FF9500';
  }

  return {
    ...c,
    id: c.id,
    name: (c.name || rawData.name || 'Categoría').trim(),
    type: c.type || rawData.type || 'expense',
    icon: icon || '🏷️',
    color: color || '#FF9500',
    subcategories
  };
}

/**
 * Mapea una fila de Supabase al objeto de categoría de React
 */
export function mapSupabaseRowToCategory(row) {
  if (!row || typeof row !== 'object') return row;
  return normalizeCategoryItem(row);
}

/**
 * Mapea un objeto de categoría local al payload para Supabase
 */
export function mapCategoryToSupabasePayload(cat, userId) {
  const norm = normalizeCategoryItem(cat);
  const nowIso = new Date().toISOString();
  return {
    id: String(norm.id),
    user_id: userId,
    name: norm.name,
    type: norm.type || 'expense',
    icon: norm.icon || '🏷️',
    color: norm.color || '#FF9500',
    raw_data: {
      subcategories: norm.subcategories || [],
      updated_at: nowIso
    },
    updated_at: nowIso
  };
}

/**
 * useCategories
 * Hook de categorías y subcategorías conectado a Supabase Puro y sincronizado en tiempo real (Realtime).
 */
export function useCategories({
  isResettingRef,
  onCategoryUpdated,
  onSubcategoryUpdated,
  user: explicitUser = null
} = {}) {
  // Inicialización limpia en memoria con catálogo predeterminado
  const [categories, setCategories] = useState(() => DEFAULT_CATEGORIES.map(normalizeCategoryItem));
  const [activeUser, setActiveUser] = useState(explicitUser);
  const activeUserRef = useRef(explicitUser);
  activeUserRef.current = activeUser;

  // 1. Detección y suscripción a la sesión del usuario de Supabase Auth
  useEffect(() => {
    if (explicitUser) {
      setActiveUser(explicitUser);
      return;
    }

    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;
    getSupabaseUser().then((u) => {
      if (isMounted && u?.id) {
        setActiveUser(u);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setActiveUser(session?.user || null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [explicitUser]);

  // 2. Consulta y carga inicial desde Supabase
  const fetchCategories = useCallback(async (userId = null) => {
    if (!isSupabaseConfigured || !supabase) return categories;
    try {
      let uid = userId || activeUserRef.current?.id;
      if (!uid) {
        const user = await getSupabaseUser();
        uid = user?.id;
      }
      if (!uid) return categories;

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', uid)
        .order('name', { ascending: true });

      if (error) {
        console.error('[useCategories] Error al consultar categorías en Supabase:', error);
        return categories;
      }

      // Si el usuario no tiene categorías creadas en Supabase, insertar DEFAULT_CATEGORIES asociadas a su user_id
      if (!data || data.length === 0) {
        const seedPayloads = DEFAULT_CATEGORIES.map((def) => mapCategoryToSupabasePayload(def, uid));
        const { data: seeded, error: seedError } = await supabase
          .from('categories')
          .insert(seedPayloads)
          .select();

        if (seedError) {
          console.warn('[useCategories] Advertencia al sembrar categorías por defecto en Supabase:', seedError);
          return DEFAULT_CATEGORIES.map(normalizeCategoryItem);
        }

        const mappedSeeded = (seeded || seedPayloads).map(mapSupabaseRowToCategory);
        setCategories(mappedSeeded);
        return mappedSeeded;
      }

      const mapped = data.map(mapSupabaseRowToCategory);

      // Si faltan categorías para completar el catálogo mínimo de 14, complementar con las faltantes
      if (mapped.length < DEFAULT_CATEGORIES.length) {
        const existingNames = new Set(mapped.map((c) => c.name?.trim().toLowerCase()));
        const missing = DEFAULT_CATEGORIES
          .filter((c) => !existingNames.has(c.name?.trim().toLowerCase()))
          .map(normalizeCategoryItem);

        if (missing.length > 0) {
          const missingPayloads = missing.map((m) => mapCategoryToSupabasePayload(m, uid));
          supabase.from('categories').insert(missingPayloads).then(() => {}).catch(() => {});
          const fullList = [...mapped, ...missing];
          setCategories(fullList);
          return fullList;
        }
      }

      setCategories(mapped);
      return mapped;
    } catch (err) {
      console.error('[useCategories] Excepción al consultar categorías:', err);
      return categories;
    }
  }, [categories]);

  useEffect(() => {
    if (isResettingRef?.current) return;
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;

    fetchCategories(activeUser.id);
  }, [activeUser?.id, isResettingRef, fetchCategories]);

  // 3. Suscripción en Tiempo Real (Realtime WebSockets)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;

    const channelName = `realtime:categories:${activeUser.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `user_id=eq.${activeUser.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCat = mapSupabaseRowToCategory(payload.new);
            setCategories((prev) => {
              if (prev.some((c) => c.id === newCat.id)) {
                return prev.map((c) => (c.id === newCat.id ? { ...c, ...newCat } : c));
              }
              return [...prev, newCat];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedCat = mapSupabaseRowToCategory(payload.new);
            setCategories((prev) => prev.map((c) => (c.id === updatedCat.id ? { ...c, ...updatedCat } : c)));
            if (onCategoryUpdated) onCategoryUpdated(updatedCat);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setCategories((prev) => prev.filter((c) => c.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUser?.id, onCategoryUpdated]);

  // Sincronización con eventos globales ('categories-updated')
  useEffect(() => {
    const handleCategoriesUpdated = (e) => {
      if (e?.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setCategories(e.detail.map(normalizeCategoryItem));
      }
    };
    window.addEventListener('categories-updated', handleCategoriesUpdated);
    return () => window.removeEventListener('categories-updated', handleCategoriesUpdated);
  }, []);

  // 4. Operaciones CRUD directas a Supabase

  // Agregar categoría
  const handleAddCategory = useCallback(async (newCat) => {
    const freshId = newCat.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`);
    const catToAdd = normalizeCategoryItem({
      ...newCat,
      id: freshId
    });

    // Actualización optimista en React
    setCategories((prev) => {
      const exists = prev.some(
        (c) => c.id === catToAdd.id || c.name.trim().toLowerCase() === catToAdd.name.trim().toLowerCase()
      );
      if (exists) return prev;
      return [...prev, catToAdd];
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const payload = mapCategoryToSupabasePayload(catToAdd, user.id);
          const { error } = await supabase.from('categories').insert([payload]);
          if (error) {
            console.error('[useCategories] Error al insertar categoría en Supabase:', error);
            toast.error('Error al guardar categoría en la nube');
          }
        }
      } catch (err) {
        console.error('[useCategories] Excepción al agregar categoría:', err);
      }
    }

    return catToAdd;
  }, []);

  // Actualizar categoría
  const handleUpdateCategory = useCallback(async (updatedCat) => {
    const normalized = normalizeCategoryItem(updatedCat);

    // Actualización optimista en React
    setCategories((prev) => prev.map((c) => (c.id === normalized.id ? normalized : c)));

    if (onCategoryUpdated) {
      onCategoryUpdated(normalized);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const payload = mapCategoryToSupabasePayload(normalized, user.id);
          let query = supabase
            .from('categories')
            .update(payload)
            .eq('id', String(normalized.id));
          query = query.eq('user_id', user.id);
          const { error } = await query;
          if (error) {
            console.error('[useCategories] Error al actualizar categoría en Supabase:', error);
          }
        }
      } catch (err) {
        console.error('[useCategories] Excepción al actualizar categoría:', err);
      }
    }
  }, [onCategoryUpdated]);

  // Eliminar categoría
  const handleDeleteCategory = useCallback(async (catId) => {
    if (!catId) return;

    // Actualización optimista en React
    setCategories((prev) => prev.filter((c) => c.id !== catId));

    if (isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        let query = supabase.from('categories').delete().eq('id', String(catId));
        if (user?.id) {
          query = query.eq('user_id', user.id);
        }
        const { error } = await query;
        if (error) {
          console.error('[useCategories] Error al eliminar categoría en Supabase:', error);
        }
      } catch (err) {
        console.error('[useCategories] Excepción al eliminar categoría en Supabase:', err);
      }
    }

    toast.info('Elemento eliminado');
  }, []);

  // Agregar subcategoría (actualiza el campo raw_data / subcategories de la categoría padre)
  const handleAddSubcategory = useCallback(async (categoryId, subcategoryName) => {
    const trimmedName = subcategoryName.trim();
    const newSub = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}`,
      name: subcatEmojiMap[trimmedName] || trimmedName
    };

    let parentCat = null;

    setCategories((prev) => {
      const updated = prev.map((cat) => {
        if (cat.id !== categoryId) return cat;
        const subExists = (cat.subcategories || []).some(
          (s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase()
        );
        if (subExists) return cat;

        const nextCat = {
          ...cat,
          subcategories: [...(cat.subcategories || []), newSub]
        };
        parentCat = nextCat;
        return nextCat;
      });
      return updated;
    });

    if (parentCat && isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const payload = mapCategoryToSupabasePayload(parentCat, user.id);
          await supabase
            .from('categories')
            .update(payload)
            .eq('id', String(categoryId))
            .eq('user_id', user.id);
        }
      } catch (err) {
        console.error('[useCategories] Error al agregar subcategoría en Supabase:', err);
      }
    }

    return newSub;
  }, []);

  // Actualizar subcategoría
  const handleUpdateSubcategory = useCallback(async (categoryId, subcategoryId, newName, newColor) => {
    let parentCat = null;
    const cleanName = (newName || '').trim();

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          const nextCat = {
            ...cat,
            subcategories: (cat.subcategories || []).map((s) =>
              s.id === subcategoryId
                ? { ...s, name: cleanName || s.name, ...(newColor ? { color: newColor } : {}) }
                : s
            )
          };
          parentCat = nextCat;
          return nextCat;
        }
        return cat;
      })
    );

    if (cleanName && onSubcategoryUpdated) {
      onSubcategoryUpdated(subcategoryId, cleanName);
    }

    if (parentCat && isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const payload = mapCategoryToSupabasePayload(parentCat, user.id);
          await supabase
            .from('categories')
            .update(payload)
            .eq('id', String(categoryId))
            .eq('user_id', user.id);
        }
      } catch (err) {
        console.error('[useCategories] Error al actualizar subcategoría en Supabase:', err);
      }
    }
  }, [onSubcategoryUpdated]);

  // Eliminar subcategoría
  const handleDeleteSubcategory = useCallback(async (categoryId, subcategoryId) => {
    let parentCat = null;

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          const nextCat = {
            ...cat,
            subcategories: (cat.subcategories || []).filter((s) => s.id !== subcategoryId)
          };
          parentCat = nextCat;
          return nextCat;
        }
        return cat;
      })
    );

    if (parentCat && isSupabaseConfigured && supabase) {
      try {
        const user = activeUserRef.current || (await getSupabaseUser());
        if (user?.id) {
          const payload = mapCategoryToSupabasePayload(parentCat, user.id);
          await supabase
            .from('categories')
            .update(payload)
            .eq('id', String(categoryId))
            .eq('user_id', user.id);
        }
      } catch (err) {
        console.error('[useCategories] Error al eliminar subcategoría en Supabase:', err);
      }
    }
  }, []);

  // Resetear categorías al catálogo estándar en memoria
  const resetCategories = useCallback(() => {
    setCategories(DEFAULT_CATEGORIES.map(normalizeCategoryItem));
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
    fetchCategories,
    resetCategories
  };
}
