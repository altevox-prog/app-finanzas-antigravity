import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  PlusCircle, 
  CalendarSync, 
  HandCoins, 
  TrendingUp, 
  X 
} from 'lucide-react';

/**
 * QuickActionsFab
 * Botón de Acción Flotante (FAB) con menú desplegable de accesos directos rápidos
 * para registrar movimientos, transferencias, pagos recurrentes, deudas e inversiones.
 */
export default function QuickActionsFab({
  isOpen: controlledIsOpen = null,
  onToggle = null,
  onClose = null,
  onOpenTransaction = null,
  onOpenAddTransaction = null,
  onOpenTransfer = null,
  onOpenRecurring = null,
  onOpenAddRecurring = null,
  onOpenDebt = null,
  onOpenLoan = null,
  onOpenInvestment = null,
  onSelectAction = null,
  className = '',
  positionClassName = 'fixed bottom-20 right-4 sm:bottom-6 sm:right-6',
  showLabel = true
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== null && controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  const containerRef = useRef(null);

  const setOpenState = (nextState) => {
    if (!isControlled) {
      setInternalIsOpen(nextState);
    }
    if (typeof onToggle === 'function') {
      onToggle(nextState);
    }
    if (!nextState && typeof onClose === 'function') {
      onClose();
    }
  };

  const handleToggle = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpenState(!isOpen);
  };

  const handleClose = () => {
    setOpenState(false);
  };

  // Cierre con la tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Cierre al hacer click fuera del contenedor
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Disparar acción y cerrar menú
  const handleAction = (actionKey, callback) => {
    handleClose();
    if (typeof onSelectAction === 'function') {
      onSelectAction(actionKey);
    }
    if (typeof callback === 'function') {
      callback();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`${positionClassName} z-40 select-none ${className}`}
      aria-label="Acciones rápidas"
    >
      {/* Backdrop transparente / difuminado cuando el menú está abierto */}
      {isOpen && (
        <div 
          onClick={handleClose}
          className="fixed inset-0 z-40 bg-black/25 dark:bg-black/50 backdrop-blur-[2px] transition-opacity animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* Menú Desplegable Flotante de Opciones Rápidas */}
      {isOpen && (
        <div 
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="fab-action-button"
          className="absolute bottom-16 right-0 mb-2 w-64 sm:w-72 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-2.5 shadow-2xl space-y-1.5 animate-slide-up z-50 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera del desplegable */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Nuevo registro
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Rápido
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Cerrar menú"
              aria-label="Cerrar menú"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Opciones */}
          <div className="flex flex-col gap-1 pt-1">
            {/* 1. Registrar transacción (Gasto, Ingreso o Transferencia) */}
            <button
              type="button"
              onClick={() => handleAction('transaction', () => {
                if (typeof onOpenAddTransaction === 'function') onOpenAddTransaction('expense');
                else if (typeof onOpenTransaction === 'function') onOpenTransaction('expense');
              })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-all duration-150 ease-out active:scale-[0.97] text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <PlusCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs text-slate-900 dark:text-zinc-100 block truncate">
                  Registrar transacción
                </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 block truncate">
                  Gasto, ingreso o traspaso entre cuentas
                </span>
              </div>
            </button>

            {/* 3. Pago periódico / Recurrente */}
            <button
              type="button"
              onClick={() => handleAction('recurring', () => {
                if (typeof onOpenAddRecurring === 'function') onOpenAddRecurring();
                else if (typeof onOpenRecurring === 'function') onOpenRecurring();
              })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-all duration-150 ease-out active:scale-[0.97] text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CalendarSync className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs text-slate-900 dark:text-zinc-100 block truncate">
                  Pago recurrente
                </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 block truncate">
                  Suscripción o cuota fija
                </span>
              </div>
            </button>

            {/* 4. Préstamo o Deuda */}
            <button
              type="button"
              onClick={() => handleAction('debt', () => {
                if (typeof onOpenDebt === 'function') onOpenDebt('payable');
                else if (typeof onOpenLoan === 'function') onOpenLoan('payable');
              })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-all duration-150 ease-out active:scale-[0.97] text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <HandCoins className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs text-slate-900 dark:text-zinc-100 block truncate">
                  Préstamo o deuda
                </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 block truncate">
                  Debo o me deben dinero
                </span>
              </div>
            </button>

            {/* 5. Inversión */}
            {typeof onOpenInvestment === 'function' && (
              <button
                type="button"
                onClick={() => handleAction('investment', onOpenInvestment)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-all duration-150 ease-out active:scale-[0.97] text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-slate-900 dark:text-zinc-100 block truncate">
                    Nueva inversión
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 block truncate">
                    Registrar activo o inversión
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Botón Flotante Principal (+) */}
      <button
        id="fab-action-button"
        type="button"
        onClick={handleToggle}
        className={`relative z-50 flex items-center justify-center gap-2 px-4 py-3 sm:px-4 sm:py-3.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/40 transition-all duration-200 active:scale-95 cursor-pointer select-none group border border-white/20 ${
          isOpen ? 'ring-2 ring-emerald-400 ring-offset-2 dark:ring-offset-zinc-950' : ''
        }`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="Nuevo movimiento"
      >
        <Plus 
          className={`w-5 h-5 transition-transform duration-300 ${
            isOpen ? 'rotate-45' : 'group-hover:rotate-90'
          }`} 
        />
        {showLabel && (
          <span className="font-bold tracking-tight pr-0.5 text-xs hidden sm:inline">
            Nuevo movimiento
          </span>
        )}
      </button>
    </div>
  );
}
