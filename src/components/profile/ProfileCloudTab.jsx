import React, { useState, useRef } from 'react';
import { Database, FileSpreadsheet, TrendingUp, Download, UploadCloud, ShieldCheck } from 'lucide-react';
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
    <div className="space-y-4 animate-fadeIn">
      {/* Exportar y Respaldos */}
      <div>
        <div className="flex items-center gap-1.5 px-1 mb-2">
          <Database className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Exportar y respaldos</h3>
        </div>

        <div className="space-y-2.5">
          {EXPORT_ITEMS.map(({ id, title, desc, icon: Icon, iconColor, action }) => (
            <button
              key={id}
              type="button"
              onClick={action}
              className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex items-center justify-between gap-3.5 hover:border-emerald-500/40 hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`p-2.5 rounded-xl border ${iconColor} shrink-0 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{desc}</p>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0">
                <Download className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Restaurar Copia */}
      <div>
        <div 
          onClick={() => restoreInputRef?.current?.click()}
          className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-emerald-500/40 hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-sm"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-colors">
              <UploadCloud className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors whitespace-nowrap">Restaurar copia</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 whitespace-nowrap">Seleccionar archivo</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isRestoring}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:border-emerald-500/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0 shadow-sm cursor-pointer whitespace-nowrap"
          >
            {isRestoring ? 'Restaurando...' : 'Examinar'}
          </button>
        </div>
        <input type="file" ref={restoreInputRef} accept=".json,application/json" onChange={handleFileSelect} className="hidden" />
      </div>

      {/* Cifrado y Nube */}
      <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
          <ShieldCheck size={18} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Almacenamiento y sincronización cifrada</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">Tus transacciones y saldos están protegidos y sincronizados en tiempo real.</p>
        </div>
      </div>

      <ProfileBackupPreviewModal backupPreview={backupPreview} onCancel={() => setBackupPreview(null)} onConfirm={confirmRestore} />
    </div>
  );
}
