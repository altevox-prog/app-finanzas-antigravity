/**
 * Utilidades para el Módulo de Impuestos y Declaración de Renta DIAN (Colombia)
 * Soporte para Personas Naturales: Calendario oficial, semáforo de topes UVT y checklist.
 */

import { 
  toSafeNumber, 
  safeNumber,
  calculateUVTThreshold, 
  calculateTaxProgressPercentage 
} from './financeMath';

// Valores oficiales y proyectados de la UVT (Unidad de Valor Tributario) en Colombia
export const UVT_VALUES = {
  2024: 47065,
  2025: 49799,
  2026: 52500
};

// Topes legales en UVT según el Estatuto Tributario colombiano (Art. 592 y ss.)
export const TAX_THRESHOLDS_UVT = {
  GROSS_INCOME: 1400,     // Ingresos brutos acumulados
  TOTAL_EXPENSES: 1400,   // Compras y consumos totales
  CARD_EXPENSES: 1400,    // Consumos mediante tarjeta de crédito
  BANK_DEPOSITS: 1400,    // Consignaciones bancarias, depósitos o inversiones
  GROSS_WEALTH: 4500      // Patrimonio bruto al 31 de diciembre
};

const SPANISH_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SPANISH_MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Festivos nacionales colombianos fijos y por Ley Emiliani (Agosto - Octubre)
 */
function isColombianHoliday(date) {
  const month = date.getMonth(); // 0-indexed: 7=Agosto, 8=Septiembre, 9=Octubre
  const day = date.getDate();
  const dayOfWeek = date.getDay(); // 1 = Lunes

  // 7 de agosto: Batalla de Boyacá
  if (month === 7 && day === 7) return true;

  // Asunción de la Virgen (Lunes siguiente al 15 de agosto)
  if (month === 7 && day >= 15 && day <= 21 && dayOfWeek === 1) return true;

  // Día de la Raza (Lunes siguiente al 12 de octubre)
  if (month === 9 && day >= 12 && day <= 18 && dayOfWeek === 1) return true;

  return false;
}

/**
 * Genera el calendario de 50 días hábiles de la DIAN para personas naturales
 * desde mediados de agosto hasta finales de octubre.
 */
