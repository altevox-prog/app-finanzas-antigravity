import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';

export function useTheme() {
  // Theme state: 'light' | 'dark' | 'system'
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('app_theme') || localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    // Detect system preference by default
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  // Apply theme to document element (.dark class) and body with reactive prefers-color-scheme
  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);

    const applyTheme = () => {
      let resolved = theme;
      if (theme === 'system') {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolved = isDark ? 'dark' : 'light';
      }

      // 1. Toggle .dark class on <html> (document.documentElement) for Tailwind darkMode: 'class'
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }

      // 2. Set data-theme on body for CSS variables
      document.body.setAttribute('data-theme', resolved);

      // 3. Update <meta name="theme-color"> for Android status bar
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', resolved === 'dark' ? '#090A0F' : '#F8FAFC');
      }
    };

    applyTheme();

    if (theme === 'system' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      let currentResolved = prev;
      if (prev === 'system') {
        currentResolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return currentResolved === 'dark' ? 'light' : 'dark';
    });
  };

  return {
    theme,
    setTheme,
    handleToggleTheme,
    toggleTheme: handleToggleTheme
  };
}

export default useTheme;
