import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'purple' | 'neutral';
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info',
  size = 'md',
  pulse = false,
  className,
}) => {
  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
    error: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
    info: 'bg-teal-50 text-teal-700 border-teal-200 font-semibold',
    purple: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 font-semibold',
  };

  const dotColors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    info: 'bg-teal-500',
    purple: 'bg-indigo-500',
    neutral: 'bg-slate-500',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center space-x-1.5 rounded-full border tracking-wide uppercase font-mono',
          variantStyles[variant],
          sizes[size],
          className
        )
      )}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', dotColors[variant])}></span>
          <span className={clsx('relative inline-flex rounded-full h-2 w-2', dotColors[variant])}></span>
        </span>
      )}
      <span>{children}</span>
    </span>
  );
};
