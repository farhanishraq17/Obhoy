import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types/actor';
import {
  User,
  Stethoscope,
  Shield,
  Building2,
  Scale,
  LogIn,
  UserPlus,
  ArrowRight,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

type LoginTab = 'POLICYHOLDER' | 'PROVIDER' | 'VERIFIER' | 'INSURER' | 'REGULATOR';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const {
    registeredUsers,
    loginByHolderNumber,
    loginByProviderNumber,
    loginByVerifierNumber,
    loginByInsurerNumber,
    loginByRegulatorNumber,
  } = useAuthStore();

  const [activeTab, setActiveTab] = useState<LoginTab>('POLICYHOLDER');

  // Input States
  const [holderInput, setHolderInput] = useState('');
  const [providerInput, setProviderInput] = useState('');
  const [verifierInput, setVerifierInput] = useState('');
  const [insurerInput, setInsurerInput] = useState('');
  const [regulatorInput, setRegulatorInput] = useState('');

  // Status & Error States
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearErrors = () => setErrorMessage(null);

  // Policyholder Login
  const handlePolicyholderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    const res = loginByHolderNumber(holderInput);
    if (!res.success) {
      setErrorMessage(res.message || 'Holder Number not found.');
    } else {
      navigate('/policyholder');
    }
  };

  // Provider Login
  const handleProviderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    const res = loginByProviderNumber(providerInput);
    if (!res.success) {
      setErrorMessage(res.message || 'Invalid Provider Number.');
    } else {
      navigate('/provider');
    }
  };

  // Verifier Login
  const handleVerifierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    const res = loginByVerifierNumber(verifierInput);
    if (!res.success) {
      setErrorMessage(res.message || 'Invalid Verifier Number.');
    } else {
      navigate('/verifier/queue');
    }
  };

  // Insurer Login
  const handleInsurerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    const res = loginByInsurerNumber(insurerInput);
    if (!res.success) {
      setErrorMessage(res.message || 'Invalid Insurer Number.');
    } else {
      navigate('/insurer');
    }
  };

  // Regulator Login
  const handleRegulatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    const res = loginByRegulatorNumber(regulatorInput);
    if (!res.success) {
      setErrorMessage(res.message || 'Invalid Regulator ID.');
    } else {
      navigate('/regulator');
    }
  };

  const tabs: { id: LoginTab; label: string; icon: React.ReactNode }[] = [
    { id: 'POLICYHOLDER', label: 'Policyholder', icon: <User className="w-4 h-4" /> },
    { id: 'PROVIDER', label: 'Healthcare Provider', icon: <Stethoscope className="w-4 h-4" /> },
    { id: 'VERIFIER', label: 'Verifier', icon: <Shield className="w-4 h-4" /> },
    { id: 'INSURER', label: 'Insurer', icon: <Building2 className="w-4 h-4" /> },
    { id: 'REGULATOR', label: 'IDRA Regulator', icon: <Scale className="w-4 h-4" /> },
  ];

  return (
    <PageContainer isPublic>
      <div className="max-w-2xl mx-auto space-y-8 py-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center mx-auto shadow-xs">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Obhoy Stakeholder Login
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            Select your stakeholder portal and enter your assigned identifier to access the network.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 space-x-1 bg-slate-100/90 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  clearErrors();
                }}
                className={`flex-1 min-w-[100px] flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-teal-800 shadow-sm border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Authentication Failed</span>
              <p className="text-rose-700 mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Main Form Container */}
        <Card className="p-6 sm:p-8 space-y-6 shadow-md border-slate-200">
          {/* TAB 1: POLICYHOLDER (DEFAULT) */}
          {activeTab === 'POLICYHOLDER' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-slate-900">Policyholder Member Sign In</h2>
                    <Badge variant="info">Default</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Enter your assigned <strong>Holder Number</strong> to view your policy and health event records.
                  </p>
                </div>
              </div>

              <form onSubmit={handlePolicyholderSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1.5 uppercase">
                    Member Holder Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={holderInput}
                      onChange={(e) => setHolderInput(e.target.value)}
                      placeholder="e.g. HLD-1001 or 1001"
                      className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-teal-600 rounded-xl p-3 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Case-insensitive. Your Holder Number is bound to your National ID (NID).
                  </p>
                </div>

                {/* Demo Quick Fills */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                    Quick Demo Holder Numbers:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {registeredUsers.slice(0, 4).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setHolderInput(u.holderNumber || 'HLD-1001');
                          clearErrors();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-700 hover:border-teal-500 hover:text-teal-700 transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
                      >
                        <strong className="text-teal-800">{u.holderNumber || 'HLD-1001'}</strong>
                        <span className="text-slate-400">({u.name.split(' ')[0]})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button variant="primary" className="w-full py-3" type="submit" icon={<ArrowRight className="w-4 h-4" />}>
                  Access My Account
                </Button>
              </form>

              {/* New Member Enrollment Callout */}
              <div className="pt-4 border-t border-slate-100">
                <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50/60 to-emerald-50/60 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Don't have a Holder Number yet?</span>
                    </span>
                    <p className="text-xs text-slate-600">
                      Enroll with your NID to generate your threshold commitment and get a new Holder Number.
                    </p>
                  </div>
                  <Link to="/policyholder/enrollment" className="shrink-0">
                    <Button variant="outline" size="sm" icon={<UserPlus className="w-3.5 h-3.5 text-teal-700" />}>
                      Enroll New Member
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HEALTHCARE PROVIDER */}
          {activeTab === 'PROVIDER' && (
            <div className="space-y-6">
              <div className="space-y-1 pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Healthcare Provider Portal</h2>
                <p className="text-xs text-slate-500">
                  Enter your accredited institution's Provider Number to assert and manage patient admissions.
                </p>
              </div>

              <form onSubmit={handleProviderSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1.5 uppercase">
                    Institutional Provider Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={providerInput}
                      onChange={(e) => setProviderInput(e.target.value)}
                      placeholder="e.g. PRV-101"
                      className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-teal-600 rounded-xl p-3 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                    />
                    <Stethoscope className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Provider numbers are official facility IDs issued by DGHS / IDRA. No self-enrollment required.
                  </p>
                </div>

                {/* Demo Quick Fills */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                    Institutional Demo Facilities:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'PRV-101', name: 'ABC Upazila Complex' },
                      { id: 'PRV-202', name: 'Dhaka District Hospital' },
                      { id: 'PRV-303', name: 'Al-Madina Diagnostic' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setProviderInput(p.id);
                          clearErrors();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-700 hover:border-teal-500 hover:text-teal-700 transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
                      >
                        <strong className="text-teal-800">{p.id}</strong>
                        <span className="text-slate-400">({p.name})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button variant="primary" className="w-full py-3" type="submit" icon={<ArrowRight className="w-4 h-4" />}>
                  Access Provider Portal
                </Button>
              </form>
            </div>
          )}

          {/* TAB 3: VERIFIER */}
          {activeTab === 'VERIFIER' && (
            <div className="space-y-6">
              <div className="space-y-1 pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Attestation Verifier Sign In</h2>
                <p className="text-xs text-slate-500">
                  Enter your assigned Verifier Number to inspect evidence and execute non-payee cryptographic attestations.
                </p>
              </div>

              <form onSubmit={handleVerifierSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1.5 uppercase">
                    Institutional Verifier Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={verifierInput}
                      onChange={(e) => setVerifierInput(e.target.value)}
                      placeholder="e.g. VRF-CLIN-01 or VRF-FIELD-01"
                      className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-600 rounded-xl p-3 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                    <Shield className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Verifier credentials are statutory authority keys issued to medical adjudicators and MFI field officers.
                  </p>
                </div>

                {/* Demo Quick Fills */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                    Institutional Demo Verifiers:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'VRF-CLIN-01', label: 'Clinical Verifier (Dr. Anisur)' },
                      { id: 'VRF-FIELD-01', label: 'Field Verifier (Salma Khatun)' },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setVerifierInput(v.id);
                          clearErrors();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-700 hover:border-indigo-500 hover:text-indigo-700 transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
                      >
                        <strong className="text-indigo-800">{v.id}</strong>
                        <span className="text-slate-400">({v.label})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button variant="primary" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 border-indigo-600" type="submit" icon={<ArrowRight className="w-4 h-4" />}>
                  Access Verifier Queue
                </Button>
              </form>
            </div>
          )}

          {/* TAB 4: INSURER */}
          {activeTab === 'INSURER' && (
            <div className="space-y-6">
              <div className="space-y-1 pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Insurer Underwriting Console</h2>
                <p className="text-xs text-slate-500">
                  Enter your licensed Insurer Number to adjudicate verified claims and authorize bKash settlements.
                </p>
              </div>

              <form onSubmit={handleInsurerSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1.5 uppercase">
                    Insurer License / ID Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={insurerInput}
                      onChange={(e) => setInsurerInput(e.target.value)}
                      placeholder="e.g. INS-01"
                      className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-purple-600 rounded-xl p-3 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                    <Building2 className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Demo Quick Fills */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                    Demo Insurer Entities:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'INS-01', name: 'Green Delta Insurance PLC' },
                      { id: 'INS-02', name: 'Pragati Insurance Ltd' },
                    ].map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => {
                          setInsurerInput(i.id);
                          clearErrors();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-700 hover:border-purple-500 hover:text-purple-700 transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
                      >
                        <strong className="text-purple-800">{i.id}</strong>
                        <span className="text-slate-400">({i.name.split(' ')[0]})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button variant="primary" className="w-full py-3 bg-purple-700 hover:bg-purple-800 border-purple-700" type="submit" icon={<ArrowRight className="w-4 h-4" />}>
                  Access Insurer Console
                </Button>
              </form>
            </div>
          )}

          {/* TAB 5: REGULATOR */}
          {activeTab === 'REGULATOR' && (
            <div className="space-y-6">
              <div className="space-y-1 pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">IDRA Statutory Supervisory Node</h2>
                <p className="text-xs text-slate-500">
                  Enter your supervisory node identifier to access network audit channels and arbitration tribunals.
                </p>
              </div>

              <form onSubmit={handleRegulatorSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1.5 uppercase">
                    Regulator Supervisory Node ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={regulatorInput}
                      onChange={(e) => setRegulatorInput(e.target.value)}
                      placeholder="e.g. REG-IDRA-01"
                      className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-rose-600 rounded-xl p-3 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                    />
                    <Scale className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Demo Quick Fills */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                    Statutory Regulator Node:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRegulatorInput('REG-IDRA-01');
                        clearErrors();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-700 hover:border-rose-500 hover:text-rose-700 transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
                    >
                      <strong className="text-rose-800">REG-IDRA-01</strong>
                      <span className="text-slate-400">(IDRA Supervisory Authority)</span>
                    </button>
                  </div>
                </div>

                <Button variant="primary" className="w-full py-3 bg-rose-700 hover:bg-rose-800 border-rose-700" type="submit" icon={<ArrowRight className="w-4 h-4" />}>
                  Access Supervisory Node
                </Button>
              </form>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};

