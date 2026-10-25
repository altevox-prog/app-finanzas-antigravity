import React from 'react';
import { Building2, TrendingUp } from 'lucide-react';
import { isBancolombia, BANCOLOMBIA_SVG_PATH, BRAND_ASSET_VERSION } from '../../utils/bankIcons';

const BRAND_ASSETS = {
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
  addi: '/brands/addi.png',
  arq: '/brands/arq.png',
  bitcoin: '/brands/bitcoin.png',
  btc: '/brands/bitcoin.png',
  crypto: '/brands/bitcoin.png',
  epm: '/brands/epm.png',
  google: '/brands/google.webp',
  movistar: '/brands/movistar.png',
  xtb: '/brands/xtb.jpeg',
  trii: '/brands/trii.jpeg',
  'acciones trii': '/brands/trii.jpeg',
  'trii colombia': '/brands/trii.jpeg',
  'trii app': '/brands/trii.jpeg',
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

const DEFAULT_FALLBACK = `/brands/pago_en_efectivo.png?${BRAND_ASSET_VERSION}`;

const normalizeKey = (val) => {
  if (!val) return '';
  return val.toString().toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const resolveBrandAsset = (name = '', type = '', institution = '') => {
  if (isBancolombia(name, institution, type)) {
    return BANCOLOMBIA_SVG_PATH;
  }
  const candidates = [name, institution, type].map(normalizeKey).filter(Boolean);
  let matched = null;
  for (const c of candidates) {
    if (BRAND_ASSETS[c]) {
      matched = BRAND_ASSETS[c];
      break;
    }
    for (const [key, asset] of Object.entries(BRAND_ASSETS)) {
      if (c.includes(key) || (key.length >= 4 && key.includes(c))) {
        matched = asset;
        break;
      }
    }
    if (matched) break;
  }
  if (!matched) return null;
  return matched.includes('?') ? matched : `${matched}?${BRAND_ASSET_VERSION}`;
};

export default function BrandIcon({
  name = '', type = '', institution = '', size = 36,
  className = '', wrapperClassName = '', fallback = null
}) {
  const brandSrc = resolveBrandAsset(name, type, institution);

  if (brandSrc) {
    const imgEl = (
      <div style={{ width: size, height: size }} className={`flex items-center justify-center shrink-0 p-0.5 ${className}`}>
        <img
          src={brandSrc}
          alt={name || institution || 'Entidad financiera'}
          className="w-full h-full object-contain select-none rounded-xl"
          loading="lazy"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_FALLBACK; }}
        />
      </div>
    );
    return wrapperClassName ? <div className={wrapperClassName}>{imgEl}</div> : imgEl;
  }

  if (fallback) return wrapperClassName ? <div className={wrapperClassName}>{fallback}</div> : fallback;

  const isMarket = ['crypto', 'variable', 'stock', 'etf', 'investment', 'accion', 'fondo'].some(k => (type || '').toLowerCase().includes(k));
  const FallbackIcon = isMarket ? TrendingUp : Building2;

  const fallbackEl = (
    <div style={{ width: size, height: size }} className={`rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 ${className}`}>
      <FallbackIcon className={size <= 24 ? 'w-3.5 h-3.5' : 'w-5 h-5'} />
    </div>
  );

  return wrapperClassName ? <div className={wrapperClassName}>{fallbackEl}</div> : fallbackEl;
}

export function hasBrandIcon(name = '', type = '', institution = '') {
  return !!resolveBrandAsset(name, type, institution);
}

export const BancolombiaIcon = (props) => <BrandIcon name="bancolombia" {...props} />;
export const VisaIcon = (props) => <BrandIcon name="visa" {...props} />;
export const MastercardIcon = (props) => <BrandIcon name="mastercard" {...props} />;
export const NequiIcon = (props) => <BrandIcon name="nequi" {...props} />;
export const NuIcon = (props) => <BrandIcon name="nu" {...props} />;
export const DaviviendaIcon = (props) => <BrandIcon name="davivienda" {...props} />;
export const TriiIcon = (props) => <BrandIcon name="trii" {...props} />;
