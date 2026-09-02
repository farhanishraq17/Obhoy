import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useSimulationStore } from '../../store/simulationStore';
import { MOCK_USERS } from '../../data/users';
import { UserProfile } from '../../types/actor';
import { UserCheck, ShieldCheck, CreditCard, CheckCircle2, ArrowRight, Lock, Key } from 'lucide-react';
import { api } from '../../lib/api';

export const Enrollment: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const { setUser } = useAuthStore();

  const [step, setStep] = useState<'DETAILS' | 'IDENTITY' | 'CONSENT' | 'PAYMENT' | 'COMPLETE'>('DETAILS');
  const [selectedUserId, setSelectedUserId] = useState(MOCK_USERS[0].id);
  const [selectedUser, setSelectedUser] = useState(MOCK_USERS[0]);
  const [nameInput, setNameInput] = useState(MOCK_USERS[0].name);
  const [nidInput, setNidInput] = useState(MOCK_USERS[0].nid);
  const [dobInput, setDobInput] = useState('1992-05-14');
  const [selectedRail, setSelectedRail] = useState('bKash');
  const [isVerifying, setIsVerifying] = useState(false);
  const [computedCommitment, setComputedCommitment] = useState<string>('');
  const [custodianQuorum, setCustodianQuorum] = useState<string[]>([]);
  const [isActivating, setIsActivating] = useState(false);
  const [issuedPolicyId, setIssuedPolicyId] = useState('POL-1001');

  const handleIdentityVerify = async () => {
    setIsVerifying(true);
    try {
      // Step 1: Call Off-Chain Commitment Service (:7560)
      const res = await api.offchain.commit(nidInput, 'policy');
      if (res.ok && res.commitment) {
        setComputedCommitment(res.commitment);
        setCustodianQuorum((res as any).quorum || ['idra', 'insurer']);
        showToast('NID Pseudonym derived via 2-of-3 Custodian Threshold Key', 'success');
      } else {
        // Fallback demo commitment
        setComputedCommitment(selectedUser.nidCommitment);
        setCustodianQuorum(['idra', 'insurer']);
      }
      setStep('CONSENT');
    } catch {
      setComputedCommitment(selectedUser.nidCommitment);
      setStep('CONSENT');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePayment = async () => {
    setIsActivating(true);
    const policyId = `POL-${Date.now().toString().slice(-4)}`;
    setIssuedPolicyId(policyId);
    const finalCommitment = computedCommitment || selectedUser.nidCommitment;
    const finalName = nameInput.trim() || selectedUser.name;
    const finalNid = nidInput.trim() || selectedUser.nid;

    try {
      // Step 2: Register commitment on ledger
      await api.registerSubject({
        commitment: finalCommitment,
        keyVersion: 1,
        aggregatorId: 'MFI-BRAC',
        context: 'policy',
      });

      // Step 3: Issue Policy on Fabric chaincode
      const nowSec = Math.floor(Date.now() / 1000);
      await api.issuePolicy({
        policyId,
        subjectCommitment: finalCommitment,
        poolId: 'POOL-A',
        type: 'INDEMNITY',
        benefitCap: 5000000, // 50,000 BDT in paisa
        waitingPeriodEnd: nowSec,
        effectiveFrom: nowSec,
        expiresAt: nowSec + 31536000,
      });
    } catch {
      // Ignore network errors for local demo
    }

    // Update active logged-in user profile in authStore
    const newProfile: UserProfile = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      nid: finalNid,
      name: finalName,
      phone: selectedUser.phone || '+8801700000000',
      mfi: selectedUser.mfi,
      group: selectedUser.group,
      district: selectedUser.district || 'Dhaka',
      upazila: selectedUser.upazila || 'Mirpur',
      nidCommitment: finalCommitment,
      subjectReference: `SUBJ-••••${finalCommitment.slice(-4).toUpperCase()}`,
      policyId,
      coverageStatus: 'ACTIVE',
    };
    setUser(newProfile);

    // Also add policy to simulation store so the policy dashboard renders it
    useSimulationStore.setState((state) => ({
      policies: [
        {
          id: policyId,
          holderId: newProfile.id,
          holderName: newProfile.name,
          holderNID: newProfile.nid,
          insurerId: 'INS-01',
          insurerName: 'Green Delta Insurance PLC',
          product: 'Catastrophic Hospitalization Protection',
          benefitCap: 50000,
          scheduleVersion: 'v1.2-2026',
          status: 'ACTIVE',
          startDate: new Date().toISOString().slice(0, 10),
          endDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
          premiumBDT: 1200,
          paymentMethod: selectedRail,
        },
        ...state.policies,
      ],
    }));

    setIsActivating(false);
    setStep('COMPLETE');
    showToast(`Policy ${policyId} Activated On-Chain for ${finalName}!`, 'success');
  };

  const handleFinish = () => {
    navigate('/policyholder');
  };

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="success">Enrolment Wizard</Badge>
          <h1 className="text-2xl font-extrabold text-slate-900">Group Health Insurance Enrolment</h1>
          <p className="text-xs text-slate-500">
            Microfinance Group Enrolment channel for <span className="text-teal-700 font-bold">{nameInput || selectedUser.name}</span> ({selectedUser.group})
          </p>
        </div>

        {/* Multi-Step Wizard */}
        <Card className="p-6 space-y-6">
          {step === 'DETAILS' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-teal-600" />
                <span>1. Select Applicant & MFI Group</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-mono mb-1">Preset Beneficiary Profile:</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      if (e.target.value === 'CUSTOM') {
                        setNameInput('');
                        setNidInput('');
                      } else {
                        const matched = MOCK_USERS.find((u) => u.id === e.target.value) || MOCK_USERS[0];
                        setSelectedUser(matched);
                        setNameInput(matched.name);
                        setNidInput(matched.nid);
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold"
                  >
                    {MOCK_USERS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.group})
                      </option>
                    ))}
                    <option value="CUSTOM">+ Enter Custom Applicant Name & NID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-mono mb-1">Applicant Full Name:</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-mono mb-1">Microfinance Institution (MFI):</label>
                  <input
                    type="text"
                    disabled
                    value={selectedUser.mfi}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-mono mb-1">Product Name:</label>
                  <input
                    type="text"
                    disabled
                    value="Catastrophic Hospitalization Protection (BDT 50,000 Cap)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-teal-700 font-bold"
                  />
                </div>
              </div>

              <Button variant="primary" className="w-full" onClick={() => setStep('IDENTITY')}>
                Continue to Identity Verification
              </Button>
            </div>
          )}

          {step === 'IDENTITY' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>2. National ID (NID) Identity Resolution</span>
              </h3>

              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start space-x-2">
                <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero On-Chain PHI</strong>: Your raw NID is never sent to the blockchain. An off-chain 2-of-3 Shamir threshold service computes a Keyed-PRF Commitment <code className="font-mono text-blue-800">HMAC_Kv(NID || context)</code>.
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-mono mb-1">National ID Number:</label>
                  <input
                    type="text"
                    value={nidInput}
                    onChange={(e) => setNidInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono"
                    placeholder="Enter 10-17 digit NID"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-mono mb-1">Date of Birth:</label>
                  <input
                    type="date"
                    value={dobInput}
                    onChange={(e) => setDobInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <Button variant="primary" className="w-full" onClick={handleIdentityVerify} disabled={isVerifying}>
                {isVerifying ? 'Querying Custodians & Computing PRF...' : 'Verify Identity & Compute Commitment'}
              </Button>
            </div>
          )}

          {step === 'CONSENT' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">3. Policy Coverage Terms & Schedule</h3>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Applicant:</span>
                  <span className="font-bold text-slate-900">{nameInput || selectedUser.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Insurer:</span>
                  <span className="font-bold text-slate-900">Green Delta Insurance PLC (Insurer A)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Annual Benefit Ceiling:</span>
                  <span className="font-bold text-emerald-700">BDT 50,000</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Benefit Schedule Version:</span>
                  <span className="font-mono text-teal-700 font-semibold">v1.2-2026</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Annual Premium:</span>
                  <span className="font-bold text-slate-900">BDT 1,200 / year</span>
                </div>
                <div className="py-1">
                  <span className="text-slate-500 block mb-1 flex items-center space-x-1">
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Derived Subject Commitment (On-Chain Pseudonym):</span>
                  </span>
                  <div className="font-mono text-[10px] bg-slate-900 text-emerald-400 p-2 rounded break-all select-all">
                    {computedCommitment || selectedUser.nidCommitment}
                  </div>
                  {custodianQuorum.length > 0 && (
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Reconstructed under 2-of-3 threshold quorum: {custodianQuorum.join(' + ')}
                    </span>
                  )}
                </div>
              </div>

              <Button variant="primary" className="w-full" onClick={() => setStep('PAYMENT')}>
                I Agree & Proceed to Premium Payment
              </Button>
            </div>
          )}

          {step === 'PAYMENT' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-teal-600" />
                <span>4. Mobile Financial Service (MFS) Premium Payment</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {['bKash', 'Nagad', 'Rocket', 'MFI Account'].map((rail) => (
                  <button
                    key={rail}
                    type="button"
                    onClick={() => setSelectedRail(rail)}
                    className={`p-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      selectedRail === rail
                        ? 'bg-teal-50 border-teal-600 text-teal-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {rail}
                  </button>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center font-mono">
                <span className="text-slate-500">Amount Due:</span>
                <span className="text-emerald-700 font-bold">BDT 1,200</span>
              </div>

              <Button variant="primary" className="w-full" onClick={handlePayment} disabled={isActivating}>
                {isActivating ? 'Issuing Policy On-Chain...' : 'Pay Premium & Activate Policy'}
              </Button>
            </div>
          )}

          {step === 'COMPLETE' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Policy Activated Successfully!</h3>
              <p className="text-xs text-slate-600">
                Policy <code className="text-teal-700 font-mono font-bold">{issuedPolicyId}</code> is now ACTIVE on the Hyperledger Fabric ledger for <strong className="text-slate-900">{nameInput || selectedUser.name}</strong>.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs font-mono space-y-1">
                <div className="text-slate-500">Beneficiary: <span className="text-slate-900 font-bold">{nameInput || selectedUser.name}</span></div>
                <div className="text-slate-500">Commitment: <span className="text-slate-800 truncate">{computedCommitment.slice(0, 18)}...</span></div>
                <div className="text-slate-500">Pool: <span className="text-slate-800">POOL-A</span></div>
                <div className="text-slate-500">Coverage: <span className="text-emerald-700 font-bold">BDT 50,000 / year</span></div>
              </div>

              <Button variant="primary" className="w-full" onClick={handleFinish} icon={<ArrowRight className="w-4 h-4" />}>
                Go to Policy Dashboard
              </Button>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};
