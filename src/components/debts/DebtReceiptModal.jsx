import React, { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { X, Share2, Download, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import AppLogo from '../ui/AppLogo';

export const handleShareReceipt = async (receiptRef, debtorName = 'Cliente') => {
  try {
    if (!receiptRef?.current) return false;
    const safeName = (debtorName || 'Cliente').toString().trim() || 'Cliente';
    const dataUrl = await toPng(receiptRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: '#ffffff' });
    if (!dataUrl) return false;
    if (typeof navigator !== 'undefined' && navigator.canShare && typeof File !== 'undefined') {
      try {
        const file = new File([await (await fetch(dataUrl)).blob()], `Estado_Cuenta_${safeName.replace(/\s+/g, '_')}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `Estado de Cuenta - ${safeName}`, text: `Hola ${safeName}, te comparto el resumen actualizado de tu saldo y abonos registrados:` });
          return true;
        }
      } catch (shareErr) { console.warn('Web Share falló, procediendo a descarga:', shareErr); }
    }
    const link = Object.assign(document.createElement('a'), { download: `Estado_Cuenta_${safeName.replace(/\s+/g, '_')}.png`, href: dataUrl });
    link.click();
    return true;
  } catch (err) {
    console.error('Error al generar o compartir comprobante:', err);
    return false;
  }
};

export default function DebtReceiptModal({ isOpen, onClose, debt, stats = {}, formatMoney = (v) => `$${v}` }) {
  useBackHandler(isOpen, onClose);
  const receiptRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const debtorName = debt?.personName || debt?.name || 'Cliente';
  const issueDate = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });

  useEffect(() => {
    const handleKeyDown = (e) => { if (e?.key === 'Escape') onClose?.(); };
    if (isOpen && debt) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, debt, onClose]);

  const handleAction = async (isShare) => {
    if (!receiptRef?.current) return;
    setSharing(true);
    try {
      if (isShare) {
        if (await handleShareReceipt(receiptRef, debtorName)) {
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 3000);
        }
      } else {
        const dataUrl = await toPng(receiptRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: '#ffffff' });
        if (dataUrl) Object.assign(document.createElement('a'), { download: `Estado_Cuenta_${debtorName.replace(/\s+/g, '_')}.png`, href: dataUrl }).click();
      }
    } catch (err) { console.error('Error procesando comprobante:', err); } finally { setSharing(false); }
  };

  if (!isOpen || !debt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-[#12141C] rounded-3xl flex flex-col max-h-[92vh] shadow-2xl overflow-hidden animate-slide-up border border-slate-200 dark:border-white/10">
        <div className="shrink-0 px-5 py-3.5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Compartir Estado de Cuenta</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-100/70 dark:bg-black/40">
          <div id="share-receipt-content" ref={receiptRef} className="w-full max-w-[440px] mx-auto bg-white text-slate-900 p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-200 font-sans space-y-5" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <AppLogo size="md" showText={false} iconClassName="rounded-xl shadow-sm border border-slate-200/80" />
                <div>
                  <h4 className="text-xs font-black tracking-wider uppercase text-emerald-700">Monety</h4>
                  <p className="text-[10px] font-semibold text-slate-400 tracking-tight uppercase">Control Financiero</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Documento Oficial</span>
                <span className="text-[11px] font-bold text-slate-900">ESTADO DE CUENTA</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{debt.type === 'receivable' ? 'Cuenta por Cobrar a:' : 'Registro de Cuenta:'}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${stats.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                  {stats.isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  <span>{stats.isPaid ? 'Al día / Liquidado' : 'En curso / Activo'}</span>
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight capitalize leading-tight">{debtorName}</h2>
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Fecha de emisión: <strong className="text-slate-700 font-semibold">{issueDate}</strong></span>
                {(debt.collectionDate || debt.dueDate) && <span>{debt.collectionDate ? 'Fecha de cobro' : 'Vencimiento'}: <strong className="text-slate-700 font-semibold">{debt.collectionDate || debt.dueDate}</strong></span>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <div className="text-center pb-2 border-b border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Saldo Pendiente Actual</span>
                <div className={`text-3xl font-black tracking-tight tabular-nums mt-0.5 ${stats.isPaid ? 'text-emerald-600' : 'text-slate-900'}`}>{formatMoney(stats.outstandingBalance)}</div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                {[
                  { label: 'Capital Inicial', val: stats.base || debt.totalAmount, color: 'text-slate-900' },
                  { label: 'Cap. Amortizado', val: stats.totalCapitalPaid ?? stats.totalPaid, color: 'text-emerald-600' },
                  { label: 'Intereses Pagados', val: stats.totalInterestPaid ?? 0, color: 'text-amber-600' }
                ].map((item, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200/60">
                    <span className={`text-[10px] font-medium block truncate ${item.color}`}>{item.label}</span>
                    <span className={`font-bold tabular-nums text-[11px] ${item.color}`}>{formatMoney(item.val)}</span>
                  </div>
                ))}
              </div>

              {stats.interestAmount > 0 && (
                <div className="flex justify-between items-center text-[10px] text-slate-500 px-1 pt-1 border-t border-slate-200/60">
                  <span>Intereses pactados ({debt.interestRate}%):</span>
                  <span className="font-semibold text-slate-700 tabular-nums">+{formatMoney(stats.interestAmount)}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Historial de Abonos Registrados</h5>
                <span className="text-[10px] text-slate-400 font-semibold">{(debt.payments || []).length} pago(s)</span>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-2 px-3">Fecha</th><th className="py-2 px-3">Concepto & Desglose</th><th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(debt.payments?.length > 0) ? debt.payments.map((p, idx) => {
                      const cap = p.capitalAmount !== undefined ? Number(p.capitalAmount) : (p.mode === 'interest' ? 0 : Number(p.amount) || 0);
                      const int = p.interestAmount !== undefined ? Number(p.interestAmount) : (p.mode === 'interest' ? Number(p.amount) || 0 : 0);
                      const tot = Number(p.amount) || (cap + int);
                      const tag = cap > 0 && int > 0 ? `(${formatMoney(cap)} Cap. + ${formatMoney(int)} Int.)` : int > 0 && cap === 0 ? `(${formatMoney(int)} Solo Int.)` : `(${formatMoney(cap || tot)} Solo Cap.)`;
                      return (
                        <tr key={p.id || idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap tabular-nums text-[11px]">{p.date}</td>
                          <td className="py-2 px-3 text-slate-800 font-medium">
                            <span className="block truncate max-w-[170px]">{p.note || 'Abono'}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">{tag}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600 tabular-nums">+{formatMoney(tot)}</td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={3} className="py-4 text-center text-slate-400 text-xs italic">Sin abonos registrados hasta la fecha</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 text-center space-y-0.5">
              <p className="text-[10px] font-semibold text-slate-500">Comprobante informativo generado desde Monety</p>
              <p className="text-[9px] text-slate-400">Registrado para control y seguimiento de cuentas personales</p>
            </div>
          </div>
        </div>

        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12141C] flex flex-col sm:flex-row gap-2.5 justify-end">
          <button type="button" onClick={() => handleAction(false)} disabled={sharing} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
            <Download className="w-3.5 h-3.5" /><span>Descargar PNG</span>
          </button>
          <button type="button" onClick={() => handleAction(true)} disabled={sharing} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
            {sharing ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Generando imagen...</span></> : shareSuccess ? <><CheckCircle2 className="w-4 h-4" /><span>¡Compartido!</span></> : <><Share2 className="w-4 h-4" /><span>Compartir por WhatsApp / Enviar</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}
