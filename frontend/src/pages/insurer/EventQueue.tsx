import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useSimulationStore } from '../../store/simulationStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { formatBDT } from '../../lib/format';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export const InsurerEventQueue: React.FC = () => {
  const navigate = useNavigate();
  const { currentInsurer } = useAuthStore();
  const { entitlements, events, authorizeEntitlement } = useSimulationStore();
  const { showToast } = useUIStore();

  const handleAuthorize = async (entId: string) => {
    const result = await authorizeEntitlement(entId, 50000);
    showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
      navigate('/insurer/settlement');
    }
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Eligible Claims Queue — {currentInsurer.name}</h1>
            <p className="text-xs text-slate-500 font-mono">
              Events where 2-of-3 multi-class attestation quorum is satisfied (`CLOSED_ELIGIBLE`)
            </p>
          </div>
        </div>

        {entitlements.length === 0 ? (
          <Card className="text-center py-12 text-slate-500 text-xs">
            No eligible entitlements pending adjudication.
          </Card>
        ) : (
          entitlements.map((ent) => {
            const parentEvent = events.find((e) => e.id === ent.eventId);

            return (
              <Card key={ent.id} className="p-6 space-y-4 border-teal-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-teal-700 text-base">{ent.id}</span>
                      <Badge variant={ent.status === 'AUTHORIZED' ? 'success' : ent.status === 'DENIED' ? 'error' : 'info'}>
                        {ent.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 font-mono mt-1">
                      Event: {ent.eventId} | Policy: {ent.policyId}
                    </p>
                    <p className="text-sm font-bold text-emerald-700 mt-0.5">
                      Eligible Benefit Amount: {formatBDT(ent.amount)}
                    </p>
                  </div>

                  {ent.status === 'OPEN' && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAuthorize(ent.id)}
                        icon={<CheckCircle2 className="w-4 h-4" />}
                      >
                        Authorize BDT {ent.amount.toLocaleString()}
                      </Button>
                    </div>
                  )}

                  {ent.status === 'AUTHORIZED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/insurer/settlement')}
                      icon={<ArrowRight className="w-4 h-4" />}
                    >
                      Execute bKash Settlement
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </PageContainer>
  );
};
