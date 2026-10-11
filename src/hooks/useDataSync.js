import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { ensureUUID } from '../services/syncEngine';

/**
 * useDataSync
 * Hook de sincronización en segundo plano (Local-First Cloud Sync).
 */
export function useDataSync({
  accounts = [],
  setAccounts,
  transactions = [],
  setTransactions,
  debtsAndLoans = [],
  setDebtsAndLoans,
  investments = [],
  setInvestments,
  recurringPayments = [],
  setRecurringPayments,
  budgets = { global: 0, categories: {} },
  setBudgets,
  categories = [],
  setCategories,
  savingsGoals = [],
  setSavingsGoals,
  userProfile = {},
  setUserProfile
} = {}) {
  const [syncUser, setSyncUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState(() => isSupabaseConfigured ? 'idle' : 'offline');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);

  // Bandera de control para evitar bucles infinitos y ejecuciones concurrentes en cascada
  const isSyncingRef = useRef(false);
  const hasInitialPullCompletedRef = useRef(false);

  // Referencias mutables para acceder siempre a los datos más recientes
  const latestDataRef = useRef({
    accounts,
    transactions,
    debtsAndLoans,
    investments,
    recurringPayments,
    budgets,
    categories,
    savingsGoals,
    userProfile
  });

  useEffect(() => {
    latestDataRef.current = {
      accounts,
      transactions,
      debtsAndLoans,
      investments,
      recurringPayments,
      budgets,
      categories,
      savingsGoals,
      userProfile
    };
  }, [
    accounts,
    transactions,
    debtsAndLoans,
    investments,
    recurringPayments,
    budgets,
    categories,
    savingsGoals,
    userProfile
  ]);

  // ==========================================================================
  // FUNCIÓN DE DESCARGA DE DATOS DE SUPABASE (PULL CLOUD TO LOCAL)
  // ==========================================================================
  const pullCloudToLocal = useCallback(async (userOverride = null, profileRes = null) => {
    // Declaración defensiva obligatoria de cloudProfile de raíz
    let cloudProfile = null;
    try {
      cloudProfile = profileRes?.data || null;
    } catch {
      cloudProfile = null;
    }

    // Prevención de bucles infinitos y descargas simultáneas en cascada
    if (isSyncingRef.current) {
      console.log('[useDataSync] Ya hay una sincronización en curso, omitiendo llamada redundante.');
      return { 
        success: false, 
        reason: 'already_syncing', 
        profile: cloudProfile,
        hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true
      };
    }

    if (!isSupabaseConfigured || !supabase) {
      setSyncStatus('offline');
      return { 
        success: false, 
        reason: 'not_configured', 
        profile: cloudProfile,
        hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true
      };
    }

    const targetUser = userOverride || syncUser;
    if (!targetUser || !targetUser.id) {
      setSyncStatus('idle');
      return { 
        success: false, 
        reason: 'unauthenticated', 
        profile: cloudProfile,
        hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true
      };
    }

    const userId = targetUser.id;
    isSyncingRef.current = true;
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      // Bloque try/catch independiente para profiles (evita detener la descarga de transacciones/cuentas si falla)
      try {
        const remoteProfileRes = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (remoteProfileRes?.data) {
          cloudProfile = remoteProfileRes.data;
        }
      } catch (profileErr) {
        console.warn('[useDataSync] Lectura de profiles omitida de forma segura:', profileErr);
      }

      // Descargar las tablas principales en paralelo usando Promise.allSettled
      const [
        accountsRes,
        txsRes,
        debtsRes,
        investmentsRes,
        recurringRes,
        budgetsRes,
        categoriesRes,
        goalsRes
      ] = await Promise.allSettled([
        supabase.from('accounts').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('debts').select('*').eq('user_id', userId),
        supabase.from('investments').select('*').eq('user_id', userId),
        supabase.from('recurring_payments').select('*').eq('user_id', userId),
        supabase.from('budgets').select('*').eq('user_id', userId),
        supabase.from('categories').select('*').eq('user_id', userId),
        supabase.from('savings_goals').select('*').eq('user_id', userId)
      ]);

      const safeCloudProfile = cloudProfile || null;
      const hasCompletedOnboarding = safeCloudProfile?.has_completed_onboarding ?? true;

      if (safeCloudProfile && typeof setUserProfile === 'function') {
        const displayName = safeCloudProfile.display_name || safeCloudProfile.name;
        const photoUrl = safeCloudProfile.photo_url || safeCloudProfile.photo;
        setUserProfile(prev => ({
          ...prev,
          name: displayName || prev?.name || 'Usuario',
          photo: photoUrl || prev?.photo || null,
          initials: (displayName || prev?.name || 'US')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(w => w[0].toUpperCase())
            .join('') || 'US'
        }));
      }

      // Cuentas
      if (accountsRes.status === 'fulfilled' && !accountsRes.value.error && Array.isArray(accountsRes.value.data)) {
        if (accountsRes.value.data.length > 0) {
          if (typeof setAccounts === 'function') {
            setAccounts(accountsRes.value.data.map(a => {
              const balanceVal = Number(a.balance ?? a.current_balance ?? a.initial_balance ?? a.initialBalance ?? 0);
              const initBal = Number(a.initial_balance ?? a.initialBalance ?? a.balance ?? a.current_balance ?? 0);
              return {
                ...a,
                initial_balance: initBal,
                initialBalance: initBal,
                balance: balanceVal,
                current_balance: balanceVal,
                currentBalance: balanceVal
              };
            }));
          }
        } else if ((latestDataRef.current.accounts || []).length > 0) {
          // Si la nube está vacía pero localmente hay cuentas (ej. Onboarding), sincronizar hacia la nube
          setTimeout(() => {
            pushLocalToCloud();
          }, 800);
        }
      }

      // Transacciones
      if (txsRes.status === 'fulfilled' && !txsRes.value.error && Array.isArray(txsRes.value.data)) {
        if (txsRes.value.data.length > 0) {
          if (typeof setTransactions === 'function') {
            setTransactions(txsRes.value.data.map(t => {
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
            }));
          }
        }
      }

      // Deudas
      if (debtsRes.status === 'fulfilled' && !debtsRes.value.error && Array.isArray(debtsRes.value.data)) {
        if (debtsRes.value.data.length > 0) {
          if (typeof setDebtsAndLoans === 'function') {
            setDebtsAndLoans(debtsRes.value.data.map(d => {
              const rawData = d.raw_data && typeof d.raw_data === 'object' ? d.raw_data : {};
              const metadataObj = d.metadata && typeof d.metadata === 'object' ? d.metadata : {};
              const personName = d.person || d.person_name || d.name || 'Sin nombre';
              const parsedTotal = Number(d.total_amount ?? d.totalAmount ?? d.amount ?? d.principalAmount ?? d.remaining_amount ?? 0);
              const parsedRemaining = d.remaining_amount !== null && d.remaining_amount !== undefined && Number(d.remaining_amount) > 0
                ? Number(d.remaining_amount)
                : (d.remainingAmount !== null && d.remainingAmount !== undefined && Number(d.remainingAmount) > 0 ? Number(d.remainingAmount) : parsedTotal);

              // Recuperar abonos de d.payments, raw_data.payments, o metadata.payments
              let parsedPayments = [];
              if (Array.isArray(d.payments)) {
                parsedPayments = d.payments;
              } else if (Array.isArray(rawData.payments)) {
                parsedPayments = rawData.payments;
              } else if (Array.isArray(metadataObj.payments)) {
                parsedPayments = metadataObj.payments;
              } else if (typeof d.notes === 'string' && d.notes.startsWith('PAYMENTS_JSON:')) {
                try {
                  parsedPayments = JSON.parse(d.notes.replace('PAYMENTS_JSON:', ''));
                } catch {}
              }

              return {
                ...d,
                person: personName,
                personName: personName,
                name: personName,
                total_amount: parsedTotal,
                totalAmount: parsedTotal,
                principalAmount: parsedTotal,
                amount: parsedTotal,
                remaining_amount: parsedRemaining,
                remainingAmount: parsedRemaining,
                remainingCapital: parsedRemaining,
                payments: Array.isArray(parsedPayments) ? parsedPayments : []
              };
            }));
          }
        }
      }

      // Inversiones
      if (investmentsRes.status === 'fulfilled' && !investmentsRes.value.error && Array.isArray(investmentsRes.value.data)) {
        if (investmentsRes.value.data.length > 0) {
          if (typeof setInvestments === 'function') {
            setInvestments(investmentsRes.value.data.map(inv => {
              const invAmount = Number(inv.invested_amount ?? inv.investedAmount ?? inv.current_value ?? inv.currentValue ?? inv.amount ?? 0);
              const currVal = Number(inv.current_value ?? inv.currentValue ?? inv.invested_amount ?? inv.investedAmount ?? inv.amount ?? 0);
              return {
                ...inv,
                amount: invAmount,
                investedAmount: invAmount,
                invested_amount: invAmount,
                currentValue: currVal,
                current_value: currVal,
                type: inv.subtype || inv.type || 'stock',
                subtype: inv.subtype || inv.type || 'stock'
              };
            }));
          }
        }
      }

      // Pagos recurrentes
      if (recurringRes.status === 'fulfilled' && !recurringRes.value.error && Array.isArray(recurringRes.value.data)) {
        if (recurringRes.value.data.length > 0) {
          if (typeof setRecurringPayments === 'function') {
            setRecurringPayments(recurringRes.value.data);
          }
        }
      }

      // Presupuestos
      let loadedGlobal = null;
      let categoriesMap = {};

      if (budgetsRes.status === 'fulfilled' && !budgetsRes.value.error && Array.isArray(budgetsRes.value.data)) {
        const remoteBudgetList = budgetsRes.value.data;
        // Priorizar explícitamente registro con is_global: true
        const globalRow = remoteBudgetList.find(b => b.is_global === true || b.is_global === 'true')
          || remoteBudgetList.find(b => b.isGlobal === true || b.isGlobal === 'true')
          || remoteBudgetList.find(b => b.name === 'Límite Global' || b.name === 'Presupuesto Global' || !b.category_id);

        if (globalRow) {
          loadedGlobal = Number(globalRow.amount || 0);
          if (globalRow.id) {
            try {
              localStorage.setItem('global_budget_id', String(globalRow.id));
            } catch {}
          }
        }
        remoteBudgetList.forEach(b => {
          const isRowGlobal = b.is_global === true || b.is_global === 'true' || b.isGlobal === true || b.isGlobal === 'true' || b.name === 'Límite Global' || b.name === 'Presupuesto Global' || !b.category_id;
          if (!isRowGlobal && b.category_id) {
            categoriesMap[b.category_id] = Number(b.amount || 0);
          }
        });
      }

      // Si no se obtuvo de la tabla budgets, consultar user_settings
      try {
        const { data: userSettingsData, error: userSettingsError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (userSettingsError) {
          console.warn('[useDataSync] Consulta a user_settings omitida (404/PGRST204):', userSettingsError.message || userSettingsError);
        } else if (userSettingsData) {
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
      } catch (err) {
        console.warn('[useDataSync] Fallo defensivo al leer user_settings:', err);
      }

      // Fallback al almacenamiento local bajo global_budget_limit o user_settings si loadedGlobal sigue en null
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

      if (typeof setBudgets === 'function' && loadedGlobal !== null) {
        const resolvedBudgets = {
          global: loadedGlobal,
          categories: categoriesMap
        };
        setBudgets(resolvedBudgets);
        try {
          localStorage.setItem('presu_budgets_v1', JSON.stringify(resolvedBudgets));
          localStorage.setItem('budgets', JSON.stringify(resolvedBudgets));
          localStorage.setItem('global_budget_limit', String(loadedGlobal));
          const existingLocalSettings = localStorage.getItem('user_settings');
          if (!existingLocalSettings) {
            localStorage.setItem('user_settings', JSON.stringify({
              user_id: userId,
              global_budget_limit: loadedGlobal,
              updated_at: new Date().toISOString()
            }));
          }
        } catch {}
      }

      // Categorías
      if (categoriesRes.status === 'fulfilled' && !categoriesRes.value.error && Array.isArray(categoriesRes.value.data) && categoriesRes.value.data.length > 0) {
        if (typeof setCategories === 'function') {
          setCategories(categoriesRes.value.data);
        }
      }

      // Metas de ahorro
      if (goalsRes.status === 'fulfilled' && !goalsRes.value.error && Array.isArray(goalsRes.value.data)) {
        if (typeof setSavingsGoals === 'function') {
          setSavingsGoals(goalsRes.value.data);
        }
      }

      setSyncStatus('synced');
      hasInitialPullCompletedRef.current = true;
      setLastSyncTime(new Date());
      return { 
        success: true, 
        profile: safeCloudProfile,
        hasCompletedOnboarding
      };
    } catch (err) {
      console.warn('[useDataSync] Error en pull de Supabase:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Error descargando datos');
      return { 
        success: false, 
        error: err, 
        profile: cloudProfile,
        hasCompletedOnboarding: cloudProfile?.has_completed_onboarding ?? true
      };
    } finally {
      isSyncingRef.current = false;
    }
  }, [
    syncUser,
    setAccounts,
    setTransactions,
    setDebtsAndLoans,
    setInvestments,
    setRecurringPayments,
    setBudgets,
    setCategories,
    setSavingsGoals,
    setUserProfile
  ]);

  // ==========================================================================
  // SUBIDA LOCAL A LA NUBE (PUSH LOCAL TO CLOUD)
  // ==========================================================================
  const pushLocalToCloud = useCallback(async () => {
    if (isSyncingRef.current) {
      return { success: false, reason: 'already_syncing' };
    }
    if (!isSupabaseConfigured || !supabase || !syncUser?.id) {
      return { success: false, reason: 'unauthenticated' };
    }

    const userId = syncUser.id;
    isSyncingRef.current = true;
    setSyncStatus('syncing');

    try {
      const nowIso = new Date().toISOString();
      const current = latestDataRef.current;

      // 1. SINCRONIZAR CUENTAS PRIMERO (Para satisfacer Foreign Keys en Supabase)
      const accountsPayload = (current.accounts || []).map(a => {
        const bal = Number(a.balance ?? a.currentBalance ?? a.initialBalance ?? a.initial_balance ?? 0);
        const initBal = Number(a.initial_balance ?? a.initialBalance ?? a.balance ?? a.currentBalance ?? 0);
        return {
          id: ensureUUID(a.id),
          user_id: userId,
          name: a.name || 'Cuenta',
          type: a.type || 'bank',
          balance: bal,
          initial_balance: initBal,
          currency: a.currency || 'COP',
          icon: a.icon || null,
          color: a.color || null,
          updated_at: nowIso
        };
      });

      if (accountsPayload.length > 0) {
        let accRes = await supabase.from('accounts').upsert(accountsPayload, { onConflict: 'id' });
        if (accRes.error && (accRes.error.code === '42P10' || accRes.error.message?.includes('ON CONFLICT') || accRes.error.message?.includes('on_conflict'))) {
          accRes = await supabase.from('accounts').upsert(accountsPayload, { onConflict: 'id,user_id' });
        }
        if (accRes.error && (accRes.error.code === 'PGRST204' || accRes.error.message?.includes('column') || accRes.error.code === '42703')) {
          const errMsg = accRes.error.message || '';
          const hasInitBalIssue = errMsg.includes("'initial_balance'") || errMsg.includes('initial_balance');
          const hasUpdatedColIssue = errMsg.includes("'updated_at'") || errMsg.includes('updated_at');
          const hasIconIssue = errMsg.includes("'icon'") || errMsg.includes('icon');
          const hasColorIssue = errMsg.includes("'color'") || errMsg.includes('color');

          const safeAccs = accountsPayload.map(a => {
            const copy = {
              id: a.id,
              user_id: a.user_id,
              name: a.name,
              type: a.type,
              balance: a.balance,
              currency: a.currency
            };
            if (!hasInitBalIssue) copy.initial_balance = a.initial_balance;
            if (!hasIconIssue) copy.icon = a.icon;
            if (!hasColorIssue) copy.color = a.color;
            if (!hasUpdatedColIssue) copy.updated_at = a.updated_at;
            return copy;
          });

          accRes = await supabase.from('accounts').upsert(safeAccs, { onConflict: 'id' });
          if (accRes.error && (accRes.error.code === '42P10' || accRes.error.message?.includes('ON CONFLICT') || accRes.error.message?.includes('on_conflict'))) {
            accRes = await supabase.from('accounts').upsert(safeAccs, { onConflict: 'id,user_id' });
          }
        }
        if (accRes.error) {
          console.error('[useDataSync] Error en accounts upsert:', {
            message: accRes.error.message,
            details: accRes.error.details,
            hint: accRes.error.hint,
            code: accRes.error.code
          });
        }
      }

      // 2. PREPARAR Y VALIDAR TRANSACCIONES CON CLAVE FORÁNEA EXISTENTE
      const validAccountIds = new Set(accountsPayload.map(a => a.id));
      const defaultAccountId = accountsPayload[0]?.id || null;
      const categoryMap = new Map((current.categories || []).map(c => [c.id, c.name]));

      const txsPayload = (current.transactions || []).map(t => {
        const rawAccId = t.accountId ? ensureUUID(t.accountId) : (t.account_id ? ensureUUID(t.account_id) : null);
        // Validar que account_id corresponda a una cuenta que ya exista en accounts para evitar violación de Foreign Key
        const resolvedAccountId = (rawAccId && validAccountIds.has(rawAccId)) 
          ? rawAccId 
          : defaultAccountId;

        const catId = t.categoryId || t.category_id || null;
        const resolvedCategory = t.category || t.categoryName || t.category_name || (catId ? categoryMap.get(catId) : null) || catId || 'General';

        return {
          id: ensureUUID(t.id),
          user_id: userId,
          account_id: resolvedAccountId,
          amount: Number(t.amount || 0),
          type: t.type || 'expense',
          date: t.date || nowIso.split('T')[0],
          description: t.description || 'Movimiento',
          category: resolvedCategory || 'General',
          category_id: catId || resolvedCategory || null,
          notes: t.notes || '',
          is_transfer: Boolean(t.is_transfer || t.isTransfer || false),
          updated_at: nowIso
        };
      });

      if (txsPayload.length > 0) {
        let txRes = await supabase.from('transactions').upsert(txsPayload, { onConflict: 'id' });
        if (txRes.error && (txRes.error.code === '42P10' || txRes.error.message?.includes('ON CONFLICT') || txRes.error.message?.includes('on_conflict'))) {
          txRes = await supabase.from('transactions').upsert(txsPayload, { onConflict: 'id,user_id' });
        }

        // Si falla por PGRST204 o columnas no encontradas en schema Supabase:
        if (txRes.error && (txRes.error.code === 'PGRST204' || txRes.error.message?.includes('column') || txRes.error.code === '42703' || txRes.error.details?.includes('column'))) {
          const errText = `${txRes.error.message || ''} ${txRes.error.details || ''} ${txRes.error.hint || ''}`;
          console.warn('[useDataSync] transactions falló por columna no encontrada en schema cache (PGRST204). Omitiendo campos no soportados...', errText);

          const sanitizedTxsPayload = txsPayload.map((tx) => {
            const copy = { ...tx };
            if (errText.includes('updated_at')) {
              delete copy.updated_at;
            }
            if (errText.includes('is_transfer') || txRes.error.code === 'PGRST204') {
              delete copy.is_transfer;
            }
            if (errText.includes('category_id')) {
              delete copy.category_id;
            }
            if (errText.includes('notes')) {
              delete copy.notes;
            }
            copy.category = copy.category || 'General';
            return copy;
          });
          
          txRes = await supabase.from('transactions').upsert(sanitizedTxsPayload, { onConflict: 'id' });
          if (txRes.error && (txRes.error.code === '42P10' || txRes.error.message?.includes('ON CONFLICT') || txRes.error.message?.includes('on_conflict'))) {
            txRes = await supabase.from('transactions').upsert(sanitizedTxsPayload, { onConflict: 'id,user_id' });
          }

          // Fallback final estricto: solo enviar campos requeridos id, user_id, account_id, amount, type, date, description y category (sin updated_at)
          if (txRes.error && (txRes.error.code === 'PGRST204' || txRes.error.message?.includes('column') || txRes.error.code === '23502')) {
            console.warn('[useDataSync] Aplicando fallback estricto de transacciones con category requerida (sin updated_at)...');
            const strictlyRequiredPayload = txsPayload.map((tx) => {
              const row = {
                id: tx.id,
                user_id: tx.user_id,
                account_id: tx.account_id,
                amount: tx.amount,
                type: tx.type,
                date: tx.date,
                description: tx.description,
                category: tx.category || 'General'
              };
              if (!txRes.error.message?.includes('category_id')) {
                row.category_id = tx.category_id || tx.category || null;
              }
              return row;
            });

            txRes = await supabase.from('transactions').upsert(strictlyRequiredPayload, { onConflict: 'id' });
            if (txRes.error && (txRes.error.code === '42P10' || txRes.error.message?.includes('ON CONFLICT') || txRes.error.message?.includes('on_conflict'))) {
              txRes = await supabase.from('transactions').upsert(strictlyRequiredPayload, { onConflict: 'id,user_id' });
            }
          }
        }

        if (txRes.error) {
          console.error('[useDataSync] Error en transactions upsert:', {
            message: txRes.error.message,
            details: txRes.error.details,
            hint: txRes.error.hint,
            code: txRes.error.code
          });
        }
      }

      // 3. SINCRONIZAR DEUDAS Y PRÉSTAMOS
      const debtsPayload = (current.debtsAndLoans || []).map(d => {
        const resolvedPerson = d.person || d.person_name || d.name || 'Sin nombre';
        const resolvedRemaining = d.remaining_amount !== undefined ? d.remaining_amount : (d.remainingAmount !== undefined ? d.remainingAmount : (d.total_amount || d.amount || 0));
        const paymentsList = Array.isArray(d.payments) ? d.payments : [];
        return {
          id: ensureUUID(d.id),
          user_id: userId,
          person: resolvedPerson,
          person_name: resolvedPerson,
          name: resolvedPerson,
          amount: Number(d.amount || d.totalAmount || d.principalAmount || 0),
          total_amount: Number(d.amount || d.totalAmount || d.principalAmount || 0),
          remaining_amount: Number(resolvedRemaining) || 0,
          type: d.type || 'payable',
          status: d.status || (d.isPaid ? 'paid' : 'active'),
          due_date: d.dueDate || d.endDate || null,
          interest_rate: Number(d.interestRate || 0),
          notes: paymentsList.length > 0 ? `PAYMENTS_JSON:${JSON.stringify(paymentsList)}` : (d.notes || ''),
          raw_data: { payments: paymentsList },
          created_at: d.createdAt || d.startDate || nowIso,
          updated_at: nowIso
        };
      });

      if (debtsPayload.length > 0) {
        let dRes = await supabase.from('debts').upsert(debtsPayload, { onConflict: 'id' });
        if (dRes.error && (dRes.error.code === '42P10' || dRes.error.message?.includes('ON CONFLICT') || dRes.error.message?.includes('on_conflict'))) {
          dRes = await supabase.from('debts').upsert(debtsPayload, { onConflict: 'id,user_id' });
        }
        if (dRes.error && (dRes.error.code === 'PGRST204' || dRes.error.code === '42703' || dRes.error.status === 400 || dRes.error.message?.includes('column') || dRes.error.message?.includes('Bad Request'))) {
          const errMsg = dRes.error.message || '';
          const errDetails = dRes.error.details || '';
          const hasNameColIssue = errMsg.includes("'name'") || errMsg.includes('column "name"');
          const hasPersonNameColIssue = errMsg.includes("'person_name'") || errMsg.includes('column "person_name"');
          const hasPersonColIssue = errMsg.includes("'person'") || errMsg.includes('column "person"');
          const hasRemainingColIssue = errMsg.includes("'remaining_amount'") || errMsg.includes('remaining_amount');
          const hasInterestIssue = errMsg.includes("'interest_rate'") || errMsg.includes('interest_rate');
          const hasUpdatedColIssue = errMsg.includes("'updated_at'") || errMsg.includes('updated_at');
          const hasStatusColIssue = errMsg.includes("'status'") || errMsg.includes('status');
          const hasNotesColIssue = errMsg.includes("'notes'") || errMsg.includes('notes') || errDetails.includes('notes');
          const hasRawDataColIssue = errMsg.includes("'raw_data'") || errMsg.includes('raw_data') || errDetails.includes('raw_data');

          const safeDebts = debtsPayload.map(d => {
            const resolvedPerson = d.person || d.person_name || d.name || 'Sin nombre';
            const item = {
              id: d.id,
              user_id: d.user_id,
              type: d.type,
              amount: d.amount,
              total_amount: d.total_amount
            };

            // Columnas prioritarias requeridas por Supabase (person y remaining_amount)
            if (!hasPersonColIssue) {
              item.person = resolvedPerson;
            }
            if (!hasRemainingColIssue) {
              item.remaining_amount = d.remaining_amount;
            }

            // Gestionar name vs person_name
            if (!hasNameColIssue) {
              item.name = resolvedPerson;
            }
            if (!hasPersonNameColIssue) {
              item.person_name = resolvedPerson;
            }

            // Persistencia segura de abonos (solo si no falló por estas columnas)
            if (!hasRawDataColIssue && d.raw_data && Object.keys(d.raw_data).length > 0) {
              item.raw_data = d.raw_data;
            }
            if (!hasNotesColIssue && d.notes) {
              item.notes = d.notes;
            }

            // Columnas opcionales
            if (!hasStatusColIssue) {
              item.status = d.status;
            }
            if (!hasInterestIssue) {
              item.interest_rate = d.interest_rate;
            }
            if (!hasUpdatedColIssue) {
              item.updated_at = d.updated_at;
            }

            return item;
          });

          dRes = await supabase.from('debts').upsert(safeDebts, { onConflict: 'id' });
          if (dRes.error && (dRes.error.code === '42P10' || dRes.error.message?.includes('ON CONFLICT') || dRes.error.message?.includes('on_conflict'))) {
            dRes = await supabase.from('debts').upsert(safeDebts, { onConflict: 'id,user_id' });
          }

          // Fallback ultra-estricto si persisten discrepancias de esquema o error 400
          if (dRes.error && (dRes.error.code === 'PGRST204' || dRes.error.code === '42703' || dRes.error.status === 400 || dRes.error.message?.includes('column') || dRes.error.message?.includes('Bad Request'))) {
            const fallbackErrMsg = dRes.error.message || '';
            const fallbackHasNameColIssue = fallbackErrMsg.includes("'name'") || hasNameColIssue;
            const fallbackHasPersonNameColIssue = fallbackErrMsg.includes("'person_name'") || hasPersonNameColIssue;
            const fallbackHasPersonColIssue = fallbackErrMsg.includes("'person'") || hasPersonColIssue;
            const fallbackHasRemainingColIssue = fallbackErrMsg.includes("'remaining_amount'") || hasRemainingColIssue;
            const fallbackHasTotalAmountIssue = fallbackErrMsg.includes("'total_amount'");
            const fallbackHasAmountIssue = fallbackErrMsg.includes("'amount'");

            const strictlyEssentialDebts = debtsPayload.map(d => {
              const resolvedPerson = d.person || d.person_name || d.name || 'Sin nombre';
              const essential = {
                id: d.id,
                user_id: d.user_id,
                type: d.type
              };

              // Prioridad absoluta: person, remaining_amount, total_amount/amount
              if (!fallbackHasPersonColIssue) {
                essential.person = resolvedPerson;
              }
              if (!fallbackHasRemainingColIssue) {
                essential.remaining_amount = d.remaining_amount;
              }
              if (!fallbackHasPersonNameColIssue) {
                essential.person_name = resolvedPerson;
              }
              if (!fallbackHasNameColIssue) {
                essential.name = resolvedPerson;
              }

              if (!fallbackHasTotalAmountIssue) {
                essential.total_amount = d.total_amount;
              }
              if (!fallbackHasAmountIssue && fallbackHasTotalAmountIssue) {
                essential.amount = d.amount;
              }

              return essential;
            });

            dRes = await supabase.from('debts').upsert(strictlyEssentialDebts, { onConflict: 'id' });
            if (dRes.error && (dRes.error.code === '42P10' || dRes.error.message?.includes('ON CONFLICT') || dRes.error.message?.includes('on_conflict'))) {
              dRes = await supabase.from('debts').upsert(strictlyEssentialDebts, { onConflict: 'id,user_id' });
            }
          }
        }
        if (dRes.error) {
          console.error('[useDataSync] Error en debts upsert:', {
            message: dRes.error.message,
            details: dRes.error.details,
            hint: dRes.error.hint,
            code: dRes.error.code
          });
        }
      }

      // 4. SINCRONIZAR INVERSIONES
      const invsPayload = (current.investments || []).map(inv => {
        const invVal = Number(inv.invested_amount ?? inv.investedAmount ?? inv.amount ?? inv.totalInvested ?? inv.current_value ?? inv.currentValue ?? 0);
        const currVal = Number(inv.current_value ?? inv.currentValue ?? invVal);
        return {
          id: ensureUUID(inv.id),
          user_id: userId,
          name: inv.name || 'Inversión',
          category: inv.category || 'stock',
          subtype: inv.subtype || inv.type || 'stock',
          institution: inv.institution || null,
          currency: inv.currency || 'COP',
          invested_amount: invVal,
          current_value: currVal,
          ticker: inv.ticker || null,
          shares: inv.shares ? Number(inv.shares) : null,
          rate: inv.rate ? Number(inv.rate) : null,
          issue_date: inv.issue_date || inv.issueDate || null,
          due_date: inv.due_date || inv.dueDate || null,
          updated_at: nowIso
        };
      });

      if (invsPayload.length > 0) {
        let invRes = await supabase.from('investments').upsert(invsPayload, { onConflict: 'id' });
        if (invRes.error && (invRes.error.code === '42P10' || invRes.error.message?.includes('ON CONFLICT') || invRes.error.message?.includes('on_conflict'))) {
          invRes = await supabase.from('investments').upsert(invsPayload, { onConflict: 'id,user_id' });
        }
        if (invRes.error && (invRes.error.code === 'PGRST204' || invRes.error.message?.includes('column') || invRes.error.code === '42703')) {
          const errMsg = invRes.error.message || '';
          const hasSubtypeIssue = errMsg.includes("'subtype'") || errMsg.includes('subtype');
          const hasSharesIssue = errMsg.includes("'shares'") || errMsg.includes('shares');
          const hasRateIssue = errMsg.includes("'rate'") || errMsg.includes('rate');
          const hasDueDateIssue = errMsg.includes("'due_date'") || errMsg.includes('due_date');
          const hasIssueDateIssue = errMsg.includes("'issue_date'") || errMsg.includes('issue_date');
          const hasInstitutionIssue = errMsg.includes("'institution'") || errMsg.includes('institution');
          const hasInvestedAmtIssue = errMsg.includes("'invested_amount'") || errMsg.includes('invested_amount');
          const hasUpdatedIssue = errMsg.includes("'updated_at'") || errMsg.includes('updated_at');

          const safeInvs = invsPayload.map(inv => {
            const item = {
              id: inv.id,
              user_id: inv.user_id,
              name: inv.name,
              category: inv.category,
              currency: inv.currency,
              current_value: inv.current_value,
              ticker: inv.ticker
            };
            if (!hasInvestedAmtIssue) item.invested_amount = inv.invested_amount;
            else item.amount = inv.invested_amount;

            if (!hasSubtypeIssue) item.subtype = inv.subtype;
            if (!hasInstitutionIssue) item.institution = inv.institution;
            if (!hasSharesIssue) item.shares = inv.shares;
            if (!hasRateIssue) item.rate = inv.rate;
            if (!hasIssueDateIssue) item.issue_date = inv.issue_date;
            if (!hasDueDateIssue) item.due_date = inv.due_date;
            if (!hasUpdatedIssue) item.updated_at = inv.updated_at;
            return item;
          });

          invRes = await supabase.from('investments').upsert(safeInvs, { onConflict: 'id' });
          if (invRes.error && (invRes.error.code === '42P10' || invRes.error.message?.includes('ON CONFLICT') || invRes.error.message?.includes('on_conflict'))) {
            invRes = await supabase.from('investments').upsert(safeInvs, { onConflict: 'id,user_id' });
          }

          // Fallback esencial mínimo si continúan discrepancias
          if (invRes.error && (invRes.error.code === 'PGRST204' || invRes.error.message?.includes('column') || invRes.error.code === '42703')) {
            const strictlyEssentialInvs = invsPayload.map(inv => ({
              id: inv.id,
              user_id: inv.user_id,
              name: inv.name,
              invested_amount: inv.invested_amount,
              currency: inv.currency
            }));

            invRes = await supabase.from('investments').upsert(strictlyEssentialInvs, { onConflict: 'id' });
            if (invRes.error && (invRes.error.code === '42P10' || invRes.error.message?.includes('ON CONFLICT') || invRes.error.message?.includes('on_conflict'))) {
              invRes = await supabase.from('investments').upsert(strictlyEssentialInvs, { onConflict: 'id,user_id' });
            }
          }
        }
        if (invRes.error) {
          console.error('[useDataSync] Error en investments upsert:', {
            message: invRes.error.message,
            details: invRes.error.details,
            hint: invRes.error.hint,
            code: invRes.error.code
          });
        }
      }

      // 5. SINCRONIZAR PAGOS RECURRENTES
      const recurringPayload = (current.recurringPayments || []).map(r => ({
        id: ensureUUID(r.id),
        user_id: userId,
        name: r.name || 'Suscripción',
        amount: Number(r.amount || 0),
        category: r.category || r.categoryName || 'General',
        frequency: r.frequency || 'monthly',
        billing_day: Number(r.billingDay || 1),
        is_active: r.isActive !== false,
        account_id: r.accountId ? ensureUUID(r.accountId) : null,
        next_payment_date: r.nextPaymentDate || r.next_payment_date || null,
        type: r.type || 'expense',
        updated_at: nowIso
      }));

      if (recurringPayload.length > 0) {
        let recRes = await supabase.from('recurring_payments').upsert(recurringPayload, { onConflict: 'id' });
        if (recRes.error && (recRes.error.code === '42P10' || recRes.error.message?.includes('ON CONFLICT') || recRes.error.message?.includes('on_conflict'))) {
          recRes = await supabase.from('recurring_payments').upsert(recurringPayload, { onConflict: 'id,user_id' });
        }
        if (recRes.error && (recRes.error.code === 'PGRST204' || recRes.error.message?.includes('column') || recRes.error.code === '42703')) {
          const errMsg = recRes.error.message || '';
          const hasTypeColIssue = errMsg.includes("'type'") || errMsg.includes('type');
          const hasUpdatedColIssue = errMsg.includes("'updated_at'") || errMsg.includes('updated_at');
          const hasBillingDayColIssue = errMsg.includes("'billing_day'") || errMsg.includes('billing_day');

          // Fallback con los campos base esenciales
          const safeRec = recurringPayload.map(r => {
            const baseObj = {
              id: r.id,
              user_id: r.user_id,
              name: r.name,
              amount: r.amount,
              category: r.category,
              frequency: r.frequency,
              is_active: r.is_active,
              account_id: r.account_id,
              next_payment_date: r.next_payment_date
            };
            if (!hasBillingDayColIssue) {
              baseObj.billing_day = r.billing_day;
            }
            if (!hasTypeColIssue) {
              baseObj.type = r.type;
            }
            if (!hasUpdatedColIssue) {
              baseObj.updated_at = r.updated_at;
            }
            return baseObj;
          });

          recRes = await supabase.from('recurring_payments').upsert(safeRec, { onConflict: 'id' });
          if (recRes.error && (recRes.error.code === '42P10' || recRes.error.message?.includes('ON CONFLICT') || recRes.error.message?.includes('on_conflict'))) {
            recRes = await supabase.from('recurring_payments').upsert(safeRec, { onConflict: 'id,user_id' });
          }

          // Si aún falla con PGRST204 o falta de columnas, fallback ultra-estricto con los campos mínimos universales
          if (recRes.error && (recRes.error.code === 'PGRST204' || recRes.error.message?.includes('column') || recRes.error.code === '42703')) {
            const strictlyEssentialRec = recurringPayload.map(r => ({
              id: r.id,
              user_id: r.user_id,
              name: r.name,
              amount: r.amount,
              category: r.category,
              frequency: r.frequency,
              is_active: r.is_active
            }));

            recRes = await supabase.from('recurring_payments').upsert(strictlyEssentialRec, { onConflict: 'id' });
            if (recRes.error && (recRes.error.code === '42P10' || recRes.error.message?.includes('ON CONFLICT') || recRes.error.message?.includes('on_conflict'))) {
              recRes = await supabase.from('recurring_payments').upsert(strictlyEssentialRec, { onConflict: 'id,user_id' });
            }
          }
        }
        if (recRes.error) {
          console.error('[useDataSync] Error en recurring_payments upsert:', {
            message: recRes.error.message,
            details: recRes.error.details,
            hint: recRes.error.hint,
            code: recRes.error.code
          });
        }
      }

      // 6. SINCRONIZAR PERFIL DE USUARIO
      if (current.userProfile && (current.userProfile.name || current.userProfile.photo)) {
        const profileName = current.userProfile.name || 'Usuario';
        const profilePhoto = current.userProfile.photo || null;

        // Intentar update primero (aprovecha la RLS policy "Users can update own profile")
        let profRes = await supabase.from('profiles')
          .update({
            display_name: profileName,
            photo_url: profilePhoto,
            updated_at: nowIso
          })
          .eq('id', userId);

        // Si falla por columnas diferentes (ej. schema estándar con full_name/avatar_url)
        if (profRes.error && (profRes.error.message?.includes('column') || profRes.error.code === '42703')) {
          profRes = await supabase.from('profiles')
            .update({
              full_name: profileName,
              avatar_url: profilePhoto,
              updated_at: nowIso
            })
            .eq('id', userId);
        }

        // Si update no aplicó o falló, intentar upsert con ambas combinaciones
        if (profRes.error) {
          let upRes = await supabase.from('profiles').upsert([{
            id: userId,
            email: syncUser.email || null,
            display_name: profileName,
            photo_url: profilePhoto,
            updated_at: nowIso
          }], { onConflict: 'id' });

          if (upRes.error && (upRes.error.message?.includes('column') || upRes.error.code === '42703')) {
            upRes = await supabase.from('profiles').upsert([{
              id: userId,
              email: syncUser.email || null,
              full_name: profileName,
              avatar_url: profilePhoto,
              updated_at: nowIso
            }], { onConflict: 'id' });
          }

          if (upRes.error) {
            console.error('[useDataSync] Error en profiles upsert:', {
              message: upRes.error.message,
              details: upRes.error.details,
              hint: upRes.error.hint,
              code: upRes.error.code
            });
          }
        }
      }

      // 7. SINCRONIZAR PRESUPUESTOS (Global y Categorías)
      if (current.budgets) {
        try {
          const globalLimit = Number(current.budgets.global || 0);
          const savedGlobalId = localStorage.getItem('global_budget_id');
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          const globalBudgetId = (savedGlobalId && uuidRegex.test(savedGlobalId))
            ? savedGlobalId
            : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ensureUUID(`${userId}-global-budget`));
          try {
            localStorage.setItem('global_budget_id', globalBudgetId);
          } catch {}

          const globalBudgetRecord = {
            id: current.budgets.id || globalBudgetId,
            user_id: userId,
            name: current.budgets.name || 'Límite Global',
            category: current.budgets.category || 'General',
            period: current.budgets.period || 'monthly',
            amount: Number(current.budgets.amount ?? globalLimit) || 0,
            is_global: current.budgets.is_global !== undefined ? Boolean(current.budgets.is_global) : true,
            updated_at: nowIso
          };

          const budgetsPayload = [globalBudgetRecord];

          if (current.budgets.categories && typeof current.budgets.categories === 'object') {
            Object.entries(current.budgets.categories).forEach(([catId, amount]) => {
              const numAmt = Number(amount || 0);
              if (numAmt > 0) {
                budgetsPayload.push({
                  id: ensureUUID(`${userId}-budget-${catId}`),
                  user_id: userId,
                  name: `Presupuesto ${catId}`,
                  category: catId || 'General',
                  category_id: catId,
                  period: current.budgets.period || 'monthly',
                  amount: numAmt,
                  is_global: false,
                  updated_at: nowIso
                });
              }
            });
          }

          let bRes = await supabase.from('budgets').upsert(budgetsPayload, { onConflict: 'id' });
          if (bRes.error) {
            console.warn('[useDataSync] Fallo en upsert budgets con payload completo (400/schema):', bRes.error.message || bRes.error);
            // Fallback defensivo a localStorage bajo global_budget_limit
            try {
              localStorage.setItem('global_budget_limit', String(globalLimit));
            } catch {}

            // Fallback con columnas esenciales incluyendo category y period
            try {
              const safeBudgets = budgetsPayload.map(b => ({
                id: b.id,
                user_id: b.user_id,
                name: b.name || 'Límite Global',
                category: b.category || 'General',
                period: b.period || 'monthly',
                amount: b.amount,
                updated_at: b.updated_at
              }));
              await supabase.from('budgets').upsert(safeBudgets, { onConflict: 'id' });
            } catch (fallbackErr) {
              console.warn('[useDataSync] Reintento esencial budgets omitido:', fallbackErr);
            }
          } else {
            try {
              localStorage.setItem('global_budget_limit', String(globalLimit));
            } catch {}
          }

          // Respaldo en user_settings con upsert basado en user_id
          try {
            const { error: settingsError } = await supabase
              .from('user_settings')
              .upsert(
                { user_id: userId, global_budget_limit: globalLimit, updated_at: nowIso },
                { onConflict: 'user_id' }
              );

            if (settingsError) {
              console.warn('[useDataSync] Upsert en user_settings omitido (404/PGRST204):', settingsError.message || settingsError);
            }
          } catch (settingsEx) {
            console.warn('[useDataSync] Fallo defensivo al persistir en user_settings:', settingsEx);
          }

          try {
            localStorage.setItem('user_settings', JSON.stringify({
              user_id: userId,
              global_budget_limit: globalLimit,
              updated_at: nowIso
            }));
          } catch {}
        } catch (bErr) {
          console.warn('[useDataSync] Sincronización de budgets omitida de forma segura:', bErr);
        }
      }

      setSyncStatus('synced');
      setLastSyncTime(new Date());
      return { success: true };
    } catch (err) {
      console.error('[useDataSync] Error general en pushLocalToCloud:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        stack: err?.stack
      });
      setSyncStatus('error');
      return { success: false, error: err };
    } finally {
      isSyncingRef.current = false;
    }
  }, [syncUser]);

  // Sincronización automática con debounce al modificar datos teniendo sesión activa
  const autoSyncTimerRef = useRef(null);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !syncUser?.id || syncUser.id === 'local-user') {
      return;
    }
    if (isSyncingRef.current) return;
    if (!hasInitialPullCompletedRef.current) return;

    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
    }

    autoSyncTimerRef.current = setTimeout(() => {
      pushLocalToCloud();
    }, 1500);

    return () => {
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current);
      }
    };
  }, [
    accounts,
    transactions,
    debtsAndLoans,
    investments,
    recurringPayments,
    budgets,
    syncUser?.id,
    pushLocalToCloud
  ]);

  // Mantener referencia actualizada de pullCloudToLocal para el listener de autenticación
  const pullCloudToLocalRef = useRef(pullCloudToLocal);
  pullCloudToLocalRef.current = pullCloudToLocal;

  // Auth listener: Se registra una sola vez en montaje para evitar bucles infinitos de reintentos
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let isSubscribed = true;

    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (!isSubscribed) return;
      if (!error && user) {
        setSyncUser(user);
        if (pullCloudToLocalRef.current && !isSyncingRef.current) {
          pullCloudToLocalRef.current(user);
        }
      }
    }).catch((err) => {
      console.warn('[useDataSync] Error en getUser:', err);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;
      const authUser = session?.user || null;
      setSyncUser(authUser);
      if (event === 'SIGNED_IN' && authUser) {
        if (pullCloudToLocalRef.current && !isSyncingRef.current) {
          pullCloudToLocalRef.current(authUser);
        }
      } else if (event === 'SIGNED_OUT') {
        setSyncUser(null);
        setSyncStatus('idle');
      }
    });

    return () => {
      isSubscribed = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signOutCloud = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
  }, []);

  return {
    syncStatus,
    syncUser,
    isCloudEnabled: Boolean(isSupabaseConfigured && syncUser),
    isConfigured: isSupabaseConfigured,
    lastSyncTime,
    syncError,
    pushLocalToCloud,
    pullCloudToLocal,
    signOutCloud
  };
}

export default useDataSync;
