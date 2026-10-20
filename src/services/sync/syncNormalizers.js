/**
 * syncNormalizers.js
 * Funciones puras de normalización y parsing defensivo para datos remotos de Supabase.
 */

/**
 * Normaliza los datos del perfil remoto de Supabase combinándolos con el perfil local previo.
 *
 * @param {Object|null} safeCloudProfile - Registro de profile descargado de la nube
 * @param {Object} [prevProfile={}] - Estado previo del perfil en React
 * @returns {Object} Perfil normalizado con name, photo, initials y propiedades previas
 */
export function normalizeRemoteProfile(safeCloudProfile, prevProfile = {}) {
  if (!safeCloudProfile) return prevProfile;
  const displayName = safeCloudProfile.display_name || safeCloudProfile.name;
  const photoUrl = safeCloudProfile.photo_url || safeCloudProfile.photo;
  return {
    ...prevProfile,
    name: displayName || prevProfile?.name || 'Usuario',
    photo: photoUrl || prevProfile?.photo || null,
    initials: (displayName || prevProfile?.name || 'US')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('') || 'US'
  };
}

/**
 * Normaliza una cuenta descargada de Supabase garantizando compatibilidad de nombres de balance.
 *
 * @param {Object} a - Registro de cuenta de Supabase
 * @returns {Object} Cuenta con initial_balance, initialBalance, balance, current_balance, currentBalance
 */
export function normalizeRemoteAccount(a) {
  if (!a || typeof a !== 'object') return a;
  const balanceVal = Number(a.balance ?? a.current_balance ?? a.initial_balance ?? a.initialBalance ?? 0);
  const initBal = Number(a.initial_balance ?? a.initialBalance ?? a.balance ?? a.current_balance ?? 0);
  return {
    ...a,
    order_index: a.order_index !== undefined && a.order_index !== null ? Number(a.order_index) : 0,
    initial_balance: initBal,
    initialBalance: initBal,
    balance: balanceVal,
    current_balance: balanceVal,
    currentBalance: balanceVal
  };
}

/**
 * Normaliza una transacción descargada de Supabase:
 * - Resuelve fecha desde date, created_at, datetime o fallback ISO a la fecha actual.
 * - Resuelve nota/descripción de t o raw_data.
 * - Resuelve categoría (category, category_name, categoryName, etc.).
 * - Normaliza tipo ('gasto'/'expense' -> 'expense', 'ingreso'/'income' -> 'income').
 * - Preserva compatibilidad camelCase y snake_case para accountId, categoryId, subcategoryId.
 * - Convierte amount a Number y evalúa is_transfer / isTransfer.
 *
 * @param {Object} t - Registro de transacción de Supabase
 * @returns {Object} Transacción normalizada
 */
export function normalizeRemoteTransaction(t) {
  if (!t || typeof t !== 'object') return t;
  const rawData = t.raw_data && typeof t.raw_data === 'object' ? t.raw_data : {};
  const resolvedDate = t.date 
    ? String(t.date).split('T')[0] 
    : (t.created_at ? String(t.created_at).split('T')[0] : (t.datetime ? String(t.datetime).split('T')[0] : new Date().toISOString().split('T')[0]));
  const noteText = t.note ?? t.notes ?? t.description ?? rawData.note ?? rawData.description ?? '';
  const catName = t.category ?? t.category_name ?? t.categoryName ?? rawData.category ?? rawData.categoryName ?? 'General';
  const rawType = String(t.type || rawData.type || 'expense').toLowerCase();
  const normalizedType = (rawType === 'gasto' || rawType === 'expense') ? 'expense' : ((rawType === 'ingreso' || rawType === 'income') ? 'income' : rawType);

  return {
    ...t,
    date: resolvedDate,
    note: noteText,
    notes: noteText,
    description: t.description || noteText || 'Movimiento',
    type: normalizedType,
    categoryName: catName,
    category_name: catName,
    category: catName,
    accountId: t.account_id || t.accountId || rawData.account_id || rawData.accountId || null,
    account_id: t.account_id || t.accountId || rawData.account_id || rawData.accountId || null,
    categoryId: t.category_id || t.categoryId || rawData.category_id || rawData.categoryId || null,
    category_id: t.category_id || t.categoryId || rawData.category_id || rawData.categoryId || null,
    subcategoryId: t.subcategory_id || t.subcategoryId || rawData.subcategory_id || rawData.subcategoryId || null,
    amount: Number(t.amount || 0),
    is_transfer: Boolean(t.is_transfer || t.isTransfer || rawData.is_transfer || false),
    isTransfer: Boolean(t.is_transfer || t.isTransfer || rawData.is_transfer || false)
  };
}

