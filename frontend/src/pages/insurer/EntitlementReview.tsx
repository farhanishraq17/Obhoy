import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useSimulationStore } from '../../store/simulationStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { formatBDT } from '../../lib/format';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  FileText,
  AlertTriangle,
  Building,
  Activity,
  Layers,
  HelpCircle,
  Send,
  Lock,
} from 'lucide-react';

export const EntitlementReview: React.FC = () => {
  const { entitlementId, eventId } = useParams<{ entitlementId?: string; eventId?: string }>();
  const navigate = useNavigate();
  const { currentInsurer } = useAuthStore();
  const {
    entitlements,
    events,
    policies,
    authorizeEntitlement,
    denyEntitlement,
    submitAppeal,
  } = useSimulationStore();
  const { showToast } = useUIStore();

  // Find target entitlement or create demo instance
  const ent =
    entitlements.find((e) => e.id === entitlementId || e.eventId === eventId) ||
    entitlements[0] || {
      id: entitlementId || 'ENT-9592',
      eventId: eventId || 'EVT-8187',
      policyId: 'POL-1001',
      insurerId: 'INS-001',
      insurerName: currentInsurer.name,
      amount: 50000,
      status: 'OPEN' as const,
    };

  const parentEvent =
    events.find((e) => e.id === ent.eventId) ||
    events[0] || {
      id: 'EVT-8187',
      facilityName: 'ABC Upazila Health Complex',
      diagnosisCategory: 'Acute Appendicitis Hospitalization',
      status: 'CLOSED_ELIGIBLE',
      holderName: 'Rahim Uddin',
    };

  const policy =
    policies.find((p) => p.id === ent.policyId) ||
    policies[0] || {
      id: 'POL-1001',
      status: 'ACTIVE',
      product: 'Shurakkha Micro-Health Protection',
      scheduleVersion: 'v1.2',
      benefitCap: 50000,
    };

  // Form states
  const [decision, setDecision] = useState<'AUTHORIZE' | 'DENY'>('AUTHORIZE');
  const [denialReason, setDenialReason] = useState('Policy exclusion');
  const [denialExplanation, setDenialExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTechDrawer, setShowTechDrawer] = useState(false);

  const handleAuthorize = async () => {
    setIsSubmitting(true);
    const res = await authorizeEntitlement(ent.id, ent.amount || 50000);
    setIsSubmitting(false);
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const handleDeny = async () => {
    if (!denialExplanation.trim()) {
      showToast('Please provide an explanation for the denial.', 'info');
      return;
    }
    setIsSubmitting(true);
    const res = await denyEntitlement(ent.id, denialReason, denialExplanation);
    setIsSubmitting(false);
    showToast(res.message, res.success ? 'info' : 'error');
  };

  const handleSimulateAppeal = async () => {
    const res = await submitAppeal(ent.id, `Claimant disputes denial reason: ${denialReason}`);
    showToast(res.message, 'info');
    navigate('/regulator/appeals');
  };

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-500">
          <div className="flex items-center space-x-2">
            <Link to="/insurer/queue" className="hover:text-teal-700 font-bold">
              ← Eligible Claims Queue
            </Link>
            <span>/</span>
            <span>Entitlement Adjudication</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Insurer Review Gate</span>
        </div>

        {/* 17. Adjudication Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono uppercase font-bold text-teal-700 tracking-wider">
                ENTITLEMENT ADJUDICATION
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-xs text-slate-500">{currentInsurer.name}</span>
            </div>
            <div className="flex items-center space-x-3 mt-1">
              <h1 className="text-2xl font-mono font-black text-slate-900">{ent.id}</h1>
              <Badge
                variant={
                  ent.status === 'AUTHORIZED'
                    ? 'success'
                    : ent.status === 'DENIED'
                    ? 'error'
                    : ent.status === 'SETTLED'
                    ? 'info'
                    : 'warning'
                }
              >
                {ent.status === 'OPEN' ? 'PENDING ADJUDICATION' : ent.status}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 text-xs font-mono text-slate-500 mt-2">
              <span>Event: <strong className="text-teal-700">{ent.eventId}</strong></span>
              <span>•</span>
              <span>Policy: <strong className="text-slate-800">{ent.policyId}</strong></span>
              <span>•</span>
              <span>Beneficiary: <strong className="text-slate-800">{parentEvent.holderName || 'Rahim Uddin'}</strong></span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Assessed Value</span>
            <div className="text-2xl font-mono font-black text-emerald-700">
              {formatBDT(ent.amount || 50000)}
            </div>
          </div>
        </div>

        {/* 18. Event Verification Summary & Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card A: Verification Summary */}
          <Card className="p-5 space-y-4 border-teal-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                  Event Verification Summary
                </h2>
              </div>
              <Badge variant="success">CLOSED_ELIGIBLE ✓</Badge>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Admitting Facility:</span>
                <span className="font-semibold text-slate-900">{parentEvent.facilityName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Accreditation:</span>
                <span className="text-emerald-700 font-bold">ACTIVE ✓ (DGHS Accredited)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Diagnosis:</span>
                <span className="font-semibold text-slate-800">{parentEvent.diagnosisCategory}</span>
              </div>
            </div>

            {/* Attestations Matrix */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                2-of-3 Multi-Class Attestations Quorum
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="block text-[10px] text-emerald-800 font-bold">Provider</span>
                  <span className="text-emerald-700 font-extrabold">✓ Attested</span>
                </div>
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="block text-[10px] text-emerald-800 font-bold">Clinical Verifier</span>
                  <span className="text-emerald-700 font-extrabold">✓ Attested</span>
                </div>
                <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg">
                  <span className="block text-[10px] text-slate-500 font-bold">Field Verifier</span>
                  <span className="text-slate-400 font-medium">— (Not required)</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-600">
                <span>Quorum Status: <strong className="text-emerald-700">2 / 3 Satisfied ✓</strong></span>
                <span>Non-Payee Class: <strong className="text-emerald-700">Satisfied ✓</strong></span>
              </div>
            </div>
          </Card>

          {/* Card B: Verification Timeline */}
          <Card className="p-5 space-y-4 border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                  Verification Stepper
                </h2>
              </div>
              <button
                onClick={() => setShowTechDrawer(!showTechDrawer)}
                className="text-[11px] font-mono text-teal-700 hover:underline inline-flex items-center space-x-1 font-bold"
              >
                <span>{showTechDrawer ? 'Hide Details' : 'View Protocol Details'}</span>
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              {[
                { label: 'Event asserted by provider', done: true },
                { label: 'Provider MSP signature authenticated', done: true },
                { label: 'Uniqueness check passed on admission window', done: true },
                { label: 'Provider attestation signature validated', done: true },
                { label: 'Clinical verifier HMIS pathology attestation', done: true },
                { label: '2-of-3 quorum condition reached', done: true },
                { label: 'State transitioned to CLOSED_ELIGIBLE', done: true },
              ].map((step, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-slate-800 text-[11px]">{step.label}</span>
                </div>
              ))}
            </div>

            {showTechDrawer && (
              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono space-y-1 animate-fade-in">
                <div className="text-teal-400 font-bold">Simulated Consensus Protocol Payload:</div>
                <div className="text-slate-400">EventKey: 0x8a91c4b7e2d09f31</div>
                <div className="text-slate-400">QuorumEndorsementMSP: [ProviderMSP, ClinicalMSP]</div>
                <div className="text-slate-400">LedgerCommitTx: 0x7710fa99002341bcef</div>
              </div>
            )}
          </Card>
        </div>

        {/* 20 & 21. Policy Information & Eligibility Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-5 space-y-3 border-slate-200">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
              Policy Information
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 text-[10px] block">POLICY ID</span>
                <span className="font-bold text-slate-900">{policy.id}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">STATUS</span>
                <span className="text-emerald-700 font-bold">ACTIVE ✓</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">PRODUCT</span>
                <span className="text-slate-800 font-semibold">{policy.product}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">BENEFIT SCHEDULE</span>
                <span className="text-slate-800 font-semibold">{policy.scheduleVersion}</span>
              </div>
              <div className="col-span-2 pt-1 border-t border-slate-200 flex justify-between">
                <span className="text-slate-500">Maximum Benefit Cap:</span>
                <strong className="text-emerald-700">{formatBDT(policy.benefitCap)}</strong>
              </div>
            </div>
          </Card>

          {/* 21. Eligibility Result */}
          <Card className="p-5 space-y-3 border-emerald-200 bg-emerald-50/30">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-900">
                Automated Eligibility Check
              </h2>
              <Badge variant="success">All Checks Passed</Badge>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono text-slate-700 pt-1">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Policy active</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Covered category</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Event verified</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Quorum satisfied</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Benefit schedule match</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Non-duplicate window</span>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-700">Eligible Adjudication Amount:</span>
              <span className="text-xl font-mono font-black text-emerald-800">
                {formatBDT(ent.amount || 50000)}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Verification by medical nodes validates the episode; the insurer retains fiduciary adjudication discretion.
            </p>
          </Card>
        </div>

        {/* 22. Adjudication Decision Card */}
        {ent.status === 'OPEN' ? (
          <Card className="p-6 space-y-6 border-2 border-teal-500/40 shadow-md">
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900">
                Adjudication Decision Form
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Record your decision as authorized underwriting officer for {currentInsurer.name}.
              </p>
            </div>

            {/* Decision Radio Selector */}
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => setDecision('AUTHORIZE')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  decision === 'AUTHORIZE'
                    ? 'border-emerald-600 bg-emerald-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      decision === 'AUTHORIZE' ? 'border-emerald-600' : 'border-slate-400'
                    }`}
                  >
                    {decision === 'AUTHORIZE' && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                  </div>
                  <span className="text-sm font-bold text-slate-900">Authorize Entitlement</span>
                </div>
                <p className="text-xs text-slate-600 font-mono mt-2">
                  Approve disbursement of full benefit {formatBDT(ent.amount || 50000)} to member mobile wallet.
                </p>
              </div>

              <div
                onClick={() => setDecision('DENY')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  decision === 'DENY'
                    ? 'border-rose-600 bg-rose-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      decision === 'DENY' ? 'border-rose-600' : 'border-slate-400'
                    }`}
                  >
                    {decision === 'DENY' && <div className="w-2 h-2 rounded-full bg-rose-600" />}
                  </div>
                  <span className="text-sm font-bold text-slate-900">Deny Entitlement</span>
                </div>
                <p className="text-xs text-slate-600 font-mono mt-2">
                  Record policy exclusion or clause non-compliance. Claimant may appeal to IDRA Tribunal.
                </p>
              </div>
            </div>

            {/* Conditional Sub-form */}
            {decision === 'AUTHORIZE' ? (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-emerald-900">Authorized Benefit Payout:</span>
                  <span className="text-2xl font-mono font-black text-emerald-800">
                    {formatBDT(ent.amount || 50000)}
                  </span>
                </div>
                <Button
                  variant="primary"
                  onClick={handleAuthorize}
                  disabled={isSubmitting}
                  className="w-full py-3 text-sm font-bold bg-emerald-600 hover:bg-emerald-700"
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {isSubmitting ? 'Signing Authorization on Blockchain...' : `Authorize ${formatBDT(ent.amount || 50000)}`}
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1 uppercase">
                    Denial Reason Code *
                  </label>
                  <select
                    value={denialReason}
                    onChange={(e) => setDenialReason(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none"
                  >
                    <option value="Policy exclusion">Policy exclusion</option>
                    <option value="Pre-existing condition">Pre-existing condition (undeclared)</option>
                    <option value="Waiting period">Waiting period not elapsed</option>
                    <option value="Inactive policy">Inactive policy coverage</option>
                    <option value="Benefit exhausted">Annual aggregate benefit exhausted</option>
                    <option value="Other">Other compliance exception</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1 uppercase">
                    Adjudication Explanation *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={denialExplanation}
                    onChange={(e) => setDenialExplanation(e.target.value)}
                    placeholder="Provide specific underwriting rationale for public and tribunal review..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none font-mono"
                  />
                </div>

                <Button
                  variant="danger"
                  onClick={handleDeny}
                  disabled={isSubmitting}
                  className="w-full py-3 text-sm font-bold"
                  icon={<XCircle className="w-4 h-4" />}
                >
                  {isSubmitting ? 'Recording Denial on Blockchain...' : 'Confirm Denial of Entitlement'}
                </Button>
              </div>
            )}
          </Card>
        ) : ent.status === 'AUTHORIZED' ? (
          /* 23. Authorization Result Card */
          <Card className="p-6 bg-emerald-50/70 border-2 border-emerald-500 space-y-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-900">ENTITLEMENT AUTHORIZED ✓</h3>
                <p className="text-xs text-emerald-700 font-mono">
                  Benefit approved for immediate mobile financial disbursement.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3.5 bg-white rounded-xl border border-emerald-200 text-xs font-mono">
              <div>
                <span className="text-slate-400 text-[10px] block">AMOUNT</span>
                <strong className="text-emerald-700">{formatBDT(ent.amount || 50000)}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">POLICY</span>
                <span className="text-slate-800">{ent.policyId}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">SETTLEMENT STATUS</span>
                <span className="text-amber-700 font-bold">READY FOR DISBURSEMENT</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link to="/insurer/queue" className="text-xs text-slate-500 font-mono hover:text-teal-700">
                ← Back to Claims Queue
              </Link>
              <Link to="/insurer/settlement">
                <Button variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
                  Proceed to Settlement Processing
                </Button>
              </Link>
            </div>
          </Card>
        ) : ent.status === 'DENIED' ? (
          /* 24. Denial Result Card */
          <Card className="p-6 bg-rose-50/70 border-2 border-rose-400 space-y-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-rose-900">ENTITLEMENT DENIED</h3>
                <p className="text-xs text-rose-700 font-mono">
                  Recorded permanently on audit ledger. Denial reasons published by category.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-rose-200 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Denial Reason:</span>
                <strong className="text-rose-800">{ent.denialReason || denialReason}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Policyholder Notification:</span>
                <span className="text-emerald-700 font-bold">Sent via SMS & In-App Notice ✓</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link to="/insurer/queue" className="text-xs text-slate-500 font-mono hover:text-teal-700">
                ← Back to Claims Queue
              </Link>
              <Button
                variant="outline"
                onClick={handleSimulateAppeal}
                icon={<Send className="w-3.5 h-3.5" />}
                className="text-indigo-700 border-indigo-300 hover:bg-indigo-50"
              >
                Simulate Policyholder Appeal to IDRA Tribunal
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-4 text-center text-xs font-mono text-slate-500">
            This claim is already finalized and {ent.status}.
          </Card>
        )}
      </div>
    </PageContainer>
  );
};
