import React, { useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useSimulationStore } from '../../store/simulationStore';
import { useUIStore } from '../../store/uiStore';
import {
  Building,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  Lock,
  UserX,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const ProviderMonitoring: React.FC = () => {
  const { providers, suspendProvider, reinstateProvider } = useSimulationStore();
  const { showToast } = useUIStore();

  const [riskFilter, setRiskFilter] = useState('ALL');
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [suspensionModalProvider, setSuspensionModalProvider] = useState<any | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [supervisoryAction, setSupervisoryAction] = useState('MONITOR');

  // 24. KPI Cards
  const kpis = [
    { title: 'Accredited Providers', value: '482', note: 'DGHS certified' },
    { title: 'Active Providers', value: '467', note: 'Endorsement enabled' },
    { title: 'Suspended', value: (8 + providers.filter(p => p.accreditationStatus === 'SUSPENDED').length).toString(), note: 'Endorsements blocked' },
    { title: 'De-accredited', value: '7', note: 'Permanent revocation' },
    { title: 'Events Asserted', value: '5,218', note: 'Total admissions' },
    { title: 'Duplicate Attempts', value: '37', note: 'Window key caught' },
    { title: 'Anomaly Flags', value: '12', note: 'Algorithmic signals' },
  ];

  // Graph 1: Event Volume
  const volumeData = [
    { name: 'ABC Upazila Health', events: 428 },
    { name: 'XYZ District Hospital', events: 391 },
    { name: 'DEF Medical Centre', events: 212 },
    { name: 'GHI Hospital', events: 174 },
  ];

  // Graph 2: Duplicate Attempt Rate
  const duplicateRateData = [
    { name: 'ABC Upazila', rate: 3.27 },
    { name: 'XYZ District', rate: 1.12 },
    { name: 'DEF Medical', rate: 0.74 },
    { name: 'GHI Hospital', rate: 0.51 },
  ];

  // Graph 3: Verification Outcomes
  const outcomesData = [
    { name: 'ABC Upazila', verified: 412, rejected: 9, pending: 7 },
    { name: 'XYZ District', verified: 376, rejected: 8, pending: 7 },
    { name: 'DEF Medical', verified: 198, rejected: 6, pending: 8 },
    { name: 'GHI Hospital', verified: 162, rejected: 5, pending: 7 },
  ];

  // 28. Graph 4: Provider x Verifier Activity Pairing Matrix (Collusion Risk)
  const pairingMatrix = [
    { provider: 'ABC Upazila Health', v01: 82, v02: 11, v03: 4, v04: 2, concentration: 'NORMAL' },
    { provider: 'XYZ District Hospital', v01: 3, v02: 77, v03: 15, v04: 1, concentration: 'HIGH (V-02 80%)' },
    { provider: 'DEF Medical Centre', v01: 45, v02: 1, v03: 2, v04: 0, concentration: 'HIGH (V-01 93%)' },
    { provider: 'GHI Hospital', v01: 18, v02: 22, v03: 19, v04: 17, concentration: 'BALANCED' },
  ];

  // Graph 5: Failed Attestation Trend
  const failedAttestationTrend = [
    { month: 'Jan', failed: 2 },
    { month: 'Feb', failed: 3 },
    { month: 'Mar', failed: 5 },
    { month: 'Apr', failed: 9 },
    { month: 'May', failed: 12 },
  ];

  // Graph 6: Accreditation Status
  const accreditationData = [
    { name: 'Active', value: 467, color: '#10b981' },
    { name: 'Suspended', value: 8, color: '#f59e0b' },
    { name: 'De-accredited', value: 7, color: '#f43f5e' },
  ];

  // Table Data (31)
  const providerList = [
    {
      id: 'PRV-00142',
      name: 'ABC Upazila Health Complex',
      accreditation: 'ACTIVE',
      events: 428,
      verified: 412,
      duplicateAttempts: 14,
      duplicateRate: '3.27%',
      failedAttestations: 9,
      verifierConcentration: 'NORMAL',
      anomaly: 'ELEVATED',
      signal: 'Unusually high duplicate attempt velocity',
    },
    {
      id: 'PRV-00088',
      name: 'XYZ District Hospital',
      accreditation: 'ACTIVE',
      events: 391,
      verified: 376,
      duplicateAttempts: 2,
      duplicateRate: '0.51%',
      failedAttestations: 4,
      verifierConcentration: 'HIGH',
      anomaly: 'ELEVATED',
      signal: 'Verifier V-02 participated in 80% of endorsements',
    },
    {
      id: 'PRV-00209',
      name: 'DEF Medical Centre',
      accreditation: 'SUSPENDED',
      events: 212,
      verified: 198,
      duplicateAttempts: 3,
      duplicateRate: '1.41%',
      failedAttestations: 12,
      verifierConcentration: 'HIGH',
      anomaly: 'ELEVATED',
      signal: 'Suspended pending audit of diagnostic records',
    },
    {
      id: 'PRV-00311',
      name: 'GHI Hospital & Diagnostic',
      accreditation: 'ACTIVE',
      events: 174,
      verified: 162,
      duplicateAttempts: 1,
      duplicateRate: '0.57%',
      failedAttestations: 2,
      verifierConcentration: 'NORMAL',
      anomaly: 'NORMAL',
      signal: 'Standard baseline behavior',
    },
  ];

  const handleConfirmSuspension = async () => {
    if (!suspensionReason.trim()) {
      showToast('Please provide a regulatory reason for the suspension.', 'info');
      return;
    }
    const res = await suspendProvider(suspensionModalProvider.id, suspensionReason);
    showToast(res.message, res.success ? 'success' : 'error');
    setSuspensionModalProvider(null);
    setSuspensionReason('');
  };

  const handleReinstate = async (providerId: string) => {
    const res = await reinstateProvider(providerId);
    showToast(res.message, res.success ? 'success' : 'error');
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono uppercase font-bold text-teal-700 tracking-wider">
                IDRA SUPERVISORY CONTROL
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-mono text-slate-500">DGHS Provider Network</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Provider Monitoring & Behavioral Oversight
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Accreditation lifecycle, provider–verifier pairing matrix, and duplicate attempt velocity
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-500">Risk Filter:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="NORMAL">Normal</option>
              <option value="ELEVATED">Elevated</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {/* 24. KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {kpis.map((kpi) => (
            <Card key={kpi.title} className="p-3.5 border-slate-200 shadow-xs">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block truncate">
                {kpi.title}
              </span>
              <div className="text-xl font-mono font-black text-slate-900 mt-1">{kpi.value}</div>
              <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">{kpi.note}</span>
            </Card>
          ))}
        </div>

        {/* Graphs Row 1: Volume, Duplicate Rate, Verification Outcomes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-5 space-y-3 border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Event Volume by Provider</h3>
              <p className="text-[11px] text-slate-500">Admissions asserted on ledger</p>
            </div>
            <div className="h-44 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Bar dataKey="events" fill="#0d9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5 space-y-3 border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Duplicate Attempt Rate</h3>
              <p className="text-[11px] text-slate-500">Review signal (not fraud determination)</p>
            </div>
            <div className="h-44 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={duplicateRateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis unit="%" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip formatter={(val: any) => `${val}%`} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Bar dataKey="rate" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5 space-y-3 border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Accreditation Status</h3>
              <p className="text-[11px] text-slate-500">Total 482 hospitals monitored</p>
            </div>
            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={accreditationData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value">
                    {accreditationData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-3 text-[10px] font-mono text-slate-500">
              <span className="flex items-center"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></span>Active (467)</span>
              <span className="flex items-center"><span className="w-2 h-2 bg-amber-500 rounded-full mr-1"></span>Suspended (8)</span>
              <span className="flex items-center"><span className="w-2 h-2 bg-rose-500 rounded-full mr-1"></span>Revoked (7)</span>
            </div>
          </Card>
        </div>

        {/* 28. Graph 4: Provider x Verifier Activity Pairing Matrix */}
        <Card className="p-5 space-y-3 border-slate-200 shadow-xs">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Provider × Verifier Endorsement Pairing Matrix
              </h3>
              <p className="text-[11px] text-slate-500">
                Identifies suspiciously concentrated pairings (primary collusion risk signal)
              </p>
            </div>
            <Badge variant="warning">Collusion Risk Signal</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5 text-left">Provider Facility</th>
                  <th className="p-2.5 text-center">Verifier V-01</th>
                  <th className="p-2.5 text-center">Verifier V-02</th>
                  <th className="p-2.5 text-center">Verifier V-03</th>
                  <th className="p-2.5 text-center">Verifier V-04</th>
                  <th className="p-2.5 text-right">Concentration Analysis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pairingMatrix.map((row) => (
                  <tr key={row.provider} className="hover:bg-slate-50/70">
                    <td className="p-2.5 font-semibold text-slate-900">{row.provider}</td>
                    <td className={`p-2.5 text-center font-bold ${row.v01 > 40 ? 'bg-amber-100/60 text-amber-900' : 'text-slate-700'}`}>
                      {row.v01}
                    </td>
                    <td className={`p-2.5 text-center font-bold ${row.v02 > 40 ? 'bg-rose-100/60 text-rose-900' : 'text-slate-700'}`}>
                      {row.v02}
                    </td>
                    <td className="p-2.5 text-center font-bold text-slate-700">{row.v03}</td>
                    <td className="p-2.5 text-center font-bold text-slate-700">{row.v04}</td>
                    <td className="p-2.5 text-right">
                      <span className={row.concentration.startsWith('HIGH') ? 'text-rose-600 font-bold' : 'text-emerald-700 font-medium'}>
                        {row.concentration}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 31. Provider Risk Signals Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
              Provider Accreditation & Behavioral Oversight Directory
            </h2>
            <span className="text-[11px] font-mono text-slate-400">DGHS master register</span>
          </div>

          <Card className="overflow-hidden border-slate-200 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Provider</th>
                    <th className="p-3">Accreditation</th>
                    <th className="p-3">Events</th>
                    <th className="p-3">Verified</th>
                    <th className="p-3">Duplicate Attempts</th>
                    <th className="p-3">Failed Attestations</th>
                    <th className="p-3">Pairing Concentration</th>
                    <th className="p-3">Anomaly</th>
                    <th className="p-3 text-right">Supervisory Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {providerList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">
                        {p.name}
                        <span className="block text-[10px] text-slate-400 font-normal">{p.id}</span>
                      </td>
                      <td className="p-3">
                        <Badge variant={p.accreditation === 'ACTIVE' ? 'success' : 'error'}>
                          {p.accreditation}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-800 font-bold">{p.events}</td>
                      <td className="p-3 text-emerald-700 font-semibold">{p.verified}</td>
                      <td className="p-3 text-slate-700">{p.duplicateAttempts} ({p.duplicateRate})</td>
                      <td className="p-3 text-slate-700">{p.failedAttestations}</td>
                      <td className="p-3">
                        <span className={p.verifierConcentration === 'HIGH' ? 'text-amber-700 font-bold' : 'text-slate-600'}>
                          {p.verifierConcentration}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant={p.anomaly === 'ELEVATED' ? 'warning' : 'success'}>
                          {p.anomaly}
                        </Badge>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProvider(p)}
                          icon={<ArrowRight className="w-3 h-3" />}
                        >
                          Review
                        </Button>
                        {p.accreditation === 'ACTIVE' ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setSuspensionModalProvider(p)}
                            icon={<UserX className="w-3 h-3" />}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleReinstate(p.id)}
                            icon={<RotateCcw className="w-3 h-3" />}
                          >
                            Reinstate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* 32 & 33. Provider Detail & Anomaly Review Modal */}
        {selectedProvider && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <Card className="max-w-xl w-full p-6 space-y-4 border-2 border-teal-500 shadow-xl">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <Badge variant={selectedProvider.accreditation === 'ACTIVE' ? 'success' : 'error'}>
                    SUPERVISORY PROFILE
                  </Badge>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedProvider.name}</h3>
                  <span className="text-xs font-mono text-slate-400">ID: {selectedProvider.id} • DGHS Certified</span>
                </div>
                <button onClick={() => setSelectedProvider(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">EVENTS</span>
                  <strong className="text-slate-900">{selectedProvider.events}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">VERIFIED</span>
                  <strong className="text-emerald-700">{selectedProvider.verified}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">DUPLICATES</span>
                  <strong className="text-amber-700">{selectedProvider.duplicateAttempts}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">FAILED ATTEST</span>
                  <strong className="text-rose-600">{selectedProvider.failedAttestations}</strong>
                </div>
              </div>

              {/* 33. Anomaly Signal Box */}
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs font-mono space-y-1">
                <span className="text-amber-900 font-bold block">Active Supervisory Signal:</span>
                <p className="text-amber-800">{selectedProvider.signal}</p>
                <p className="text-[10px] text-slate-500 italic pt-1">
                  The architecture distinguishes automated statistical anomaly scoring from fraud verdicts.
                </p>
              </div>

              {/* Recommended Action Radio */}
              <div className="space-y-2 text-xs font-mono">
                <span className="font-bold text-slate-700 uppercase text-[10px]">Supervisory Action:</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'NO_ACTION', label: '○ No Action' },
                    { key: 'MONITOR', label: '○ Enhanced Monitor' },
                    { key: 'AUDIT', label: '○ Request Audit Sample' },
                    { key: 'SUSPEND', label: '○ Suspend Pending Review' },
                  ].map((act) => (
                    <div
                      key={act.key}
                      onClick={() => setSupervisoryAction(act.key)}
                      className={`p-2 rounded-lg border cursor-pointer ${
                        supervisoryAction === act.key ? 'bg-teal-50 border-teal-500 font-bold text-teal-900' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      {act.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setSelectedProvider(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    showToast(`Supervisory order recorded: ${supervisoryAction}`, 'info');
                    setSelectedProvider(null);
                  }}
                >
                  Record Supervisory Order
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* 34. Suspend Provider Confirmation Modal */}
        {suspensionModalProvider && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <Card className="max-w-md w-full p-6 space-y-4 border-2 border-rose-500 shadow-xl">
              <div className="flex items-center space-x-2 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold font-mono uppercase tracking-wide">
                  SUSPEND PROVIDER ACCREDITATION?
                </h3>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs font-mono text-rose-900 space-y-1 leading-relaxed">
                <p>
                  Suspending <strong>{suspensionModalProvider.name}</strong> will revoke endorsement privileges on the blockchain.
                </p>
                <p className="text-[11px] text-rose-800">
                  New endorsements are blocked while historical signatures and immutable claim proofs remain preserved on the ledger.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1 uppercase">
                  Supervisory Reason for Suspension *
                </label>
                <textarea
                  rows={3}
                  required
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="e.g. Unusually concentrated endorsements with verifier V-02; pending forensic audit."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setSuspensionModalProvider(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleConfirmSuspension}
                  icon={<UserX className="w-3.5 h-3.5" />}
                >
                  Confirm Suspension
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
