import React from 'react';
import { clsx } from 'clsx';

interface ProgressProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  sublabel?: string;
  variant?: 'teal' | 'emerald' | 'amber' | 'purple';
  showPercentage?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  label,
  sublabel,
  variant = 'teal',
  showPercentage = true,
}) => {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const barColors = {
    teal: 'bg-gradient-to-r from-teal-500 to-emerald-400',
    emerald: 'bg-gradient-to-r from-emerald-500 to-green-400',
    amber: 'bg-gradient-to-r from-amber-500 to-yellow-400',
    purple: 'bg-gradient-to-r from-purple-500 to-indigo-400',
  };

  return (
    <div className="w-full space-y-1.5">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-slate-300">{label}</span>}
          {showPercentage && <span className="font-mono text-slate-400">{percentage}%</span>}
        </div>
      )}
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
        <div
          className={clsx('h-full rounded-full transition-all duration-500 ease-out', barColors[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {sublabel && <p className="text-[11px] text-slate-400">{sublabel}</p>}
    </div>
  );
};
