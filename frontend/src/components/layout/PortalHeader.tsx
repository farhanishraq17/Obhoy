import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { UserRole } from '../../types/actor';
import { Shield, User, Building2, Stethoscope, Eye, Scale, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PortalHeader: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole, setRole, currentUser, currentProvider, currentInsurer, logout } = useAuthStore();

  const roleMeta: Record<UserRole, { title: string; subtitle: string; icon: React.ReactNode; color: 'info' | 'purple' | 'success' | 'warning' | 'error' | 'neutral' }> = {
    PUBLIC: { title: 'Public Transparency Explorer', subtitle: 'Open Ledger & Anchor Verification', icon: <Eye className="w-4 h-4 text-teal-600" />, color: 'info' },
    POLICYHOLDER: { title: `Policyholder Portal — ${currentUser.name}`, subtitle: `NID: ${currentUser.nid} | MFI: ${currentUser.mfi}`, icon: <User className="w-4 h-4 text-emerald-600" />, color: 'success' },
    PROVIDER: { title: `Provider Portal — ${currentProvider.name}`, subtitle: `Status: ${currentProvider.accreditationStatus} | Facility: ${currentProvider.facilityType}`, icon: <Stethoscope className="w-4 h-4 text-teal-600" />, color: 'info' },
    CLINICAL_VERIFIER: { title: 'Clinical Verification Node', subtitle: 'Independent Diagnostic & Record Review', icon: <Shield className="w-4 h-4 text-indigo-600" />, color: 'purple' },
    FIELD_VERIFIER: { title: 'Field Verification Node', subtitle: 'MFI Field Agent & Bedside Corroboration', icon: <Shield className="w-4 h-4 text-amber-600" />, color: 'warning' },
    INSURER: { title: `Insurer Portal — ${currentInsurer.name}`, subtitle: `Settlement Ratio: ${(currentInsurer.settlementRatio * 100).toFixed(0)}%`, icon: <Building2 className="w-4 h-4 text-purple-600" />, color: 'purple' },
    REGULATOR: { title: 'IDRA Supervisory Node', subtitle: 'Real-Time Oversight & Academic Audit Channel', icon: <Scale className="w-4 h-4 text-rose-600" />, color: 'error' },
  };

  const meta = roleMeta[currentRole];

  const handleRoleChange = (role: UserRole) => {
    setRole(role);
    if (role === 'PUBLIC') navigate('/');
    else if (role === 'POLICYHOLDER') navigate('/policyholder');
    else if (role === 'PROVIDER') navigate('/provider');
    else if (role === 'CLINICAL_VERIFIER' || role === 'FIELD_VERIFIER') navigate('/verifier/queue');
    else if (role === 'INSURER') navigate('/insurer');
    else if (role === 'REGULATOR') navigate('/regulator');
  };

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
          {meta.icon}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-slate-900">{meta.title}</h1>
            <Badge variant={meta.color} size="sm">{currentRole}</Badge>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{meta.subtitle}</p>
        </div>
      </div>

      {/* Role Selector & Logout */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="text-slate-500 text-xs font-mono font-semibold">Switch Portal:</span>
          <select
            value={currentRole}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="POLICYHOLDER">Policyholder (Rahim)</option>
            <option value="PROVIDER">Hospital Provider</option>
            <option value="CLINICAL_VERIFIER">Clinical Verifier</option>
            <option value="FIELD_VERIFIER">Field Verifier</option>
            <option value="INSURER">Insurer Portal</option>
            <option value="REGULATOR">IDRA Regulator</option>
          </select>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            logout();
            navigate('/');
          }}
          icon={<LogOut className="w-4 h-4 text-slate-500" />}
        >
          Logout
        </Button>
      </div>
    </div>
  );
};
