import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, CalendarSync, HandCoins,
  TrendingUp, Plus, Settings, PanelLeftClose, PanelLeftOpen, FileText
} from 'lucide-react';
import Avatar from '../ui/Avatar';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
  { id: 'transactions', label: 'Movimientos', icon: ArrowLeftRight },
  { id: 'accounts', label: 'Cuentas y métodos', icon: CreditCard },
  { id: 'recurring', label: 'Pagos recurrentes', icon: CalendarSync },
  { id: 'debts', label: 'Préstamos y deudas', icon: HandCoins },
  { id: 'investments', label: 'Inversiones y activos', icon: TrendingUp },
  { id: 'invoicing', label: 'Facturación', icon: FileText }
];

export default function DesktopSidebar({
  modalControls, setIsActionMenuOpen, onOpenActionMenu, activeTab = 'dashboard', setActiveTab,
  onTabChange, onOpenTransaction, onOpenAddTx, onAddExpense, setIsAddTransactionOpen,
  onOpenAddTransaction, onOpenNewTransaction, userProfile, syncUser = null, className = 'hidden lg:flex'
}) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('monety_sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    let timer = null;
    const handleSaved = () => {
      setIsPulsing(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setIsPulsing(false), 2000);
    };
    if (typeof window !== 'undefined') window.addEventListener('app:data-saved', handleSaved);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('app:data-saved', handleSaved);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const ringClass = isPulsing
    ? 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] scale-[1.04] transition-all duration-300'
    : 'ring-2 ring-emerald-500/30 hover:ring-emerald-500 transition-all duration-300';

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('monety_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  };

  const handleTab = (tab) => (onTabChange || setActiveTab)?.(tab);
  const handleOpenTransaction = () => {
    const fn = modalControls?.openAddTransaction || modalControls?.handleOpenTransaction || onOpenAddTx || onOpenTransaction || onAddExpense || (setIsAddTransactionOpen ? () => setIsAddTransactionOpen(true) : null) || onOpenAddTransaction || onOpenNewTransaction;
    if (fn) fn('expense');
  };

  const handleOpenActionMenu = () => {
    if (typeof onOpenActionMenu === 'function') onOpenActionMenu();
    else if (typeof setIsActionMenuOpen === 'function') setIsActionMenuOpen(true);
    else if (modalControls?.setIsActionMenuOpen) modalControls.setIsActionMenuOpen(true);
    else if (modalControls?.openActionMenu) modalControls.openActionMenu();
    else handleOpenTransaction();
  };

  const handleOpenSettings = () => {
    const fn = modalControls?.openProfileModal || modalControls?.handleOpenProfile || modalControls?.handleOpenSettings;
    if (fn) fn();
  };

  const avatarSrc = syncUser?.user_metadata?.avatar_url || userProfile?.avatar_url || userProfile?.photo;
  const avatarName = syncUser?.user_metadata?.full_name || userProfile?.name || 'Alex Cuervo';
  const avatarEmail = syncUser?.email || userProfile?.email;

  return (
    <aside className={`${className} flex flex-col justify-between flex-shrink-0 transition-all duration-300 ease-in-out border-r border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-[#0c0d0e] ${isCollapsed ? 'w-20' : 'w-64'} h-[calc(100vh-4rem)] sticky top-16 z-30 select-none overflow-y-auto no-scrollbar`}>
      <div className="relative flex flex-col items-center pt-4 pb-2 shrink-0 w-full">
        <div className={`w-full flex items-center px-4 mb-3 ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
          <button type="button" onClick={toggleCollapse} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all cursor-pointer" title={isCollapsed ? "Expandir barra" : "Colapsar barra"}>
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4"/> : <PanelLeftClose className="w-4 h-4"/>}
          </button>
        </div>

        <button type="button" onClick={handleOpenActionMenu} className={`${isCollapsed ? 'w-11 h-11 rounded-2xl' : 'w-[calc(100%-1.5rem)] py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2'} bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center`} title="Nuevo movimiento" aria-label="Nuevo movimiento">
          <Plus className="w-5 h-5 stroke-[2.5]"/>
          {!isCollapsed && <span className="text-xs">Nuevo movimiento</span>}
        </button>
      </div>

      <nav className={`w-full flex-1 flex flex-col justify-center items-center my-auto ${isCollapsed ? 'gap-6 py-4' : 'gap-1.5 px-3 py-4'}`}>
        {NAV_ITEMS.map(({ id, label, icon: Icon, className: itemClass }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id} type="button" onClick={() => handleTab(id)}
              className={`${isCollapsed ? 'w-11 h-11 rounded-2xl justify-center' : 'w-full px-3 py-2.5 rounded-xl justify-start gap-3'} ${itemClass || 'flex'} items-center transition-all cursor-pointer relative ${
                isActive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold shadow-[0_0_20px_rgba(16,185,129,0.28)]' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/[0.04]'
              }`}
              title={label}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="text-xs font-medium truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="w-full shrink-0 pb-4 pt-2 flex flex-col items-center justify-center border-t border-slate-100 dark:border-white/[0.04] px-2">
        {isCollapsed ? (
          <button type="button" onClick={handleOpenSettings} className={`w-10 h-10 rounded-full ${ringClass} cursor-pointer overflow-hidden flex items-center justify-center shrink-0`} title={`Perfil - ${avatarName}`} aria-label={`Perfil - ${avatarName}`}>
            <Avatar src={avatarSrc} name={avatarName} email={avatarEmail} size="sm" className="!w-full !h-full" showStatus={false} />
          </button>
        ) : (
          <button type="button" onClick={handleOpenSettings} className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-100 hover:dark:bg-white/[0.03] transition-colors text-left cursor-pointer group" title={`Perfil - ${avatarName}`} aria-label="Abrir perfil y configuración">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`relative inline-flex items-center justify-center w-10 h-10 rounded-full ${ringClass} overflow-hidden shrink-0`}>
                <Avatar src={avatarSrc} name={avatarName} email={avatarEmail} size="sm" className="!w-full !h-full" showStatus={false} />
              </div>
              <div className="min-w-0 text-left flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{avatarName}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Configuración y datos</p>
              </div>
            </div>
            <Settings className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0" />
          </button>
        )}
      </div>
    </aside>
  );
}
