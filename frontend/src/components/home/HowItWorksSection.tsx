import React from 'react';
import {
  ShieldCheck,
  FileText,
  Calendar,
  User,
  Contact,
  Users,
  Share2,
  Scale,
  CheckCircle2,
  Wallet,
  HeartHandshake,
  ArrowRight,
} from 'lucide-react';

interface StepItem {
  number: string;
  title: string;
  image: string;
  description: string;
  callout: string;
  icon: React.ReactNode;
  isEven: boolean;
}

const STEPS: StepItem[] = [
  {
    number: '01',
    title: 'Enroll',
    image: '/images/steps/step-01.png',
    description: 'Enter your NID and enroll in an insurance policy of your choice.',
    callout: 'Your identity is securely linked to your policy.',
    icon: <ShieldCheck className="w-3 h-3 text-[#059669] shrink-0 mt-0.5" />,
    isEven: false,
  },
  {
    number: '02',
    title: 'Policy Activated',
    image: '/images/steps/step-02.png',
    description: 'Your policy is activated and recorded on the Obhoy network.',
    callout: "You're now covered under your selected policy.",
    icon: <FileText className="w-3 h-3 text-[#059669] shrink-0 mt-0.5" />,
    isEven: true,
  },
  {
    number: '03',
    title: 'An Insurable Event Occurs',
    image: '/images/steps/step-03.png',
    description: 'A covered event happens — illness, crop loss, accident, fire, or any other insured risk.',
    callout: 'Obhoy supports many types of insurable events.',
    icon: <Calendar className="w-3 h-3 text-[#059669] shrink-0 mt-0.5" />,
    isEven: false,
  },
  {
    number: '04',
    title: 'Report to Provider',
    image: '/images/steps/step-04.png',
    description: 'You report the event to an authorized provider / institution / authority.',
    callout: 'The provider starts the verification process.',
    icon: <User className="w-3 h-3 text-[#059669] shrink-0 mt-0.5" />,
    isEven: true,
  },
  {
    number: '05',
    title: 'Provide Your NID',
    image: '/images/steps/step-05.png',
    description: 'Share your NID with the provider so they can find your coverage.',
    callout: 'Your NID helps fetch your policy instantly.',
    icon: <Contact className="w-3 h-3 text-[#059669] shrink-0 mt-0.5" />,
    isEven: false,
  },
  {
    number: '06',
    title: 'Verify Your Coverage',
    image: '/images/steps/step-06.png',
    description: 'The provider verifies your active policy and checks initial eligibility.',
    callout: 'Fast, secure, and tamper-proof verification.',
    icon: <ShieldCheck className="w-3 h-3 text-[#059669] shrink-0 mt-0.5" />,
    isEven: true,
  },
  {
    number: '07',
    title: 'Validate the Event',
    image: '/images/steps/step-07.png',
    description: 'Independent parties validate the event as per policy rules and their roles.',
    callout: 'Multi-party validation ensures fair and trusted decisions.',
    icon: <Users className="w-3 h-3 text-[#059669] shrink-0 mt-0.5" />,
    isEven: false,
  },
  {
    number: '08',
    title: 'Quorum Reached',
    image: '/images/steps/step-08.png',
    description: 'At least two of the three classes (including one non-payee) approve the event.',
    callout: 'Obhoy requires 2-of-3 quorum to proceed.',
    icon: <Share2 className="w-3 h-3 text-[#059669] shrink-0 mt-0.5" />,
    isEven: true,
  },
  {
    number: '09',
    title: 'Entitlement Adjudicated',
    image: '/images/steps/step-09.png',
    description: 'The insurer adjudicates the entitlement based on policy terms and verified facts.',
    callout: 'Entitlement is based on rules, not on bills or invoices.',
    icon: <Scale className="w-3 h-3 text-[#059669] shrink-0 mt-0.5" />,
    isEven: false,
  },
  {
    number: '10',
    title: 'Settlement Authorized',
    image: '/images/steps/step-10.png',
    description: 'The insurer authorizes the settlement and the benefit amount is finalized.',
    callout: 'Only eligible claims get approved.',
    icon: <CheckCircle2 className="w-3 h-3 text-[#059669] shrink-0 mt-0.5" />,
    isEven: true,
  },
  {
    number: '11',
    title: 'Claim Paid',
    image: '/images/steps/step-11.png',
    description: 'The benefit is paid to you or the provider through secure and reliable channels.',
    callout: 'Quick, reliable, and according to your policy.',
    icon: <Wallet className="w-3 h-3 text-[#059669] shrink-0 mt-0.5" />,
    isEven: false,
  },
  {
    number: '12',
    title: 'Insurance Received',
    image: '/images/steps/step-12.png',
    description: 'You receive the protection you enrolled for — when you need it most.',
    callout: "Peace of mind. That's Obhoy.",
    icon: <HeartHandshake className="w-3 h-3 text-[#059669] shrink-0 mt-0.5" />,
    isEven: true,
  },
];

