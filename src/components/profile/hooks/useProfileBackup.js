import { useState, useRef } from 'react';
import { 
  downloadBackupJSON as defaultDownloadBackupJSON, 
  parseAndValidateBackup as defaultParseAndValidateBackup 
} from '../../../utils/exportUtils';

/**
 * useProfileBackup
 * Custom hook para gestionar la exportación, validación y restauración
 * de copias de seguridad en formato JSON.
 *
 * @param {Object} params
 * @param {Object} params.dataToBackup Entidades del sistema a respaldar
 * @param {Function} params.onRestoreBackup Callback que ejecuta la restauración
 * @param {Function} params.showToast Notificaciones toast al usuario
 * @param {Function} [params.parseAndValidateBackup] Validador de backup (fallback a exportUtils)
 * @param {Function} [params.downloadBackupJSON] Helper para descargar JSON (fallback a exportUtils)
 */
export function useProfileBackup({
  dataToBackup = {},
  onRestoreBackup,
  showToast,
  parseAndValidateBackup = defaultParseAndValidateBackup,
  downloadBackupJSON = defaultDownloadBackupJSON,
} = {}) {
  const restoreInputRef = useRef(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupPreview, setBackupPreview] = useState(null);

  const handleExportJSON = () => {
    try {
      if (typeof downloadBackupJSON === 'function') {
        downloadBackupJSON(dataToBackup);
      }
      if (typeof showToast === 'function') {
        showToast('Copia de seguridad descargada exitosamente.');
      }
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast(err.message || 'Error al exportar la copia de seguridad.', true);
      }
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
      if (typeof showToast === 'function') {
        showToast(err.message, true);
      }
    } finally {
      setIsRestoring(false);
      if (restoreInputRef.current) {
        restoreInputRef.current.value = '';
      }
    }
  };

  const confirmRestore = async () => {
    if (!backupPreview || !onRestoreBackup) return;
    try {
      onRestoreBackup(backupPreview);
      setBackupPreview(null);
      if (typeof showToast === 'function') {
        showToast('¡Copia de seguridad restaurada con éxito!');
      }
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast(err.message || 'Error al restaurar la copia de seguridad.', true);
      }
    }
  };

  return {
    restoreInputRef,
    isRestoring,
    backupPreview,
    setBackupPreview,
    handleExportJSON,
    handleFileSelect,
    confirmRestore,
  };
}

export default useProfileBackup;
