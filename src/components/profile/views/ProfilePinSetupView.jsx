import React from 'react';
import { KeyRound } from 'lucide-react';

export default function ProfilePinSetupView({
  handleSavePin,
  newPin,
  setNewPin,
  confirmPin,
  setConfirmPin,
  pinError,
  setPinError,
  setCurrentView,
  onCancel,
}) {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (setCurrentView) {
      setCurrentView('main');
    }
  };

  return (
    <form onSubmit={handleSavePin} className="space-y-4 pt-2">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <KeyRound className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Define tu PIN de Acceso</h3>
        <p className="text-xs text-slate-400">
          Ingresa un código numérico de 4 a 6 dígitos para proteger tu información.
        </p>
      </div>

      {pinError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-medium">
          {pinError}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Nuevo PIN (4 a 6 dígitos)
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setNewPin(val);
              if (setPinError) setPinError('');
            }}
            placeholder="••••"
            required
            autoFocus
            className="w-full px-4 py-3 rounded-2xl bg-slate-900/80 border border-white/10 text-center text-2xl tracking-widest font-mono text-white focus:outline-none focus:border-emerald-400"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Confirmar PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setConfirmPin(val);
              if (setPinError) setPinError('');
            }}
            placeholder="••••"
            required
            className="w-full px-4 py-3 rounded-2xl bg-slate-900/80 border border-white/10 text-center text-2xl tracking-widest font-mono text-white focus:outline-none focus:border-emerald-400"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 py-3 rounded-2xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        >
          Guardar PIN
        </button>
      </div>
    </form>
  );
}
