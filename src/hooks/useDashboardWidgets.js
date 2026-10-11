import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  DEFAULT_WIDGETS_CONFIG, 
  getStoredWidgetsConfig, 
  saveStoredWidgetsConfig 
} from '../utils/widgetsConfig';

export function useDashboardWidgets({ userId = null, isResettingRef = null } = {}) {
  const [widgets, setWidgets] = useState(() => getStoredWidgetsConfig());
  const [isEditWidgetsModalOpen, setIsEditWidgetsModalOpen] = useState(false);

  // Sincronización reactiva bidireccional de widgets
  useEffect(() => {
    let isMounted = true;
    const handleSync = (e) => {
      const next = (e?.detail && Array.isArray(e.detail) && e.detail.length > 0)
        ? e.detail
        : getStoredWidgetsConfig();
      // Desacoplar al siguiente microtask para evitar actualizar App durante el render de Dashboard
      queueMicrotask(() => {
        if (!isMounted) return;
        setWidgets((prev) => {
          try {
            if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
          } catch (_) {}
          return [...next];
        });
      });
    };
    window.addEventListener('monety_widgets_order_v2_updated', handleSync);
    window.addEventListener('monety_widgets_config_updated', handleSync);
    window.addEventListener('presu_widget_order_updated', handleSync);
    return () => {
      isMounted = false;
      window.removeEventListener('monety_widgets_order_v2_updated', handleSync);
      window.removeEventListener('monety_widgets_config_updated', handleSync);
      window.removeEventListener('presu_widget_order_updated', handleSync);
    };
  }, []);

  // Persistencia optimizada en localStorage
  const lastSavedWidgetsRef = useRef('');
  useEffect(() => {
    if (isResettingRef?.current) return;
    try {
      const str = JSON.stringify(widgets);
      if (str === lastSavedWidgetsRef.current) return;
      lastSavedWidgetsRef.current = str;
    } catch (_) {}
    saveStoredWidgetsConfig(widgets, userId);
  }, [widgets, userId, isResettingRef]);

  const saveWidgets = useCallback((newWidgets) => {
    if (Array.isArray(newWidgets)) {
      setWidgets([...newWidgets]);
    }
  }, []);

  const resetWidgets = useCallback((customDefaults = null) => {
    const def = Array.isArray(customDefaults) ? customDefaults : DEFAULT_WIDGETS_CONFIG;
    setWidgets([...def]);
  }, []);

  const openCustomizeModal = useCallback(() => {
    setIsEditWidgetsModalOpen(true);
  }, []);

  const closeCustomizeModal = useCallback(() => {
    setIsEditWidgetsModalOpen(false);
  }, []);

  return {
    widgets,
    setWidgets,
    DEFAULT_WIDGETS: DEFAULT_WIDGETS_CONFIG,
    DEFAULT_WIDGETS_CONFIG,
    isEditWidgetsModalOpen,
    setIsEditWidgetsModalOpen,
    openCustomizeModal,
    closeCustomizeModal,
    saveWidgets,
    resetWidgets
  };
}

export default useDashboardWidgets;
