import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  HandCoins, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Sparkles,
  CheckCircle2,
  Calendar,
  Percent,
  ShieldCheck,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { usePrivacy } from '../context/PrivacyContext';
import DebtFormModal from './DebtFormModal';
import DebtModal from './DebtModal';
import DebtReceiptModal from './DebtReceiptModal';
import DebtCard from './DebtCard';
import AddDebtPaymentModal from './AddDebtPaymentModal';
import AddDisbursementModal from './AddDisbursementModal';
import { calculateElapsedMonths } from '../utils/debtAlerts';
import { toSafeNumber, calculateDebtStats } from '../utils/financeMath';
import SegmentedControl from './common/SegmentedControl';

export default function LoansAndDebts({
  debtsAndLoans,
  accounts = [],
  onAddDebtOrLoan,
  onUpdateDebtOrLoan,
  onAddPayment,
  onAddDisbursement,
  onDeletePayment,
  onDeleteDebtOrLoan,
  onOpenAddDebt,
  onOpenAddLoan,
  setIsAddLoanOpen,
  modalControls,
  initialTab = 'receivable'
}) {
  const { formatMoney } = usePrivacy();
  const formatCurrency = formatMoney;
  const [activeTab, setActiveTab] = useState(initialTab); // 'receivable' | 'payable'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDebtItem, setEditingDebtItem] = useState(null);
  const [selectedItemForReceipt, setSelectedItemForReceipt] = useState(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleOpenCreateModal = () => {
    const targetType = (activeTab === 'payable' || activeTab === 'borrowed' || activeTab === 'debo') 
      ? 'payable' 
      : 'receivable';

    if (modalControls) {
      if (targetType === 'payable') {
        if (typeof modalControls.openAddDebt === 'function') {
          modalControls.openAddDebt('payable');
          return;
        } else if (typeof modalControls.openAddLoan === 'function') {
          modalControls.openAddLoan('payable');
          return;
        }
      } else {
        if (typeof modalControls.openAddLoan === 'function') {
          modalControls.openAddLoan('receivable');
          return;
        } else if (typeof modalControls.openAddDebt === 'function') {
          modalControls.openAddDebt('receivable');
          return;
        }
      }
    }

    if (activeTab === 'payable') {
      if (onOpenAddDebt) {
        onOpenAddDebt(targetType);
      } else if (onOpenAddLoan) {
        onOpenAddLoan(targetType);
      } else if (setIsAddLoanOpen) {
        setIsAddLoanOpen(targetType);
      } else {
        setIsCreateModalOpen(true);
      }
    } else {
      if (onOpenAddLoan) {
        onOpenAddLoan(targetType);
      } else if (onOpenAddDebt) {
        onOpenAddDebt(targetType);
      } else if (setIsAddLoanOpen) {
        setIsAddLoanOpen(targetType);
      } else {
        setIsCreateModalOpen(true);
      }
    }
  };

  // Payment Modal State
  const [selectedItemForPayment, setSelectedItemForPayment] = useState(null);
  // Disbursement Modal State
  const [selectedItemForDisbursement, setSelectedItemForDisbursement] = useState(null);

  const safeLoans = Array.isArray(debtsAndLoans) ? debtsAndLoans : [];
  const filteredItems = safeLoans.filter(item => item.type === activeTab);

  const calculateItemStats = (item) => {
    const base = toSafeNumber(
      item.total_amount ?? 
      item.totalAmount ?? 
      item.amount ?? 
      item.principalAmount ?? 
      item.remaining_amount ?? 
      item.remainingAmount ?? 0
    );
    const rate = toSafeNumber(item.interestRate);
    const insurance = toSafeNumber(item.insuranceFee);

    // Calcular meses transcurridos en tiempo real según fecha de desembolso
    const monthsElapsed = item.startDate 
      ? calculateElapsedMonths(item.startDate) 
      : (toSafeNumber(item.monthsElapsed) || 0);

    // Liquidación automática de intereses retroactivos según meses transcurridos
    const accruedInterest = (monthsElapsed > 0 && rate > 0)
      ? Math.round(base * (rate / 100) * monthsElapsed)
      : (item.accruedInterest !== undefined ? toSafeNumber(item.accruedInterest) : Math.round(base * (rate / 100)));

    const interestAmount = accruedInterest > 0 ? accruedInterest : Math.round(base * (rate / 100));
    const totalToPay = base + interestAmount + insurance;

    const payments = Array.isArray(item.payments) ? item.payments : [];
    const stats = calculateDebtStats(base, payments, { accruedInterest });

    const totalCapitalPaid = stats.totalCapitalPaid;
    const totalInterestPaid = stats.totalInterestPaid;
    const totalPaid = stats.totalPaid;
    const remainingCapital = stats.remainingCapital;
    const remainingInterest = stats.remainingInterest;
    const totalRemaining = remainingCapital + remainingInterest;
    const outstandingBalance = stats.outstandingBalance;
    const isPaid = stats.isPaid;

    const totalInstallments = Math.max(1, toSafeNumber(item.installments) || 1);
    const suggestedInstallment = totalToPay / totalInstallments;
    const progressPercent = (base + accruedInterest) > 0 
      ? Math.min(100, Math.max(0, Math.round((totalPaid / (base + accruedInterest)) * 100))) 
      : (base > 0 ? Math.min(100, Math.max(0, Math.round((totalCapitalPaid / base) * 100))) : 100);

    return {
      base,
      principalAmount: base,
      totalPrincipal: base,
      paidPrincipal: totalCapitalPaid,
      paidInterest: totalInterestPaid,
      totalAccruedInterest: accruedInterest,
      rate,
      accruedInterest,
      monthsElapsed,
      remainingCapital,
      remainingInterest,
      totalRemaining,
      interestAmount,
      insurance,
      totalToPay,
      totalPaid,
      totalCapitalPaid,
      totalInterestPaid,
      outstandingBalance,
      outstandingCapital: remainingCapital,
      isPaid,
      suggestedInstallment,
      progressPercent
    };
  };

  const tabTotals = filteredItems.reduce((acc, item) => {
    const stats = calculateItemStats(item);
    acc.totalPrincipal += stats.totalPrincipal;
    acc.paidPrincipal += stats.paidPrincipal;
    acc.paidInterest += stats.paidInterest;
    acc.totalAccruedInterest += stats.totalAccruedInterest;
    acc.totalToPay += stats.totalToPay;
    acc.totalPaid += stats.totalPaid;
    acc.totalCapitalPaid += stats.totalCapitalPaid;
    acc.totalInterestPaid += stats.totalInterestPaid;
    acc.outstandingBalance += stats.outstandingBalance;
    acc.remainingCapital += stats.remainingCapital;
    acc.remainingInterest += stats.remainingInterest;
    if (stats.isPaid) acc.paidCount++;
    else acc.pendingCount++;
    return acc;
  }, { 
    totalPrincipal: 0,
    paidPrincipal: 0,
    paidInterest: 0,
    totalAccruedInterest: 0,
    totalToPay: 0, 
    totalPaid: 0, 
    totalCapitalPaid: 0, 
    totalInterestPaid: 0, 
    outstandingBalance: 0, 
    remainingCapital: 0, 
    remainingInterest: 0, 
    paidCount: 0, 
    pendingCount: 0 
  });

  const openPaymentModal = (item) => {
    setSelectedItemForPayment(item);
  };

  return (
    <div className="space-y-4 px-4 sm:px-6">
      <div className="ios-card p-4 sm:p-5">
        {/* Header con Título y Botón + Nuevo */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] sm:text-[20px] font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <HandCoins className="w-5 h-5 text-[#34C759] shrink-0" />
              <span className="truncate">Préstamos y Deudas</span>
            </h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate font-normal mt-0.5">
              {activeTab === 'receivable' ? 'Cuentas por cobrar a terceros' : 'Pasivos y compromisos por pagar'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className={`px-3.5 py-2 text-xs font-bold text-white rounded-xl shadow-sm active:scale-95 flex items-center justify-center gap-1.5 shrink-0 self-stretch sm:self-auto transition-transform cursor-pointer ${
              activeTab === 'receivable' ? 'bg-[#34C759] hover:bg-emerald-600' : 'bg-[#FF3B30] hover:bg-red-600'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{activeTab === 'receivable' ? 'Nuevo préstamo' : 'Nueva deuda'}</span>
          </button>
        </div>

        {/* Segmented Control: Me Deben vs Debo */}
        <div className="w-full mb-4">
          <SegmentedControl
            options={[
              { 
                id: 'receivable', 
                label: 'Me Deben', 
                icon: ArrowUpRight, 
                count: debtsAndLoans.filter(d => d.type === 'receivable').length
              },
              { 
                id: 'payable', 
                label: 'Debo', 
                icon: ArrowDownLeft, 
                count: debtsAndLoans.filter(d => d.type === 'payable').length
              }
            ]}
            value={activeTab}
            onChange={setActiveTab}
            size="md"
          />
        </div>

        {/* Resumen de Métricas Móvil con Alto Contraste */}
        <div className="space-y-2.5 mb-4">
          {/* Tarjeta Principal: Saldo Pendiente */}
          <div 
            className="p-3.5 sm:p-4 rounded-2xl border"
            style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400 tracking-normal truncate">
                {activeTab === 'receivable' ? 'Saldo por Cobrar Pendiente' : 'Saldo por Pagar Pendiente'}
              </span>
              <span className={`text-[11px] sm:text-[12px] font-semibold font-mono tracking-tight px-2.5 py-0.5 rounded-full shrink-0 tabular-nums ${
                activeTab === 'receivable' ? 'bg-emerald-500/15 text-[#34C759]' : 'bg-red-500/15 text-[#FF3B30]'
              }`}>
                {tabTotals.pendingCount} pendiente{tabTotals.pendingCount !== 1 ? 's' : ''}
              </span>
            </div>

            <div className={`text-[28px] sm:text-[32px] font-bold font-mono tracking-tight truncate my-1 tabular-nums leading-tight ${
              activeTab === 'receivable' ? 'text-[#34C759]' : 'text-[#FF3B30]'
            }`}>
              {formatCurrency(tabTotals.outstandingBalance)}
            </div>

            {tabTotals.remainingInterest > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>Cap: <strong className="text-slate-700 dark:text-slate-200 font-bold font-mono tracking-tight tabular-nums">{formatCurrency(tabTotals.remainingCapital)}</strong></span>
                <span>•</span>
                <span>Intereses acum.: <strong className="text-amber-500 font-bold font-mono tracking-tight tabular-nums">{formatCurrency(tabTotals.remainingInterest)}</strong></span>
              </div>
            )}

            {/* Barra de progreso de liquidación */}
            <div className="mt-2.5 pt-2 border-t space-y-1.5" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                <span className="opacity-60">Liquidado de esta sección</span>
                <span className="font-bold font-mono tracking-tight tabular-nums">
                  {tabTotals.totalToPay > 0 
                    ? `${Math.min(100, Math.round((tabTotals.totalPaid / tabTotals.totalToPay) * 100))}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--pill-bg)' }}>
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    activeTab === 'receivable' ? 'bg-[#34C759]' : 'bg-[#FF3B30]'
                  }`}
                  style={{ 
                    width: `${tabTotals.totalToPay > 0 ? Math.min(100, (tabTotals.totalPaid / tabTotals.totalToPay) * 100) : 0}%` 
                  }}
                />
              </div>
            </div>
          </div>

          {/* 2 Tarjetas Secundarias: Total y Estado */}
          <div className="grid grid-cols-2 gap-2.5">
            <div 
              className="p-3 rounded-2xl border"
              style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block truncate">
                {activeTab === 'receivable' ? 'Total Prestado' : 'Total Compromiso'}
              </span>
              <span className="text-sm sm:text-base font-bold font-mono tracking-tight tabular-nums truncate block mt-0.5" style={{ color: 'var(--text-main)' }}>
                {formatCurrency(tabTotals.totalToPay)}
              </span>
              <div className="text-[10px] opacity-75 mt-1 space-y-0.5">
                <div>Abonado: <span className="text-[#34C759] font-bold font-mono tracking-tight tabular-nums">{formatCurrency(tabTotals.totalPaid)}</span></div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400">
                  Cap: <span className="font-mono tabular-nums">{formatCurrency(tabTotals.totalCapitalPaid)}</span> | Int: <span className="font-mono tabular-nums">{formatCurrency(tabTotals.totalInterestPaid)}</span>
                </div>
              </div>
            </div>

            <div 
              className="p-3 rounded-2xl border flex flex-col justify-between"
              style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block truncate">
                  Cuentas Pagadas
                </span>
                <span className="text-sm sm:text-base font-bold font-mono tracking-tight tabular-nums truncate block mt-0.5" style={{ color: 'var(--text-main)' }}>
                  {tabTotals.paidCount} de {filteredItems.length}
                </span>
              </div>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-[#34C759] block truncate">
                  {filteredItems.length === 0 ? 'Sin cuentas' : tabTotals.pendingCount === 0 ? '✓ 100% al día' : `${tabTotals.pendingCount} pendiente(s)`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Registros unificada */}
        {filteredItems.length === 0 ? (
          <div 
            className="text-center py-8 px-4 border border-dashed rounded-2xl"
            style={{ backgroundColor: 'var(--bg-card-sub)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          >
            <HandCoins className="w-9 h-9 opacity-30 mx-auto mb-2" />
            <h4 className="text-xs font-bold opacity-80">
              {activeTab === 'receivable' ? 'No tienes préstamos por cobrar registrados' : 'No tienes deudas por pagar registradas'}
            </h4>
            <p className="text-[11px] opacity-50 mt-1 mb-3">
              Toca el botón "Nuevo {activeTab === 'receivable' ? 'préstamo' : 'deuda'}" para agregar tu primer registro
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm active:scale-95 transition-transform cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === 'receivable' ? 'bg-[#34C759] hover:bg-emerald-600' : 'bg-[#FF3B30] hover:bg-red-600'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar {activeTab === 'receivable' ? 'Préstamo' : 'Deuda'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <DebtCard
                key={item.id}
                debt={item}
                stats={calculateItemStats(item)}
                formatCurrency={formatCurrency}
                onAddPayment={openPaymentModal}
                onAddDisbursement={setSelectedItemForDisbursement}
                onShareReceipt={setSelectedItemForReceipt}
                onEdit={setEditingDebtItem}
                onDelete={onDeleteDebtOrLoan}
                onDeletePayment={onDeletePayment}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal para Crear Deuda o Préstamo */}
      {isCreateModalOpen && (
        <DebtModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          initialType={activeTab}
          defaultType={activeTab}
          onSave={(newItem) => {
            onAddDebtOrLoan(newItem);
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* Modal para Registrar Abono / Pago con discriminación de capital e intereses */}
      {selectedItemForPayment && (
        <AddDebtPaymentModal
          isOpen={!!selectedItemForPayment}
          onClose={() => setSelectedItemForPayment(null)}
          debt={selectedItemForPayment}
          stats={calculateItemStats(selectedItemForPayment)}
          accounts={accounts}
          onSavePayment={(debtId, paymentData) => {
            const stats = calculateItemStats(selectedItemForPayment);
            const willBePaid = (stats.outstandingBalance - (paymentData.capitalAmount || 0)) <= 1;

            onAddPayment(debtId, paymentData);

            if (willBePaid) {
              confetti({
                particleCount: 120,
                spread: 75,
                origin: { y: 0.65 }
              });
            }

            setSelectedItemForPayment(null);
          }}
          formatMoney={formatCurrency}
        />
      )}

      {/* Modal para Añadir Desembolso / Prestar Más */}
      {selectedItemForDisbursement && (
        <AddDisbursementModal
          isOpen={!!selectedItemForDisbursement}
          onClose={() => setSelectedItemForDisbursement(null)}
          debt={selectedItemForDisbursement}
          accounts={accounts}
          onSaveDisbursement={(debtId, disbData) => {
            if (onAddDisbursement) {
              onAddDisbursement(debtId, disbData);
            }
            setSelectedItemForDisbursement(null);
          }}
          formatMoney={formatCurrency}
        />
      )}

      {/* Modal para Editar Deuda / Préstamo */}
      {editingDebtItem && (
        <DebtModal
          isOpen={!!editingDebtItem}
          onClose={() => setEditingDebtItem(null)}
          editingItem={editingDebtItem}
          initialType={editingDebtItem.type}
          defaultType={editingDebtItem.type}
          onSave={(updated) => {
            if (onUpdateDebtOrLoan) {
              onUpdateDebtOrLoan(updated);
            }
            setEditingDebtItem(null);
          }}
        />
      )}

      {/* Modal para Compartir Estado de Cuenta / Historial de Pagos */}
      {selectedItemForReceipt && (
        <DebtReceiptModal
          isOpen={!!selectedItemForReceipt}
          onClose={() => setSelectedItemForReceipt(null)}
          debt={selectedItemForReceipt}
          stats={calculateItemStats(selectedItemForReceipt)}
          formatMoney={formatCurrency}
        />
      )}

    </div>
  );
}
