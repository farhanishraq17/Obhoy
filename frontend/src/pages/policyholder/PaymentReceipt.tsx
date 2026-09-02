import React from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useSimulationStore } from '../../store/simulationStore';
import { useAuthStore } from '../../store/authStore';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PaymentReceipt: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { settlements } = useSimulationStore();

  const settledItem = settlements.find((s) => s.status === 'SETTLED') || settlements[0];

  return (
    <PageContainer>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="success">Settlement Disbursed</Badge>
          <h1 className="text-2xl font-extrabold text-slate-900">Mobile Payout Confirmation</h1>
          <p className="text-xs text-slate-500 font-mono">bKash MFS Direct Disbursement</p>
        </div>

        <Card className="p-6 space-y-6 border-emerald-300 shadow-sm">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-emerald-700">BDT 50,000 DISBURSED</h2>
            <p className="text-xs text-slate-600 font-mono">Mobile: {currentUser.phone}</p>
          </div>

          <div className="space-y-2 text-xs font-mono bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-500">Transaction Ref:</span>
              <span className="text-teal-700 font-bold">{settledItem?.reference || 'BKASH-TXN-994821'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-500">Payment Rail:</span>
              <span className="text-slate-800">bKash (MFS)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-500">Recipient:</span>
              <span className="text-slate-800 font-semibold">{currentUser.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-500">Insurer:</span>
              <span className="text-slate-800">Green Delta Insurance PLC</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Settlement Status:</span>
              <span className="text-emerald-700 font-bold">SETTLED</span>
            </div>
          </div>

          <Link to="/transparency">
            <Button variant="primary" className="w-full" icon={<ArrowRight className="w-4 h-4" />}>
              View Public Transparency Audit Ledger
            </Button>
          </Link>
        </Card>
      </div>
    </PageContainer>
  );
};
