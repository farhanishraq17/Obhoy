import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types/actor';
import { ShieldCheck, User, Building2, Stethoscope, Scale, Shield, LogIn } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const stakeholders: { role: UserRole; title: string; subtitle: string; icon: React.ReactNode; redirect: string; color: string }[] = [
    {
      role: 'POLICYHOLDER',
      title: 'Policyholder (Rahim Uddin)',
      subtitle: 'View coverage, active hospital events, and payment receipts',
      icon: <User className="w-6 h-6 text-teal-600" />,
      redirect: '/policyholder',
      color: 'border-teal-500/40 hover:border-teal-600',
    },
    {
      role: 'PROVIDER',
      title: 'Healthcare Provider (ABC Upazila Health Complex)',
      subtitle: 'Assert patient admissions & manage hospital transfers',
      icon: <Stethoscope className="w-6 h-6 text-emerald-600" />,
      redirect: '/provider',
      color: 'border-emerald-500/40 hover:border-emerald-600',
    },
    {
      role: 'CLINICAL_VERIFIER',
      title: 'Clinical Verifier',
      subtitle: 'Review HMIS diagnostic evidence and sign clinical attestation',
      icon: <Shield className="w-6 h-6 text-indigo-600" />,
      redirect: '/verifier/queue',
      color: 'border-indigo-500/40 hover:border-indigo-600',
    },
    {
      role: 'FIELD_VERIFIER',
      title: 'MFI Field Agent (Bedside Verifier)',
      subtitle: 'Perform bedside patient verification & corroboration',
      icon: <Shield className="w-6 h-6 text-amber-600" />,
      redirect: '/verifier/queue',
      color: 'border-amber-500/40 hover:border-amber-600',
    },
    {
      role: 'INSURER',
      title: 'Insurance Underwriter (Green Delta Insurance)',
      subtitle: 'Adjudicate 2-of-3 quorum claims & authorize bKash payments',
      icon: <Building2 className="w-6 h-6 text-purple-600" />,
      redirect: '/insurer',
      color: 'border-purple-500/40 hover:border-purple-600',
    },
    {
      role: 'REGULATOR',
      title: 'IDRA Supervisory Node',
      subtitle: 'Real-time audit channel monitoring & appeals tribunal',
      icon: <Scale className="w-6 h-6 text-rose-600" />,
      redirect: '/regulator',
      color: 'border-rose-500/40 hover:border-rose-600',
    },
  ];

  const handleLogin = (role: UserRole, redirect: string) => {
    login(role);
    navigate(redirect);
  };

  return (
    <PageContainer isPublic>
      <div className="max-w-4xl mx-auto space-y-8 py-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center mx-auto shadow-xs">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Obhoy Consortium Login</h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Select a stakeholder identity below to access that specific portal in the Obhoy claims-integrity network.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stakeholders.map((s) => (
            <Card
              key={s.role}
              hoverable
              onClick={() => handleLogin(s.role, s.redirect)}
              className={`p-5 flex items-start space-x-4 border transition-all ${s.color}`}
            >
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
                {s.icon}
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{s.subtitle}</p>
                <div className="pt-2 flex items-center text-xs font-semibold text-teal-700">
                  <span>Enter Portal</span>
                  <span className="ml-1">→</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};
