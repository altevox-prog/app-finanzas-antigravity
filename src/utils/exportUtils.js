export const downloadBackupJSON = (data) => {
  const backup = {
    version: '1.0',
    appName: 'Monety - Finanzas Personales',
    exportedAt: new Date().toISOString(),
    data,
    summary: {
      transactionsCount: data.transactions?.length || 0,
      investmentsCount: data.investments?.length || 0,
      accountsCount: data.accounts?.length || 0,
      categoriesCount: data.categories?.length || 0,
      debtsCount: data.debtsAndLoans?.length || 0
    }
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `monety_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadTransactionsCSV = (transactions) => {
  const headers = ['Fecha', 'Tipo', 'Categoría', 'Subcategoría', 'Cuenta', 'Monto', 'Nota'];
  
  const rows = transactions.map(tx => {
    return [
      tx.date || '',
      tx.type === 'income' ? 'Ingreso' : 'Gasto',
      `"${(tx.categoryName || '').replace(/"/g, '""')}"`,
      `"${(tx.subcategoryName || '').replace(/"/g, '""')}"`,
      `"${(tx.accountName || '').replace(/"/g, '""')}"`,
      tx.amount || 0,
      `"${(tx.note || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `gastos_movimientos_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadInvestmentsCSV = (investments, trm) => {
  const headers = ['Nombre', 'Ticker', 'Tipo', 'Moneda', 'Cantidad', 'Precio Compra', 'Precio Actual', 'Inversión Total', 'Valor Actual'];
  
  const rows = investments.map(inv => {
    const qty = Number(inv.quantity || 0);
    const avgPrice = Number(inv.averageBuyPrice || 0);
    const currPrice = Number(inv.currentPrice || avgPrice);
    const totalInvested = qty * avgPrice;
    const currentValue = qty * currPrice;
    
    return [
      `"${(inv.name || '').replace(/"/g, '""')}"`,
      `"${(inv.ticker || '').replace(/"/g, '""')}"`,
      inv.type || 'Otro',
      inv.currency || 'COP',
      qty,
      avgPrice,
      currPrice,
      totalInvested,
      currentValue
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `inversiones_portafolio_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const parseAndValidateBackup = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || !parsed.data) {
          reject(new Error('Formato de copia de seguridad no válido (faltan datos principales).'));
          return;
        }
        resolve(parsed);
      } catch (err) {
        reject(new Error('El archivo seleccionado no es un JSON válido o está corrupto.'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsText(file);
  });
};
