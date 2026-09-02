import React from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Timeline } from '../../components/ui/Timeline';
import { QuorumIndicator } from '../../components/workflow/QuorumIndicator';
import { useSimulationStore } from '../../store/simulationStore';
import { useAuthStore } from '../../store/authStore';
import { CheckCircle2, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MyEvents: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { events, entitlements, settlements } = useSimulationStore();

  const userEvents = events.filter(
    (e) =>
      e.holderId === currentUser.id ||
      e.holderNIDCommitment === currentUser.nidCommitment ||
      (currentUser.name && e.holderName?.toLowerCase() === currentUser.name.toLowerCase())
  );

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Insurable Events</h1>
            <p className="text-xs text-slate-500 font-mono">
              Hospital admissions & attestation status for <span className="text-teal-700 font-bold">{currentUser.name}</span> ({currentUser.holderNumber || 'Member'})
            </p>
          </div>
        </div>

        {userEvents.length === 0 ? (
          <Card className="text-center py-12 space-y-2 text-slate-500 text-xs">
            <p className="font-semibold text-slate-700">No active or past hospital events found for your account.</p>
            <p className="text-slate-400">
              When an accredited provider asserts a covered hospital admission under your NID commitment, it will immediately appear here.
            </p>
          </Card>
        ) : (
          userEvents.map((evt) => {
            const eventEntitlement = entitlements.find((e) => e.eventId === evt.id);
            const eventSettlement = eventEntitlement ? settlements.find((s) => s.entitlementId === eventEntitlement.id) : null;

            return (
              <div key={evt.id} className="space-y-4">
                <Card className="p-6 space-y-6 border-teal-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-bold text-teal-700 font-mono">{evt.id}</h2>
                        <Badge variant={evt.status === 'CLOSED_ELIGIBLE' ? 'success' : 'info'}>
                          {evt.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-800 font-semibold mt-1">{evt.diagnosisCategory}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{evt.facilityName} • Admitted {evt.createdAt}</p>
                    </div>

                    {eventSettlement?.status === 'SETTLED' && (
                      <Link to="/policyholder/receipt">
                        <Button variant="primary" size="sm" icon={<CheckCircle2 className="w-4 h-4" />}>
                          View Settlement Receipt
                        </Button>
                      </Link>
                    )}
                  </div>

                  {/* Quorum Component */}
                  <QuorumIndicator attestations={evt.attestations} />

                  {/* Timeline */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-mono font-bold text-slate-500 uppercase">Verification Log</h3>
                    <Timeline entries={evt.timeline} />
                  </div>
                </Card>
              </div>
            );
          })
        )}
      </div>
    </PageContainer>
  );
};
