import React, { useState } from 'react';
import { 
  Pencil, 
  Trash2, 
  Share2, 
  PlusCircle, 
  CheckCircle2, 
  ChevronUp, 
  ChevronDown,
  HandCoins,
  ArrowUpRight
} from 'lucide-react';
import BrandIcon, { hasBrandIcon } from '../ui/BrandIcon';
import { toSafeNumber, calculateDebtStats } from '../../utils/financeMath';

export default function DebtCard({
  debt,
  stats,
  formatCurrency,
  onAddPayment,
  onAddDisbursement,
  onShareReceipt,
  onEdit,
  onDelete,
  onDeletePayment
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayName = debt.personName || debt.name || 'Sin nombre';
  const initialLetter = displayName ? displayName.charAt(0).toUpperCase() : '$';
  const isOverdue = !stats.isPaid && debt.dueDate && new Date(debt.dueDate) < new Date();
  const statusLabel = stats.isPaid ? 'Pagada' : isOverdue ? 'Vencido' : (debt.status || 'Pendiente');
  const isReceivable = debt.type === 'receivable';
  const hasBrand = hasBrandIcon(displayName);

  // Lógica de acumulación de capital e intereses
  const totalPrincipal = toSafeNumber(
    stats?.totalPrincipal ?? 
    stats?.base ?? 
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
  const totalAccruedInterest = toSafeNumber(stats?.totalAccruedInterest ?? stats?.accruedInterest ?? debt.accruedInterest ?? 0);

  const formatMoneyVal = (val) => {
    if (typeof formatCurrency === 'function') {
      return formatCurrency(toSafeNumber(val));
    }
    return `$${Math.round(toSafeNumber(val)).toLocaleString('es-CO')}`;
  };

  return (
    <div
      className="rounded-2xl border p-4 transition-all shadow-sm"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-main)'
      }}
    >
      {/* 1. Cabecera de la tarjeta: Título con avatar/logo de marca y botones discretos */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {hasBrand ? (
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-0.5 bg-slate-100 dark:bg-white/10 border border-slate-200/60 dark:border-white/10">
              <BrandIcon name={displayName} size={30} />
            </div>
          ) : (
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
              isReceivable 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {initialLetter}
            </div>
          )}

          <div className="truncate">
            <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
              {displayName}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className={`capitalize ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}`}>
                {statusLabel}
              </span>
              {debt.frequency && (
                <>
                  <span>•</span>
                  <span className={`capitalize ${
                    isReceivable 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    Pago {debt.frequency}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Botones discretos de edición/borrado a la derecha sin colisionar */}
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          <button
            type="button"
            onClick={() => onEdit && onEdit(debt)}
            className="p-1.5 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Editar deuda o préstamo"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete && onDelete(debt.id)}
            className="p-1.5 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
            title="Eliminar registro"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. BLOQUE DESTACADO: Saldo Pendiente / Restante Dinámico */}
      <div 
        className="p-3.5 rounded-xl border my-2.5 space-y-2"
        style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-semibold uppercase tracking-wider">
            {isReceivable ? 'Saldo Restante por Cobrar' : 'Saldo Restante por Pagar'}
          </span>
          <span className="font-mono tabular-nums tracking-tight">
            {stats.isPaid 
              ? '✓ Liquidado' 
              : isReceivable
                ? `Cobro: ${debt.collectionDate || debt.dueDate || 'Sin fecha'}`
                : `Vence: ${debt.dueDate || debt.collectionDate || 'Sin fecha'}`}
          </span>
        </div>

        {/* Número Principal Grande y Destacado */}
        <div className={`text-[22px] sm:text-[25px] font-bold font-mono tracking-tight tabular-nums leading-none ${
          stats.isPaid 
            ? 'text-[#34C759]' 
            : isReceivable 
              ? 'text-[#34C759]' 
              : 'text-[#FF3B30]'
        }`}>
          {formatCurrency(stats.outstandingBalance)}
        </div>

        {stats.remainingInterest > 0 && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Cap. pendiente: <span className="font-bold font-mono tracking-tight tabular-nums" style={{ color: 'var(--text-main)' }}>{formatCurrency(stats.remainingCapital)}</span> + Int. causados: <span className="text-amber-500 font-bold font-mono tracking-tight tabular-nums">{formatCurrency(stats.remainingInterest)}</span>
          </div>
        )}

        {/* Desglose Secundario: Base, Intereses, Total Pagado con desglose acumulado */}
        <div className="pt-2 border-t grid grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <span className="block opacity-75">Capital Inicial</span>
            <span className="font-bold font-mono tracking-tight tabular-nums" style={{ color: 'var(--text-main)' }}>{formatCurrency(stats.base)}</span>
          </div>
          <div>
            <span className="block opacity-75">
              {stats.monthsElapsed > 0 ? `Int. Causados (${stats.monthsElapsed}m)` : 'Intereses Estim.'}
            </span>
            <span className="font-bold font-mono tracking-tight tabular-nums" style={{ color: 'var(--text-main)' }}>
              {formatCurrency(stats.accruedInterest || (stats.interestAmount + (stats.insurance || 0)))}
            </span>
          </div>
          <div>
            <span className="block opacity-75">Total Pagado</span>
            <span className="font-bold font-mono tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalPaid)}</span>
          </div>
        </div>

        {/* Badges de Desglose Acumulado: Capital amortizado vs Intereses pagados */}
        <div className="pt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="px-2 py-0.5 rounded-md font-bold font-mono tracking-tight tabular-nums bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            Cap. amortizado: {formatCurrency(stats.totalCapitalPaid ?? stats.totalPaid)}
          </span>
          <span className="px-2 py-0.5 rounded-md font-bold font-mono tracking-tight tabular-nums bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            Intereses pagados: {formatCurrency(stats.totalInterestPaid ?? 0)}
          </span>
          {stats.remainingInterest > 0 && (
            <span className="px-2 py-0.5 rounded-md font-bold font-mono tracking-tight tabular-nums bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
              Int. pendientes: {formatCurrency(stats.remainingInterest)}
            </span>
          )}
          {stats.monthsElapsed > 0 && (
            <span className="px-2 py-0.5 rounded-md font-bold font-mono tracking-tight tabular-nums bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {stats.monthsElapsed} {stats.monthsElapsed === 1 ? 'mes transcurrido' : 'meses transcurridos'}
            </span>
          )}
        </div>
      </div>

      {/* 3. Doble Barra de Progreso Fintech: Capital e Intereses */}
      <div className="space-y-3.5 my-3 pt-3 border-t border-slate-200/60 dark:border-white/5">
        {/* Barra 1: Capital Recuperado / Amortizado */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-medium text-slate-600 dark:text-slate-400">
              {isReceivable ? 'Capital recuperado' : 'Capital amortizado'}
            </span>
            <span className="font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
              {formatMoneyVal(paidPrincipal)} / {formatMoneyVal(totalPrincipal)}{' '}
              <span className="text-emerald-500 ml-1 font-mono tabular-nums">
                ({Math.round((paidPrincipal / (totalPrincipal || 1)) * 100)}%)
              </span>
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (paidPrincipal / (totalPrincipal || 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Barra 2: Ganancias en Intereses Cobrados / Intereses pagados al banco */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
              {isReceivable ? (
                <span>✨ Ganancia en intereses</span>
              ) : (
                <span>Intereses pagados al banco / prestamista</span>
              )}
            </span>
            <span className="font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
              {formatMoneyVal(paidInterest)} {isReceivable ? 'cobrados' : 'pagados'}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(100, totalAccruedInterest > 0 ? (paidInterest / totalAccruedInterest) * 100 : (paidInterest > 0 ? 100 : 0))}%` 
              }}
            />
          </div>
          {paidInterest > 0 && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 text-right">
              {isReceivable ? (
                <>Rendimiento acumulado: +{((paidInterest / (totalPrincipal || 1)) * 100).toFixed(1)}% sobre el capital</>
              ) : (
                <>Costo financiero acumulado: {((paidInterest / (totalPrincipal || 1)) * 100).toFixed(1)}% sobre el capital</>
              )}
            </p>
          )}
        </div>
      </div>

      {/* 4. Botones principales */}
      <div className={`grid gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-white/5 ${
        isReceivable && !stats.isPaid ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'
      }`}>
        {!stats.isPaid ? (
          <button
            type="button"
            onClick={() => onAddPayment && onAddPayment(debt)}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer ${
              isReceivable 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isReceivable ? 'Abonar' : 'Registrar pago'}</span>
          </button>
        ) : (
          <div className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Liquidada</span>
          </div>
        )}

        {isReceivable && !stats.isPaid && (
          <button
            type="button"
            onClick={() => onAddDisbursement && onAddDisbursement(debt)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Prestar más dinero / Añadir desembolso adicional"
          >
            <HandCoins className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Prestar más</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onShareReceipt && onShareReceipt(debt)}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-white/10 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
            isReceivable && !stats.isPaid ? 'col-span-2 sm:col-span-1' : ''
          }`}
        >
          <Share2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{isReceivable ? 'Compartir extracto' : 'Ver comprobante'}</span>
        </button>
      </div>

      {/* 5. Historial expandible si tiene abonos o desembolsos adicionales */}
      {((debt.payments && debt.payments.length > 0) || (debt.disbursements && debt.disbursements.length > 0)) && (
        <div className="mt-2.5 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] font-semibold opacity-70 hover:opacity-100 flex items-center gap-1 cursor-pointer"
            style={{ color: 'var(--text-main)' }}
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Historial ({debt.payments?.length || 0} abonos{debt.disbursements?.length ? `, ${debt.disbursements.length} desembolsos` : ''})
          </button>

          {isExpanded && (
            <div 
              className="mt-2 space-y-1.5 p-2.5 rounded-xl border text-xs animate-slide-up"
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
                        Desembolso #{dIdx + 1}: +{formatCurrency(d.amount)}
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
                  breakdownText = `(${formatCurrency(cap)} Cap. + ${formatCurrency(int)} Int.)`;
                } else if (int > 0 && cap === 0) {
                  breakdownText = `(${formatCurrency(int)} Solo Int.)`;
                } else {
                  breakdownText = `(${formatCurrency(cap || tot)} Solo Cap.)`;
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
                          Abono #{idx + 1}: {formatCurrency(tot)}
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
  );
}
