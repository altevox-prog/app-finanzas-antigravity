import { generateUUID } from './recordMerger';

export function createDemoTransactions(accounts = []) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Usar primera cuenta disponible o ID estándar de cuenta
  const accountId = accounts[0]?.id || '00000002-0000-4000-8000-000000000002';

  return [
    {
      id: generateUUID(),
      accountId,
      account_id: accountId,
      amount: 35000,
      originalAmount: 35000,
      type: 'expense',
      categoryId: 'cat-alimentacion',
      category_id: 'cat-alimentacion',
      categoryName: 'Alimentación',
      category: 'Alimentación',
      subcategoryId: 'sub-mercado',
      subcategoryName: '🛒 Mercado / Supermercado',
      notes: 'Supermercado semanal (Semana 1)',
      date: `${year}-${month}-03`,
      createdAt: new Date(`${year}-${month}-03T12:00:00Z`).toISOString()
    },
    {
      id: generateUUID(),
      accountId,
      account_id: accountId,
      amount: 90000,
      originalAmount: 90000,
      type: 'expense',
      categoryId: 'cat-servicios',
      category_id: 'cat-servicios',
      categoryName: 'Servicios',
      category: 'Servicios',
      subcategoryId: 'sub-energia',
      subcategoryName: '⚡ Energía eléctrica',
      notes: 'Pago de servicios públicos (Semana 2)',
      date: `${year}-${month}-10`,
      createdAt: new Date(`${year}-${month}-10T14:30:00Z`).toISOString()
    },
    {
      id: generateUUID(),
      accountId,
      account_id: accountId,
      amount: 250000,
      originalAmount: 250000,
      type: 'income',
      categoryId: 'cat-ingresos',
      category_id: 'cat-ingresos',
      categoryName: 'Ingresos',
      category: 'Ingresos',
      subcategoryId: 'sub-freelance',
      subcategoryName: '💻 Honorarios y freelance',
      notes: 'Honorarios proyecto freelance',
      date: `${year}-${month}-05`,
      createdAt: new Date(`${year}-${month}-05T10:00:00Z`).toISOString()
    }
  ];
}

export function seedTestTransactions(accounts = []) {
  try {
    const demoTxs = createDemoTransactions(accounts);
    const existingRaw = localStorage.getItem('presu_transactions') || '[]';
    let existing = [];
    try {
      existing = JSON.parse(existingRaw);
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }

    // Unir transacciones asegurando que no se dupliquen notas idénticas de prueba
    const merged = [...demoTxs, ...existing.filter(e => !demoTxs.some(d => d.notes === e.notes))];
    localStorage.setItem('presu_transactions', JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('transactions-updated', { detail: merged }));
    return merged;
  } catch (err) {
    console.error('Error al sembrar transacciones de prueba:', err);
    return [];
  }
}

if (typeof window !== 'undefined') {
  window.seedTestTransactions = seedTestTransactions;
  window.clearTestData = function() {
    const empty = JSON.stringify([]);
    // Limpieza de transacciones
    localStorage.setItem('presu_transactions', empty);
    localStorage.setItem('finanzas_transactions_v3', empty);
    localStorage.setItem('app_transactions', empty);
    localStorage.setItem('transactions', empty);
    // Limpieza de préstamos y deudas
    localStorage.setItem('user_debts', empty);
    localStorage.setItem('finanzas_debts_v3', empty);
    localStorage.setItem('app_loans', empty);
    // Limpieza de inversiones
    localStorage.setItem('user_investments', empty);
    localStorage.setItem('presu_investments', empty);
    localStorage.setItem('app_investments', empty);
    // Limpieza de pagos recurrentes y suscripciones
    localStorage.setItem('recurring_payments', empty);
    localStorage.setItem('app_recurring', empty);
    localStorage.setItem('presu_subscriptions_v1', empty);
    localStorage.setItem('subscriptions', empty);
    // Limpieza de cuentas o ajuste a balance 0
    const rawAccs = localStorage.getItem('presu_accounts') || localStorage.getItem('finanzas_accounts_v3') || '[]';
    try {
      const accs = JSON.parse(rawAccs);
      if (Array.isArray(accs)) {
        const zeroAccs = accs.map(a => ({ ...a, balance: 0, currentBalance: 0, initialBalance: 0, initial_balance: 0 }));
        const str = JSON.stringify(zeroAccs);
        localStorage.setItem('presu_accounts', str);
        localStorage.setItem('finanzas_accounts_v3', str);
        localStorage.setItem('user_accounts', str);
        localStorage.setItem('accounts', str);
      }
    } catch {}
    console.log('✅ Datos de prueba limpiados exitosamente. Recargando aplicación...');
    window.location.reload();
  };
}
