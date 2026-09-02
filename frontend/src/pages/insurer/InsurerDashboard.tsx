import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/authStore';
import { useSimulationStore } from '../../store/simulationStore';
import {
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  BarChart3,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';

export const InsurerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentInsurer } = useAuthStore();
  const { entitlements, events, settlements, appeals } = useSimulationStore();
  const [trendRange, setTrendRange] = useState<'7D' | '30D' | '90D'>('30D');

  // Dynamic counts merged with realistic baseline
  const openEntitlements = entitlements.filter((e) => e.status === 'OPEN').length;
  const authorizedEntitlements = entitlements.filter((e) => e.status === 'AUTHORIZED').length;
  const settledEntitlements = entitlements.filter((e) => e.status === 'SETTLED').length;
  const deniedEntitlements = entitlements.filter((e) => e.status === 'DENIED').length;
  const paymentIssues = settlements.filter((s) => s.status === 'RECONCILIATION_REQUIRED').length;

  const kpis = [
    {
      title: 'Eligible Events',
      value: 24 + events.filter((e) => e.status === 'CLOSED_ELIGIBLE').length,
      icon: <FileCheck className="w-5 h-5 text-teal-600" />,
      color: 'border-teal-300 hover:border-teal-500',
      path: '/insurer/queue',
      note: 'Closed & verified',
    },
    {
      title: 'Pending Review',
      value: 8 + openEntitlements,
      icon: <Clock className="w-5 h-5 text-amber-500" />,
      color: 'border-amber-300 hover:border-amber-500',
      path: '/insurer/queue?status=OPEN',
      note: 'Awaiting decision',
    },
    {
      title: 'Authorized',
      value: 12 + authorizedEntitlements,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      color: 'border-emerald-300 hover:border-emerald-500',
      path: '/insurer/queue?status=AUTHORIZED',
      note: 'Approved for payout',
    },
    {
      title: 'Settled',
      value: 9 + settledEntitlements,
      icon: <CreditCard className="w-5 h-5 text-blue-600" />,
      color: 'border-blue-300 hover:border-blue-500',
      path: '/insurer/settlement',
      note: 'Disbursed via MFS',
    },
    {
      title: 'Denied',
      value: 3 + deniedEntitlements,
      icon: <XCircle className="w-5 h-5 text-rose-500" />,
      color: 'border-rose-300 hover:border-rose-500',
      path: '/insurer/queue?status=DENIED',
      note: 'Policy exclusions',
    },
    {
      title: 'Payment Issues',
      value: Math.max(1, paymentIssues),
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      color: 'border-amber-400 hover:border-amber-600',
      path: '/insurer/settlement',
      note: 'Gateway timeouts',
    },
  ];

  // Graph 1: Funnel / Lifecycle data
  const lifecycleData = [
    { stage: 'Events', count: 120, pct: 100, fill: '#0f766e' },
    { stage: 'Closed Eligible', count: 94, pct: 78, fill: '#0d9488' },
    { stage: 'Adjudicated', count: 82, pct: 68, fill: '#14b8a6' },
    { stage: 'Authorized', count: 70, pct: 58, fill: '#10b981' },
    { stage: 'Settled', count: 66, pct: 55, fill: '#059669' },
  ];

  // Graph 2: Trend data
  const trendDataMap = {
    '7D': [
      { date: 'Mon', settlements: 9, amount: 450 },
      { date: 'Tue', settlements: 12, amount: 600 },
      { date: 'Wed', settlements: 10, amount: 500 },
      { date: 'Thu', settlements: 15, amount: 750 },
      { date: 'Fri', settlements: 14, amount: 700 },
      { date: 'Sat', settlements: 8, amount: 400 },
      { date: 'Sun', settlements: 11, amount: 550 },
    ],
    '30D': [
      { date: 'Week 1', settlements: 42, amount: 2100 },
      { date: 'Week 2', settlements: 58, amount: 2900 },
      { date: 'Week 3', settlements: 64, amount: 3200 },
      { date: 'Week 4', settlements: 71, amount: 3550 },
    ],
    '90D': [
      { date: 'Jul', settlements: 180, amount: 9000 },
      { date: 'Aug', settlements: 215, amount: 10750 },
      { date: 'Sep', settlements: 242, amount: 12100 },
    ],
  };

  // Graph 3: Donut chart
  const outcomeData = [
    { name: 'Authorized', value: 70, color: '#0d9488' },
    { name: 'Denied', value: 18, color: '#f43f5e' },
    { name: 'Pending', value: 12, color: '#f59e0b' },
  ];

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono uppercase font-bold text-teal-700 tracking-wider">
                INSURER DASHBOARD
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center text-[11px] font-mono text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1 animate-pulse"></span>
                Operational
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {currentInsurer.name}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Claims adjudication, disbursement execution & risk monitor • September 2026
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link to="/insurer/queue">
              <Button variant="primary" size="sm" icon={<FileCheck className="w-4 h-4" />}>
                Review Claims Queue
              </Button>
            </Link>
            <Link to="/insurer/settlement">
              <Button variant="outline" size="sm" icon={<CreditCard className="w-4 h-4" />}>
                Settlement Rail
              </Button>
            </Link>
          </div>
        </div>

        {/* 7.2 KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((kpi) => (
            <div
              key={kpi.title}
              onClick={() => navigate(kpi.path)}
              className={`p-4 rounded-xl bg-white border cursor-pointer transition-all shadow-sm hover:shadow-md ${kpi.color}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                  {kpi.title}
                </span>
                {kpi.icon}
              </div>
              <div className="text-2xl font-mono font-black text-slate-900">{kpi.value}</div>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">{kpi.note}</span>
            </div>
          ))}
        </div>

        {/* Graphs Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graph 1: Claim Lifecycle Funnel */}
          <Card className="p-5 space-y-4 border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Claim Lifecycle</h3>
                <p className="text-[11px] text-slate-500">Pipeline progression from assertion to settlement</p>
              </div>
              <Badge variant="info">Funnel View</Badge>
            </div>

            <div className="space-y-3 pt-2">
              {lifecycleData.map((item) => (
                <div key={item.stage} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="font-semibold text-slate-700">{item.stage}</span>
                    <span className="text-slate-900 font-bold">{item.count}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.pct}%`, backgroundColor: item.fill }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 font-mono text-center pt-1">
              Conversion rate: 55% of asserted events reach final settlement
            </p>
          </Card>

          {/* Graph 2: Settlement Trend */}
          <Card className="p-5 space-y-4 border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Settlement Trend</h3>
                <p className="text-[11px] text-slate-500">Disbursement counts across periods</p>
              </div>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-mono font-bold">
                {(['7D', '30D', '90D'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTrendRange(r)}
                    className={`px-2 py-0.5 rounded ${trendRange === r ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-52 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendDataMap[trendRange]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="settlements"
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#0d9488' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 font-mono text-center">
              Target SLA: ≤ 3.0 days median payout time
            </p>
          </Card>

          {/* Graph 3: Entitlement Outcomes Donut */}
          <Card className="p-5 space-y-4 border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Entitlement Outcomes</h3>
                <p className="text-[11px] text-slate-500">Adjudication resolution breakdown</p>
              </div>
              <Badge variant="info">Prototype Data</Badge>
            </div>

            <div className="h-52 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {outcomeData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => `${val}%`}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-around text-xs font-mono pt-1">
              {outcomeData.map((item) => (
                <div key={item.name} className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 font-medium">{item.name}</span>
                  <span className="font-bold text-slate-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Section 11: Needs Attention */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                Needs Attention Right Now
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">3 priority action items</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Item 1: Pending Adjudication */}
            <Card className="p-4 border-amber-200 bg-amber-50/40 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono font-bold text-amber-900 block">ENT-9592</span>
                  <span className="text-[11px] text-amber-700">Pending Adjudication • Quorum Satisfied</span>
                </div>
                <Badge variant="warning">Action Needed</Badge>
              </div>
              <div className="text-xs font-mono text-slate-700">
                Eligible Benefit: <strong className="text-emerald-700 font-bold">BDT 50,000</strong>
              </div>
              <Link to="/insurer/entitlements/ENT-9592" className="block">
                <Button variant="primary" size="sm" className="w-full justify-center" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Review Claim
                </Button>
              </Link>
            </Card>

            {/* Item 2: Unknown Payment */}
            <Card className="p-4 border-rose-200 bg-rose-50/40 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono font-bold text-rose-900 block">SET-9415</span>
                  <span className="text-[11px] text-rose-700">Payment Outcome Unknown • Gateway Timeout</span>
                </div>
                <Badge variant="error">Timeout ⚠</Badge>
              </div>
              <div className="text-xs font-mono text-slate-700">
                Disbursement Amount: <strong className="text-slate-900 font-bold">BDT 50,000</strong>
              </div>
              <Link to="/insurer/settlement" className="block">
                <Button variant="outline" size="sm" className="w-full justify-center text-rose-700 border-rose-300 hover:bg-rose-100" icon={<CreditCard className="w-3.5 h-3.5" />}>
                  Reconcile Payment
                </Button>
              </Link>
            </Card>

            {/* Item 3: Appeal Submitted */}
            <Card className="p-4 border-indigo-200 bg-indigo-50/40 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-900 block">ENT-9587</span>
                  <span className="text-[11px] text-indigo-700">Appeal Submitted to IDRA Tribunal</span>
                </div>
                <Badge variant="purple">Under Review</Badge>
              </div>
              <div className="text-xs font-mono text-slate-700">
                Arbitration Panel: <strong className="text-slate-900">Academic + Consumer + IDRA</strong>
              </div>
              <Link to="/regulator/appeals" className="block">
                <Button variant="outline" size="sm" className="w-full justify-center text-indigo-700 border-indigo-300 hover:bg-indigo-100" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Monitor Appeal
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
