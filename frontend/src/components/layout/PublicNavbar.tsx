import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogIn, LogOut, UserCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types/actor';

export const PublicNavbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, currentRole, currentUser, setRole, logout } = useAuthStore();

  const navLinks = [
    { label: 'Overview', path: '/' },
    { label: 'How it Works', path: '/how-it-works' },
    { label: 'Products', path: '/products' },
    { label: 'Transparency', path: '/transparency' },
    { label: 'Verify Anchor', path: '/verify' },
  ];

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as UserRole;
    setRole(role);
    if (role === 'PUBLIC') {
      navigate('/');
    } else if (role === 'POLICYHOLDER') {
      navigate('/policyholder');
    } else if (role === 'PROVIDER') {
      navigate('/provider');
    } else if (role === 'CLINICAL_VERIFIER' || role === 'FIELD_VERIFIER') {
      navigate('/verifier/queue');
    } else if (role === 'INSURER') {
      navigate('/insurer');
    } else if (role === 'REGULATOR') {
      navigate('/regulator');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200 bg-white/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20 group-hover:bg-teal-700 transition-all">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 font-sans">OBHOY</span>
            <span className="block text-[9px] font-mono font-bold tracking-wider text-teal-700 uppercase -mt-1">
              PROTOCOL
            </span>
          </div>
        </Link>

        {/* Public Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'text-teal-700 bg-teal-50 border border-teal-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Portal Switcher & Login / Logout */}
        <div className="flex items-center space-x-3">
          {isAuthenticated && currentRole !== 'PUBLIC' && (
            <div className="hidden sm:flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-mono text-[10px] uppercase font-semibold">Portal:</span>
              <select
                value={currentRole}
                onChange={handleRoleChange}
                className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="POLICYHOLDER">Policyholder ({currentUser?.name ? currentUser.name.split(' ')[0] : 'Beneficiary'})</option>
                <option value="PROVIDER">Hospital Provider</option>
                <option value="CLINICAL_VERIFIER">Clinical Verifier</option>
                <option value="FIELD_VERIFIER">Field Verifier</option>
                <option value="INSURER">Insurer Portal</option>
                <option value="REGULATOR">IDRA Regulator</option>
              </select>
            </div>
          )}

          {isAuthenticated && currentRole !== 'PUBLIC' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                navigate('/');
              }}
              icon={<LogOut className="w-4 h-4" />}
            >
              Logout
            </Button>
          ) : (
            <Link to="/login">
              <Button variant="primary" size="sm" icon={<LogIn className="w-4 h-4" />}>
                Login to Portal
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
