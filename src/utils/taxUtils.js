/**
 * Utilidades para el Módulo de Impuestos y Declaración de Renta DIAN (Colombia)
 * Soporte para Personas Naturales: Calendario oficial, semáforo de topes UVT y checklist.
 */

import { toSafeNumber, safeNumber, calculateUVTThreshold, calculateTaxProgressPercentage } from './financeMath';

export const UVT_VALUES = { 2024: 47065, 2025: 49799, 2026: 52500 };

export const TAX_THRESHOLDS_UVT = {
  GROSS_INCOME: 1400,     // Ingresos brutos acumulados
  TOTAL_EXPENSES: 1400,   // Compras y consumos totales
  CARD_EXPENSES: 1400,    // Consumos mediante tarjeta de crédito
  BANK_DEPOSITS: 1400,    // Consignaciones bancarias, depósitos o inversiones
  GROSS_WEALTH: 4500      // Patrimonio bruto al 31 de diciembre
};

const SPANISH_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SPANISH_MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function isColombianHoliday(date) {
  const m = date.getMonth();
  const d = date.getDate();
  const dow = date.getDay();
  return (m === 7 && d === 7) || (m === 7 && d >= 15 && d <= 21 && dow === 1) || (m === 9 && d >= 12 && d <= 18 && dow === 1);
}

/**
 * Genera el calendario de 50 días hábiles de la DIAN para personas naturales
 */
