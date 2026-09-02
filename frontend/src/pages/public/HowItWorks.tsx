import React from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { UserCheck, Stethoscope, FileCheck, CheckCircle2, CreditCard, Lock, ArrowDown } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    { num: '01', title: 'Group Enrolment & NID Verification', desc: 'Policyholders enrol via MFIs / employer groups with National ID identity commitment verification.', icon: <UserCheck className="w-5 h-5 text-teal-600" /> },
    { num: '02', title: 'Provider Event Assertion', desc: 'Hospital asserts patient admission, generating a single-use asset key H(SubjectCommitment || window).', icon: <Stethoscope className="w-5 h-5 text-teal-600" /> },
    { num: '03', title: 'Network Uniqueness Invariant Check', desc: 'Obhoy network engine checks registry. If duplicate open event exists, creation is refused.', icon: <Lock className="w-5 h-5 text-amber-600" /> },
    { num: '04', title: '2-of-3 Multi-Class Attestation Quorum', desc: 'Requires signatures from 2 of 3 classes (Provider, Independent Clinical, MFI Field Verifier). Must include >= 1 non-payee.', icon: <FileCheck className="w-5 h-5 text-indigo-600" /> },
    { num: '05', title: 'Insurer Adjudication & Entitlement', desc: 'Event becomes CLOSED_ELIGIBLE. Insurer authorizes defined benefit entitlement.', icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" /> },
    { num: '06', title: 'Instant Mobile Payout & Public Audit Anchor', desc: 'Funds disbursed via bKash/Nagad. Settlement totals published as audit roots to public ledger.', icon: <CreditCard className="w-5 h-5 text-cyan-600" /> },
  ];

  return (
    <PageContainer isPublic>
      <div className="max-w-4xl mx-auto space-y-10 py-6">
        <div className="text-center space-y-3">
          <Badge variant="info">Architecture Lifecycle</Badge>
          <h1 className="text-3xl font-extrabold text-slate-900">How the Obhoy Protocol Operates</h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            From hospital admission to mobile payout: a transparent 6-stage verification engine without single-point trust.
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((st, i) => (
            <React.Fragment key={st.num}>
              <Card className="flex items-start space-x-4 p-5 hover:border-teal-500/40 transition-all">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 font-mono font-bold text-teal-700 text-sm">
                  {st.num}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center space-x-2">
                    {st.icon}
                    <h3 className="text-base font-bold text-slate-900">{st.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{st.desc}</p>
                </div>
              </Card>
              {i < steps.length - 1 && (
                <div className="flex justify-center">
                  <ArrowDown className="w-4 h-4 text-slate-400 animate-bounce" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};
