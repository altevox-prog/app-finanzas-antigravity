import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DEFAULT_CATEGORIES } from '../data/initialData';
import { toast } from '../utils/toast';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSupabaseUser } from '../services/supabaseClient';
import { STORAGE_KEYS } from '../constants/storageKeys';
const legacyIconMap = { Utensils: '🍔', Home: '🏠', Car: '🚗', Zap: '💡', Film: '🍿', HeartPulse: '💊', Activity: '💊', GraduationCap: '📚', Briefcase: '💼', TrendingUp: '📈', ShoppingBag: '🛍️', Plane: '✈️', Smartphone: '📱', Gift: '🎁', Coins: '💰', DollarSign: '💰', Wallet: '👛', CreditCard: '💳', PiggyBank: '💰', Tag: '🏷️' };
const nameToEmoji = { 'Comida / Restaurantes': '🍔', Alimentación: '🍔', Transporte: '🚗', 'Vivienda / Hogar': '🏠', Vivienda: '🏠', Entretenimiento: '🍿', 'Salud / Cuidado': '💊', Salud: '💊', 'Salud y Bienestar': '💊', Educación: '📚', 'Compras / Ropa': '🛍️', Compras: '🛍️', Ingresos: '💰' };
const subcatEmojiMap = { Café: '☕ Café', Mercado: '🛒 Mercado', Domicilios: '🍕 Domicilios', Salidas: '🍻 Salidas', Gasolina: '⛽ Gasolina', 'Taxi/Uber': '🚕 Taxi/Uber', Taxi: '🚕 Taxi/Uber', Pasajes: '🚌 Pasajes', Mantenimiento: '🔧 Mantenimiento', Arriendo: '🔑 Arriendo', Luz: '💡 Luz', Agua: '💧 Agua', Internet: '🌐 Internet', Cine: '🎬 Cine', Videojuegos: '🎮 Videojuegos', Viajes: '✈️ Viajes', Suscripciones: '🎵 Suscripciones', 'Citas médicas': '🏥 Citas médicas', Aseo: '🧴 Aseo personal', 'Aseo personal': '🧴 Aseo personal', Gimnasio: '🏋️ Gimnasio', Universidad: '🎓 Universidad', Libros: '📖 Libros', Cursos: '💻 Cursos', Ropa: '👕 Ropa', Calzado: '👟 Calzado', Tecnología: '📱 Tecnología', Salario: '💼 Salario', Inversiones: '📈 Inversiones', Regalos: '🎁 Regalos' };
function normalizeCategoryItem(c) {
  if (!c || typeof c !== 'object') return c;
  const raw = c.raw_data && typeof c.raw_data === 'object' ? c.raw_data : {};
  let icon = legacyIconMap[c.icon] || c.icon || nameToEmoji[c.name] || '🏷️';
  let subs = c.subcategories || raw.subcategories || DEFAULT_CATEGORIES.find((dc) => String(dc.id) === String(c.id) || dc.name?.trim().toLowerCase() === c.name?.trim().toLowerCase())?.subcategories || [];
  subs = Array.isArray(subs) ? subs.map((s) => (s?.name && subcatEmojiMap[s.name] ? { ...s, name: subcatEmojiMap[s.name] } : s)) : [];
  let color = c.color || raw.color || '#FF9500';
  if (c.name?.toLowerCase() === 'alimentación' && ['#ff3b30', '#ef4444', '#dc2626'].includes(color?.toLowerCase())) color = '#FF9500';
  return { ...c, id: c.id, name: (c.name || raw.name || 'Categoría').trim(), type: c.type || raw.type || 'expense', icon, color, subcategories: subs };
}
const mapSupabaseRowToCategory = (r) => (r && typeof r === 'object' ? normalizeCategoryItem(r) : r);
const mapCategoryToSupabasePayload = (cat, userId) => ({
  id: String(cat.id), user_id: userId, name: cat.name, type: cat.type || 'expense', icon: cat.icon || 'Tag', color: cat.color || '#64748b',
  raw_data: { ...(cat.raw_data && typeof cat.raw_data === 'object' ? cat.raw_data : {}), subcategories: Array.isArray(cat.subcategories) ? cat.subcategories : [] }
});
export function useCategories({ isResettingRef, onCategoryUpdated, onSubcategoryUpdated, user: explicitUser = null } = {}) {
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES) || localStorage.getItem('categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normalizeCategoryItem);
      }
    } catch {}
    return DEFAULT_CATEGORIES.map(normalizeCategoryItem);
  });
  const [activeUser, setActiveUser] = useState(explicitUser);
  const activeUserRef = useRef(explicitUser);
  activeUserRef.current = activeUser;
  useEffect(() => {
    if (isResettingRef?.current || !categories?.length) return;
    try { const s = JSON.stringify(categories); localStorage.setItem(STORAGE_KEYS.CATEGORIES, s); localStorage.setItem('categories', s); } catch {}
  }, [categories, isResettingRef]);
  useEffect(() => {
    if (explicitUser) { setActiveUser(explicitUser); return; }
    if (!isSupabaseConfigured || !supabase) return;
    let isMounted = true;
    getSupabaseUser().then((u) => { if (isMounted && u?.id) setActiveUser(u); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => { if (isMounted) setActiveUser(session?.user || null); });
    return () => { isMounted = false; subscription?.unsubscribe(); };
  }, [explicitUser]);
  const syncSupabase = useCallback(async (op, cat) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const uid = activeUserRef.current?.id || (await getSupabaseUser())?.id;
      if (!uid) return;
      const tbl = supabase.from('categories'), p = mapCategoryToSupabasePayload(cat, uid);
      if (op === 'insert') await tbl.insert([p]);
      else if (op === 'update') await tbl.update(p).eq('id', String(cat.id)).eq('user_id', uid);
      else if (op === 'upsert') await tbl.upsert(p, { onConflict: 'id' });
      else if (op === 'delete') await tbl.delete().eq('id', String(cat.id || cat)).eq('user_id', uid);
    } catch (e) { console.error(`[useCategories] Error ${op}:`, e); }
  }, []);
  const fetchCategories = useCallback(async (userId = null) => {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const uid = userId || activeUserRef.current?.id || (await getSupabaseUser())?.id;
      if (!uid) return [];
      const { data, error } = await supabase.from('categories').select('*').eq('user_id', uid).order('name', { ascending: true });
      if (error) return [];
      if (!data?.length) {
        const seed = DEFAULT_CATEGORIES.map((def) => mapCategoryToSupabasePayload(def, uid));
        const { data: seeded } = await supabase.from('categories').insert(seed).select();
        const mapped = (seeded || seed).map(mapSupabaseRowToCategory);
        setCategories(mapped); return mapped;
      }
      let mapped = data.map(mapSupabaseRowToCategory);
      if (mapped.length < DEFAULT_CATEGORIES.length) {
        const existing = new Set(mapped.map((c) => c.name?.trim().toLowerCase()));
        const missing = DEFAULT_CATEGORIES.filter((c) => !existing.has(c.name?.trim().toLowerCase())).map(normalizeCategoryItem);
        if (missing.length > 0) {
          supabase.from('categories').insert(missing.map((m) => mapCategoryToSupabasePayload(m, uid))).catch(() => {});
          mapped = [...mapped, ...missing];
        }
      }
      setCategories(mapped); return mapped;
    } catch { return []; }
  }, []);
  useEffect(() => {
    if (isResettingRef?.current || !isSupabaseConfigured || !supabase || !activeUser?.id) return;
    fetchCategories(activeUser.id);
  }, [activeUser?.id, isResettingRef, fetchCategories]);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeUser?.id) return;
    const channel = supabase.channel(`realtime:categories:${activeUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${activeUser.id}` }, (p) => {
        if (p.eventType === 'INSERT') {
          const newCat = mapSupabaseRowToCategory(p.new);
          setCategories((prev) => prev.some((c) => c.id === newCat.id) ? prev.map((c) => c.id === newCat.id ? { ...c, ...newCat } : c) : [...prev, newCat]);
        } else if (p.eventType === 'UPDATE') {
          const upd = mapSupabaseRowToCategory(p.new);
          setCategories((prev) => prev.map((c) => (c.id === upd.id ? { ...c, ...upd } : c)));
          onCategoryUpdated?.(upd);
        } else if (p.eventType === 'DELETE' && p.old?.id) {
          setCategories((prev) => prev.filter((c) => c.id !== p.old.id));
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeUser?.id, onCategoryUpdated]);
  useEffect(() => {
    const handleUpdate = (e) => { if (e?.detail?.length) setCategories(e.detail.map(normalizeCategoryItem)); };
    window.addEventListener('categories-updated', handleUpdate);
    return () => window.removeEventListener('categories-updated', handleUpdate);
  }, []);
  const handleAddCategory = useCallback(async (newCat) => {
    const cat = normalizeCategoryItem({ ...newCat, id: newCat.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`) });
    setCategories((prev) => prev.some((c) => c.id === cat.id || c.name.trim().toLowerCase() === cat.name.trim().toLowerCase()) ? prev : [...prev, cat]);
    syncSupabase('insert', cat); return cat;
  }, [syncSupabase]);
  const handleUpdateCategory = useCallback(async (updatedCat) => {
    const norm = normalizeCategoryItem(updatedCat);
    setCategories((prev) => prev.map((c) => (c.id === norm.id ? norm : c)));
    onCategoryUpdated?.(norm); syncSupabase('update', norm);
  }, [onCategoryUpdated, syncSupabase]);
  const handleDeleteCategory = useCallback(async (catId) => {
    if (!catId) return;
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    syncSupabase('delete', { id: catId }); toast.info('Elemento eliminado');
  }, [syncSupabase]);
  const mutateCategorySubcategories = useCallback(async (catId, updater) => {
    let parent = null, result = null;
    setCategories((prev) => prev.map((cat) => {
      if (String(cat.id) !== String(catId)) return cat;
      const { nextSubs, res } = updater(cat.subcategories || []);
      result = res; parent = { ...cat, subcategories: nextSubs }; return parent;
    }));
    if (parent) syncSupabase('upsert', parent);
    return result;
  }, [syncSupabase]);
  const handleAddSubcategory = useCallback((catId, name) => {
    const clean = (name || '').trim();
    if (!clean || !catId) return null;
    const newSub = { id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}`, name: subcatEmojiMap[clean] || clean };
    return mutateCategorySubcategories(catId, (subs) => {
      const existing = subs.find((s) => s.name?.toLowerCase() === clean.toLowerCase());
      return existing ? { nextSubs: subs, res: existing } : { nextSubs: [...subs, newSub], res: newSub };
    });
  }, [mutateCategorySubcategories]);
  const handleUpdateSubcategory = useCallback((catId, subId, newName, newColor) => {
    const clean = (newName || '').trim();
    if (clean && onSubcategoryUpdated) onSubcategoryUpdated(subId, clean);
    return mutateCategorySubcategories(catId, (subs) => ({
      nextSubs: subs.map((s) => s.id === subId ? { ...s, name: clean || s.name, ...(newColor ? { color: newColor } : {}) } : s), res: true
    }));
  }, [onSubcategoryUpdated, mutateCategorySubcategories]);
  const handleDeleteSubcategory = useCallback((catId, subId) => mutateCategorySubcategories(catId, (subs) => ({
    nextSubs: subs.filter((s) => s.id !== subId), res: true
  })), [mutateCategorySubcategories]);
  const incomeCategories = useMemo(() => categories.filter((c) => ['income', 'ingreso'].includes(String(c.type || '').toLowerCase())), [categories]);
  const expenseCategories = useMemo(() => categories.filter((c) => !['income', 'ingreso'].includes(String(c.type || '').toLowerCase())), [categories]);
  return {
    categories, setCategories, incomeCategories, expenseCategories,
    handleAddCategory, addCategory: handleAddCategory, handleUpdateCategory, updateCategory: handleUpdateCategory,
    handleDeleteCategory, deleteCategory: handleDeleteCategory, handleAddSubcategory, addSubcategory: handleAddSubcategory,
    handleUpdateSubcategory, updateSubcategory: handleUpdateSubcategory, handleDeleteSubcategory, deleteSubcategory: handleDeleteSubcategory,
    fetchCategories, resetCategories: useCallback(() => setCategories(DEFAULT_CATEGORIES.map(normalizeCategoryItem)), [])
  };
}
export default useCategories;