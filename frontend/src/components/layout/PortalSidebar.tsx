import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Badge } from '../ui/Badge';
import {
  UserCheck,
  FileText,
  Activity,
  Receipt,
  RotateCcw,
  Search,
  PlusCircle,
  Clock,
  Building,
  ListFilter,
  CheckCircle,
  CreditCard,
  BarChart,
  ShieldAlert,
  Scale,
  ExternalLink,
  LogOut,
  User,
  Stethoscope,
  Building2,
  Shield,
  Eye,
} from 'lucide-react';

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const PortalSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRole, currentUser, currentProvider, currentInsurer, logout } = useAuthStore();

  const roleMeta: Record<string, { title: string; icon: React.ReactNode }> = {
    POLICYHOLDER: { title: currentUser.name, icon: <User className="w-4 h-4 text-emerald-600" /> },
    PROVIDER: { title: currentProvider.name, icon: <Stethoscope className="w-4 h-4 text-teal-600" /> },
    CLINICAL_VERIFIER: { title: 'Clinical Verification Node', icon: <Shield className="w-4 h-4 text-indigo-600" /> },
    FIELD_VERIFIER: { title: 'Field Agent Node', icon: <Shield className="w-4 h-4 text-amber-600" /> },
    INSURER: { title: currentInsurer.name, icon: <Building2 className="w-4 h-4 text-purple-600" /> },
    REGULATOR: { title: 'IDRA Supervisory Node', icon: <Scale className="w-4 h-4 text-rose-600" /> },
    PUBLIC: { title: 'Public Visitor', icon: <Eye className="w-4 h-4 text-slate-600" /> },
  };

  const roleNavItems: Record<string, SidebarItem[]> = {
    POLICYHOLDER: [
      { label: 'Policy Overview', path: '/policyholder', icon: <FileText className="w-4 h-4" /> },
      { label: 'Enrol & Identity', path: '/policyholder/enrollment', icon: <UserCheck className="w-4 h-4" /> },
      { label: 'My Events', path: '/policyholder/events', icon: <Activity className="w-4 h-4" /> },
      { label: 'Payment Receipts', path: '/policyholder/receipt', icon: <Receipt className="w-4 h-4" /> },
      { label: 'Submit Appeal', path: '/policyholder/appeal', icon: <RotateCcw className="w-4 h-4" /> },
    ],
    PROVIDER: [
      { label: 'Provider Dashboard', path: '/provider', icon: <Building className="w-4 h-4" /> },
      { label: 'Patient Lookup', path: '/provider/patient', icon: <Search className="w-4 h-4" /> },
      { label: 'Assert New Event', path: '/provider/assert-event', icon: <PlusCircle className="w-4 h-4" /> },
      { label: 'Continue Event (Transfer)', path: '/provider/continue-event', icon: <RotateCcw className="w-4 h-4" /> },
      { label: 'Attestation History', path: '/provider/history', icon: <Clock className="w-4 h-4" /> },
    ],
    CLINICAL_VERIFIER: [
      { label: 'Verification Queue', path: '/verifier/queue', icon: <ListFilter className="w-4 h-4" /> },
      { label: 'Attestation Records', path: '/verifier/records', icon: <CheckCircle className="w-4 h-4" /> },
    ],
    FIELD_VERIFIER: [
      { label: 'Verification Queue', path: '/verifier/queue', icon: <ListFilter className="w-4 h-4" /> },
      { label: 'Attestation Records', path: '/verifier/records', icon: <CheckCircle className="w-4 h-4" /> },
    ],
    INSURER: [
      { label: 'Insurer Dashboard', path: '/insurer', icon: <BarChart className="w-4 h-4" /> },
      { label: 'Eligible Events Queue', path: '/insurer/queue', icon: <ListFilter className="w-4 h-4" /> },
      { label: 'Settlement Processing', path: '/insurer/settlement', icon: <CreditCard className="w-4 h-4" /> },
      { label: 'Provider Analytics', path: '/insurer/providers', icon: <Building className="w-4 h-4" /> },
    ],
    REGULATOR: [
      { label: 'IDRA Overview', path: '/regulator', icon: <Scale className="w-4 h-4" /> },
      { label: 'Insurer Monitoring', path: '/regulator/insurers', icon: <BarChart className="w-4 h-4" /> },
      { label: 'Provider Monitoring', path: '/regulator/providers', icon: <Building className="w-4 h-4" /> },
      { label: 'Appeals Tribunal', path: '/regulator/appeals', icon: <ShieldAlert className="w-4 h-4" /> },
      { label: 'Audit Channel Logs', path: '/regulator/audit', icon: <FileText className="w-4 h-4" /> },
    ],
    PUBLIC: [
      { label: 'Transparency Ledger', path: '/transparency', icon: <BarChart className="w-4 h-4" /> },
      { label: 'Verify Anchor Proof', path: '/verify', icon: <ExternalLink className="w-4 h-4" /> },
    ],
  };

  const meta = roleMeta[currentRole] || roleMeta.POLICYHOLDER;
  const navItems = roleNavItems[currentRole] || roleNavItems.POLICYHOLDER;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shadow-xs">
      <div className="space-y-6">
        {/* User Identity Card */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-white border border-slate-200 shrink-0">
            {meta.icon}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">PORTAL USER</span>
            <span className="text-xs font-bold text-slate-900 truncate block">{meta.title}</span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="space-y-1">
          <h3 className="px-3 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
            Portal Navigation
          </h3>
          <nav className="space-y-1 pt-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 border border-teal-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className={isActive ? 'text-teal-600' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Logout button at bottom of sidebar */}
      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout Portal</span>
        </button>
      </div>
    </aside>
  );
};
