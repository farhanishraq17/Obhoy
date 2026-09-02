import React from 'react';
import { TimelineEntry } from '../../types/transparency';
import { CheckCircle2, AlertCircle, Info, ShieldCheck, Clock } from 'lucide-react';

interface TimelineProps {
  entries: TimelineEntry[];
}

export const Timeline: React.FC<TimelineProps> = ({ entries }) => {
  if (!entries || entries.length === 0) {
    return <p className="text-sm text-slate-400">No protocol events recorded yet.</p>;
  }

  const getIcon = (type: TimelineEntry['type']) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'ALERT':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'WARNING':
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-teal-600" />;
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {entries.map((entry) => (
        <div key={entry.id} className="relative group">
          <div className="absolute -left-6 top-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-white border border-slate-300 shadow-xs ring-4 ring-white">
            {getIcon(entry.type)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-800">{entry.title}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {entry.actorRole}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{entry.description}</p>
            <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-mono pt-1">
              <span>{entry.timestamp}</span>
              {entry.hash && (
                <span className="flex items-center space-x-1 text-teal-700 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Hash: {entry.hash}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