const StepCard: React.FC<{ item: StepItem }> = ({ item }) => {
  return (
    <div className="flex-1 min-w-0 bg-white rounded-xl xl:rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col p-2.5 sm:p-3 xl:p-3.5 text-left group">
      {/* Card Header: Badge + Title */}
      <div className="flex items-center gap-1.5 mb-1 min-h-[2.25rem]">
        <div
          className={`w-6 h-6 xl:w-7 xl:h-7 rounded-full flex items-center justify-center font-bold text-[10px] xl:text-xs text-white shrink-0 shadow-xs ${
            item.isEven ? 'bg-[#059669]' : 'bg-[#0B2545]'
          }`}
        >
          {item.number}
        </div>
        <h3 className="text-[11px] xl:text-[12px] font-bold text-slate-900 leading-tight line-clamp-2">
          {item.title}
        </h3>
      </div>

      {/* Illustration */}
      <div className="w-full h-18 sm:h-20 xl:h-24 flex items-center justify-center my-1 overflow-hidden">
        <img
          src={item.image}
          alt={item.title}
          className="max-w-full max-h-full object-contain pointer-events-none select-none transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Description Text */}
      <p className="text-[10px] xl:text-[10.5px] text-slate-600 leading-tight xl:leading-snug min-h-[2.85rem] flex-1 mb-1.5">
        {item.description}
      </p>

      {/* Bottom Callout Pill */}
      <div className="mt-auto bg-[#ECFDF5] border border-[#A7F3D0]/70 rounded-md xl:rounded-lg p-1.5 flex items-start gap-1 min-h-[2.25rem]">
        {item.icon}
        <span className="text-[8.5px] xl:text-[9.5px] font-medium text-[#065F46] leading-tight">
          {item.callout}
        </span>
      </div>
    </div>
  );
};

export const HowItWorksSection: React.FC = () => {
  const row1 = STEPS.slice(0, 6);
  const row2 = STEPS.slice(6, 12);

  return (
    <section id="how-it-works" className="relative overflow-hidden bg-white/70 border border-slate-200/80 rounded-3xl p-4 sm:p-6 xl:p-8 shadow-xs space-y-8 my-6 scroll-mt-20">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-teal-500/5 blur-3xl pointer-events-none -z-10" />

      {/* Section Header (logo removed as requested) */}
      <div className="text-center space-y-2 max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0B2545] tracking-tight font-sans">
          How Obhoy Works
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          A secure, transparent and trusted way to access insurance — across all lines of coverage.
        </p>
      </div>

      {/* 12-Step Lifecycle Pipeline - Fluid width, no scrollbar needed */}
      <div className="space-y-4 sm:space-y-5">
        {/* Row 1: Steps 01 to 06 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-stretch lg:justify-between gap-2 lg:gap-1 xl:gap-1.5 w-full">
          {row1.map((step, idx) => (
            <React.Fragment key={step.number}>
              <StepCard item={step} />
              {idx < row1.length - 1 && (
                <div className="hidden lg:flex items-center justify-center shrink-0 self-center px-0.5 text-slate-400">
                  <ArrowRight className="w-3 h-3 xl:w-3.5 xl:h-3.5 text-slate-400 stroke-[2.2]" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Row 2: Steps 07 to 12 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-stretch lg:justify-between gap-2 lg:gap-1 xl:gap-1.5 w-full">
          {row2.map((step, idx) => (
            <React.Fragment key={step.number}>
              <StepCard item={step} />
              {idx < row2.length - 1 && (
                <div className="hidden lg:flex items-center justify-center shrink-0 self-center px-0.5 text-slate-400">
                  <ArrowRight className="w-3 h-3 xl:w-3.5 xl:h-3.5 text-slate-400 stroke-[2.2]" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
