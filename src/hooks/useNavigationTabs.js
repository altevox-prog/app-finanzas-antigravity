import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useNavigationTabs
 * Hook centralizado para la navegación entre pestañas (tabs),
 * claves de reseteo por vista (tabResetKeys), scroll al tope (mainContentRef)
 * y navegación de retorno desde sub-vistas (fromSettings / handleGoBackFromSubView).
 */
export function useNavigationTabs({
  initialTab = 'dashboard',
  onTabChange = null,
  onOpenProfile = null
} = {}) {
  const [activeTab, rawSetActiveTab] = useState(initialTab);

  const setActiveTab = useCallback((rawTab) => {
    let tab = rawTab;
    if (tab === 'loans') tab = 'debts';
    if (tab === 'movements' || tab === 'movimientos') tab = 'transactions';
    if (tab === 'inicio') tab = 'dashboard';
    rawSetActiveTab(tab);
  }, []);

  const [fromSettings, setFromSettings] = useState(false);
  const mainContentRef = useRef(null);

  // Claves de reseteo para forzar estado inicial limpio al seleccionar cualquier pestaña
  const [tabResetKeys, setTabResetKeys] = useState({
    dashboard: 0,
    inicio: 0,
    transactions: 0,
    movements: 0,
    investments: 0,
    debts: 0,
    accounts: 0,
    recurring: 0
  });

  // Función para forzar reseteo de una pestaña específica o la actual
  const handleResetTab = useCallback((tabName) => {
    const raw = tabName || activeTab;
    const target = (raw === 'movements' || raw === 'movimientos') ? 'transactions' : (raw === 'inicio') ? 'dashboard' : raw;
    setTabResetKeys((prev) => ({
      ...prev,
      [target]: (prev[target] || 0) + 1
    }));
  }, [activeTab]);

  // Scroll automático hacia arriba en contenedor principal y ventana
  const scrollToTop = useCallback(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      mainContentRef.current.scrollTop = 0;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    if (typeof document !== 'undefined') {
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    }
  }, []);

  // Manejador centralizado de cambio de pestaña
  const handleTabChange = useCallback((rawTab, fromSource = null) => {
    let tab = rawTab === 'loans' ? 'debts' : rawTab;
    if (tab === 'movements' || tab === 'movimientos') {
      tab = 'transactions';
    }
    if (tab === 'inicio') {
      tab = 'dashboard';
    }

    // Si se pulsa la pestaña actualmente activa, scroll suave/inmediato al tope
    if (tab === activeTab) {
      scrollToTop();
      return;
    }

    if (fromSource === 'settings') {
      setFromSettings(true);
    } else if (fromSource !== 'keep') {
      setFromSettings(false);
    }

    // Disparar callback de limpieza (modales, popups, filtros)
    if (onTabChange) {
      try {
        onTabChange(tab, fromSource);
      } catch (err) {
        console.warn('Error en callback onTabChange:', err);
      }
    }

    // Forzar reseteo de sub-vistas internas
    setTabResetKeys((prev) => ({
      ...prev,
      [tab]: (prev[tab] || 0) + 1
    }));

    // Si es perfil o ajustes, abrir panel correspondiente
    if (tab === 'profile' || tab === 'settings' || tab === 'configuracion' || tab === 'ajustes') {
      if (onOpenProfile) onOpenProfile();
      return;
    }

    setActiveTab(tab);
  }, [activeTab, onTabChange, onOpenProfile, scrollToTop, setActiveTab]);

  // Retorno desde sub-vistas hacia ajustes o dashboard
  const handleGoBackFromSubView = useCallback(() => {
    if (fromSettings) {
      setFromSettings(false);
      if (onOpenProfile) onOpenProfile();
    } else {
      handleTabChange('dashboard');
    }
  }, [fromSettings, onOpenProfile, handleTabChange]);

  // Redirección de seguridad si activeTab toma valor de configuración
  useEffect(() => {
    if (activeTab === 'settings' || activeTab === 'profile' || activeTab === 'configuracion' || activeTab === 'ajustes') {
      if (onOpenProfile) onOpenProfile();
      setActiveTab('dashboard');
    }
  }, [activeTab, onOpenProfile]);

  return {
    activeTab,
    setActiveTab,
    tabResetKeys,
    setTabResetKeys,
    handleTabChange,
    handleResetTab,
    mainContentRef,
    fromSettings,
    setFromSettings,
    handleGoBackFromSubView,
    scrollToTop
  };
}

export default useNavigationTabs;
