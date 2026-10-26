import React from 'react';
import { PieChart, ShieldCheck, Cloud, Settings } from 'lucide-react';

/**
 * ProfileTabBar
 * Barra segmentada de navegación por pestañas del Centro de Control:
 * Gestión / Finanzas, Seguridad, Nube / Almacenamiento, Ajustes / Sistema.
 */
export default function ProfileTabBar({ activeTab, setActiveTab }) {
  return (
    <div className="grid grid-cols-4 gap-1 p-1 mt-4 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-white/60 dark:border-white/[0.08] backdrop-blur-md shadow-xs">
      <button
        type="button"
        onClick={() => setActiveTab('finances')}
        className={`py-2 px-1 text-xs flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
          activeTab === 'finances'
            ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/30 shadow-xs rounded-xl backdrop-blur-sm'
            : 'text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white font-semibold rounded-xl hover:bg-white/40 dark:hover:bg-white/[0.06] border border-transparent transition-all'
        }`}
      >
        <PieChart className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Gestión</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('security')}
        className={`py-2 px-1 text-xs flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
          activeTab === 'security'
            ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/30 shadow-xs rounded-xl backdrop-blur-sm'
            : 'text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white font-semibold rounded-xl hover:bg-white/40 dark:hover:bg-white/[0.06] border border-transparent transition-all'
        }`}
      >
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Seguridad</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('cloud')}
        className={`py-2 px-1 text-xs flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
          activeTab === 'cloud'
            ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/30 shadow-xs rounded-xl backdrop-blur-sm'
            : 'text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white font-semibold rounded-xl hover:bg-white/40 dark:hover:bg-white/[0.06] border border-transparent transition-all'
        }`}
      >
        <Cloud className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Nube</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('system')}
        className={`py-2 px-1 text-xs flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
          activeTab === 'system'
            ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/30 shadow-xs rounded-xl backdrop-blur-sm'
            : 'text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white font-semibold rounded-xl hover:bg-white/40 dark:hover:bg-white/[0.06] border border-transparent transition-all'
        }`}
      >
        <Settings className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Ajustes</span>
      </button>
    </div>
  );
}
