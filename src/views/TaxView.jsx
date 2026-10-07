import React from 'react';
import CoreTaxView from '../components/TaxView';

/**
 * TaxView
 * Vista dedicada para análisis impositivo, topes DIAN y declaración de renta.
 */
export default function TaxView(props) {
  return (
    <div className="w-full space-y-4">
      <CoreTaxView {...props} />
    </div>
  );
}
