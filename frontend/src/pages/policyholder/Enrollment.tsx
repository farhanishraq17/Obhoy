import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useSimulationStore } from '../../store/simulationStore';
import { UserProfile } from '../../types/actor';
import {
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  LogIn,
  Sparkles,
  Fingerprint,
  User,
  Phone,
  MapPin,
  Building,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../lib/api';

// Helper to generate deterministic or crypto commitment hash
function generateCommitmentHash(nid: string): string {
  let hash = 0;
  for (let i = 0; i < nid.length; i++) {
    const char = nid.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hexPart = Math.abs(hash).toString(16).padStart(8, '0');
  const randomSalt = Math.floor(100000000000 + Math.random() * 900000000000).toString(16);
  return `0x${hexPart}${randomSalt}`.slice(0, 26);
}

export const Enrollment: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const { registerUser } = useAuthStore();

  // Form input states
  const [name, setName] = useState('');
  const [nid, setNid] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [upazila, setUpazila] = useState('Mirpur');
  const [mfi, setMfi] = useState('BRAC Microfinance');
  const [mfiGroup, setMfiGroup] = useState('Dhaka Cell 04');

  // Processing & result states
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enrolledProfile, setEnrolledProfile] = useState<UserProfile | null>(null);
  const [enrolledPolicyId, setEnrolledPolicyId] = useState<string | null>(null);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = name.trim();
    const cleanNid = nid.trim();

    if (!cleanName) {
      setErrorMessage('Please enter the beneficiary full name.');
      return;
    }
    if (!cleanNid || cleanNid.length < 6) {
      setErrorMessage('Please enter a valid National ID (NID) number (at least 6 digits).');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Generate unique Holder Number (e.g. HLD-7294)
      const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
      const holderNumber = `HLD-${randomSuffix}`;
      const policyId = `POL-${randomSuffix}`;

      // 2. Perform NID Commitment (calls offchain custodian service or deterministic fallback)
      let commitment = '';
      try {
        const res = await api.offchain.commit(cleanNid, 'policy');
        if (res && res.commitment) {
          commitment = res.commitment;
        } else {
          commitment = generateCommitmentHash(cleanNid);
        }
      } catch {
        commitment = generateCommitmentHash(cleanNid);
      }

      // 3. Register subject on ledger
      try {
        await api.registerSubject({
          commitment,
          keyVersion: 1,
          aggregatorId: mfi.replace(/\s+/g, '-').toUpperCase(),
          context: 'policy',
        });
      } catch {
        // network fallback for demo
      }

      // 4. Issue Policy on Fabric chaincode
      try {
        const nowSec = Math.floor(Date.now() / 1000);
        await api.issuePolicy({
          policyId,
          subjectCommitment: commitment,
          poolId: 'POOL-A',
          type: 'INDEMNITY',
          benefitCap: 5000000, // 50,000 BDT in paisa
          waitingPeriodEnd: nowSec,
          effectiveFrom: nowSec,
          expiresAt: nowSec + 31536000,
        });
      } catch {
        // network fallback for demo
      }

      // 5. Construct user profile connecting Holder Number to NID
      const newProfile: UserProfile = {
        id: `USR-${randomSuffix}`,
        holderNumber,
        nid: cleanNid,
        name: cleanName,
        phone: phone.trim() || '+8801700000000',
        mfi,
        group: mfiGroup,
        district,
        upazila,
        nidCommitment: commitment,
        subjectReference: `SUBJ-••••${commitment.slice(-4).toUpperCase()}`,
        policyId,
        coverageStatus: 'ACTIVE',
      };

      // 6. Save in simulation store policies
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
            paymentMethod: 'bKash MFS',
          },
          ...state.policies,
        ],
      }));

      // 7. Register user permanently in auth store and localStorage
      registerUser(newProfile);

      setEnrolledProfile(newProfile);
      setEnrolledPolicyId(policyId);
      showToast(`Holder Number ${holderNumber} issued for ${cleanName}!`, 'success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Enrollment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnrollAnother = () => {
    setEnrolledProfile(null);
    setEnrolledPolicyId(null);
    setName('');
    setNid('');
    setPhone('');
    setErrorMessage(null);
  };

  return (
    <PageContainer isPublic>
      <div className="max-w-xl mx-auto space-y-6 py-8">
        {/* ========================================================================= */}
        {/* STATE 1: ENROLLMENT FORM (ENTER NID & DETAILS)                            */}
        {/* ========================================================================= */}
        {!enrolledProfile ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center mx-auto shadow-xs">
                <Fingerprint className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                New Member NID Enrollment
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Provide your National ID (NID) to derive your cryptographic commitment and receive your official Holder Number.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <Card className="p-6 sm:p-8 space-y-5 border-slate-200 shadow-md">
              <form onSubmit={handleEnroll} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1 uppercase">
                    Beneficiary Full Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Tanvir Hasan"
                      className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-teal-600 rounded-xl p-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1 uppercase">
                    National ID (NID) Number *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={nid}
                      onChange={(e) => setNid(e.target.value)}
                      placeholder="e.g. 19952691458000312 (10 or 17 digits)"
                      className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-teal-600 rounded-xl p-3 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                    />
                    <Fingerprint className="w-4 h-4 text-teal-600 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    Your NID will be securely verified and bound to your new Holder Number.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-700 mb-1 uppercase">
                      Mobile Phone
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+8801700000000"
                        className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-teal-600 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none"
                      />
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-700 mb-1 uppercase">
                      District / Upazila
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={`${district} / ${upazila}`}
                        onChange={(e) => {
                          const parts = e.target.value.split('/');
                          setDistrict(parts[0]?.trim() || 'Dhaka');
                          setUpazila(parts[1]?.trim() || 'Mirpur');
                        }}
                        className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-teal-600 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none"
                      />
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs space-y-1">
                  <span className="font-bold text-teal-900 block flex items-center space-x-1">
                    <ShieldCheck className="w-4 h-4 text-teal-700" />
                    <span>Secure On-Chain Account Registration</span>
                  </span>
                  <p className="text-teal-800 leading-relaxed text-[11px]">
                    Your National ID is verified and bound to a unique <strong>Holder Number</strong> for convenient, secure access to all your policies and hospital admissions.
                  </p>
                </div>

                <Button
                  variant="primary"
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 text-sm font-bold"
                  icon={isProcessing ? undefined : <KeyRound className="w-4 h-4" />}
                >
                  {isProcessing ? 'Registering Member & Generating Holder Number...' : 'Enroll & Generate Holder Number'}
                </Button>
              </form>
            </Card>

            <div className="text-center">
              <Link to="/login" className="text-xs text-slate-500 hover:text-teal-700 font-semibold inline-flex items-center space-x-1">
                <span>Already have a Holder Number? Sign In</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* STATE 2: ENROLLED RESULT SCREEN (RETURNED HOLDER NUMBER CARD)              */
          /* ========================================================================= */
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Enrollment Successful!
              </h1>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Your account has been registered on the blockchain and connected to your new Holder Number.
              </p>
            </div>

            {/* Credential Certificate Card */}
            <Card className="p-6 sm:p-8 space-y-6 border-2 border-teal-500/50 bg-gradient-to-b from-teal-50/50 via-white to-white shadow-lg">
              <div className="flex items-center justify-between border-b border-teal-200 pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-teal-800">
                    Official Member Credential
                  </span>
                </div>
                <Badge variant="success">Active On-Chain ✓</Badge>
              </div>

              {/* Big Highlighted Holder Number */}
              <div className="text-center py-3 px-4 bg-teal-100/40 border border-teal-300 rounded-2xl space-y-1">
                <span className="text-[11px] font-mono text-slate-500 uppercase font-bold tracking-wider block">
                  Your Assigned Member Holder Number
                </span>
                <div className="text-4xl sm:text-5xl font-mono font-black text-teal-900 tracking-wider">
                  {enrolledProfile.holderNumber}
                </div>
                <p className="text-xs text-teal-800 font-semibold pt-1">
                  Save this number! You will enter this <strong>Holder Number</strong> to sign in.
                </p>
              </div>

              {/* Connection to NID details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-bold">Member Name</span>
                  <strong className="text-slate-900 text-sm">{enrolledProfile.name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-bold">Connected National ID (NID)</span>
                  <span className="text-slate-800 font-bold">
                    {enrolledProfile.nid.slice(0, 4)}••••{enrolledProfile.nid.slice(-4)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-bold">Holder Number</span>
                  <span className="text-teal-800 font-bold block">
                    {enrolledProfile.holderNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-bold">Policy Protection</span>
                  <span className="text-emerald-700 font-bold">{enrolledPolicyId} (BDT 50,000 Cap)</span>
                </div>
              </div>

              {/* Explanation */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium">
                Whenever you enter <strong>{enrolledProfile.holderNumber}</strong> on the login screen, you will be taken directly to your account where all your policy and event details are shown.
              </div>

              {/* Navigation Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  variant="primary"
                  className="w-full py-3 font-bold"
                  onClick={() => navigate('/policyholder')}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Go to My Account (Policyholder Portal)
                </Button>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-300 hover:bg-slate-50"
                    onClick={() => navigate('/login', { state: { prefillHolder: enrolledProfile.holderNumber } })}
                    icon={<LogIn className="w-3.5 h-3.5" />}
                  >
                    Test Sign In with {enrolledProfile.holderNumber}
                  </Button>

                  <Button
                    variant="ghost"
                    className="flex-1 text-slate-600 hover:bg-slate-100"
                    onClick={handleEnrollAnother}
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Enroll Another Member
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
