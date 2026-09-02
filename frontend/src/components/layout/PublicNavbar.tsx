import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogIn, LogOut, UserCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types/actor';

export const PublicNavbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, currentRole, currentUser, setRole, logout } = useAuthStore();

  const [activeSection, setActiveSection] = React.useState<'overview' | 'how-it-works'>('overview');

  React.useEffect(() => {
    if (location.pathname !== '/') return;

    const updateActiveFromScroll = () => {
      const howItWorksEl = document.getElementById('how-it-works');
      if (howItWorksEl) {
        const rect = howItWorksEl.getBoundingClientRect();
        if (rect.top <= 280) {
          setActiveSection('how-it-works');
          return;
        }
      }
      setActiveSection('overview');
    };

    if (window.location.hash === '#how-it-works') {
      setActiveSection('how-it-works');
    } else if (window.location.hash === '#hero') {
      setActiveSection('overview');
    } else {
      updateActiveFromScroll();
    }

    window.addEventListener('scroll', updateActiveFromScroll, { passive: true });
    window.addEventListener('hashchange', updateActiveFromScroll);
    return () => {
      window.removeEventListener('scroll', updateActiveFromScroll);
      window.removeEventListener('hashchange', updateActiveFromScroll);
    };
  }, [location.pathname]);

  const navLinks = [
    { label: 'Overview', path: '/' },
    { label: 'How it Works', path: '/#how-it-works' },
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
        <Logo size="md" showTagline={true} asLink={true} />

        {/* Public Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => {
            let isActive = false;
            let handleClick: ((e: React.MouseEvent) => void) | undefined;

            if (link.label === 'Overview') {
              isActive = location.pathname === '/' && activeSection === 'overview';
              handleClick = (e: React.MouseEvent) => {
                if (location.pathname === '/') {
                  e.preventDefault();
                  setActiveSection('overview');
                  const heroEl = document.getElementById('hero');
                  if (heroEl) {
                    heroEl.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                  window.history.pushState(null, '', '#hero');
                }
              };
            } else if (link.label === 'How it Works') {
              isActive = location.pathname === '/' && activeSection === 'how-it-works';
              handleClick = (e: React.MouseEvent) => {
                if (location.pathname === '/') {
                  e.preventDefault();
                  setActiveSection('how-it-works');
                  const el = document.getElementById('how-it-works');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                  window.history.pushState(null, '', '#how-it-works');
                }
              };
            } else {
              isActive = location.pathname === link.path;
            }

            return (
              <Link
                key={link.label}
                to={link.path}
                onClick={handleClick}
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
