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

      // 1. Crear transacciones contables respetando la separación de capital y rendimiento
      if (onAddTransaction) {
        const txDate = liquidationDate || new Date().toISOString().split('T')[0];

        if (invested > 0 && netGain > 0) {
          // Retorno de Capital: afecta balance sin inflar ingresos operativos
          const txCapital = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('tx-cap-' + Date.now()),
            date: txDate,
            type: 'income',
            amount: invested,
            accountId: selectedAccount ? selectedAccount.id : null,
            accountName: selectedAccount ? selectedAccount.name : 'Cuenta Principal',
            category: 'Retorno de Capital / Inversiones',
            categoryId: 'cat-inversiones',
            subcategoryId: 'sub-retorno-capital',
            isCapitalReturn: true,
            isTransfer: true, // Asegura exclusión de ingresos operativos en motores que ignoran banderas custom
            note: `Liquidación Capital: ${inv.name}`
          };
          onAddTransaction(txCapital);

          // Rendimiento Neto Ganado: ingreso operativo genuino
          const txYield = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('tx-yield-' + (Date.now() + 1)),
            date: txDate,
            type: 'income',
            amount: netGain,
            accountId: selectedAccount ? selectedAccount.id : null,
            accountName: selectedAccount ? selectedAccount.name : 'Cuenta Principal',
            category: 'Rendimientos / Inversiones',
            categoryId: 'cat-inversiones',
            subcategoryId: 'sub-rendimiento-inversion',
            isInvestmentYield: true,
            note: `Rendimiento Neto CDT: ${inv.name}`
          };
          onAddTransaction(txYield);
        } else {
          // Si netGain <= 0 y no hay rendimiento, solo se emite txCapital con maturityTotal
          const capitalAmount = maturityTotal > 0 ? maturityTotal : (invested > 0 ? invested : 0);
          const txCapital = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('tx-cap-' + Date.now()),
            date: txDate,
            type: 'income',
            amount: capitalAmount,
            accountId: selectedAccount ? selectedAccount.id : null,
            accountName: selectedAccount ? selectedAccount.name : 'Cuenta Principal',
            category: 'Retorno de Capital / Inversiones',
            categoryId: 'cat-inversiones',
            subcategoryId: 'sub-retorno-capital',
            isCapitalReturn: true,
            isTransfer: true,
            note: `Liquidación Capital: ${inv.name}`
          };
          onAddTransaction(txCapital);
        }
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
