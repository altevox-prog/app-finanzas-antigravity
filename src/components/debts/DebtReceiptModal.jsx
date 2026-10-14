import React, { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { 
  X, 
  Share2, 
  Download, 
  CheckCircle2, 
  Clock, 
  Loader2 
} from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import AppLogo from '../AppLogo';

export const handleShareReceipt = async (receiptRef, debtorName = 'Cliente') => {
  try {
    if (!receiptRef || !receiptRef.current) {
      console.warn('El contenedor de referencia para el comprobante (receiptRef) aún no se ha montado.');
      return false;
    }
    const node = receiptRef.current;
    if (!node) return false;

    const safeName = (debtorName || 'Cliente').toString().trim() || 'Cliente';
    const dataUrl = await toPng(node, { 
      quality: 0.95, 
      pixelRatio: 2,
      backgroundColor: '#ffffff'
    });

    if (!dataUrl) return false;

    let shared = false;

    if (typeof navigator !== 'undefined' && typeof window !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        if (typeof File !== 'undefined') {
          const file = new File([blob], `Estado_Cuenta_${safeName.replace(/\s+/g, '_')}.png`, { type: 'image/png' });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Estado de Cuenta - ${safeName}`,
              text: `Hola ${safeName}, te comparto el resumen actualizado de tu saldo y abonos registrados:`
            });
            shared = true;
            return true;
          }
        }
      } catch (shareErr) {
        console.warn('Web Share API no completada o cancelada, procediendo a descarga alternativa:', shareErr);
      }
    }

    // Fallback: Descarga directa automática si no se pudo compartir
    if (!shared && typeof document !== 'undefined') {
      try {
        const link = document.createElement('a');
        link.download = `Estado_Cuenta_${safeName.replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        link.click();
        return true;
      } catch (dlErr) {
        console.warn('Fallo al descargar comprobante PNG:', dlErr);
      }
    }

    return true;
  } catch (err) {
    console.error('Error al generar o compartir comprobante:', err);
    return false;
  }
};

export default function DebtReceiptModal({
  isOpen,
  onClose,
  debt,
  stats = {},
  formatMoney = (val) => `$${val}`
}) {
  useBackHandler(isOpen, onClose);
  const receiptRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const debtorName = debt?.personName || debt?.name || 'Cliente';
  const issueDate = new Date().toLocaleDateString('es-CO', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  const onShareClick = async () => {
    if (!receiptRef || !receiptRef.current) return;
    setSharing(true);
    setShareSuccess(false);
    try {
      const ok = await handleShareReceipt(receiptRef, debtorName);
      if (ok) {
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      }
    } catch (err) {
      console.warn('Error en onShareClick:', err);
    } finally {
      setSharing(false);
    }
  };

  const onDownloadOnly = async () => {
    if (!receiptRef || !receiptRef.current) return;
    setSharing(true);
    try {
      const dataUrl = await toPng(receiptRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: '#ffffff' });
      if (dataUrl && typeof document !== 'undefined') {
        const link = document.createElement('a');
        link.download = `Estado_Cuenta_${debtorName.replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Error en onDownloadOnly:', err);
    } finally {
      setSharing(false);
    }
  };

  // Envoltura segura con useEffect para atajos de teclado (Escape)
  useEffect(() => {
    if (!isOpen || !debt) return;

    const handleKeyDown = (e) => {
      if (e?.key === 'Escape' && onClose) {
        onClose();
      }
    };

    if (typeof window !== 'undefined' && window?.addEventListener) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      if (typeof window !== 'undefined' && window?.removeEventListener) {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [isOpen, debt, onClose]);

  if (!isOpen || !debt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-[#12141C] rounded-3xl flex flex-col max-h-[92vh] shadow-2xl overflow-hidden animate-slide-up border border-slate-200 dark:border-white/10">
        
        {/* Cabecera del Modal */}
        <div className="shrink-0 px-5 py-3.5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Compartir Estado de Cuenta
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenedor con Scroll de la Vista Previa */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-100/70 dark:bg-black/40">
          
          {/* ============================================================== */}
          {/* PLANTILLA DE COMPROBANTE (Capturada por html-to-image)         */}
          {/* Siempre fondo blanco y texto oscuro para máxima legibilidad   */}
          {/* ============================================================== */}
          <div 
            id="share-receipt-content"
            ref={receiptRef}
            className="w-full max-w-[440px] mx-auto bg-white text-slate-900 p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-200 font-sans space-y-5"
            style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
          >
            {/* 1. Encabezado */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <AppLogo size="md" showText={false} iconClassName="rounded-xl shadow-sm border border-slate-200/80" />
                <div>
                  <h4 className="text-xs font-black tracking-wider uppercase text-emerald-700">
                    Monety
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 tracking-tight uppercase">
                    Control Financiero
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Documento Oficial
                </span>
                <span className="text-[11px] font-bold text-slate-900">
                  ESTADO DE CUENTA
                </span>
              </div>
            </div>

            {/* 2. Título & Datos del Deudor */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {debt.type === 'receivable' ? 'Cuenta por Cobrar a:' : 'Registro de Cuenta:'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                  stats.isPaid 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {stats.isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  <span>{stats.isPaid ? 'Al día / Liquidado' : 'En curso / Activo'}</span>
                </span>
              </div>

              <h2 className="text-xl font-black text-slate-900 tracking-tight capitalize leading-tight">
                {debtorName}
              </h2>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Fecha de emisión: <strong className="text-slate-700 font-semibold">{issueDate}</strong></span>
                {debt.collectionDate && (
                  <span>Fecha de cobro: <strong className="text-slate-700 font-semibold">{debt.collectionDate}</strong></span>
                )}
                {!debt.collectionDate && debt.dueDate && (
                  <span>Vencimiento: <strong className="text-slate-700 font-semibold">{debt.dueDate}</strong></span>
                )}
              </div>
            </div>

            {/* 3. Resumen Numérico (Tarjeta Destacada) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <div className="text-center pb-2 border-b border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Saldo Pendiente Actual
                </span>
                <div className={`text-3xl font-black tracking-tight tabular-nums mt-0.5 ${
                  stats.isPaid ? 'text-emerald-600' : 'text-slate-900'
                }`}>
                  {formatMoney(stats.outstandingBalance)}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                <div className="p-2 rounded-lg bg-white border border-slate-200/60">
                  <span className="text-[10px] font-medium text-slate-500 block truncate">
                    Capital Inicial
                  </span>
                  <span className="font-bold text-slate-900 tabular-nums text-[11px]">
                    {formatMoney(stats.base || debt.totalAmount)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200/60">
                  <span className="text-[10px] font-medium text-emerald-600 block truncate">
                    Cap. Amortizado
                  </span>
                  <span className="font-bold text-emerald-600 tabular-nums text-[11px]">
                    {formatMoney(stats.totalCapitalPaid ?? stats.totalPaid)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200/60">
                  <span className="text-[10px] font-medium text-amber-600 block truncate">
                    Intereses Pagados
                  </span>
                  <span className="font-bold text-amber-600 tabular-nums text-[11px]">
                    {formatMoney(stats.totalInterestPaid ?? 0)}
                  </span>
                </div>
              </div>

              {stats.interestAmount > 0 && (
                <div className="flex justify-between items-center text-[10px] text-slate-500 px-1 pt-1 border-t border-slate-200/60">
                  <span>Intereses pactados ({debt.interestRate}%):</span>
                  <span className="font-semibold text-slate-700 tabular-nums">+{formatMoney(stats.interestAmount)}</span>
                </div>
              )}
            </div>

            {/* 4. Tabla o Listado Limpio de los Abonos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Historial de Abonos Registrados
                </h5>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {(debt.payments || []).length} pago(s)
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-2 px-3">Fecha</th>
                      <th className="py-2 px-3">Concepto & Desglose</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(debt.payments && debt.payments.length > 0) ? (
                      debt.payments.map((p, idx) => {
                        const cap = p.capitalAmount !== undefined ? Number(p.capitalAmount) : (p.mode === 'interest' ? 0 : Number(p.amount) || 0);
                        const int = p.interestAmount !== undefined ? Number(p.interestAmount) : (p.mode === 'interest' ? Number(p.amount) || 0 : 0);
                        const tot = Number(p.amount) || (cap + int);

                        let breakdownTag = '';
                        if (cap > 0 && int > 0) {
                          breakdownTag = `(${formatMoney(cap)} Cap. + ${formatMoney(int)} Int.)`;
                        } else if (int > 0 && cap === 0) {
                          breakdownTag = `(${formatMoney(int)} Solo Int.)`;
                        } else {
                          breakdownTag = `(${formatMoney(cap || tot)} Solo Cap.)`;
                        }

                        return (
                          <tr key={p.id || idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-600 whitespace-nowrap tabular-nums text-[11px]">
                              {p.date}
                            </td>
                            <td className="py-2 px-3 text-slate-800 font-medium">
                              <span className="block truncate max-w-[170px]">{p.note || 'Abono'}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">{breakdownTag}</span>
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-600 tabular-nums">
                              +{formatMoney(tot)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-400 text-xs italic">
                          Sin abonos registrados hasta la fecha
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Pie de Página */}
            <div className="pt-3 border-t border-slate-200 text-center space-y-0.5">
              <p className="text-[10px] font-semibold text-slate-500">
                Comprobante informativo generado desde Monety
              </p>
              <p className="text-[9px] text-slate-400">
                Registrado para control y seguimiento de cuentas personales
              </p>
            </div>
          </div>
        </div>

        {/* Acciones del Modal */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12141C] flex flex-col sm:flex-row gap-2.5 justify-end">
          <button
            id="btn-download-receipt"
            type="button"
            onClick={onDownloadOnly}
            disabled={sharing}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar PNG</span>
          </button>

          <button
            id="btn-share-receipt"
            type="button"
            onClick={onShareClick}
            disabled={sharing}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {sharing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando imagen...</span>
              </>
            ) : shareSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>¡Compartido!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Compartir por WhatsApp / Enviar</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