/**
 * Normaliza una deuda/préstamo descargada de Supabase:
 * - Resuelve nombre de la persona (person, person_name, name).
 * - Calcula totalAmount y remainingAmount con fallbacks cruzados.
 * - Extrae abonos desde d.payments, raw_data.payments, metadata.payments o 'PAYMENTS_JSON:' en d.notes.
 *
 * @param {Object} d - Registro de deuda de Supabase
 * @returns {Object} Deuda normalizada
 */
export function normalizeRemoteDebt(d) {
  if (!d || typeof d !== 'object') return d;
  const rawData = d.raw_data && typeof d.raw_data === 'object' ? d.raw_data : {};
  const metadataObj = d.metadata && typeof d.metadata === 'object' ? d.metadata : {};
  const personName = d.person || d.person_name || d.name || 'Sin nombre';
  const parsedTotal = Number(d.total_amount ?? d.totalAmount ?? d.amount ?? d.principalAmount ?? d.remaining_amount ?? 0);
  const parsedRemaining = d.remaining_amount !== null && d.remaining_amount !== undefined && Number(d.remaining_amount) > 0
    ? Number(d.remaining_amount)
    : (d.remainingAmount !== null && d.remainingAmount !== undefined && Number(d.remainingAmount) > 0 ? Number(d.remainingAmount) : parsedTotal);

  // Recuperar abonos y desembolsos de d.payments/disbursements, raw_data, metadata o PAYMENTS_JSON en d.notes
  let parsedPayments = [];
  let parsedDisbursements = [];
  let parsedInitialAmount = null;

  if (Array.isArray(d.payments)) {
    parsedPayments = d.payments;
  } else if (Array.isArray(rawData.payments)) {
    parsedPayments = rawData.payments;
  } else if (Array.isArray(metadataObj.payments)) {
    parsedPayments = metadataObj.payments;
  }

  if (Array.isArray(d.disbursements)) {
    parsedDisbursements = d.disbursements;
  } else if (Array.isArray(rawData.disbursements)) {
    parsedDisbursements = rawData.disbursements;
  } else if (Array.isArray(metadataObj.disbursements)) {
    parsedDisbursements = metadataObj.disbursements;
  }

  if (typeof d.notes === 'string' && d.notes.startsWith('PAYMENTS_JSON:')) {
    try {
      const parsed = JSON.parse(d.notes.replace('PAYMENTS_JSON:', ''));
      if (Array.isArray(parsed)) {
        if (parsedPayments.length === 0) parsedPayments = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.payments) && parsedPayments.length === 0) {
          parsedPayments = parsed.payments;
        }
        if (Array.isArray(parsed.disbursements) && parsedDisbursements.length === 0) {
          parsedDisbursements = parsed.disbursements;
        }
        if (parsed.initialAmount) {
          parsedInitialAmount = Number(parsed.initialAmount);
        }
      }
    } catch {}
  }

  const totalDisbursed = parsedDisbursements.reduce((sum, disb) => sum + Number(disb?.amount || 0), 0);
  const totalCapPaid = parsedPayments.reduce(
    (sum, p) => sum + (p.capitalAmount !== undefined ? Number(p.capitalAmount) : (p.mode === 'interest' ? 0 : Number(p.amount) || 0)), 
    0
  );

  let initialAmount = parsedInitialAmount || Number(d.initialAmount ?? d.initial_amount);
  let totalAmount = parsedTotal;

  if (initialAmount > 0) {
    totalAmount = initialAmount + totalDisbursed;
  } else if (totalDisbursed > 0) {
    if (parsedTotal > totalDisbursed) {
      initialAmount = parsedTotal - totalDisbursed;
      totalAmount = parsedTotal;
    } else {
      initialAmount = parsedTotal;
      totalAmount = initialAmount + totalDisbursed;
    }
  } else {
    initialAmount = parsedTotal;
    totalAmount = parsedTotal;
  }

  // Fórmula reactiva: Saldo Pendiente = Monto Inicial + Total Prestado Adicional - Total Abonado
  const calculatedRemaining = Math.max(0, totalAmount - totalCapPaid);
  const finalRemaining = (parsedPayments.length > 0 || totalDisbursed > 0)
    ? calculatedRemaining
    : (parsedRemaining || calculatedRemaining);

  return {
    ...d,
    person: personName,
    personName: personName,
    name: personName,
    initialAmount,
    initial_amount: initialAmount,
    total_amount: totalAmount,
    totalAmount: totalAmount,
    principalAmount: totalAmount,
    amount: totalAmount,
    remaining_amount: finalRemaining,
    remainingAmount: finalRemaining,
    remainingCapital: finalRemaining,
    current_balance: finalRemaining,
    payments: Array.isArray(parsedPayments) ? parsedPayments : [],
    disbursements: Array.isArray(parsedDisbursements) ? parsedDisbursements : []
  };
}

