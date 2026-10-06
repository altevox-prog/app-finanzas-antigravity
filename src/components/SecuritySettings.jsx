import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  Check, 
  AlertCircle, 
  Trash2, 
  Eye,
  EyeOff
} from 'lucide-react';

export default function SecuritySettings() {
  const [pinEnabled, setPinEnabled] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);

  useEffect(() => {
    try {
      const pinVal = localStorage.getItem('security_pin_code') || '';
      const enabled = localStorage.getItem('security_pin_enabled') === 'true';
      if (pinVal && pinVal.trim().length >= 4 && enabled) {
        setPinEnabled(true);
        setCurrentPin(pinVal.trim());
      } else {
        setPinEnabled(false);
        setCurrentPin('');
      }
    } catch {
      setPinEnabled(false);
      setCurrentPin('');
    }
  }, []);

  const handleSavePin = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanPin = newPin.replace(/\D/g, '').slice(0, 6);
    const cleanConfirm = confirmPin.replace(/\D/g, '').slice(0, 6);

    if (cleanPin.length < 4 || cleanPin.length > 6) {
      setErrorMsg('El PIN debe tener entre 4 y 6 dígitos numéricos.');
      return;
    }

    if (cleanPin !== cleanConfirm) {
      setErrorMsg('Los PINs no coinciden. Verifica los números.');
      return;
    }

    try {
      localStorage.setItem('security_pin_code', cleanPin);
      localStorage.setItem('security_pin_enabled', 'true');
      const savedSec = localStorage.getItem('presu_security_v1');
      const parsed = savedSec ? JSON.parse(savedSec) : {};
      localStorage.setItem('presu_security_v1', JSON.stringify({
        ...parsed,
        pinEnabled: true,
        pin: cleanPin
      }));
      setPinEnabled(true);
      setCurrentPin(cleanPin);
      setNewPin('');
      setConfirmPin('');
      setIsSettingPin(false);
      setSuccessMsg('¡PIN de seguridad configurado exitosamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setErrorMsg('Error al guardar el PIN en el dispositivo.');
    }
  };

  const handleRemovePin = () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      localStorage.setItem('security_pin_code', '');
      localStorage.setItem('security_pin_enabled', 'false');
      localStorage.setItem('presu_app_locked', 'false');
      const savedSec = localStorage.getItem('presu_security_v1');
      const parsed = savedSec ? JSON.parse(savedSec) : {};
      localStorage.setItem('presu_security_v1', JSON.stringify({
        ...parsed,
        pinEnabled: false,
        pin: ''
      }));
      setPinEnabled(false);
      setCurrentPin('');
      setIsSettingPin(false);
      setSuccessMsg('Bloqueo por PIN desactivado.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setErrorMsg('Error al desactivar el PIN.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Encabezado y Estado Actual */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            pinEnabled 
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              {pinEnabled ? 'PIN de Seguridad Activo' : 'Sin PIN de Seguridad'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {pinEnabled 
                ? 'La aplicación se bloqueará automáticamente al salir.' 
                : 'Acceso directo a la aplicación sin pantalla de bloqueo.'}
            </p>
          </div>
        </div>

        {pinEnabled && (
          <button
            type="button"
            onClick={handleRemovePin}
            className="px-3 py-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Desactivar</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulario de Configuración de PIN */}
      {isSettingPin ? (
        <form onSubmit={handleSavePin} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
              <span>{pinEnabled ? 'Cambiar PIN' : 'Crear PIN de Acceso'}</span>
            </h5>
            <button
              type="button"
              onClick={() => {
                setIsSettingPin(false);
                setErrorMsg('');
                setNewPin('');
                setConfirmPin('');
              }}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Nuevo PIN (4 a 6 dígitos)
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Ingresa tu nuevo PIN"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Confirmar PIN
            </label>
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Confirma tu nuevo PIN"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Guardar PIN
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsSettingPin(true)}
          className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-400 hover:text-emerald-500 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>{pinEnabled ? 'Cambiar PIN de seguridad' : 'Configurar un PIN de seguridad'}</span>
        </button>
      )}
    </div>
  );
}
