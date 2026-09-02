import React, { useEffect, useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import { useSimulationStore } from '../../store/simulationStore';
import {
  Scale,
  ShieldCheck,
  RefreshCw,
  Building,
  Users,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  BarChart3,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const RegulatorDashboard: React.FC = () => {
  const { appeals, events, entitlements } = useSimulationStore();
  const [nakamoto, setNakamoto] = useState<number>(3);
  const [gini, setGini] = useState<number>(0.14);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const fetchLiveMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await api.governanceMetrics();
      if (res.ok && res.result) {
        if (res.result.nakamoto !== undefined) setNakamoto(res.result.nakamoto);
        if (res.result.gini !== undefined) setGini(Number(res.result.gini.toFixed(2)));
      }
    } catch {
      // Keep whitepaper defaults
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchLiveMetrics();
  }, []);

  const votingWeights = [
    { class: 'Insurers (Collectively)', weight: '0.30 (30%)', limit: 'Hard Cap 30%' },
    { class: 'IDRA Regulator Node', weight: '0.20 (20%)', limit: 'Supervisory Node' },
    { class: 'MFI / NGO Aggregators', weight: '0.20 (20%)', limit: 'Channel Partner' },
    { class: 'Provider Association', weight: '0.15 (15%)', limit: 'Medical Facilities' },
    { class: 'Academic Auditor (DU)', weight: '0.15 (15%)', limit: 'Independent Node' },
  ];

  const operationalKPIs = [
    { label: 'ACTIVE INSURERS', value: '12', note: 'Licensed under IDRA', path: '/regulator/insurers' },
    { label: 'ACTIVE PROVIDERS', value: '467', note: 'Accredited hospitals', path: '/regulator/providers' },
    { label: 'OPEN EVENTS', value: (38 + events.filter(e => e.status === 'OPEN').length).toString(), note: 'In-flight admissions', path: '/verifier/queue' },
    { label: 'ELIGIBLE ENTITLEMENTS', value: (24 + entitlements.filter(e => e.status === 'OPEN').length).toString(), note: 'Awaiting insurer review', path: '/insurer/queue' },
    { label: 'PENDING APPEALS', value: appeals.filter(a => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length.toString(), note: 'In tribunal docket', path: '/regulator/appeals' },
    { label: 'SLA BREACHES', value: '7', note: 'Settlement > 3 days', path: '/regulator/insurers' },
  ];

  // Claims trend data
  const claimsTrendData = [
    { month: 'Apr', received: 1100, settled: 1040, denied: 60 },
    { month: 'May', received: 1250, settled: 1180, denied: 70 },
    { month: 'Jun', received: 1380, settled: 1300, denied: 80 },
    { month: 'Jul', received: 1450, settled: 1370, denied: 80 },
    { month: 'Aug', received: 1520, settled: 1440, denied: 80 },
    { month: 'Sep', received: 1610, settled: 1530, denied: 80 },
  ];

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono uppercase font-bold text-teal-700 tracking-wider">
                IDRA SUPERVISORY CONTROL VIEW
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-mono text-slate-500">Continuous Network Oversight</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              IDRA Consortium Governance & Supervisory Node
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Consortium governance bounds, operational telemetry & supervisory monitoring (Article VI)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              isLoading={loadingMetrics}
              onClick={fetchLiveMetrics}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Metrics
            </Button>
            <Link to="/regulator/appeals">
              <Button variant="primary" size="sm" icon={<Scale className="w-4 h-4" />}>
                Appeals Tribunal ({appeals.length})
              </Button>
            </Link>
          </div>
        </div>

        {/* Row 1: Decentralization & Governance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 space-y-2 border-teal-200 shadow-xs">
            <span className="text-xs text-slate-500 font-mono font-semibold uppercase">
              MINIMUM CONSENSUS CLASS QUORUM
            </span>
            <div className="text-3xl font-mono font-black text-teal-700">{nakamoto}</div>
            <p className="text-[11px] text-slate-500">
              Requires {nakamoto} institutional classes to reach consensus majority (Nakamoto Coefficient &ge; 3)
            </p>
          </Card>

          <Card className="p-5 space-y-2 border-teal-200 shadow-xs">
            <span className="text-xs text-slate-500 font-mono font-semibold uppercase">
              AUTHORITY DISPERSION INDEX
            </span>
            <div className="text-3xl font-mono font-black text-emerald-700">{gini}</div>
            <p className="text-[11px] text-slate-500">
              Gini Coefficient (Target &le; 0.20; 0.00 = perfect equality among consortium classes)
            </p>
          </Card>

          <Card className="p-5 space-y-2 border-teal-200 shadow-xs">
            <span className="text-xs text-slate-500 font-mono font-semibold uppercase">
              CONSORTIUM VALIDATOR NODES
            </span>
            <div className="text-3xl font-mono font-black text-indigo-700">5 / 5</div>
            <p className="text-[11px] text-slate-500">
              IDRA (O1), Insurers (O2-O3), MFI Consortium (O4), Academic Auditor (O5)
            </p>
          </Card>
        </div>

        {/* Section 43: Row 2 Operational KPIs */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500 tracking-wider">
            Operational Telemetry (September 2026)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {operationalKPIs.map((kpi) => (
              <Link key={kpi.label} to={kpi.path}>
                <Card className="p-3.5 border-slate-200 hover:border-teal-300 transition-all shadow-xs">
                  <span className="text-[10px] font-mono font-bold text-slate-500 block truncate">
                    {kpi.label}
                  </span>
                  <div className="text-2xl font-mono font-black text-slate-900 mt-1">{kpi.value}</div>
                  <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">{kpi.note}</span>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Graphs Section: Network Health & Claims Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 44: Graph 1 - Network Health Checklist */}
          <Card className="p-5 space-y-4 border-slate-200 shadow-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Network Health Status</h3>
                <p className="text-[11px] text-slate-500">Core consensus and supervisory sub-systems</p>
              </div>
              <Badge variant="success">All Systems Green ✓</Badge>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {[
                { name: 'Consortium Validator Nodes', detail: '5 of 5 Online & Endorsing', status: '✓ Normal' },
                { name: 'Audit Channel Orderer', detail: 'audit-channel block height synced', status: '✓ Online' },
                { name: 'External Anchor Verification', detail: 'Polygon / OpenTimestamps Root match', status: '✓ Verified' },
                { name: 'Provider API Gateways', detail: '18 of 18 DGHS endpoints responding', status: '✓ Normal' },
                { name: 'Consortium SLA Compliance', detail: '96.4% settled within 3 business days', status: '✓ Compliant' },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 block">{item.name}</span>
                    <span className="text-[11px] text-slate-500">{item.detail}</span>
                  </div>
                  <span className="text-emerald-700 font-bold text-xs">{item.status}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Section 45: Graph 2 - Claims Activity Trend */}
          <Card className="p-5 space-y-4 border-slate-200 shadow-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Network Claims Activity Trend</h3>
                <p className="text-[11px] text-slate-500">Received vs Settled vs Denied across all insurers</p>
              </div>
              <Badge variant="info">Multi-Series</Badge>
            </div>

            <div className="h-56 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={claimsTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="received" stroke="#0ea5e9" strokeWidth={2} name="Received" />
                  <Line type="monotone" dataKey="settled" stroke="#10b981" strokeWidth={2} name="Settled" />
                  <Line type="monotone" dataKey="denied" stroke="#f43f5e" strokeWidth={2} name="Denied" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-center space-x-4 text-xs font-mono text-slate-600">
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-sky-500 rounded-full mr-1.5"></span>Received</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-1.5"></span>Settled</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full mr-1.5"></span>Denied</span>
            </div>
          </Card>
        </div>

        {/* Section 46 & 47: Governance Weights Schedule & Interpretation Card */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider">
              Consortium Voting Weights Schedule (Article VI)
            </h2>
            <Badge variant="success">
              <ShieldCheck className="w-3 h-3 inline mr-1" />
              Decentralization Bound Met
            </Badge>
          </div>

          <DataTable
            data={votingWeights}
            keyExtractor={(w) => w.class}
            columns={[
              { header: 'Stakeholder Class', accessorKey: 'class', className: 'font-bold text-slate-900' },
              { header: 'Voting Weight', accessorKey: 'weight', className: 'text-teal-700 font-mono font-bold' },
              { header: 'Policy Limit', accessorKey: 'limit', className: 'text-slate-500 font-mono' },
            ]}
          />

          {/* Section 47: Governance Interpretation Card */}
          <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl text-xs font-mono text-teal-900 space-y-1">
            <div className="font-bold flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>Consortium Governance Interpretation</span>
            </div>
            <p className="text-teal-800 leading-relaxed text-[11px]">
              No single insurer or stakeholder class commands more than 30% voting weight. Consensus requires at least 3 distinct institutional stakeholder classes (Nakamoto &ge; 3). IDRA holds veto-endorsing rights over contract parameter updates.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
