import React from 'react';
import TransactionList from './TransactionList';

export default function TransactionsView(props) {
  return (
    <div className="space-y-4">
      <TransactionList {...props} />
    </div>
  );
}
