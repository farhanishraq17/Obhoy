import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useSimulationStore } from '../../store/simulationStore';
import { useUIStore } from '../../store/uiStore';
import { formatBDT } from '../../lib/format';
import {
  CreditCard,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  Lock,
  History,
  RotateCcw,
} from 'lucide-react';

export const InsurerSettlement: React.FC = () => {
  const navigate = useNavigate();
  const { settlements, processSettlement, reconcileSettlement } = useSimulationStore();
  const { showToast } = useUIStore();

  const targetSettlement = settlements[0] || {
    id: 'SET-9415',
    entitlementId: 'ENT-9592',
    amount: 50000,
    rail: 'BKASH',
    status: 'READY' as const,
    recipientMobile: '+880 1712-345678',
    requestedAt: '2026-09-03 14:00',
  };

  // Payment UI states
  const [currentStep, setCurrentStep] = useState<'READY' | 'SUBMITTED' | 'PROCESSING' | 'UNKNOWN' | 'CONFIRMED'>(
    targetSettlement.status === 'SETTLED'
      ? 'CONFIRMED'
      : targetSettlement.status === 'RECONCILIATION_REQUIRED'
      ? 'UNKNOWN'
      : 'READY'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconOutcome, setReconOutcome] = useState<'FOUND' | 'NOT_FOUND'>('FOUND');
  const [txnRef, setTxnRef] = useState(targetSettlement.reference || 'TXN-849221');

  const idempotencyKey = `IDEMP-${targetSettlement.entitlementId}`;

  // Execute normal happy-path payment
  const handleExecutePayment = async () => {
    setIsProcessing(true);
    setCurrentStep('SUBMITTED');

    setTimeout(() => {
      setCurrentStep('PROCESSING');
    }, 600);

    setTimeout(async () => {
      const res = await processSettlement(targetSettlement.id, false);
      setIsProcessing(false);
      if (res.success) {
        setTxnRef(res.reference || 'TXN-849221');
        setCurrentStep('CONFIRMED');
        showToast('Payment confirmed via bKash gateway ✓', 'success');
      } else {
        showToast(res.message, 'error');
      }
    }, 1500);
  };

  // Simulate Scenario 7: Timeout & Unknown state
  const handleSimulateTimeout = async () => {
    setIsProcessing(true);
    setCurrentStep('SUBMITTED');

    setTimeout(() => {
      setCurrentStep('PROCESSING');
    }, 600);

    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStep('UNKNOWN');
      showToast('Gateway timeout occurred. Status marked UNKNOWN. Do not retry blindly!', 'info');
    }, 1400);
  };

  // Scenario 7: Reconciliation
  const handleReconcile = async () => {
    setIsReconciling(true);

    setTimeout(async () => {
      if (reconOutcome === 'FOUND') {
        const res = await reconcileSettlement(targetSettlement.id);
        setIsReconciling(false);
        if (res.success) {
          setTxnRef(res.reference || 'TXN-849221');
          setCurrentStep('CONFIRMED');
          showToast('Gateway transaction found & reconciled. On-chain settlement confirmed ✓', 'success');
        }
      } else {
        setIsReconciling(false);
        showToast('No transaction found at gateway. Safe to re-attempt payment.', 'info');
        setCurrentStep('READY');
      }
    }, 1200);
  };

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-500">
          <Link to="/insurer/queue" className="hover:text-teal-700 font-bold">
            ← Back to Claims Queue
          </Link>
          <span className="text-[11px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            DEMO / SIMULATED RAIL
          </span>
        </div>

        {/* 25. Settlement Header */}
        <div className="text-center space-y-2">
          <Badge variant="info">MFS Mobile Disbursement Rail</Badge>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            MFS Payment Rail Execution
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Direct off-chain mobile wallet payout using payload-bound idempotency and cryptographic proof
          </p>
        </div>

        {/* 28. Payment State Stepper */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono">
            {[
              { key: 'READY', label: '1. AUTHORIZED' },
              { key: 'SUBMITTED', label: '2. SUBMITTED' },
              { key: 'PROCESSING', label: '3. PROCESSING' },
              {
                key: currentStep === 'UNKNOWN' ? 'UNKNOWN' : 'CONFIRMED',
                label: currentStep === 'UNKNOWN' ? '4. UNKNOWN ⚠' : '4. CONFIRMED ✓',
                isWarning: currentStep === 'UNKNOWN',
              },
            ].map((step, idx) => {
              const isActive =
                step.key === currentStep ||
                (step.key === 'READY' && currentStep !== 'READY') ||
                (step.key === 'SUBMITTED' && ['PROCESSING', 'UNKNOWN', 'CONFIRMED'].includes(currentStep)) ||
                (step.key === 'PROCESSING' && ['UNKNOWN', 'CONFIRMED'].includes(currentStep));

              return (
                <div key={step.key} className="flex items-center space-x-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      step.isWarning
                        ? 'bg-amber-500 text-white animate-pulse'
                        : isActive
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`font-semibold text-[11px] hidden sm:inline ${
                      step.isWarning ? 'text-amber-700' : isActive ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 26 & 27. Settlement Details & Idempotency Section */}
        <Card className="p-6 space-y-6 border-slate-200 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[10px] block uppercase font-bold">Settlement ID</span>
              <span className="font-bold text-teal-700">{targetSettlement.id}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block uppercase font-bold">Entitlement</span>
              <span className="font-bold text-slate-800">{targetSettlement.entitlementId}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block uppercase font-bold">Payment Rail</span>
              <span className="font-bold text-rose-700">bKash Merchant API</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block uppercase font-bold">Disbursement</span>
              <span className="font-black text-emerald-700">{formatBDT(targetSettlement.amount || 50000)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs font-mono px-1">
            <span className="text-slate-500">Beneficiary Mobile Number:</span>
            <strong className="text-slate-900">{targetSettlement.recipientMobile || '+880 1712-345678'}</strong>
          </div>

          {/* 27. Idempotency Key Section */}
          <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200 text-xs font-mono space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-teal-900 font-bold flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-teal-700" />
                <span>PAYMENT SAFETY IDEMPOTENCY KEY</span>
              </span>
              <span className="text-teal-800 font-mono font-bold bg-teal-100/80 px-2 py-0.5 rounded text-[11px]">
                {idempotencyKey}
              </span>
            </div>
            <p className="text-teal-700 text-[11px] leading-relaxed">
              Prevents duplicate disbursement if network timeouts or gateway retries occur. The MFS adapter guarantees strictly once-only debit.
            </p>
          </div>

          {/* Action Center depending on state */}
          {currentStep === 'READY' && (
            <div className="space-y-3 pt-2">
              <Button
                variant="primary"
                onClick={handleExecutePayment}
                disabled={isProcessing}
                className="w-full py-3 text-sm font-bold bg-rose-600 hover:bg-rose-700"
                icon={<CreditCard className="w-4 h-4" />}
              >
                {isProcessing ? 'Executing bKash Disbursement...' : `Execute bKash Disbursement (${formatBDT(targetSettlement.amount || 50000)})`}
              </Button>

              <div className="text-center pt-2">
                <button
                  onClick={handleSimulateTimeout}
                  disabled={isProcessing}
                  className="text-xs font-mono text-amber-700 hover:text-amber-800 underline inline-flex items-center space-x-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  <span>Test Scenario 7: Simulate Gateway Timeout (Unknown State)</span>
                </button>
              </div>
            </div>
          )}

          {['SUBMITTED', 'PROCESSING'].includes(currentStep) && (
            <div className="p-6 text-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
              <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
              <div className="font-mono text-xs font-bold text-slate-800">
                Contacting bKash Payment Gateway...
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Awaiting signed gateway disbursement receipt with Idempotency Key {idempotencyKey}
              </p>
            </div>
          )}

          {/* 30. Scenario 7: Unknown State */}
          {currentStep === 'UNKNOWN' && (
            <div className="p-5 bg-amber-50 rounded-2xl border-2 border-amber-400 space-y-4 animate-fade-in">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold font-mono text-amber-950 uppercase tracking-wide">
                    PAYMENT OUTCOME UNKNOWN ⚠
                  </h3>
                  <p className="text-xs text-amber-900 font-mono">
                    Gateway request was submitted, but the response timed out. The system cannot determine whether the debit occurred.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-amber-300 text-xs font-mono space-y-1 text-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Gateway Status:</span>
                  <span className="text-rose-700 font-bold">HTTP 504 GATEWAY TIMEOUT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Policy Recommendation:</span>
                  <span className="text-amber-900 font-black">⚠ DO NOT RETRY BLINDLY</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-slate-600">Simulate Reconcile Outcome:</span>
                  <select
                    value={reconOutcome}
                    onChange={(e) => setReconOutcome(e.target.value as any)}
                    className="p-1 bg-white border border-amber-300 rounded text-xs font-mono"
                  >
                    <option value="FOUND">Gateway Record Found (Success)</option>
                    <option value="NOT_FOUND">Record Not Found (Failed)</option>
                  </select>
                </div>

                <Button
                  variant="primary"
                  onClick={handleReconcile}
                  disabled={isReconciling}
                  className="bg-amber-600 hover:bg-amber-700 text-xs font-bold"
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />}
                >
                  {isReconciling ? 'Querying Gateway...' : 'Reconcile Payment'}
                </Button>
              </div>
            </div>
          )}

          {/* 29. Confirmed State */}
          {currentStep === 'CONFIRMED' && (
            <div className="p-5 bg-emerald-50 rounded-2xl border-2 border-emerald-500 space-y-4 animate-fade-in">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-mono text-emerald-900">
                    PAYMENT CONFIRMED ✓
                  </h3>
                  <p className="text-xs text-emerald-700 font-mono">
                    Off-ledger disbursement completed and registered on blockchain.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-white rounded-xl border border-emerald-200 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Transaction Ref</span>
                  <strong className="text-emerald-800">{txnRef}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Amount</span>
                  <span className="font-bold text-slate-900">{formatBDT(targetSettlement.amount || 50000)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Recipient</span>
                  <span className="font-mono text-slate-800">{targetSettlement.recipientMobile}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">Ledger State</span>
                  <span className="text-emerald-700 font-bold">SETTLED ✓</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-emerald-800">
                  No duplicate payout created • Idempotent match verified
                </span>
                <Link to="/policyholder/receipt">
                  <Button variant="outline" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                    View Beneficiary Receipt
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>

        {/* 33. Payment History Timeline */}
        <Card className="p-5 space-y-3 border-slate-200">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
              Payment Rail Audit Timeline
            </h3>
          </div>

          <div className="space-y-2 text-xs font-mono">
            {[
              { time: '14:00:02', event: 'Disbursement request created from entitlement ENT-9592' },
              { time: '14:00:04', event: 'Submitted to bKash payout gateway with Idempotency Key' },
              {
                time: '14:00:25',
                event: currentStep === 'UNKNOWN' ? 'Gateway timeout (HTTP 504) — Status set to UNKNOWN' : 'Gateway receipt received with Ref ' + txnRef,
              },
              ...(currentStep === 'CONFIRMED'
                ? [{ time: '14:01:10', event: 'Ledger state transitioned to SETTLED with zero duplicate debits' }]
                : []),
            ].map((log, i) => (
              <div key={i} className="flex items-center space-x-3 py-1 border-b border-slate-100 last:border-none">
                <span className="text-slate-400 text-[11px] shrink-0">{log.time}</span>
                <span className="text-slate-800 text-[11px]">{log.event}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};
