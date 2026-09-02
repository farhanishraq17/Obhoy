import React, { useState, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useSimulationStore } from '../../store/simulationStore';
import { useAuthStore } from '../../store/authStore';
import { formatBDT } from '../../lib/format';
import {
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
} from 'lucide-react';

export const InsurerEventQueue: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatusFilter = searchParams.get('status') || 'ALL';

  const { currentInsurer } = useAuthStore();
  const { entitlements, events } = useSimulationStore();

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [coverageFilter, setCoverageFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('30D');
  const [amountFilter, setAmountFilter] = useState('ALL');

  // Filtered Entitlements
  const filteredEntitlements = useMemo(() => {
    return entitlements.filter((ent) => {
      // Search match
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesId = ent.id.toLowerCase().includes(q);
        const matchesEvent = ent.eventId.toLowerCase().includes(q);
        const matchesPolicy = ent.policyId.toLowerCase().includes(q);
        if (!matchesId && !matchesEvent && !matchesPolicy) return false;
      }

      // Status match
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING' && ent.status !== 'OPEN') return false;
        if (statusFilter !== 'PENDING' && ent.status !== statusFilter) return false;
      }

      // Amount match
      if (amountFilter === 'LOW' && (ent.amount || 50000) > 25000) return false;
      if (amountFilter === 'MID' && ((ent.amount || 50000) <= 25000 || (ent.amount || 50000) > 50000)) return false;
      if (amountFilter === 'HIGH' && (ent.amount || 50000) <= 50000) return false;

      return true;
    });
  }, [entitlements, searchQuery, statusFilter, coverageFilter, dateFilter, amountFilter]);

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono uppercase font-bold text-teal-700 tracking-wider">
                MAIN WORK QUEUE
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-mono text-slate-500">{currentInsurer.name}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Eligible Claims Queue
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Insurable episodes with verified 2-of-3 attestation consensus awaiting adjudication or disbursement
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link to="/insurer/settlement">
              <Button variant="outline" size="sm" icon={<CreditCard className="w-4 h-4" />}>
                Go to Settlement Rail
              </Button>
            </Link>
          </div>
        </div>

        {/* 14 & 15. Queue Search & Multi-Filters */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Event ID (EVT-...), Entitlement ID (ENT-...), or Policy ID (POL-...)"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Adjudication</option>
                <option value="AUTHORIZED">Authorized</option>
                <option value="SETTLED">Settled</option>
                <option value="DENIED">Denied</option>
                <option value="APPEALED">Appealed</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Coverage</label>
              <select
                value={coverageFilter}
                onChange={(e) => setCoverageFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold focus:outline-none"
              >
                <option value="ALL">All Coverages</option>
                <option value="HOSP">Hospitalization</option>
                <option value="CRIT">Critical Illness</option>
                <option value="MAT">Maternity</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold focus:outline-none"
              >
                <option value="30D">Last 30 Days</option>
                <option value="7D">Last 7 Days</option>
                <option value="90D">Last 90 Days</option>
                <option value="ALL">All Time</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Amount</label>
              <select
                value={amountFilter}
                onChange={(e) => setAmountFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold focus:outline-none"
              >
                <option value="ALL">All Amounts</option>
                <option value="LOW">≤ BDT 25,000</option>
                <option value="MID">BDT 25k - 50k</option>
                <option value="HIGH">&gt; BDT 50,000</option>
              </select>
            </div>
          </div>
        </div>

        {/* 13. Eligible Event Cards List */}
        {filteredEntitlements.length === 0 ? (
          <Card className="text-center py-12 text-slate-500 text-xs font-mono space-y-2">
            <p className="font-bold text-slate-700 text-sm">No claims match the active filters.</p>
            <p className="text-slate-400">Try adjusting your search query or status filter above.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredEntitlements.map((ent) => {
              const parentEvent = events.find((e) => e.id === ent.eventId);

              return (
                <Card
                  key={ent.id}
                  className="p-5 space-y-4 border-slate-200 hover:border-teal-300 transition-all shadow-xs"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-slate-900 text-lg">{ent.id}</span>
                        <Badge
                          variant={
                            ent.status === 'AUTHORIZED'
                              ? 'success'
                              : ent.status === 'DENIED'
                              ? 'error'
                              : ent.status === 'SETTLED'
                              ? 'info'
                              : ent.status === 'APPEALED'
                              ? 'purple'
                              : 'warning'
                          }
                        >
                          {ent.status === 'OPEN' ? 'PENDING ADJUDICATION' : ent.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-500 pt-1">
                        <span>Event: <strong className="text-teal-700">{ent.eventId}</strong></span>
                        <span>•</span>
                        <span>Policy: <strong className="text-slate-800">{ent.policyId}</strong></span>
                        <span>•</span>
                        <span>Benefit: <strong className="text-slate-800">Hospitalization</strong></span>
                      </div>
                    </div>

                    {/* Right side stats & CTA */}
                    <div className="flex items-center space-x-6 justify-between md:justify-end">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                          Eligible Benefit
                        </span>
                        <span className="text-xl font-mono font-black text-emerald-700">
                          {formatBDT(ent.amount || 50000)}
                        </span>
                      </div>

                      <div className="hidden sm:flex items-center space-x-3 text-xs font-mono bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-slate-400 text-[9px] uppercase block font-bold">Verification</span>
                          <span className="text-emerald-700 font-extrabold">2 / 3 ✓</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[9px] uppercase block font-bold">Event Status</span>
                          <span className="text-slate-800 font-bold">CLOSED_ELIGIBLE ✓</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Link to={`/insurer/entitlements/${ent.id}`}>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<ArrowRight className="w-4 h-4" />}
                          >
                            Review Claim
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
};
