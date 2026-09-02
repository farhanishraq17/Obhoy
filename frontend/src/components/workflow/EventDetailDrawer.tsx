import React, { useState } from 'react';
import { InsurableEvent } from '../../types/event';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Timeline } from '../ui/Timeline';
import { QuorumIndicator } from './QuorumIndicator';
import { formatTruncatedHash } from '../../lib/format';
import { X, ShieldCheck, ChevronDown, ChevronUp, Cpu, Building2, User, Clock, FileText } from 'lucide-react';

interface EventDetailDrawerProps {
  event: InsurableEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EventDetailDrawer: React.FC<EventDetailDrawerProps> = ({ event, isOpen, onClose }) => {
  const [showTechnicalProof, setShowTechnicalProof] = useState(false);

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-mono font-bold text-sm">
              {event.id.slice(-4)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900 font-mono">{event.id}</h2>
                <Badge variant={event.status === 'CLOSED_ELIGIBLE' ? 'success' : 'info'}>{event.status}</Badge>
              </div>
              <p className="text-xs text-slate-500 font-mono">Uniqueness Key: {formatTruncatedHash(event.eventKey, 8)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Overview & Admission */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Beneficiary</span>
              <span className="text-slate-900 font-bold flex items-center space-x-1 mt-0.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                <span>{event.holderName}</span>
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Asserting Provider</span>
              <span className="text-slate-900 font-semibold flex items-center space-x-1 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                <span className="truncate">{event.facilityName}</span>
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Admission Window</span>
              <span className="text-slate-700 font-medium">{event.admissionWindow}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Diagnosis Group</span>
              <span className="text-teal-700 font-bold">{event.diagnosisCategory}</span>
            </div>
          </div>

          {/* Segments (Transfers) */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-500 uppercase flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>Admission Segments ({event.segments.length})</span>
            </h3>

            <div className="space-y-2">
              {event.segments.map((seg, idx) => (
                <div key={seg.id} className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 font-mono">
                      Segment 0{idx + 1} — {seg.type}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{seg.admittedAt}</span>
                  </div>
                  <p className="text-slate-700 font-medium">{seg.facilityName}</p>
                  {seg.notes && <p className="text-slate-500 italic text-[11px]">{seg.notes}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Multi-Class Quorum */}
          <QuorumIndicator attestations={event.attestations} />

          {/* Verification Timeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-500 uppercase flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-teal-600" />
              <span>Verification Audit Log</span>
            </h3>
            <Timeline entries={event.timeline} />
          </div>

          {/* Collapsible Technical Proof */}
          <div className="border-t border-slate-200 pt-4">
            <button
              onClick={() => setShowTechnicalProof(!showTechnicalProof)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-100 hover:bg-slate-200/60 text-slate-700 text-xs font-mono font-bold transition-colors"
            >
              <span className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-teal-600" />
                <span>View Cryptographic Verification Record</span>
              </span>
              {showTechnicalProof ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTechnicalProof && (
              <div className="mt-3 p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-2 border border-slate-800">
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">CHANNEL:</span>
                  <span className="text-teal-400 font-bold">CLAIMS_VERIFICATION_CHANNEL</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">EVENT ID:</span>
                  <span className="text-slate-200">{event.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">EVENT UNIQ KEY:</span>
                  <span className="text-slate-300 truncate max-w-[240px]">{event.eventKey}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">PROVIDER CREDENTIAL:</span>
                  <span className="text-slate-200">PRV-00142 (Accredited Healthcare Node)</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">QUORUM POLICY:</span>
                  <span className="text-emerald-400 font-bold">2-of-3 (Provider + Independent Clinical / Field)</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-400">RECORD STATUS:</span>
                  <span className="text-teal-400 font-bold">VERIFIED CLAIMS LEDGER STATE</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
