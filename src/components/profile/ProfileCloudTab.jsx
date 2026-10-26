import React, { useState, useRef } from 'react';
import { Database, FileSpreadsheet, TrendingUp, Download, UploadCloud, ShieldCheck, ChevronDown } from 'lucide-react';
import { downloadBackupJSON, parseAndValidateBackup, downloadTransactionsCSV, downloadInvestmentsCSV } from '../../utils/exportUtils';
import ProfileBackupPreviewModal from './components/ProfileBackupPreviewModal';

/**
 * ProfileCloudTab
 * Subcomponente de Almacenamiento, Respaldo y Exportación en la nube del Perfil.
 */
export default function ProfileCloudTab({
  user, isCloudUser, onManualCloudSync, isCloudSyncing = false, handleCloudSync, onLogout,
  setShowLogoutConfirm, transactions = [], investments = [], accounts = [], categories = [],
  debtsAndLoans = [], budgets = {}, savingsGoals = [], subscriptions = [], userProfile = {},
  securitySettings = {}, theme = 'dark', trm = 4000, onRestoreBackup
}) {
  const restoreInputRef = useRef(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupPreview, setBackupPreview] = useState(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const handleExportJSON = () => {
    try {
      downloadBackupJSON({
        transactions, investments, accounts, categories, debtsAndLoans,
        budgets, savingsGoals, subscriptions, recurring_payments: subscriptions,
        userProfile, securitySettings, trm, theme
      });
    } catch (err) {
      console.error('Error al exportar copia JSON:', err);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsRestoring(true);
    try {
      const parsed = await parseAndValidateBackup(file);
      setBackupPreview(parsed);
    } catch (err) {
      alert(err.message || 'Error al validar el archivo de copia de seguridad.');
    } finally {
      setIsRestoring(false);
      if (restoreInputRef.current) restoreInputRef.current.value = '';
    }
  };

  const confirmRestore = async () => {
    if (!backupPreview) return;
    try {
      await onRestoreBackup?.(backupPreview);
      setBackupPreview(null);
    } catch (err) {
      console.error('Error al confirmar restauración:', err);
    }
  };

  const EXPORT_ITEMS = [
    { id: 'backup', title: 'Copia de seguridad', desc: 'Respaldo completo de finanzas, cuentas y configuraciones', icon: Database, iconColor: 'bg-amber-500/10 border-amber-500/20 text-amber-500', action: handleExportJSON },
    { id: 'expenses_csv', title: 'Gastos a Excel', desc: 'Exportar historial detallado de movimientos en formato CSV', icon: FileSpreadsheet, iconColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500', action: () => downloadTransactionsCSV(transactions) },
    { id: 'investments_csv', title: 'Inversiones a Excel', desc: 'Exportar portafolio, rendimientos y valuaciones en CSV', icon: TrendingUp, iconColor: 'bg-blue-500/10 border-blue-500/20 text-blue-500', action: () => downloadInvestmentsCSV(investments, trm) }
  ];

  return (
    <div className="space-y-4 pb-6 animate-fadeIn">
      {/* Acordeón: Exportar y Respaldos */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setIsExportOpen(!isExportOpen)}
          className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-white/70 dark:border-white/[0.08] shadow-xs hover:border-emerald-500/40 transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0 group-hover:scale-105 transition-transform">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200">Exportar y respaldos</h3>
              <p className="text-[11px] text-slate-700 dark:text-zinc-300 font-medium truncate">Copias JSON y descargas en CSV</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 ml-2 shrink-0 text-slate-500 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-white transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`} />
        </button>

        {isExportOpen && (
          <div className="space-y-2.5 pt-1">
            {EXPORT_ITEMS.map(({ id, title, desc, icon: Icon, iconColor, action }) => (
              <button
                key={id}
                type="button"
                onClick={action}
                className="w-full p-3.5 sm:p-4 rounded-2xl border border-white/70 dark:border-white/[0.08] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md shadow-xs flex items-center justify-between gap-3.5 hover:border-emerald-500/40 hover:bg-white/70 dark:hover:bg-zinc-900/70 active:scale-[0.99] transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`p-2.5 rounded-xl border ${iconColor} shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{title}</h4>
                    <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium mt-0.5 truncate">{desc}</p>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white/60 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-white/10 text-slate-600 dark:text-zinc-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0">
                  <Download className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Restaurar Copia */}
      <div>
        <div 
          onClick={() => restoreInputRef?.current?.click()}
          className="p-4 rounded-2xl border border-white/70 dark:border-white/[0.08] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hover:border-emerald-500/40 shadow-xs active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors whitespace-nowrap">Restaurar copia</h4>
              <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium mt-0.5 whitespace-nowrap">Seleccionar archivo de respaldo</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isRestoring}
            className="px-3.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 group-hover:border-emerald-500/50 transition-all shrink-0 shadow-xs cursor-pointer whitespace-nowrap backdrop-blur-sm"
          >
            {isRestoring ? 'Restaurando...' : 'Examinar'}
          </button>
        </div>
        <input type="file" ref={restoreInputRef} accept=".json,application/json" onChange={handleFileSelect} className="hidden" />
      </div>

      {/* Cifrado y Nube */}
      <div className="p-3.5 rounded-2xl border border-white/70 dark:border-white/[0.08] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md shadow-xs flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
          <ShieldCheck className="w-4.5 h-4.5" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Almacenamiento y sincronización cifrada</p>
          <p className="text-[11px] text-slate-700 dark:text-zinc-300 font-medium leading-tight">Tus transacciones y saldos están protegidos y sincronizados en tiempo real.</p>
        </div>
      </div>

      <ProfileBackupPreviewModal backupPreview={backupPreview} onCancel={() => setBackupPreview(null)} onConfirm={confirmRestore} />
    </div>
  );
}
