import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { MOCK_USERS } from '../../data/users';
import { UserProfile } from '../../types/actor';
import {
  Search,
  UserCheck,
  ShieldCheck,
  Lock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  FileText,
  AlertCircle,
  HelpCircle,
  XCircle,
} from 'lucide-react';

type LookupStatus =
  | 'IDLE'
  | 'SEARCHING'
  | 'IDENTITY_RESOLVED'
  | 'FOUND'
  | 'MULTIPLE_POLICIES'
  | 'NO_ACTIVE_POLICY'
  | 'NOT_FOUND'
  | 'ACCESS_RESTRICTED';

export const PatientLookup: React.FC = () => {
  const navigate = useNavigate();

  const [searchNID, setSearchNID] = useState('');
  const [status, setStatus] = useState<LookupStatus>('IDLE');
  const [resolvedPatient, setResolvedPatient] = useState<UserProfile | null>(null);
  const [showDiagram, setShowDiagram] = useState(false);
  const [showCoverageModal, setShowCoverageModal] = useState(false);

  const handleVerify = (e?: React.FormEvent, presetNID?: string) => {
    if (e) e.preventDefault();
    const query = presetNID || searchNID;
    if (!query.trim()) return;

    setStatus('SEARCHING');
    setResolvedPatient(null);

    // Simulate 2-step resolution sequence
    setTimeout(() => {
      setStatus('IDENTITY_RESOLVED');

      setTimeout(() => {
        const found = MOCK_USERS.find((u) => u.nid === query || u.policyId === query);

        if (!found) {
          if (query === '99999999999999999') {
            setStatus('NO_ACTIVE_POLICY');
          } else {
            setStatus('NOT_FOUND');
          }
        } else {
          setResolvedPatient(found);
          if (found.id === 'USR-RAHIM-1001') {
            setStatus('MULTIPLE_POLICIES');
          } else {
            setStatus('FOUND');
          }
        }
      }, 700);
    }, 600);
  };

  const handleProceedToAssert = () => {
    if (!resolvedPatient) return;
    navigate('/provider/assert-event', { state: { patient: resolvedPatient } });
  };

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Badge variant="info">Digital Identity Resolution</Badge>
          <h1 className="text-2xl font-extrabold text-slate-900">Patient Identity Lookup</h1>
          <p className="text-xs text-slate-500">
            Verify beneficiary coverage before asserting a hospital admission event.
          </p>
        </div>

        {/* Search Interface (Section 4) */}
        <Card className="p-6 space-y-4">
          <form onSubmit={(e) => handleVerify(e)} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-mono font-semibold text-slate-700">
                Enter Beneficiary National ID (NID) or Policy ID:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchNID}
                  onChange={(e) => setSearchNID(e.target.value)}
                  placeholder="e.g. Enter NID number (or select sample below)..."
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-teal-600"
                />
                <Button type="submit" variant="primary" icon={<Search className="w-4 h-4" />}>
                  Verify Identity
                </Button>
              </div>
            </div>

            {/* Test Presets bar */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <span className="text-slate-500 text-[11px]">Quick Test Beneficiaries:</span>
              <div className="flex flex-wrap gap-2">
                {MOCK_USERS.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSearchNID(u.nid);
                      handleVerify(undefined, u.nid);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 text-[11px] transition-colors border border-slate-200"
                  >
                    {u.name} ({u.nid.slice(0, 4)}...)
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSearchNID('99999999999999999');
                    handleVerify(undefined, '99999999999999999');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 text-[11px] border border-amber-200 font-medium"
                >
                  Uninsured NID
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchNID('00000000000000000');
                    handleVerify(undefined, '00000000000000000');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 hover:bg-rose-100 text-[11px] border border-rose-200 font-medium"
                >
                  Not Found NID
                </button>
              </div>
            </div>
          </form>
        </Card>


        {/* Lookup Processing Animation (Section 5) */}
        {(status === 'SEARCHING' || status === 'IDENTITY_RESOLVED') && (
          <Card className="p-6 text-center space-y-4 font-mono text-xs animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-200 animate-spin">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 uppercase">RESOLVING BENEFICIARY COVERAGE...</h3>
            <div className="max-w-md mx-auto space-y-1.5 text-left bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px] text-slate-700">
              <p className="text-emerald-700 font-semibold">✓ Provider credential verified</p>
              <p className="text-emerald-700 font-semibold">✓ Secure identity lookup initiated</p>
              <p className="text-emerald-700 font-semibold">✓ NID processed into Subject Commitment</p>
              {status === 'IDENTITY_RESOLVED' && (
                <>
                  <p className="text-emerald-700 font-semibold">✓ Active policy records located</p>
                  <p className="text-teal-700 font-bold">✓ Provider role permissions validated</p>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Outcome: Patient Found / Multiple Policies (Section 7 & 8) */}
        {(status === 'FOUND' || status === 'MULTIPLE_POLICIES') && resolvedPatient && (
          <div className="space-y-6 animate-fade-in">
            <Card className="p-6 space-y-6 border-teal-200 glow-teal">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-200">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-bold text-slate-900">{resolvedPatient.name}</h2>
                      <Badge variant="success">Identity Verified ✓</Badge>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      Subject Reference: <strong className="text-slate-800">{resolvedPatient.subjectReference}</strong>
                    </p>
                  </div>
                </div>
                <Badge variant="info">{resolvedPatient.mfi}</Badge>
              </div>

              {/* Active Policies Cards */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold text-slate-500 uppercase">
                  Active Policy Records ({status === 'MULTIPLE_POLICIES' ? '2' : '1'})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-teal-700">{resolvedPatient.policyId}</span>
                      <Badge variant="success">ACTIVE ✓</Badge>
                    </div>
                    <p className="text-slate-900 font-bold font-sans">Green Delta Insurance PLC</p>
                    <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                      <p>Category: Hospitalization Cover</p>
                      <p>Cap: BDT 50,000</p>
                    </div>
                  </div>

                  {status === 'MULTIPLE_POLICIES' && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-indigo-700">POL-2001</span>
                        <Badge variant="purple">ACTIVE (DUAL COVER)</Badge>
                      </div>
                      <p className="text-slate-900 font-bold font-sans">Pragati Insurance Ltd</p>
                      <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                        <p>Category: Supplementary Health</p>
                        <p>Cap: BDT 30,000</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {status === 'MULTIPLE_POLICIES' && (
                <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-mono">
                  💡 <strong>System Note:</strong> Multiple active policies belong to the same verified beneficiary. Policies remain separate entitlements; hospital assertions record 1 shared event asset.
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCoverageModal(true)}
                  icon={<FileText className="w-4 h-4 text-teal-600" />}
                >
                  View Coverage Details
                </Button>
                <Button variant="primary" onClick={handleProceedToAssert} icon={<ArrowRight className="w-4 h-4" />}>
                  Assert New Event
                </Button>
              </div>
            </Card>

            {/* Privacy Boundaries Notice (Section 9) */}
            <Card className="p-4 bg-slate-50 border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="flex items-center space-x-2 text-slate-800 font-bold">
                <Lock className="w-4 h-4 text-teal-600" />
                <span>Provider Role Access Boundaries</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 font-mono">
                <div className="text-emerald-700">✓ Permitted: Identity status, policy status, coverage category</div>
                <div className="text-slate-500">✗ Protected: Raw NID, detailed clinical notes, financial MFS info</div>
              </div>
            </Card>
          </div>
        )}

        {/* Outcome: No Active Policy (Section 10) */}
        {status === 'NO_ACTIVE_POLICY' && (
          <Card className="p-6 text-center space-y-4 border-amber-200 bg-amber-50/20 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-amber-900">IDENTITY VERIFIED — NO ACTIVE POLICY FOUND</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Beneficiary identity commitment resolved successfully, but no active insurance policy was found for this NID.
            </p>
            <Button variant="outline" onClick={() => setStatus('IDLE')}>
              Search Another Patient
            </Button>
          </Card>
        )}

        {/* Outcome: Not Found (Section 11) */}
        {status === 'NOT_FOUND' && (
          <Card className="p-6 text-center space-y-4 border-rose-200 bg-rose-50/20 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <XCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-rose-900">BENEFICIARY NOT FOUND</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              No matching identity could be resolved from the provided NID. Please verify the NID number and try again.
            </p>
            <Button variant="outline" onClick={() => setStatus('IDLE')}>
              Try Again
            </Button>
          </Card>
        )}
      </div>

      {/* View Coverage Modal (Section 14) */}
      <Modal
        isOpen={showCoverageModal}
        onClose={() => setShowCoverageModal(false)}
        title="Beneficiary Coverage Schedule Details"
      >
        {resolvedPatient && (
          <div className="space-y-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 space-y-1">
              <span className="font-bold block text-sm">{resolvedPatient.name}</span>
              <span>Subject Ref: {resolvedPatient.subjectReference}</span>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-700 uppercase text-[11px]">Policy POL-1001</h4>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Insurer:</span>
                  <span className="font-bold text-slate-900">Green Delta Insurance PLC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Coverage Type:</span>
                  <span className="text-teal-700 font-bold">Catastrophic Hospitalization</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Effective Date:</span>
                  <span className="text-slate-700">01 Jan 2026</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expiry Date:</span>
                  <span className="text-slate-700">31 Dec 2026</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};
