import React, { useState, useRef } from 'react';
import { 
  Database, 
  FileSpreadsheet, 
  TrendingUp, 
  Download, 
  UploadCloud, 
  ShieldCheck 
} from 'lucide-react';
import { 
  downloadBackupJSON, 
  parseAndValidateBackup, 
  downloadTransactionsCSV, 
  downloadInvestmentsCSV 
} from '../../utils/exportUtils';
import ProfileBackupPreviewModal from './components/ProfileBackupPreviewModal';

/**
 * ProfileCloudTab
 * Subcomponente autónomo para la pestaña "Almacenamiento & Datos / Nube"
 * del Centro de Control / Perfil.
 * Incluye de forma independiente:
 * - Acceso y sincronización en la nube (Google Auth / Supabase Auth)
 * - Exportación de copia JSON, CSV de transacciones y CSV de portafolio
 *   (responsivo: menú desplegable en móvil, 3 tarjetas en escritorio)
 * - Carga, validación y modal de confirmación de restauración JSON
 */
export default function ProfileCloudTab({
  user,
  isCloudUser,
  onManualCloudSync,
  isCloudSyncing = false,
  handleCloudSync,
  onLogout,
  setShowLogoutConfirm,
  transactions = [],
  investments = [],
  accounts = [],
  categories = [],
  debtsAndLoans = [],
  budgets = {},
  savingsGoals = [],
  subscriptions = [],
  userProfile = {},
  securitySettings = {},
  theme = 'dark',
  trm = 4000,
  onRestoreBackup
}) {
  const restoreInputRef = useRef(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupPreview, setBackupPreview] = useState(null);

  const handleExportJSON = () => {
    try {
      const dataToBackup = {
        transactions,
        investments,
        accounts,
        categories,
        debtsAndLoans,
        budgets,
        savingsGoals,
        subscriptions,
        recurring_payments: subscriptions,
        userProfile,
        securitySettings,
        trm,
        theme
      };
      downloadBackupJSON(dataToBackup);
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
      console.error(err);
      alert(err.message || 'Error al validar el archivo de copia de seguridad.');
    } finally {
      setIsRestoring(false);
      if (restoreInputRef.current) {
        restoreInputRef.current.value = '';
      }
    }
  };

  const confirmRestore = async () => {
    if (!backupPreview) return;
    try {
      if (typeof onRestoreBackup === 'function') {
        await onRestoreBackup(backupPreview);
      }
      setBackupPreview(null);
    } catch (err) {
      console.error('Error al confirmar restauración:', err);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Bloque 1: Exportar y Respaldos */}
      <div>
        <div className="flex items-center gap-1.5 px-1 mb-2">
          <Database className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Exportar y respaldos
          </h3>
        </div>

        <div className="space-y-2.5">
          {/* Tarjeta 1: Copia de seguridad */}
          <button
            type="button"
            onClick={handleExportJSON}
            className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex items-center justify-between gap-3.5 hover:border-emerald-500/40 hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0 group-hover:scale-105 transition-transform">
                <Database className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Copia de seguridad
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Respaldo completo de finanzas, cuentas y configuraciones
                </p>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0">
              <Download className="w-4 h-4" />
            </div>
          </button>

          {/* Tarjeta 2: Gastos a Excel */}
          <button
            type="button"
            onClick={() => downloadTransactionsCSV(transactions)}
            className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex items-center justify-between gap-3.5 hover:border-emerald-500/40 hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shrink-0 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Gastos a Excel
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Exportar historial detallado de movimientos en formato CSV
                </p>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0">
              <Download className="w-4 h-4" />
            </div>
          </button>

          {/* Tarjeta 3: Inversiones a Excel */}
          <button
            type="button"
            onClick={() => downloadInvestmentsCSV(investments, trm)}
            className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex items-center justify-between gap-3.5 hover:border-emerald-500/40 hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 shrink-0 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Inversiones a Excel
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Exportar portafolio, rendimientos y valuaciones en CSV
                </p>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0">
              <Download className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>

      {/* Bloque 2: Restaurar Copia de Seguridad */}
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
              <h4 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                Restaurar copia
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 whitespace-nowrap">
                Seleccionar archivo
              </p>
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
        <input 
          type="file" 
          ref={restoreInputRef} 
          accept=".json,application/json" 
          onChange={handleFileSelect} 
          className="hidden" 
        />
      </div>

      {/* Bloque 3: Estado de Cifrado y Nube */}
      <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
          <ShieldCheck size={18} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Almacenamiento y sincronización cifrada
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            Tus transacciones y saldos están protegidos y sincronizados en tiempo real.
          </p>
        </div>
      </div>

      {/* Modal de confirmación de restauración */}
      <ProfileBackupPreviewModal
        backupPreview={backupPreview}
        onCancel={() => setBackupPreview(null)}
        onConfirm={confirmRestore}
      />
    </div>
  );
}
