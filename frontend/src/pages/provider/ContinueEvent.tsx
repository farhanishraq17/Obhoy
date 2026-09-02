import React, { useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useSimulationStore } from '../../store/simulationStore';
import { MOCK_PROVIDERS } from '../../data/providers';
import { useUIStore } from '../../store/uiStore';
import { RotateCcw, ArrowDown, CheckCircle2, Building2 } from 'lucide-react';

export const ContinueEvent: React.FC = () => {
  const { events, continueEvent } = useSimulationStore();
  const { showToast } = useUIStore();

  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || 'EVT-1001');
  const [receivingFacility, setReceivingFacility] = useState(MOCK_PROVIDERS[1]);
  const [transferNotes, setTransferNotes] = useState('Patient transferred from Upazila Health Complex to District Hospital for specialized surgical intervention.');
  const [isConfirmed, setIsConfirmed] = useState(false);

  const targetEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const handleContinueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await continueEvent(selectedEventId, receivingFacility, transferNotes);
    if (result.success) {
      setIsConfirmed(true);
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
  };

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="purple">Section 5 — Inter-Facility Transfer</Badge>
          <h1 className="text-2xl font-extrabold text-slate-900">Continue Event Transition (`continueEvent`)</h1>
          <p className="text-xs text-slate-500">
            Continuation, not duplication. Attaches a new admission segment without minting a second event key.
          </p>
        </div>

        <Card className="p-6 space-y-6 border-indigo-200">
          {/* Section 5.1 Find Existing Event */}
          <div className="space-y-3">
            <label className="block text-xs font-mono font-bold text-slate-600 uppercase">1. Select Open Insurable Event:</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-semibold"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id} ({e.holderName} — {e.facilityName})
                </option>
              ))}
            </select>
          </div>

          {/* Section 5.2 Existing Event Summary */}
          {targetEvent && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="font-bold text-teal-700 text-sm">{targetEvent.id}</span>
                <Badge variant="info">{targetEvent.status}</Badge>
              </div>
              <p className="text-slate-900 font-bold font-sans">Patient: {targetEvent.holderName}</p>
              <p className="text-slate-600">Original Admission: {targetEvent.facilityName} ({targetEvent.createdAt})</p>
            </div>
          )}

          {/* Section 5.4 Segment Flow Visualization */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-mono font-bold text-slate-500 uppercase">2. Admission Segments Visualization</h3>
            <div className="space-y-2">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-400 block text-[10px]">SEGMENT 01 — INITIAL</span>
                  <span className="font-bold text-slate-900">{targetEvent?.facilityName || 'ABC Upazila Health Complex'}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">{targetEvent?.createdAt || '10:32 AM'}</span>
              </div>

              <div className="flex justify-center py-0.5">
                <div className="flex items-center space-x-2 text-[11px] font-mono text-indigo-700 font-bold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>Transfer Transition (`continueEvent`)</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-indigo-300 bg-indigo-50/40 text-xs flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-indigo-700 block text-[10px]">SEGMENT 02 — CONTINUED</span>
                  <span className="font-bold text-slate-900">{receivingFacility.name}</span>
                </div>
                <span className="text-[10px] font-mono text-indigo-700 font-bold">Today 15:40 PM</span>
              </div>
            </div>
          </div>

          {/* Section 5.3 Continuation Confirmation Banner */}
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs space-y-2 font-mono">
            <div className="font-bold text-indigo-900 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-indigo-700" />
              <span>CONTINUATION CONFIRMATION</span>
            </div>
            <p className="font-sans text-slate-700 leading-relaxed">
              This action will <strong>NOT</strong> create a new event. It will attach Segment 02 to <code className="font-bold text-indigo-900">{selectedEventId}</code>, preserving single event ceiling bounds across both facilities.
            </p>
          </div>

          {/* Transfer Form & Submission */}
          {!isConfirmed ? (
            <form onSubmit={handleContinueSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-600 mb-1 font-semibold">Receiving Hospital Facility:</label>
                <select
                  value={receivingFacility.id}
                  onChange={(e) =>
                    setReceivingFacility(MOCK_PROVIDERS.find((p) => p.id === e.target.value) || MOCK_PROVIDERS[1])
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-semibold"
                >
                  {MOCK_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.facilityType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 mb-1 font-semibold">Clinical Reason for Transfer:</label>
                <textarea
                  rows={3}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-sans"
                />
              </div>

              <Button type="submit" variant="primary" className="w-full" icon={<RotateCcw className="w-4 h-4" />}>
                Confirm & Sign Transfer Segment (`continueEvent`)
              </Button>
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-2 font-mono text-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="font-bold text-emerald-800 text-sm">TRANSFER ATTESTATION RECORDED ✓</p>
              <p className="text-slate-600 font-sans">
                Admission segment attached to <strong className="text-emerald-900">{selectedEventId}</strong> under receiving provider <strong className="text-emerald-900">{receivingFacility.name}</strong>.
              </p>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};
