import { useState, useEffect } from 'react';

/**
 * useViewMode
 * Hook para gestionar el modo de visualización adaptable: 'auto' | 'mobile' | 'desktop'.
 * Soporta query params (?view=mobile, ?view=desktop) y persistencia en localStorage.
 */
export function useViewMode() {
  const [viewMode, setViewMode] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const v = params.get('view');
        if (v === 'mobile' || v === 'desktop' || v === 'auto') return v;
        const saved = localStorage.getItem('presu_app_view_mode');
        if (saved === 'mobile' || saved === 'desktop') return saved;
      }
    } catch {}
    return 'auto';
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (mode === 'auto') {
          url.searchParams.delete('view');
          localStorage.removeItem('presu_app_view_mode');
        } else {
          url.searchParams.set('view', mode);
          localStorage.setItem('presu_app_view_mode', mode);
        }
        window.history.pushState({}, '', url.toString());
      }
    } catch (e) {
      console.error('Error al cambiar de vista:', e);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const v = params.get('view');
        setViewMode(v === 'mobile' || v === 'desktop' || v === 'auto' ? v : 'auto');
      } catch {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isForcedMobile = viewMode === 'mobile';
  const isForcedDesktop = viewMode === 'desktop';
  const desktopOnlyClass = isForcedMobile ? 'hidden' : isForcedDesktop ? 'flex' : 'hidden lg:flex';
  const desktopBlockClass = isForcedMobile ? 'hidden' : isForcedDesktop ? 'block' : 'hidden lg:block';
  const mobileOnlyClass = isForcedDesktop ? 'hidden' : isForcedMobile ? 'block' : 'lg:hidden';

  return {
    viewMode,
    setViewMode,
    handleSetViewMode,
    isForcedMobile,
    isForcedDesktop,
    desktopOnlyClass,
    desktopBlockClass,
    mobileOnlyClass
  };
}
