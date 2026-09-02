import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  glass?: boolean;
  glow?: 'teal' | 'amber' | 'emerald' | 'none';
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  glass = true,
  glow = 'none',
  className,
  ...props
}) => {
  const glowClasses = {
    teal: 'glow-teal border-teal-600/30',
    amber: 'glow-amber border-amber-500/30',
    emerald: 'glow-emerald border-emerald-600/30',
    none: '',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'rounded-xl p-6 relative overflow-hidden transition-all duration-200',
          glass ? 'glass-card' : 'bg-white border border-slate-200 shadow-sm',
          hoverable && 'glass-card-hover cursor-pointer',
          glowClasses[glow],
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
