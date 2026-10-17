import React, { useState } from 'react';
import { 
  Trash2, 
  Pencil,
  Share2, 
  PlusCircle, 
  CheckCircle2, 
  ChevronDown,
  HandCoins
} from 'lucide-react';
import BrandIcon, { hasBrandIcon } from '../ui/BrandIcon';
import SwipeableRow from '../common/SwipeableRow';
import { toSafeNumber, calculateDebtStats } from '../../utils/financeMath';

/**
 * Formatea una fecha a formato corto localizado (ej. "15 nov")
 */
const formatDateShort = (dateStr) => {
  if (!dateStr) return null;
  try {
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

/**
 * Limpia y genera el subtítulo amigable de la deuda/préstamo:
 * 1. Filtra cualquier metadato técnico o bloque de serialización (PAYMENTS_JSON:[...]).
 * 2. Si no hay nota escrita por el usuario, sustituye por información financiera limpia:
 *    - "Último abono: [fecha]" / "Último cobro: [fecha]"
 *    - O fecha de vencimiento / cobro estimado
 *    - O "Préstamo activo" / "Deuda activa"
 */
const getCleanSubtitle = (debt, stats, isReceivable, formatDateFn) => {
  let noteText = '';
  if (typeof debt?.notes === 'string') {
    if (debt.notes.startsWith('PAYMENTS_JSON:')) {
      noteText = '';
    } else if (debt.notes.includes('PAYMENTS_JSON:')) {
      noteText = debt.notes.split('PAYMENTS_JSON:')[0].trim();
    } else {
      noteText = debt.notes.trim();
    }
  }

  // Si el usuario escribió una nota real y legible (sin JSON), la mostramos
  if (noteText && !noteText.startsWith('{') && !noteText.startsWith('[')) {
    return noteText;
  }

  // 1. Si hay abonos registrados: "Último cobro/abono: [fecha]"
  const payments = Array.isArray(debt?.payments) ? debt.payments : [];
  if (payments.length > 0) {
    const lastPayment = payments[payments.length - 1];
    const lastDate = lastPayment?.date ? formatDateFn(lastPayment.date) : null;
    if (lastDate) {
      return isReceivable ? `Último cobro: ${lastDate}` : `Último abono: ${lastDate}`;
    }
  }

  // 2. Si hay desembolsos adicionales y es préstamo
  const disbursements = Array.isArray(debt?.disbursements) ? debt.disbursements : [];
  if (disbursements.length > 0 && isReceivable) {
    const lastDisb = disbursements[disbursements.length - 1];
    const lastDisbDate = lastDisb?.date ? formatDateFn(lastDisb.date) : null;
    if (lastDisbDate) {
      return `Último desembolso: ${lastDisbDate}`;
    }
  }

  // 3. Si tiene fecha límite o vencimiento
  const targetDate = isReceivable ? (debt?.collectionDate || debt?.dueDate) : (debt?.dueDate || debt?.collectionDate);
  const formattedDate = formatDateFn(targetDate);
  if (formattedDate) {
    return stats?.isPaid 
      ? 'Liquidado' 
      : isReceivable 
        ? `Cobro estimado: ${formattedDate}` 
        : `Vence: ${formattedDate}`;
  }

  // 4. Fallback limpio
  return stats?.isPaid 
    ? (isReceivable ? 'Préstamo liquidado' : 'Deuda liquidada')
    : (isReceivable ? 'Préstamo activo' : 'Obligación activa');
};

/**
 * DebtCard
 * Tarjeta colapsable tipo acordeón con cabecera interactiva compacta y cuadrícula 2x2 en vista expandida.
 */
export default function DebtCard({
  debt,
  stats = {},
  formatCurrency,
  onAddPayment,
  onAddDisbursement,
  onShareReceipt,
  onEdit,
  onDelete,
  onDeletePayment
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const displayName = debt.personName || debt.name || 'Sin nombre';
  const initialLetter = displayName ? displayName.charAt(0).toUpperCase() : '$';
  const isOverdue = !stats.isPaid && debt.dueDate && new Date(debt.dueDate) < new Date();
  const statusLabel = stats.isPaid ? 'Pagada' : isOverdue ? 'Vencido' : (debt.status || 'Pendiente');
  const isReceivable = debt.type === 'receivable';
  const hasBrand = hasBrandIcon(displayName);

  // Lógica de acumulación de capital e intereses
  const disbursements = Array.isArray(debt.disbursements) ? debt.disbursements : [];
  const totalDisbursed = toSafeNumber(stats?.totalDisbursed ?? disbursements.reduce((s, d) => s + toSafeNumber(d.amount), 0));
  const initialAmount = toSafeNumber(stats?.initialAmount ?? debt.initialAmount ?? debt.initial_amount ?? (toSafeNumber(debt.amount || debt.totalAmount) - totalDisbursed));

  const totalPrincipal = toSafeNumber(
    stats?.totalPrincipal ?? 
    stats?.base ?? 
    (initialAmount + totalDisbursed) ??
    debt.total_amount ?? 
    debt.totalAmount ?? 
    debt.amount ?? 
    debt.principalAmount ?? 
    debt.remaining_amount ?? 
    debt.remainingAmount ?? 0
  );
  const payments = Array.isArray(debt.payments) ? debt.payments : [];

  const debtStats = calculateDebtStats(totalPrincipal, payments, {
    accruedInterest: toSafeNumber(stats?.totalAccruedInterest ?? stats?.accruedInterest ?? debt.accruedInterest ?? 0)
  });

  const paidPrincipal = toSafeNumber(stats?.paidPrincipal ?? stats?.totalCapitalPaid ?? debtStats.totalCapitalPaid);
  const paidInterest = toSafeNumber(stats?.paidInterest ?? stats?.totalInterestPaid ?? debtStats.totalInterestPaid);
  const totalPaid = toSafeNumber(stats?.totalPaid ?? (paidPrincipal + paidInterest));
  const totalAccruedInterest = toSafeNumber(stats?.totalAccruedInterest ?? stats?.accruedInterest ?? debt.accruedInterest ?? 0);
  const totalToPay = toSafeNumber(stats?.totalToPay ?? (totalPrincipal + (stats?.accruedInterest || (stats?.interestAmount + (stats?.insurance || 0)) || totalAccruedInterest)));
  const remainingInterest = toSafeNumber(stats?.remainingInterest ?? 0);
  const outstandingBalance = toSafeNumber(stats?.outstandingBalance ?? (totalToPay - totalPaid));

  const formatMoneyVal = (val) => {
    if (typeof formatCurrency === 'function') {
      return formatCurrency(toSafeNumber(val));
    }
    return `$${Math.round(toSafeNumber(val)).toLocaleString('es-CO')}`;
  };

  const amortizationPercent = totalPrincipal > 0 
    ? Math.min(100, Math.max(0, Math.round((paidPrincipal / totalPrincipal) * 100))) 
    : (stats.isPaid ? 100 : 0);

  const rawDate = isReceivable ? (debt.collectionDate || debt.dueDate) : (debt.dueDate || debt.collectionDate);
  const dateFormatted = formatDateShort(rawDate);
  const dateLabel = stats.isPaid 
    ? '✓ Liquidado' 
    : isReceivable
      ? (dateFormatted ? `Cobro: ${dateFormatted}` : null)
      : (dateFormatted ? `Vence: ${dateFormatted}` : null);

  const subtitleText = getCleanSubtitle(debt, stats, isReceivable, formatDateShort);

  return (
    <SwipeableRow
      onEdit={onEdit ? () => onEdit(debt) : undefined}
      onDelete={onDelete ? () => onDelete(debt.id) : undefined}
      className="rounded-2xl"
      contentClassName="rounded-2xl"
      showDesktopHover={false}
    >
      <div
        className="w-full rounded-2xl border shadow-sm transition-all overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-main)'
        }}
      >
        {/* ============================================================== */}
        {/* 1. CABECERA INTERACTIVA (VISTA COLAPSADA: ~72px a 80px)        */}
        {/* ============================================================== */}
        <div
          onClick={() => setIsExpanded(prev => !prev)}
          className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.02]"
        >
          {/* Lado Izquierdo: Icono/BrandIcon, Nombre en negrita, Badges de estado y frecuencia */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center p-1 bg-slate-100 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 shrink-0">
              {hasBrand ? (
                <BrandIcon name={displayName} size={28} />
              ) : (
                <div className={`w-full h-full rounded-lg flex items-center justify-center font-bold text-sm ${
                  isReceivable 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}>
                  {initialLetter}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 truncate">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-tight truncate">
                  {displayName}
                </span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${
                  stats.isPaid
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : isOverdue
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-white/10'
                }`}>
                  {statusLabel}
                </span>
                {debt.frequency && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 ${
                    isReceivable 
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                  }`}>
                    Pago {debt.frequency}
                  </span>
                )}
              </div>
              {subtitleText && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium mt-0.5">
                  {subtitleText}
                </p>
              )}
            </div>
          </div>

          {/* Lado Derecho: Saldo restante mono tabular, micro-etiqueta vencimiento/cobro y chevron */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-right">
            <div className="flex flex-col items-end justify-center">
              <span className={`text-sm sm:text-base font-bold font-mono tracking-tight tabular-nums leading-tight ${
                stats.isPaid 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : isReceivable 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-rose-600 dark:text-rose-400'
              }`}>
                {formatMoneyVal(outstandingBalance)}
              </span>
              {dateLabel && (
                <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums mt-0.5">
                  {dateLabel}
                </span>
              )}
            </div>

            {/* Microbotones en Hover para escritorio (SIN tapar valores) */}
            <div className="hidden md:flex items-center justify-end w-14 shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(debt);
                  }}
                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="Editar"
                  aria-label="Editar"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(debt.id);
                  }}
                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="Eliminar"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180 text-emerald-500' : 'rotate-0'}`} />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. VISTA EXPANDIDA (DESPLEGABLE CON ANIMACIÓN FLUIDA)          */}
        {/* ============================================================== */}
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[1400px] opacity-100 border-t border-slate-100 dark:border-white/5' : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="p-3.5 sm:p-4 space-y-3 bg-slate-50/50 dark:bg-white/[0.01]">
            {/* Matriz de Métricas en Cuadrícula 2x2 */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              {/* Cuadrante 1 (Superior Izquierdo): CAPITAL INICIAL */}
              <div>
                <span className="block text-[10px] tracking-wider text-slate-400 font-semibold uppercase">
                  CAPITAL INICIAL
                </span>
                <span className="font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums block mt-0.5 text-xs sm:text-sm">
                  {formatMoneyVal(initialAmount || stats?.initialAmount || stats?.base || totalPrincipal)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-tight tabular-nums block mt-0.5">
                  {totalDisbursed > 0 
                    ? `+ Extra: ${formatMoneyVal(totalDisbursed)} (Total: ${formatMoneyVal(totalPrincipal)})`
                    : `Amortizado: ${formatMoneyVal(paidPrincipal)} (${amortizationPercent}%)`}
                </span>
              </div>

              {/* Cuadrante 2 (Superior Derecho): COMPROMISO TOTAL */}
              <div>
                <span className="block text-[10px] tracking-wider text-slate-400 font-semibold uppercase">
                  COMPROMISO TOTAL
                </span>
                <span className="font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums block mt-0.5 text-xs sm:text-sm">
                  {formatMoneyVal(totalToPay)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-tight tabular-nums block mt-0.5">
                  Intereses est.: {formatMoneyVal(stats?.accruedInterest || (stats?.interestAmount + (stats?.insurance || 0)) || totalAccruedInterest)}
                </span>
              </div>

              {/* Cuadrante 3 (Inferior Izquierdo): TOTAL ABONADO */}
              <div>
                <span className="block text-[10px] tracking-wider text-slate-400 font-semibold uppercase">
                  TOTAL ABONADO
                </span>
                <span className="font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums block mt-0.5 text-xs sm:text-sm">
                  {formatMoneyVal(totalPaid)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-tight tabular-nums block mt-0.5">
                  Cap: {formatMoneyVal(paidPrincipal)} | Int: {formatMoneyVal(paidInterest)}
                </span>
              </div>

              {/* Cuadrante 4 (Inferior Derecho): INTERESES PAGADOS */}
              <div>
                <span className="block text-[10px] tracking-wider text-slate-400 font-semibold uppercase">
                  INTERESES PAGADOS
                </span>
                <span className="font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400 tabular-nums block mt-0.5 text-xs sm:text-sm">
                  {formatMoneyVal(paidInterest)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-tight tabular-nums block mt-0.5">
                  {remainingInterest > 0 
                    ? `Int. pend: ${formatMoneyVal(remainingInterest)}` 
                    : (isReceivable 
                        ? `Rendimiento: +${((paidInterest / (totalPrincipal || 1)) * 100).toFixed(1)}%` 
                        : `Costo fin.: ${((paidInterest / (totalPrincipal || 1)) * 100).toFixed(1)}%`)}
                </span>
              </div>
            </div>

            {/* Única Barra de Progreso Delgada (Amortización h-1.5) */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400 text-[11px]">
                  {isReceivable ? 'Capital recuperado' : 'Capital amortizado'}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-slate-700 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white font-bold">{formatMoneyVal(paidPrincipal)}</strong> de {formatMoneyVal(totalPrincipal)}{' '}
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-0.5 font-mono">
                    ({amortizationPercent}%)
                  </span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${amortizationPercent}%` }}
                />
              </div>
            </div>

            {/* Botones de Acción Compactos */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {!stats.isPaid ? (
                <button
                  type="button"
                  onClick={() => onAddPayment && onAddPayment(debt)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer ${
                    isReceivable 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{isReceivable ? 'Abonar' : 'Registrar pago'}</span>
                </button>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Liquidada</span>
                </div>
              )}

              {isReceivable && !stats.isPaid && (
                <button
                  type="button"
                  onClick={() => onAddDisbursement && onAddDisbursement(debt)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
                  title="Prestar más dinero / Añadir desembolso adicional"
                >
                  <HandCoins className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Prestar más</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onShareReceipt && onShareReceipt(debt)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-white/10 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{isReceivable ? 'Extracto' : 'Comprobante'}</span>
              </button>
            </div>

            {/* Historial expandible si tiene abonos o desembolsos adicionales */}
            {((debt.payments && debt.payments.length > 0) || (debt.disbursements && debt.disbursements.length > 0)) && (
              <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isHistoryOpen ? 'rotate-180' : 'rotate-0'}`} />
                  Historial ({debt.payments?.length || 0} abonos{debt.disbursements?.length ? `, ${debt.disbursements.length} desembolsos` : ''})
                </button>

                {isHistoryOpen && (
                  <div 
                    className="mt-2 space-y-1.5 p-2.5 rounded-xl border text-xs"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  >
                    {/* Desembolsos adicionales */}
                    {debt.disbursements?.map((d, dIdx) => (
                      <div 
                        key={d.id || dIdx}
                        className="flex items-center justify-between py-1.5 border-b last:border-0 gap-2 bg-blue-500/5 px-2 rounded-lg"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold font-mono tracking-tight tabular-nums text-blue-600 dark:text-blue-400">
                              Desembolso #{dIdx + 1}: +{formatMoneyVal(d.amount)}
                            </span>
                            <span className="text-[10px] text-blue-500 font-mono tracking-tight tabular-nums">
                              (Capital extra)
                            </span>
                          </div>
                          <p className="text-[11px] opacity-70 truncate mt-0.5">
                            {d.date} • {d.fromAccountName ? `Desde: ${d.fromAccountName} • ` : ''}{d.notes || 'Desembolso adicional'}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Pagos / Abonos */}
                    {debt.payments?.map((p, idx) => {
                      const cap = p.capitalAmount !== undefined ? Number(p.capitalAmount) : (p.mode === 'interest' ? 0 : Number(p.amount) || 0);
                      const int = p.interestAmount !== undefined ? Number(p.interestAmount) : (p.mode === 'interest' ? Number(p.amount) || 0 : 0);
                      const tot = Number(p.amount) || (cap + int);

                      let breakdownText = '';
                      if (cap > 0 && int > 0) {
                        breakdownText = `(${formatMoneyVal(cap)} Cap. + ${formatMoneyVal(int)} Int.)`;
                      } else if (int > 0 && cap === 0) {
                        breakdownText = `(${formatMoneyVal(int)} Solo Int.)`;
                      } else {
                        breakdownText = `(${formatMoneyVal(cap || tot)} Solo Cap.)`;
                      }

                      return (
                        <div 
                          key={p.id || idx} 
                          className="flex items-center justify-between py-1.5 border-b last:border-0 gap-2"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold font-mono tracking-tight tabular-nums text-slate-800 dark:text-slate-100">
                                Abono #{idx + 1}: {formatMoneyVal(tot)}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-tight tabular-nums">
                                {breakdownText}
                              </span>
                            </div>
                            <p className="text-[11px] opacity-70 truncate mt-0.5">
                              {p.date} • {p.accountName ? `${p.accountName} • ` : ''}{p.note || (isReceivable ? 'Cobro recibido' : 'Pago abonado')}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {onDeletePayment && (
                              <button
                                type="button"
                                onClick={() => onDeletePayment(debt.id, p.id)}
                                className="opacity-40 hover:opacity-100 hover:text-rose-500 cursor-pointer p-1 rounded-lg"
                                title="Eliminar abono"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </SwipeableRow>
  );
}
