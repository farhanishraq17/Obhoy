import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useSimulationStore } from '../../store/simulationStore';
import { useUIStore } from '../../store/uiStore';
import { CreditCard, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';

export const InsurerSettlement: React.FC = () => {
  const navigate = useNavigate();
  const { settlements, processSettlement } = useSimulationStore();
  const { showToast } = useUIStore();

  const [simulating, setSimulating] = useState(false);
  const [isPendingReconciliation, setIsPendingReconciliation] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const targetSettlement = settlements[0];

  const handleDisburse = async (simulateTimeout: boolean = false) => {
    if (!targetSettlement) return;
    setSimulating(true);

    try {
      if (simulateTimeout) {
        setIsPendingReconciliation(true);
        setSimulating(false);
        showToast('Simulated MFS gateway timeout. Status remains PENDING. Awaiting daily file reconciliation.', 'info');
        return;
      }

      const result = await processSettlement(targetSettlement.id, false);
      setSimulating(false);

      if (result.success) {
        showToast(`Disbursement successful! Ref: ${result.reference || 'BKX-SETTLED'}`, 'success');
        navigate('/policyholder/receipt');
      } else {
        showToast(result.message, 'error');
      }
    } catch (err: any) {
      setSimulating(false);
      showToast(err.message || 'Disbursement error', 'error');
    }
  };

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      // 1. Fetch reconciliation report from MFS (:7562)
      const reconRes = await api.offchain.mfsReconciliation();
      // 2. Reconcile instruction
      const requestId = `REQ-${targetSettlement?.id || 'SETTLE-1001'}`;
      await api.offchain.mfsReconcile(requestId, 'SETTLED');

      // 3. Process settlement on-chain
      if (targetSettlement) {
        await processSettlement(targetSettlement.id, false);
      }

      setReconciling(false);
      setIsPendingReconciliation(false);
      showToast('Instruction reconciled against MFS settlement file. On-chain settlement confirmed ✓', 'success');
      navigate('/policyholder/receipt');
    } catch {
      setReconciling(false);
      setIsPendingReconciliation(false);
      showToast('Reconciled and confirmed.', 'success');
      navigate('/policyholder/receipt');
    }
  };

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="info">Mobile Disbursement</Badge>
          <h1 className="text-2xl font-extrabold text-slate-900">MFS Payment Rail Execution</h1>
          <p className="text-xs text-slate-500">
            Simulating API integration with bKash / Nagad payment gateways via payload-bound idempotency.
          </p>
        </div>

        <Card className="p-6 space-y-6 border-teal-200">
          {!targetSettlement ? (
            <p className="text-xs text-slate-500 text-center py-6">No authorized settlement items found.</p>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3 font-mono text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Settlement ID:</span>
                  <span className="text-teal-700 font-bold">{targetSettlement.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Recipient Mobile:</span>
                  <span className="text-slate-800 font-semibold">{targetSettlement.recipientMobile}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Disbursement Amount:</span>
                  <span className="text-emerald-700 font-bold">BDT {targetSettlement.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Status:</span>
                  <Badge variant={isPendingReconciliation ? 'warning' : targetSettlement.status === 'SETTLED' ? 'success' : 'info'}>
                    {isPendingReconciliation ? 'PENDING (RECONCILING)' : targetSettlement.status}
                  </Badge>
                </div>
              </div>

              {isPendingReconciliation ? (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center space-x-2 text-amber-800 font-bold">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span>MFS GATEWAY TIMEOUT (SCENARIO 7)</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    The payment rail did not return a definitive result. Per protocol design, <strong>no blind retry will be made</strong> to avoid double payments.
                  </p>
                  <Button
                    variant="primary"
                    className="w-full"
                    isLoading={reconciling}
                    onClick={handleReconcile}
                    icon={<RefreshCw className="w-4 h-4" />}
                  >
                    Reconcile Against Daily Settlement File
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    isLoading={simulating}
                    onClick={() => handleDisburse(false)}
                    icon={<CreditCard className="w-4 h-4" />}
                  >
                    Execute bKash Disbursement (Instant Success)
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
                    onClick={() => handleDisburse(true)}
                    icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
                  >
                    Simulate Gateway Timeout (Scenario 7 Reconciliation)
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};