export function generateDianCalendar(year = new Date().getFullYear()) {
  const calendar = {};
  let currentDate = new Date(year, 7, 11);
  if (currentDate.getDay() === 0) currentDate.setDate(currentDate.getDate() + 1);
  if (currentDate.getDay() === 6) currentDate.setDate(currentDate.getDate() + 2);

  let pairIndex = 1;

  while (pairIndex <= 50) {
    const dow = currentDate.getDay();
    if (dow !== 0 && dow !== 6 && !isColombianHoliday(currentDate)) {
      const d1 = (pairIndex * 2 - 1) % 100;
      const d2 = (pairIndex * 2) % 100;
      const d1Str = String(d1).padStart(2, '0');
      const d2Str = String(d2).padStart(2, '0');

      const dateObj = new Date(currentDate);
      const dayName = SPANISH_DAYS[dateObj.getDay()];
      const dayNumber = dateObj.getDate();
      const monthName = SPANISH_MONTHS[dateObj.getMonth()];

      const entry = {
        pairIndex,
        pairKey: `${d1Str}-${d2Str}`,
        digits: [d1, d2],
        digitsFormatted: `${d1Str} y ${d2Str}`,
        date: dateObj,
        dateString: dateObj.toISOString().split('T')[0],
        formattedDate: `${dayName}, ${dayNumber} de ${monthName}`,
        fullDateFormatted: `${dayName}, ${dayNumber} de ${monthName} de ${year}`,
        monthNumber: dateObj.getMonth() + 1,
        dayNumber
      };

      calendar[d1] = entry;
      calendar[d2] = entry;
      pairIndex++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return calendar;
}

/**
 * Obtiene la fecha límite oficial para los últimos dos dígitos de la cédula
 */
export function getDueDateForDigits(twoDigits, year = new Date().getFullYear()) {
  const cleanDigits = String(twoDigits).replace(/\D/g, '').slice(-2);
  if (!cleanDigits) return null;
  const num = parseInt(cleanDigits, 10);
  if (isNaN(num)) return null;

  const entry = generateDianCalendar(year)[num];
  if (!entry) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(entry.date);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const status = diffDays === 0 ? 'today' : diffDays < 0 ? 'passed' : 'upcoming';
  const statusText = diffDays === 0 ? '¡Vence hoy!' : diffDays === 1 ? 'Vence mañana' : diffDays < 0 ? `Venció hace ${Math.abs(diffDays)} días` : `Faltan ${diffDays} días`;

  return { ...entry, inputDigits: cleanDigits.padStart(2, '0'), daysRemaining: diffDays, status, statusText };
}

/**
 * Calcula el estado de los topes DIAN UVT usando transacciones y cuentas
 */
export function calculateTaxMetrics({
  transactions = [],
  accounts = [],
  investments = [],
  fiscalYear = new Date().getFullYear() - 1,
  uvtValue = UVT_VALUES[2024] || 47065
}) {
  const fiscalTxs = transactions.filter(t => t.date && parseInt(t.date.split('-')[0], 10) === fiscalYear);

  const isTransfer = (t) => Boolean(
    t && (t.isTransfer || t.is_transfer || ['transfer', 'transferencia'].includes(t.type) || ['cat-transfer'].includes(t.categoryId || t.category_id) || ['sub-transfer-in', 'sub-transfer-out'].includes(t.subcategoryId))
  );

  const grossIncome = fiscalTxs.filter(t => ['income', 'ingreso'].includes(t.type) && !isTransfer(t)).reduce((s, t) => s + safeNumber(t.amount), 0);
  const totalExpenses = fiscalTxs.filter(t => ['expense', 'gasto'].includes(t.type) && !isTransfer(t)).reduce((s, t) => s + safeNumber(t.amount), 0);

  const creditCardAccountIds = new Set(accounts.filter(a => a.type === 'card' || a.type === 'credit').map(a => a.id));
  const cardExpenses = fiscalTxs.filter(t => ['expense', 'gasto'].includes(t.type) && !isTransfer(t) && (creditCardAccountIds.has(t.accountId) || ['card', 'credit'].includes(t.accountType))).reduce((s, t) => s + safeNumber(t.amount), 0);

  const bankDeposits = grossIncome;

  const totalLiquidAccounts = accounts.filter(a => a.type !== 'card').reduce((sum, a) => {
    const bal = toSafeNumber(a.initialBalance ?? a.balance ?? a.saldo);
    return sum + (bal > 0 ? bal : 0);
  }, 0);

  const totalInvestments = investments.reduce((sum, inv) => {
    const shares = toSafeNumber(inv.shares || inv.quantity);
    const price = toSafeNumber(inv.currentPrice || inv.purchasePrice);
    const total = shares > 0 && price > 0 ? shares * price : toSafeNumber(inv.totalValue || inv.amount);
    return sum + (total > 0 ? total : 0);
  }, 0);

  const estimatedGrossWealth = totalLiquidAccounts + totalInvestments;

  const evaluateItem = (amount, thresholdUVT, title, description, iconName) => {
    const limitAmount = calculateUVTThreshold(thresholdUVT, uvtValue);
    const percentage = calculateTaxProgressPercentage(amount, limitAmount);
    const level = percentage >= 100 ? 'danger' : percentage >= 75 ? 'warning' : 'safe';
    const levelText = percentage >= 100 ? 'Superaste el tope' : percentage >= 75 ? 'Cerca del límite' : 'Por debajo del tope';

    return {
      title, description, iconName, amount: toSafeNumber(amount),
      thresholdUVT, limitAmount, percentage, level, levelText, isExceeded: percentage >= 100
    };
  };

  const METRIC_CONFIGS = [
    { amt: grossIncome, uvt: TAX_THRESHOLDS_UVT.GROSS_INCOME, title: 'Ingresos brutos acumulados', desc: 'Salarios, honorarios, ventas o ingresos totales recibidos en el año.', icon: 'TrendingUp' },
    { amt: totalExpenses, uvt: TAX_THRESHOLDS_UVT.TOTAL_EXPENSES, title: 'Compras y consumos totales', desc: 'Pagos en efectivo, transferencias y tarjetas de débito/crédito.', icon: 'ShoppingBag' },
    { amt: cardExpenses, uvt: TAX_THRESHOLDS_UVT.CARD_EXPENSES, title: 'Consumos con tarjetas de crédito', desc: 'Total de compras y avances realizados con plásticos de crédito.', icon: 'CreditCard' },
    { amt: bankDeposits, uvt: TAX_THRESHOLDS_UVT.BANK_DEPOSITS, title: 'Consignaciones y transferencias bancarias', desc: 'Total acumulado de transferencias y depósitos bancarios recibidos.', icon: 'Landmark' },
    { amt: estimatedGrossWealth, uvt: TAX_THRESHOLDS_UVT.GROSS_WEALTH, title: 'Patrimonio bruto total', desc: 'Valor total de tus cuentas bancarias, inmuebles, vehículos e inversiones.', icon: 'Building2' }
  ];

  const items = METRIC_CONFIGS.map(c => evaluateItem(c.amt, c.uvt, c.title, c.desc, c.icon));

  return {
    fiscalYear,
    uvtValue,
    items,
    mustDeclare: items.some(item => item.isExceeded),
    exceededCount: items.filter(item => item.isExceeded).length,
    warningCount: items.filter(item => item.level === 'warning').length,
    hasTransactions: fiscalTxs.length > 0
  };
}

export const DEFAULT_CHECKLIST_ITEMS = [
  { id: 'step_consultar', title: 'Consultar si te corresponde declarar', description: 'Verifica tus topes UVT en la app o consulta en el portal oficial de la DIAN.', completed: false },
  { id: 'step_certificados', title: 'Descargar certificados bancarios y extractos', description: 'Bancolombia, Davivienda, Nequi, etc. Descarga el certificado tributario del año gravable.', completed: false },
  { id: 'step_rut', title: 'Obtener o actualizar el RUT', description: 'Asegúrate de que tu Registro Único Tributario tenga tu dirección y actividad económica al día.', completed: false },
  { id: 'step_deducciones', title: 'Recopilar soportes de deducciones', description: 'Medicina prepagada, dependientes económicos, intereses de crédito de vivienda y aportes voluntarios.', completed: false },
  { id: 'step_presentar', title: 'Presentar y pagar antes de la fecha límite', description: 'Diligencia el Formulario 210 en los servicios en línea de la DIAN y firma electrónicamente.', completed: false }
];
