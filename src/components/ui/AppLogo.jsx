import React from 'react';

/**
 * AppLogo - Isotipo y marca centralizada de Monety (Iguana / Letra 'A' 3D con destello esmeralda)
 */
export default function AppLogo({
  size = 'md',
  showText = false,
  subtitle = null,
  className = '',
  iconClassName = '',
  onClick = null,
  textClassName = ''
}) {
  const sizeMap = {
    xs: { box: 'w-6 h-6', img: 'w-6 h-6 rounded-lg' },
    sm: { box: 'w-8 h-8', img: 'w-8 h-8 rounded-xl' },
    md: { box: 'w-10 h-10', img: 'w-10 h-10 rounded-2xl' },
    lg: { box: 'w-14 h-14', img: 'w-14 h-14 rounded-2xl' },
    xl: { box: 'w-16 h-16 sm:w-20 sm:h-20', img: 'w-full h-full rounded-3xl' },
    '2xl': { box: 'w-24 h-24', img: 'w-full h-full rounded-3xl' }
  };

  const currentSize = typeof size === 'string' && sizeMap[size] 
    ? sizeMap[size] 
    : { box: `w-[${size}px] h-[${size}px]`, img: `w-full h-full rounded-xl` };

  return (
    <div 
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className={`${currentSize.box} shrink-0 overflow-hidden shadow-sm flex items-center justify-center transition-transform hover:scale-105 ${iconClassName}`}>
        <img
          src="/icon-192x192.png"
          alt="Monety"
          className={`${currentSize.img} object-cover block`}
          onError={(e) => {
            e.currentTarget.src = '/logo.png';
          }}
        />
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight leading-none text-slate-900 dark:text-white ${textClassName || 'text-base sm:text-lg'}`}>
              Monety
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-wide mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export { AppLogo };
