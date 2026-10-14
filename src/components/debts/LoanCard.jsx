import React from 'react';
import DebtCard from './DebtCard';

/**
 * LoanCard component
 * Displays loan information with fintech double progress bars for recovered principal
 * and accrued/collected interest gains.
 */
export default function LoanCard(props) {
  return <DebtCard {...props} />;
}

export { DebtCard };
