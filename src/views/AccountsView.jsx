import React from 'react';
import AccountsAndCategories from '../components/accounts/AccountsAndCategories';

/**
 * AccountsView
 * Vista dedicada para cuentas bancarias, billeteras digitales y tarjetas de crédito.
 * Soporta modo 'view' (solo lectura desde Sidebar) y modo 'manage' (gestión desde Configuración).
 */
export default function AccountsView({
  isReadOnly,
  mode,
  fromSettings = false,
  ...rest
}) {
  const computedReadOnly = isReadOnly !== undefined 
    ? Boolean(isReadOnly) 
    : (mode !== undefined ? mode === 'view' : !fromSettings);

  return (
    <AccountsAndCategories 
      {...rest} 
      fromSettings={fromSettings}
      mode={mode}
      isReadOnly={computedReadOnly} 
    />
  );
}
