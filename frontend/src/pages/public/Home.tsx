import React from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ShieldCheck, ArrowRight, LogIn, CheckCircle2, Lock, Scale, BarChart3, AlertTriangle, Cpu } from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <PageContainer isPublic>
      <div className="space-y-16 py-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden text-center space-y-8 py-12">
          <div className="absolute inset-0 -z-10 flex items-center justify-center">
            <div className="w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl"></div>
          </div>

          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-mono font-semibold shadow-xs">
            <Cpu className="w-4 h-4 text-teal-600" />
            <span>BCOLBD 2026 Claims-Integrity Network</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            Insurance You Can <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 bg-clip-text text-transparent">Verify</span>.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-sans leading-relaxed">
            Obhoy is a permissioned claims-integrity network where no single insurer, provider, or intermediary holds the complete record. Multi-class attestations, single-use event assets, and public audit anchoring restore trust to micro-insurance markets.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link to="/login">
              <Button size="lg" variant="primary" icon={<LogIn className="w-5 h-5" />}>
                Login to Stakeholder Portal
              </Button>
            </Link>
            <Link to="/how-it-works">
              <Button size="lg" variant="glass" icon={<ArrowRight className="w-5 h-5" />}>
                How Protocol Works
              </Button>
            </Link>
          </div>
        </section>

        {/* 4 Verification Failures & Protocol Solves */}
        <section className="space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <Badge variant="info">Protocol Core</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Solving the 4 Verification Failures</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Traditional micro-insurance suffers from low claim settlement ratios due to unverified single-party declarations. Obhoy enforces structural verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card hoverable className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 font-bold">
                F1
              </div>
              <h3 className="text-lg font-bold text-slate-900">Failure 1: Unverifiable Event Assertion</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Claims traditionally rely on documents written solely by the party being paid.
              </p>
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-mono font-medium">
                ✓ Obhoy Fix: 2-of-3 Multi-Class Quorum (Provider + Clinical + Field Agent) with at least 1 non-payee signature.
              </div>
            </Card>

            <Card hoverable className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold">
                F2
              </div>
              <h3 className="text-lg font-bold text-slate-900">Failure 2: Duplicate Recovery Across Insurers</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Insurers cannot see rivals' claims, allowing double-claiming fraud across carriers.
              </p>
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-mono font-medium">
                ✓ Obhoy Fix: Single-use asset minting with invariant key H(NID || window). Refused at commit time.
              </div>
            </Card>

            <Card hoverable className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold">
                F3
              </div>
              <h3 className="text-lg font-bold text-slate-900">Failure 3: Claimant Invoice Inflation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                When payouts track claimant-supplied documents, incentives point to inflation.
              </p>
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-mono font-medium">
                ✓ Obhoy Fix: Defined Benefit / Parametric payout schedule published in advance.
              </div>
            </Card>

            <Card hoverable className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 font-bold">
                F4
              </div>
              <h3 className="text-lg font-bold text-slate-900">Failure 4: Unverifiable Insurer Behavior</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Policyholders cannot inspect whether an insurer actually pays claims before purchasing.
              </p>
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-mono font-medium">
                ✓ Obhoy Fix: Period transparency totals committed as cryptographic roots to public audit ledgers.
              </div>
            </Card>
          </div>
        </section>

      </div>
    </PageContainer>
  );
};
