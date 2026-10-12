import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { updateSupabaseCredentials } from '../../../lib/supabase';

export default function CustomSupabaseConfig({ isConfigured = false, onConfigSaved }) {
  const [showCredsForm, setShowCredsForm] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');

  if (isConfigured) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (customUrl.trim() && customKey.trim()) {
      updateSupabaseCredentials(customUrl.trim(), customKey.trim());
      if (onConfigSaved) {
        onConfigSaved({ url: customUrl.trim(), key: customKey.trim() });
      }
    }
  };

  return (
    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Supabase no conectado
        </span>
        <button
          type="button"
          onClick={() => setShowCredsForm(!showCredsForm)}
          className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
        >
          {showCredsForm ? 'Ocultar' : 'Conectar Nube'}
        </button>
      </div>

      {showCredsForm ? (
        <form onSubmit={handleSubmit} className="space-y-2 pt-1 border-t border-amber-500/15">
          <input 
            type="url"
            required
            placeholder="https://xyz.supabase.co"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs"
          />
          <input 
            type="text"
            required
            placeholder="Project Anon Key"
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs font-mono"
          />
          <button
            type="submit"
            className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-sm"
          >
            Guardar y Conectar Supabase
          </button>
        </form>
      ) : (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Puedes agregar tus variables en el archivo <code className="font-mono text-emerald-600">.env</code> o tocar 'Conectar Nube'.
        </p>
      )}
    </div>
  );
}
