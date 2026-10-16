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

  // Setters defensivos y robustos
  const setIsAddTransactionOpen = useCallback((val) => {
    if (typeof val === 'string') {
      let safeType = 'expense';
      if (val === 'income' || val === 'ingreso') safeType = 'income';
      else if (val === 'transfer' || val === 'transferencia') safeType = 'transfer';
      setTxDefaultType(safeType);
      setIsAddTxOpen(true);
    } else {
      setIsAddTxOpen(Boolean(val));
    }
  }, []);

  const setIsTxOpen = setIsAddTransactionOpen;
  const setIsTransactionModalOpen = setIsAddTransactionOpen;
  const setIsNewTxModalOpen = setIsAddTransactionOpen;

  const setIsAddLoanOpenAlias = useCallback((val) => {
    if (typeof val === 'string') {
      const norm = (val === 'payable' || val === 'borrowed' || val === 'debo' || val === 'debt') ? 'payable' : 'receivable';
      setAddLoanInitialType(norm);
      setIsAddLoanOpen(true);
    } else {
      setIsAddLoanOpen(Boolean(val));
    }
  }, []);

  const setIsLoanOpen = setIsAddLoanOpenAlias;
  const setIsAddDebtOpen = setIsAddLoanOpenAlias;
  const setIsDebtModalOpen = setIsAddLoanOpenAlias;
  const setIsNewDebtModalOpen = setIsAddLoanOpenAlias;

  // Handlers de apertura obligatoria (con o sin argumento)
  const openAddTransaction = useCallback((type = 'expense') => {
    let safeType = 'expense';
    if (typeof type === 'string') {
      if (type === 'income' || type === 'ingreso') safeType = 'income';
      else if (type === 'transfer' || type === 'transferencia') safeType = 'transfer';
    }
    setTxDefaultType(safeType);
    setIsAddTxOpen(true);
  }, []);

  const openTransactionModal = openAddTransaction;
  const handleOpenTransaction = openAddTransaction;
  const handleOpenAddTransaction = openAddTransaction;

  const openAddLoan = useCallback((type = 'payable') => {
    const norm = (typeof type === 'string' && (type === 'receivable' || type === 'lent' || type === 'me_deben' || type === 'loan')) ? 'receivable' : 'payable';
    setAddLoanInitialType(norm);
    setIsAddLoanOpen(true);
  }, []);

  const openAddDebt = useCallback((type = 'payable') => {
    const norm = (typeof type === 'string' && (type === 'receivable' || type === 'lent' || type === 'me_deben' || type === 'loan')) ? 'receivable' : 'payable';
    setAddLoanInitialType(norm);
    setIsAddLoanOpen(true);
  }, []);

  const openLoanModal = openAddLoan;
  const openDebtModal = openAddDebt;
  const handleOpenAddLoan = openAddLoan;
  const handleOpenAddDebt = openAddDebt;

  const handleOpenTransfer = useCallback(() => {
    openAddTransaction('transfer');
  }, [openAddTransaction]);

  const openTransfer = handleOpenTransfer;

  const handleOpenRecurring = useCallback(() => {
    setIsAddRecurringOpen(true);
  }, []);

  const openAddRecurring = handleOpenRecurring;

  const handleOpenInvestment = useCallback(() => {
    setIsAddInvestmentOpen(true);
  }, []);

  const openInvestment = handleOpenInvestment;
  const openAddInvestment = handleOpenInvestment;
  const handleOpenAddInvestment = handleOpenInvestment;

  // Handlers de cierre convenientes
  const handleCloseTransaction = useCallback(() => {
    setIsAddTxOpen(false);
  }, []);

  const handleCloseLoan = useCallback(() => {
    setIsAddLoanOpen(false);
  }, []);

  const handleCloseRecurring = useCallback(() => {
    setIsAddRecurringOpen(false);
  }, []);

  const handleCloseTransfer = useCallback(() => {
    setIsTransferModalOpen(false);
  }, []);

  const handleCloseInvestment = useCallback(() => {
    setIsAddInvestmentOpen(false);
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
    isTxOpen: isAddTxOpen,
    setIsTxOpen,
    isAddTransactionOpen: isAddTxOpen,
    setIsAddTransactionOpen,
    isTransactionModalOpen: isAddTxOpen,
    setIsTransactionModalOpen,
    isNewTxModalOpen: isAddTxOpen,
    setIsNewTxModalOpen,
    txDefaultType,
    setTxDefaultType,
    setTransactionType: setTxDefaultType,

    isTransferOpen: isTransferModalOpen,
    setIsTransferOpen: setIsTransferModalOpen,
    isTransferModalOpen,
    setIsTransferModalOpen,

    isAddLoanOpen,
    setIsAddLoanOpen,
    isLoanOpen: isAddLoanOpen,
    setIsLoanOpen,
    isDebtModalOpen: isAddLoanOpen,
    setIsDebtModalOpen,
    isAddDebtOpen: isAddLoanOpen,
    setIsAddDebtOpen,
    isNewDebtModalOpen: isAddLoanOpen,
    setIsNewDebtModalOpen,
    addLoanInitialType,
    setAddLoanInitialType,
    setLoanType: setAddLoanInitialType,

    isAddRecurringOpen,
    setIsAddRecurringOpen,
    isRecurringOpen: isAddRecurringOpen,
    setIsRecurringOpen: setIsAddRecurringOpen,
    isRecurringModalOpen: isAddRecurringOpen,
    setIsRecurringModalOpen: setIsAddRecurringOpen,
    isNewRecurringModalOpen: isAddRecurringOpen,
    setIsNewRecurringModalOpen: setIsAddRecurringOpen,

    isAddInvestmentOpen,
    setIsAddInvestmentOpen,
    isInvestmentOpen: isAddInvestmentOpen,
    setIsInvestmentOpen: setIsAddInvestmentOpen,
    isNewInvestmentModalOpen: isAddInvestmentOpen,
    setIsNewInvestmentModalOpen: setIsAddInvestmentOpen,

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
    setIsGoalModalOpen,

    // Handlers incluidos en modalFlags
    openAddTransaction,
    openTransactionModal,
    handleOpenTransaction,
    handleOpenAddTransaction,
    openAddLoan,
    openAddDebt,
    openLoanModal,
    openDebtModal,
    handleOpenAddLoan,
    handleOpenAddDebt,
    openTransfer,
    handleOpenTransfer,
    openAddRecurring,
    handleOpenRecurring,
    openInvestment,
    handleOpenInvestment
  };

  return {
    // Flags
    isAddTxOpen,
    setIsAddTxOpen,
    isTxOpen: isAddTxOpen,
    setIsTxOpen,
    isAddTransactionOpen: isAddTxOpen,
    setIsAddTransactionOpen,
    isTransactionModalOpen: isAddTxOpen,
    setIsTransactionModalOpen,
    isNewTxModalOpen: isAddTxOpen,
    setIsNewTxModalOpen,
    txDefaultType,
    setTxDefaultType,
    setTransactionType: setTxDefaultType,

    isTransferOpen: isTransferModalOpen,
    setIsTransferOpen: setIsTransferModalOpen,
    isTransferModalOpen,
    setIsTransferModalOpen,

    isAddLoanOpen,
    setIsAddLoanOpen,
    isLoanOpen: isAddLoanOpen,
    setIsLoanOpen,
    isDebtModalOpen: isAddLoanOpen,
    setIsDebtModalOpen,
    isAddDebtOpen: isAddLoanOpen,
    setIsAddDebtOpen,
    addLoanInitialType,
    setAddLoanInitialType,
    setLoanType: setAddLoanInitialType,
    isNewDebtModalOpen: isAddLoanOpen,
    setIsNewDebtModalOpen,

    isAddRecurringOpen,
    setIsAddRecurringOpen,
    isRecurringOpen: isAddRecurringOpen,
    setIsRecurringOpen: setIsAddRecurringOpen,
    isRecurringModalOpen: isAddRecurringOpen,
    setIsRecurringModalOpen: setIsAddRecurringOpen,
    isNewRecurringModalOpen: isAddRecurringOpen,
    setIsNewRecurringModalOpen: setIsAddRecurringOpen,

    isAddInvestmentOpen,
    setIsAddInvestmentOpen,
    isInvestmentOpen: isAddInvestmentOpen,
    setIsInvestmentOpen: setIsAddInvestmentOpen,
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
    openAddTransaction,
    openTransactionModal,
    handleOpenTransaction,
    handleOpenAddTransaction,
    handleCloseTransaction,
    closeAddTransaction: handleCloseTransaction,
    closeTx: handleCloseTransaction,
    closeTransactionModal: handleCloseTransaction,
    handleCloseAddTransaction: handleCloseTransaction,

    openAddLoan,
    openAddDebt,
    openLoanModal,
    openDebtModal,
    handleOpenAddLoan,
    handleOpenAddDebt,
    handleCloseLoan,
    closeAddLoan: handleCloseLoan,
    closeLoan: handleCloseLoan,
    closeAddDebt: handleCloseLoan,
    closeDebtModal: handleCloseLoan,
    handleCloseAddLoan: handleCloseLoan,
    handleCloseAddDebt: handleCloseLoan,

    openTransfer,
    handleOpenTransfer,
    handleCloseTransfer,
    closeTransfer: handleCloseTransfer,
    closeTransferModal: handleCloseTransfer,

    openAddRecurring,
    handleOpenRecurring,
    handleCloseRecurring,
    closeAddRecurring: handleCloseRecurring,
    closeRecurring: handleCloseRecurring,
    closeRecurringModal: handleCloseRecurring,
    handleOpenAddRecurring: handleOpenRecurring,
    handleCloseAddRecurring: handleCloseRecurring,

    openInvestment,
    openAddInvestment,
    handleOpenInvestment,
    handleOpenAddInvestment,
    handleCloseInvestment,
    closeInvestment: handleCloseInvestment,
    closeInvestmentModal: handleCloseInvestment,

    handleOpenSettings,
    handleOpenProfile,
    handleCloseAllModals,
    modalFlags
  };
}

export default useModalControls;
