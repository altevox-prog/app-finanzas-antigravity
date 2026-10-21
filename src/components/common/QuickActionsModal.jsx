import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, TrendingUp, CalendarSync, HandCoins, X } from 'lucide-react';

const resolve = (...fns) => fns.find((f) => typeof f === 'function');

export default function QuickActionsModal(props) {
  const { isOpen, onClose, setIsOpen } = props;

  const handleClose = () => {
    if (typeof onClose === 'function') onClose();
    if (typeof setIsOpen === 'function') setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, setIsOpen]);

  const handleSelectAction = (actionFn) => {
    if (typeof actionFn === 'function') actionFn();
    handleClose();
  };

  const ACTIONS = [
    {
      id: 'tx',
      title: 'Registrar transacción',
      desc: 'Gasto, ingreso o traspaso entre cuentas',
      icon: PlusCircle,
      iconColor: 'bg-emerald-500/10 text-emerald-500',
      action: () => resolve(
        props.openAddTransaction, props.handleOpenTransaction, props.modalControls?.openAddTransaction,
        props.onOpenTransaction, props.onOpenAddTransaction, props.financeActions?.openAddTransaction
      )?.('expense')
    },
    {
      id: 'recurring',
      title: 'Pago recurrente',
      desc: 'Arriendo, servicios o streaming',
      icon: CalendarSync,
      iconColor: 'bg-teal-500/10 text-teal-500',
      action: () => resolve(
        props.openAddRecurring, props.handleOpenRecurring, props.modalControls?.openAddRecurring,
        props.onOpenAddRecurring, props.onOpenRecurring, props.financeActions?.openAddRecurring
      )?.()
    },
    {
      id: 'debt',
      title: 'Préstamo o deuda',
      desc: 'Dinero prestado o por pagar',
      icon: HandCoins,
      iconColor: 'bg-amber-500/10 text-amber-500',
      action: () => resolve(
        props.openAddLoan, props.openAddDebt, props.handleOpenAddLoan, props.handleOpenAddDebt,
        props.modalControls?.openAddLoan, props.modalControls?.openAddDebt, props.onOpenAddDebt,
        props.onOpenAddLoan, props.financeActions?.openAddLoan, props.financeActions?.openAddDebt
      )?.('payable')
    },
    {
      id: 'investment',
      title: 'Nueva inversión',
      desc: 'CDT, acciones, cripto o crédito privado',
      icon: TrendingUp,
      iconColor: 'bg-indigo-500/10 text-indigo-500',
      action: () => resolve(
        props.openInvestment, props.openAddInvestment, props.handleOpenInvestment,
        props.modalControls?.openAddInvestment, props.modalControls?.openInvestment,
        props.onOpenInvestment, props.financeActions?.openAddInvestment, props.financeActions?.openInvestment
      )?.()
    }
  ];

  const modalContent = (
    <div className="fixed inset-0 z-[99990] flex items-end sm:items-center justify-center p-3 sm:p-4 pointer-events-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm pointer-events-auto"
        onClick={handleClose}
        aria-hidden="true"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Accesos directos"
        initial={{ opacity: 0, y: 50, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="relative z-50 w-full max-w-sm mx-auto bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-2xl border border-slate-200/80 dark:border-white/[0.08] pointer-events-auto mb-20 sm:mb-0 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
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
            onClick={handleClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {ACTIONS.map(({ id, title, desc, icon: Icon, iconColor, action }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleSelectAction(action)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 hover:bg-slate-100/80 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 text-left transition-all duration-150 ease-out active:scale-[0.97] active:brightness-95 hover:shadow-md cursor-pointer select-none group pointer-events-auto"
            >
              <div className={`w-10 h-10 rounded-xl ${iconColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-sm text-slate-900 dark:text-white block truncate">{title}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{desc}</span>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(<AnimatePresence>{isOpen && modalContent}</AnimatePresence>, document.body) : null;
}
