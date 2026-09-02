import React, { useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useSimulationStore } from '../../store/simulationStore';
import { useUIStore } from '../../store/uiStore';
import { RotateCcw } from 'lucide-react';

export const AppealPage: React.FC = () => {
  const { entitlements, submitAppeal, appeals } = useSimulationStore();
  const { showToast } = useUIStore();

  const [selectedEntitlementId, setSelectedEntitlementId] = useState(entitlements[0]?.id || 'ENT-1001');
  const [reason, setReason] = useState('Hospital admission occurred after the 30-day pre-existing waiting period. Hospital records confirm acute onset.');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await submitAppeal(selectedEntitlementId, reason);
    showToast(result.message, result.success ? 'success' : 'error');
  };

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="purple">Independent Arbitration</Badge>
          <h1 className="text-2xl font-extrabold text-slate-900">Entitlement Appeal Submission</h1>
          <p className="text-xs text-slate-500">
            Every denial is recorded with a reason and can be appealed to an independent panel (Academic Node + IDRA Regulator + Consumer Representative).
          </p>
        </div>

        <Card className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-600 mb-1 font-semibold">Select Denied Entitlement:</label>
              <select
                value={selectedEntitlementId}
                onChange={(e) => setSelectedEntitlementId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900"
              >
                {entitlements.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.id} ({e.insurerName} — BDT {e.amount.toLocaleString()} — Status: {e.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-600 mb-1 font-semibold">Grounds for Appeal:</label>
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-teal-600 font-sans"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full" icon={<RotateCcw className="w-4 h-4" />}>
              Submit Appeal to Arbitration Panel
            </Button>
          </form>

          {appeals.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-mono font-bold text-slate-500 uppercase">Active Appeals Status</h3>
              {appeals.map((apl) => (
                <div key={apl.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-teal-700 font-mono">{apl.id}</span>
                    <Badge variant={apl.status === 'OVERTURNED' ? 'success' : 'purple'}>{apl.status}</Badge>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{apl.reason}</p>
                  {apl.decision && <p className="text-emerald-700 font-mono text-[11px] font-bold pt-1">{apl.decision}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};
