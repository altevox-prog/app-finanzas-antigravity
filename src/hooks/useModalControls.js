import { useState, useCallback } from 'react';

/**
 * useModalControls: Hook centralizado para gestionar la visibilidad y apertura/cierre de los modales de la aplicación.
 */
export function useModalControls({ onOpenProfileCallback = null } = {}) {
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [txDefaultType, setTxDefaultType] = useState('expense');
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

  const normalizeTxType = (val) => (val === 'income' || val === 'ingreso') ? 'income' : (val === 'transfer' || val === 'transferencia') ? 'transfer' : 'expense';
  const normalizeLoanType = (val) => (val === 'payable' || val === 'borrowed' || val === 'debo' || val === 'debt') ? 'payable' : 'receivable';

  const setIsAddTransactionOpen = useCallback((val) => {
    if (typeof val === 'string') {
      setTxDefaultType(normalizeTxType(val));
      setIsAddTxOpen(true);
    } else {
      setIsAddTxOpen(Boolean(val));
    }
  }, []);

  const setIsAddLoanOpenAlias = useCallback((val) => {
    if (typeof val === 'string') {
      setAddLoanInitialType(normalizeLoanType(val));
      setIsAddLoanOpen(true);
    } else {
      setIsAddLoanOpen(Boolean(val));
    }
  }, []);

  const openAddTransaction = useCallback((type = 'expense') => {
    setTxDefaultType(normalizeTxType(type));
    setIsAddTxOpen(true);
  }, []);

  const openAddLoan = useCallback((type = 'payable') => {
    setAddLoanInitialType(typeof type === 'string' && (type === 'receivable' || type === 'lent' || type === 'me_deben' || type === 'loan') ? 'receivable' : 'payable');
    setIsAddLoanOpen(true);
  }, []);

  const openAddDebt = openAddLoan;
  const handleOpenTransfer = useCallback(() => openAddTransaction('transfer'), [openAddTransaction]);
  const handleOpenRecurring = useCallback(() => setIsAddRecurringOpen(true), []);
  const handleOpenInvestment = useCallback(() => setIsAddInvestmentOpen(true), []);

  const handleCloseTransaction = useCallback(() => setIsAddTxOpen(false), []);
  const handleCloseLoan = useCallback(() => setIsAddLoanOpen(false), []);
  const handleCloseRecurring = useCallback(() => setIsAddRecurringOpen(false), []);
  const handleCloseInvestment = useCallback(() => setIsAddInvestmentOpen(false), []);
  const handleOpenSettings = useCallback(() => setIsSettingsOpen(true), []);

  const handleOpenProfile = useCallback(() => {
    setIsActionMenuOpen(false);
    setIsAddTxOpen(false);
    setIsAddInvestmentOpen(false);
    setIsAddLoanOpen(false);
    setIsAddRecurringOpen(false);
    setIsCalendarOpen(false);
    setProfileResetKey((prev) => prev + 1);
    setIsSettingsOpen(true);
    onOpenProfileCallback?.();
  }, [onOpenProfileCallback]);

  const handleCloseAllModals = useCallback(() => {
    setIsActionMenuOpen(false);
    setIsAddTxOpen(false);
    setIsAddLoanOpen(false);
    setIsAddRecurringOpen(false);
    setIsAddInvestmentOpen(false);
    setIsCalendarOpen(false);
    setIsSettingsOpen(false);
    setSelectedCreditCardDetail(null);
    setIsExportModalOpen(false);
    setIsGoalModalOpen(false);
  }, []);

  const modalFlags = {
    isAddTxOpen, setIsAddTxOpen, isTxOpen: isAddTxOpen, setIsTxOpen: setIsAddTransactionOpen,
    isAddTransactionOpen: isAddTxOpen, setIsAddTransactionOpen, isTransactionModalOpen: isAddTxOpen,
    setIsTransactionModalOpen: setIsAddTransactionOpen, isNewTxModalOpen: isAddTxOpen,
    setIsNewTxModalOpen: setIsAddTransactionOpen, txDefaultType, setTxDefaultType, setTransactionType: setTxDefaultType,

    isAddLoanOpen, setIsAddLoanOpen, isLoanOpen: isAddLoanOpen, setIsLoanOpen: setIsAddLoanOpenAlias,
    isDebtModalOpen: isAddLoanOpen, setIsDebtModalOpen: setIsAddLoanOpenAlias, isAddDebtOpen: isAddLoanOpen,
    setIsAddDebtOpen: setIsAddLoanOpenAlias, isNewDebtModalOpen: isAddLoanOpen, setIsNewDebtModalOpen: setIsAddLoanOpenAlias,
    addLoanInitialType, setAddLoanInitialType, setLoanType: setAddLoanInitialType,

    isAddRecurringOpen, setIsAddRecurringOpen, isRecurringOpen: isAddRecurringOpen, setIsRecurringOpen: setIsAddRecurringOpen,
    isRecurringModalOpen: isAddRecurringOpen, setIsRecurringModalOpen: setIsAddRecurringOpen, isNewRecurringModalOpen: isAddRecurringOpen,
    setIsNewRecurringModalOpen: setIsAddRecurringOpen,

    isAddInvestmentOpen, setIsAddInvestmentOpen, isInvestmentOpen: isAddInvestmentOpen, setIsInvestmentOpen: setIsAddInvestmentOpen,
    isNewInvestmentModalOpen: isAddInvestmentOpen, setIsNewInvestmentModalOpen: setIsAddInvestmentOpen,

    isCalendarOpen, setIsCalendarOpen, selectedCreditCardDetail, setSelectedCreditCardDetail,
    isSettingsOpen, setIsSettingsOpen, isProfileOpen: isSettingsOpen, setIsProfileOpen: setIsSettingsOpen,
    profileResetKey, setProfileResetKey, isExportModalOpen, setIsExportModalOpen, isGoalModalOpen, setIsGoalModalOpen,

    openAddTransaction, openTransactionModal: openAddTransaction, handleOpenTransaction: openAddTransaction, handleOpenAddTransaction: openAddTransaction,
    openAddLoan, openAddDebt, openLoanModal: openAddLoan, openDebtModal: openAddDebt, handleOpenAddLoan: openAddLoan, handleOpenAddDebt: openAddDebt,
    openTransfer: handleOpenTransfer, handleOpenTransfer, openAddRecurring: handleOpenRecurring, handleOpenRecurring,
    openInvestment: handleOpenInvestment, openAddInvestment: handleOpenInvestment, handleOpenInvestment
  };

  return {
    ...modalFlags,
    isActionMenuOpen,
    setIsActionMenuOpen,
    handleCloseTransaction,
    closeAddTransaction: handleCloseTransaction,
    closeTx: handleCloseTransaction,
    closeTransactionModal: handleCloseTransaction,
    handleCloseAddTransaction: handleCloseTransaction,
    handleCloseLoan,
    closeAddLoan: handleCloseLoan,
    closeLoan: handleCloseLoan,
    closeAddDebt: handleCloseLoan,
    closeDebtModal: handleCloseLoan,
    handleCloseAddLoan: handleCloseLoan,
    handleCloseAddDebt: handleCloseLoan,
    closeTransfer: handleCloseTransaction,
    closeTransferModal: handleCloseTransaction,
    handleCloseRecurring,
    closeAddRecurring: handleCloseRecurring,
    closeRecurring: handleCloseRecurring,
    closeRecurringModal: handleCloseRecurring,
    handleOpenAddRecurring: handleOpenRecurring,
    handleCloseAddRecurring: handleCloseRecurring,
    handleOpenAddInvestment: handleOpenInvestment,
    handleCloseInvestment,
    closeInvestment: handleCloseInvestment,
    closeInvestmentModal: handleCloseInvestment,
    handleOpenSettings,
    handleOpenProfile,
    openProfileModal: handleOpenProfile,
    openSettingsModal: handleOpenSettings,
    handleCloseAllModals,
    modalFlags
  };
}

export default useModalControls;
