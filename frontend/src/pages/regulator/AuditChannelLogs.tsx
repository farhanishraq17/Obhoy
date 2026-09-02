import React, { useState, useMemo } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useSimulationStore } from '../../store/simulationStore';
import { useUIStore } from '../../store/uiStore';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  ExternalLink,
  Lock,
  Layers,
  Sparkles,
  X,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

export const AuditChannelLogs: React.FC = () => {
  const { auditLogs, verifyAnchor } = useSimulationStore();
  const { showToast } = useUIStore();

  const [typeFilter, setTypeFilter] = useState('ALL');
  const [stakeholderFilter, setStakeholderFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [anchorVerified, setAnchorVerified] = useState(true);

  const handleVerifyAnchor = async () => {
    setIsVerifying(true);
    setTimeout(async () => {
      const res = await verifyAnchor();
      setIsVerifying(false);
      setAnchorVerified(true);
      showToast(res.message, 'success');
    }, 900);
  };

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (typeFilter !== 'ALL' && log.type !== typeFilter) return false;
      if (stakeholderFilter !== 'ALL' && log.actorRole !== stakeholderFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchId = log.id.toLowerCase().includes(q);
        const matchEntity = log.entityId.toLowerCase().includes(q);
        const matchDesc = log.description.toLowerCase().includes(q);
        if (!matchId && !matchEntity && !matchDesc) return false;
      }
      return true;
    });
  }, [auditLogs, typeFilter, stakeholderFilter, searchQuery]);

  // Graph 1: Network Events Over Time (41)
  const timelineChartData = [
    { month: 'Jan', count: 420 },
    { month: 'Feb', count: 680 },
    { month: 'Mar', count: 910 },
    { month: 'Apr', count: 1240 },
    { month: 'May', count: 1580 },
    { month: 'Jun', count: 2040 },
    { month: 'Jul', count: 2450 },
    { month: 'Aug', count: 3100 },
    { month: 'Sep', count: 3820 },
  ];

  // Graph 2: Audit Events by Type (42)
  const typeChartData = [
    { type: 'Attestations', count: 4891 },
    { type: 'Events', count: 1240 },
    { type: 'Settlements', count: 980 },
    { type: 'Appeals', count: 32 },
    { type: 'SLA Breaches', count: 17 },
    { type: 'Suspensions', count: 8 },
  ];

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header (36) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono uppercase font-bold text-teal-700 tracking-wider">
                CHANNEL: audit-channel
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-mono text-emerald-600 font-bold flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1"></span>
                Anchor Verified ✓
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Audit Channel Logs & Supervisory Ledger
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Immutable chronological history of network assertions, attestations, adjudications, and tribunal rulings
            </p>
          </div>

          <div className="text-right text-xs font-mono text-slate-400">
            <span>Last Audit Period: </span>
            <strong className="text-slate-700">September 2026</strong>
          </div>
        </div>

        {/* 40. Public Transparency Anchor Section */}
        <Card className="p-5 border-2 border-teal-500/50 bg-gradient-to-r from-teal-50/70 via-white to-white shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-mono text-teal-950 uppercase tracking-wide">
                  Public Transparency Merkle Anchor
                </h3>
                <p className="text-xs text-teal-800 font-mono">
                  External chain commitment (Polygon & OpenTimestamps cryptographic attestation)
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleVerifyAnchor}
              disabled={isVerifying}
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              {isVerifying ? 'Verifying External Merkle Proof...' : 'Verify Anchor'}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-white rounded-xl border border-teal-200 text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[10px] block uppercase font-bold">Audit Period</span>
              <strong className="text-slate-900">2026-09 (Monthly Aggregate)</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block uppercase font-bold">Merkle Root Hash</span>
              <span className="text-teal-800 font-bold block truncate" title="0x7a8c91ef230b44199cba7712e091af">
                0x7a8c...91af
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block uppercase font-bold">External Attestation</span>
              <span className="text-indigo-700 font-semibold">Polygon PoS / OTS (Simulated)</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block uppercase font-bold">Proof Match</span>
              <span className="text-emerald-700 font-extrabold">✓ MATCH CONFIRMED</span>
            </div>
          </div>
        </Card>

        {/* 41 & 42. Audit Graphs Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graph 1: Network Events Over Time */}
          <Card className="p-5 space-y-3 border-slate-200 shadow-xs">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Network Events Over Time</h3>
                <p className="text-[11px] text-slate-500">Cumulative audit channel throughput</p>
              </div>
              <Badge variant="info">Year to Date</Badge>
            </div>

            <div className="h-44 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="count" stroke="#0d9488" fill="#ccfbf1" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Graph 2: Audit Events by Type */}
          <Card className="p-5 space-y-3 border-slate-200 shadow-xs">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Audit Events by Type</h3>
                <p className="text-[11px] text-slate-500">Categorical distribution on audit-channel</p>
              </div>
              <Badge variant="neutral">Ledger Records</Badge>
            </div>

            <div className="h-44 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis dataKey="type" type="category" width={85} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* 37. Filter Bar */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit entries by Record ID (AUD-...), Entity ID, or keywords..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Event Type Filter</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold focus:outline-none"
              >
                <option value="ALL">All Event Types</option>
                <option value="EVENT_CREATED">EVENT_CREATED</option>
                <option value="ATTESTATION_RECORDED">ATTESTATION_RECORDED</option>
                <option value="QUORUM_REACHED">QUORUM_REACHED</option>
                <option value="ENTITLEMENT_AUTHORIZED">ENTITLEMENT_AUTHORIZED</option>
                <option value="ENTITLEMENT_DENIED">ENTITLEMENT_DENIED</option>
                <option value="SETTLEMENT_CONFIRMED">SETTLEMENT_CONFIRMED</option>
                <option value="APPEAL_SUBMITTED">APPEAL_SUBMITTED</option>
                <option value="APPEAL_RESOLVED">APPEAL_RESOLVED</option>
                <option value="PROVIDER_SUSPENDED">PROVIDER_SUSPENDED</option>
                <option value="SLA_BREACH">SLA_BREACH</option>
                <option value="ANCHOR_PUBLISHED">ANCHOR_PUBLISHED</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Stakeholder Class</label>
              <select
                value={stakeholderFilter}
                onChange={(e) => setStakeholderFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold focus:outline-none"
              >
                <option value="ALL">All Stakeholder Classes</option>
                <option value="CONSORTIUM">CONSORTIUM / System Node</option>
                <option value="INSURER">INSURER Node</option>
                <option value="PROVIDER">PROVIDER Node</option>
                <option value="TRIBUNAL">INDEPENDENT TRIBUNAL</option>
                <option value="GATEWAY">PAYMENT GATEWAY</option>
                <option value="REGULATOR">IDRA REGULATOR</option>
              </select>
            </div>
          </div>
        </div>

        {/* 38. Chronological Audit Timeline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
              Audit Channel Sequence Records ({filteredLogs.length})
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Orderer timestamp sequence</span>
          </div>

          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <Card
                key={log.id}
                className="p-4 border-slate-200 hover:border-teal-300 transition-all shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-400">{log.timestamp}</span>
                      <span className="text-slate-300">•</span>
                      <Badge
                        variant={
                          log.type.includes('BREACH') || log.type.includes('DENIED') || log.type.includes('SUSPENDED')
                            ? 'error'
                            : log.type.includes('RESOLVED') || log.type.includes('CONFIRMED') || log.type.includes('ANCHOR')
                            ? 'success'
                            : 'info'
                        }
                      >
                        {log.type}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-teal-800">{log.entityId}</span>
                    </div>
                    <p className="text-xs font-mono text-slate-800 pt-0.5">{log.description}</p>
                    <div className="text-[11px] font-mono text-slate-400">
                      Actor: <span className="text-slate-700 font-semibold">{log.actorName}</span> ({log.actorRole})
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 justify-end shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAuditLog(log)}
                      icon={<FileText className="w-3.5 h-3.5" />}
                    >
                      Inspect Record
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 39. Audit Record Detail Modal */}
        {selectedAuditLog && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <Card className="max-w-xl w-full p-6 space-y-4 border-2 border-teal-500 shadow-xl">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <Badge variant="info">AUDIT LOG INSPECTION</Badge>
                  <h3 className="text-xl font-mono font-black text-slate-900 mt-1">
                    {selectedAuditLog.id}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">Channel: {selectedAuditLog.channel}</span>
                </div>
                <button onClick={() => setSelectedAuditLog(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] block">EVENT TYPE</span>
                    <strong className="text-teal-800">{selectedAuditLog.type}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">TARGET ENTITY</span>
                    <strong className="text-slate-900">{selectedAuditLog.entityId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">ACTOR CLASS</span>
                    <span className="text-slate-800 font-bold">{selectedAuditLog.actorRole}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">ORDERER TIMESTAMP</span>
                    <span className="text-slate-800">{selectedAuditLog.timestamp}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Transaction Payload Description</span>
                  <p className="text-slate-900 mt-0.5">{selectedAuditLog.description}</p>
                </div>

                {/* Evidence Hash */}
                <div className="p-3.5 bg-teal-50 rounded-xl border border-teal-200 space-y-1">
                  <span className="text-teal-950 font-bold block text-[10px] uppercase">
                    Off-Chain Cryptographic Evidence Hash
                  </span>
                  <div className="p-2 bg-white rounded border border-teal-200 font-mono text-teal-800 text-[11px] break-all">
                    {selectedAuditLog.evidenceHash}
                  </div>
                  <p className="text-[10px] text-teal-700 italic pt-1">
                    Sensitive medical details remain off-chain; the audit channel records cryptographically bound hashes and state transitions.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button variant="primary" size="sm" onClick={() => setSelectedAuditLog(null)}>
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