/**
 * Normaliza una inversión descargada de Supabase garantizando compatibilidad de montos y tipos.
 *
 * @param {Object} inv - Registro de inversión de Supabase
 * @returns {Object} Inversión normalizada
 */
export function normalizeRemoteInvestment(inv) {
  if (!inv || typeof inv !== 'object') return inv;

  let rawData = {};
  if (typeof inv.raw_data === 'string') {
    try {
      rawData = JSON.parse(inv.raw_data);
    } catch {
      rawData = {};
    }
  } else if (inv.raw_data && typeof inv.raw_data === 'object') {
    rawData = inv.raw_data;
  }

  // Helper para extraer el primer número mayor a cero o el primer número definido
  const pickValidNumber = (...candidates) => {
    for (const c of candidates) {
      const n = Number(c);
      if (!isNaN(n) && n > 0) return n;
    }
    for (const c of candidates) {
      const n = Number(c);
      if (!isNaN(n) && c !== null && c !== undefined && c !== '') return n;
    }
    return 0;
  };

  const invAmount = pickValidNumber(
    inv.investedAmount,
    inv.invested_amount,
    rawData.investedAmount,
    rawData.invested_amount,
    inv.amount,
    rawData.amount,
    inv.totalInvested,
    rawData.totalInvested,
    inv.buyPrice,
    rawData.buyPrice
  );

  const currVal = pickValidNumber(
    inv.currentAmount,
    inv.currentValue,
    inv.current_value,
    rawData.currentAmount,
    rawData.currentValue,
    rawData.current_value,
    invAmount
  );

  return {
    ...rawData,
    ...inv,
    amount: invAmount,
    investedAmount: invAmount,
    invested_amount: invAmount,
    totalInvested: invAmount,
    currentAmount: currVal,
    currentValue: currVal,
    current_value: currVal,
    category: inv.category || rawData.category || 'fixed',
    assetType: inv.assetType || inv.asset_type || rawData.assetType || (inv.category === 'fixed' ? 'cdt' : 'other'),
    type: inv.subtype || inv.type || rawData.subtype || rawData.type || 'fixed_income',
    subtype: inv.subtype || inv.type || rawData.subtype || rawData.type || 'cdt',
    institution: inv.institution || rawData.institution || null,
    interestRate: Number(inv.interestRate ?? rawData.interestRate ?? inv.rate ?? rawData.rate ?? 0),
    rate: Number(inv.rate ?? rawData.rate ?? inv.interestRate ?? rawData.interestRate ?? 0),
    dueDate: inv.dueDate || inv.due_date || rawData.dueDate || rawData.due_date || null,
    startDate: inv.startDate || inv.start_date || rawData.startDate || rawData.start_date || null
  };
}

