import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export default function AnimatedCounter({ value = 0, formatter, className = "" }) {
  const numericValue = typeof value === 'number' ? value : Number(value) || 0;

  const spring = useSpring(0, {
    stiffness: 90,
    damping: 20,
    mass: 0.75,
  });

  const display = useTransform(spring, (current) => {
    const rounded = Math.round(current);
    return typeof formatter === 'function' ? formatter(rounded) : rounded.toLocaleString('es-CO');
  });

  useEffect(() => {
    spring.set(numericValue);
  }, [spring, numericValue]);

  return <motion.span className={`tabular-nums font-mono ${className}`}>{display}</motion.span>;
}
