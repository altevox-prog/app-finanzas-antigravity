import React, { createContext, useContext, useState, useEffect } from 'react';
import { formatCurrency as baseFormatCurrency, formatUSD as baseFormatUSD } from '../data/initialData';

const PrivacyContext = createContext();

const getStorageItem = (key, fallback = null) => {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
};

const setStorageItem = (key, val) => {
  try { localStorage.setItem(key, String(val)); } catch {}
};

export function PrivacyProvider({ children }) {
  const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
    return getStorageItem('security_hide_balances_on_start') === 'true' || getStorageItem('presu_privacy_mode') === 'true';
  });

  const [enableDecimals, setEnableDecimalsState] = useState(() => {
    const direct = getStorageItem('app_enable_decimals');
    if (direct !== null) return direct === 'true';
    try {
      const parsed = JSON.parse(getStorageItem('user_settings', '{}'));
      const val = parsed?.enable_decimals ?? parsed?.enableDecimals ?? parsed?.showDecimals ?? parsed?.allowDecimals;
      return val != null ? Boolean(val) : false;
    } catch {
      return false;
    }
  });

  const [pin, setPinState] = useState(() => {
    const p = String(getStorageItem('security_pin_code', '')).trim();
    return p.length >= 4 ? p : '';
  });

  const [isPinEnabled, setIsPinEnabledState] = useState(() => {
    const p = String(getStorageItem('security_pin_code', '')).trim();
    return getStorageItem('security_pin_enabled') === 'true' && p.length >= 4;
  });

  const isSecurityEnabled = Boolean(isPinEnabled && pin && pin.length >= 4);

  useEffect(() => {
    const handleDecimalsChange = (e) => {
      if (e?.detail?.enableDecimals !== undefined) setEnableDecimalsState(Boolean(e.detail.enableDecimals));
      else setEnableDecimalsState(getStorageItem('app_enable_decimals') === 'true');
    };
    window.addEventListener('app_decimals_changed', handleDecimalsChange);
    return () => window.removeEventListener('app_decimals_changed', handleDecimalsChange);
  }, []);

  const togglePrivacyMode = () => {
    setIsPrivacyMode((prev) => {
      const next = !prev;
      setStorageItem('presu_privacy_mode', next);
      return next;
    });
  };

  const setPrivacyMode = (val) => {
    setIsPrivacyMode((prev) => {
      const next = typeof val === 'function' ? val(prev) : Boolean(val);
      setStorageItem('presu_privacy_mode', next);
      return next;
    });
  };

  const persistDecimals = (next) => {
    setStorageItem('app_enable_decimals', next);
    try {
      const current = JSON.parse(getStorageItem('user_settings', '{}')) || {};
      current.enable_decimals = current.enableDecimals = current.showDecimals = current.allowDecimals = next;
      setStorageItem('user_settings', JSON.stringify(current));
    } catch {}
    window.dispatchEvent(new CustomEvent('app_decimals_changed', { detail: { enableDecimals: next } }));
  };

  const toggleEnableDecimals = () => {
    setEnableDecimalsState((prev) => {
      const next = !prev;
      persistDecimals(next);
      return next;
    });
  };

  const setEnableDecimals = (val) => {
    const next = Boolean(val);
    setEnableDecimalsState(next);
    persistDecimals(next);
  };

  const updatePin = (newPin) => {
    const cleanPin = (newPin || '').replace(/\D/g, '').slice(0, 6);
    const valid = cleanPin.length >= 4;
    setPinState(valid ? cleanPin : '');
    setIsPinEnabledState(valid);
    setStorageItem('security_pin_code', valid ? cleanPin : '');
    setStorageItem('security_pin_enabled', valid ? 'true' : 'false');
  };

  const disablePin = () => {
    setPinState('');
    setIsPinEnabledState(false);
    setStorageItem('security_pin_code', '');
    setStorageItem('security_pin_enabled', 'false');
    setStorageItem('presu_app_locked', 'false');
  };

  const formatMoney = (amount, currency = 'COP') => {
    if (currency === 'EUR') {
      const num = Number(amount) || 0;
      if (isPrivacyMode) return num < 0 ? '-€ ••••••' : '€ ••••••';
      const isNeg = num < 0;
      const abs = Math.abs(num);
      const digits = enableDecimals ? 2 : 0;
      return `${isNeg ? '-' : ''}€ ${abs.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
    }
    return currency === 'USD' ? baseFormatUSD(amount, isPrivacyMode, enableDecimals) : baseFormatCurrency(amount, isPrivacyMode, enableDecimals);
  };

  return (
    <PrivacyContext.Provider value={{ 
      isPrivacyMode, 
      isPrivate: isPrivacyMode,
      setIsPrivacyMode: setPrivacyMode,
      setIsPrivate: setPrivacyMode,
      setPrivacyMode,
      togglePrivacyMode, 
      enableDecimals, 
      toggleEnableDecimals, 
      setEnableDecimals, 
      formatMoney, 
      formatUSD: (amount) => baseFormatUSD(amount, isPrivacyMode, enableDecimals),
      pin,
      isPinEnabled,
      isSecurityEnabled,
      updatePin,
      disablePin
    }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) {
    return {
      isPrivacyMode: false,
      isPrivate: false,
      setIsPrivacyMode: () => {},
      setIsPrivate: () => {},
      setPrivacyMode: () => {},
      togglePrivacyMode: () => {},
      enableDecimals: false,
      toggleEnableDecimals: () => {},
      setEnableDecimals: () => {},
      formatMoney: (amount, currency = 'COP') => currency === 'USD' ? baseFormatUSD(amount, false) : baseFormatCurrency(amount, false),
      formatUSD: (amount) => baseFormatUSD(amount, false),
      pin: '',
      isPinEnabled: false,
      isSecurityEnabled: false,
      updatePin: () => {},
      disablePin: () => {}
    };
  }
  return ctx;
}
