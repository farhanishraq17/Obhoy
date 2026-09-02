import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useSimulationStore } from '../../store/simulationStore';
import { useUIStore } from '../../store/uiStore';
import {
  Scale,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  FileText,
  AlertTriangle,
  ArrowRight,
  Eye,
  X,
  History,
} from 'lucide-react';

export const AppealsMonitoring: React.FC = () => {
  const navigate = useNavigate();
  const { appeals, resolveAppeal } = useSimulationStore();
  const { showToast } = useUIStore();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'RESOLVED'>('ACTIVE');

  // Modal states
  const [reviewingAppeal, setReviewingAppeal] = useState<any | null>(null);
  const [viewingDecision, setViewingDecision] = useState<any | null>(null);
  const [tribunalVote, setTribunalVote] = useState<'OVERTURNED' | 'UPHELD'>('OVERTURNED');
  const [reasoning, setReasoning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter into strictly Active vs Resolved queues (Section 3)
  const activeAppeals = appeals.filter(
    (a) => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW'
  );
  const resolvedAppeals = appeals.filter(
    (a) => a.status === 'UPHELD' || a.status === 'OVERTURNED'
  );

  const handleRecordDecision = async () => {
    if (!reviewingAppeal) return;
    if (!reasoning.trim()) {
      showToast('Please provide tribunal reasoning for the record.', 'info');
      return;
    }

    setIsSubmitting(true);
    const res = await resolveAppeal(reviewingAppeal.id, tribunalVote, reasoning);
    setIsSubmitting(false);

    showToast(res.message, res.success ? 'success' : 'error');
    setReviewingAppeal(null);
    setReasoning('');
    setActiveTab('RESOLVED'); // Automatically transition view to Resolved queue
  };

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono uppercase font-bold text-teal-700 tracking-wider">
                IDRA STATUTORY TRIBUNAL
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-mono text-slate-500">Independent Dispute Arbitration</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Appeals Tribunal Docket
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Independent 3-member panels (Clinician + Consumer Advocate + IDRA) reviewing insurer claim denials
            </p>
          </div>

          <Link to="/regulator/audit">
            <Button variant="outline" size="sm" icon={<FileText className="w-4 h-4" />}>
              Audit Channel Logs
            </Button>
          </Link>
        </div>

        {/* Section 4: Dual Tabs (Active vs Resolved) */}
        <div className="flex space-x-2 border-b border-slate-200 pb-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'ACTIVE'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Active Appeals ({activeAppeals.length})
          </button>
          <button
            onClick={() => setActiveTab('RESOLVED')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'RESOLVED'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Resolved Appeals ({resolvedAppeals.length})
          </button>
        </div>

        {/* TAB 1: ACTIVE APPEALS */}
        {activeTab === 'ACTIVE' && (
          <div className="space-y-4">
            {activeAppeals.length === 0 ? (
              <Card className="text-center py-12 text-slate-500 text-xs font-mono space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                <p className="font-bold text-slate-700 text-sm">No Active Appeals in Queue</p>
                <p className="text-slate-400">All filed disputes have been reviewed and resolved by the tribunal.</p>
              </Card>
            ) : (
              activeAppeals.map((apl) => (
                <Card
                  key={apl.id}
                  className="p-5 space-y-4 border-amber-200 bg-amber-50/20 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-slate-900 text-lg">{apl.id}</span>
                        <Badge variant="warning">UNDER REVIEW</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-600">
                        <span>Entitlement: <strong className="text-teal-700">{apl.entitlementId}</strong></span>
                        <span>•</span>
                        <span>Claimant: <strong className="text-slate-800">{apl.holderName}</strong></span>
                        <span>•</span>
                        <span>Insurer: <strong className="text-slate-800">{apl.insurerName || 'Green Delta Insurance PLC'}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 justify-between sm:justify-end">
                      <div className="text-right text-xs font-mono text-slate-500 hidden sm:block">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">Original Decision</span>
                        <span className="text-rose-600 font-bold">DENIED</span>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setReviewingAppeal(apl);
                          setReasoning(
                            'Independent clinical panel found sufficient pathology evidence that the admission event satisfied the policy coverage terms.'
                          );
                        }}
                        icon={<Scale className="w-4 h-4" />}
                      >
                        Review Appeal
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs font-mono">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Grounds for Appeal:</span>
                    <p className="text-slate-800 mt-0.5">{apl.reason}</p>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* TAB 2: RESOLVED APPEALS (Section 8) */}
        {activeTab === 'RESOLVED' && (
          <div className="space-y-4">
            {resolvedAppeals.length === 0 ? (
              <Card className="text-center py-12 text-slate-500 text-xs font-mono">
                No past resolved appeals on record yet.
              </Card>
            ) : (
              resolvedAppeals.map((apl) => (
                <Card
                  key={apl.id}
                  className="p-5 space-y-3 border-slate-200 shadow-xs hover:border-teal-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900 text-base">{apl.id}</span>
                        <Badge variant={apl.status === 'OVERTURNED' ? 'success' : 'error'}>
                          {apl.status}
                        </Badge>
                        <span className="text-xs font-mono text-slate-400">•</span>
                        <span className="text-xs font-mono text-teal-800 font-semibold">{apl.entitlementId}</span>
                      </div>
                      <div className="text-xs font-mono text-slate-500 mt-1">
                        Insurer: <strong className="text-slate-700">{apl.insurerName || 'Green Delta Insurance PLC'}</strong> • Resolved: {apl.resolvedAt || '01 Sep 2026'}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingDecision(apl)}
                      icon={<Eye className="w-3.5 h-3.5" />}
                    >
                      View Decision
                    </Button>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl text-xs font-mono text-slate-700 flex justify-between items-center">
                    <span>
                      Outcome: <strong className={apl.status === 'OVERTURNED' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                        {apl.status === 'OVERTURNED' ? 'ENTITLEMENT RE-INSTATED' : 'DENIAL UPHELD'}
                      </strong>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Ledger Record: {apl.id}-DECISION</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Section 5 & 6: Appeal Review Modal */}
        {reviewingAppeal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <Card className="max-w-xl w-full p-6 space-y-5 border-2 border-teal-500 shadow-xl">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <Badge variant="purple">APPEAL ARBITRATION REVIEW</Badge>
                  <h3 className="text-xl font-mono font-black text-slate-900 mt-1">
                    {reviewingAppeal.id}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    Entitlement: {reviewingAppeal.entitlementId} • Claimant: {reviewingAppeal.holderName}
                  </span>
                </div>
                <button onClick={() => setReviewingAppeal(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Case Details */}
              <div className="space-y-2 text-xs font-mono">
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-1">
                  <span className="text-rose-900 font-bold block uppercase text-[10px]">
                    Original Insurer Decision: DENIED
                  </span>
                  <p className="text-rose-800">
                    <strong>Denial Reason Code:</strong> {reviewingAppeal.denialReason || 'PRE_EXISTING_CONDITION / POLICY_EXCLUSION'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 uppercase text-[10px] font-bold block">
                    Grounds for Appeal Filed by Claimant:
                  </span>
                  <p className="text-slate-900 mt-0.5">{reviewingAppeal.reason}</p>
                </div>
              </div>

              {/* Section 5: Tribunal Panel Composition */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs font-mono">
                <span className="text-indigo-950 font-bold uppercase text-[10px] block">
                  Tribunal Panel Composition (Article IX)
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="p-2 bg-white rounded border border-indigo-100 text-[11px] text-slate-800">
                    ✓ Independent Clinician
                  </div>
                  <div className="p-2 bg-white rounded border border-indigo-100 text-[11px] text-slate-800">
                    ✓ Consumer Rep
                  </div>
                  <div className="p-2 bg-white rounded border border-indigo-100 text-[11px] text-slate-800">
                    ✓ IDRA Legal Officer
                  </div>
                </div>
                <p className="text-[11px] text-emerald-800 font-semibold pt-1">
                  ✓ Conflict check verified: No panel member affiliated with {reviewingAppeal.insurerName || 'the denying insurer'}.
                </p>
              </div>

              {/* Section 6: Tribunal Decision Form */}
              <div className="space-y-3 text-xs font-mono">
                <span className="font-bold text-slate-800 uppercase text-[10px] block">
                  Arbitration Decision
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setTribunalVote('OVERTURNED')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      tribunalVote === 'OVERTURNED'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    ○ Overturn Insurer Denial (Re-instate Claim)
                  </div>
                  <div
                    onClick={() => setTribunalVote('UPHELD')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      tribunalVote === 'UPHELD'
                        ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    ○ Uphold Insurer Denial
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                    Tribunal Decision Reasoning (Permanent Ledger Record) *
                  </label>
                  <textarea
                    rows={3}
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none"
                    placeholder="Document clinical and contract findings justifying the panel decision..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setReviewingAppeal(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRecordDecision}
                  disabled={isSubmitting}
                  icon={<Scale className="w-4 h-4" />}
                >
                  {isSubmitting ? 'Recording on Ledger...' : 'Record Decision & Resolve'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Section 9: Resolved Appeal Detail Modal */}
        {viewingDecision && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <Card className="max-w-lg w-full p-6 space-y-4 border-2 border-slate-300 shadow-xl">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <Badge variant={viewingDecision.status === 'OVERTURNED' ? 'success' : 'error'}>
                    FINAL TRIBUNAL DECISION
                  </Badge>
                  <h3 className="text-xl font-mono font-black text-slate-900 mt-1">
                    {viewingDecision.id}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    Entitlement: {viewingDecision.entitlementId}
                  </span>
                </div>
                <button onClick={() => setViewingDecision(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] block">ORIGINAL DECISION</span>
                    <strong className="text-rose-600">DENIED</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">TRIBUNAL OUTCOME</span>
                    <strong className={viewingDecision.status === 'OVERTURNED' ? 'text-emerald-700' : 'text-slate-800'}>
                      {viewingDecision.status === 'OVERTURNED' ? 'RE-INSTATED' : 'DENIAL UPHELD'}
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Recorded Reasoning</span>
                  <p className="text-slate-900 mt-1 leading-relaxed">
                    {viewingDecision.decision || 'Independent panel found sufficient clinical evidence that the emergency admission met policy terms.'}
                  </p>
                </div>

                <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600 text-[11px] flex justify-between">
                  <span>Ledger Record ID:</span>
                  <span className="font-bold">{viewingDecision.id}-DECISION</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <Link to="/regulator/audit">
                  <Button variant="outline" size="sm" icon={<FileText className="w-3.5 h-3.5" />}>
                    View in Audit Channel
                  </Button>
                </Link>
                <Button variant="primary" size="sm" onClick={() => setViewingDecision(null)}>
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
