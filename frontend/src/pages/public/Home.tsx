import React from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ShieldCheck, ArrowRight, LogIn, CheckCircle2, Lock, Scale, BarChart3, AlertTriangle, Cpu } from 'lucide-react';
import { HowItWorksSection } from '../../components/home/HowItWorksSection';

export const Home: React.FC = () => {
  React.useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#how-it-works') {
        const el = document.getElementById('how-it-works');
        if (el) {
          setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 60);
        }
      } else if (hash === '#hero') {
        const el = document.getElementById('hero');
        if (el) {
          setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 60);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const scrollToHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', '#how-it-works');
    }
  };

  return (
    <PageContainer isPublic>
      <div className="space-y-16 py-6 sm:py-8">
        {/* Hero Section - 2-Column Left-Aligned */}
        <section id="hero" className="relative overflow-hidden py-6 sm:py-10 scroll-mt-24">
          <div className="absolute inset-0 -z-10 flex items-center justify-start">
            <div className="w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Left-aligned Text & CTAs */}
            <div className="lg:col-span-7 text-left space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-mono font-semibold shadow-xs">
                <Cpu className="w-4 h-4 text-teal-600" />
                <span>BCOLBD 2026 Claims-Integrity Network</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Insurance You Can{' '}
                <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                  Verify
                </span>.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 font-sans leading-relaxed max-w-xl">
                Obhoy is a permissioned claims-integrity network where no single insurer, provider, or intermediary holds the complete record. Multi-class attestations, single-use event assets, and public audit anchoring restore trust to micro-insurance markets.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link to="/login">
                  <Button size="lg" variant="primary" icon={<LogIn className="w-5 h-5" />}>
                    Login to Stakeholder Portal
                  </Button>
                </Link>
                <a href="#how-it-works" onClick={scrollToHowItWorks}>
                  <Button size="lg" variant="glass" icon={<ArrowRight className="w-5 h-5" />}>
                    How Protocol Works
                  </Button>
                </a>
              </div>
            </div>

            {/* Right Column: Hero Illustration */}
            <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-md lg:max-w-none">
                <div className="absolute -inset-4 bg-gradient-to-tr from-teal-500/15 to-emerald-500/10 rounded-3xl blur-2xl -z-10" />
                <img
                  src="/images/hero.png"
                  alt="Obhoy Insurance Verification"
                  className="w-full h-auto max-h-[440px] object-contain drop-shadow-sm select-none pointer-events-none transition-transform duration-300 hover:scale-[1.02]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Why Obhoy? (Solving the 4 Verification Failures) */}
        <section className="space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <Badge variant="info">Protocol Core</Badge>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Why Obhoy?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Traditional micro-insurance suffers from low claim settlement ratios due to unverified single-party declarations. Obhoy enforces structural verification across all 4 critical failure modes.
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

        {/* How Obhoy Works - 12 Step Flow */}
        <HowItWorksSection />
      </div>
    </PageContainer>
  );
};