/**
 * Normaliza un pago recurrente/suscripción descargado de Supabase:
 * - Mapea propiedades de Supabase a camelCase:
 *   billing_day -> billingDay
 *   is_active -> isActive (default true)
 *   next_payment_date -> nextPaymentDate
 *   account_id -> accountId
 *   user_id -> userId
 * - Mantiene id, name, amount, category, frequency, type y updated_at.
 * - Si raw_data contiene datos adicionales, los combina asegurando que no se pierda ninguna propiedad.
 *
 * @param {Object} r - Registro de pago recurrente de Supabase
 * @returns {Object} Pago recurrente normalizado
 */
export function normalizeRemoteRecurring(r) {
  if (!r || typeof r !== 'object') return r;
  const rawData = (r.raw_data && typeof r.raw_data === 'object') ? r.raw_data : {};

  const billingDayVal = Number(r.billing_day ?? r.billingDay ?? rawData.billing_day ?? rawData.billingDay ?? 1);
  const isActiveVal = r.is_active !== undefined ? Boolean(r.is_active) : (r.isActive !== undefined ? Boolean(r.isActive) : (rawData.is_active !== undefined ? Boolean(rawData.is_active) : (rawData.isActive !== undefined ? Boolean(rawData.isActive) : true)));
  const nextDateVal = r.next_payment_date || r.nextPaymentDate || r.next_date || r.nextDate || rawData.next_payment_date || rawData.nextPaymentDate || rawData.next_date || rawData.nextDate || null;
  const accountIdVal = r.account_id || r.accountId || rawData.account_id || rawData.accountId || null;
  const userIdVal = r.user_id || r.userId || rawData.user_id || rawData.userId || null;
  const categoryVal = r.category || r.category_name || r.categoryName || rawData.category || rawData.categoryName || 'General';
  const typeVal = r.type || rawData.type || 'expense';
  const frequencyVal = r.frequency || rawData.frequency || 'monthly';
  const amountVal = Number(r.amount ?? rawData.amount ?? 0);

  return {
    ...rawData,
    ...r,
    id: r.id || rawData.id,
    userId: userIdVal,
    user_id: userIdVal,
    name: r.name || rawData.name || 'Suscripción',
    amount: amountVal,
    category: categoryVal,
    categoryName: categoryVal,
    type: typeVal,
    frequency: frequencyVal,
    billingDay: billingDayVal,
    billing_day: billingDayVal,
    isActive: isActiveVal,
    is_active: isActiveVal,
    active: isActiveVal,
    accountId: accountIdVal,
    account_id: accountIdVal,
    nextPaymentDate: nextDateVal,
    next_payment_date: nextDateVal,
    nextDate: nextDateVal,
    next_date: nextDateVal,
    updatedAt: r.updated_at || r.updatedAt || rawData.updated_at || rawData.updatedAt || new Date().toISOString(),
    updated_at: r.updated_at || r.updatedAt || rawData.updated_at || rawData.updatedAt || new Date().toISOString()
  };
}

/**
 * Resuelve y unifica los presupuestos remotos provenientes de la tabla budgets, user_settings y fallbacks locales.
 *
 * @param {Array|Object} remoteBudgetsOrRes - Lista de presupuestos de Supabase o respuesta settled de Promise
 * @param {Object|null} [userSettingsData=null] - Datos obtenidos de la tabla user_settings de Supabase
 * @returns {{ global: number, categories: Object }} Objeto de presupuestos normalizado
 */
