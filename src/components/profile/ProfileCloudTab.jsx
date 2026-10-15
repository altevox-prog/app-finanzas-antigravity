import React, { useState, useRef } from 'react';
import { 
  Cloud, 
  ShieldCheck, 
  RefreshCw, 
  LogOut, 
  Database, 
  FileSpreadsheet, 
  TrendingUp, 
  Download, 
  UploadCloud, 
  ChevronDown 
} from 'lucide-react';
import { signInWithGoogle } from '../../services/supabaseClient';
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
  const [showExportMenu, setShowExportMenu] = useState(false);

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

  const triggerCloudSync = async () => {
    if (typeof handleCloudSync === 'function') {
      await handleCloudSync();
    } else if (typeof onManualCloudSync === 'function') {
      await onManualCloudSync();
    }
  };

  const triggerLogout = () => {
    if (typeof onLogout === 'function') {
      onLogout();
    } else if (typeof setShowLogoutConfirm === 'function') {
      setShowLogoutConfirm(true);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Módulo de Acceso con Google y Supabase Auth */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <Cloud className="w-4 h-4 text-blue-500" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Acceso y Sincronización en la Nube
          </h3>
        </div>

        {isCloudUser ? (
          <div className="flex flex-col sm:flex-row gap-2.5">
            {typeof onManualCloudSync === 'function' && (
              <button
                type="button"
                onClick={triggerCloudSync}
                disabled={isCloudSyncing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-500/20 text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                <span>{isCloudSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={triggerLogout}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-500/20 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Acceso y Respaldo Multi-cuenta
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Inicia sesión para sincronizar automáticamente tus finanzas de forma segura en la nube y acceder desde cualquier dispositivo.
              </p>
            </div>

            {/* Botón oficial 'Continuar con Google' */}
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="w-full py-2.5 px-4 font-medium flex items-center justify-center gap-3 rounded-xl bg-white text-gray-800 hover:bg-gray-100 dark:bg-slate-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Autenticación oficial vía Supabase Auth. Los datos se almacenan exclusivamente bajo tu cuenta.</span>
            </div>
          </div>
        )}
      </div>

      {/* Módulo de Copias de Seguridad y Archivos */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2 px-1">
          <Database className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Copias de seguridad y archivos
          </h3>
        </div>

        {/* 1. Vista Móvil (md:hidden): Botón / Selector desplegable compacto de exportación */}
        <div className="md:hidden relative">
          <button
            type="button"
            onClick={() => setShowExportMenu((prev) => !prev)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all cursor-pointer shadow-sm select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Exportar datos...
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Copia JSON, Gastos a Excel o Inversiones
                </p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>

          {showExportMenu && (
            <div className="mt-2 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-1 animate-fadeIn">
              <button
                type="button"
                onClick={() => {
                  handleExportJSON();
                  setShowExportMenu(false);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition-colors">
                    Copia de seguridad completa
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Formato JSON</p>
                </div>
                <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  downloadTransactionsCSV(transactions);
                  setShowExportMenu(false);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-500 transition-colors">
                    Gastos a Excel
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Archivo CSV</p>
                </div>
                <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  downloadInvestmentsCSV(investments, trm);
                  setShowExportMenu(false);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-500 transition-colors">
                    Inversiones a Excel
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Portafolio CSV</p>
                </div>
                <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0" />
              </button>
            </div>
          )}
        </div>

        {/* 2. Vista Escritorio (md: en adelante): 3 tarjetas organizadas horizontalmente */}
        <div className="hidden md:grid md:grid-cols-3 gap-2.5">
          {/* Respaldo JSON */}
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex flex-col items-start justify-center p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 active:scale-95 transition-all cursor-pointer group text-left shadow-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 mb-2.5">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition-colors">
                Copia de seguridad completa
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Formato JSON
              </p>
            </div>
          </button>

          {/* Gastos a Excel */}
          <button
            type="button"
            onClick={() => downloadTransactionsCSV(transactions)}
            className="flex flex-col items-start justify-center p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 active:scale-95 transition-all cursor-pointer group text-left shadow-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 mb-2.5">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-500 transition-colors">
                Gastos a Excel
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Archivo CSV
              </p>
            </div>
          </button>

          {/* Inversiones a Excel */}
          <button
            type="button"
            onClick={() => downloadInvestmentsCSV(investments, trm)}
            className="flex flex-col items-start justify-center p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 active:scale-95 transition-all cursor-pointer group text-left shadow-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0 mb-2.5">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-500 transition-colors">
                Inversiones a Excel
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Portafolio CSV
              </p>
            </div>
          </button>
        </div>

        {/* Tarjeta de Restauración */}
        <div 
          onClick={() => restoreInputRef?.current?.click()}
          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 active:scale-98 transition-all cursor-pointer flex items-center justify-between gap-3.5 group shadow-sm"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-200/70 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-colors">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                Restaurar desde archivo JSON
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Seleccionar archivo JSON previo para recuperar tus datos
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isRestoring}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:border-emerald-500/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0 shadow-sm"
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

      {/* Modal de confirmación de restauración */}
      <ProfileBackupPreviewModal
        backupPreview={backupPreview}
        onCancel={() => setBackupPreview(null)}
        onConfirm={confirmRestore}
      />
    </div>
  );
}
