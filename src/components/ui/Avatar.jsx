import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'lucide-react';

const SIZE_MAP = {
  xs: {
    container: 'w-6 h-6 text-[10px]',
    icon: 'w-3 h-3'
  },
  sm: {
    container: 'w-8 h-8 text-xs',
    icon: 'w-4 h-4'
  },
  md: {
    container: 'w-10 h-10 text-sm',
    icon: 'w-5 h-5'
  },
  lg: {
    container: 'w-12 h-12 text-base',
    icon: 'w-6 h-6'
  },
  xl: {
    container: 'w-16 h-16 text-xl',
    icon: 'w-8 h-8'
  }
};

const PALETTE = [
  'bg-emerald-600 dark:bg-emerald-700 text-white',
  'bg-indigo-600 dark:bg-indigo-700 text-white',
  'bg-violet-600 dark:bg-violet-700 text-white',
  'bg-amber-600 dark:bg-amber-700 text-white',
  'bg-cyan-600 dark:bg-cyan-700 text-white',
  'bg-rose-600 dark:bg-rose-700 text-white',
  'bg-slate-600 dark:bg-slate-700 text-white',
  'bg-teal-600 dark:bg-teal-700 text-white'
];

function getDeterministicColor(str) {
  const key = (str || 'user').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

function getInitials(name, email) {
  if (name && typeof name === 'string' && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  if (email && typeof email === 'string' && email.includes('@')) {
    const username = email.split('@')[0].trim();
    if (username.length >= 2) {
      return username.slice(0, 2).toUpperCase();
    }
    if (username.length === 1) {
      return username.toUpperCase();
    }
  }

  return '';
}

/**
 * Avatar
 * Componente de avatar reutilizable con degradación elegante:
 * Foto -> Iniciales con color determinista por hash -> Icono genérico de usuario.
 */
export default function Avatar({
  src,
  name,
  email,
  size = 'md',
  showStatus = false,
  isOnline = true,
  className = ''
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
  const initials = useMemo(() => getInitials(name, email), [name, email]);
  const bgColorClass = useMemo(() => getDeterministicColor(name || email), [name, email]);

  const statusRing = showStatus
    ? isOnline
      ? 'ring-2 ring-emerald-500/80 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900'
      : 'ring-2 ring-zinc-500/80 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900'
    : '';

  const hasImage = Boolean(src && !imgError);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full select-none overflow-hidden ${sizeConfig.container} ${statusRing} ${className}`}
      title={name || email || 'Avatar de usuario'}
    >
      {hasImage ? (
        <img
          src={src}
          alt={name || email || 'Avatar'}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-full"
          loading="lazy"
        />
      ) : initials ? (
        <div className={`w-full h-full rounded-full flex items-center justify-center font-bold tracking-wider ${bgColorClass}`}>
          <span>{initials}</span>
        </div>
      ) : (
        <div className="w-full h-full rounded-full flex items-center justify-center bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
          <User className={sizeConfig.icon} />
        </div>
      )}
    </div>
  );
}
