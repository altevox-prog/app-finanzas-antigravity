import React from 'react';

/**
 * MobileLayout wrapper
 * Ensures adaptive viewport height and bottom padding for safe area / dock
 */
export default function MobileLayout({ children, className = '' }) {
  return (
    <div className={`min-h-[100dvh] w-full flex flex-col justify-between pb-24 sm:pb-28 px-3.5 sm:px-4 pt-3 ${className}`}>
      {children}
    </div>
  );
}
