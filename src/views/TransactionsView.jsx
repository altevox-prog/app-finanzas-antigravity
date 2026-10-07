import React from 'react';
import CoreTransactionsView from '../components/TransactionsView';

/**
 * TransactionsView
 * Vista principal de movimientos y transacciones con filtros mensuales y diarios.
 */
export default function TransactionsView(props) {
  return (
    <div className="space-y-4">
      <CoreTransactionsView {...props} />
    </div>
  );
}
