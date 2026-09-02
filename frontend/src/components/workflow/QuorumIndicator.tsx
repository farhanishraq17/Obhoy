import React from 'react';
import { validateQuorum } from '../../simulation/validators';
import { Attestation } from '../../types/event';
import { ShieldCheck, ShieldAlert, Check, X } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface QuorumIndicatorProps {
  attestations: Attestation[];
}

export const QuorumIndicator: React.FC<QuorumIndicatorProps> = ({ attestations }) => {
  const quorum = validateQuorum(attestations);

  const classes = [
    { key: 'PROVIDER', label: 'Provider Assertion (Payee)', isPayee: true },
    { key: 'CLINICAL', label: 'Clinical Verifier (Non-Payee)', isPayee: false },
    { key: 'FIELD', label: 'Field Agent Verifier (Non-Payee)', isPayee: false },
  ];

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {quorum.satisfied ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          )}
          <span className="text-sm font-bold text-slate-800">Multi-Class Attestation Quorum</span>
        </div>
        <Badge variant={quorum.satisfied ? 'success' : 'warning'} pulse={!quorum.satisfied}>
          {quorum.validClassesCount} / 3 Classes Signed
        </Badge>
      </div>

      {/* Class Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {classes.map((cls) => {
          const isSigned = quorum.classes.includes(cls.key);
          return (
            <div
              key={cls.key}
              className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
                isSigned
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium shadow-xs'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <div>
                <span className="font-bold block">{cls.label}</span>
                <span className="text-[10px] font-mono text-slate-500">
                  {cls.isPayee ? 'Payee Class' : 'Independent Non-Payee'}
                </span>
              </div>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isSigned ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isSigned ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-200">
        <span>Protocol Requirement: 2-of-3 classes including 1 non-payee</span>
        <span className={quorum.hasNonPayee ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
          {quorum.hasNonPayee ? '✓ Non-payee present' : '✗ Non-payee required'}
        </span>
      </div>
    </div>
  );
};
