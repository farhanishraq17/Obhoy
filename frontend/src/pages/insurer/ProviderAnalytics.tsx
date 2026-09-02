import React, { useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Building,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Scale,
  Sparkles,
  ChevronRight,
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

export const ProviderAnalytics: React.FC = () => {
  const [period, setPeriod] = useState('30D');
  const [volumeFilter, setVolumeFilter] = useState<'TOP5' | 'TOP10' | 'ALL'>('TOP5');
  const [selectedProviderForReview, setSelectedProviderForReview] = useState<any | null>(null);

  // Comparison state
  const [compareA, setCompareA] = useState('ABC Upazila Health Complex');
  const [compareB, setCompareB] = useState('XYZ District Hospital');

  // KPI Data (36)
  const kpis = [
    { title: 'Providers Monitored', value: '128', note: 'Accredited clinical facilities' },
    { title: 'Events Asserted', value: '5,218', note: 'Hospital admissions filed' },
    { title: 'Events Verified', value: '4,891', note: 'Quorum consensus reached' },
    { title: 'Duplicate Attempts', value: '37', note: 'Blocked by admission window key' },
    { title: 'Anomaly Flags', value: '12', note: 'Signals requiring review' },
    { title: 'Avg Settlement Time', value: '2.4 days', note: 'Within 3.0-day SLA target' },
  ];

  // Graph 1: Volume by Provider (37)
  const volumeData = [
    { name: 'ABC Upazila Health', events: 428 },
    { name: 'XYZ District Hospital', events: 391 },
    { name: 'DEF Medical Centre', events: 212 },
    { name: 'GHI Hospital', events: 174 },
    { name: 'Sylhet Sadar Clinic', events: 145 },
  ];

  // Graph 2: Duplicate Rate (38)
  const duplicateRateData = [
    { name: 'ABC Upazila', rate: 3.27, flag: 'ELEVATED' },
    { name: 'XYZ District', rate: 1.12, flag: 'NORMAL' },
    { name: 'DEF Medical', rate: 0.74, flag: 'NORMAL' },
    { name: 'GHI Hospital', rate: 0.51, flag: 'NORMAL' },
    { name: 'Sylhet Sadar', rate: 0.42, flag: 'NORMAL' },
  ];

  // Graph 3: Verification Outcomes (39)
  const outcomeData = [
    { name: 'ABC Upazila', verified: 402, denied: 14, pending: 12 },
    { name: 'XYZ District', verified: 376, denied: 8, pending: 7 },
    { name: 'DEF Medical', verified: 198, denied: 6, pending: 8 },
    { name: 'GHI Hospital', verified: 162, denied: 5, pending: 7 },
  ];

  // Graph 4: Settlement Time Distribution (40)
  const settlementTimeData = [
    { range: '< 1 day', count: 1850 },
    { range: '1–2 days', count: 2120 },
    { range: '2–3 days', count: 680 },
    { range: '3–5 days', count: 195 },
    { range: '> 5 days', count: 46 },
  ];

  // Graph 5: Pipeline Over Time (41)
  const pipelineData = [
    { month: 'Apr', asserted: 920, eligible: 870 },
    { month: 'May', asserted: 1050, eligible: 990 },
    { month: 'Jun', asserted: 1140, eligible: 1080 },
    { month: 'Jul', asserted: 1210, eligible: 1150 },
    { month: 'Aug', asserted: 1280, eligible: 1210 },
    { month: 'Sep', asserted: 1350, eligible: 1270 },
  ];

  // Graph 6: Denial Reasons (42)
  const denialReasonsData = [
    { name: 'Policy exclusion', value: 42, color: '#f43f5e' },
    { name: 'Inactive coverage', value: 27, color: '#f59e0b' },
    { name: 'Benefit exhausted', value: 18, color: '#6366f1' },
    { name: 'Other exceptions', value: 13, color: '#64748b' },
  ];

  // Table Data (43)
  const providerTable = [
    {
      id: 'PRV-00142',
      name: 'ABC Upazila Health Complex',
      events: 428,
      duplicateAttempts: 14,
      duplicateRate: '3.27%',
      verificationRate: '94.2%',
      medianSettlement: '2.1 days',
      anomaly: 'ELEVATED',
      signal: 'Higher-than-baseline duplicate attempts',
      baseline: '0.84%',
    },
    {
      id: 'PRV-00088',
      name: 'XYZ District Hospital',
      events: 391,
      duplicateAttempts: 2,
      duplicateRate: '0.51%',
      verificationRate: '96.1%',
      medianSettlement: '2.4 days',
      anomaly: 'NORMAL',
      signal: 'Standard distribution',
      baseline: '0.84%',
    },
    {
      id: 'PRV-00209',
      name: 'DEF Medical Centre',
      events: 212,
      duplicateAttempts: 3,
      duplicateRate: '1.41%',
      verificationRate: '93.4%',
      medianSettlement: '2.3 days',
      anomaly: 'NORMAL',
      signal: 'Standard distribution',
      baseline: '0.84%',
    },
    {
      id: 'PRV-00311',
      name: 'GHI Hospital & Diagnostic',
      events: 174,
      duplicateAttempts: 1,
      duplicateRate: '0.57%',
      verificationRate: '93.1%',
      medianSettlement: '2.7 days',
      anomaly: 'NORMAL',
      signal: 'Standard distribution',
      baseline: '0.84%',
    },
  ];

  const comparisonLookup: Record<string, any> = {
    'ABC Upazila Health Complex': { events: 428, verified: 412, duplicates: 14, dupRate: '3.27%', settlement: '2.1 days', status: 'ACTIVE' },
    'XYZ District Hospital': { events: 391, verified: 376, duplicates: 2, dupRate: '0.51%', settlement: '2.4 days', status: 'ACTIVE' },
    'DEF Medical Centre': { events: 212, verified: 198, duplicates: 3, dupRate: '1.41%', settlement: '2.3 days', status: 'ACTIVE' },
    'GHI Hospital & Diagnostic': { events: 174, verified: 162, duplicates: 1, dupRate: '0.57%', settlement: '2.7 days', status: 'ACTIVE' },
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono uppercase font-bold text-teal-700 tracking-wider">
                OFF-CHAIN ANOMALY SCORING
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-mono text-slate-500">Supervisory Analytics</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Provider Analytics & Risk Signals
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Monitor provider verification patterns, duplicate rates, and off-chain anomaly indicators
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-500">Period:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none"
            >
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
              <option value="90D">Last 90 Days</option>
              <option value="1Y">Last 1 Year</option>
            </select>
          </div>
        </div>

        {/* 36. KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((kpi) => (
            <Card key={kpi.title} className="p-4 border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">
                {kpi.title}
              </span>
              <div className="text-2xl font-mono font-black text-slate-900 mt-1">{kpi.value}</div>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">{kpi.note}</span>
            </Card>
          ))}
        </div>

        {/* 6 Graphs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graph 1: Event Volume by Provider */}
          <Card className="p-5 space-y-3 border-slate-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Event Volume by Provider</h3>
                <p className="text-[11px] text-slate-500">Admissions asserted across network</p>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded text-[10px] font-mono">
                {(['TOP5', 'ALL'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setVolumeFilter(t)}
                    className={`px-1.5 py-0.5 rounded ${volumeFilter === t ? 'bg-white text-teal-800 font-bold' : 'text-slate-500'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-48 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="events" fill="#0d9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Graph 2: Duplicate Attempt Rate */}
          <Card className="p-5 space-y-3 border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Duplicate Attempt Rate</h3>
              <p className="text-[11px] text-slate-500">Duplicate attempts per 100 events</p>
            </div>

            <div className="h-48 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={duplicateRateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis unit="%" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: any) => `${val}%`}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="rate" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 font-mono text-center">
              Network Baseline: 0.84% • Label: Duplicate attempt (not fraud)
            </p>
          </Card>

          {/* Graph 3: Verification Outcomes */}
          <Card className="p-5 space-y-3 border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Verification Outcomes</h3>
              <p className="text-[11px] text-slate-500">Attestation resolution by hospital</p>
            </div>

            <div className="h-48 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outcomeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="verified" stackId="a" fill="#10b981" />
                  <Bar dataKey="denied" stackId="a" fill="#f43f5e" />
                  <Bar dataKey="pending" stackId="a" fill="#cbd5e1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-3 text-[10px] font-mono text-slate-500">
              <span className="flex items-center"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></span>Verified</span>
              <span className="flex items-center"><span className="w-2 h-2 bg-rose-500 rounded-full mr-1"></span>Denied</span>
              <span className="flex items-center"><span className="w-2 h-2 bg-slate-300 rounded-full mr-1"></span>Pending</span>
            </div>
          </Card>

          {/* Graph 4: Settlement Time Distribution */}
          <Card className="p-5 space-y-3 border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Settlement Time Distribution</h3>
              <p className="text-[11px] text-slate-500">Number of entitlements by days to payout</p>
            </div>

            <div className="h-48 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={settlementTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 font-mono text-center">
              81% settled in ≤ 2 business days
            </p>
          </Card>

          {/* Graph 5: Pipeline Over Time */}
          <Card className="p-5 space-y-3 border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Event-to-Eligibility Pipeline</h3>
              <p className="text-[11px] text-slate-500">Monthly assertion vs quorum attainment</p>
            </div>

            <div className="h-48 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pipelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Line type="monotone" dataKey="asserted" stroke="#0ea5e9" strokeWidth={2} name="Asserted" />
                  <Line type="monotone" dataKey="eligible" stroke="#10b981" strokeWidth={2} name="Eligible" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-3 text-[10px] font-mono text-slate-500">
              <span className="flex items-center"><span className="w-2 h-2 bg-sky-500 rounded-full mr-1"></span>Asserted</span>
              <span className="flex items-center"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></span>Eligible</span>
            </div>
          </Card>

          {/* Graph 6: Denial Reasons */}
          <Card className="p-5 space-y-3 border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Entitlement Denial Reasons</h3>
              <p className="text-[11px] text-slate-500">Categorical breakdown of exclusions</p>
            </div>

            <div className="h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={denialReasonsData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                    {denialReasonsData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => `${val}%`}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
              {denialReasonsData.map((d) => (
                <div key={d.name} className="flex items-center space-x-1 text-slate-600 truncate">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="truncate">{d.name} ({d.value}%)</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 43. Provider Risk Signals Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
              Provider Risk Signals
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Automated behavioral scoring</span>
          </div>

          <Card className="overflow-hidden border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Provider</th>
                    <th className="p-3">Events</th>
                    <th className="p-3">Duplicate Attempts</th>
                    <th className="p-3">Duplicate Rate</th>
                    <th className="p-3">Verification Rate</th>
                    <th className="p-3">Median Settlement</th>
                    <th className="p-3">Anomaly</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {providerTable.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">
                        {p.name}
                        <span className="block text-[10px] text-slate-400 font-normal">{p.id}</span>
                      </td>
                      <td className="p-3 text-slate-700 font-bold">{p.events}</td>
                      <td className="p-3 text-slate-700">{p.duplicateAttempts}</td>
                      <td className="p-3">
                        <span className={p.anomaly === 'ELEVATED' ? 'text-amber-700 font-bold' : 'text-slate-700'}>
                          {p.duplicateRate}
                        </span>
                      </td>
                      <td className="p-3 text-emerald-700 font-semibold">{p.verificationRate}</td>
                      <td className="p-3 text-slate-700">{p.medianSettlement}</td>
                      <td className="p-3">
                        <Badge variant={p.anomaly === 'ELEVATED' ? 'warning' : 'success'}>
                          {p.anomaly}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProviderForReview(p)}
                          icon={<ArrowRight className="w-3 h-3" />}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* 46. Provider Comparison Tool */}
        <Card className="p-5 space-y-4 border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                Provider Side-by-Side Comparison
              </h3>
              <p className="text-[11px] text-slate-500">Benchmark clinical admission metrics across facilities</p>
            </div>
            <Badge variant="info">Comparative Analysis</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase font-bold text-slate-500 mb-1">Provider A</label>
              <select
                value={compareA}
                onChange={(e) => setCompareA(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-800"
              >
                {Object.keys(comparisonLookup).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase font-bold text-slate-500 mb-1">Provider B</label>
              <select
                value={compareB}
                onChange={(e) => setCompareB(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-800"
              >
                {Object.keys(comparisonLookup).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5 text-left">Metric</th>
                  <th className="p-2.5 text-right text-teal-800">{compareA}</th>
                  <th className="p-2.5 text-right text-indigo-800">{compareB}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-2.5 text-slate-500">Events Asserted</td>
                  <td className="p-2.5 text-right font-bold">{comparisonLookup[compareA]?.events}</td>
                  <td className="p-2.5 text-right font-bold">{comparisonLookup[compareB]?.events}</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-500">Events Verified</td>
                  <td className="p-2.5 text-right font-bold text-emerald-700">{comparisonLookup[compareA]?.verified}</td>
                  <td className="p-2.5 text-right font-bold text-emerald-700">{comparisonLookup[compareB]?.verified}</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-500">Duplicate Attempts</td>
                  <td className="p-2.5 text-right font-bold">{comparisonLookup[compareA]?.duplicates}</td>
                  <td className="p-2.5 text-right font-bold">{comparisonLookup[compareB]?.duplicates}</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-500">Duplicate Attempt Rate</td>
                  <td className="p-2.5 text-right font-bold text-amber-700">{comparisonLookup[compareA]?.dupRate}</td>
                  <td className="p-2.5 text-right font-bold text-slate-700">{comparisonLookup[compareB]?.dupRate}</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-slate-500">Median Settlement Time</td>
                  <td className="p-2.5 text-right font-bold">{comparisonLookup[compareA]?.settlement}</td>
                  <td className="p-2.5 text-right font-bold">{comparisonLookup[compareB]?.settlement}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* 47. Analytics Disclaimer */}
        <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 text-center">
          Analytics shown here are simulated prototype signals intended for operational supervisory review. They do not constitute a fraud determination.
        </div>

        {/* 44 & 45. Anomaly Review Modal */}
        {selectedProviderForReview && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <Card className="max-w-lg w-full p-6 space-y-4 border-2 border-amber-300 shadow-xl">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <Badge variant={selectedProviderForReview.anomaly === 'ELEVATED' ? 'warning' : 'success'}>
                    ANOMALY REVIEW
                  </Badge>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {selectedProviderForReview.name}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">{selectedProviderForReview.id}</span>
                </div>
                <button
                  onClick={() => setSelectedProviderForReview(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                  <span className="text-amber-900 font-bold block">Signal Identified:</span>
                  <p className="text-amber-800">{selectedProviderForReview.signal}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] block">OBSERVED RATE</span>
                    <strong className="text-slate-900 text-sm">{selectedProviderForReview.duplicateRate}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">NETWORK BASELINE</span>
                    <strong className="text-slate-700 text-sm">{selectedProviderForReview.baseline}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">SIGNAL STRENGTH</span>
                    <span className="text-amber-700 font-bold">{selectedProviderForReview.anomaly}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">ACCREDITATION</span>
                    <span className="text-emerald-700 font-bold">ACTIVE ✓</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-100 rounded-xl text-slate-600 text-[11px] leading-relaxed">
                  Activity differs significantly from the network baseline and may warrant operational inquiry. This is an automated algorithmic signal, not a fraud determination.
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setSelectedProviderForReview(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    alert('Sample request logged on supervisory channel.');
                    setSelectedProviderForReview(null);
                  }}
                >
                  Request Audit Sample
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
