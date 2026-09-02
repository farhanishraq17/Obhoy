import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useSimulationStore } from '../../store/simulationStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { MOCK_USERS } from '../../data/users';
import { UserProfile } from '../../types/actor';
import { Stethoscope, ShieldAlert, CheckCircle2, Lock, ArrowRight, RotateCcw, Cpu, UserCheck } from 'lucide-react';
import { computeEventKey } from '../../lib/ids';

export const AssertEvent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProvider } = useAuthStore();
  const { events, openEvent, attestEvent } = useSimulationStore();
  const { showToast } = useUIStore();

  // Pick patient passed from Patient Lookup or let user select
  const passedPatient = (location.state as { patient?: UserProfile })?.patient;
  const [selectedUser, setSelectedUser] = useState<UserProfile>(passedPatient || MOCK_USERS[0]);

  const [activeStepIndex, setActiveStepIndex] = useState<1 | 2 | 3 | 4>(1);
  const [admissionTimestamp, setAdmissionTimestamp] = useState('2026-09-01T10:32');
  const [diagnosisCategory, setDiagnosisCategory] = useState('Acute Appendicitis Hospitalization');
  const [diagnosisCode, setDiagnosisCode] = useState('ICD-10-K35.8');
  
  const [isCheckingUniqueness, setIsCheckingUniqueness] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [duplicateEvent, setDuplicateEvent] = useState<typeof events[0] | null>(null);

  const handleAssert = async () => {
    setActiveStepIndex(3);
    setIsCheckingUniqueness(true);

    try {
      const result = await openEvent(selectedUser, currentProvider, diagnosisCode, diagnosisCategory, admissionTimestamp);
      setIsCheckingUniqueness(false);

      const inputWindow = admissionTimestamp
        ? (admissionTimestamp.includes('T') ? admissionTimestamp.split('T')[0] : admissionTimestamp.slice(0, 10))
        : '';

      if (!result.success) {
        const matching = events.find(
          (e) => (e.admissionWindow === inputWindow || e.eventKey === computeEventKey(selectedUser.nidCommitment, inputWindow)) &&
                 (e.status === 'OPEN' || e.status === 'CLOSED_ELIGIBLE')
        ) || events.find((e) => e.admissionWindow === inputWindow) || {
          id: 'EVT-DUP',
          eventKey: computeEventKey(selectedUser.nidCommitment, inputWindow),
          holderId: selectedUser.id,
          holderName: selectedUser.name,
          holderNIDCommitment: selectedUser.nidCommitment,
          admissionWindow: inputWindow,
          providerId: currentProvider.id,
          facilityName: currentProvider.name,
          status: 'CLOSED_ELIGIBLE',
          diagnosisCategory,
          diagnosisCode,
          segments: [],
          attestations: [],
          timeline: [],
          createdAt: new Date().toISOString(),
        };

        setDuplicateEvent(matching);
        setActiveStepIndex(4);
        showToast(result.message || 'Duplicate admission detected! Refused at commit by blockchain invariant.', 'error');
      } else {
        setCreatedEventId(result.eventId || 'EVT-1001');
        setDuplicateEvent(null);
        setActiveStepIndex(4);
        showToast(`Event ${result.eventId} successfully created on ledger!`, 'success');
      }
    } catch (err: any) {
      setIsCheckingUniqueness(false);
      showToast(err.message || 'Failed to open event', 'error');
      setActiveStepIndex(2);
    }
  };

  const handleAttestEvent = async () => {
    if (!createdEventId) return;
    const result = await attestEvent(createdEventId, currentProvider.id, currentProvider.name, 'PROVIDER');
    showToast(result.message, result.success ? 'success' : 'error');
  };

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="info">Hospital Admission Assertion</Badge>
          <h1 className="text-2xl font-extrabold text-slate-900">Assert New Insurable Event</h1>
          <p className="text-xs text-slate-500">
            Admitting Facility: <span className="text-teal-700 font-bold">{currentProvider.name}</span> ({currentProvider.facilityType})
          </p>
        </div>

        {/* Stepper Progress Header */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
          {[
            { idx: 1, label: '1 Patient' },
            { idx: 2, label: '2 Admission' },
            { idx: 3, label: '3 Uniqueness' },
            { idx: 4, label: '4 Created' },
          ].map((st) => (
            <div
              key={st.idx}
              className={`p-2.5 rounded-xl border transition-all ${
                activeStepIndex === st.idx
                  ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-600/20 border-teal-600'
                  : activeStepIndex > st.idx
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                  : 'bg-white text-slate-400 border-slate-200'
              }`}
            >
              <span>{st.label}</span>
            </div>
          ))}
        </div>

        {/* Main Content Box */}
        <Card className="p-6 space-y-6">
          {/* Step 1 & Step 2 Details */}
          {activeStepIndex <= 2 && (
            <div className="space-y-6">
              {/* Patient Selection Header */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-mono text-[10px] uppercase font-bold">1. Selected Beneficiary</span>
                  <Link to="/provider/patient" className="text-teal-700 hover:underline font-mono text-[11px]">
                    Change Patient Lookup →
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-500 font-mono mb-1">Verified Beneficiary:</label>
                    <select
                      value={selectedUser.id}
                      onChange={(e) => {
                        const matched = MOCK_USERS.find((u) => u.id === e.target.value) || MOCK_USERS[0];
                        setSelectedUser(matched);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-bold"
                    >
                      {MOCK_USERS.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.policyId} • {u.mfi})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-mono mb-1">Subject Commitment Reference:</label>
                    <input
                      type="text"
                      disabled
                      value={selectedUser.subjectReference}
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs text-teal-800 font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Admission Details Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-bold text-slate-600 uppercase">2. Hospital Admission Details</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-500 font-mono mb-1">Admitting Facility:</label>
                    <input
                      type="text"
                      disabled
                      value={currentProvider.name}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-mono mb-1">Admission Date & Time:</label>
                    <input
                      type="datetime-local"
                      value={admissionTimestamp}
                      onChange={(e) => setAdmissionTimestamp(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-semibold focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-mono mb-1">Diagnosis Category:</label>
                    <select
                      value={diagnosisCategory}
                      onChange={(e) => setDiagnosisCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-semibold"
                    >
                      <option value="Acute Appendicitis Hospitalization">Acute Appendicitis Hospitalization (BDT 50,000)</option>
                      <option value="Fracture of Lower Leg Surgery">Fracture of Lower Leg Surgery (BDT 50,000)</option>
                      <option value="Severe Pneumonia Admission">Severe Pneumonia Admission (BDT 35,000)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-mono mb-1">ICD-10 Diagnosis Code:</label>
                    <input
                      type="text"
                      value={diagnosisCode}
                      onChange={(e) => setDiagnosisCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-teal-800 font-mono font-bold"
                    />
                  </div>
                </div>

                <Button variant="primary" className="w-full" onClick={handleAssert} icon={<Stethoscope className="w-4 h-4" />}>
                  Assert Event
                </Button>
              </div>
            </div>
          )}

          {/* Uniqueness Check Animation */}
          {activeStepIndex === 3 && (
            <div className="py-8 text-center space-y-4 font-mono text-xs">
              <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-200 animate-spin">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">VERIFYING EVENT REGISTRY UNIQUENESS...</h3>
              <div className="max-w-md mx-auto space-y-2 text-left bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px] text-slate-700">
                <p>✓ Subject commitment resolved: <span className="text-teal-700 font-bold">{selectedUser.subjectReference}</span></p>
                <p>✓ Admission window calculated: <span className="text-slate-900 font-bold">{admissionTimestamp.split('T')[0]}</span></p>
                <p>✓ Deterministic event key generated: <span className="text-slate-900 font-bold">H(Subject ∥ {admissionTimestamp.split('T')[0]})</span></p>
                <p>⌛ Querying claims registry ledger state...</p>
              </div>
            </div>
          )}

          {/* Outcome Branches */}
          {activeStepIndex === 4 && (
            <div className="space-y-6">
              {/* Branch A: New Event Created */}
              {createdEventId && !duplicateEvent && (
                <div className="space-y-6 animate-fade-in">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 text-xs">
                    <div className="flex items-center space-x-2 font-bold text-sm text-emerald-800">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>EVENT CREATED ✓</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono pt-1">
                      <div>Event ID: <strong className="text-emerald-900">{createdEventId}</strong></div>
                      <div>Status: <strong className="text-emerald-900">OPEN</strong></div>
                      <div>Beneficiary: <span>{selectedUser.name}</span></div>
                      <div>Provider: <span>{currentProvider.name}</span></div>
                    </div>
                  </div>

                  {/* Attestation Status Matrix */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono font-bold text-slate-600 uppercase">Attestation Quorum Matrix</h3>
                    <div className="grid grid-cols-3 gap-3 text-xs font-mono text-center">
                      <div className="p-3 rounded-lg border border-teal-300 bg-teal-50 text-teal-900 font-bold">
                        Provider: Signed ✓
                      </div>
                      <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                        Clinical: Pending —
                      </div>
                      <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                        Field: Pending —
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <Button variant="primary" onClick={handleAttestEvent} icon={<Stethoscope className="w-4 h-4" />}>
                      Sign Provider Attestation
                    </Button>
                    <Link to="/provider">
                      <Button variant="outline">Back to Dashboard</Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Branch B: Duplicate Event Detected */}
              {duplicateEvent && (
                <div className="space-y-6 animate-fade-in">
                  <div className="p-5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-3 text-xs">
                    <div className="flex items-center space-x-2 font-bold text-sm text-amber-900">
                      <ShieldAlert className="w-5 h-5 text-amber-700" />
                      <span>EXISTING EVENT DETECTED (DUPLICATE PREVENTED)</span>
                    </div>

                    <div className="font-mono space-y-1 bg-white p-3 rounded-lg border border-amber-200">
                      <p>Existing Event ID: <strong className="text-amber-900">{duplicateEvent.id}</strong></p>
                      <p>Status: <strong className="text-amber-900">{duplicateEvent.status}</strong></p>
                      <p>Admission Window: <strong className="text-slate-800">{duplicateEvent.admissionWindow}</strong></p>
                    </div>

                    <p className="leading-relaxed font-sans text-slate-700">
                      Obhoy prevents a second event from being minted for the same real-world episode. Deterministic uniqueness key H(SubjectCommitment || admissionWindow) refused duplicate creation.
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Link to="/provider/continue-event">
                      <Button variant="primary" icon={<RotateCcw className="w-4 h-4" />}>
                        Continue Existing Event (`continueEvent`)
                      </Button>
                    </Link>
                    <Link to="/provider">
                      <Button variant="outline">View Dashboard</Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};
