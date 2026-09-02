import React from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useSimulationStore } from '../../store/simulationStore';
import { useUIStore } from '../../store/uiStore';
import { CheckCircle2, XCircle } from 'lucide-react';

export const AppealsMonitoring: React.FC = () => {
  const { appeals, resolveAppeal } = useSimulationStore();
  const { showToast } = useUIStore();

  const handleVote = async (appealId: string, decision: 'UPHELD' | 'OVERTURNED') => {
    const result = await resolveAppeal(appealId, decision);
    showToast(result.message, result.success ? 'success' : 'error');
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Independent Appeals Tribunal</h1>
          <p className="text-xs text-slate-500 font-mono">
            Panels comprised of Academic Auditor (DU), IDRA Regulator, and Consumer Rights Representatives
          </p>
        </div>

        {appeals.length === 0 ? (
          <Card className="text-center py-12 text-slate-500 text-xs">
            No active appeals filed in the tribunal queue.
          </Card>
        ) : (
          appeals.map((apl) => (
            <Card key={apl.id} className="p-6 space-y-4 border-indigo-200">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-teal-700 text-base">{apl.id}</span>
                    <Badge variant={apl.status === 'OVERTURNED' ? 'success' : 'purple'}>{apl.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 font-mono mt-1">
                    Entitlement ID: {apl.entitlementId} | Claimant: {apl.holderName}
                  </p>
                  <p className="text-xs text-slate-800 mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 leading-relaxed">
                    <span className="text-slate-500 font-mono block text-[10px] font-semibold">GROUNDS FOR APPEAL:</span>
                    {apl.reason}
                  </p>
                </div>
              </div>

              {apl.status === 'SUBMITTED' && (
                <div className="flex items-center space-x-3 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleVote(apl.id, 'OVERTURNED')}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Vote to OVERTURN Denial (Force Settlement)
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleVote(apl.id, 'UPHELD')}
                    icon={<XCircle className="w-4 h-4" />}
                  >
                    Vote to UPHOLD Insurer Denial
                  </Button>
                </div>
              )}

              {apl.decision && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-xs font-bold">
                  Tribunal Decision: {apl.decision}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
};