export function resolveRemoteBudgets(remoteBudgetsOrRes, userSettingsData = null) {
  let remoteBudgetList = [];
  if (Array.isArray(remoteBudgetsOrRes)) {
    remoteBudgetList = remoteBudgetsOrRes;
  } else if (remoteBudgetsOrRes?.status === 'fulfilled' && !remoteBudgetsOrRes.value?.error && Array.isArray(remoteBudgetsOrRes.value?.data)) {
    remoteBudgetList = remoteBudgetsOrRes.value.data;
  } else if (Array.isArray(remoteBudgetsOrRes?.data)) {
    remoteBudgetList = remoteBudgetsOrRes.data;
  }

  let loadedGlobal = null;
  let categoriesMap = {};

  if (remoteBudgetList.length > 0) {
    // Priorizar explícitamente registro con is_global: true
    const globalRow = remoteBudgetList.find(b => b.is_global === true || b.is_global === 'true')
      || remoteBudgetList.find(b => b.isGlobal === true || b.isGlobal === 'true')
      || remoteBudgetList.find(b => b.name === 'Límite Global' || b.name === 'Presupuesto Global')
      || remoteBudgetList.find(b => !b.category_id && (!b.category || b.category === 'General'));

    if (globalRow) {
      loadedGlobal = Number(globalRow.amount || 0);
      if (globalRow.id && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('global_budget_id', String(globalRow.id));
        } catch {}
      }
    }

    remoteBudgetList.forEach(b => {
      const isRowGlobal = b.is_global === true || b.is_global === 'true' 
        || b.isGlobal === true || b.isGlobal === 'true' 
        || b.name === 'Límite Global' || b.name === 'Presupuesto Global' 
        || (!b.category_id && (!b.category || b.category === 'General'));

      const catKey = (b.category && b.category !== 'General') ? b.category : b.category_id;
      if (!isRowGlobal && catKey && catKey !== 'General') {
        categoriesMap[catKey] = Number(b.amount || 0);
      }
    });
  }

  // Si no se obtuvo de la tabla budgets, consultar user_settings
  if (userSettingsData) {
    if (loadedGlobal === null) {
      const rawLimit = userSettingsData.global_budget_limit ?? userSettingsData.global_budget ?? userSettingsData.budgets?.global;
      if (rawLimit !== undefined && rawLimit !== null) {
        loadedGlobal = Number(rawLimit || 0);
      }
    }
    if (userSettingsData.budgets?.categories) {
      categoriesMap = { ...userSettingsData.budgets.categories, ...categoriesMap };
    }
  }

  // Fallback al almacenamiento local bajo global_budget_limit o user_settings si loadedGlobal sigue en null
  if (typeof localStorage !== 'undefined') {
    if (loadedGlobal === null) {
      try {
        const directLimit = localStorage.getItem('global_budget_limit');
        if (directLimit !== null && directLimit !== undefined) {
          loadedGlobal = Number(directLimit || 0);
        }
      } catch {}
    }

    if (loadedGlobal === null) {
      try {
        const localSettings = localStorage.getItem('user_settings');
        if (localSettings) {
          const parsed = JSON.parse(localSettings);
          const rawLimit = parsed.global_budget_limit ?? parsed.global_budget ?? parsed.budgets?.global;
          if (rawLimit !== undefined && rawLimit !== null) {
            loadedGlobal = Number(rawLimit || 0);
          }
        }
      } catch (e) {
        console.warn('[useDataSync] Fallo al leer user_settings de localStorage:', e);
      }
    }

    if (loadedGlobal === null) {
      try {
        const localB = localStorage.getItem('presu_budgets_v1') || localStorage.getItem('budgets');
        if (localB) {
          const parsedB = JSON.parse(localB);
          loadedGlobal = Number(parsedB.global || 0);
          categoriesMap = { ...(parsedB.categories || {}), ...categoriesMap };
        } else {
          loadedGlobal = 0;
        }
      } catch {
        loadedGlobal = 0;
      }
    }
  }

  if (loadedGlobal === null) {
    loadedGlobal = 0;
  }

  return {
    global: loadedGlobal,
    categories: categoriesMap
  };
}

