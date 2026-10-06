import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowUpDown, 
  ArrowLeftRight, 
  TrendingUp, 
  CalendarSync, 
  HandCoins,
  X 
} from 'lucide-react';

export default function QuickActionsModal({
  isOpen,
  onClose,
  setIsOpen,
  onAddExpense,
  onAddIncome,
  onOpenTransaction,
  onOpenNewTransaction,
  onOpenTransfer,
  onOpenInvestment,
  onOpenNewInvestment,
  onOpenRecurring,
  onOpenAddRecurring,
  onOpenLoan,
  onOpenAddLoan,
  openModal,
  setActiveTab
}) {
  // Manejo de tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (typeof onClose === 'function') onClose();
        if (typeof setIsOpen === 'function') setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, setIsOpen]);

  if (!isOpen) return null;

  const handleSelectAction = (actionFn) => {
    // 1. Cerrar primero el menú desplegable de accesos directos
    if (typeof onClose === 'function') onClose();
    if (typeof setIsOpen === 'function') setIsOpen(false);

    // 2. Disparar inmediatamente la acción sin retardo ni pérdida de gesto de usuario
    if (typeof actionFn === 'function') {
      actionFn();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99990] flex items-end sm:items-center justify-center p-3 sm:p-4 pointer-events-auto">
      {/* Backdrop para cerrar al tocar afuera */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity pointer-events-auto" 
        onClick={() => {
          if (typeof onClose === 'function') onClose();
          if (typeof setIsOpen === 'function') setIsOpen(false);
        }} 
        aria-hidden="true"
      />

      {/* Contenedor del Menú Centrado */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Accesos Directos"
        className="relative z-10 w-full max-w-sm mx-auto bg-white dark:bg-[#121622] rounded-3xl p-4 shadow-2xl border border-slate-200/80 dark:border-white/10 animate-slide-up pointer-events-auto mb-20 sm:mb-0 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Menú */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Accesos directos
            </span>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Rápido
            </span>
          </div>
          <button 
            type="button" 
            onClick={() => {
              if (typeof onClose === 'function') onClose();
              if (typeof setIsOpen === 'function') setIsOpen(false);
            }} 
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Opciones */}
        <div className="flex flex-col gap-2">
          {/* 1. Nuevo movimiento (Gasto o Ingreso) */}
          <button
            type="button"
            onClick={() => {
              handleSelectAction(() => {
                if (typeof onOpenTransaction === 'function') onOpenTransaction();
                else if (typeof onOpenNewTransaction === 'function') onOpenNewTransaction();
                else if (typeof onAddExpense === 'function') onAddExpense();
                else if (typeof openModal === 'function') openModal('transaction');
              });
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 hover:bg-slate-100/80 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 text-left transition-all cursor-pointer group pointer-events-auto"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-sm text-slate-900 dark:text-white block truncate">
                Nuevo movimiento
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                Registrar gasto o ingreso
              </span>
            </div>
          </button>

          {/* 3. Transferencia */}
          <button
            type="button"
            onClick={() => {
              handleSelectAction(() => {
                if (typeof onOpenTransfer === 'function') onOpenTransfer();
                else if (typeof openModal === 'function') openModal('transfer');
              });
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 hover:bg-slate-100/80 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 text-left transition-all cursor-pointer group pointer-events-auto"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-sm text-slate-900 dark:text-white block truncate">
                Transferencia
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                Mover dinero entre tus cuentas
              </span>
            </div>
          </button>

          {/* 4. Pago Recurrente */}
          <button
            type="button"
            onClick={() => {
              handleSelectAction(() => {
                if (typeof onOpenRecurring === 'function') onOpenRecurring();
                else if (typeof onOpenAddRecurring === 'function') onOpenAddRecurring();
                else if (typeof openModal === 'function') openModal('recurring');
                else if (typeof setActiveTab === 'function') setActiveTab('recurring');
              });
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 hover:bg-slate-100/80 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 text-left transition-all cursor-pointer group pointer-events-auto"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CalendarSync className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-sm text-slate-900 dark:text-white block truncate">
                Pago recurrente o suscripción
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                Arriendo, servicios o streaming
              </span>
            </div>
          </button>

          {/* 5. Préstamo o Deuda */}
          <button
            type="button"
            onClick={() => {
              handleSelectAction(() => {
                if (typeof onOpenLoan === 'function') onOpenLoan();
                else if (typeof onOpenAddLoan === 'function') onOpenAddLoan();
                else if (typeof openModal === 'function') openModal('debt');
                else if (typeof setActiveTab === 'function') setActiveTab('debts');
              });
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 hover:bg-slate-100/80 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 text-left transition-all cursor-pointer group pointer-events-auto"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <HandCoins className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-sm text-slate-900 dark:text-white block truncate">
                Préstamo o deuda
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                Dinero prestado o por pagar
              </span>
            </div>
          </button>

          {/* 6. Inversión */}
          <button
            type="button"
            onClick={() => {
              handleSelectAction(() => {
                if (typeof onOpenInvestment === 'function') onOpenInvestment();
                else if (typeof onOpenNewInvestment === 'function') onOpenNewInvestment();
                else if (typeof openModal === 'function') openModal('investment');
                else if (typeof setActiveTab === 'function') setActiveTab('investments');
              });
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 hover:bg-slate-100/80 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 text-left transition-all cursor-pointer group pointer-events-auto"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-sm text-slate-900 dark:text-white block truncate">
                Nueva inversión
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                CDT, acciones, cripto o crédito privado
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
