import React, { useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Scale,
  X,
  FileCheck,
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
  ReferenceLine,
} from 'recharts';

export const InsurerMonitoring: React.FC = () => {
  const [period, setPeriod] = useState('30D');
  const [selectedInsurer, setSelectedInsurer] = useState<any | null>(null);

  // 12. KPI Cards
  const kpis = [
    { title: 'Insurers', value: '12', note: 'Licensed under IDRA' },
    { title: 'Active Policies', value: '42,821', note: 'In force on-chain' },
    { title: 'Claims Received', value: '5,218', note: 'Total assertions' },
    { title: 'Settled', value: '4,891', note: 'Completed payouts' },
    { title: 'Denied', value: '327', note: 'Policy exclusions' },
    { title: 'Settlement Ratio', value: '93.7%', note: 'Target ≥ 90.0%' },
    { title: 'Avg Settlement Time', value: '2.4 days', note: 'Target ≤ 3.0 days' },
    { title: 'SLA Breaches', value: '17', note: 'Pertains to 2 entities' },
  ];

  // 13. Claims Lifecycle Funnel
  const lifecycleData = [
    { stage: 'Claims Received', count: 5218, pct: 100, fill: '#0f766e' },
    { stage: 'Eligible Events', count: 4930, pct: 94.4, fill: '#0d9488' },
    { stage: 'Authorized', count: 4700, pct: 90.1, fill: '#14b8a6' },
    { stage: 'Settled', count: 4891, pct: 93.7, fill: '#059669' },
  ];

  // 14. Settlement Ratio
  const ratioData = [
    { name: 'Delta Mutual', ratio: 95.1 },
    { name: 'Green Delta', ratio: 94.2 },
    { name: 'ABC Insurance', ratio: 91.8 },
    { name: 'Pragati Ins.', ratio: 87.2 },
    { name: 'XYZ Insurance', ratio: 89.7 },
  ];

  // 15. Average Settlement Time
  const timeData = [
    { name: 'Green Delta', days: 2.1, breach: false },
    { name: 'Delta Mutual', days: 2.2, breach: false },
    { name: 'ABC Insurance', days: 2.8, breach: false },
    { name: 'XYZ Insurance', days: 3.1, breach: true },
    { name: 'Pragati Ins.', days: 5.4, breach: true },
  ];

  // 16. Denial Rate
  const denialRateData = [
    { name: 'Green Delta', rate: 5.8 },
    { name: 'Delta Mutual', rate: 4.9 },
    { name: 'ABC Insurance', rate: 8.2 },
    { name: 'XYZ Insurance', rate: 10.3 },
    { name: 'Pragati Ins.', rate: 12.8 },
  ];

  // 17. Denial Reasons
  const denialReasonsData = [
    { name: 'Policy exclusion', value: 44, color: '#f43f5e' },
    { name: 'Waiting period', value: 24, color: '#f59e0b' },
    { name: 'Inactive policy', value: 16, color: '#6366f1' },
    { name: 'Benefit exhausted', value: 11, color: '#10b981' },
    { name: 'Other', value: 5, color: '#64748b' },
  ];

  // 18. Insurer Performance Table
  const insurerTable = [
    {
      id: 'INS-001',
      license: 'IDRA-INS-001',
      name: 'Green Delta Insurance PLC',
      policies: '12,821',
      received: 1248,
      settled: 1173,
      denied: 75,
      ratio: '94.0%',
      avgSettlement: '2.1 days',
      breaches: 2,
      appeals: 21,
      overturned: 4,
      overturnRate: '22.2%',
      status: 'NORMAL',
    },
    {
      id: 'INS-002',
      license: 'IDRA-INS-002',
      name: 'Pragati Life Insurance Ltd',
      policies: '8,450',
      received: 890,
      settled: 776,
      denied: 114,
      ratio: '87.2%',
      avgSettlement: '5.4 days',
      breaches: 12,
      appeals: 38,
      overturned: 14,
      overturnRate: '36.8%',
      status: 'SLA_BREACH',
    },
    {
      id: 'INS-003',
      license: 'IDRA-INS-003',
      name: 'Delta Mutual Health Shield',
      policies: '11,200',
      received: 1410,
      settled: 1341,
      denied: 69,
      ratio: '95.1%',
      avgSettlement: '2.2 days',
      breaches: 1,
      appeals: 14,
      overturned: 2,
      overturnRate: '14.3%',
      status: 'NORMAL',
    },
    {
      id: 'INS-004',
      license: 'IDRA-INS-004',
      name: 'ABC Micro-Insurance PLC',
      policies: '6,100',
      received: 780,
      settled: 716,
      denied: 64,
      ratio: '91.8%',
      avgSettlement: '2.8 days',
      breaches: 2,
      appeals: 11,
      overturned: 2,
      overturnRate: '18.1%',
      status: 'NORMAL',
    },
  ];

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
              <span className="text-[11px] font-mono text-slate-500">Underwriting & Payout Oversight</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Insurer Monitoring & Solvency Supervision
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Consortium claims SLA adherence, denial rate monitoring, and appeal overturn tracking
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-500">Supervisory Window:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none"
            >
              <option value="30D">September 2026 (Last 30 Days)</option>
              <option value="90D">Q3 2026</option>
              <option value="1Y">Full Year 2026</option>
            </select>
          </div>
        </div>

        {/* 12. KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
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

        {/* 5 Graphs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graph 1: Claims Lifecycle Funnel */}
          <Card className="p-5 space-y-3 border-slate-200 shadow-xs">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Claims Lifecycle</h3>
                <p className="text-[11px] text-slate-500">Pipeline progression across all insurers</p>
              </div>
              <Badge variant="info">Network Wide</Badge>
            </div>

            <div className="space-y-3 pt-2">
              {lifecycleData.map((item) => (
                <div key={item.stage} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="font-semibold text-slate-700">{item.stage}</span>
                    <span className="text-slate-900 font-bold">{item.count.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${item.pct}%`, backgroundColor: item.fill }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 font-mono text-center pt-1">
              93.7% of claims received reach settlement
            </p>
          </Card>

          {/* Graph 2: Settlement Ratio by Insurer */}
          <Card className="p-5 space-y-3 border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Settlement Ratio by Insurer</h3>
              <p className="text-[11px] text-slate-500">Target benchmark: ≥ 90.0% payout ratio</p>
            </div>

            <div className="h-48 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratioData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" domain={[80, 100]} unit="%" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: any) => `${val}%`}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <ReferenceLine x={90} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Target 90%', fill: '#f43f5e', fontSize: 10 }} />
                  <Bar dataKey="ratio" fill="#0d9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Graph 3: Average Settlement Time */}
          <Card className="p-5 space-y-3 border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Average Settlement Time</h3>
              <p className="text-[11px] text-slate-500">Days to disburse funds (SLA limit: ≤ 3.0 days)</p>
            </div>

            <div className="h-48 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis unit="d" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: any) => `${val} days`}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <ReferenceLine y={3} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '3d SLA', fill: '#f59e0b', fontSize: 10 }} />
                  <Bar dataKey="days" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-rose-600 font-mono text-center font-bold">
              ⚠ Pragati Life exceeds 3.0-day SLA threshold (5.4 days)
            </p>
          </Card>
        </div>

        {/* Graphs Row 2: Denial Rate & Denial Reasons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graph 4: Denial Rate */}
          <Card className="p-5 space-y-3 border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Denial Rate by Insurer</h3>
              <p className="text-[11px] text-slate-500">Review signal for persistent over-denial patterns</p>
            </div>

            <div className="h-48 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={denialRateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis unit="%" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: any) => `${val}%`}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="rate" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 font-mono text-center">
              Supervisory standard: Rates &gt; 12% trigger automated regulatory inquiry
            </p>
          </Card>

          {/* Graph 5: Denial Reasons */}
          <Card className="p-5 space-y-3 border-slate-200 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Network Denial Reasons by Category</h3>
              <p className="text-[11px] text-slate-500">Mandated public transparency breakdown</p>
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

        {/* 18. Insurer Performance Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
              Insurer Supervisory Performance Directory
            </h2>
            <span className="text-[11px] font-mono text-slate-400">4 licensed underwriters</span>
          </div>

          <Card className="overflow-hidden border-slate-200 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Insurer</th>
                    <th className="p-3">Claims</th>
                    <th className="p-3">Settled</th>
                    <th className="p-3">Denied</th>
                    <th className="p-3">Settlement Ratio</th>
                    <th className="p-3">Avg Time</th>
                    <th className="p-3">SLA Breaches</th>
                    <th className="p-3">Appeals (Overturned)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Supervisory View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {insurerTable.map((ins) => (
                    <tr key={ins.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">
                        {ins.name}
                        <span className="block text-[10px] text-slate-400 font-normal">{ins.license}</span>
                      </td>
                      <td className="p-3 font-bold text-slate-800">{ins.received}</td>
                      <td className="p-3 text-emerald-700 font-bold">{ins.settled}</td>
                      <td className="p-3 text-rose-600">{ins.denied}</td>
                      <td className="p-3 font-bold text-teal-800">{ins.ratio}</td>
                      <td className="p-3">{ins.avgSettlement}</td>
                      <td className="p-3">
                        {ins.breaches > 5 ? (
                          <span className="text-rose-600 font-black">{ins.breaches} ⚠</span>
                        ) : (
                          <span className="text-slate-600">{ins.breaches}</span>
                        )}
                      </td>
                      <td className="p-3">
                        {ins.appeals} ({ins.overturned})
                        <span className="block text-[10px] text-slate-400">{ins.overturnRate} rate</span>
                      </td>
                      <td className="p-3">
                        <Badge variant={ins.status === 'NORMAL' ? 'success' : 'error'}>
                          {ins.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInsurer(ins)}
                          icon={<ArrowRight className="w-3 h-3" />}
                        >
                          View Profile
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* 19-21. Insurer Supervisory Profile Modal */}
        {selectedInsurer && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <Card className="max-w-xl w-full p-6 space-y-4 border-2 border-teal-500 shadow-xl">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <Badge variant={selectedInsurer.status === 'NORMAL' ? 'success' : 'error'}>
                    IDRA SUPERVISORY PROFILE
                  </Badge>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">
                    {selectedInsurer.name}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">License: {selectedInsurer.license}</span>
                </div>
                <button
                  onClick={() => setSelectedInsurer(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">ACTIVE POLICIES</span>
                  <strong className="text-slate-900">{selectedInsurer.policies}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">CLAIMS PAID</span>
                  <strong className="text-emerald-700">{selectedInsurer.settled}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">RATIO</span>
                  <strong className="text-teal-800">{selectedInsurer.ratio}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">SLA BREACHES</span>
                  <strong className={selectedInsurer.breaches > 5 ? 'text-rose-600 font-black' : 'text-slate-800'}>
                    {selectedInsurer.breaches}
                  </strong>
                </div>
              </div>

              {/* 20. Appeal Performance Breakdown */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-indigo-950 uppercase text-[10px]">
                    Independent Appeal Performance
                  </span>
                  <Badge variant="purple">{selectedInsurer.overturnRate} Overturn Rate</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 bg-white rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-400 block">Appeals Filed</span>
                    <strong className="text-slate-900">{selectedInsurer.appeals}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-400 block">Denial Upheld</span>
                    <strong className="text-slate-900">{selectedInsurer.appeals - selectedInsurer.overturned}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-400 block">Overturned</span>
                    <strong className="text-rose-600 font-bold">{selectedInsurer.overturned}</strong>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 italic pt-1">
                  High overturn rates indicate over-denial of valid clinical claims during initial adjudication.
                </p>
              </div>

              {/* 21. Settlement SLA Monitoring */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono space-y-1">
                <span className="font-bold text-slate-800 block text-[10px] uppercase">
                  Settlement SLA Standard
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Payout Speed:</span>
                  <span className="font-semibold text-slate-800">≤ 3.0 days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Observed Median:</span>
                  <span className={selectedInsurer.avgSettlement.startsWith('5') ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                    {selectedInsurer.avgSettlement}
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setSelectedInsurer(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    alert(`Supervisory compliance notice queued for ${selectedInsurer.name}.`);
                    setSelectedInsurer(null);
                  }}
                >
                  Issue Regulatory Notice
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