/**
 * Normaliza una categoría descargada de Supabase garantizando que sus subcategorías no se pierdan.
 * Si raw_data.subcategories o subcategories no vienen poblados, no borra las subcategorías por defecto.
 *
 * @param {Object} c - Categoría proveniente de Supabase
 * @param {Array} [currentCategories=[]] - Lista actual de categorías en memoria/local
 * @returns {Object} Categoría normalizada con subcategorías protegidas
 */
export function normalizeRemoteCategory(c, currentCategories = []) {
  if (!c || typeof c !== 'object') return c;

  const rawData = c.raw_data && typeof c.raw_data === 'object' ? c.raw_data : {};
  let subcategories = c.subcategories || rawData.subcategories;

  if (!Array.isArray(subcategories) || subcategories.length === 0) {
    const existing = (currentCategories || []).find(
      (cat) => String(cat.id) === String(c.id) || cat.name?.trim().toLowerCase() === c.name?.trim().toLowerCase()
    );
    if (existing && Array.isArray(existing.subcategories) && existing.subcategories.length > 0) {
      subcategories = existing.subcategories;
    }
  }

  return {
    ...c,
    subcategories: Array.isArray(subcategories) ? subcategories : []
  };
}

/**
 * Normaliza una meta de ahorro garantizando compatibilidad de nombres (camelCase y snake_case).
 *
 * @param {Object} g - Meta proveniente de Supabase o localStorage
 * @returns {Object|null} Meta normalizada con targetAmount/target_amount y currentAmount/current_amount
 */
export function normalizeRemoteGoal(g) {
  if (!g || typeof g !== 'object') return null;

  const rawDate = g.deadline || g.target_date || g.dueDate || '';
  let safeDate = '';
  if (rawDate) {
    try {
      safeDate = new Date(rawDate).toISOString().split('T')[0];
    } catch {
      safeDate = String(rawDate).split('T')[0];
    }
  }

  const targetNum = Number(g.target_amount ?? g.targetAmount ?? 0);
  const currentNum = Number(g.current_amount ?? g.currentAmount ?? 0);

  return {
    ...g,
    id: String(g.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `goal-${Date.now()}`)),
    user_id: g.user_id,
    name: (g.name || 'Nueva Meta').trim(),
    target_amount: targetNum,
    targetAmount: targetNum,
    current_amount: currentNum,
    currentAmount: currentNum,
    deadline: safeDate,
    target_date: safeDate,
    dueDate: safeDate,
    icon: g.icon || 'Target',
    color: g.color || '#10B981',
    target_account_id: g.target_account_id || g.targetAccountId || null,
    targetAccountId: g.target_account_id || g.targetAccountId || null,
    months: g.months ? Number(g.months) : 6,
    notification_day: g.notification_day ? Number(g.notification_day) : (g.notificationDay ? Number(g.notificationDay) : 15),
    notificationDay: g.notification_day ? Number(g.notification_day) : (g.notificationDay ? Number(g.notificationDay) : 15),
    notify_enabled: g.notify_enabled !== undefined ? Boolean(g.notify_enabled) : (g.notifyEnabled !== undefined ? Boolean(g.notifyEnabled) : true),
    notifyEnabled: g.notify_enabled !== undefined ? Boolean(g.notify_enabled) : (g.notifyEnabled !== undefined ? Boolean(g.notifyEnabled) : true),
    created_at: g.created_at || new Date().toISOString(),
    updated_at: g.updated_at || new Date().toISOString()
  };
}
