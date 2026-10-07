import { useState, useCallback } from 'react';

/**
 * useModalControls
 * Hook centralizado para gestionar la visibilidad y apertura/cierre de todos los modales:
 * - Transacciones (gasto / ingreso / transferencia)
 * - Préstamos y Deudas (por cobrar / por pagar)
 * - Inversiones y Recurrentes
 * - Perfil, Configuración, Calendario y Widgets
 * - Global Action Menu (+)
 */
export function useModalControls({ onOpenProfileCallback = null } = {}) {
  // Estados de visibilidad de modales
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [txDefaultType, setTxDefaultType] = useState('expense');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [addLoanInitialType, setAddLoanInitialType] = useState('receivable');
  const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
  const [isAddInvestmentOpen, setIsAddInvestmentOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [selectedCreditCardDetail, setSelectedCreditCardDetail] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [profileResetKey, setProfileResetKey] = useState(0);

  // Handlers de conveniencia
  const handleOpenTransaction = useCallback((type = 'expense') => {
    const safeType = type === 'income' ? 'income' : 'expense';
    setTxDefaultType(safeType);
    setIsAddTxOpen(true);
  }, []);

  const handleOpenAddLoan = useCallback((type = 'receivable') => {
    const norm = (type === 'payable' || type === 'borrowed' || type === 'debo') ? 'payable' : 'receivable';
    setAddLoanInitialType(norm);
    setIsAddLoanOpen(true);
  }, []);

  const handleOpenAddDebt = useCallback((type = 'payable') => {
    const norm = (type === 'receivable' || type === 'lent' || type === 'me_deben') ? 'receivable' : 'payable';
    setAddLoanInitialType(norm);
    setIsAddLoanOpen(true);
  }, []);

  const handleOpenTransfer = useCallback(() => {
    setIsTransferModalOpen(true);
  }, []);

  const handleOpenRecurring = useCallback(() => {
    setIsAddRecurringOpen(true);
  }, []);

  const handleOpenInvestment = useCallback(() => {
    setIsAddInvestmentOpen(true);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleOpenProfile = useCallback(() => {
    setIsActionMenuOpen(false);
    setIsAddTxOpen(false);
    setIsAddInvestmentOpen(false);
    setIsAddLoanOpen(false);
    setIsAddRecurringOpen(false);
    setIsCalendarOpen(false);
    setProfileResetKey((prev) => prev + 1);
    setIsSettingsOpen(true);
    if (onOpenProfileCallback) onOpenProfileCallback();
  }, [onOpenProfileCallback]);

  const handleCloseAllModals = useCallback(() => {
    setIsActionMenuOpen(false);
    setIsAddTxOpen(false);
    setIsTransferModalOpen(false);
    setIsAddLoanOpen(false);
    setIsAddRecurringOpen(false);
    setIsAddInvestmentOpen(false);
    setIsCalendarOpen(false);
    setIsSettingsOpen(false);
    setSelectedCreditCardDetail(null);
    setIsExportModalOpen(false);
    setIsGoalModalOpen(false);
  }, []);

  // Objeto agrupado para paso compacto a ModalContainer
  const modalFlags = {
    isAddTxOpen,
    setIsAddTxOpen,
    txDefaultType,
    setTxDefaultType,
    isTransferModalOpen,
    setIsTransferModalOpen,
    isAddInvestmentOpen,
    setIsAddInvestmentOpen,
    isNewInvestmentModalOpen: isAddInvestmentOpen,
    setIsNewInvestmentModalOpen: setIsAddInvestmentOpen,
    isAddLoanOpen,
    setIsAddLoanOpen,
    addLoanInitialType,
    setAddLoanInitialType,
    isAddRecurringOpen,
    setIsAddRecurringOpen,
    isCalendarOpen,
    setIsCalendarOpen,
    selectedCreditCardDetail,
    setSelectedCreditCardDetail,
    isSettingsOpen,
    setIsSettingsOpen,
    isProfileOpen: isSettingsOpen,
    setIsProfileOpen: setIsSettingsOpen,
    profileResetKey,
    setProfileResetKey,
    isExportModalOpen,
    setIsExportModalOpen,
    isGoalModalOpen,
    setIsGoalModalOpen
  };

  return {
    isAddTxOpen,
    setIsAddTxOpen,
    isAddTransactionOpen: isAddTxOpen,
    setIsAddTransactionOpen: setIsAddTxOpen,
    isNewTxModalOpen: isAddTxOpen,
    setIsNewTxModalOpen: setIsAddTxOpen,
    txDefaultType,
    setTxDefaultType,
    isTransferModalOpen,
    setIsTransferModalOpen,
    isAddLoanOpen,
    setIsAddLoanOpen,
    addLoanInitialType,
    setAddLoanInitialType,
    isNewDebtModalOpen: isAddLoanOpen,
    setIsNewDebtModalOpen: setIsAddLoanOpen,
    isAddRecurringOpen,
    setIsAddRecurringOpen,
    isNewRecurringModalOpen: isAddRecurringOpen,
    setIsNewRecurringModalOpen: setIsAddRecurringOpen,
    isAddInvestmentOpen,
    setIsAddInvestmentOpen,
    isNewInvestmentModalOpen: isAddInvestmentOpen,
    setIsNewInvestmentModalOpen: setIsAddInvestmentOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isProfileOpen: isSettingsOpen,
    setIsProfileOpen: setIsSettingsOpen,
    isCalendarOpen,
    setIsCalendarOpen,
    isActionMenuOpen,
    setIsActionMenuOpen,
    selectedCreditCardDetail,
    setSelectedCreditCardDetail,
    isExportModalOpen,
    setIsExportModalOpen,
    isGoalModalOpen,
    setIsGoalModalOpen,
    profileResetKey,
    setProfileResetKey,
    // Handlers
    handleOpenTransaction,
    handleOpenAddLoan,
    handleOpenAddDebt,
    handleOpenTransfer,
    handleOpenRecurring,
    handleOpenInvestment,
    handleOpenSettings,
    handleOpenProfile,
    handleCloseAllModals,
    modalFlags
  };
}

export default useModalControls;
