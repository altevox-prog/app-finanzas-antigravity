const safeNum = (v, fb = 0) => { const n = Number(v); return isNaN(n) ? fb : n; };

export function resolveRemoteBudgets(res, userSettings = null) {
  const list = Array.isArray(res) ? res : (res?.status === 'fulfilled' && !res.value?.error && Array.isArray(res.value?.data)) ? res.value.data : (Array.isArray(res?.data) ? res.data : []);
  let loadedGlobal = null, categoriesMap = {};
  if (list.length > 0) {
    const isGlobal = (b) => Boolean(b.is_global === true || b.is_global === 'true' || b.isGlobal === true || b.isGlobal === 'true' || ['Límite Global', 'Presupuesto Global'].includes(b.name) || (!b.category_id && (!b.category || b.category === 'General')));
    const globalRow = list.find(isGlobal);
    if (globalRow) {
      loadedGlobal = safeNum(globalRow.amount);
      try { if (globalRow.id && typeof localStorage !== 'undefined') localStorage.setItem('global_budget_id', String(globalRow.id)); } catch {}
    }
    list.forEach((b) => {
      if (!isGlobal(b)) {
        const k = (b.category && b.category !== 'General') ? b.category : b.category_id;
        if (k && k !== 'General') categoriesMap[k] = safeNum(b.amount);
      }
    });
  }
  if (userSettings) {
    if (loadedGlobal === null) loadedGlobal = safeNum(userSettings.global_budget_limit ?? userSettings.global_budget ?? userSettings.budgets?.global);
    if (userSettings.budgets?.categories) categoriesMap = { ...userSettings.budgets.categories, ...categoriesMap };
  }
  if (typeof localStorage !== 'undefined' && loadedGlobal === null) {
    try {
      const d = localStorage.getItem('global_budget_limit'), ls = localStorage.getItem('user_settings'), lb = localStorage.getItem('presu_budgets_v1') || localStorage.getItem('budgets');
      if (d != null) loadedGlobal = safeNum(d);
      else if (ls) loadedGlobal = safeNum(JSON.parse(ls).global_budget_limit ?? JSON.parse(ls).global_budget);
      else if (lb) { const pb = JSON.parse(lb); loadedGlobal = safeNum(pb.global); categoriesMap = { ...(pb.categories || {}), ...categoriesMap }; }
    } catch {}
  }
  return { global: loadedGlobal ?? 0, categories: categoriesMap };
}
