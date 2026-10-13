import React from 'react';
import { PieChart, ShieldCheck, Cloud, Settings } from 'lucide-react';

/**
 * ProfileTabBar
 * Barra segmentada de navegación por pestañas del Centro de Control:
 * Gestión / Finanzas, Seguridad, Nube / Almacenamiento, Ajustes / Sistema.
 */
export default function ProfileTabBar({ activeTab, setActiveTab }) {
  return (
    <div className="grid grid-cols-4 gap-1 p-1 mt-4 rounded-xl bg-slate-200/70 dark:bg-white/5 border border-slate-300/40 dark:border-white/10">
      <button
        type="button"
        onClick={() => setActiveTab('finances')}
        className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
          activeTab === 'finances'
            ? 'bg-white dark:bg-[#151922] text-emerald-600 dark:text-emerald-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <PieChart className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Gestión</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('security')}
        className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
          activeTab === 'security'
            ? 'bg-white dark:bg-[#151922] text-emerald-600 dark:text-emerald-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Seguridad</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('cloud')}
        className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
          activeTab === 'cloud'
            ? 'bg-white dark:bg-[#151922] text-emerald-600 dark:text-emerald-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Cloud className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Nube</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('system')}
        className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
          activeTab === 'system'
            ? 'bg-white dark:bg-[#151922] text-emerald-600 dark:text-emerald-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Settings className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Ajustes</span>
      </button>
    </div>
  );
}
