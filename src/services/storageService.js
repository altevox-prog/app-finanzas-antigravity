import { STORAGE_KEYS } from '../constants/storageKeys';

export const saveAccountsToStorage = (accs) => {
  try {
    const str = JSON.stringify(accs);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, str);
    localStorage.setItem('user_accounts', str);
    localStorage.setItem('presu_accounts', str);
    localStorage.setItem('app_accounts', str);
    localStorage.setItem('accounts', str);
  } catch (e) {
    console.error('Error guardando cuentas en localStorage:', e);
  }
};

export const saveTransactionsToStorage = (txs) => {
  try {
    const str = JSON.stringify(txs);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, str);
    localStorage.setItem('presu_transactions', str);
    localStorage.setItem('app_transactions', str);
    localStorage.setItem('finanzas_transactions_v3', str);
    localStorage.setItem('transactions', str);
  } catch (e) {
    console.error('Error guardando transacciones en localStorage:', e);
  }
};

export const saveInvestmentsToStorage = (invs) => {
  try {
    const str = JSON.stringify(invs);
    localStorage.setItem(STORAGE_KEYS.INVESTMENTS, str);
    localStorage.setItem('presu_investments', str);
    localStorage.setItem('user_investments', str);
    localStorage.setItem('app_investments', str);
  } catch (e) {
    console.error('Error guardando inversiones en localStorage:', e);
  }
};

export const saveDebtsToStorage = (debts) => {
  try {
    const str = JSON.stringify(debts);
    localStorage.setItem(STORAGE_KEYS.DEBTS_AND_LOANS, str);
    localStorage.setItem(STORAGE_KEYS.DEBTS, str);
    localStorage.setItem('user_debts', str);
    localStorage.setItem('app_loans', str);
    localStorage.setItem('finanzas_debts_v3', str);
  } catch (e) {
    console.error('Error guardando deudas en localStorage:', e);
  }
};
