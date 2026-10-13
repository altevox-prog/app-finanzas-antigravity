import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, CheckCircle } from 'lucide-react';

export function SubmitBtn({ type, isSubmitting, fullWidth = false }) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className={`${fullWidth ? 'w-full' : 'flex-1 sm:flex-initial px-6'} h-11 rounded-lg font-medium text-sm transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 text-white cursor-pointer ${
        type === 'expense'
          ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
          : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
      } ${isSubmitting ? 'opacity-70 pointer-events-none' : ''}`}
    >
      <PlusCircle className="w-4 h-4" />
      <span>{isSubmitting ? 'Guardando...' : `Registrar ${type === 'expense' ? 'Gasto' : 'Ingreso'}`}</span>
    </button>
  );
}

export function SuccessAlert({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 rounded-xl shadow-sm"
        >
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span>¡Movimiento guardado exitosamente!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
