import React, { createContext, useContext, useState, useEffect } from 'react';
import { formatCurrency as baseFormatCurrency, formatUSD as baseFormatUSD } from '../data/initialData';

const PrivacyContext = createContext();

export function PrivacyProvider({ children }) {
  const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
    try {
      if (localStorage.getItem('security_hide_balances_on_start') === 'true') {
        return true;
      }
      return localStorage.getItem('presu_privacy_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [enableDecimals, setEnableDecimalsState] = useState(() => {
    try {
      if (localStorage.getItem('app_enable_decimals') !== null) {
        return localStorage.getItem('app_enable_decimals') === 'true';
      }
      const userSettingsRaw = localStorage.getItem('user_settings');
      if (userSettingsRaw) {
        const parsed = JSON.parse(userSettingsRaw);
        const val = parsed?.enable_decimals ?? parsed?.enableDecimals ?? parsed?.showDecimals ?? parsed?.allowDecimals;
        if (val !== undefined && val !== null) return Boolean(val);
      }
      return false;
    } catch {
      return false;
    }
  });

  // Estado de seguridad y PIN local: NUNCA asignar '1234' por defecto
  const [pin, setPinState] = useState(() => {
    try {
      const p = localStorage.getItem('security_pin_code') || '';
      return (p && String(p).trim().length >= 4) ? String(p).trim() : '';
    } catch {
      return '';
    }
  });

  const [isPinEnabled, setIsPinEnabledState] = useState(() => {
    try {
      const p = localStorage.getItem('security_pin_code') || '';
      const enabled = localStorage.getItem('security_pin_enabled') === 'true';
      return enabled && Boolean(p && String(p).trim().length >= 4);
    } catch {
      return false;
    }
  });

  const isSecurityEnabled = Boolean(isPinEnabled && pin && pin.length >= 4);

  useEffect(() => {
    const handleDecimalsChange = (e) => {
      if (e?.detail?.enableDecimals !== undefined) {
        setEnableDecimalsState(Boolean(e.detail.enableDecimals));
      } else {
        try {
          setEnableDecimalsState(localStorage.getItem('app_enable_decimals') === 'true');
        } catch {}
      }
    };
    window.addEventListener('app_decimals_changed', handleDecimalsChange);
    return () => window.removeEventListener('app_decimals_changed', handleDecimalsChange);
  }, []);

  const togglePrivacyMode = () => {
    setIsPrivacyMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('presu_privacy_mode', String(next));
      } catch {}
      return next;
    });
  };

  const setPrivacyMode = (val) => {
    setIsPrivacyMode((prev) => {
      const next = typeof val === 'function' ? val(prev) : Boolean(val);
      try {
        localStorage.setItem('presu_privacy_mode', String(next));
      } catch {}
      return next;
    });
  };

  const toggleEnableDecimals = () => {
    setEnableDecimalsState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('app_enable_decimals', String(next));
        const userSettingsRaw = localStorage.getItem('user_settings');
        const current = userSettingsRaw ? JSON.parse(userSettingsRaw) : {};
        current.enable_decimals = next;
        current.enableDecimals = next;
        current.showDecimals = next;
        current.allowDecimals = next;
        localStorage.setItem('user_settings', JSON.stringify(current));
      } catch {}
      window.dispatchEvent(new CustomEvent('app_decimals_changed', { detail: { enableDecimals: next } }));
      return next;
    });
  };

  const setEnableDecimals = (val) => {
    const next = Boolean(val);
    setEnableDecimalsState(next);
    try {
      localStorage.setItem('app_enable_decimals', String(next));
      const userSettingsRaw = localStorage.getItem('user_settings');
      const current = userSettingsRaw ? JSON.parse(userSettingsRaw) : {};
      current.enable_decimals = next;
      current.enableDecimals = next;
      current.showDecimals = next;
      current.allowDecimals = next;
      localStorage.setItem('user_settings', JSON.stringify(current));
    } catch {}
    window.dispatchEvent(new CustomEvent('app_decimals_changed', { detail: { enableDecimals: next } }));
  };

  const updatePin = (newPin) => {
    const cleanPin = (newPin || '').replace(/\D/g, '').slice(0, 6);
    if (cleanPin.length >= 4) {
      setPinState(cleanPin);
      setIsPinEnabledState(true);
      try {
        localStorage.setItem('security_pin_code', cleanPin);
        localStorage.setItem('security_pin_enabled', 'true');
      } catch {}
    } else {
      setPinState('');
      setIsPinEnabledState(false);
      try {
        localStorage.setItem('security_pin_code', '');
        localStorage.setItem('security_pin_enabled', 'false');
      } catch {}
    }
  };

  const disablePin = () => {
    setPinState('');
    setIsPinEnabledState(false);
    try {
      localStorage.setItem('security_pin_code', '');
      localStorage.setItem('security_pin_enabled', 'false');
      localStorage.setItem('presu_app_locked', 'false');
    } catch {}
  };

  const formatMoney = (amount, currency = 'COP') => {
    if (currency === 'EUR') {
      if (isPrivacyMode) {
        const num = Number(amount) || 0;
        return num < 0 ? '-€ ••••••' : '€ ••••••';
      }
      const num = Number(amount) || 0;
      const isNeg = num < 0;
      const absNum = Math.abs(num);
      if (!enableDecimals) {
        const rounded = Math.round(absNum);
        return `${isNeg ? '-' : ''}€ ${rounded.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      }
      return `${isNeg ? '-' : ''}€ ${absNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (currency === 'USD') {
      return baseFormatUSD(amount, isPrivacyMode, enableDecimals);
    }
    return baseFormatCurrency(amount, isPrivacyMode, enableDecimals);
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
