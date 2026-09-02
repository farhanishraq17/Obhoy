import React from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useSimulationStore } from '../../store/simulationStore';
import { useAuthStore } from '../../store/authStore';
import { formatBDT } from '../../lib/format';
import { HeartPulse, Activity, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PolicyDashboard: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { policies, events } = useSimulationStore();

  const userPolicies = policies.filter(
    (p) =>
      p.holderId === currentUser.id ||
      p.holderNID === currentUser.nid ||
      p.id === currentUser.policyId
  );

  const userEvents = events.filter(
    (e) =>
      e.holderId === currentUser.id ||
      e.holderNIDCommitment === currentUser.nidCommitment ||
      (currentUser.name && e.holderName?.toLowerCase() === currentUser.name.toLowerCase())
  );

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Welcome, {currentUser.name}</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Holder Number: {currentUser.holderNumber || 'HLD-1001'} | MFI: {currentUser.mfi} ({currentUser.group})
            </p>
          </div>
          <Link to="/policyholder/events">
            <Button variant="outline" size="sm" icon={<Activity className="w-4 h-4" />}>
              View Active Events ({userEvents.length})
            </Button>
          </Link>
        </div>

        {/* Active Policies Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userPolicies.map((p) => (
            <Card key={p.id} glass className="space-y-4 border-teal-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HeartPulse className="w-5 h-5 text-teal-600" />
                  <span className="font-bold text-slate-900 text-sm">{p.product}</span>
                </div>
                <Badge variant={p.status === 'ACTIVE' ? 'success' : 'warning'}>{p.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px]">POLICY ID</span>
                  <span className="text-teal-700 font-bold">{p.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">INSURER</span>
                  <span className="text-slate-800 font-semibold">{p.insurerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">BENEFIT CAP</span>
                  <span className="text-emerald-700 font-bold">{formatBDT(p.benefitCap)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SCHEDULE VERSION</span>
                  <span className="text-slate-700">{p.scheduleVersion}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Active Events Overview */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider">
            Insurable Events & Claims
          </h2>
          {userEvents.length === 0 ? (
            <Card className="text-center py-8 text-slate-500 text-xs space-y-2">
              <Clock className="w-6 h-6 mx-auto text-slate-400" />
              <p>No active hospital admission events recorded for your policy yet.</p>
              <p className="text-[11px] text-teal-700 font-mono">
                When an accredited provider asserts a hospital admission, it will appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {userEvents.map((evt) => (
                <Card key={evt.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-teal-700 text-sm">{evt.id}</span>
                      <Badge variant={evt.status === 'CLOSED_ELIGIBLE' ? 'success' : 'info'}>{evt.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-800 font-semibold mt-1">{evt.diagnosisCategory}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{evt.facilityName} • {evt.createdAt}</p>
                  </div>
                  <Link to="/policyholder/events">
                    <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                      Details
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};
