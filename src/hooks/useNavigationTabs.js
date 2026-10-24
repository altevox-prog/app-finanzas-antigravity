import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useNavigationTabs - Hook centralizado para la navegación entre pestañas (tabs).
 */
const normalizeTab = (raw) => {
  if (raw === 'loans') return 'debts';
  if (raw === 'movements' || raw === 'movimientos') return 'transactions';
  if (raw === 'inicio') return 'dashboard';
  return raw;
};

const isSettingsTab = (t) => ['profile', 'settings', 'configuracion', 'ajustes'].includes(t);

export function useNavigationTabs({
  initialTab = 'dashboard',
  onTabChange = null,
  onOpenProfile = null
} = {}) {
  const [activeTab, rawSetActiveTab] = useState(initialTab);
  const setActiveTab = useCallback((rawTab) => rawSetActiveTab(normalizeTab(rawTab)), []);

  const [fromSettings, setFromSettings] = useState(false);
  const [debtsInitialTab, setDebtsInitialTab] = useState('receivable');
  const [historyStack, setHistoryStack] = useState([initialTab]);
  const mainContentRef = useRef(null);

  const onTabChangeRef = useRef(onTabChange);
  const onOpenProfileRef = useRef(onOpenProfile);
  useEffect(() => { onTabChangeRef.current = onTabChange; }, [onTabChange]);
  useEffect(() => { onOpenProfileRef.current = onOpenProfile; }, [onOpenProfile]);

  const [tabResetKeys, setTabResetKeys] = useState({
    dashboard: 0, transactions: 0, accounts: 0, debts: 0, investments: 0, recurring: 0, tax: 0, net_worth: 0
  });

  const handleResetTab = useCallback((tabName) => {
    const target = normalizeTab(tabName || activeTab);
    setTabResetKeys((prev) => ({ ...prev, [target]: (prev[target] || 0) + 1 }));
  }, [activeTab]);

  const scrollToTop = useCallback(() => {
    if (mainContentRef.current) { mainContentRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' }); mainContentRef.current.scrollTop = 0; }
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (typeof document !== 'undefined') {
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, []);

  const handleTabChange = useCallback((rawTab, fromSource = null) => {
    const tab = normalizeTab(rawTab);
    if (rawTab === 'loans') setDebtsInitialTab('receivable');
    else if (rawTab === 'debts') setDebtsInitialTab(fromSource === 'net_worth' ? 'payable' : 'receivable');

    if (tab === activeTab) { scrollToTop(); return; }

    if (fromSource === 'settings') {
      setFromSettings(true);
      setHistoryStack(['dashboard', tab]);
    } else if (fromSource === 'net_worth') {
      setFromSettings(false);
      setHistoryStack((prev) => {
        const base = prev.includes('net_worth') ? prev.slice(0, prev.indexOf('net_worth') + 1) : [...prev, 'net_worth'];
        return [...base, tab];
      });
    } else if (fromSource !== 'keep') {
      setFromSettings(false);
      setHistoryStack([tab]);
    }

    try { onTabChangeRef.current?.(tab, fromSource); } catch (err) { console.warn('Error onTabChange:', err); }
    setTabResetKeys((prev) => ({ ...prev, [tab]: (prev[tab] || 0) + 1 }));

    if (isSettingsTab(tab)) { onOpenProfileRef.current?.(); return; }
    setActiveTab(tab);
  }, [activeTab, scrollToTop, setActiveTab]);

  const handleGoBackFromSubView = useCallback(() => {
    if (fromSettings && (['tax', 'taxes', 'impuestos', 'net_worth'].includes(activeTab) || historyStack.length <= 2)) {
      setFromSettings(false);
      setHistoryStack(['dashboard']);
      onOpenProfileRef.current?.();
      return;
    }

    if (historyStack.length > 1) {
      const newStack = [...historyStack];
      newStack.pop();
      const prevTab = newStack[newStack.length - 1];
      setHistoryStack(newStack);
      if (prevTab) {
        if (prevTab === 'net_worth') { rawSetActiveTab('net_worth'); return; }
        handleTabChange(prevTab, 'keep');
        return;
      }
    }

    if (fromSettings) {
      setFromSettings(false);
      onOpenProfileRef.current?.();
    } else {
      handleTabChange('dashboard');
    }
  }, [activeTab, historyStack, fromSettings, handleTabChange]);

  useEffect(() => {
    if (isSettingsTab(activeTab)) {
      onOpenProfileRef.current?.();
      setActiveTab('dashboard');
    }
  }, [activeTab, setActiveTab]);

  return {
    activeTab, setActiveTab, tabResetKeys, setTabResetKeys, handleTabChange,
    handleResetTab, mainContentRef, fromSettings, setFromSettings,
    handleGoBackFromSubView, debtsInitialTab, scrollToTop
  };
}
