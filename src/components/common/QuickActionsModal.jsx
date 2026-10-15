import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpDown, 
  ArrowLeftRight, 
  TrendingUp, 
  CalendarSync, 
  HandCoins,
  X 
} from 'lucide-react';

export default function QuickActionsModal(props) {
  const {
    isOpen,
    onClose,
    setIsOpen,
    onAddExpense,
    onAddIncome,
    openAddTransaction,
    handleOpenTransaction,
    onOpenTransaction,
    onOpenNewTransaction,
    openTransfer,
    handleOpenTransfer,
    onOpenTransfer,
    openAddLoan,
    openAddDebt,
    handleOpenAddLoan,
    handleOpenAddDebt,
    onOpenLoan,
    onOpenAddLoan,
    onOpenDebt,
    onOpenAddDebt,
    onAddDebtOrLoan,
    openAddRecurring,
    handleOpenRecurring,
    onOpenRecurring,
    onOpenAddRecurring,
    openInvestment,
    openAddInvestment,
    handleOpenInvestment,
    onOpenInvestment,
    onOpenNewInvestment,
    setIsAddTransactionModalOpen,
    financeActions,
    modalControls = financeActions,
    openModal,
    setActiveTab
  } = props;
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

  const handleSelectAction = (actionFn) => {
    if (typeof actionFn === 'function') {
      actionFn();
    }
    if (typeof onClose === 'function') {
      onClose();
    }
    if (typeof setIsOpen === 'function') {
      setIsOpen(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99990] flex items-end sm:items-center justify-center p-3 sm:p-4 pointer-events-auto">
      {/* Backdrop para cerrar al tocar afuera con desvanecimiento */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm pointer-events-auto" 
        onClick={() => {
          if (typeof onClose === 'function') onClose();
          if (typeof setIsOpen === 'function') setIsOpen(false);
        }} 
        aria-hidden="true"
      />

      {/* Contenedor del Menú con animación tipo Bottom Sheet */}
      <motion.div 
        role="dialog"
        aria-modal="true"
        aria-label="Accesos Directos"
        initial={{ opacity: 0, y: 50, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="relative z-50 w-full max-w-sm mx-auto bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-2xl border border-slate-200/80 dark:border-white/[0.08] pointer-events-auto mb-20 sm:mb-0 max-h-[85vh] overflow-y-auto"
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
            onClick={(e) => {
              handleSelectAction(() => {
                if (typeof openAddTransaction === 'function') {
                  openAddTransaction('expense');
                } else if (typeof handleOpenTransaction === 'function') {
                  handleOpenTransaction('expense');
                } else if (modalControls && typeof modalControls.openAddTransaction === 'function') {
                  modalControls.openAddTransaction('expense');
                } else if (typeof onOpenTransaction === 'function') {
                  onOpenTransaction('expense');
                } else if (typeof onOpenAddTransaction === 'function') {
                  onOpenAddTransaction('expense');
                } else if (financeActions && typeof financeActions.openAddTransaction === 'function') {
                  financeActions.openAddTransaction('expense');
                }
              });
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 hover:bg-slate-100/80 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 text-left transition-all duration-150 ease-out active:scale-[0.97] active:brightness-95 hover:shadow-md cursor-pointer select-none group pointer-events-auto"
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

          {/* 2. Transferencia */}
          <button
            type="button"
            onClick={() => {
              handleSelectAction(() => {
                if (typeof openTransfer === 'function') {
                  openTransfer();
                } else if (typeof handleOpenTransfer === 'function') {
                  handleOpenTransfer();
                } else if (modalControls && typeof modalControls.openTransfer === 'function') {
                  modalControls.openTransfer();
                } else if (typeof onOpenTransfer === 'function') {
                  onOpenTransfer();
                } else if (financeActions && typeof financeActions.openTransfer === 'function') {
                  financeActions.openTransfer();
                }
              });
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 hover:bg-slate-100/80 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 text-left transition-all duration-150 ease-out active:scale-[0.97] active:brightness-95 hover:shadow-md cursor-pointer select-none group pointer-events-auto"
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

          {/* 3. Pago Recurrente */}
          <button
            type="button"
            onClick={() => {
              handleSelectAction(() => {
                if (typeof openAddRecurring === 'function') {
                  openAddRecurring();
                } else if (typeof handleOpenRecurring === 'function') {
                  handleOpenRecurring();
                } else if (modalControls && typeof modalControls.openAddRecurring === 'function') {
                  modalControls.openAddRecurring();
                } else if (typeof onOpenAddRecurring === 'function') {
                  onOpenAddRecurring();
                } else if (typeof onOpenRecurring === 'function') {
                  onOpenRecurring();
                } else if (financeActions && typeof financeActions.openAddRecurring === 'function') {
                  financeActions.openAddRecurring();
                }
              });
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 hover:bg-slate-100/80 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 text-left transition-all duration-150 ease-out active:scale-[0.97] active:brightness-95 hover:shadow-md cursor-pointer select-none group pointer-events-auto"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CalendarSync className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-sm text-slate-900 dark:text-white block truncate">
                Pago recurrente
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                Arriendo, servicios o streaming
              </span>
            </div>
          </button>

          {/* 4. Préstamo o Deuda */}
          <button
            type="button"
            onClick={(e) => {
              handleSelectAction(() => {
                if (typeof openAddLoan === 'function') {
                  openAddLoan('payable');
                } else if (typeof openAddDebt === 'function') {
                  openAddDebt('payable');
                } else if (typeof handleOpenAddLoan === 'function') {
                  handleOpenAddLoan('payable');
                } else if (typeof handleOpenAddDebt === 'function') {
                  handleOpenAddDebt('payable');
                } else if (modalControls && typeof modalControls.openAddLoan === 'function') {
                  modalControls.openAddLoan('payable');
                } else if (modalControls && typeof modalControls.openAddDebt === 'function') {
                  modalControls.openAddDebt('payable');
                } else if (typeof onOpenAddDebt === 'function') {
                  onOpenAddDebt('payable');
                } else if (typeof onOpenAddLoan === 'function') {
                  onOpenAddLoan('payable');
                } else if (financeActions && typeof financeActions.openAddLoan === 'function') {
                  financeActions.openAddLoan('payable');
                } else if (financeActions && typeof financeActions.openAddDebt === 'function') {
                  financeActions.openAddDebt('payable');
                }
              });
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 hover:bg-slate-100/80 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 text-left transition-all duration-150 ease-out active:scale-[0.97] active:brightness-95 hover:shadow-md cursor-pointer select-none group pointer-events-auto"
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

          {/* 5. Inversión */}
          <button
            type="button"
            onClick={(e) => {
              handleSelectAction(() => {
                if (typeof openInvestment === 'function') {
                  openInvestment();
                } else if (typeof openAddInvestment === 'function') {
                  openAddInvestment();
                } else if (typeof handleOpenInvestment === 'function') {
                  handleOpenInvestment();
                } else if (modalControls && typeof modalControls.openAddInvestment === 'function') {
                  modalControls.openAddInvestment();
                } else if (modalControls && typeof modalControls.openInvestment === 'function') {
                  modalControls.openInvestment();
                } else if (typeof onOpenInvestment === 'function') {
                  onOpenInvestment();
                } else if (financeActions && typeof financeActions.openAddInvestment === 'function') {
                  financeActions.openAddInvestment();
                } else if (financeActions && typeof financeActions.openInvestment === 'function') {
                  financeActions.openInvestment();
                }
              });
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 hover:bg-slate-100/80 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 text-left transition-all duration-150 ease-out active:scale-[0.97] active:brightness-95 hover:shadow-md cursor-pointer select-none group pointer-events-auto"
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
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(<AnimatePresence>{isOpen && modalContent}</AnimatePresence>, document.body) : null;
}
