import React from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { QuorumIndicator } from '../../components/workflow/QuorumIndicator';
import { useSimulationStore } from '../../store/simulationStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { FileCheck } from 'lucide-react';

export const VerificationQueue: React.FC = () => {
  const { currentRole } = useAuthStore();
  const { events, attestEvent } = useSimulationStore();
  const { showToast } = useUIStore();

  const isClinical = currentRole === 'CLINICAL_VERIFIER';
  const verifierClass = isClinical ? 'CLINICAL' : 'FIELD';
  const verifierName = isClinical ? 'Dr. Shahriar Rahman (Clinical Node)' : 'MFI Field Agent (Bedside Verifier)';

  const handleAttest = async (eventId: string) => {
    const result = await attestEvent(eventId, 'VERIF-NODE-01', verifierName, verifierClass);
    showToast(result.message, result.success ? 'success' : 'error');
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isClinical ? 'Clinical Verification Queue' : 'Field Bedside Verification Queue'}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Independent non-payee class attestation required for 2-of-3 quorum
            </p>
          </div>
        </div>

        {events.length === 0 ? (
          <Card className="text-center py-12 text-slate-500 text-xs">
            No events currently pending verification.
          </Card>
        ) : (
          events.map((evt) => {
            const hasAttested = evt.attestations.some((a) => a.actorClass === verifierClass);

            return (
              <Card key={evt.id} className="p-6 space-y-6 border-teal-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-teal-700 text-base">{evt.id}</span>
                      <Badge variant={evt.status === 'CLOSED_ELIGIBLE' ? 'success' : 'info'}>{evt.status}</Badge>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mt-1">{evt.diagnosisCategory}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      Patient: {evt.holderName} | Facility: {evt.facilityName}
                    </p>
                  </div>

                  <Button
                    variant={hasAttested ? 'glass' : 'primary'}
                    size="sm"
                    disabled={hasAttested}
                    onClick={() => handleAttest(evt.id)}
                    icon={<FileCheck className="w-4 h-4" />}
                  >
                    {hasAttested ? 'Attestation Submitted ✓' : `Attest as ${verifierClass} Verifier`}
                  </Button>
                </div>

                <QuorumIndicator attestations={evt.attestations} />
              </Card>
            );
          })
        )}
      </div>
    </PageContainer>
  );
};
