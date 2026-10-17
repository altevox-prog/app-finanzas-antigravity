import React from 'react';
import { Building2 } from 'lucide-react';

const BRAND_ASSETS = {
  // SVGs Vectoriales Oficiales
  bancolombia: '/brands/bancolombia.svg',
  binance: '/brands/binance.svg',
  davivienda: '/brands/davivienda.svg',
  daviplata: '/brands/davivienda.svg',
  mastercard: '/brands/mastercard.svg',
  'master card': '/brands/mastercard.svg',
  nequi: '/brands/nequi.svg',
  nu: '/brands/nu.svg',
  nubank: '/brands/nu.svg',
  paypal: '/brands/paypal.svg',
  visa: '/brands/visa.svg',

  // Formatos PNG / WEBP / JPEG existentes
  addi: '/brands/addi.png',
  arq: '/brands/arq.png',
  bitcoin: '/brands/bitcoin.png',
  btc: '/brands/bitcoin.png',
  crypto: '/brands/bitcoin.png',
  epm: '/brands/epm.png',
  google: '/brands/google.webp',
  movistar: '/brands/movistar.png',
  xtb: '/brands/xtb.jpeg',

  // Métodos Generales y Efectivo
  efectivo: '/brands/pago_en_efectivo.png',
  cash: '/brands/pago_en_efectivo.png',
  'pago en efectivo': '/brands/pago_en_efectivo.png',
  caja: '/brands/dinero.png',
  ahorro: '/brands/ahorra_dinero.png',
  ahorros: '/brands/ahorra_dinero.png',
  alcancia: '/brands/ahorra_dinero.png',
  bolsillo: '/brands/ahorra_dinero.png',
  savings: '/brands/ahorra_dinero.png',
  dinero: '/brands/dinero.png',
  finanzas: '/brands/finanzas.png',
  finanza: '/brands/finanzas.png',
  transferencia: '/brands/transferencia-de-dinero-en-linea.png',
  'transferencia bancaria': '/brands/transferencia-de-dinero-en-linea.png',
  'transferencia en linea': '/brands/transferencia-de-dinero-en-linea.png',
  cuenta: '/brands/transferencia-de-dinero-en-linea.png',
  banco: '/brands/transferencia-de-dinero-en-linea.png',
  bank: '/brands/transferencia-de-dinero-en-linea.png',
  debito: '/brands/transferencia-de-dinero-en-linea.png',
  credito: '/brands/mastercard.svg',
  card: '/brands/mastercard.svg',
  credit: '/brands/mastercard.svg',
};

const DEFAULT_FALLBACK = '/brands/pago_en_efectivo.png';

const normalizeKey = (val) => {
  if (!val) return '';
  return val
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const resolveBrandAsset = (name = '', type = '') => {
  const normName = normalizeKey(name);
  const normType = normalizeKey(type);

  // 1. Coincidencia exacta por nombre
  if (normName && BRAND_ASSETS[normName]) {
    return BRAND_ASSETS[normName];
  }

  // 2. Coincidencia parcial por nombre
  if (normName) {
    for (const [key, asset] of Object.entries(BRAND_ASSETS)) {
      if (normName.includes(key) || key.includes(normName)) {
        return asset;
      }
    }
  }

  // 3. Coincidencia exacta o parcial por tipo
  if (normType && BRAND_ASSETS[normType]) {
    return BRAND_ASSETS[normType];
  }

  if (normType) {
    for (const [key, asset] of Object.entries(BRAND_ASSETS)) {
      if (normType.includes(key) || key.includes(normType)) {
        return asset;
      }
    }
  }

  return null;
};

export default function BrandIcon({ 
  name = '', 
  type = '', 
  size = 36, 
  className = '', 
  wrapperClassName = '', 
  fallback = null 
}) {
  const brandSrc = resolveBrandAsset(name, type);

  // Renderizado de la imagen nítida sin deformaciones con prevención de bucles en error
  if (brandSrc) {
    const imgEl = (
      <div 
        style={{ width: size, height: size }} 
        className={`flex items-center justify-center shrink-0 p-0.5 ${className}`}
      >
        <img
          src={brandSrc}
          alt={name || 'Entidad financiera'}
          className="w-full h-full object-contain select-none rounded-xl"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = DEFAULT_FALLBACK;
          }}
        />
      </div>
    );

    if (wrapperClassName) {
      return <div className={wrapperClassName}>{imgEl}</div>;
    }
    return imgEl;
  }

  // Fallback prop si se proporciona (para transacciones con categoría personalizada)
  if (fallback) {
    if (wrapperClassName) {
      return <div className={wrapperClassName}>{fallback}</div>;
    }
    return fallback;
  }

  // Fallback sobrio si no coincide ningún nombre ni tipo
  const fallbackEl = (
    <div 
      style={{ width: size, height: size }} 
      className={`rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 ${className}`}
    >
      <Building2 className={size <= 24 ? 'w-3.5 h-3.5' : 'w-5 h-5'} />
    </div>
  );

  if (wrapperClassName) {
    return <div className={wrapperClassName}>{fallbackEl}</div>;
  }

  return fallbackEl;
}

export function hasBrandIcon(name = '', type = '') {
  return !!resolveBrandAsset(name, type);
}

// Retrocompatibilidad
export const BancolombiaIcon = (props) => <BrandIcon name="bancolombia" {...props} />;
export const VisaIcon = (props) => <BrandIcon name="visa" {...props} />;
export const MastercardIcon = (props) => <BrandIcon name="mastercard" {...props} />;
export const NequiIcon = (props) => <BrandIcon name="nequi" {...props} />;
export const NuIcon = (props) => <BrandIcon name="nu" {...props} />;
export const DaviviendaIcon = (props) => <BrandIcon name="davivienda" {...props} />;

