import React from 'react';
import AccountsAndCategories from './AccountsAndCategories';

export default function AccountsView(props) {
  try {
    return (
      <AccountsAndCategories 
        {...props} 
        initialSubTab="accounts" 
        onBack={props.onBack} 
        fromSettings={props.fromSettings} 
        previousView={props.previousView} 
      />
    );
  } catch (error) {
    console.error('Error renderizando AccountsView:', error);
    return (
      <div className="p-6 text-center text-slate-500">
        <p className="font-semibold text-sm">No se pudo cargar la vista de cuentas.</p>
        <p className="text-xs mt-1">Por favor recarga la página o verifica la configuración de tus cuentas.</p>
      </div>
    );
  }
}
