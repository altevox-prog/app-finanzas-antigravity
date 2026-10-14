import React from 'react';
import { Camera, Check, ArrowLeft, X } from 'lucide-react';
import Avatar from '../../ui/Avatar';

/**
 * ProfileHeader
 * Encabezado visual del modal de perfil.
 * Incluye Avatar con badge de cámara, edición de nombre, correo de sesión,
 * estado de conectividad (en línea/offline), botón atrás en subvistas y botón cerrar.
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
  children,
}) {
  return (
    <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] shrink-0 bg-slate-50/70 dark:bg-black/30 backdrop-blur-md">
      {currentView === 'main' ? (
        <>
          <div className="flex items-start justify-between gap-3">
            {/* Foto/Avatar editable con badge de cámara + nombre y correo */}
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="relative group shrink-0">
                <Avatar 
                  src={user?.user_metadata?.avatar_url || userProfile?.avatar_url || userProfile?.photo} 
                  name={user?.user_metadata?.full_name || userProfile?.name} 
                  email={user?.email}
                  size="xl" 
                  showStatus={true} 
                  isOnline={Boolean(user?.id && user?.id !== 'local-user')} 
                />

                {/* Badge de cámara */}
                <button
                  type="button"
                  onClick={() => fileInputRef?.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900 active:scale-90 transition-all cursor-pointer"
                  title="Cambiar foto de perfil"
                >
                  <Camera className="w-3 h-3" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  className="hidden" 
                />
              </div>

              {/* Nombre dinámico y Correo de sesión + Estado de conexión */}
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

                {/* Indicador de estado de conexión */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {isOnline ? (user?.id ? 'En línea / Sincronizado' : 'En línea (Modo local)') : 'Modo sin conexión'}
                  </span>
                </div>
              </div>
            </div>

            {/* Botón de cierre (X) arriba a la derecha */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer shrink-0"
              title="Cerrar Centro de Control"
              aria-label="Cerrar Centro de Control"
            >
              <X className="w-5 h-5" />
            </button>
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
              {currentView === 'subscriptions' && 'Suscripciones Recurrentes'}
              {currentView === 'pin_setup' && 'Configurar PIN de Seguridad'}
              {currentView === 'budgets' && 'Presupuestos de Gasto'}
              {currentView === 'savings_goals' && 'Metas de Ahorro'}
              {currentView === 'categories' && 'Mis Categorías'}
              {currentView === 'tax' && 'Impuestos y Declaración de Renta'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