export function generateDianCalendar(year = new Date().getFullYear()) {
  const calendar = {};
  
  // La DIAN suele iniciar el segundo martes o lunes de agosto
  let currentDate = new Date(year, 7, 11); // 11 de agosto
  if (currentDate.getDay() === 0) currentDate.setDate(currentDate.getDate() + 1); // Si es domingo -> lunes
  if (currentDate.getDay() === 6) currentDate.setDate(currentDate.getDate() + 2); // Si es sábado -> lunes

  let pairIndex = 1; // 1 = 01-02, 2 = 03-04, ..., 50 = 99-00

  while (pairIndex <= 50) {
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = isColombianHoliday(currentDate);

    if (!isWeekend && !isHoliday) {
      const firstDigit = (pairIndex * 2 - 1) % 100;
      const secondDigit = (pairIndex * 2) % 100;

      const d1Str = String(firstDigit).padStart(2, '0');
      const d2Str = String(secondDigit).padStart(2, '0');
      const pairKey = `${d1Str}-${d2Str}`;

      const dateObj = new Date(currentDate);
      const dayName = SPANISH_DAYS[dateObj.getDay()];
      const dayNumber = dateObj.getDate();
      const monthName = SPANISH_MONTHS[dateObj.getMonth()];

      const entry = {
        pairIndex,
        pairKey,
        digits: [firstDigit, secondDigit],
        digitsFormatted: `${d1Str} y ${d2Str}`,
        date: dateObj,
        dateString: dateObj.toISOString().split('T')[0],
        formattedDate: `${dayName}, ${dayNumber} de ${monthName}`,
        fullDateFormatted: `${dayName}, ${dayNumber} de ${monthName} de ${year}`,
        monthNumber: dateObj.getMonth() + 1,
        dayNumber
      };

      calendar[firstDigit] = entry;
      calendar[secondDigit] = entry;

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

  const calendar = generateDianCalendar(year);
  const entry = calendar[num];
  if (!entry) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(entry.date);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let status = 'upcoming'; // 'upcoming' | 'today' | 'passed'
  let statusText = `Faltan ${diffDays} días`;

  if (diffDays === 0) {
    status = 'today';
    statusText = '¡Vence hoy!';
  } else if (diffDays === 1) {
    status = 'upcoming';
    statusText = 'Vence mañana';
  } else if (diffDays < 0) {
    status = 'passed';
    statusText = `Venció hace ${Math.abs(diffDays)} días`;
  }

  return {
    ...entry,
    inputDigits: cleanDigits.padStart(2, '0'),
    daysRemaining: diffDays,
    status,
    statusText
  };
}

/**
 * Calcula el estado de los topes DIAN UVT usando las transacciones y cuentas del usuario
 */
export function calculateTaxMetrics({
  transactions = [],
  accounts = [],
  investments = [],
  fiscalYear = new Date().getFullYear() - 1, // Por defecto año gravable inmediatamente anterior
  uvtValue = UVT_VALUES[2024] || 47065
}) {
  // Transacciones del año fiscal correspondiente
  const fiscalTxs = transactions.filter(t => {
    if (!t.date) return false;
    const y = parseInt(t.date.split('-')[0], 10);
    return y === fiscalYear;
  });

  const isTransferTx = (t) => Boolean(
    t && (
      t.isTransfer ||
      t.is_transfer ||
      t.type === 'transfer' ||
      t.type === 'transferencia' ||
      t.categoryId === 'cat-transfer' ||
      t.category_id === 'cat-transfer' ||
      t.subcategoryId === 'sub-transfer-in' ||
      t.subcategoryId === 'sub-transfer-out'
    )
  );

  // 1. Ingresos brutos acumulados (excluye transferencias internas)
  const grossIncome = fiscalTxs
    .filter(t => (t.type === 'income' || t.type === 'ingreso') && !isTransferTx(t))
    .reduce((sum, t) => sum + safeNumber(t.amount), 0);

  // 2. Compras y consumos totales (excluye transferencias internas)
  const totalExpenses = fiscalTxs
    .filter(t => (t.type === 'expense' || t.type === 'gasto') && !isTransferTx(t))
    .reduce((sum, t) => sum + safeNumber(t.amount), 0);

  // 3. Consumos con tarjeta de crédito
  const creditCardAccountIds = new Set(
    accounts.filter(a => a.type === 'card' || a.type === 'credit').map(a => a.id)
  );

  const cardExpenses = fiscalTxs
    .filter(t => (t.type === 'expense' || t.type === 'gasto') && !isTransferTx(t) && (creditCardAccountIds.has(t.accountId) || t.accountType === 'card' || t.accountType === 'credit'))
    .reduce((sum, t) => sum + safeNumber(t.amount), 0);

  // 4. Consignaciones bancarias y depósitos acumulados
  // (Suma de ingresos a cuentas bancarias más abonos)
  const bankDeposits = grossIncome;

  // 5. Patrimonio bruto estimado (Cuentas líquidas positivas + saldo total de inversiones)
  const totalLiquidAccounts = accounts
    .filter(a => a.type !== 'card')
    .reduce((sum, a) => {
      const bal = toSafeNumber(a.initialBalance ?? a.balance ?? a.saldo ?? 0);
      return sum + (bal > 0 ? bal : 0);
    }, 0);

  const totalInvestments = investments.reduce((sum, inv) => {
    const shares = toSafeNumber(inv.shares || inv.quantity);
    const price = toSafeNumber(inv.currentPrice || inv.purchasePrice);
    const total = shares > 0 && price > 0 ? shares * price : toSafeNumber(inv.totalValue || inv.amount);
    return sum + (total > 0 ? total : 0);
  }, 0);

  const estimatedGrossWealth = totalLiquidAccounts + totalInvestments;

  // Evaluaciones de topes usando fórmulas normalizadas
  const evaluateItem = (amount, thresholdUVT, title, description, iconName) => {
    const limitAmount = calculateUVTThreshold(thresholdUVT, uvtValue);
    const percentage = calculateTaxProgressPercentage(amount, limitAmount);
    
    let level = 'safe'; // 'safe' | 'warning' | 'danger'
    let levelText = 'Por debajo del tope';

    if (percentage >= 100) {
      level = 'danger';
      levelText = 'Superaste el tope';
    } else if (percentage >= 75) {
      level = 'warning';
      levelText = 'Cerca del límite';
    }

    return {
      title,
      description,
      iconName,
      amount: toSafeNumber(amount),
      thresholdUVT,
      limitAmount,
      percentage,
      level,
      levelText,
      isExceeded: percentage >= 100
    };
  };

  const items = [
    evaluateItem(
      grossIncome,
      TAX_THRESHOLDS_UVT.GROSS_INCOME,
      'Ingresos brutos acumulados',
      'Salarios, honorarios, ventas o ingresos totales recibidos en el año.',
      'TrendingUp'
    ),
    evaluateItem(
      totalExpenses,
      TAX_THRESHOLDS_UVT.TOTAL_EXPENSES,
      'Compras y consumos totales',
      'Pagos en efectivo, transferencias y tarjetas de débito/crédito.',
      'ShoppingBag'
    ),
    evaluateItem(
      cardExpenses,
      TAX_THRESHOLDS_UVT.CARD_EXPENSES,
      'Consumos con tarjetas de crédito',
      'Total de compras y avances realizados con plásticos de crédito.',
      'CreditCard'
    ),
    evaluateItem(
      bankDeposits,
      TAX_THRESHOLDS_UVT.BANK_DEPOSITS,
      'Consignaciones y transferencias bancarias',
      'Total acumulado de transferencias y depósitos bancarios recibidos.',
      'Landmark'
    ),
    evaluateItem(
      estimatedGrossWealth,
      TAX_THRESHOLDS_UVT.GROSS_WEALTH,
      'Patrimonio bruto total',
      'Valor total de tus cuentas bancarias, inmuebles, vehículos e inversiones.',
      'Building2'
    )
  ];

  const mustDeclare = items.some(item => item.isExceeded);
  const exceededCount = items.filter(item => item.isExceeded).length;
  const warningCount = items.filter(item => item.level === 'warning').length;

  return {
    fiscalYear,
    uvtValue,
    items,
    mustDeclare,
    exceededCount,
    warningCount,
    hasTransactions: fiscalTxs.length > 0
  };
}

export const DEFAULT_CHECKLIST_ITEMS = [
  {
    id: 'step_consultar',
    title: 'Consultar si te corresponde declarar',
    description: 'Verifica tus topes UVT en la app o consulta en el portal oficial de la DIAN.',
    completed: false
  },
  {
    id: 'step_certificados',
    title: 'Descargar certificados bancarios y extractos',
    description: 'Bancolombia, Davivienda, Nequi, etc. Descarga el certificado tributario del año gravable.',
    completed: false
  },
  {
    id: 'step_rut',
    title: 'Obtener o actualizar el RUT',
    description: 'Asegúrate de que tu Registro Único Tributario tenga tu dirección y actividad económica al día.',
    completed: false
  },
  {
    id: 'step_deducciones',
    title: 'Recopilar soportes de deducciones',
    description: 'Medicina prepagada, dependientes económicos, intereses de crédito de vivienda y aportes voluntarios.',
    completed: false
  },
  {
    id: 'step_presentar',
    title: 'Presentar y pagar antes de la fecha límite',
    description: 'Diligencia el Formulario 210 en los servicios en línea de la DIAN y firma electrónicamente.',
    completed: false
  }
];
