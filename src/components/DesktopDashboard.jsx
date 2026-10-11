import React, { useMemo, useState } from 'react';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  TrendingUp,
  CreditCard,
  Plus,
  ChevronRight,
  Calendar,
  Receipt,
  ArrowRight,
  Edit2,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import ReportsAndCharts, { getCategoryEmoji } from './ReportsAndCharts';
import BrandIcon from './BrandIcon';
import { 
  getAccountNativeBalance, 
  formatNativeCurrency, 
  convertToCOP 
} from '../utils/currencyUtils';
import { 
  toSafeNumber, 
  safeNumber,
  calculateSavingsRate, 
  calculateNetFlow 
} from '../utils/financeMath';
import Dashboard from './Dashboard';
import SegmentedControl from './common/SegmentedControl';

export default function DesktopDashboard({
  transactions = [],
  accounts = [],
  categories = [],
  investments = [],
  debtsAndLoans = [],
  monthlyStats = {},
  selectedDate = new Date(),
  selectedDay = null,
  onOpenCalendar,
  onSelectDay,
  onNavigateToTab,
  onOpenTransaction,
  onOpenAddTransaction,
  setIsAddTransactionOpen,
  onOpenNewTransaction,
  onOpenNewAccount,
  onEditTransaction,
  onDeleteTransaction,
  onCustomizeWidgets,
  trm = 4000,
  widgets = []
}) {
  const { formatMoney } = usePrivacy();
  const [hoveredWeekIndex, setHoveredWeekIndex] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState(selectedDay ? 'day' : 'month');

  const periodOptions = [
    { id: 'month', label: 'Mensual' },
    { id: 'week', label: 'Semanal' },
    { id: 'day', label: 'Diario' }
  ];

  const setPeriod = (newPeriod) => {
    setCurrentPeriod(newPeriod);
    if (newPeriod === 'month') {
      if (onSelectDay) onSelectDay(null);
    } else if (newPeriod === 'day') {
      const today = new Date().toISOString().split('T')[0];
      if (onSelectDay) onSelectDay(selectedDay || today);
    }
  };

  const handleAddTx = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onOpenTransaction) onOpenTransaction();
    else if (setIsAddTransactionOpen) setIsAddTransactionOpen(true);
    else if (onOpenAddTransaction) onOpenAddTransaction();
    else if (onOpenNewTransaction) onOpenNewTransaction();
  };

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  // Transacciones del mes seleccionado
  const currentMonthTxs = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      const d = new Date(tx.date + 'T00:00:00');
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [transactions, currentYear, currentMonth]);

  // Métricas Clave
  const totalIncome = toSafeNumber(monthlyStats.totalIncome);
  const totalExpense = toSafeNumber(monthlyStats.totalExpense);
  const netBalance = monthlyStats.netBalance !== undefined ? toSafeNumber(monthlyStats.netBalance) : calculateNetFlow(totalIncome, totalExpense);
  const availableLiquidBalance = toSafeNumber(monthlyStats.availableLiquidBalance);

  // Tasa de ahorro: (Ingresos - Gastos) / Ingresos (acotada entre 0 y 100%, inmune a divisiones por 0 o NaN)
  const savingsRate = calculateSavingsRate(totalIncome, totalExpense);
  const freeCash = Math.max(0, netBalance);

  // Cálculo semanal del flujo de caja (Semanas 1 a 5)
  const weeklyCashFlow = useMemo(() => {
    const weeks = [
      { name: 'Sem 1', range: 'Días 1 - 7', start: 1, end: 7, income: 0, expense: 0 },
      { name: 'Sem 2', range: 'Días 8 - 14', start: 8, end: 14, income: 0, expense: 0 },
      { name: 'Sem 3', range: 'Días 15 - 21', start: 15, end: 21, income: 0, expense: 0 },
      { name: 'Sem 4', range: 'Días 22 - 28', start: 22, end: 28, income: 0, expense: 0 },
      { name: 'Sem 5', range: 'Días 29+', start: 29, end: 31, income: 0, expense: 0 }
    ];

    currentMonthTxs.forEach((tx) => {
      if (!tx || !tx.date) return;
      const type = String(tx.type || '').toLowerCase();
      const isTransfer = Boolean(
        tx.isTransfer ||
        tx.is_transfer ||
        type === 'transfer' ||
        type === 'transferencia' ||
        tx.categoryId === 'cat-transfer' ||
        tx.category_id === 'cat-transfer' ||
        tx.subcategoryId === 'sub-transfer-in' ||
        tx.subcategoryId === 'sub-transfer-out'
      );
      if (isTransfer) return;

      const day = parseInt(tx.date.split('-')[2], 10);
      const amt = safeNumber(tx.amount);
      const targetWeek = weeks.find((w) => day >= w.start && day <= w.end);
      if (targetWeek) {
        if (type === 'income' || type === 'ingreso') targetWeek.income += amt;
        if (type === 'expense' || type === 'gasto') targetWeek.expense += amt;
      }
    });

    const maxVal = Math.max(
      ...weeks.map((w) => Math.max(w.income, w.expense)),
      100000
    );

    return { weeks, maxVal };
  }, [currentMonthTxs]);

  // Últimas 7 transacciones ordenadas cronológicamente
  const recentTransactions = useMemo(() => {
    return [...currentMonthTxs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);
  }, [currentMonthTxs]);

  // Cuentas destacadas (máximo 4 para el bloque visual)
  const topAccounts = accounts.slice(0, 4);

  return (
    <div className="w-full space-y-6">

      {/* ============================================================== */}
      {/* WIDGETS FINANCIEROS: PATRIMONIO NETO, PRÉSTAMOS E INVERSIONES  */}
      {/* ============================================================== */}
      <Dashboard
        accounts={accounts}
        investments={investments}
        debtsAndLoans={debtsAndLoans}
        transactions={transactions}
        trm={trm}
        onNavigateToTab={onNavigateToTab}
        widgetsConfig={widgets}
        widgets={widgets}
        onCustomizeWidgets={onCustomizeWidgets}
        allowedWidgetIds={['net_worth', 'debts', 'investments', 'liquid_balance', 'balance', 'trm']}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
      />

      {/* ============================================================== */}
      {/* FILA 1: TARJETAS MÉTRICAS KPI (4 Columnas Bento Grid) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Saldo Disponible Líquido */}
        <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/[0.08] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Saldo disponible líquido
              </span>
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums">
              {formatMoney(availableLiquidBalance)}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${
                netBalance >= 0 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20'
              }`}>
                {netBalance >= 0 ? '+' : ''}{formatMoney(netBalance)}
              </span>
              <span className="text-slate-400 dark:text-zinc-500">balance del mes</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Ingresos del Mes */}
        <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/[0.08] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Ingresos del mes
              </span>
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{formatMoney(totalIncome)}
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {monthlyStats.incomeCount || 0} movimientos
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Gastos del Mes */}
        <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/[0.08] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/10 dark:bg-zinc-800 text-rose-600 dark:text-rose-400">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Gastos del mes
              </span>
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-rose-500 dark:text-rose-400 tabular-nums">
              -{formatMoney(totalExpense)}
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {monthlyStats.expenseCount || 0} compras y egresos
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Tasa de Ahorro / Superávit */}
        <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/[0.08] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-500/10 dark:bg-zinc-800 text-teal-600 dark:text-teal-400">
                <PiggyBank className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Tasa de ahorro
              </span>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 tabular-nums">
              {formatMoney(freeCash)} libre
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums">
              {savingsRate}%
            </h3>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3">
              <div 
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-700" 
                style={{ width: `${Math.min(savingsRate, 100)}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FILA 2: ANÁLISIS VISUAL (2 Columnas: 65% Flujo de Caja / 35% Donut Gastos) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Lado Izquierdo (Col-span 8, ~65%): Gráfica de Tendencia / Flujo de Caja */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Flujo de caja semanal
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Ingresos vs. gastos
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Distribución acumulada a lo largo del mes en curso
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Selector de período con SegmentedControl */}
              <div className="w-56 sm:w-60">
                <SegmentedControl
                  options={periodOptions}
                  value={currentPeriod}
                  onChange={setPeriod}
                  size="sm"
                />
              </div>

              {/* Leyenda interactiva */}
              <div className="hidden sm:flex items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600 dark:text-slate-300">Ingresos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-600 dark:text-slate-300">Gastos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico de Barras SVG con escala calibrada */}
          <div className="pt-2">
            <div className="grid grid-cols-5 gap-2 sm:gap-4 h-48 sm:h-52 items-end pt-6 pb-2 px-2 border-b border-slate-100 dark:border-white/5">
              {weeklyCashFlow.weeks.map((week, idx) => {
                const incomeHeight = Math.max(6, Math.round((week.income / weeklyCashFlow.maxVal) * 160));
                const expenseHeight = Math.max(6, Math.round((week.expense / weeklyCashFlow.maxVal) * 160));
                const isHovered = hoveredWeekIndex === idx;

                return (
                  <div
                    key={week.name}
                    onMouseEnter={() => setHoveredWeekIndex(idx)}
                    onMouseLeave={() => setHoveredWeekIndex(null)}
                    className={`flex flex-col items-center justify-end h-full group relative transition-all ${
                      isHovered ? 'opacity-100' : 'hover:opacity-90'
                    }`}
                  >
                    {/* Tooltip flotante con montos al pasar el cursor */}
                    {isHovered && (
                      <div className="absolute -top-14 z-20 px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-black text-white text-[11px] shadow-xl border border-white/10 pointer-events-none whitespace-nowrap animate-fadeIn flex flex-col gap-0.5">
                        <span className="text-emerald-400 font-bold">+{formatMoney(week.income)}</span>
                        <span className="text-rose-400 font-bold">-{formatMoney(week.expense)}</span>
                      </div>
                    )}

                    {/* Par de Barras: Ingreso (Verde) y Gasto (Rojo) */}
                    <div className="flex items-end gap-1.5 sm:gap-2 w-full justify-center">
                      {/* Barra Ingreso */}
                      <div className="w-3.5 sm:w-5 bg-slate-100 dark:bg-white/5 rounded-t-xl overflow-hidden flex items-end">
                        <div
                          className="w-full bg-emerald-500 rounded-t-xl transition-all duration-700 group-hover:brightness-110 shadow-sm"
                          style={{ height: `${incomeHeight}px` }}
                        />
                      </div>
                      {/* Barra Gasto */}
                      <div className="w-3.5 sm:w-5 bg-slate-100 dark:bg-white/5 rounded-t-xl overflow-hidden flex items-end">
                        <div
                          className="w-full bg-rose-500 rounded-t-xl transition-all duration-700 group-hover:brightness-110 shadow-sm"
                          style={{ height: `${expenseHeight}px` }}
                        />
                      </div>
                    </div>

                    {/* Etiqueta de la semana */}
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-2 block">
                      {week.name}
                    </span>
                    <span className="text-[9px] text-slate-400 block -mt-0.5">
                      {week.range}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lado Derecho (Col-span 4, ~35%): Widget de Gastos Rediseñado */}
        <div className="lg:col-span-4">
          <ReportsAndCharts
            transactions={transactions}
            categories={categories}
            selectedDate={selectedDate}
            selectedDay={selectedDay}
            onOpenCalendar={onOpenCalendar}
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* FILA 3: CUENTAS Y ÚLTIMAS TRANSACCIONES (35% Billeteras / 65% Tabla Detallada) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Lado Izquierdo (Col-span 4, ~35%): Billeteras y Cuentas */}
        <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Mis cuentas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {accounts.length} métodos y billeteras
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab?.('accounts')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors cursor-pointer"
            >
              Ver todas →
            </button>
          </div>

          {/* Lista de Cuentas */}
          <div className="space-y-2.5">
            {topAccounts.map((acc) => {
              const currency = acc?.currency || 'COP';
              const isCard = acc?.type === 'card' || acc?.type === 'credit';
              const isInvestment = acc?.type === 'investment';
              const isForeign = currency === 'USD' || currency === 'EUR';
              const currentBal = getAccountNativeBalance(acc, transactions, trm);
              const shares = Number(acc?.shares || 0);
              const unitPrice = Number(acc?.unitPrice || 0);
              const rate = currency === 'USD' ? Number(trm || 4000) : currency === 'EUR' ? Math.round(Number(trm || 4000) * 1.08) : 1;
              const copBal = currentBal * rate;

              return (
                <div
                  key={acc.id}
                  onClick={() => onNavigateToTab?.('accounts')}
                  className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 hover:border-slate-300 dark:hover:border-white/20 shadow-sm transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                      <BrandIcon name={acc.name} type={acc.type} color={acc.color} size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate group-hover:text-emerald-500 transition-colors">
                          {acc.name}
                        </h4>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-white/[0.06]">
                          {acc.currency || 'COP'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        <span className="text-xs font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400">
                          {acc.type === 'bank' ? 'Bancaria' : acc.type === 'wallet' ? 'Billetera' : isCard ? 'Tarjeta' : isInvestment ? 'Inversión' : 'Efectivo'}
                        </span>
                        {isInvestment && shares > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                            • {shares} acc{unitPrice > 0 ? ` @ ${formatNativeCurrency(unitPrice, currency)}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {isForeign && !isCard ? (
                      <>
                        <span className="text-xs sm:text-sm font-bold font-mono tracking-tight tabular-nums block text-slate-900 dark:text-zinc-100">
                          {formatNativeCurrency(currentBal, currency)}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 block tabular-nums">
                          ≈ $ {Math.round(copBal).toLocaleString('es-CO')} COP
                        </span>
                      </>
                    ) : isCard ? (
                      <>
                        <span className={`text-xs sm:text-sm font-bold font-mono tracking-tight tabular-nums block ${
                          currentBal < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {currentBal < 0 ? `-${formatMoney(Math.abs(currentBal))}` : 'Sin deuda'}
                        </span>
                        {acc.creditLimit && (
                          <span className="text-[10px] text-zinc-500 font-mono tabular-nums block">
                            Cupo: {formatMoney(acc.creditLimit)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className={`text-xs sm:text-sm font-bold font-mono tracking-tight tabular-nums block ${
                        currentBal < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-zinc-100'
                      }`}>
                        {formatMoney(currentBal)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab?.('accounts')}
            className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-white/10 hover:border-emerald-500 text-slate-600 dark:text-slate-300 hover:text-emerald-500 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Gestionar cuentas</span>
          </button>
        </div>

        {/* Lado Derecho (Col-span 8, ~65%): Tabla Detallada de Movimientos */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Últimos movimientos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Historial cronológico reciente con detalles
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab?.('transactions')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tabla Moderna SaaS */}
          {recentTransactions.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Receipt className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                No hay movimientos registrados en este mes
              </p>
              <button
                type="button"
                onClick={handleAddTx}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                + Registrar primer movimiento
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pl-2">Categoría</th>
                    <th className="pb-3 px-2">Descripción</th>
                    <th className="pb-3 px-2">Cuenta</th>
                    <th className="pb-3 px-2">Fecha</th>
                    <th className="pb-3 pr-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                  {recentTransactions.map((tx) => {
                    const isInc = tx.type === 'income';
                    const displayEmoji = getCategoryEmoji(
                      { icon: tx.categoryIcon, name: tx.categoryName },
                      tx.categoryName
                    );

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group"
                      >
                        {/* Categoría / Emoji */}
                        <td className="py-3 pl-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none select-none">
                              {displayEmoji}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {tx.categoryName || 'General'}
                            </span>
                          </div>
                        </td>

                        {/* Descripción / Nota */}
                        <td className="py-3 px-2 text-slate-600 dark:text-slate-300 font-medium truncate max-w-[180px]">
                          {tx.note || tx.subcategoryName || '—'}
                        </td>

                        {/* Cuenta */}
                        <td className="py-3 px-2 text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                          {tx.accountName || 'Principal'}
                        </td>

                        {/* Fecha */}
                        <td className="py-3 px-2 text-slate-500 dark:text-slate-400 tabular-nums">
                          {tx.date}
                        </td>

                        {/* Monto */}
                        <td className="py-3 pr-2 text-right font-bold font-mono tracking-tight tabular-nums">
                          <span className={isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}>
                            {isInc ? '+' : '-'}{formatMoney(tx.amount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
