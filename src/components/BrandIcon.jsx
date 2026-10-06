import React from 'react';
import { Building2 } from 'lucide-react';

export default function BrandIcon({ 
  name = '', 
  type = '', 
  size = 36, 
  className = '', 
  wrapperClassName = '', 
  fallback = null 
}) {
  const q = (name || '').toLowerCase().trim();
  const t = (type || '').toLowerCase().trim();

  let brandSrc = null;

  // 1. Mapeo directo y prioritario a las imágenes oficiales en public/brands/
  if (q.includes('bancolombia')) {
    brandSrc = '/brands/bancolombia.png';
  } else if (q.includes('visa')) {
    brandSrc = '/brands/Visa.png';
  } else if (q.includes('mastercard') || q.includes('master card')) {
    brandSrc = '/brands/Mastercard.png';
  } else if (q.includes('nu') || q.includes('nubank')) {
    brandSrc = '/brands/nu.png';
  } else if (q.includes('movistar')) {
    brandSrc = '/brands/Movistar.png';
  } else if (q.includes('addi')) {
    brandSrc = '/brands/Addi.png';
  } else if (q.includes('xtb')) {
    brandSrc = '/brands/xtb.jpeg';
  } else if (q.includes('btc') || q.includes('bitcoin') || q.includes('crypto')) {
    brandSrc = '/brands/bitcoin.png';
  } else if (q.includes('ahorro') || q.includes('alcancia') || q.includes('alcancía') || q.includes('bolsillo')) {
    brandSrc = '/brands/ahorra_dinero.png';
  } else if (q.includes('efectivo') || q.includes('cash')) {
    brandSrc = '/brands/pago_en_efectivo.png';
  } else if (q.includes('transferencia') || q.includes('cuenta')) {
    brandSrc = '/brands/transferencia-de-dinero-en-línea.png';
  } else if (q.includes('dinero') || q.includes('caja')) {
    brandSrc = '/brands/dinero.png';
  } else if (q.includes('nequi')) {
    brandSrc = '/brands/nequi.svg';
  } else if (q.includes('davi') || q.includes('daviplata')) {
    brandSrc = '/brands/davivienda.svg';
  } else if (q.includes('epm')) {
    brandSrc = '/brands/EPM.png';
  } else if (q.includes('google')) {
    brandSrc = '/brands/Google.webp';
  } else if (q.includes('finanza')) {
    brandSrc = '/brands/finanzas.png';
  } else if (t.includes('cash') || t.includes('efectivo')) {
    brandSrc = '/brands/pago_en_efectivo.png';
  } else if (t.includes('card') || t.includes('credit') || t.includes('crédito')) {
    brandSrc = '/brands/Mastercard.png';
  } else if (t.includes('savings') || t.includes('ahorro')) {
    brandSrc = '/brands/ahorra_dinero.png';
  } else if (t.includes('bank') || t.includes('cuenta') || t.includes('débito') || t.includes('debito')) {
    brandSrc = '/brands/transferencia-de-dinero-en-línea.png';
  }

  // Renderizado de la imagen nítida sin deformaciones
  if (brandSrc) {
    const imgEl = (
      <div 
        style={{ width: size, height: size }} 
        className={`flex items-center justify-center shrink-0 p-0.5 ${className}`}
      >
        <img
          src={brandSrc}
          alt={name}
          className="w-full h-full object-contain select-none"
          loading="lazy"
          onError={(e) => {
            if (brandSrc.includes('línea')) {
              e.currentTarget.src = '/brands/transferencia-de-dinero-en-linea.png';
            }
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

  // Fallback sobrio si no coincide ningún nombre
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

export function hasBrandIcon(name = '') {
  if (!name || typeof name !== 'string') return false;
  const q = name.toLowerCase().trim();
  return (
    q.includes('bancolombia') ||
    q.includes('visa') ||
    q.includes('mastercard') ||
    q.includes('master card') ||
    q.includes('nu') ||
    q.includes('nubank') ||
    q.includes('movistar') ||
    q.includes('addi') ||
    q.includes('xtb') ||
    q.includes('btc') ||
    q.includes('bitcoin') ||
    q.includes('crypto') ||
    q.includes('ahorro') ||
    q.includes('alcancia') ||
    q.includes('alcancía') ||
    q.includes('bolsillo') ||
    q.includes('efectivo') ||
    q.includes('cash') ||
    q.includes('transferencia') ||
    q.includes('cuenta') ||
    q.includes('dinero') ||
    q.includes('caja') ||
    q.includes('nequi') ||
    q.includes('davi') ||
    q.includes('daviplata') ||
    q.includes('epm') ||
    q.includes('google')
  );
}

// Retrocompatibilidad
export const BancolombiaIcon = (props) => <BrandIcon name="bancolombia" {...props} />;
export const VisaIcon = (props) => <BrandIcon name="visa" {...props} />;
export const MastercardIcon = (props) => <BrandIcon name="mastercard" {...props} />;
export const NequiIcon = (props) => <BrandIcon name="nequi" {...props} />;
export const NuIcon = (props) => <BrandIcon name="nu" {...props} />;
export const DaviviendaIcon = (props) => <BrandIcon name="davivienda" {...props} />;
