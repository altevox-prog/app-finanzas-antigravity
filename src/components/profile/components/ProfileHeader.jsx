import React from 'react';
import { Check, ArrowLeft, X, RefreshCw, LogOut, Plus } from 'lucide-react';
import Avatar from '../../ui/Avatar';

/**
 * ProfileHeader
 * Encabezado visual del modal de perfil.
 * Incluye Avatar con badge de cámara, edición de nombre, correo de sesión,
 * estado de conectividad (en línea/offline), acciones rápidas de sincronización y sesión,
 * botón atrás en subvistas y botón cerrar.
 */
export default function ProfileHeader({
  currentView = 'main',
  setCurrentView,
  user,
  userProfile,
  isEditingName,
  setIsEditingName,
  tempName,
  setTempName,
  handleSaveName,
  handleImageChange,
  handleRemovePhoto,
  fileInputRef,
  isOnline,
  onClose,
  handleSync,
  isSyncing = false,
  handleSignOut,
  children,
}) {
  return (
    <div className={`border-b border-slate-200/80 dark:border-white/[0.08] shrink-0 bg-slate-50 dark:bg-[#121214] ${
      currentView === 'main' ? 'p-4 sm:p-5' : 'py-2 px-4'
    }`}>
      {currentView === 'main' ? (
        <>
          <div className="flex items-start justify-between gap-3">
            {/* Foto/Avatar editable con badge de cámara + nombre y correo */}
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="relative w-16 h-16 shrink-0">
                {/* Resplandor pulsante exterior (solo el halo respira) */}
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md animate-pulse pointer-events-none" />

                {/* Avatar estático con anillo verde ceñido al borde exacto */}
                <Avatar 
                  src={user?.user_metadata?.avatar_url || userProfile?.avatar_url || userProfile?.photo} 
                  name={user?.user_metadata?.full_name || userProfile?.name} 
                  email={user?.email}
                  size="xl" 
                  showStatus={false}
                  className="relative ring-2 ring-emerald-500 shadow-sm" 
                />

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  className="hidden" 
                />
              </div>

              {/* Nombre dinámico y Correo de sesión */}
              <div className="min-w-0 flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-1.5 max-w-xs">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName && setTempName(e.target.value)}
                      placeholder="Tu nombre"
                      maxLength={32}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName && handleSaveName()}
                      className="w-full px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="p-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white shrink-0 cursor-pointer active:scale-95"
                      title="Guardar nombre"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => setIsEditingName && setIsEditingName(true)}
                    className="group cursor-pointer inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                    title="Toca para editar tu nombre"
                  >
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate leading-tight">
                      {userProfile?.name || 'Usuario'}
                    </h2>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold opacity-75 group-hover:opacity-100">
                      (Editar)
                    </span>
                  </div>
                )}

                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                  {user?.email || 'Modo local (sin cuenta vinculada)'}
                </p>
              </div>
            </div>

            {/* Acciones Rápidas de Cuenta + Botón de Cierre */}
            <div className="flex items-center gap-1 shrink-0">
              {handleSync && (
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={isSyncing}
                  title="Sincronizar ahora"
                  aria-label="Sincronizar ahora"
                  className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
                </button>
              )}

              {handleSignOut && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer shrink-0 ml-0.5"
                title="Cerrar Centro de Control"
                aria-label="Cerrar Centro de Control"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {children}
        </>
      ) : (
        /* Header de Subvistas */
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCurrentView && setCurrentView('main')}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-[17px] sm:text-[18px] font-bold tracking-tight">
              {currentView === 'subscriptions' && 'Suscripciones recurrentes'}
              {currentView === 'pin_setup' && 'Configurar PIN de seguridad'}
              {currentView === 'budgets' && 'Presupuesto mensual'}
              {currentView === 'savings_goals' && 'Metas de ahorro'}
              {currentView === 'categories' && 'Mis categorías'}
              {currentView === 'tax' && 'Impuestos y declaración de renta'}
              {currentView === 'accounts' && 'Mis cuentas'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {currentView === 'accounts' && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('monety:open-add-account'))}
                className="w-8 h-8 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm"
                title="Añadir nueva cuenta"
                aria-label="Agregar cuenta"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
