import { useState, useCallback } from 'react';
import { toast } from '../../../utils/toast';

/**
 * useInvestmentLiquidation
 * Custom hook para encapsular el estado y la lógica de liquidación
 * de certificados de depósito a término (CDT).
 *
 * @param {Object} params
 * @param {Array} params.accounts - Cuentas bancarias del usuario
 * @param {Function} params.onAddTransaction - Función para registrar la transacción contable de abono
 * @param {Function} params.onUpdateInvestment - Función para actualizar el estado del CDT a liquidado
 */
export default function useInvestmentLiquidation({
  accounts = [],
  onAddTransaction,
  onUpdateInvestment
} = {}) {
  // Estado para modal de Liquidación de CDT
  const [liquidatingCDT, setLiquidatingCDT] = useState(null);
  const [liquidationAccountId, setLiquidationAccountId] = useState('');
  const [liquidationDate, setLiquidationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSubmittingLiquidation, setIsSubmittingLiquidation] = useState(false);

  const handleOpenLiquidation = useCallback((inv, stats) => {
    setLiquidatingCDT({ inv, stats });
    const defaultAcc = (accounts || []).find(a => a.type !== 'card' && a.type !== 'credit') || accounts[0];
    setLiquidationAccountId(defaultAcc ? String(defaultAcc.id) : '');
    setLiquidationDate(new Date().toISOString().split('T')[0]);
  }, [accounts]);

  const handleCloseLiquidation = useCallback(() => {
    setLiquidatingCDT(null);
  }, []);

  const handleConfirmLiquidation = useCallback(() => {
    if (!liquidatingCDT) return;
    const { inv, stats } = liquidatingCDT;
    const selectedAccount = (accounts || []).find(a => String(a.id) === String(liquidationAccountId));
    
    if (!selectedAccount && accounts.length > 0) {
      toast.error('Por favor selecciona una cuenta bancaria de destino');
      return;
    }

    setIsSubmittingLiquidation(true);
    try {
      const maturityTotal = Number(stats?.maturityTotal || inv.investedAmount || 0);
      const netGain = Number(stats?.netReturn || 0);
      const invested = Number(inv.investedAmount || inv.buyPrice || 0);

      // 1. Crear transacción contable de ingreso para abonar saldo en la cuenta destino
      if (onAddTransaction) {
        const txDate = liquidationDate || new Date().toISOString().split('T')[0];
        const tx = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('tx-' + Date.now()),
          date: txDate,
          type: 'income',
          amount: maturityTotal,
          accountId: selectedAccount ? selectedAccount.id : null,
          accountName: selectedAccount ? selectedAccount.name : 'Cuenta Principal',
          category: 'Rendimientos / Inversiones',
          categoryId: 'cat-inversiones',
          note: `Liquidación CDT: ${inv.name} (Capital: $${Number(invested).toLocaleString('es-CO')} + Rendimiento neto: $${Number(netGain).toLocaleString('es-CO')})`
        };
        onAddTransaction(tx);
      }

      // 2. Actualizar estado de la inversión a 'liquidated' para archivarla
      if (onUpdateInvestment) {
        onUpdateInvestment({
          ...inv,
          status: 'liquidated',
          isLiquidated: true,
          liquidatedAt: liquidationDate || new Date().toISOString().split('T')[0],
          liquidatedAmount: maturityTotal,
          liquidatedAccountId: selectedAccount ? selectedAccount.id : null,
          currentAmount: 0
        });
      }

      // 3. Notificación Toast exitosa
      const formattedTotal = `$${Number(maturityTotal).toLocaleString('es-CO')}`;
      toast.success(`CDT liquidado exitosamente. Se abonaron ${formattedTotal} a tu cuenta.`);

      setLiquidatingCDT(null);
    } catch (err) {
      console.error('Error al liquidar CDT:', err);
      toast.error('Ocurrió un error al liquidar el CDT.');
    } finally {
      setIsSubmittingLiquidation(false);
    }
  }, [liquidatingCDT, accounts, liquidationAccountId, liquidationDate, onAddTransaction, onUpdateInvestment]);

  return {
    liquidatingCDT,
    liquidationAccountId,
    setLiquidationAccountId,
    liquidationDate,
    setLiquidationDate,
    isSubmittingLiquidation,
    handleOpenLiquidation,
    handleCloseLiquidation,
    handleConfirmLiquidation
  };
}
