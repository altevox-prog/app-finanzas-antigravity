import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileJson, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2,
  HardDrive
} from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { 
  downloadBackupJSON, 
  downloadTransactionsCSV, 
  downloadInvestmentsCSV, 
  parseAndValidateBackup 
} from '../../../utils/exportUtils';
import { toast } from '../../../utils/toast';

/**
 * ExportModal
 * Modal dedicado para exportación, copia de seguridad y restauración de datos.
 */
export default function ExportModal({
  isOpen = false,
  onClose,
  data = {},
  transactions = [],
  investments = [],
  accounts = [],
  categories = [],
  debtsAndLoans = [],
  budgets = {},
  savingsGoals = [],
  recurringPayments = [],
  subscriptions = [],
  userProfile = {},
  securitySettings = {},
  trm = 4050,
  theme = 'dark',
  onRestoreBackup
}) {
  useBackHandler(isOpen, onClose);

  const fileInputRef = useRef(null);
  const [backupPreview, setBackupPreview] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  if (!isOpen) return null;

  const currentExportData = {
    transactions: data.transactions || transactions,
    investments: data.investments || investments,
    accounts: data.accounts || accounts,
    categories: data.categories || categories,
    debtsAndLoans: data.debtsAndLoans || debtsAndLoans,
    budgets: data.budgets || budgets,
    savingsGoals: data.savingsGoals || savingsGoals,
    subscriptions: data.subscriptions || subscriptions || recurringPayments,
    recurring_payments: data.recurring_payments || recurringPayments || subscriptions,
    userProfile: data.userProfile || userProfile,
    securitySettings: data.securitySettings || securitySettings,
    trm: data.trm || trm,
    theme: data.theme || theme
  };

  const handleExportJSON = () => {
    try {
      downloadBackupJSON(currentExportData);
      toast.success('Copia de seguridad descargada exitosamente');
    } catch (e) {
      console.error('Error al exportar JSON:', e);
      toast.error('Error al generar la copia de seguridad');
    }
  };

  const handleExportCSVTransactions = () => {
    try {
      downloadTransactionsCSV(currentExportData.transactions || []);
      toast.success('Movimientos exportados en CSV');
    } catch (e) {
      console.error('Error al exportar CSV de transacciones:', e);
      toast.error('Error al exportar archivo CSV');
    }
  };

  const handleExportCSVInvestments = () => {
    try {
      downloadInvestmentsCSV(currentExportData.investments || [], currentExportData.trm || 4050);
      toast.success('Inversiones exportadas en CSV');
    } catch (e) {
      console.error('Error al exportar CSV de inversiones:', e);
      toast.error('Error al exportar archivo CSV');
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const parsed = await parseAndValidateBackup(file);
      setBackupPreview(parsed);
      toast.info('Archivo analizado. Confirma para restaurar.');
    } catch (err) {
      toast.error(err.message || 'Archivo de copia no válido');
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmRestore = async () => {
    if (!backupPreview || !onRestoreBackup) return;
    try {
      onRestoreBackup(backupPreview);
      setBackupPreview(null);
      toast.success('¡Copia de seguridad restaurada con éxito!');
      if (onClose) onClose();
    } catch (err) {
      console.error('Error al restaurar respaldo:', err);
      toast.error('Error al restaurar la copia de seguridad');
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden animate-slide-up border"
        style={{ backgroundColor: 'var(--modal-bg, #12141C)', borderColor: 'var(--border-color, rgba(255,255,255,0.1))', color: 'var(--text-main, #fff)' }}
      >
        {/* Cabecera */}
        <div className="shrink-0 px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color, rgba(255,255,255,0.1))' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shadow-sm">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Copia de Seguridad y Exportación
              </h3>
              <p className="text-[11px] text-slate-400">
                Guarda tus datos localmente o expórtalos en Excel/CSV
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain">
          {/* Card: Exportación JSON */}
          <div className="p-4 rounded-2xl border bg-slate-500/5 space-y-3" style={{ borderColor: 'var(--border-color, rgba(255,255,255,0.1))' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                <FileJson className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold">Copia Completa Monety (JSON)</h4>
                <p className="text-[11px] text-slate-400">Incluye cuentas, movimientos, inversiones, deudas y ajustes</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportJSON}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Copia de Seguridad JSON</span>
            </button>
          </div>

          {/* Card: Exportación CSV */}
          <div className="p-4 rounded-2xl border bg-slate-500/5 space-y-3" style={{ borderColor: 'var(--border-color, rgba(255,255,255,0.1))' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold">Hojas de Cálculo (CSV / Excel)</h4>
                <p className="text-[11px] text-slate-400">Exporta tablas para analizar en Excel, Numbers o Google Sheets</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportCSVTransactions}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Movimientos CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSVInvestments}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Inversiones CSV</span>
              </button>
            </div>
          </div>

          {/* Card: Restaurar Respaldo */}
          <div className="p-4 rounded-2xl border bg-slate-500/5 space-y-3" style={{ borderColor: 'var(--border-color, rgba(255,255,255,0.1))' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold">Restaurar Copia de Seguridad</h4>
                <p className="text-[11px] text-slate-400">Carga un archivo .json generado previamente</p>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              disabled={isRestoring}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isRestoring ? 'Analizando archivo...' : 'Seleccionar Archivo JSON'}</span>
            </button>
          </div>

          {/* Vista previa de restauración si existe */}
          {backupPreview && (
            <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Copia válida detectada</span>
              </div>
              <div className="text-xs text-slate-300 space-y-1 bg-black/20 p-3 rounded-xl font-mono text-[11px]">
                <div>Transacciones: {backupPreview.summary?.transactionsCount || 0}</div>
                <div>Cuentas: {backupPreview.summary?.accountsCount || 0}</div>
                <div>Inversiones: {backupPreview.summary?.investmentsCount || 0}</div>
                <div>Deudas: {backupPreview.summary?.debtsCount || 0}</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBackupPreview(null)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmRestore}
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-sm"
                >
                  Confirmar y Cargar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
