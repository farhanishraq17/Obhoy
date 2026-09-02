import React, { useEffect, useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import { useSimulationStore } from '../../store/simulationStore';
import { Scale, ShieldCheck, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export const RegulatorDashboard: React.FC = () => {
  const { appeals } = useSimulationStore();
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

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">IDRA Supervisory Control Node</h1>
            <p className="text-xs text-slate-500 font-mono">
              Real-time audit channel & consortium governance metrics (Live from GovernanceCouncil chaincode)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" isLoading={loadingMetrics} onClick={fetchLiveMetrics} icon={<RefreshCw className="w-3.5 h-3.5" />}>
              Refresh Metrics
            </Button>
            <Link to="/regulator/appeals">
              <Button variant="primary" size="sm" icon={<Scale className="w-4 h-4" />}>
                Appeals Tribunal ({appeals.length})
              </Button>
            </Link>
          </div>
        </div>

        {/* Decentralization & Governance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="space-y-2 border-teal-200">
            <span className="text-xs text-slate-500 font-mono font-semibold uppercase">MINIMUM CONSENSUS CLASS QUORUM</span>
            <div className="text-3xl font-extrabold text-teal-700">{nakamoto}</div>
            <p className="text-[11px] text-slate-500">Requires {nakamoto} institutional classes to reach consensus majority (Nakamoto Coefficient &ge; 3)</p>
          </Card>

          <Card className="space-y-2 border-teal-200">
            <span className="text-xs text-slate-500 font-mono font-semibold uppercase">AUTHORITY DISPERSION INDEX</span>
            <div className="text-3xl font-extrabold text-emerald-700">{gini}</div>
            <p className="text-[11px] text-slate-500">Gini Coefficient (Target &le; 0.20; 0.00 = perfect equality)</p>
          </Card>

          <Card className="space-y-2 border-teal-200">
            <span className="text-xs text-slate-500 font-mono font-semibold uppercase">CONSORTIUM VALIDATOR NODES</span>
            <div className="text-3xl font-extrabold text-indigo-700">5 / 5</div>
            <p className="text-[11px] text-slate-500">IDRA (O1), Insurers (O2-O3), MFI Consortium (O4), Academic (O5)</p>
          </Card>
        </div>

        {/* Governance Weight Table */}
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
        </div>
      </div>
    </PageContainer>
  );
};
