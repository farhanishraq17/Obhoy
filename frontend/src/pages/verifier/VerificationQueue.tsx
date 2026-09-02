import React, { useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { QuorumIndicator } from '../../components/workflow/QuorumIndicator';
import { useSimulationStore } from '../../store/simulationStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import {
  FileCheck,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Building2,
  User,
  Stethoscope,
  CheckCircle2,
  Activity,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

export const VerificationQueue: React.FC = () => {
  const { currentRole, setRole, currentVerifier } = useAuthStore();
  const { events, attestEvent } = useSimulationStore();
  const { showToast } = useUIStore();

  const isClinical = currentRole === 'CLINICAL_VERIFIER';
  const verifierClass: 'CLINICAL' | 'FIELD' = isClinical ? 'CLINICAL' : 'FIELD';
  const verifierName = isClinical
    ? 'Dr. Anisur Rahman (Clinical Node)'
    : 'Salma Khatun (Field Bedside Verifier)';

  const [activeTab, setActiveTab] = useState<'QUEUE' | 'RECORDS'>('QUEUE');
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
  const [attestingId, setAttestingId] = useState<string | null>(null);

  // Filter events into Queue (requires attestation) vs Records (already attested by this verifier class)
  const queueEvents = events.filter(
    (evt) => !evt.attestations.some((a) => a.actorClass === verifierClass)
  );

  const recordEvents = events.filter((evt) =>
    evt.attestations.some((a) => a.actorClass === verifierClass)
  );

  const toggleExpand = (id: string) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAttest = async (eventId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAttestingId(eventId);
    try {
      const verifierId = currentVerifier?.verifierNumber || (isClinical ? 'VRF-CLIN-01' : 'VRF-FIELD-01');
      const result = await attestEvent(eventId, verifierId, verifierName, verifierClass);
      showToast(result.message, result.success ? 'success' : 'error');
      // Automatically keep the item expanded in records or notify user
      setExpandedEventIds((prev) => new Set([...prev, eventId]));
    } finally {
      setAttestingId(null);
    }
  };

  const currentDisplayList = activeTab === 'QUEUE' ? queueEvents : recordEvents;

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header with Verifier Identity and Class Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-xl border ${isClinical ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                {isClinical ? <Shield className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {isClinical ? 'Clinical Verifier Attestation Node' : 'Field Bedside Verifier Node'}
                </h1>
                <p className="text-xs text-slate-500 font-mono">
                  Attester: <span className="text-slate-800 font-bold">{verifierName}</span> ({currentVerifier?.verifierNumber || (isClinical ? 'VRF-CLIN-01' : 'VRF-FIELD-01')})
                </p>
              </div>
            </div>
          </div>

          {/* Quick Verifier Role Switcher */}
          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setRole('CLINICAL_VERIFIER')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                isClinical
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Clinical Verifier View
            </button>
            <button
              type="button"
              onClick={() => setRole('FIELD_VERIFIER')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                !isClinical
                  ? 'bg-white text-amber-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Field Verifier View
            </button>
          </div>
        </div>

        {/* Tab Switcher: Verification Queue vs Attestation Records */}
        <div className="flex items-center space-x-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('QUEUE')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'QUEUE'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Verification Queue</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'QUEUE' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {queueEvents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RECORDS')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'RECORDS'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Attestation Records</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'RECORDS' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {recordEvents.length}
            </span>
          </button>
        </div>

        {/* List of Events */}
        {currentDisplayList.length === 0 ? (
          <Card className="text-center py-16 space-y-2 text-slate-500 text-xs">
            <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
              <FileCheck className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">
              {activeTab === 'QUEUE'
                ? 'No events currently require your attestation.'
                : 'No signed attestation records found yet.'}
            </p>
            <p className="text-slate-400 max-w-sm mx-auto">
              {activeTab === 'QUEUE'
                ? 'All admitted hospital events have already been corroborated or signed.'
                : 'Events you attest will be saved and archived here.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {currentDisplayList.map((evt) => {
              const isExpanded = expandedEventIds.has(evt.id);
              const isAttesting = attestingId === evt.id;
              const myAttestation = evt.attestations.find((a) => a.actorClass === verifierClass);
              const validQuorumCount = evt.attestations.filter((a) => a.status === 'VALID').length;

              return (
                <Card
                  key={evt.id}
                  className={`border transition-all duration-200 ${
                    isExpanded
                      ? 'border-teal-400/80 shadow-md ring-1 ring-teal-500/10'
                      : 'border-slate-200 hover:border-teal-300 hover:shadow-xs'
                  }`}
                >
                  {/* COMPACT VIEW (COLLAPSED LIST ROW) */}
                  <div
                    onClick={() => toggleExpand(evt.id)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none bg-white hover:bg-slate-50/50 transition-colors rounded-xl"
                  >
                    <div className="flex items-start sm:items-center space-x-3.5">
                      <div
                        className={`p-2.5 rounded-xl border shrink-0 ${
                          myAttestation
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-teal-50 border-teal-200 text-teal-700'
                        }`}
                      >
                        {myAttestation ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Activity className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-teal-800 text-sm">{evt.id}</span>
                          <Badge variant={evt.status === 'CLOSED_ELIGIBLE' ? 'success' : 'info'}>
                            {evt.status}
                          </Badge>
                          {myAttestation && (
                            <Badge variant="success">Attested by You ✓</Badge>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {evt.diagnosisCategory}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-mono">
                          <span className="flex items-center space-x-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{evt.holderName}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{evt.facilityName}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Window: {evt.admissionWindow}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Quorum summary & Expand Toggle Button */}
                    <div className="flex items-center justify-between md:justify-end space-x-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                          Quorum State
                        </span>
                        <span
                          className={`text-xs font-mono font-bold ${
                            validQuorumCount >= 2 ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {validQuorumCount}/3 Quorum {validQuorumCount >= 2 ? '✓' : 'Pending'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800">
                        <span>{isExpanded ? 'Hide' : 'Details'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* EXTENDED DETAILED VIEW (SHOWN WHEN EXPANDED) */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-5 animate-fade-in bg-slate-50/40 rounded-b-xl">
                      {/* Diagnostic & Admission Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs font-mono">
                        <div className="p-3 bg-white border border-slate-200 rounded-lg">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            ICD-10 Pathology
                          </span>
                          <strong className="text-slate-900 block mt-0.5">
                            {evt.diagnosisCode || 'ICD-10-K35.8'}
                          </strong>
                        </div>

                        <div className="p-3 bg-white border border-slate-200 rounded-lg">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            Subject Commitment
                          </span>
                          <span className="text-teal-800 truncate block mt-0.5" title={evt.holderNIDCommitment}>
                            {evt.holderNIDCommitment.slice(0, 18)}...
                          </span>
                        </div>

                        <div className="p-3 bg-white border border-slate-200 rounded-lg">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            Admitting Provider
                          </span>
                          <span className="text-slate-800 truncate block mt-0.5">
                            {evt.facilityName}
                          </span>
                        </div>

                        <div className="p-3 bg-white border border-slate-200 rounded-lg">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            Episode Timestamp
                          </span>
                          <span className="text-slate-800 block mt-0.5">
                            {evt.createdAt || evt.admissionWindow}
                          </span>
                        </div>
                      </div>

                      {/* Quorum Matrix Indicator */}
                      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-mono font-bold uppercase text-slate-700 tracking-wider">
                            Multi-Class Attestation Quorum Matrix
                          </h4>
                          <span className="text-[11px] font-mono text-slate-500">
                            Requirement: 2-of-3 classes (Provider + Non-Payee)
                          </span>
                        </div>

                        <QuorumIndicator attestations={evt.attestations} />
                      </div>

                      {/* Action Bar / Record Confirmation */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        {myAttestation ? (
                          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono flex items-center space-x-2 flex-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Attested on-chain by <strong className="text-emerald-950">{myAttestation.actorName}</strong> ({myAttestation.timestamp}) • Ref: {myAttestation.evidenceRef || 'HMIS-VERIF-9912'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 font-mono">
                            Signing this assertion commits your non-payee credential signature to the ledger.
                          </div>
                        )}

                        {!myAttestation && (
                          <Button
                            variant="primary"
                            size="md"
                            disabled={isAttesting}
                            onClick={(e) => handleAttest(evt.id, e)}
                            icon={isClinical ? <FileCheck className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                            className={isClinical ? 'bg-indigo-600 hover:bg-indigo-700 border-indigo-600' : 'bg-teal-600 hover:bg-teal-700'}
                          >
                            {isAttesting
                              ? 'Signing Attestation...'
                              : isClinical
                              ? 'Sign Clinical Attestation'
                              : 'Sign Bedside Field Attestation'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

